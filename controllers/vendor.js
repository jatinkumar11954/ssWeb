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
// send email import module
var emailModule = MODULE('email');
var jsonexport = require('jsonexport');
var path = require('path');

exports.install = function () {

    // admin
    ROUTE('/admin/api/products-allocate', allocateProductsToVendor, ['POST', '#adminVerify', 'cors']);
    ROUTE('/admin/api/get-vendors', getVendors, ['#adminVerify', 'cors']);
    ROUTE('/admin/api/settle-vendor-orders', settleVendorOrders, ['POST', '#adminVerify','cors']);
    ROUTE('/ss', abc, ['cors']);
    

}

// function to allocate the prodcuts to vendors
async function allocateProductsToVendor() {
    var self = this;
    var nosql = new Agent();
    var decoded = self.token.userData;
    console.log("decoded", decoded);
    var productIds = self.body.productIds;
    var vendor = self.body.vendor;
    for (let i = 0; i < productIds.length; i++) {
        var product = productIds[i];
        nosql.update('updateP', 'product').make(function (builder) {
            builder.where('id', product);
            builder.set('allocated_to', vendor);
            builder.set('allocated_by', decoded.name);
            builder.set('delivery_type', vendor);
        });
        var updateP = await nosql.promise('updateP');
    }

    self.json({
        status: true,
        message: "Success"
    })

}

// function to get the vendors
async function getVendors() {
    var self = this;
    var nosql = new Agent();
    var decoded = self.token.userData;
    nosql.select('getVendors', 'admin_users').make(function (builder) {
        builder.where('createdBy', decoded.name);
        builder.where('role', 'vendor');
        builder.fields('name', 'id', 'role', 'createdBy');
    });
    var getVendors = await nosql.promise('getVendors');
    if (getVendors.length > 0) {
        self.json({
            status: true,
            message: "Success",
            data: getVendors
        })
    } else {
        self.json({
            status: false,
            message: "No Vendors found!"
        })
    }
}

// function to settle the  vendor orders
async function settleVendorOrders() {
    var self = this;
    var nosql = new Agent();
    var decoded = self.token.userData;
    var mailBody = '';
    //console.log("decoded", decoded);
    var orders = self.body.orders;
    var adminUser = await getShippingType(self.body.vendor);
    var delivery_by = "";
    if (adminUser != "Fail") {
        if (adminUser.role == "vendor") {
            if (adminUser.shipping_by == "shop-sasta") {
                delivery_by = "shop-sasta"
            } else {
                delivery_by = "vendor"
            }
        } else {
            delivery_by = "shop-sasta"
        }
    }
    var obj = {
        vendor: self.body.vendor,
        ordersCount: 0,
        totalAmount: 0,
        settledAmount: 0,
        dueAmount: 0,
        deliveryBy:delivery_by
    }
    for (let i = 0; i < orders.length; i++) {
        var order = orders[i];
        nosql.update('orderUpdate', 'orders').make(function (builder) {
            builder.where('id', order.orderId);
            builder.set('is_settled', true);
            builder.set('settled_by', decoded.name);
        });
        var orderUpdate = await nosql.promise('orderUpdate');
        obj.ordersCount = orders.length;
        obj.totalAmount += order.settleAmount;
        obj.settledAmount += order.settleAmount;
        obj.dueAmount = obj.totalAmount - obj.settledAmount;

    }
    // jsonexport(orders, function (err, csv) {
    //     if (err) return console.log(err);
    //     //console.log(csv);
    //     var timestamp = new Date().getTime();
    //     fs.writeFile('./public/csv/t-' + timestamp + '.csv', csv, 'utf8', function (err) {
    //         if (err) {
    //             console.log('Some error occured - file either not saved or corrupted file saved.');
    //         }
    //         else {
    //             console.log('It\'s saved!');
    //             var attachments = [{
    //                 filename: 'vendorReport.csv',
    //                 path: path.join(__dirname + '/../public/csv/t-' + timestamp + '.csv'), // stream this file
    //                 encoding: 'base64'
    //             }]
    //             mailBody += "\n\n========================================================\n"

    //             mailBody += `Name : ${obj.vendor}\n`;
    //             mailBody += `Orders Count : ${obj.ordersCount}\n`;
    //             mailBody += `Total Amount : ${obj.totalAmount}\n`;
    //             mailBody += `Settled Amount : ${obj.settledAmount}\n`;
    //             mailBody += `Due Amount : ${obj.dueAmount}\n`;

    //             mailBody += "========================================================\n"
    //             var email = {
    //                 to: ["shopsasta20@gmail.com", "sowmya@iipl.work"],
    //                 from: 'shopsasta - Community Group Buying <noreply@mail.shopsasta.com>',
    //                 subject: `Vendor Orders Report`,
    //                 body: mailBody,
    //                 attachments: attachments
    //             };
    //             // emailModule.send_mail(email.to, email.from, email.subject, email.body, email.attachments, function (err, result1) {
    //             //     console.log("Email Res", err, result1);
    //             // })
    //         }
    //     });
    // });
    var model = {};
    model.orders = orders;
    model.summary = obj;
    console.log("MAIL BEFORE--------------------------------------");
    MAIL("sowmya@iipl.work", "Vendor Settlement Report", '=?/mails/vendormail', model, "");
    console.log("MAIL AFTER------------------------------------------");
    // model.orders = orders;
    // model.summary = obj;
    // self.layout('~mails/nolayout');
    // self.view('~mails/vendormail', model);
    self.json({
        status: true,
        message: "Success",
        data: orders,
        summary: obj
    })

}

async function getShippingType(vendor) {
    var nosql = new Agent();
    nosql.select('getUser', 'admin_users').make(function (builder) {
        builder.where('name', vendor);
        builder.first();
    });

    var getUser = await nosql.promise('getUser');
    if (getUser != null) {
        return getUser;
    }
    return "Fail";
}

async function abc() {
    var self = this;
    var model = {};
 
    model.orders = [
        {
            "orderId": "634335002wu60b",
            "sourcingPrice": 160,
            "paidPrice": 110,
            "deliveryFee": 10,
            "type": "cod",
            "settled": false,
            "settleAmount": 60,
            "narration": "To vendor"
        },
        {
            "orderId": "634348002fa60b",
            "sourcingPrice": 0,
            "paidPrice": 110,
            "deliveryFee": 10,
            "type": "cod",
            "settled": false,
            "settleAmount": -100,
            "narration": "To Shop Sasta"
        }
    ]
    model.summary = {
        "vendor": "Amazon",
        "ordersCount": 2,
        "totalAmount": -40,
        "settledAmount": -40,
        "dueAmount": 0
    }
    
    // model.orders = orders;
    // model.summary = obj;
    self.layout('~mails/nolayout');
    self.view('~mails/vendormail', model);
}


