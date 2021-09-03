var MongoClient = require('mongodb').MongoClient;
var async = require('async');

var MONGO_DB_CONNECTION = process.env.MONGO_DB_CONNECTION || F.config['mongo'];
var Agent = require('sqlagent/mongodb').connect(MONGO_DB_CONNECTION);
const DB_NAME = process.env.DB_NAME || F.config['db-name'];


exports.install = function () {
    ROUTE('/admin/dashboard', dashboardReport, ['get', '#adminVerify', 'cors', 10000]);

}

// function to get the orders reports
async function dashboardReport() {
    var self = this;
    let decoded = self.token.userData;
    //console.log("decoded", decoded);
    if (decoded.role == 'admin') {
        //console.log("admin");
        await ordersAggregationAdmin(function (finalCount) {
            self.json({
                status: true,
                data: finalCount
            })
        });
    }
    if (decoded.role != 'vendor' && decoded.role != 'admin') {
        //console.log("manager");
        if (decoded.warehouse_ids != undefined && decoded.warehouse_ids.length > 0) {
            await ordersAggregation(decoded, function (finalCount) {
                self.json({
                    status: true,
                    data: finalCount
                })
            });

        } else {
            return self.json({ status: false, message: "No warehouse allocated to this user" })
        }
    }
    if (decoded.role == 'vendor') {
        //console.log("vendor");
        await ordersAggregationVendor(decoded, function (finalCount) {
            self.json({
                status: true,
                data: finalCount
            })
        });
    }
}


// function vendor related data
async function ordersAggregation(user, cb) {
    var nosql = new Agent();

    var temparray = [
        {
            "Status": "Total",
            "Count": 0
        },
        {
            "Status": "Delivered",
            "Count": 0
        },
        {
            "Status": "Cancelled",
            "Count": 0
        },

        {
            "Status": "Tobedelivered",
            "Count": 0
        }
    ];

    // assuming openFiles is an array of file names
    async.each(user.warehouse_ids, function (wid, callback) {


        const client = new MongoClient(MONGO_DB_CONNECTION, { useNewUrlParser: true });

        client.connect(function (err, C) {
            const db = C.db(DB_NAME);
            const collection = db.collection('orders');

            collection.aggregate([
                {
                    $match: {
                        wid: wid
                    }
                },
                {
                    $group: {
                        "_id": {
                            "status": "$status"
                        },
                        "Count": { "$sum": 1 }
                    }
                }, {
                    $project: {
                        "status": "$_id.status",
                        "Count": "$Count",
                        "_id": 0
                    }
                }
            ]).toArray(function (err, result) {
                C.close();
                if (err) {

                    callback();
                    return;
                }

                //console.log("RRRRRRRRRRRr", result);
                for (let j = 0; j < result.length; j++) {
                    const element = result[j];
                    temparray[0].Count += element.Count;
                    if (element.status == 'Delivered') {
                        temparray[1].Count += element.Count;
                    }
                    if (element.status == 'Cancelled' || element.status == 'Refunded') {
                        temparray[2].Count += element.Count;
                    }

                    if (element.status == 'Delivery Attempted' || element.status == 'Processing' || element.status == 'Order Placed' || element.status == 'Out for Delivery' || element.status == 'Ready for Delivery') {
                        temparray[3].Count += element.Count;
                    }
                }
                // console.log("FFFFFFFFFFFFFFFFFFFFFf", wid,temparray);

                callback();
            });
        });
    }, function (err) {
        // if any of the file processing produced an error, err would equal that error
        if (err) {
            // One of the iterations produced an error.
            // All processing will now stop.
            // console.log('A file failed to process');
        } else {
            // console.log('All files have been processed successfully');
            return cb(temparray);
        }
    });


}

// function vendor related data
async function ordersAggregationVendor(decoded, cb) {
    var temparray = [
        {
            "Status": "Total",
            "Count": 0
        },
        {
            "Status": "Delivered",
            "Count": 0
        },
        {
            "Status": "Cancelled",
            "Count": 0
        },
        {
            "Status": "Tobedelivered",
            "Count": 0
        }
    ];

    const client = new MongoClient(MONGO_DB_CONNECTION, { useNewUrlParser: true });

    client.connect(function (err, C) {
        const db = C.db(DB_NAME);
        const collection = db.collection('orders');
        collection.aggregate([
            {
                $match: {
                    delivery_type: decoded.name
                }
            },
            {
                $group: {
                    "_id": {
                        "status": "$status"
                    },
                    "Count": { "$sum": 1 }
                }
            }, {
                $project: {
                    "status": "$_id.status",
                    "Count": "$Count",
                    "_id": 0
                }
            }
        ]).toArray(function (err, result) {
            C.close();
            if (err) {

                cb(temparray);
                return;
            }

            //console.log("RRRRRRRRRRRr", result);
            for (let j = 0; j < result.length; j++) {
                const element = result[j];
                temparray[0].Count += element.Count;
                if (element.status == 'Delivered') {
                    temparray[1].Count += element.Count;
                }
                if (element.status == 'Cancelled' || element.status == 'Refunded') {
                    temparray[2].Count += element.Count;
                }

                if (element.status == 'Delivery Attempted' || element.status == 'Processing' || element.status == 'Order Placed' || element.status == 'Out for Delivery' || element.status == 'Ready for Delivery') {
                    temparray[3].Count += element.Count;
                }
            }
            // console.log("FFFFFFFFFFFFFFFFFFFFFf",temparray);

            cb(temparray);
        });
    });


}

// function vendor related data
async function ordersAggregationAdmin(cb) {
    var temparray = [
        {
            "Status": "Total",
            "Count": 0
        },
        {
            "Status": "Delivered",
            "Count": 0
        },
        {
            "Status": "Cancelled",
            "Count": 0
        },
        {
            "Status": "Tobedelivered",
            "Count": 0
        }
    ];

    const client = new MongoClient(MONGO_DB_CONNECTION, { useNewUrlParser: true });

    client.connect(function (err, C) {
        const db = C.db(DB_NAME);
        const collection = db.collection('orders');
        collection.aggregate([
            {
                $group: {
                    "_id": {
                        "status": "$status"
                    },
                    "Count": { "$sum": 1 }
                }
            }, {
                $project: {
                    "status": "$_id.status",
                    "Count": "$Count",
                    "_id": 0
                }
            }
        ]).toArray(function (err, result) {
            C.close();
            if (err) {

                cb(temparray);
                return;
            }

            //console.log("RRRRRRRRRRRr", result);
            for (let j = 0; j < result.length; j++) {
                const element = result[j];
                temparray[0].Count += element.Count;
                if (element.status == 'Delivered') {
                    temparray[1].Count += element.Count;
                }
                if (element.status == 'Cancelled' || element.status == 'Refunded') {
                    temparray[2].Count += element.Count;
                }

                if (element.status == 'Delivery Attempted' || element.status == 'Processing' || element.status == 'Order Placed' || element.status == 'Out for Delivery' || element.status == 'Ready for Delivery') {
                    temparray[3].Count += element.Count;
                }
            }
            // console.log("FFFFFFFFFFFFFFFFFFFFFf",temparray);

            cb(temparray);
        });
    });


}