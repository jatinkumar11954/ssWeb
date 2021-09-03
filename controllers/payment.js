var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
const assert = require('assert');

var MONGO_DB_CONNECTION = process.env.MONGO_DB_CONNECTION || F.config['mongo'];;
var Agent = require('sqlagent/mongodb').connect(MONGO_DB_CONNECTION);

// imported product stocks module
var stockModule = MODULE('productsStock');

var request = require('request');
var jsonexport = require('jsonexport');
var fs = require('fs');

// create uuid module import
var generateUuidModule = MODULE('generate-uuid');

// send sms import modile
var smsModule = MODULE('sms');

// trasaction Module
var transaction = MODULE('transactionUpdate');

// paytm env variables
// const MID = F.config-prod['PAYTM_MID'] || process.env.PAYTM_MID || "Happim26189443024001";
// const WEBSITE = F.config-prod['PAYTM_WEBSITE'] || process.env.PAYTM_WEBSITE || "WEBPROD";
// const INDUSTRY_TYPE_ID = F.config-prod['PAYTM_INDUSTRY_TYPE_ID'] || process.env.PAYTM_INDUSTRY_TYPE_ID || "Retail100";
// const CHANNEL_ID = F.config-prod['PAYTM_CHANNEL_ID'] || process.env.PAYTM_CHANNEL_ID || "WEB";
// const CALLBACK_URL = F.config-prod['PAYTM_CALLBACK_URL'] || process.env.PAYTM_CALLBACK_URL || "https://www.happimobiles.com/order/paytm-return";
// const CALLBACK_LINK_URL = F.config-prod['PAYTM_CALLBACK_LINK_URL'] || process.env.PAYTM_CALLBACK_LINK_URL || "https://www.happimobiles.com/order/paytm-return-link";
// const CHECK_SUM_KEY = F.config-prod['PAYTM_CHECK_SUM_KEY'] || process.env.PAYTM_CHECK_SUM_KEY || "pBgjbchezWmjrORm";
// const ORDER_SUBMIT_URL =  F.config-prod['PAYTM_ORDER_SUBMIT_URL'] || process.env.PAYTM_ORDER_SUBMIT_URL || "https://securegw.paytm.in/order/process";
// const PAYTM_CALLBACK_COD_URL = F.config-prod['PAYTM_CALLBACK_COD_URL'] || process.env.PAYTM_CALLBACK_COD_URL || "https://www.happimobiles.com/order/paytm-return-cod";

const MID = F.config['PAYTM_MID'];
const WEBSITE = F.config['PAYTM_WEBSITE'];
const INDUSTRY_TYPE_ID = F.config['PAYTM_INDUSTRY_TYPE_ID'];
const CHANNEL_ID = F.config['PAYTM_CHANNEL_ID'];
const CALLBACK_URL = F.config['PAYTM_CALLBACK_URL'];
const CALLBACK_LINK_URL = F.config['PAYTM_CALLBACK_LINK_URL'];
const CHECK_SUM_KEY = F.config['PAYTM_CHECK_SUM_KEY'];
const ORDER_SUBMIT_URL = F.config['PAYTM_ORDER_SUBMIT_URL'];
const PAYTM_CALLBACK_COD_URL = F.config['PAYTM_CALLBACK_COD_URL'];


// pinelabs env variables
const PINELABS_URL = process.env.PINELABS_URL || "https://pinepg.in/PinePGRedirect/index";
const PINELABS_MERCHANT_ID = process.env.PINELABS_MERCHANT_ID || "1550";
const PINELABS_MERCHANT_ACCESS_CODE = process.env.PINELABS_MERCHANT_ACCESS_CODE || "bdd01d1d-52ea-460b-a6a7-625a7384dbc1";
const PINELABS_PAYMODE_ONLANDING_PAGEL = process.env.PINELABS_PAYMODE_ONLANDING_PAGEL || "0,1,3,4,5,10,11,12";
const PINELABS_MERCHANT_RETURN_URL = process.env.PINELABS_MERCHANT_RETURN_URL || "https://happimobiles.com/order/pinelabs-return";
const PINELABS_NAVIGATION_MODE = process.env.PINELABS_NAVIGATION_MODE || "2";
const PINELABS_TRANSACTION_TYPE = process.env.PINELABS_TRANSACTION_TYPE || "1";
const PINELABS_LPC_SEQ = process.env.PINELABS_LPC_SEQ || "1"; // strSecretKey
const PINELABS_STR_SECRET_KEY = process.env.PINELABS_STR_SECRET_KEY || "42F2F10AE4AE40CC858096722371EF49";
const PINELABS_STR_HASH_TYPE = process.env.PINELABS_STR_HASH_TYPE || "SHA256";
const PINELABS_UNIQUE_MERCHANT_TXNID = process.env.PINELABS_UNIQUE_MERCHANT_TXNID || 'ppc_UniqueMerchantTxnID';


exports.install = function () {
   // ROUTE('/order/paytm/', paytm_process, ['post']);
  //  ROUTE('/order/paytm-return', paytm_cb, ['post', 10000]);

    ROUTE('/order/pinelabs/', pinelabs_process, ['post']);
    ROUTE('/order/pinelabs-return', pinelabs_cb, ['post', 10000]);
    ROUTE('/order/cod-payment', orders_cod, ['post', 10000]);
    ROUTE('/order/paytm-return-cod', cod_process_cb, ['post', 10000]);
    ROUTE('/order/verification/{id}', paymentVerify, ['get', 10000]);
};

ON('controller', function (controller, name) {
    // console.log("name", name);
    // console.log("controller.headers", controller.headers);
    // console.log("controller.body", controller.body);
    // console.log("controller.url", controller.url);
})

function orders_cod() {
    var self = this;
    var JOB_ID = generateUuidModule.createUUID();

    var formData = self.body;

    const checksum_lib = require('../modules/paytm-checksum');
    const https = require('https');


    if (self.body.order_id !== null) {
        var mnosql = new Agent();

        mnosql.select('orders', 'orders').make(function (builder) {
            builder.where('id', self.body.order_id);
            builder.first();
        });

        mnosql.select('getCod', 'configuration').make(function (builder) {
            builder.where('configurationName', 'COD');
            builder.first();
        });

        mnosql.exec(function (err, response) {
            if (err) {
                self.redirect('/checkout/' + self.body.order_id);
                return;
            }

            var order = response.orders;
            var cod = response.getCod.configurationDetails;
            if (order == null) {
                return self.redirect('/checkout/' + formData.order_id + '/#PAYMENT_FAILED');
            }

            if (order.ispaid) {
                return self.redirect('/checkout/' + formData.order_id + '/?paid=1');
            }

            if (order.iscod) {
                return self.redirect('/checkout/' + formData.order_id + '/?paid=1');
            }


            var txnAmount = cod.cod_amount
            var paytmParams = {

                /* Find your MID in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys */
                "MID": MID,

                /* Find your WEBSITE in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys */
                "WEBSITE": WEBSITE,

                /* Find your INDUSTRY_TYPE_ID in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys */
                "INDUSTRY_TYPE_ID": INDUSTRY_TYPE_ID,

                /* WEB for website and WAP for Mobile-websites or App */
                "CHANNEL_ID": CHANNEL_ID,

                /* Enter your unique order id */
                "ORDER_ID": formData.order_id,

                /* unique id that belongs to your customer */
                "CUST_ID": order.phone + "",

                /* customer's mobile number */
                "MOBILE_NO": order.phone + "",

                /* customer's email */
                "EMAIL": order.email,

                /**
                 * Amount in INR that is payble by customer
                 * this should be numeric with optionally having two decimal points
                 */
                "TXN_AMOUNT": txnAmount,

                /* on completion of transaction, we will send you the response on this URL */
                //"CALLBACK_URL" : "http://localhost:8000/order/paytm-return", //local
                //"CALLBACK_URL" : "http://13.232.26.24:8888/order/paytm-return", //dev

                "CALLBACK_URL": PAYTM_CALLBACK_COD_URL, //prod

            };

            // console.log("PAYTM_PARAMS", JOB_ID, new Date().toISOString(),  paytmParams);

            checksum_lib.genchecksum(paytmParams, CHECK_SUM_KEY, function (err, checksum) {

                /* for Staging */
                // var url = "https://securegw-stage.paytm.in/order/process";

                /* for Production */
                if (err) {
                    return self.redirect('/checkout/' + formData.order_id + '/#PAYMENT_FAILED');
                }
                console.log("CHECK_SUM", JOB_ID, new Date().toISOString(), checksum);
                paytmParams.checksum = checksum;
                paytmParams.submit_url = ORDER_SUBMIT_URL;
                console.log("PAYTM_PARAMS", JOB_ID, new Date().toISOString(), paytmParams);
                self.view('paytm-test', paytmParams);
            });
        });
    } else {

    }

}

function cod_process_cb() {

    var self = this;

    console.log("paytmcallback", self.body);
    const checksum_lib = require('../modules/paytm-checksum');


    var paytmChecksum = "";


    var paytmParams = {};
    for (var key in self.body) {
        if (key == "CHECKSUMHASH") {
            paytmChecksum = self.body[key];
        } else {
            paytmParams[key] = self.body[key];
        }
    }

    var isValidChecksum = checksum_lib.verifychecksum(paytmParams, CHECK_SUM_KEY, paytmChecksum);

    if (isValidChecksum) {
        console.log("Checksum Matched");
        if (paytmParams["STATUS"] == "TXN_SUCCESS") {

            var order_id = paytmParams["ORDERID"];

            var mnosql = new Agent();

            mnosql.update('order_update', 'orders').make(function (builder) {
                builder.set({
                    iscod: true,
                    datepaid: F.datetime,
                    taxid: "PAYTM-" + paytmParams["TXNID"],
                    tag: "cod-paid",
                    datecod: F.datetime,
                    internal_type: "Order Placed",
                    amount_paid: parseInt(paytmParams["TXNAMOUNT"])
                });
                builder.where('id', order_id);
            });

            mnosql.select('orders', 'orders').make(function (builder) {
                builder.where('id', order_id);
                builder.first();
            });

            mnosql.exec(function (err, response) {
                if (err) {
                    return self.redirect('/checkout/' + paytmParams["ORDERID"] + '/#PAYMENT_FAILED');
                }

                if (response.orders != null) {
                    var model = response.orders;
                    stockModule.OrderConfirm(order_id);

                    var order = response.orders;
                    var message = `Thankyou for placing order in happimobiles.com. Your paytm transaction refernce # ${paytmParams["TXNID"]}.Your order is underprocess for information https://happimobiles.com/checkout/${order_id}`;
                    var subject = '@(Order #) ' + order.id;

                    self.layout('layout-new');
                    self.view('order-payment-confirmation', order);

                    if (order.istwohrs) {
                        subject = subject + " - 2HRS";
                    }

                    if (order.ispickup) {
                        subject = subject + " - PICK_UP";
                    }

                    subject = subject + " - PAID ";
                    subject = subject + order_id;

                    MAIL("happionlineorders@gmail.com", subject, '=?/mails/order-admin', model, model.language);
                    MAIL(model.email, '@(Order #) ' + model.id, '=?/mails/order', model, model.language);

                    smsModule.sendSMS(order.phone, message);
                } else {
                    return self.redirect('/checkout/' + paytmParams["ORDERID"] + '/#PAYMENT_FAILED');
                }


            })


        }
        else {
            self.redirect('/checkout/' + paytmParams["ORDERID"] + '/#PAYMENT_FAILED');
        }
    }
    else {
        self.redirect('/checkout/' + paytmParams["ORDERID"] + '/#PAYMENT_FAILED');
    }
}

async function paytm_process(req, res) {

    var self = this;
    var formData = self.body;
    var JOB_ID = generateUuidModule.createUUID();
    var redirect = F.global.config.url + self.url;
    const checksum_lib = require('../modules/paytm-checksum');
    const https = require('https');
    /**
     * import checksum generation utility
     * You can get this utility from https://developer.paytm.com/docs/checksum/
     */
    var mnosql = new Agent();
    // NOSQL('orders').one().where('id', $.options.id || $.id).callback($.callback, 'error-orders-404');
    // console.log("id", $.options.id, $.id)
    mnosql.select('orders', 'orders').make(function (builder) {
        builder.where('id', formData.order_id)
        builder.first()
    })

    mnosql.exec(async function (err, response) {

        if (err) {
            console.log("ERROR", err);
            return self.redirect('/checkout/' + formData.order_id + '/#PAYMENT_FAILED');
        }

        var order = response.orders;

        if (order == null) {
            console.log("ORDER NULL IN PAYTM_PROCESS", order);
            return self.redirect('/checkout/' + formData.order_id + '/#PAYMENT_FAILED');
        }

        if (order.ispaid) {
            return self.redirect('/checkout/' + formData.order_id + '/?paid=1');
        }
        
       

        // save transaction details
        var transactionObj = {
            "transactionid": order.id + "-" + UID(),
            "orderid": order.id,
            "amount": order.price,
            "transaction_type": "paytm",
            "isSuccess": false,
            "datecreated": new Date()
        }
        await transaction.saveOrderTransaction(transactionObj);

        // get transaction details
        getTrasactionId(order.id, function (trasactionDetails) {
            var trasactionDetails = trasactionDetails;
            console.log("trasactionId", trasactionDetails.transactionid);
            var paytmParams = {

                /* Find your MID in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys */
                "MID": MID,

                /* Find your WEBSITE in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys */
                "WEBSITE": WEBSITE,

                /* Find your INDUSTRY_TYPE_ID in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys */
                "INDUSTRY_TYPE_ID": INDUSTRY_TYPE_ID,

                /* WEB for website and WAP for Mobile-websites or App */
                "CHANNEL_ID": CHANNEL_ID,

                /* Enter your unique order id */
                "ORDER_ID": trasactionDetails.transactionid,

                /* unique id that belongs to your customer */
                "CUST_ID": order.phone + "",

                /* customer's mobile number */
                "MOBILE_NO": order.phone + "",

                /* customer's email */
                "EMAIL": order.email,

                /**
                 * Amount in INR that is payble by customer
                 * this should be numeric with optionally having two decimal points
                 */
                "TXN_AMOUNT": order.price + "",

                /* on completion of transaction, we will send you the response on this URL */
                // "CALLBACK_URL" : "http://localhost:8000/order/paytm-return", //local
                //"CALLBACK_URL" : "http://13.232.26.24:8888/order/paytm-return", //dev

                "CALLBACK_URL": CALLBACK_URL, //prod

            };
            if (self.body.type == "link") {

                paytmParams["CALLBACK_URL"] = CALLBACK_LINK_URL;
            }

            if (self.body.type == "downPayment") {
                paytmParams["TXN_AMOUNT"] = self.body.amount;
                paytmParams["CALLBACK_URL"] = CALLBACK_URL+"?downpayment=1";
            }
    
            console.log("PAYTM_PARAMS", JOB_ID, new Date().toISOString(), paytmParams);
    
            checksum_lib.genchecksum(paytmParams, CHECK_SUM_KEY, function (err, checksum) {
    
                /* for Staging */
                // var url = "https://securegw-stage.paytm.in/order/process";
    
                /* for Production */
                if (err) {
                    console.log("ERROR ---------------------", err);
                    return self.redirect('/checkout/' + formData.order_id + '/#PAYMENT_FAILED');
                }
                console.log("CHECK_SUM", JOB_ID, new Date().toISOString(), checksum);
    
                paytmParams.checksum = checksum;
                paytmParams.submit_url = ORDER_SUBMIT_URL;
    
                console.log("PAYTM_PARAMS", JOB_ID, new Date().toISOString(), paytmParams);
    
                self.view('paytm-test', paytmParams);
            });
    
        })



        
    });
};


async function paytm_cb() {

    var self = this;

    console.log("paytmcallback", self.body);
    const checksum_lib = require('../modules/paytm-checksum');


    var paytmChecksum = "";


    var paytmParams = {};
    for (var key in self.body) {
        if (key == "CHECKSUMHASH") {
            paytmChecksum = self.body[key];
        }
        else {
            paytmParams[key] = self.body[key];
        }
    }
    var txn_id = paytmParams["ORDERID"];
    
    var orderDetails = txn_id.split("-");
    // var trasactionOrderDetails = await getTrasactionOrderId(txn_id);
    console.log("orderId", orderDetails);
    var order_id = orderDetails[0];

    var isValidChecksum = checksum_lib.verifychecksum(paytmParams, CHECK_SUM_KEY, paytmChecksum);
    if (isValidChecksum) {
        console.log("Checksum Matched");
        if (paytmParams["STATUS"] == "TXN_SUCCESS") {
            var downpayment = false;
            if(self.query.downpayment == "1") {
                downpayment = true;
            } 
            var mnosql = new Agent();
            //NOSQL('orders').one().where('id', $.options.id || $.id).callback($.callback, 'error-orders-404');
            //console.log("id", $.options.id, $.id)
            var obj;
            if(downpayment) {
                var paytm_downpayment = paytmParams["TXNAMOUNT"];
                obj = {
                    ispaid: true,
                    datepaid: F.datetime,
                    datecod: F.datetime,
                    taxid: "PAYTM-" + paytmParams["TXNID"],
                    tag: "paid",
                    internal_type: "Order Placed",
                    paytm_downpayment: paytm_downpayment,
                    action_type: "bajaj_success_paytm_downpayment_done"
                }
            } else {
                obj = {
                    ispaid: true,
                    datepaid: F.datetime,
                    datecod: F.datetime,
                    taxid: "PAYTM-" + paytmParams["TXNID"],
                    tag: "paid",
                    internal_type: "Order Placed",
                    action_type: "paytm_done"
                }
            }
            mnosql.update('order_update', 'orders').make(function (builder) {
                builder.set(obj);
                builder.where('id', order_id);
            });

            mnosql.select('orders', 'orders').make(function (builder) {
                builder.where('id', order_id);
                builder.first();
            });

            mnosql.exec(async function (err, response) {
                if (err) {
                    await saveOrderTransactionUpdate(order[1],"PAYTM-" + paytmParams["TXNID"], false);
                    return self.redirect('/checkout/' + order_id + '/#PAYMENT_FAILED');
                }
                await saveOrderTransactionUpdate(txn_id,"PAYTM-" + paytmParams["TXNID"], true);

                if (response.orders != null) {

                    var model = response.orders;


                    //self.redirect('/checkout/' + order_id + '/?paid=1');
                    self.redirect('/order/verification/' + order_id);
                    stockModule.OrderConfirm(order_id);


                    var order = response.orders;
                    var message = `Thankyou for placing order in happimobiles.com. Your paytm transaction refernce # ${paytmParams["TXNID"]}.Your order is underprocess for information https://happimobiles.com/checkout/${order_id}`;
                    var subject = '@(Order #) ' + order.id;
                    smsModule.sendSMS(order.phone, message);

                    // self.layout('layout-new');
                    // self.view('order-payment-confirmation', order);

                    if (order.istwohrs) {
                        subject = subject + " - 2HRS";
                    }

                    if (order.ispickup) {
                        subject = subject + " - PICK_UP";
                    }

                    subject = subject + " - PAID ";
                    subject = subject + order_id;

                    //MAIL("happionlineorders@gmail.com", subject, '=?/mails/order-admin', model, model.language);
                    MAIL(model.email, '@(Order #) ' + model.id, '=?/mails/order', model, model.language);
                    
                } else {
                    await saveOrderTransactionUpdate(txn_id, "", false);
                    return self.redirect('/checkout/' + order_id + '/#PAYMENT_FAILED');
                }
            })

        }
        else {
            await saveOrderTransactionUpdate(txn_id,"", false);
            console.log("PAYMENT FAILEDDDDDDDDDDDDDDDDDDDDD");
            self.redirect('/checkout/' + order_id + '/#PAYMENT_FAILED');
        }
    }
    else {
        await saveOrderTransactionUpdate(txn_id, "",false);
        console.log("PAYMENT FAILEDDDDDDDDDDDDDDDDDDDDD ===================");
        self.redirect('/checkout/' + order_id + '/#PAYMENT_FAILED');
    }
}

async function paymentVerify() {
    console.log("PAYMENT VERIFY ---------------");
    var self = this;
    var mnosql = new Agent();
    var orderid = self.params.id;
    console.log("orderid", orderid);
    mnosql.select('orders', 'orders').make(function (builder) {
        builder.where('id', orderid);
        builder.first();
    });

    var order = await mnosql.promise('orders');
    self.layout('layout-new');
    self.view('~order-payment-confirmation', order);
}

function pinelabs_process(req, res) {

    var self = this;
    var formData = self.body;

    var timestamp = new Date().getTime();

    var url = PINELABS_URL;
    var formID = "PostForm";

    strForm = "<form id=\"" + formID + "\" name=\"" + formID + "\" action=\"" + url + "\" method=\"POST\">";

    var mnosql = new Agent();
    //NOSQL('orders').one().where('id', $.options.id || $.id).callback($.callback, 'error-orders-404');
    //console.log("id", $.options.id, $.id)
    mnosql.select('orders', 'orders').make(function (builder) {
        builder.where('id', formData.order_id)
        builder.first()
    })

    mnosql.exec(function (err, response) {
        console.log("MongoErr", err);
        //console.log("MongoRes", response.orders);
        //	console.log("mongo id", response.orders.id)
        //$.callback(response.orders);

        if (err) {
            return self.redirect('/checkout/' + formData.order_id + '/#PAYMENT_FAILED');
        }

        var order = response.orders;

        if (order == null) {
            return self.redirect('/checkout/' + formData.order_id + '/#PAYMENT_FAILED');
        }

        if (order.ispaid) {
            return self.redirect('/checkout/' + formData.order_id + '/?paid=1');
        }

        var data = {};
        data.ppc_UniqueMerchantTxnID = formData.order_id;
        data.ppc_Amount = order.price + "00";
        data.ppc_MerchantID = PINELABS_MERCHANT_ID;
        data.ppc_MerchantAccessCode = PINELABS_MERCHANT_ACCESS_CODE;
        data.ppc_PayModeOnLandingPage = PINELABS_PAYMODE_ONLANDING_PAGEL;
        data.ppc_MerchantReturnURL = PINELABS_MERCHANT_RETURN_URL;
        data.ppc_NavigationMode = PINELABS_NAVIGATION_MODE;
        data.ppc_TransactionType = PINELABS_TRANSACTION_TYPE;
        data.ppc_LPC_SEQ = PINELABS_LPC_SEQ;

        if (order.product_code && order.product_code !== 'none') {
            data.ppc_Product_Code = order.product_code;
        }



        var keys = Object.keys(data);
        keys.sort();

        var msgString = "";

        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            if (key == PINELABS_UNIQUE_MERCHANT_TXNID) {
                msgString += String(key) + "=" + String(data[key] + '-' + timestamp) + "&";
            } else if (data[key] != null && data[key] != undefined && key != 'ppc_DIA_SECRET' && key != 'ppc_DIA_SECRET_TYPE') {
                msgString += String(key) + "=" + String(data[key]) + "&";
            }
        }

        msgString = msgString.slice(0, -1);

        strSecretKey = PINELABS_STR_SECRET_KEY;
        strHashType = PINELABS_STR_HASH_TYPE;

        strDIA_SECRET = HMAC(msgString, strSecretKey);

        //if hash generation failed

        if (strDIA_SECRET == "") {
            return self.redirect('/checkout/' + formData.order_id + '/#PAYMENT_FAILED');
        } else {
            data['ppc_DIA_SECRET'] = strDIA_SECRET
            data['ppc_DIA_SECRET_TYPE'] = strHashType

            for (key in data) {
                if (key == PINELABS_UNIQUE_MERCHANT_TXNID) {
                    strForm += "<input type=\"hidden\" name=\"" + key + "\" value=\"" + data[key] + '-' + timestamp + "\">";
                    console.log("PINELABS DATA", key, data[key] + '-' + timestamp);
                } else if (data[key] != null && data[key] != undefined) {
                    strForm += "<input type=\"hidden\" name=\"" + key + "\" value=\"" + data[key] + "\">";
                    console.log("PINELABS DATA", key, data[key]);
                }


            }



            strForm += "</form>";

            strScript = "<script language='javascript'>";
            strScript += "var v" + formID + " = document." + formID + ";";
            strScript += "v" + formID + ".submit();";
            strScript += "</script>";

            self.res.send(strForm + strScript);
        }
    });

}

function HMAC(message, key) {
    var hmac = "";

    try {
        var shaObj = new jsSHA("SHA-256", "TEXT");
        shaObj.setHMACKey(key, "HEX");
        shaObj.update(message);
        hmac = shaObj.getHMAC("HEX");
    }
    catch (err) { }

    return hmac.toUpperCase();
}
var jsSHA = require("jssha");


function pinelabs_cb() {
    var self = this;
    data = self.body;

    var strMsgResponse = "";

    var keys = Object.keys(data);
    keys.sort();

    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        strMsgResponse += "<strong>" + key + "</strong>" + " = " + data[key] + "<BR />";
    }

    msgString = "";


    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (data[key] != null && data[key] != undefined && key != 'ppc_DIA_SECRET' && key != 'ppc_DIA_SECRET_TYPE') {
            msgString += String(key) + "=" + String(data[key]) + "&";
        }
    }

    msgString = msgString.slice(0, -1);

    strSecretKey = "42F2F10AE4AE40CC858096722371EF49";
    strHashType = "SHA256";

    strDIA_SECRET = HMAC(msgString, strSecretKey);

    strMsgResponse += "<BR /><strong>" + "Hash Generated on Response Page" + "</strong>" + " = " + strDIA_SECRET + "<BR />";
    strMsgResponse += "<strong>" + "Do Hashes match?: " + "</strong>";

    comment = "";

    if (strDIA_SECRET == data['ppc_DIA_SECRET']) {
        //Transaction is successful if ppc_TxnResponseCode = 1
        if (data['ppc_TxnResponseCode'] == "1") {
            comment = "Transaction SUCCESSFUL";
            strMsgResponse += "YES" + "<BR />";

            var order_id = data[PINELABS_UNIQUE_MERCHANT_TXNID].substring(0, data[PINELABS_UNIQUE_MERCHANT_TXNID].indexOf('-'))


            var mnosql = new Agent();
            //NOSQL('orders').one().where('id', $.options.id || $.id).callback($.callback, 'error-orders-404');
            //console.log("id", $.options.id, $.id)

            mnosql.update('order_update', 'orders').make(function (builder) {
                builder.set({
                    ispaid: true,
                    datepaid: F.datetime,
                    taxid: "PINE-" + data["ppc_PinePGTransactionID"],
                    tag: "paid",
                    internal_type: "Order Placed"
                });
                builder.where('id', order_id);
            });

            mnosql.select('orders', 'orders').make(function (builder) {
                builder.where('id', order_id);
                builder.first();
            });


            mnosql.exec(function (err, response) {

                if (err) {
                    return self.redirect('/checkout/' + data[PINELABS_UNIQUE_MERCHANT_TXNID].substring(0, data[PINELABS_UNIQUE_MERCHANT_TXNID].indexOf('-')) + '/#PAYMENT_FAILED-internal');
                }

                if (response.orders != null) {

                    self.redirect('/checkout/' + order_id + '/?paid=1');
                    stockModule.OrderConfirm(order_id);
                    var order = response.orders;
                    var message = `Thankyou for placing order in happimobiles.com. Your transaction refernce # ${data["ppc_PinePGTransactionID"]}.Your order is underprocess for information https://happimobiles.com/checkout/${order_id}`;
                    var subject = '@(Order #) ' + order.id;

                    if (order.istwohrs) {
                        subject = subject + " - 2HRS";
                    }

                    if (order.ispickup) {
                        subject = subject + " - PICK_UP";
                    }

                    subject = subject + " - PAID ";
                    subject = subject + order_id;

                    var model = response.orders;
                    MAIL("happionlineorders@gmail.com", subject, '=?/mails/order-admin', model, model.language);
                    MAIL(model.email, '@(Order #) ' + model.id, '=?/mails/order', model, model.language);

                    smsModule.sendSMS(order.phone, message);
                }
            });
        }
        else {
            comment = "Transaction UNSUCCESSFUL";
            strMsgResponse += "YES" + "<BR />";
            self.redirect('/checkout/' + data[PINELABS_UNIQUE_MERCHANT_TXNID].substring(0, data[PINELABS_UNIQUE_MERCHANT_TXNID].indexOf('-')) + '/#PAYMENT_FAILED-' + data['ppc_TxnResponseCode']);
        }
    }
    else {
        comment = "Transaction UNSUCCESSFUL"; //	#because hashes do not match
        strMsgResponse += "NO" + "<BR />";
        self.redirect('/checkout/' + data[PINELABS_UNIQUE_MERCHANT_TXNID].substring(0, data[PINELABS_UNIQUE_MERCHANT_TXNID].indexOf('-')) + '/#PAYMENT_FAILED-' + data['ppc_TxnResponseCode']);
    }
    strMsgResponse += "<BR />" + "<h4>" + comment + "</h4>" + "<BR />";

    //self.res.send(strMsgResponse);
};


// get transaction details 
async function getTrasactionId(id, cb) {
    var nosql = new Agent();
    //console.log("id", id)
    nosql.select('getOrderTransaction', 'transaction_details').make(function (builder) {
        builder.where('orderid', id);
        builder.fields('transactionid');
        builder.sort('datecreated', 'desc')
        builder.first();
    });

    var orderTranscation = await nosql.promise('getOrderTransaction');
    console.log("orderTranscation", orderTranscation);
    cb(orderTranscation);
}

// get order id from trasaction details collection
async function getTrasactionOrderId(txnId) {
    var nosql = new Agent();
    //console.log("id", id)
    nosql.select('getOrderId', 'transaction_details').make(function (builder) {
        builder.where('transactionid', txnId);
        builder.fields('orderid');
        builder.sort('datecreated', 'desc')
        builder.first();
    });

    var getOrderId = await nosql.promise('getOrderId');
    console.log("getOrderId", getOrderId);
    return getOrderId;
}


async function saveOrderTransactionUpdate(txnid,refid, status) {
    var JOB_ID = generateUuidModule.createUUID();
    var nosql = new Agent();
    console.log("txnid",txnid, "refid",refid, "status", status);
    var orderId = txnid.split("-");
    if (status == true) {
        console.log("PAYTM SUCCESS------------------------------");
        nosql.update('updateTransaction', 'transaction_details').make(function (builder) {
            builder.set("transaction_type", "paytm");
            builder.set("reference_id", refid);
            builder.set("isSuccess", true);
            builder.set('dateupdated', new Date());
            builder.where("transactionid", txnid);
        });
        // action_type:bajaj_emi_pass_downpay_pending  in order

    } else {
        console.log("PAYTM FAILLLLLLL--------------------------------");
        nosql.update('updateTransaction', 'transaction_details').make(function (builder) {
            builder.set("isSuccess", false);
            builder.set("transaction_type", "paytm");
            builder.set("reference_id", "");
            builder.set('dateupdated', new Date());
            builder.where("transactionid", txnid);
        });
        // add action_type in order 
        await updateOrderPaymentDetails(orderId[0], false)
    }


    var updateTransaction = await nosql.promise('updateTransaction');
    console.log("UPDATE PAYTM TRANSACTION DETAILS TRIGGERED ", JOB_ID, updateTransaction);
}

async function updateOrderPaymentDetails(orderId, status) {
    var nosql = new Agent();
    var JOB_ID = generateUuidModule.createUUID();
    if (status == true) {
        nosql.update('updateTransaction', 'orders').make(function (builder) {
            builder.set("action_type", "null");
            builder.where("id", orderId);
        });
        // action_type:paytm_fail  in order
    } else {
        nosql.update('updateTransaction', 'orders').make(function (builder) {
            builder.set("action_type", "paytm_fail");
            builder.where("id", orderId);
        });
        // add action_type in order 
    }
    var updateTransaction = await nosql.promise('updateTransaction');
    console.log("UPDATE  PAYTM  ORDER DETAILS TRIGGERED ", JOB_ID, updateTransaction);
}