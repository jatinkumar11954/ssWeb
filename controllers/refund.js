var MONGO_DB_CONNECTION = process.env.MONGO_DB_CONNECTION || F.config['mongo'];;
var Agent = require('sqlagent/mongodb').connect(MONGO_DB_CONNECTION);

// send sms import modile
var smsModule = MODULE('sms');

// send email import module
var emailModule = MODULE('email');

// import push notification module
const fcm = MODULE('firebaseNotification');


exports.install = function () {
    ROUTE('/admin/api/order-wallet-refund', orderWalletRefund, ['POST', '#adminVerify', 'cors']);
    ROUTE('/admin/api/order-bank-refund', orderBankRefund, ['POST', '#adminVerify', 'cors']);
}


// api to refund the order amount to user wallet
async function orderWalletRefund() {
    var self = this;
    var body = self.body;
    var nosql = new Agent();
    var user = await fetchUser(body.phone);
    var revised_wallet = 0;
    var revised_refund = parseFloat(body.refund_amount.toFixed(2));
    var order = await fetchOrder(body.order_id);
    if (order.status != "Cancelled") {
        return self.json({
            status: false,
            message: "Sorry! Order is not in cancelled status!"
        })
    }
    if (user != null) {
        revised_wallet = user.wallet_amount + body.refund_amount;
        nosql.update('updateUser', 'Users').make(function (builder) {
            builder.where('phone', body.phone);
            builder.set('wallet_amount', revised_wallet);

        });
        await nosql.promise('updateUser');

        if (order.refund_amount != undefined) {
            revised_refund += order.refund_amount;
        }

        nosql.update('updateOrder', 'orders').make(function (builder) {
            builder.where('id', body.order_id);
            builder.set('refund_amount', parseFloat(revised_refund.toFixed(2)))
            builder.set('refund_type', 'wallet');
            builder.set('status', 'Refunded');
        });
        await nosql.promise('updateOrder');

        // send push notification start --------------------------------------------
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
                message: `Order Status update to Refunded`,
                "click_action": "FLUTTER_NOTIFICATION_CLICK"
            },
            notification: {
                title: "Order Update",
                body: `${order.name}, Your shopsasta order ${order.number} is  Refunded`
            },
            //"click_action": "FLUTTER_NOTIFICATION_CLICK",
            token: user.token
        };


        if (user.token != undefined && user.token != null) {
            //console.log("HElooooooooooooooooooooooooooo");
            fcm.sendNotification(message)
        }
        // send push notification end --------------------------------------------

        // send sms 
        let template = "SS_OR_Refund";
        smsModule.sendSMS(order.iduser, template, order);

        // send mail
        var subject = `Order #${order.id} - Refunded`;
        order.status = "Refunded";
        order.email_msg = `Hi ${order.name}, We processed your refund for order ${order.number} successfully. The ordered amount ₹${order.price} will be credited to your account in 7 - 10 working days. Thanks for shopping with us!`;
        MAIL(order.email, subject, '=?/mails/order', order, "");

        var eachOrderEarning = {};
        eachOrderEarning.cashback_amount = parseFloat(body.refund_amount.toFixed(2));
        eachOrderEarning.pincode = order.zip;
        eachOrderEarning.phone = order.iduser;
        eachOrderEarning.cashback_type = 'refund';
        eachOrderEarning.type = 'Credit';
        eachOrderEarning.createdon = new Date();
        eachOrderEarning.description = `Wallet amount ₹${parseFloat(body.refund_amount.toFixed(2))} has been refunded for the order #${order.id}`;
        
        nosql.insert('earning', 'user_earnings').make(function (builder) {
            builder.set(eachOrderEarning)
        })

        await nosql.promise('earning');
        self.json({
            status: true,
            message: "Refund Success"
        })
    } else {
        self.json({
            status: false,
            message: "Sorry! Refund Fail!"
        })
    }
}


// api to refund the order amount to user bank account
async function orderBankRefund() {
    var self = this;
    var body = self.body;
    var nosql = new Agent();
    var revised_refund = parseFloat(body.refund_amount.toFixed(2));
    var order = await fetchOrder(body.order_id);
    if (order.status != "Cancelled") {
        return self.json({
            status: false,
            message: "Sorry! Order is not in cancelled status!"
        })
    }
    if (order.refund_amount != undefined) {
        revised_refund += order.refund_amount;
    }
    nosql.update('updateOrder', 'orders').make(function (builder) {
        builder.where('id', body.order_id);
        builder.set('refund_amount', parseFloat(revised_refund.toFixed(2)));
        builder.set('refund_type', 'bank');
        builder.set('refund_id', body.refund_id);
        builder.set('status', 'Refunded');
    });
    await nosql.promise('updateOrder');
    // send push notification start --------------------------------------------
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
            message: `Order Status update to Refunded`,
            "click_action": "FLUTTER_NOTIFICATION_CLICK"
        },
        notification: {
            title: "Order Update",
            body: `${order.name}, Your shopsasta order ${order.number} is  Refunded`
        },
        //"click_action": "FLUTTER_NOTIFICATION_CLICK",
        token: user.token
    };


    if (user.token != undefined && user.token != null) {
        //console.log("HElooooooooooooooooooooooooooo");
        fcm.sendNotification(message)
    }
    // send push notification end --------------------------------------------

    // send sms 
    let template = "SS_Order_Refund";
    smsModule.sendSMS(order.iduser, template, order);

    // send mail
    var subject = `Order #${order.id} - Refunded`;
    order.status = "Refunded";
    order.email_msg = `Hi ${order.name}, We processed your refund for order ${order.number} successfully. The ordered amount ₹${order.price} will be credited to your account in 7 - 10 working days. Thanks for shopping with us!`;
    MAIL(order.email, subject, '=?/mails/order', order, "");

    // save user earnings record
    var eachOrderEarning = {};
    eachOrderEarning.cashback_amount = parseFloat(body.refund_amount.toFixed(2));
    eachOrderEarning.pincode = order.zip;
    eachOrderEarning.phone = order.iduser;
    eachOrderEarning.cashback_type = 'refund';
    eachOrderEarning.type = 'Credit';
    eachOrderEarning.createdon = new Date();
    eachOrderEarning.description = `Wallet amount ₹${parseFloat(body.refund_amount.toFixed(2))} has been refunded for the order #${order.id}`;

    nosql.insert('earning', 'user_earnings').make(function (builder) {
        builder.set(eachOrderEarning)
    })

    await nosql.promise('earning');
  
    self.json({
        status: true,
        message: "Refund Success"
    })
}


async function fetchUser(phone) {
    var nosql = new Agent();
    nosql.select('getUser', 'Users').make(function (builder) {
        builder.where('phone', phone);
        builder.first();
    });
    var user = await nosql.promise('getUser');
    return user;
}

async function fetchOrder(id) {
    var nosql = new Agent();
    nosql.select('getOrder', 'orders').make(function (builder) {
        builder.where('id', id);
        builder.first();
    });
    var order = await nosql.promise('getOrder');
    return order;
}