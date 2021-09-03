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
var async = require('async');

// Database Name
const DB_NAME = process.env.DB_NAME || F.config['db-name'];


// event emitter to update all product stock...
myEmitter.on('cashback', async function cashbackCalculate(id) {
    console.log("CASHBACK CALC EMITTER FUNCTION STARTED----------------", id);
    var nosql = new Agent();
    var orderDetails = await getOrderDetails(id);
    var userDetails = orderDetails.userDetails;
    //console.log("order",userDetails.referal_code);
    // return;
    if (orderDetails == null) {
        return console.log("Not a Shop Sasta Order");
    }
    async.series({
        referral: async function () {
            var cashbackConfig = await getReferralCashback();
            var uuid = uuidv4();
            if (orderDetails.price >= cashbackConfig.min_order_amount) {
                if (userDetails.referal_code) {
                    nosql.select('getReferaluser', 'Users').make(function (builder) {
                        builder.where('referred_by', userDetails.referal_code);
                        builder.first();
                        console.log("referral builder", builder.builder);
                    })
                    var getReferaluser = await nosql.promise('getReferaluser');
                    //console.log("getReferaluser",getReferaluser);
                    // return;
                    if (getReferaluser != null) {
                        var percent = cashbackConfig.referral_cashback_percent;
                        var cashback_amount = Math.round(((percent / 100) * orderDetails.price));
                        // round down cashback amount

                        if (cashback_amount == 0) {
                            console.log("Cashback amount 0");
                            return { err: null, res: "Cashback amount 0" }
                        }
                        var eachOrderEarning = {};
                        eachOrderEarning.cashback_amount = cashback_amount;
                        eachOrderEarning.phone = getReferaluser.phone;
                        eachOrderEarning.pincode = orderDetails.deliveryzip
                        eachOrderEarning.cashback_percent = cashbackConfig.cashback_percent;
                        eachOrderEarning.cashback_type = 'referral';
                        eachOrderEarning.weekId = uuid;
                        eachOrderEarning.createdon = new Date();
                        eachOrderEarning.description = `You have earned referral cashback ₹${cashback_amount} for the order #${orderDetails.id}`


                        nosql.insert('earning', 'user_earnings').make(function (builder) {
                            builder.set(eachOrderEarning)
                        })

                        await nosql.promise('earning');
                        var walletAmount = 0;
                        if (!getReferaluser.wallet_amount) {
                            walletAmount = 0;
                        }

                        walletAmount += getReferaluser.wallet_amount + cashback_amount;
                        //console.log("users=============================",users.wallet_amount);
                        nosql.update('updateusers', 'Users').make(function (builder) {
                            builder.where('phone', getReferaluser.phone);
                            builder.set('wallet_amount', walletAmount)
                        })
                        var updateusers = await nosql.promise('updateusers');
                        return { err: null, res: "Success" }
                    } else {
                        // console.log("NO REFERAL USER");
                        return { err: null, res: "NO REFERAL USER" }
                    }
                } else {
                    return { err: null, res: "NO REFERAL USER" }
                }
            } else {
                console.log("MINIMUM ORDER AMOUNT FOR REFERRAL CASHBACK NOT MET");
                return { err: null, res: "MINIMUM ORDER AMOUNT FOR REFERRAL CASHBACK NOT MET" }
            }



        },
        specialEvent: async function () {
            //await callback(null, 2);
            var uuid = uuidv4();
            var specialEvents = await getSpecialEventCashback(orderDetails.datecreated);
            //console.log(orderDetails.datecreated ,"specialEvents",specialEvents);
            if (specialEvents != "No Special Events") {
                var cashback_amount = 0;
                ////////////////////////////////// ------------   ////////////////////////////////
                //return;
                if (specialEvents.type == 'P') {
                    console.log("If PERCENT");
                    if (orderDetails.price >= specialEvents.orderMiniAmount) {
                        var offeramount = (orderDetails.price * specialEvents.offerPercentage) / 100;
                        //console.log("offeramount", offeramount);
                        if (offeramount <= specialEvents.offerMaxAmount) {
                            cashback_amount = specialEvents.offeramount;
                        }
                        else {
                            cashback_amount = specialEvents.offerMaxAmount;
                        }
                        if (cashback_amount == 0) {
                            console.log("Cashback amount 0");
                            return { err: null, res: "Cashback amount 0" }
                        }
                        var eachOrderEarning = {};
                        eachOrderEarning.cashback_amount = cashback_amount;
                        eachOrderEarning.phone = orderDetails.iduser;
                        eachOrderEarning.pincode = orderDetails.deliveryzip
                        eachOrderEarning.cashback_percent = specialEvents.offerPercentage;
                        eachOrderEarning.cashback_type = 'special-event';
                        eachOrderEarning.weekId = uuid;
                        eachOrderEarning.createdon = new Date();
                        eachOrderEarning.description = `You have earned ₹${specialEvents.event_name} special event cashback ${cashback_amount} for the order #${orderDetails.id}`


                        nosql.insert('earning', 'user_earnings').make(function (builder) {
                            builder.set(eachOrderEarning)
                        })

                        await nosql.promise('earning');
                        var walletAmount = 0;
                        if (!userDetails.wallet_amount) {
                            walletAmount = 0;
                        }

                        walletAmount += userDetails.wallet_amount + cashback_amount;
                        //console.log("users=============================",users.wallet_amount);
                        nosql.update('updateusers', 'Users').make(function (builder) {
                            builder.where('phone', userDetails.phone);
                            builder.set('wallet_amount', walletAmount)
                        })
                        var updateusers = await nosql.promise('updateusers');
                        return { err: null, res: "Success" }
                    }
                    else {
                        return { err: null, res: "order minimum value" + orderMiniAmount }
                    }
                }
                else if (specialEvents.type == 'A') { // if the type is Amount
                    console.log("If AMOUNT");
                    if (orderDetails.price >= specialEvents.orderMiniAmount) {
                        cashback_amount = specialEvents.offerMaxAmount;
                        if (cashback_amount == 0) {
                            console.log("Cashback amount 0");
                            return { err: null, res: "Cashback amount 0" }
                        }
                        var eachOrderEarning = {};
                        eachOrderEarning.cashback_amount = cashback_amount;
                        eachOrderEarning.pincode = orderDetails.deliveryzip;
                        eachOrderEarning.phone = orderDetails.iduser;
                        //eachOrderEarning.cashback_percent = cashbackConfig.cashback_percent;
                        eachOrderEarning.cashback_type = 'special-event';
                        eachOrderEarning.weekId = uuid;
                        eachOrderEarning.createdon = new Date();
                        eachOrderEarning.description = `You have earned ₹${specialEvents.event_name} special event cashback ${cashback_amount} for the order #${orderDetails.id}`


                        nosql.insert('earning', 'user_earnings').make(function (builder) {
                            builder.set(eachOrderEarning)
                        })

                        await nosql.promise('earning');
                        var walletAmount = 0;
                        if (!userDetails.wallet_amount) {
                            walletAmount = 0;
                        }

                        walletAmount += userDetails.wallet_amount + cashback_amount;
                        //console.log("users=============================",users.wallet_amount);
                        nosql.update('updateusers', 'Users').make(function (builder) {
                            builder.where('phone', userDetails.phone);
                            builder.set('wallet_amount', walletAmount)
                        })
                        var updateusers = await nosql.promise('updateusers');
                        return { err: null, res: "Success" }
                    }
                    else {
                        return { err: null, res: "order minimum value" + orderMiniAmount }

                    }
                }
                ///////////////////////////////// ------------- /////////////////////////////////


            } else {
                return { err: null, res: "No Special Events" }
            }
        },
        noRush: async function () {
            //await callback(null, 2);
            // check if the order is norushe
            if (orderDetails.is_norush == false) {
                var uuid = uuidv4();
                var noRushConfig = await getNoRushCashback();
                var percent = noRushConfig.cashback_percent;
                var cashback_amount = Math.round(((percent / 100) * orderDetails.price));
                // round down cashback amount

                if (cashback_amount == 0) {
                    console.log("Cashback amount 0");
                    return { err: null, res: "Cashback amount 0" }
                }
                var eachOrderEarning = {};
                eachOrderEarning.cashback_amount = cashback_amount;
                eachOrderEarning.pincode = orderDetails.deliveryzip;
                eachOrderEarning.phone = orderDetails.iduser;
                eachOrderEarning.cashback_percent = percent;
                eachOrderEarning.cashback_type = 'norush';
                eachOrderEarning.weekId = uuid;
                eachOrderEarning.createdon = new Date();
                eachOrderEarning.description = `You have earned NoRush cashback ₹${cashback_amount} for the order #${orderDetails.id}`


                nosql.insert('earning', 'user_earnings').make(function (builder) {
                    builder.set(eachOrderEarning)
                })

                await nosql.promise('earning');
                var walletAmount = 0;
                if (!userDetails.wallet_amount) {
                    walletAmount = 0;
                }

                walletAmount += userDetails.wallet_amount + cashback_amount;
                //console.log("users=============================",users.wallet_amount);
                nosql.update('updateusers', 'Users').make(function (builder) {
                    builder.where('phone', userDetails.phone);
                    builder.set('wallet_amount', walletAmount)
                })
                var updateusers = await nosql.promise('updateusers');
                return { err: null, res: "Success" }

            } else {
                return { err: null, res: "Not a noRush order" }
            }

        }
    }, function (err, results) {
        // results is now equals to: {one: 1, two: 2}
        console.log("err", err, "results: ", results);
    });
});


async function getOrderDetails(orderId) {
    var nosql = new Agent();
    nosql.select('getOrders', 'orders').make(function (builder) {
        builder.where('id', orderId);
        builder.and();
        builder.where('delivery_type', 'shop-sasta');
        builder.first();
    })
    var getOrders = await nosql.promise('getOrders');
    //console.log("getOrder---------------------------------------",getOrders);
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

async function getReferralCashback() {
    var self = this;
    var nosql = new Agent();
    nosql.select('referral', 'configuration').make(function (builder) {
        builder.where('configurationName', 'Referral_Cashback');
        builder.first();
    });
    var referral = await nosql.promise('referral');
    var json = referral.configurationDetails;
    return json;
}

async function getSpecialEventCashback(orderDate) {
    var nosql = new Agent();
    nosql.select('special', 'special_events').make(function (builder) {
        var fromDt = orderDate.setUTCHours(0, 0, 0, 0);
        var toDt = orderDate.setUTCHours(23, 59, 59, 999);
        builder.query('startDate', {
            $lte: new Date(fromDt)
        });
        //builder.and()
        builder.query('endDate', {
            $gte: new Date(toDt)
        });
        builder.and()
        builder.where('eventType', 'Cashback');
        builder.first();
        console.log("builder", builder.builder);
    });
    var special = await nosql.promise('special');
    //console.log("special",special);
    if (special != null) {
        return special;
    } else {
        return "No Special Events";
    }

}

async function getNoRushCashback() {
    var self = this;
    var nosql = new Agent();
    nosql.select('norush', 'configuration').make(function (builder) {
        builder.where('configurationName', 'No_Rush_Delivery');
        builder.first();
    });
    var norush = await nosql.promise('norush');
    var json = norush.configurationDetails;
    return json;
}


//module.exports = myEmitter;
