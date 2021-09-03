var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
const assert = require('assert');
var jwt = require('jsonwebtoken');


// mongo db long url
const MONGO_URL = process.env.MONGO_URL || 'mongodb://sowmya:iNNrxOhVfEdvsUaI@cluster0-shard-00-00-cnw2n.mongodb.net:27017,cluster0-shard-00-01-cnw2n.mongodb.net:27017,cluster0-shard-00-02-cnw2n.mongodb.net:27017/happi?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin&retryWrites=true&w=majority';

// Database Name
const DB_NAME = process.env.DB_NAME || F.config['db-name'];

var MONGO_DB_CONNECTION = process.env.MONGO_DB_CONNECTION || F.config['mongo'];;
var Agent = require('sqlagent/mongodb').connect(MONGO_DB_CONNECTION);

// jwt secret key 
var JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'happi_jwt_secret';

exports.install = function () {
    ROUTE('#admin/api/product-orders', productBasedOrders, ['post', 'cors']);
    ROUTE('#admin/api/product-store-orders', productBasedStoreOrders, ['post', 'cors']);
}

// product based orders for the last seven days
function productBasedOrders() {
    var self = this;
    var body = self.body;
    var token = self.headers['x-auth'];
    if (token != null) {
        try {
            decoded = jwt.verify(token, JWT_SECRET_KEY);
            //console.log("decoded", decoded);
            if (decoded != null) {
                const client = new MongoClient(MONGO_URL, { useNewUrlParser: true });
                client.connect(function (err, C) {
                    assert.equal(null, err);
                    const db = C.db(DB_NAME);

                    // last seven days
                    // var d = new Date();
                    // var from = d.setDate(d.getDate() - 7);
                    // var fromDt = new Date(from);
                    // fromDt.setUTCHours(0, 0, 0, 0);
                    // var toDt = new Date();
                    // toDt.setUTCHours(23, 59, 59, 999);
                    //console.log("dateTo", fromDt, "dateFrom", toDt);

                    var fromDt = new Date(body.fromDt);
                    fromDt.setUTCHours(0, 0, 0, 0);

                    var toDt = new Date(body.toDt);
                    toDt.setUTCHours(23, 59, 59, 999);
                    console.log("fromDt", fromDt);
                    console.log("toDt", toDt);

                    //return;
                    getProductOrders(db, fromDt, toDt, function (orders) {
                        C.close();
                        self.json({
                            status: true,
                            data: orders
                        });
                    });
                });
            }
        } catch (err) {
            // err
            console.log("err", err);
            self.throw401("Invalid Token");
        }
    } else {
        self.throw401("Please provide token");
    }
}

function getProductOrders(db, fromDt, toDt, cb) {
    const collection = db.collection('product_orders');
    collection.aggregate([
        {
            $match: {
                "datecreated": { "$gte": fromDt, "$lt": toDt },
            }
        },
        {
            $group: {
                "_id": {
                    "name": "$name"
                },
                "price": { "$sum": "$price" },
                "Count": { "$sum": "$count" }
            }
        }, {
            $project: {
                "ProductName": "$_id.name",
                "Value": "$price",
                "Quantity": "$Count",
                "_id": 0
            }
        }
    ]).toArray(function (err, result) {
        result.sort(compare)
        cb(result);
    });
}

// product based store orders for the last seven days
function productBasedStoreOrders() {
    var self = this;
    var body = self.body;
    var token = self.headers['x-auth'];
    if (token != null) {
        try {
            decoded = jwt.verify(token, JWT_SECRET_KEY);
            //console.log("decoded", decoded);
            if (decoded != null) {
                const client = new MongoClient(MONGO_URL, { useNewUrlParser: true });
                client.connect(function (err, C) {
                    assert.equal(null, err);
                    const db = C.db(DB_NAME);

                    // last seven days
                    // var d = new Date();
                    // var from = d.setDate(d.getDate() - 7);
                    // var fromDt = new Date(from);
                    // fromDt.setUTCHours(0, 0, 0, 0);

                    // var toDt = new Date();
                    // toDt.setUTCHours(23, 59, 59, 999);
                    //console.log("dateTo", fromDt, "dateFrom", toDt);

                    var fromDt = new Date(body.fromDt);
                    fromDt.setUTCHours(0, 0, 0, 0);

                    var toDt = new Date(body.toDt);
                    toDt.setUTCHours(23, 59, 59, 999);
                    console.log("fromDt", fromDt);
                    console.log("toDt", toDt);

                    var referalId = self.body.referalId;
                    //return;
                    getProductStoreOrders(db, fromDt, toDt, referalId, function (orders) {
                        C.close();
                        self.json({
                            status: true,
                            data: orders
                        });
                    });
                });
            }
        } catch (err) {
            // err
            console.log("err", err);
            self.throw401("Invalid Token");
        }
    } else {
        self.throw401("Please provide token");
    }
}

function getProductStoreOrders(db, fromDt, toDt, referalId, cb) {
    const collection = db.collection('product_orders');
    collection.aggregate([
        {
            $match: {
                "datecreated": { "$gte": fromDt, "$lt": toDt },
                "referalId": referalId
            }
        },
        {
            $group: {
                "_id": {
                    "name": "$name"
                },
                "price": { "$sum": "$price" },
                "Count": { "$sum": "$count" }
            }
        }, {
            $project: {
                "ProductName": "$_id.name",
                "Value": "$price",
                "Quantity": "$Count",
                "_id": 0
            }
        }
    ]).toArray(function (err, result) {
        result.sort(compare)
        cb(result);
    });
}





function compare(a, b) {
    if (a.Quantity < b.Quantity) {
        return 1;
    }
    if (a.Quantity > b.Quantity) {
        return -1;
    }
    return 0;
}

