var MONGO_DB_CONNECTION = process.env.MONGO_DB_CONNECTION || F.config['mongo'];;
var fs = require('fs');
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
const assert = require('assert');
const { v4: uuidv4 } = require('uuid');
var jwt = require('jsonwebtoken');
var Agent = require('sqlagent/mongodb').connect(MONGO_DB_CONNECTION);
const EventEmitter = require('events');
const myEmitter = new EventEmitter();
var async = require('async');
const fcm = MODULE('firebaseNotification');


// Database Name
const DB_NAME = process.env.DB_NAME || F.config['db-name'];
// send sms import modile
var smsModule = MODULE('sms');
// send email import module
var emailModule = MODULE('email');

// event emitter to update all product stock...
myEmitter.on('cashback', async function cashbackCalculate(id) {
    console.log("CASHBACK CALC EMITTER FUNCTION STARTED----------------", id);
    var nosql = new Agent();
    var orderDetails = await getOrderDetails(id);
    var userDetails = orderDetails.userDetails;
    //console.log("order",userDetails);
    // return;
    if (orderDetails == null) {
        return console.log("Not a Shop Sasta Order");
    }
    async.series({
        referral: async function () {
            var referralCashbackObj = orderDetails.referral_cashback;
            if (Object.keys(referralCashbackObj).length === 0) {
                return { err: null, res: "NO REFERRAL CASHBACK" }
            }
            if (referralCashbackObj.cashback_amount == 0) {
                return { err: null, res: "REFERRAL CASHBACK 0" }
            }
            nosql.select('getReferaluser', 'Users').make(function (builder) {
                builder.where('referal_code', userDetails.referred_by);
                builder.first();
                console.log("referral builder", builder.builder);
            })
            var getReferaluser = await nosql.promise('getReferaluser');
           // console.log("getReferaluser",getReferaluser);
            var eachOrderEarning = {};
            eachOrderEarning.cashback_amount = parseInt(referralCashbackObj.cashback_amount);
            eachOrderEarning.pincode = orderDetails.deliveryzip;
            eachOrderEarning.phone = getReferaluser.phone;
            eachOrderEarning.cashback_percent = referralCashbackObj.percent;
            eachOrderEarning.cashback_type = 'referral';
            //eachOrderEarning.weekId = uuid;
            eachOrderEarning.type = 'Credit';
            eachOrderEarning.createdon = new Date();
            eachOrderEarning.description = referralCashbackObj.description;


            nosql.insert('earning', 'user_earnings').make(function (builder) {
                builder.set(eachOrderEarning)
            })

            await nosql.promise('earning');
            var walletAmount = 0;
            if (!getReferaluser.wallet_amount) {
                walletAmount = 0;
            }

            walletAmount += getReferaluser.wallet_amount + parseInt(referralCashbackObj.cashback_amount);
            //console.log("users=============================",users.wallet_amount);
            nosql.update('updateusers', 'Users').make(function (builder) {
                builder.where('phone', getReferaluser.phone);
                builder.set('wallet_amount', walletAmount)
            })
            var updateusers = await nosql.promise('updateusers');
            // send push notification
            var message = {
                data: {
                    type: 'order status update',
                    orderid: orderDetails.id,
                    message: `Cashback received`,
                    "click_action": "FLUTTER_NOTIFICATION_CLICK"
                },
                notification: {
                    title: "Cashback Received",
                    body: referralCashbackObj.description
                },
                //"click_action": "FLUTTER_NOTIFICATION_CLICK",
                token: getReferaluser.token
            };


            if (getReferaluser.token != undefined && getReferaluser.token != null) {
                //console.log("HElooooooooooooooooooooooooooo");
                fcm.sendNotification(message)
            }
            return { err: null, res: "Success" }
        },
        specialEvent: async function () {
            //await callback(null, 2);
            var specialEventCashbackObj = orderDetails.special_event_cashback;
            if (Object.keys(specialEventCashbackObj).length === 0) {
                return { err: null, res: "NO SPECIAL EVENT CASHBACK" }
            }
            if (specialEventCashbackObj.cashback_amount == 0) {
                return { err: null, res: "SPECIAL EVENT CASHBACK 0" }
            }
            var cashback_amount = parseInt(specialEventCashbackObj.cashback_amount);
            ////////////////////////////////// ------------   ////////////////////////////////
            var eachOrderEarning = {};
            eachOrderEarning.cashback_amount = cashback_amount;
            eachOrderEarning.pincode = orderDetails.deliveryzip;
            eachOrderEarning.phone = orderDetails.iduser;
            eachOrderEarning.cashback_percent = specialEventCashbackObj.offerPercentage || 0;
            eachOrderEarning.cashback_type = 'special-event';
            //eachOrderEarning.weekId = uuid;
            eachOrderEarning.type = 'Credit';
            eachOrderEarning.createdon = new Date();
            eachOrderEarning.description = specialEventCashbackObj.description;
            eachOrderEarning.phone = userDetails.phone;


            nosql.insert('earning', 'user_earnings').make(function (builder) {
                builder.set(eachOrderEarning)
            })

            await nosql.promise('earning');
            var walletAmount = 0;
            var userData = await fetchWalletAmount(userDetails.phone);
            if (!userData.wallet_amount) {
                walletAmount = 0;
            }

            walletAmount += userData.wallet_amount + cashback_amount;
            console.log("users=============================", walletAmount);
            nosql.update('updateusers', 'Users').make(function (builder) {
                builder.where('phone', userDetails.phone);
                builder.set('wallet_amount', walletAmount)
            })
            var updateusers = await nosql.promise('updateusers');
            console.log("updateusers", updateusers);
            // send push notification
            var message = {
                data: {
                    type: 'order status update',
                    orderid: orderDetails.id,
                    message: `Cashback received`,
                    "click_action": "FLUTTER_NOTIFICATION_CLICK"
                },
                notification: {
                    title: "Cashback Received",
                    body: specialEventCashbackObj.description
                },
                //"click_action": "FLUTTER_NOTIFICATION_CLICK",
                token: userData.token
            };


            if (userData.token != undefined && userData.token != null) {
                //console.log("HElooooooooooooooooooooooooooo");
                fcm.sendNotification(message)
            }
            return { err: null, res: "Success" }
            ///////////////////////////////// ------------- /////////////////////////////////
        },
        noRush: async function () {
            // check if the order is norushe
            //var uuid = uuidv4();
            var noRushCashbackObj = orderDetails.norush_cashback;
            if (Object.keys(noRushCashbackObj).length === 0) {
                return { err: null, res: "NO RUSH CASHBACK" }
            }
            if (noRushCashbackObj.cashback_amount == 0) {
                //console.log("Cashback amount 0");
                return { err: null, res: "NO RUSH CASHBACK  amount 0" }
            }
            var cashback_amount = parseInt(noRushCashbackObj.cashback_amount);
            var eachOrderEarning = {};
            eachOrderEarning.cashback_amount = cashback_amount;
            eachOrderEarning.pincode = orderDetails.deliveryzip;
            eachOrderEarning.phone = orderDetails.iduser;
            eachOrderEarning.cashback_percent = noRushCashbackObj.percent;
            eachOrderEarning.cashback_type = 'norush';
            // eachOrderEarning.weekId = uuid;
            eachOrderEarning.type = 'Credit';
            eachOrderEarning.createdon = new Date();
            eachOrderEarning.description = noRushCashbackObj.description;
            eachOrderEarning.phone = userDetails.phone;



            nosql.insert('earning', 'user_earnings').make(function (builder) {
                builder.set(eachOrderEarning)
            })

            await nosql.promise('earning');
            var walletAmount = 0;
            var userData = await fetchWalletAmount(userDetails.phone);
            if (!userData.wallet_amount) {
                walletAmount = 0;
            }

            walletAmount += userData.wallet_amount + cashback_amount;
            console.log("no rush users=============================", walletAmount);
            nosql.update('updateusers', 'Users').make(function (builder) {
                builder.where('phone', userDetails.phone);
                builder.set('wallet_amount', walletAmount)
            })
            var updateusers = await nosql.promise('updateusers');
            console.log("no rush updateusers", updateusers);

             // send push notification
             var message = {
                data: {
                    type: 'order status update',
                    orderid: orderDetails.id,
                    message: `Cashback received`,
                    "click_action": "FLUTTER_NOTIFICATION_CLICK"
                },
                notification: {
                    title: "Cashback Received",
                    body: noRushCashbackObj.description
                },
                //"click_action": "FLUTTER_NOTIFICATION_CLICK",
                token: userData.token
            };


            if (userData.token != undefined && userData.token != null) {
                //console.log("HElooooooooooooooooooooooooooo");
                fcm.sendNotification(message)
            }
            return { err: null, res: "Success" }

        },
        grouping: async function () {
            var uuid = uuidv4();
            if (orderDetails.grouping_cashback == undefined || orderDetails.grouping_cashback == null) {
                return { err: null, res: "NO GROUPING CASHBACK" }
            }


            var groupingCashbackObj = orderDetails.grouping_cashback;
            groupingCashbackObj.cashback_amount = parseInt(groupingCashbackObj.cashback_amount);
            if (groupingCashbackObj.cashback_amount == 0) {
                //console.log("Cashback amount 0");
                return { err: null, res: "GROUPING CASHBACK  amount 0" }
            }
            groupingCashbackObj.phone = orderDetails.iduser;
            groupingCashbackObj.type = 'Credit';
            nosql.insert('earning', 'user_earnings').make(function (builder) {
                builder.set(groupingCashbackObj)
            });
            await nosql.promise('earning');
            var walletAmount = 0;
            var userData = await fetchWalletAmount(userDetails.phone);
            if (!userData.wallet_amount) {
                walletAmount = 0;
            }

            walletAmount += userData.wallet_amount + groupingCashbackObj.cashback_amount;
            console.log("grouping  users=============================", walletAmount);
            nosql.update('updateusers', 'Users').make(function (builder) {
                builder.where('phone', userDetails.phone);
                builder.set('wallet_amount', walletAmount)
            })
            var updateusers = await nosql.promise('updateusers');
            console.log("grouping updateusers", updateusers);

             // send push notification
             var message = {
                data: {
                    type: 'order status update',
                    orderid: orderDetails.id,
                    message: `Cashback received`,
                    "click_action": "FLUTTER_NOTIFICATION_CLICK"
                },
                notification: {
                    title: "Cashback Received",
                    body: groupingCashbackObj.description
                },
                //"click_action": "FLUTTER_NOTIFICATION_CLICK",
                token: userData.token
            };


            if (userData.token != undefined && userData.token != null) {
                //console.log("HElooooooooooooooooooooooooooo");
                fcm.sendNotification(message)
            }
            return { err: null, res: "Success" }
        }

    }, function (err, results) {
        // results is now equals to: {one: 1, two: 2}
        console.log("err", err, "results: ", results);
        for (var obj in results) {
            //   console.log("obj",obj);
            if (results[obj].res == 'Success') {
                // send sms and email
                var template1 = "SS_Cashbacks";
                var subject1 = `Order # ${orderDetails.id} - Cashback Issued`;
                var email_msg = `Hi ${orderDetails.name}, You have received the cashback. Check your account for the details. Thanks for shopping with us!`;
                smsModule.sendSMS(orderDetails.iduser, template1, orderDetails);

                var email = {
                    //to:["sowmya@iipl.work"],
                    to: orderDetails.email,
                    from: 'shopsasta - Community Group Buying <noreply@mail.shopsasta.com>',
                    subject: subject1,
                    body: email_msg,
                    attachments: []
                };
                emailModule.send_mail(email.to, email.from, email.subject, email.body, email.attachments, function (err, result1) {
                    console.log("Email Res", err, result1);
                })
            }

        }

    });
});


async function getOrderDetails(orderId) {
    var nosql = new Agent();
    nosql.select('getOrders', 'orders').make(function (builder) {
        builder.where('id', orderId);
        builder.and();
        //builder.where('delivery_type', 'shop-sasta');
        builder.first();
    })
    var getOrders = await nosql.promise('getOrders');
    //console.log("getOrder---------------------------------------", getOrders);
    var mnosql = new Agent();
    mnosql.select('getUsers', 'Users').make(function (builder) {
        builder.where('phone', getOrders.iduser);
        builder.first();
    })
    var getUsers = await mnosql.promise('getUsers');
    //console.log("getuser---------------------------------------",getUsers.phone);
    getOrders.userDetails = getUsers;
    return getOrders;
}

async function fetchWalletAmount(phone) {
    var nosql = new Agent();
    nosql.select('getUsers', 'Users').make(function (builder) {
        builder.where('phone', phone);
        builder.fields('wallet_amount','token');
        builder.first();
    })
    var getUsers = await nosql.promise('getUsers');

    return getUsers;
}






module.exports = myEmitter;
