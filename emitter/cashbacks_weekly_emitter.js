var MONGO_DB_CONNECTION = process.env.MONGO_DB_CONNECTION || F.config['mongo'];;
var Agent = require('sqlagent/mongodb').connect(MONGO_DB_CONNECTION);
const EventEmitter = require('events');
const myEmitter = new EventEmitter();
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
const assert = require('assert');
const { v4: uuidv4 } = require('uuid');
// Database Name
const DB_NAME = process.env.DB_NAME || F.config['db-name'];
const fcm = MODULE('firebaseNotification');
// send sms import modile
var smsModule = MODULE('sms');
// send email import module
var emailModule = MODULE('email');

async function getOrders() {
    var nosql = new Agent();
    var beforeOneWeek = new Date(new Date().getTime() - 60 * 60 * 24 * 7 * 1000)
    var beforeOneWeek2 = new Date(beforeOneWeek);
    var day = beforeOneWeek.getDay()
    var diffToMonday = beforeOneWeek.getDate() - day + (day === 0 ? -6 : 1)
    var lastMonday = new Date(beforeOneWeek.setDate(diffToMonday))
    var lastSunday = new Date(beforeOneWeek2.setDate(diffToMonday + 6));
    lastMonday.setUTCHours(0, 0, 0, 0);
    lastSunday.setUTCHours(23, 59, 59, 999);
    nosql.select('getOrders', 'orders').make(function (builder) {
        builder.query('datecreated', {
            $gte: lastMonday,
            $lte: lastSunday
        });
        builder.fields('name', 'zip', 'price')
    })

    var orders = await nosql.promise('getOrders');
    console.log("orders.length", orders.length)
    console.table(orders)
}
// getOrders();
// return;


// event emitter 
myEmitter.on('weekly-cashback', async function cashbackCalculate() {
    console.log("WEEKLY CASHBACKS EMITTER TRIGGERED---------------------------------------");
    var nosql = new Agent();
    var uuid = uuidv4();
    //last week first and last date
    var beforeOneWeek = new Date(new Date().getTime() - 60 * 60 * 24 * 7 * 1000)
    var beforeOneWeek2 = new Date(beforeOneWeek);
    var day = beforeOneWeek.getDay()
    var diffToMonday = beforeOneWeek.getDate() - day + (day === 0 ? -6 : 1)
    var lastMonday = new Date(beforeOneWeek.setDate(diffToMonday))
    var lastSunday = new Date(beforeOneWeek2.setDate(diffToMonday + 6));
    lastMonday.setUTCHours(0, 0, 0, 0);
    lastSunday.setUTCHours(23, 59, 59, 999);
    console.log("lastMonday", lastMonday, "lastSunday", lastSunday);
    // get last week order details
    var lastWeekOrders = [];
    const client = new MongoClient(MONGO_DB_CONNECTION, { useNewUrlParser: true });
    client.connect(function (err, C) {
        assert.equal(null, err);
        const db = C.db(DB_NAME);
        getLastWeekOrders(db, lastMonday, lastSunday, async function (totalOrders) {
            C.close();

            //console.log(totalOrders)
            lastWeekOrders = totalOrders;
            console.log("-----order list-------");
            console.table(lastWeekOrders);

            // get the grouping cashback details
            nosql.select('grouping', 'configuration').make(function (builder) {
                builder.where('configurationName', 'Grouping_Cashback');
                builder.first();
            });
            var grouping = await nosql.promise('grouping');
            var json = grouping.configurationDetails;

            // sort array by decending
            json.sort((a, b) => parseFloat(a.order_amount) - parseFloat(b.order_amount));
            lastWeekOrders.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

            for (let i = 0; i < lastWeekOrders.length; i++) {
                let order = lastWeekOrders[i];
                //console.log("order.price", order.price);
                for (let j = 0; j < json.length; j++) {
                    let cashback = json[j];
                    //console.log("cashback.order_amount", cashback.order_amount);
                    if (order.price >= cashback.order_amount) {
                        order.cashback_percent = cashback.cashback_percent;
                        order.group_name = cashback.group_name
                    }

                }
            }
            console.log("----------slabs---------");
            console.table(json);
            console.log("------lastWeekOrders with cashback------");
            console.table(lastWeekOrders);


            nosql.insert('groupingOrders', 'group_orders').make(function (builder) {
                builder.set('weekid', uuid);
                builder.set('from_dt', lastMonday);
                builder.set('to_dt', lastSunday);
                builder.set('last_week_order_summary', JSON.stringify(lastWeekOrders));
                builder.set('slabs', JSON.stringify(json));
                builder.set('datecreated', new Date());
            });
            var groupingOrders = await nosql.promise('groupingOrders');

            await myEarnings(lastWeekOrders, lastMonday, lastSunday);
        });
    })
})

function getLastWeekOrders(db, fromDt, toDt, cb) {
    const collection = db.collection('orders');
    collection.aggregate(
        [
            {
                "$match": {
                    "datecreated": { $gte: fromDt, $lte: toDt }
                    // "delivery_type":"shop-sasta"
                }
            },
            {
                "$group": {
                    "_id": {
                        "zip": "$zip",
                    },
                    "zip": { $first: '$zip' },
                    "__alias_0": {
                        "$sum": "$price",
                    },
                }
            }, {
                "$project": {
                    "_id": 0,
                    "pincode": "$zip",
                    "price": "$__alias_0",
                }
            },
            {
                "$limit": 5000
            }
        ], {
        "allowDiskUse": true
    }
    ).toArray(function (err, result) {
        // console.log(err, "result", result)
        console.log("LAST WEEK ORDERS", result.length);
        cb(result)
    });
}

async function myEarnings(lastWeekOrders, fromDate, toDate) {
    var nosql = new Agent();
    var uuid = uuidv4();
    for (let i = 0; i < lastWeekOrders.length; i++) {
        let cashback = lastWeekOrders[i];
        nosql.select('getOrders', 'orders').make(function (builder) {
            builder.query('datecreated', {
                $gte: fromDate,
                $lte: toDate
            });

            builder.where('zip', cashback.pincode)
            //builder.fields('id', 'phone', 'price', 'zip', 'datecreated', 'grouping_cashback', 'name', 'iduser', 'status')
            console.log("builder", builder.builder);
        })

        var getOrders = await nosql.promise('getOrders');
        console.log("getOrders", getOrders.length);
        for (let j = 0; j < getOrders.length; j++) {

            let eachOrder = getOrders[j];
            // console.log("eachOrder",eachOrder.grouping_cashback, eachOrder.status);
            // return;
            if (eachOrder.grouping_cashback == undefined || eachOrder.grouping_cashback == null) {
                if (eachOrder.status == 'Delivered') {
                    console.log("STATUS DELIVERED---------------------------------------");
                    var cashback_amount = await generateCashback(eachOrder, cashback.cashback_percent, uuid);
                    await parkgroupingCashbacktoOrder(eachOrder, cashback.cashback_percent, uuid);
                } else {
                    console.log("STATUS NOTTTTTTTTTTTT DELIVERED---------------------------------------");
                    var cashback_amount = await parkgroupingCashbacktoOrder(eachOrder, cashback.cashback_percent, uuid);
                }
            } else {
                console.log(`ALREADY GROUPING CASHBACK CALCULATION DONE FOR ORDER ${eachOrder.id} name: ${eachOrder.name}`);
            }


        }
        //console.log("getOrders", getOrders);
    }
}

async function parkgroupingCashbacktoOrder(eachOrder, cashback, uuid) {
    if (cashback == undefined) {
        console.log("There is no cashback");
        return;
    }
    //console.log("eachOrderEarning------------",eachOrderEarning);
    //console.log("PARKING cashback-----------------",cashback);
    var nosql = new Agent();
    var percent = cashback;
    var cashback_amount = ~~((percent / 100) * eachOrder.price);
    // round down cashback amount
    //console.log("PARKING cashback amount-------------------------------", cashback_amount);
    if (cashback_amount == 0) {
        console.log("Cashback amount 0");
        return;
    }
    
    var eachOrderEarning = {};
    eachOrderEarning.cashback_amount = cashback_amount;
    eachOrderEarning.cashback_percent = cashback;
    eachOrderEarning.cashback_type = 'grouping';
    eachOrderEarning.phone = eachOrder.iduser;
    eachOrderEarning.weekId = uuid;
    eachOrderEarning.type = 'Credit';
    eachOrderEarning.createdon = new Date();
    eachOrderEarning.description = `You have earned group cashback ₹${eachOrderEarning.cashback_amount} for the order #${eachOrder.id}`

    nosql.update('earning', 'orders').make(function (builder) {
        builder.set('grouping_cashback', eachOrderEarning);
        builder.where('id', eachOrder.id)
    })

    await nosql.promise('earning');

    // pushnotification , sms and email for the users

    // return cashback_amount;
}

async function generateCashback(eachOrder, cashback, uuid) {
    if (cashback == undefined) {
        console.log("There is no cashback");
        return;
    }


    var nosql = new Agent();
    var percent = cashback;
    var cashback_amount = ~~((percent / 100) * eachOrder.price);
    //console.log("cashback_amount-------------------------",cashback_amount);
    // round down cashback amount

    if (cashback_amount == 0) {
        console.log("Cashback amount 0");
        return;
    }
    var eachOrderEarning = {};
    eachOrderEarning.cashback_amount = cashback_amount;
    eachOrderEarning.cashback_percent = cashback;
    eachOrderEarning.phone = eachOrder.iduser;
    eachOrderEarning.cashback_type = 'grouping';
    eachOrderEarning.weekId = uuid;
    eachOrderEarning.type = 'Credit';
    eachOrderEarning.createdon = new Date();
    eachOrderEarning.description = `You have earned group cashback ₹${eachOrderEarning.cashback_amount} for the order #${eachOrder.id}`


    nosql.update('updateOrder', 'orders').make(function (builder) {
        builder.set('grouping_cashback', eachOrderEarning);
        builder.where('id', eachOrder.id)
    })

    await nosql.promise('updateOrder');
    nosql.insert('earning', 'user_earnings').make(function (builder) {
        builder.set(eachOrderEarning)
    })

    await nosql.promise('earning');
    nosql.select('users', 'Users').make(function (builder) {
        builder.where('phone', eachOrder.phone);
        builder.first();
    })
    var users = await nosql.promise('users');
    var wallet_amount = 0;
    //console.log("users---------------------------------------",users);
    if (!users.wallet_amount) {
        users.wallet_amount = 0;
    }
    //console.log("wallet_amount",users.wallet_amount,cashback_amount);
    wallet_amount += users.wallet_amount + cashback_amount;
    //console.log("wallet_amount",wallet_amount);

    nosql.update('updateusers', 'Users').make(function (builder) {
        builder.set('wallet_amount', wallet_amount)
        builder.where('phone', eachOrder.phone);

    })
    var updateusers = await nosql.promise('updateusers');
 

    //console.log("updateusers",updateusers)
    // pushnotification , sms and email for the users
    // send push notification
    var message = {
        data: {
            type: 'order status update',
            orderid: eachOrder.id,
            message: `Cashback received`,
            "click_action": "FLUTTER_NOTIFICATION_CLICK"
        },
        notification: {
            title: "Cashback Received",
            body: eachOrderEarning.description
        },
        //"click_action": "FLUTTER_NOTIFICATION_CLICK",
        token: users.token
    };


    if (users.token != undefined && users.token != null) {
        //console.log("HElooooooooooooooooooooooooooo");
        fcm.sendNotification(message)
    }
     // send sms and email
     var template1 = "SS_Cashbacks";
     var subject1 = `Order # ${eachOrder.id} - Cashback Issued`;
     var email_msg = `Hi ${eachOrder.name}, You have received the cashback. Check your account for the details. Thanks for shopping with us!`;
     smsModule.sendSMS(eachOrder.iduser, template1, eachOrder);

     var email = {
         //to:["sowmya@iipl.work"],
         to: eachOrder.email,
         from: 'shopsasta - Community Group Buying <noreply@mail.shopsasta.com>',
         subject: subject1,
         body: email_msg,
         attachments: []
     };
     emailModule.send_mail(email.to, email.from, email.subject, email.body, email.attachments, function (err, result1) {
         console.log("Email Res", err, result1);
     })
    // return cashback_amount;
}


module.exports = myEmitter;

