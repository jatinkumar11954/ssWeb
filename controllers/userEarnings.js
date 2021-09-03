var MONGO_DB_CONNECTION = process.env.MONGO_DB_CONNECTION || F.config['mongo'];;
var Agent = require('sqlagent/mongodb').connect(MONGO_DB_CONNECTION);
const assert = require('assert');
var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;

// mongo db long url
const MONGO_URL = F.config['mongo-url'];
// Database Name
const DB_NAME = process.env.DB_NAME || F.config['db-name'];


exports.install = function () {
    ROUTE('/api/user-earnings', getUserEarnings, ['cors', '#userVerify']);
    ROUTE('/api/user-earnings-summary', getUserSummary, ['cors', '#userVerify']);
    ROUTE('/api/user-group', getUserGroup, ['POST', '#userVerify', 'cors']);
}


async function getUserEarnings() {
    var self = this;
    var nosql = new Agent();
    var decoded = self.token;
    var opt = self.query;
    //console.log("decoded token",decoded);
    nosql.listing('getearnings', 'user_earnings').make(function (builder) {
        builder.where('phone', decoded.phone);
        builder.page(opt.page || 1, opt.limit || 10);
        builder.sort('createdon', 'asc');
    })

    var getearnings = await nosql.promise('getearnings');
    // console.log("getearnings",getearnings);

    self.json({
        status: true,
        message: "Success",
        data: getearnings
    })


}

async function getUserSummary() {
    var self = this;
    var nosql = new Agent();
    var decoded = self.token;
    var opt = self.query;
    var totalEarned = 0;
    var totalUsed = 0;
    var balance;
    var res = {};
    //console.log("decoded token",decoded);
    const client = new MongoClient(MONGO_DB_CONNECTION, { useNewUrlParser: true });
    client.connect(function (err, C) {
        assert.equal(null, err);

        const db = C.db(DB_NAME);
        console.log("phone", decoded.phone);
        earningsUsedSummary(db, decoded.phone, function (used) {
            //C.close();
            earningsEarnedSummary(db, decoded.phone, async function (earned) {
                C.close();
                // console.log("used",used);
                // console.log("earned",earned);
                res.TotalEarned = earned.TotalEarned;
                res.totalUsed = used.TotalUsed;

                // get user wallet amount 
                nosql.select('getWallet', 'Users').make(function (builder) {
                    builder.where('phone', decoded.phone);
                    builder.first()
                })
                var getWallet = await nosql.promise('getWallet');
                res.balance = getWallet.wallet_amount;
                self.json({
                    status: true,
                    data: res
                })
            });
        });
    });

}

async function getUserGroup() {
    var self = this;
    var nosql = new Agent();
    var decoded = self.token;
    //console.log("decoded token",decoded);
    var result = [];
    var pincodes = self.body.pincodes;
    nosql.select('getWeekCashback', 'group_orders').make(function (builder) {
        builder.sort('datecreated', 'desc');
        builder.first()
    })

    var getWeekCashback = await nosql.promise('getWeekCashback');
    if (getWeekCashback != null) {
        var orderDetails = JSON.parse(getWeekCashback.last_week_order_summary);
        for (let i = 0; i < pincodes.length; i++) {
            var pincode = pincodes[i];
            var groupData = orderDetails.find(e => e.pincode === pincode);
            if (groupData == null) {
                groupData = {
                    pincode: pincode,
                    price: 0,
                    cashback_percent: 0,
                    group_name: "N/A",
                    minVal: 0,
                    maxVal : 0
                }
            }
            result.push(groupData);

        }

        nosql.select('grouping', 'configuration').make(function (builder) {
            builder.where('configurationName', 'Grouping_Cashback')
            builder.first()
        })
        var grouping = await nosql.promise('grouping');

        let grpArray = [];
        for (let i = 0; i < grouping.configurationDetails.length; i++) {
           grpArray.push(parseInt(grouping.configurationDetails[i].cashback_percent));
        }

        const uniqeArr = Array.from(new Set(grpArray));
        for (let i = 0; i < result.length; i++) {
            result[i].minVal = Math.min(...uniqeArr);   
            result[i].maxVal = Math.max(...uniqeArr);
        }     

        self.json({
            status: true,
            message: "Success",
            data: result
        })

    } else {
        self.json({
            status: false,
            message: "No User Group found yet"
        })
    }

    // console.log("getearnings",getearnings);


}

function earningsUsedSummary(db, phone, cb) {
    const collection = db.collection('user_earnings');
    collection.aggregate(
        [
            {
                "$match": {
                    "phone": phone,
                    "cashback_type": {
                        "$eq": "wallet"
                    }
                }
            },
            {
                "$group": {
                    "_id": {},
                    "__alias_0": {
                        "$sum": "$cashback_amount",
                    },
                }
            },
            {
                "$project": {
                    "TotalUsed": "$__alias_0",
                }
            }
        ], {
        "allowDiskUse": true
    }
    ).toArray(function (err, result) {
        console.log("TotalUsed", result, err);
        if (result.length > 0) {
            cb(result[0]);
        } else {
            obj = {
                "_id": {},
                "TotalUsed": 0,
            }
            cb(obj);
        }
    });
}

function earningsEarnedSummary(db, phone, cb) {
    const collection = db.collection('user_earnings');
    collection.aggregate(
        [
            {
                "$match": {
                    "phone": phone,
                    "cashback_type": {
                        "$ne": "wallet"
                    }
                }
            },
            {
                "$group": {
                    "_id": {},
                    "__alias_0": {
                        "$sum": "$cashback_amount",
                    },
                }
            },
            {
                "$project": {
                    "TotalEarned": "$__alias_0",
                }
            }
        ], {
        "allowDiskUse": true
    }
    ).toArray(function (err, result) {
        console.log("TotalEarned", result);
        if (result.length > 0) {
            cb(result[0]);
        } else {
            obj = {
                "_id": {},
                "TotalEarned": 0,
            }
            cb(obj);
        }
    });
}


// async function getUserGroup() {
//     var self = this;
//     var nosql = new Agent();
//     var decoded = self.token;
//     //console.log("decoded token",decoded);
//     var pincodes = self.body.pincodes;
//     nosql.select('getWeekId', 'user_earnings').make(function (builder) {
//         builder.where('phone', decoded.phone);
//         builder.where('cashback_type',"grouping")
//         builder.sort('createdon', 'desc');
//         builder.fields('weekId');
//         builder.first()
//     })

//     var getWeekId = await nosql.promise('getWeekId');
//     if(getWeekId != null) {
//         nosql.select('getearnings', 'user_earnings').make(function (builder) {
//             builder.where('phone', decoded.phone);
//             builder.and();
//             builder.where('weekId', getWeekId.weekId);
//             builder.in('pincode',pincodes);
//         })

//         var getearnings = await nosql.promise('getearnings');
//         if (getearnings.length > 0) {
//             self.json({
//                 status: true,
//                 message: "Success",
//                 data: getearnings
//             })
//         } else {
//             self.json({
//                 status: false,
//                 message: "No User Group found yet"
//             })
//         }
//     } else {
//         self.json({
//             status: false,
//             message: "No User Group found yet"
//         })
//     }

//    // console.log("getearnings",getearnings);


// }