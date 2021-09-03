var MONGO_DB_CONNECTION = process.env.MONGO_DB_CONNECTION || F.config['mongo'];;
var Agent = require('sqlagent/mongodb').connect(MONGO_DB_CONNECTION);
var fs = require('fs');
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
const assert = require('assert');
const { v4: uuidv4 } = require('uuid');

// Database Name
const DB_NAME = process.env.DB_NAME || F.config['db-name'];

async function cashbackCron() {
    var nosql = new Agent();
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
            // console.log("json", json);
            //console.log("lastWeekOrders", lastWeekOrders)
            //return;
            for (let i = 0; i < lastWeekOrders.length; i++) {
                let order = lastWeekOrders[i];
                 console.log("order.price", order.price);
                for (let j = 0; j < json.length; j++) {
                    let cashback = json[j];
                    console.log("cashback.order_amount", cashback.order_amount);
                    if (order.price >= cashback.price) {
                        console.log("helloooooooooooooooo");
                        order.cashback_percent = cashback.cashback_percent;
                        order.group_name = cashback.group_name
                        console.log("order",order);
                    }

                }
                // json.map((element) => {
                //     if(element.order_amount <= order.amount_paid) {
                //         order.cashback_percent = element.cashback_percent;
                //         order.goup_name = element.group_name
                //     }
                // })
            }
            console.log("----------slabs---------");
            console.table(json);
            console.log("------lastWeekOrders with cashback------");
            console.table(lastWeekOrders);
            nosql.insert('groupingOrders', 'group_orders').make(function (builder) {
                builder.set(lastWeekOrders);
            });
            var groupingOrders = await nosql.promise('groupingOrders');

            await myEarnings(lastWeekOrders, lastMonday, lastSunday);
        });
    })

    // console.log("latweek orders", lastWeekOrders);
    // return;

}





function getLastWeekOrders(db, fromDt, toDt, cb) {
    const collection = db.collection('orders');
    collection.aggregate(
        [
            {
                "$match": {
                    "datecreated": { $gte: fromDt, $lt: toDt },
                    //"delivery_type":"shop-sasta"
                }
            },
            {
                "$group": {
                    "_id": {
                        "zip": "$zip",
                    },
                    "id": { $first: '$id' },
                    "zip": { $first: '$zip' },
                    "price": { $first: '$price' },
                    "datecreated": { $first: '$datecreated' },
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
        console.log(result.length);
        cb(result)
    });
}

async function myEarnings(lastWeekOrders, fromDate, toDate) {
    var nosql = new Agent();
    var myEarnings = [];
    var uuid = uuidv4();
    for (let i = 0; i < lastWeekOrders.length; i++) {
        let cashback = lastWeekOrders[i];
        nosql.select('getOrders', 'orders').make(function (builder) {
            builder.query('datecreated', {
                $gte: fromDate,
                $lte: toDate
            });

            builder.where('pincode', cashback.pincode)
            builder.fields('id', 'phone', 'amount_paid', 'pincode', 'datecreated')
            //console.log("builder", builder.builder);
        })

        var getOrders = await nosql.promise('getOrders');
        for (let j = 0; j < getOrders.length; j++) {

            let eachOrder = getOrders[j];
            if(eachOrder.status == 'Delivered') {
                var cashback_amount = await generateCashback(eachOrder, cashback, uuid);
            } else {
                var cashback_amount = await parkgroupingCashbacktoOrder(eachOrder, cashback, uuid);
            }
           
        }
        //console.log("getOrders", getOrders);
    }

}

async function parkgroupingCashbacktoOrder(eachOrderEarning, cashback, uuid) {
    var nosql = new Agent();
    var percent = cashback.cashback_percent;
    var cashback_amount = Math.round(((percent / 100) * eachOrderEarning.amount_paid));
    // round down cashback amount
    
    if(cashback_amount == 0) {
        console.log("Cashback amount 0");
        return;
    } 
    
    eachOrderEarning.cashback_amount = cashback_amount;
    eachOrderEarning.cashback_percent = cashback.cashback_percent;
    eachOrderEarning.cashback_type = 'grouping';
    eachOrderEarning.weekId = uuid;
    eachOrderEarning.type = 'Credit';
    eachOrderEarning.createdon = new Date();
    eachOrderEarning.description = `You have earned group cashback ${eachOrderEarning.cashback_amount} for the order #${eachOrderEarning.number}`

    nosql.update('earning', 'orders').make(function (builder) {
        builder.set('grouping_cashback',eachOrderEarning);
    })

    await nosql.promise('earning');
   
     // pushnotification , sms and email for the users

    // return cashback_amount;
}

async function generateCashback(eachOrderEarning, cashback, uuid) {
    var nosql = new Agent();
    var percent = cashback.cashback_percent;
    var cashback_amount = Math.round(((percent / 100) * eachOrderEarning.amount_paid));
    // round down cashback amount
    
    if(cashback_amount == 0) {
        console.log("Cashback amount 0");
        return;
    } 
    eachOrderEarning.cashback_amount = cashback_amount;
    eachOrderEarning.cashback_percent = cashback.cashback_percent;
    eachOrderEarning.cashback_type = 'grouping';
    eachOrderEarning.weekId = uuid;
    eachOrderEarning.createdon = new Date();
    eachOrderEarning.type = 'Credit';
    eachOrderEarning.description = `You have earned group cashback ₹${eachOrderEarning.cashback_amount} for the order #${eachOrderEarning.number}`
    eachOrderEarning.phone = eachOrderEarning.iduser;
    nosql.insert('earning', 'user_earnings').make(function (builder) {
        builder.set(eachOrderEarning)
    })

    await nosql.promise('earning');
    nosql.select('users', 'Users').make(function (builder) {
        builder.where('phone', eachOrderEarning.phone);
    })
    var users = await nosql.promise('users');
    if (!users.wallet_amount) {
        users.wallet_amount = 0;
    }

    users.wallet_amount = users.wallet_amount + cashback_amount;

    nosql.update('updateusers', 'Users').make(function (builder) {
        builder.where('phone', eachOrderEarning.phone);
        builder.set(users)
    })
    var updateusers = await nosql.promise('updateusers');
     // pushnotification , sms and email for the users

    // return cashback_amount;
}




cashbackCron();