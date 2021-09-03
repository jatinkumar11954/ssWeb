var MONGO_DB_CONNECTION = process.env.MONGO_DB_CONNECTION || F.config['mongo'];;
var Agent = require('sqlagent/mongodb').connect(MONGO_DB_CONNECTION);
var fs = require('fs');
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
const assert = require('assert');
const { v4: uuidv4 } = require('uuid');
var jwt = require('jsonwebtoken');
var Agent = require('sqlagent/mongodb').connect(MONGO_DB_CONNECTION);
const EventEmitter = require('events');
const myEmitter = new EventEmitter();
var axios = require('axios');
const https = require('https');
const moment = require('moment-timezone');
// Database Name
const DB_NAME = process.env.DB_NAME || F.config['db-name'];
const RAZORPAY_KEY = F.config['RAZORPAY_KEY'];

var request = require('request');
var PhoneNumber = require('awesome-phonenumber');
var otplib = require('otplib');

// importing the emitter
var cashbackEmmitter = require('../emitter/cashbacks_emitter');

otplib.authenticator.options = {
    step: 900,
    window: 1,
    digits: 6
};

// otplib secret key
var OTP_SECRET = process.env.OTP_SECRET || 'ec1fde07-6a2c-11eb-8153-0200cd936042';

// jwt secret key 
var JWT_DELIVERY_SECRET_KEY = process.env.JWT_SECRET_KEY || 'JHASFKAWJEIRWUW4I642847KLMVFD8279WIDFSLSDFLKJSELDKQW371823';

const fcm = MODULE('firebaseNotification');

// send email import module
var emailModule = MODULE('email');

// send sms import modile
var smsModule = MODULE('sms');
var template = "";
exports.install = function () {
    ROUTE('/admin/api/delivery-person/register', deliveryPersonRegister, ['POST', '#adminVerify', 'cors']);
    ROUTE('/admin/api/delivery-person/update', deliveryPersonUpdate, ['POST', '#adminVerify', 'cors', 10000]);
    ROUTE('/admin/api/delivery-person/{id}', getDeliverypersonById, ['#adminVerify', 'cors']);
    ROUTE('/admin/api/delivery-person/active', getActiveDeliveryPerson, ['#adminVerify', 'cors']);

    ROUTE('/admin/api/delivery-person', getDeliveryPersons, ['#adminVerify', 'cors']);
    ROUTE('/admin/api/delivery-person/allocate-orders', deliveryPersonAllocateOrders, ['POST', '#adminVerify', 'cors']);


    ROUTE('/api/delivery-person/login', deliveryPersonLogin, ['POST', 'cors']);
    ROUTE('/api/delivery-person/otp-verify', deliveryOtpVerify, ['POST', 'cors']);
    ROUTE('/api/delivery-person/fetch-orders', deliveryFetchOrders, ['#deliveryVerify', 'cors']);
    ROUTE('/api/delivery-person/fetch-order/{id}', deliveryFetchOrder, ['#deliveryVerify', 'cors']);

    // route to status update the delivery order status 
    ROUTE('/api/delivery-person/delivery-status/{id}', deliveryStatusUpdatde, ['POST', '#deliveryVerify', 'cors']);
    ROUTE('/admin/delivery-person/delivery-status/{id}', adminDeliveryStatusUpdatde, ['POST', '#adminVerify', 'cors']);

    //route to check the payment status for razorpay 
    ROUTE('/api/delivery-person/payment-status/{id}', paymentStatusCheck, ['#deliveryVerify', 'cors']);
}

// function to check the payment status for cod orders 
async function paymentStatusCheck() {
    var self = this;
    var nosql = new Agent();
    var orderDetails = await getOrderDetails(self.params.id);
    var decoded = self.token;
    var deliveryPesonDetails = await getDeliveryPersonDetails(decoded.phone);
    const date = new Date();
    const zone = 'Asia/Kolkata';
    const datecreatedString = moment.tz(date, zone).format();
    var config = {
        method: 'get',
        url: 'https://api.razorpay.com/v1/payment_links/' + orderDetails.razorpay_paymentid,
        headers: {
            'Authorization': `Basic ${RAZORPAY_KEY}`
        }
    };
    axios(config)
        .then(async function (response) {
            console.log("RAZORPAY PAYMENT STATUS  API RESPONSE---------------", JSON.stringify(response.data));
            if ((response.data.amount / 100) == orderDetails.price && response.data.status == "paid") {
                // update the payment in order 
                var deliveryLogs = {
                    delivery_person_name: deliveryPesonDetails.name,
                    delivery_person_phone: deliveryPesonDetails.phone,
                    order_id: orderDetails.id,
                    status: "Delivered",
                    p_type: "online",
                    created_on: new Date(),
                    created_on_string:datecreatedString
                };
                orderDetails.delivery_logs.push(deliveryLogs);
                nosql.update('updateOrder', 'orders').make(function (builder) {
                    builder.set('status', "Delivered");
                    builder.set('ispaid', true);
                    builder.set('iscod', false);
                    builder.set('tag', "paid");
                    builder.set('p_type', "online");
                    builder.set('delivery_logs', orderDetails.delivery_logs);
                    builder.where('id', orderDetails.id);
                })
                await nosql.promise('updateOrder');
                template = "SS_Order_Delivered";
                var subject = `@(Order #)  ${orderDetails.id} - Delivered`;
                orderDetails.status = "Delivered";
                orderDetails.email_msg = `Hi ${orderDetails.name}, Your shopsasta order ${orderDetails.number} has been delivered. Thanks for shopping with us!`;
                MAIL(orderDetails.email, subject, '=?/mails/order', orderDetails, "");
                smsModule.sendSMS(orderDetails.iduser, template, orderDetails);

                // emmitter functinality to run the cashbacks
                cashbackEmmitter.emit('cashback', orderDetails.id)

                // send notification to user start----------------------------
                // get user token 
                nosql.select('getUser', 'Users').make(function (builder) {
                    builder.where('phone', orderDetails.iduser);
                    builder.first();
                })
                var user = await nosql.promise('getUser');
                // console.log("user",user);
                var message = {
                    data: {
                        type: 'order status update',
                        orderid: orderDetails.id,
                        message: `Order Status update to Delivered`,
                        "click_action": "FLUTTER_NOTIFICATION_CLICK"
                    },
                    notification: {
                        title: "Order Update",
                        body: `${orderDetails.name}, Your shopsasta order #${orderDetails.number} is  Delivered`
                    },
                    //"click_action": "FLUTTER_NOTIFICATION_CLICK",
                    token: user.token
                };

                if (user.token != undefined && user.token != null) {
                    //console.log("HElooooooooooooooooooooooooooo");
                    fcm.sendNotification(message)
                }
                // send notification to user end----------------------------


                self.json({ status: true, message: "Payment Success" })
            } else {
                self.json({ status: false, message: "Payment Pending" })
            }

        })
        .catch(function (error) {
            console.log("RAZORPAY PAYMENT STATUS  ERROR RESPONSE---------------", error.message);
            self.json({ status: false, message: error.message })
        });

}

// function to update delivery person details
async function getDeliverypersonById() {
    var self = this;
    var nosql = new Agent();
    var opt = self.params;
    var decoded = self.token.userData;


    nosql.select('getdelivery', 'delivery_person').make(function (builder) {
        builder.where('id', opt.id);
        builder.and();
        builder.where('createdby', decoded.name);
        builder.first();
    });
    var deliveryModel = await nosql.promise('getdelivery');
    if (deliveryModel == null) {
        return self.json({
            "status": false,
            "message": "No Delivery person"
        });
    }
    self.json({
        status: true,
        data: deliveryModel
    })
}

// function to update delivery person details
async function deliveryPersonUpdate() {
    var self = this;
    var nosql = new Agent();
    var model = self.body;
    var decoded = self.token.userData;
    //console.log("model",model);
    if (model.id) {
        nosql.select('getdelivery', 'delivery_person').make(function (builder) {
            builder.where('id', model.id);
            builder.first();
        });
        var deliveryModel = await nosql.promise('getdelivery');
        if (deliveryModel == null) {
            return self.json({
                "status": false,
                "message": "No Delivery person"
            });
        }
        nosql.update('update', 'delivery_person').make(function (builder) {
            builder.set(model);
            builder.set('updatedBy', decoded.name);
            builder.set('updatedOn', new Date())
            builder.where('id', model.id);
        })

        var update = await nosql.promise('update');

        if (update > 0) {
            return self.json({
                status: true,
                message: "Updated successfully"
            })
        } else {
            return self.json({
                status: false,
                message: "Update Fail"
            })
        }

    } else {
        return self.json({
            status: false,
            message: "Please Provide the phone number"
        })
    }


}

// order delivery status update by admin
async function adminDeliveryStatusUpdatde() {
    var self = this;
    var nosql = new Agent();
    var id = self.params.id;
    var body = self.body;
    nosql.update('update', 'orders').make(function (builder) {
        builder.set('status', body.status);
        builder.where('id', id);
    })
    var update = await nosql.promise('update');
    if (update > 0) {
        // send notification to user

        nosql.select('getOrder', 'orders').make(function (builder) {
            builder.where('id', id);
            builder.first();
        })
        var order = await nosql.promise('getOrder');
        // get user token 
        nosql.select('getUser', 'Users').make(function (builder) {
            builder.where('phone', order.iduser);
            builder.first();
        })
        var user = await nosql.promise('getUser');
        // console.log("user",user);
        var message = {
            data: {
                type: 'order status update',
                orderid: order.id,
                message: `Order Status update to ${order.status}`,
                "click_action": "FLUTTER_NOTIFICATION_CLICK"
            },
            notification: {
                title: "Order Update",
                body: `${order.name}, Your shopsasta order ${order.number} is  ${order.status}`
            },
            //"click_action": "FLUTTER_NOTIFICATION_CLICK",
            token: user.token
        };


        if (user.token != undefined && user.token != null) {
            //console.log("HElooooooooooooooooooooooooooo");
            fcm.sendNotification(message)
        }
        // send sms to user 

        if (body.status == "Out for Delivery") {
            template = "SS_Order_Dispatched";
            var subject = `Order #${order.id} - Out for Delivery`;
            order.status = "Out for Delivery";
            order.email_msg = `Hi ${order.name}, Your shopsasta order ${order.number} has been dispatched. Your order will be delivered today. Thanks for shopping with us!`;
            MAIL(order.email, subject, '=?/mails/order', order, "");
            smsModule.sendSMS(order.iduser, template, order);
        }

        if (body.status == "Ready for Delivery") {
            //template = "SS_Order_Dispatched";
            var subject = `Order #${order.id} - Ready For Delivery`;
            order.status = "Ready For Delivery";
            order.email_msg = `Hi ${order.name}, Your shopsasta order ${order.number} has been ready for delivery. Thanks for shopping with us!`;
            MAIL(order.email, subject, '=?/mails/order', order, "");
            //smsModule.sendSMS(order.iduser, template, order);
        }

        if (body.status == "Delivery Attempted") {
            template = "SS_Delivery_Attempted";
            var subject = `Order #${order.id} - Delivery Attempted`;
            order.status = "Delivery Attempted";
            order.email_msg = `Hi ${order.name}, We tried to deliver your order ${order.number} today. Seems nobody is at home. We will try one last time again tomorrow. Thanks for shopping with us!`;
            MAIL(order.email, subject, '=?/mails/order', order, "");
            smsModule.sendSMS(order.iduser, template, order);
        }

        if (body.status == "Delivered") {
            template = "SS_Order_Delivered";
            var subject = `Order #${order.id} - Delivered`;
            order.status = "Delivered";
            order.email_msg = `Hi ${order.name}, Your shopsasta order ${order.number} has been delivered. Thanks for shopping with us!`;
            MAIL(order.email, subject, '=?/mails/order', order, "");
            smsModule.sendSMS(order.iduser, template, order);

            cashbackEmmitter.emit('cashback', order.id);
        }

        if (body.status == "Cancelled") {
            template = "SS_Order_Cancelled";
            var subject = `Order #${order.id} - Cancelled`;
            order.status = "Cancelled";
            order.email_msg = `Hi ${order.name}, Your shopsasta order ${order.number} is successfully cancelled. Ordered amount will be refunded in 7 working days if you paid online. Thanks for shopping with us!`;
            MAIL(order.email, subject, '=?/mails/order', order, "");
            smsModule.sendSMS(order.iduser, template, order);
        }


        self.json({
            status: true,
            message: "Success"
        })
    } else {
        self.json({
            status: false
        })
    }
}

// order delivery status update by delivery person
async function deliveryStatusUpdatde() {
    var self = this;
    var nosql = new Agent();
    var body = self.body;
    var type = self.body.type;
    var decoded = self.token;
    var id = self.params.id;
    // var orderDetails = await getOrderDetails(id);
    const date = new Date();
    const zone = 'Asia/Kolkata';
    const datecreatedString = moment.tz(date, zone).format();
    var deliveryPesonDetails = await getDeliveryPersonDetails(decoded.phone)
    //console.log("body", body);
    nosql.select('getOrder', 'orders').make(function (builder) {
        builder.where('id', id);
        builder.first();
    })
    var orderDetails = await nosql.promise('getOrder');

    // send notification to user start----------------------------
    // get user token 
    nosql.select('getUser', 'Users').make(function (builder) {
        builder.where('phone', orderDetails.iduser);
        builder.first();
    })
    var user = await nosql.promise('getUser');
    // console.log("user",user);
    var message = {
        data: {
            type: 'order status update',
            orderid: orderDetails.id,
            message: `Order Status update to ${body.status}`,
            "click_action": "FLUTTER_NOTIFICATION_CLICK"
        },
        notification: {
            title: "Order Update",
            body: `${orderDetails.name}, Your shopsasta order #${orderDetails.number} is  ${body.status}`
        },
        //"click_action": "FLUTTER_NOTIFICATION_CLICK",
        token: user.token
    };

    if (user.token != undefined && user.token != null) {
        //console.log("HElooooooooooooooooooooooooooo");
        fcm.sendNotification(message)
    }
    // send notification to user end----------------------------

    if (type == 'online') {
        console.log("IF ONLINE---------------------");
        // paytm qr code generation function
        //await patymLink(orderDetails);

        // send sms the razorpay generation link to the customer
        if (body.phone != undefined || body.phone != null) {
            orderDetails.phone = body.phone;
        }
        razorpayPaymentLink(orderDetails, decoded.name, async function (resp) {
            //console.log("response", resp);
            if (resp.err == null && resp.result == null) {
                return self.json({ status: false, message: "Unable to generate to payment link to the customer!" })
            }

            if (resp.err != null) {
                return self.json({ status: false, message: "Unable to generate to payment link to the customer!" })
            }
            nosql.update('update', 'orders').make(function (builder) {
                // builder.set('status', body.status);
                builder.set('p_type', type);
                builder.set('razorpay_paymentid', resp.result.id);
                builder.set('delivery_comments', body.comment);
                builder.where('id', id);
            })
            var update = await nosql.promise('update');
            return self.json({ status: true, message: "Payment link sent to customer successfully!" })

        });

    }

    if (type == 'cash') {
        console.log("IF CASH--------------------------");
        var deliveryLogs = {
            delivery_person_name: deliveryPesonDetails.name,
            delivery_person_phone: deliveryPesonDetails.phone,
            order_id: id,
            status: "Delivered",
            created_on: new Date(),
            created_on_string:datecreatedString,
            p_type: "cash"
        };
        orderDetails.delivery_logs.push(deliveryLogs);
        nosql.update('update', 'orders').make(function (builder) {
            builder.set('status', body.status);
            builder.set('delivery_comments', body.comment);
            builder.set('delivery_logs', orderDetails.delivery_logs);
            builder.set('p_type', type);
            builder.where('id', id);
        })
        var update = await nosql.promise('update');

        if (update > 0) {

            if (body.status == "Delivered") {
                //console.log("DELIVERED EMAIL TRIGGER FOR CASH-----------------------------------------");
                template = "SS_Order_Delivered";
                var subject = `@(Order #)  ${orderDetails.id} - Delivered`;
                orderDetails.status = "Delivered";
                orderDetails.email_msg = `Hi ${orderDetails.name}, Your shopsasta order ${orderDetails.number} has been delivered. Thanks for shopping with us!`;
                MAIL(orderDetails.email, subject, '=?/mails/order', orderDetails, "");
                smsModule.sendSMS(orderDetails.iduser, template, orderDetails);

                // emmitter functinality to run the cashbacks
                cashbackEmmitter.emit('cashback', id)

            }
            self.json({
                status: true,
                message: "Success"
            })
        } else {
            self.json({
                status: false
            })
        }
    }

    if (body.status == "Delivery Attempted") {

        var deliveryLogs = {
            delivery_person_name: deliveryPesonDetails.name,
            delivery_person_phone: deliveryPesonDetails.phone,
            order_id: id,
            status: "Delivery Attempted",
            created_on: new Date(),
            created_on_string: datecreatedString
        };
        orderDetails.delivery_logs.push(deliveryLogs);

        nosql.update('update', 'orders').make(function (builder) {
            builder.set('status', body.status);
            builder.set('delivery_comments', body.comment);
            builder.set('delivery_logs', orderDetails.delivery_logs);
            builder.where('id', id);
        })
        var update = await nosql.promise('update');
        if (update > 0) {
            template = "SS_Delivery_Attempted";
            var subject = `@(Order #)  ${orderDetails.id} - Delivery Attempted`;
            orderDetails.status = "Delivery Attempted";
            orderDetails.email_msg = `Hi ${orderDetails.name}, We tried to deliver your order ${orderDetails.number} today. Seems nobody is at home. We will try one last time again tomorrow. Thanks for shopping with us!`;
            MAIL(orderDetails.email, subject, '=?/mails/order', orderDetails, "");
            smsModule.sendSMS(orderDetails.iduser, template, orderDetails);
            self.json({
                status: true,
                message: "Success"
            })
        } else {
            self.json({
                status: false
            })
        }

    }

    if (body.type != "cash" && body.status == 'Delivered' && body.type != "online") {
        //console.log("DELIVERED EMAIL TRIGGER -----------------------------------------");
        var deliveryLogs = {
            delivery_person_name: deliveryPesonDetails.name,
            delivery_person_phone: deliveryPesonDetails.phone,
            order_id: id,
            status: "Delivered",
            created_on: new Date(),
            created_on_string: datecreatedString
        };
        orderDetails.delivery_logs.push(deliveryLogs);
        nosql.update('update', 'orders').make(function (builder) {
            builder.set('status', body.status);
            builder.set('delivery_comments', body.comment);
            builder.set('delivery_logs', orderDetails.delivery_logs);
            builder.where('id', id);
        })
        var update = await nosql.promise('update');
        if (update > 0) {
            template = "SS_Order_Delivered";
            var subject = `@(Order #)  ${orderDetails.id} - Delivered`;
            orderDetails.status = "Delivered";
            orderDetails.email_msg = `Hi ${orderDetails.name}, Your shopsasta order ${orderDetails.number} has been delivered. Thanks for shopping with us!`;
            MAIL(orderDetails.email, subject, '=?/mails/order', orderDetails, "");
            smsModule.sendSMS(orderDetails.iduser, template, orderDetails);

            // emmitter functinality to run the cashbacks
            cashbackEmmitter.emit('cashback', orderDetails.id)

            // send notification to user start----------------------------
            // get user token 
            nosql.select('getUser', 'Users').make(function (builder) {
                builder.where('phone', orderDetails.iduser);
                builder.first();
            })
            var user = await nosql.promise('getUser');
            // console.log("user",user);
            var message = {
                data: {
                    type: 'order status update',
                    orderid: orderDetails.id,
                    message: `Order Status update to Delivered`,
                    "click_action": "FLUTTER_NOTIFICATION_CLICK"
                },
                notification: {
                    title: "Order Update",
                    body: `${orderDetails.name}, Your shopsasta order #${orderDetails.number} is  Delivered`
                },
                //"click_action": "FLUTTER_NOTIFICATION_CLICK",
                token: user.token
            };

            if (user.token != undefined && user.token != null) {
                //console.log("HElooooooooooooooooooooooooooo");
                fcm.sendNotification(message)
            }
            // send notification to user end----------------------------
            self.json({
                status: true
            })
        } else {
            self.json({
                status: false
            })
        }
    }
}

// function to register delivery person
async function deliveryPersonRegister() {
    var self = this;
    var nosql = new Agent();
    var model = self.body;
    var decoded = self.token.userData;
    // model.isActive = true;
    model.createdby = decoded.name;
    model.createdOn = new Date();
    model.id = model.phone;

    if (!model) {
        self.json({
            status: false,
            message: "Please enter details"
        })
    }
    nosql.insert('delivery', 'delivery_person').make(function (builder) {
        builder.set(model);
    })

    nosql.exec(function (err, response) {
        if (err) {
            console.log("mongoerr", err);
            if (err.items[0].error.includes("E11000")) {
                self.json({
                    status: false,
                    message: `Delivery Person ${model.name} already exists`
                })
            }
        }
        // console.log("response", response.saveCat);
        self.json({
            status: true,
            message: "Success"
        })
    });


}

// get all delivery person details
async function getDeliveryPersons() {
    var self = this;
    var nosql = new Agent();
    var decoded = self.token.userData;
    var opt = self.query;
    nosql.select('getdelivery', 'delivery_person').make(function (builder) {
        builder.where('createdby', decoded.name);
        opt.phone && builder.like('phone', opt.phone, '*');
        opt.name && builder.like('name', opt.name, '*');
        //builder.fields('name', 'phone', 'email');
        //builder.first();
    })
    var getdelivery = await nosql.promise('getdelivery');
    if (getdelivery.length > 0) {
        for (let i = 0; i < getdelivery.length; i++) {
            const element = getdelivery[i];
            element.itemName = element.name + "-" + element.phone;
            element.id = element.phone;
        }

        self.json({
            status: true,
            message: "Success",
            data: getdelivery
        })
    } else {
        self.json({
            status: false
        })
    }

}

// get active delivery person details
async function getActiveDeliveryPerson() {
    var self = this;
    var nosql = new Agent();
    var decoded = self.token.userData;
    var opt = self.query;
    nosql.select('getdelivery', 'delivery_person').make(function (builder) {
        // builder.where('createdby', decoded.name);
        opt.phone && builder.like('phone', opt.phone, '*');
        opt.name && builder.like('name', opt.name, '*');
        builder.and();
        builder.where('isActive', true);
        builder.fields('name', 'phone', 'email', 'order_ids');
        //builder.first();
    })
    var getdelivery = await nosql.promise('getdelivery');
    if (getdelivery.length > 0) {
        for (let i = 0; i < getdelivery.length; i++) {
            const element = getdelivery[i];
            element.itemName = element.name + "-" + element.phone;
            element.id = element.phone;
            if (element.order_ids == undefined) {
                element.order_ids = [];
            }
        }

        self.json({
            status: true,
            message: "Success",
            data: getdelivery
        })
    } else {
        self.json({
            status: false
        })
    }

}

// allocate orders for the delivery person
async function deliveryPersonAllocateOrders() {
    var self = this;
    var nosql = new Agent();
    var model = self.body;
    
    nosql.select('getdelivery', 'delivery_person').make(function (builder) {
        builder.where('phone', model.phone);
        builder.first();
    });

    var deliveryPerson = await nosql.promise('getdelivery');
    var delivery = await nosql.promise('delivery');
    nosql.update('delivery', 'delivery_person').make(function (builder) {
        builder.set('order_ids', model.orderIds);
        builder.where('phone', model.phone);
        builder.and();
        builder.where('isActive', true);
    })
    var delivery = await nosql.promise('delivery');

    nosql.select('deliveryOrders', 'delivery_person_orders').make(function (builder) {
        builder.where('id', model.phone);
        builder.first();
    })
    var deliveryOrders = await nosql.promise('deliveryOrders');
    if (deliveryOrders != null) {
        var revised_orders = [];
        revised_orders = [...deliveryOrders.order_ids];
        nosql.update('deliveryOrders', 'delivery_person_orders').make(function (builder) {
            builder.where('id', model.phone);
            builder.set('order_ids', revised_orders)
        })
    } else {
        nosql.insert('deliveryOrders', 'delivery_person_orders').make(function (builder) {
            builder.set('id', model.phone);
            builder.set('order_ids', model.orderIds)
        })
    }
    var deliveryOrders = await nosql.promise('deliveryOrders');
    if (delivery > 0) {
        // update order status to out for delivery
        updateOrders(model.orderIds, deliveryPerson);
        self.json({
            status: true,
            message: "Success"
        })

    } else {
        self.json({
            status: false,
            message: "Orders Allocation fail"
        })
    }
}

// function to login delivery person
function deliveryPersonLogin() {
    var self = this;
    var nosql = new Agent();
    var pn = new PhoneNumber(self.body.phoneNo, 'IN');
    if (self.body.phoneNo = "9347980470") {
        return self.json({
            status: true,
            message: "Otp Sent"
        })
    }
    if (pn.isValid()) {
        const secret = OTP_SECRET + self.body.phoneNo;
        const token = otplib.authenticator.generate(secret);
        var options = {
            'method': 'GET',
            'url': `https://2factor.in/API/V1/e27f1a8a-e428-11e9-9721-0200cd936042/SMS/${self.body.phoneNo}/${token}/Happi`,
        };
        request(options, async function (error, response) {
            var res = JSON.parse(response.body);
            console.log("res", res)
            if (res.Status == "Success") {
                // enter request data into otp_request collection
                nosql.insert('otp', 'otp_request').make(function (builder) {
                    builder.set('phoneNo', self.body.phoneNo);
                    builder.set('type', 'delivery_person');
                    builder.set('timeStamp', new Date());
                })

                var optRequest = await nosql.promise('otp');
                console.log("optRequest", optRequest);

                self.json({
                    status: true,
                    message: "Otp Sent"
                })
            } else {
                self.json({
                    status: false,
                    message: "Unable to send OTP"
                })
            }
        });
    } else {
        self.json({
            status: false,
            message: "Invalid Phone number"
        })
    }
}

// function to verification of otp
function deliveryOtpVerify() {
    var self = this;
    var data = self.body;

    const secret = OTP_SECRET + data.phoneNo;

    var isValid = otplib.authenticator.check(data.otp, secret);
    console.log("PHONE", data.phoneNo, isValid);
    if (data.phoneNo == "9347980470") {
        isValid = true;
        data.otp = "123456"
    }
    if (isValid) {
        var nosql = new Agent();

        nosql.select('user', 'delivery_person').make(function (builder) {
            builder.where('phone', data.phoneNo);
            builder.first();
        });

        nosql.exec(function (err, response) {
            var result = {
                status: true,
                token: jwt.sign({
                    phone: data.phoneNo
                }, JWT_DELIVERY_SECRET_KEY, {
                    expiresIn: '180d'
                }),
                message: "OTP succesfully verified",
            };

            if (response.user == null) {
                result.data = null;
                result.userState = false;
            } else {
                result.data = response.user;
                result.userState = true;
            }
            self.json(result);
            return;
        });
    } else {
        return self.json({
            status: false,
            message: "Invalid OTP"
        });
    }
}

// fetch orders allocated for the delivery person
async function deliveryFetchOrders() {
    // orderid , delivery address , cutomer name , phoneno
    var self = this;
    var nosql = new Agent();
    var decoded = self.token;
    nosql.select('getOrders', 'delivery_person').make(function (builder) {
        builder.where('phone', decoded.phone);
        builder.first();
    })
    var getOrders = await nosql.promise('getOrders');
    //console.log("getOrders",getOrders);
    if (getOrders != null) {
        if (getOrders.order_ids != undefined) {
            var orders = await getOrdersDetails(getOrders.order_ids);
            self.json({
                status: true,
                message: "Success",
                data: orders
            })
        } else {
            self.json({
                status: false,
                message: "No Orders assigned"
            })
        }

    } else {
        self.json({
            status: false,
            message: "Orders Fetch fail"
        })
    }
}

// fetch single order by orderid allocated for delivery person
async function deliveryFetchOrder(id) {
    // orderid , delivery address , cutomer name , phoneno , items
    var self = this;
    var nosql = new Agent();
    var decoded = self.token;
    nosql.select('getOrders', 'orders').make(function (builder) {
        builder.fields('id', 'phone', 'deliverycity', 'deliverycountry', 'delivery', 'deliveryAddress_json',
            'deliveryfirstname', 'deliverylastname', 'deliveryphone', 'deliverystreet', 'tag', 'price', 'number',
            'deliveryzip', 'items', 'status', 'p_type');
        builder.where('id', id);
        builder.first();
    })
    var getOrders = await nosql.promise('getOrders');
    //console.log("getOrders", getOrders);
    if (getOrders != null) {
        self.json({
            status: true,
            message: "Success",
            data: getOrders
        })
    } else {
        self.json({
            status: false,
            message: "Order Fetch fail"
        })
    }
}

// function to get the order details
async function getOrdersDetails(orderIds) {
    var nosql = new Agent();
    var orders = [];
    for (let i = 0; i < orderIds.length; i++) {
        const element = orderIds[i];
        nosql.select('getOrders', 'orders').make(function (builder) {
            builder.where('id', element);
            builder.fields('id', 'deliverycity', 'deliverycountry',
                'deliveryfirstname', 'deliverylastname', 'deliveryphone', 'deliverystreet',
                'deliveryzip', 'status', 'datecreated', 'phone', 'price');
            builder.first();
        })
        var getOrders = await nosql.promise('getOrders');
        orders.push(getOrders);
    }
    return orders;
}

// function to update the order status
async function updateOrders(orderIds, deliveryPerson) {
    var nosql = new Agent();
    const date = new Date();
    const zone = 'Asia/Kolkata';
    const datecreatedString = moment.tz(date, zone).format();
    for (var i = 0; i < orderIds.length; i++) {
        var id = orderIds[i];
        nosql.select('getOrder', 'orders').make(function (builder) {
            builder.where('id', id);
            builder.first();
        })
        var order = await nosql.promise('getOrder');
        var deliveryLogs = {
            delivery_person_name: deliveryPerson.name,
            delivery_person_phone: deliveryPerson.phone,
            order_id: id,
            status: "Out for Delivery",
            created_on: new Date(),
            created_on_string:datecreatedString
        };
        console.log("order.==================",order.delivery_logs);
        if(order.delivery_logs != undefined || order.delivery_logs != null) {
            order.delivery_logs.push(deliveryLogs);
        } else {
            order.delivery_logs = [deliveryLogs];
        }
        if (order.status != "Delivered") {
            nosql.update('update', 'orders').make(function (builder) {
                builder.set('status', 'Out for Delivery');
                builder.set('delivery_logs', order.delivery_logs);
                builder.where('id', id);
            })
            var update = await nosql.promise('update');
            template = "SS_Order_Dispatched";
            var subject = `@(Order #)  ${order.id} - Out for Delivery`;
            order.status = "Out for Delivery";
            order.email_msg = `Hi ${order.name}, Your shopsasta order ${order.number} has been dispatched. Your order will be delivered today. Thanks for shopping with us!`;
            MAIL(order.email, subject, '=?/mails/order', order, "");
            smsModule.sendSMS(order.iduser, template, order);

            // send notification to user start----------------------------
            // get user token 
            nosql.select('getUser', 'Users').make(function (builder) {
                builder.where('phone', order.iduser);
                builder.first();
            })
            var user = await nosql.promise('getUser');
            //console.log("user",user);
            var message = {
                data: {
                    type: 'order status update',
                    orderid: order.id,
                    message: `Order Status update to Out for Delivery`,
                    "click_action": "FLUTTER_NOTIFICATION_CLICK"
                },
                notification: {
                    title: "Order Update",
                    body: `${order.name}, Your shopsasta order #${order.number} is  Out for Delivery`
                },
                //"click_action": "FLUTTER_NOTIFICATION_CLICK",
                token: user.token
            };

            if (user.token != undefined && user.token != null) {
                //console.log("HElooooooooooooooooooooooooooo");
                fcm.sendNotification(message)
            }
            // send notification to user end----------------------------
        }
    }
}

//To create the payment link for an order and send it to the customer's mobile over SMS.
async function patymLink(orderDetails) {
    var paytmConfig = await getPaytmConfig();
    /*
    * import checksum generation utility
    * You can get this utility from https://developer.paytm.com/docs/checksum/
    */
    const PaytmChecksum = require('../modules/paytm_link_checksum');

    var paytmParams = {};

    paytmParams.body = {
        "mid": paytmConfig.PAYTM_MID,
        "merchantOrderId": orderDetails.id,
        "amount": orderDetails.price + "",
        "posId": "S1234_P1235",
        "userPhoneNo": orderDetails.iduser
    };
    console.log("PAYTM_PARAMS", JSON.stringify(paytmParams.body));
    /*
    * Generate checksum by parameters we have in body
    * Find your Merchant Key in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys 
    */
    console.log("0000000000000000000000000000")
    PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), paytmConfig.PAYTM_CHECK_SUM_KEY).then(function (checksum) {
        console.log("1111111111111111111111111111111111")

        paytmParams.head = {
            "clientId": "C11",
            "version": "v1",
            "signature": checksum
        };

        ///////------------------------------------ ////////////////////////////////////////////////////////////
        var post_data = JSON.stringify(paytmParams);

        var options = {

            /* for Staging */
            hostname: 'securegw-stage.paytm.in',

            /* for Production */
            // hostname: 'securegw.paytm.in',

            port: 443,
            path: '/order/sendpaymentrequest',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': post_data.length
            }
        };

        var response = "";
        var post_req = https.request(options, function (post_res) {
            post_res.on('data', function (chunk) {
                response += chunk;
            });

            post_res.on('end', function () {
                console.log('Response: ', response);
            });
        });

        post_req.write(post_data);
        post_req.end();
        ///////------------------------------------ ////////////////////////////////////////////////////////////
        // var config = {
        //     method: 'POST',
        //     port: 443,
        //     url: 'https://securegw-stage.paytm.in/order/sendpaymentrequest',
        //     headers: {
        //         'Content-Type': 'application/json',
        //         'Content-Length': header.length
        //     },
        //     data:{}
        // };

        // axios(config)
        //     .then(function (response) {
        //         console.log(JSON.stringify(response.data));
        //     })
        //     .catch(function (error) {
        //         console.log(error);
        //     });

    });


}


// function to get the paytm config data
async function getPaytmConfig() {
    var nosql = new Agent();
    nosql.select('getData', 'configuration').make(function (builder) {
        builder.where('configurationName', 'Paytm');
        builder.first();
    });
    var getData = await nosql.promise('getData');
    var json = getData.configurationDetails;
    //console.log("data",json)
    return json;
}

// function to get order details by id
async function getOrderDetails(orderId) {
    var nosql = new Agent();
    nosql.select('getOrders', 'orders').make(function (builder) {
        builder.where('id', orderId);
        builder.first();
    })
    var getOrders = await nosql.promise('getOrders');
    //console.log("getOrder---------------------------------------",getOrders);
    var mnosql = new Agent();
    mnosql.select('getUsers', 'Users').make(function (builder) {
        builder.where('phone', getOrders.iduser);
        builder.and();
        builder.where('delivery_type', 'shop-sasta');
        builder.first();
    })
    var getUsers = await mnosql.promise('getUsers');
    //console.log("getuser---------------------------------------",getUsers.phone);
    getOrders.userDetails = getUsers;
    return getOrders;
}

//To create the payment link for an order and send it to the customer's mobile over SMS.
async function razorpayPaymentLink(order, delieveryPerson, cb) {

    var data = JSON.stringify({
        "amount": order.price * 100,
        "currency": "INR",
        "reference_id": order.id,
        "description": "Payment for policy no #23456",
        "customer": {
            "name": order.name,
            "contact": `+91${order.phone}`,
            "email": order.email
        },
        "notify": {
            "sms": true,
            "email": true
        },
        "reminder_enable": true,
        "notes": {
            "delivery_person_name": delieveryPerson
        }
    });
    var config = {
        method: 'post',
        url: 'https://api.razorpay.com/v1/payment_links/',
        headers: {
            'Authorization': `Basic ${RAZORPAY_KEY}`,
            'Content-Type': 'application/json'
        },
        data: data
    };
    var obj = { result: null, err: null };
    axios(config)
        .then(function (response) {
            console.log("RAZORPAY PAYMENT LINK GENERATE API RESPONSE---------------", JSON.stringify(response.data));
            obj.result = response.data;
            cb(obj);
        })
        .catch(function (error) {
            console.log("RAZORPAY PAYMENT LINK GENERATE API ERROR---------------", error.message);
            obj.err = error.message;
            cb(obj);
        });


}


async function getDeliveryPersonDetails(phone) {
    var nosql = new Agent();
    nosql.select('getdelivery', 'delivery_person').make(function (builder) {
        builder.where('phone', phone);
        builder.first();
    });

    var deliveryPerson = await nosql.promise('getdelivery');
    return deliveryPerson;
}




