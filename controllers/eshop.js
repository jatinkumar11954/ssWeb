var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
const assert = require('assert');

// captcha
var svgCaptcha = require('svg-captcha');

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

// mongo db long url
const MONGO_URL = F.config['mongo-url'];
// Database Name
const DB_NAME = process.env.DB_NAME || F.config['db-name'];

// paytm env variables
const MID = process.env.PAYTM_MID || "Happim26189443024001";
const WEBSITE = process.env.PAYTM_WEBSITE || "WEBPROD";
const INDUSTRY_TYPE_ID = process.env.PAYTM_INDUSTRY_TYPE_ID || "Retail100";
const CHANNEL_ID = process.env.PAYTM_CHANNEL_ID || "WEB";
const CALLBACK_URL = process.env.PAYTM_CALLBACK_URL || "https://www.happimobiles.com/order/paytm-return";
const CALLBACK_LINK_URL = process.env.PAYTM_CALLBACK_LINK_URL || "https://happimobiles.com/order/paytm-return-link";
const CHECK_SUM_KEY = process.env.PAYTM_CHECK_SUM_KEY || "pBgjbchezWmjrORm";
const ORDER_SUBMIT_URL = process.env.PAYTM_ORDER_SUBMIT_URL || "https://securegw.paytm.in/order/process";

// pinelabs env variables
const PINELABS_URL = process.env.PINELABS_URL || "https://pinepg.in/PinePGRedirect/index";
const PINELABS_MERCHANT_ID = process.env.PINELABS_MERCHANT_ID || "1550";
const PINELABS_MERCHANT_ACCESS_CODE = process.env.PINELABS_MERCHANT_ACCESS_CODE || "bdd01d1d-52ea-460b-a6a7-625a7384dbc1";
const PINELABS_PAYMODE_ONLANDING_PAGEL = process.env.PINELABS_PAYMODE_ONLANDING_PAGEL || "0,1,3,4,5,10,11,12";
const PINELABS_MERCHANT_RETURN_URL = process.env.PINELABS_MERCHANT_RETURN_URL || "https://www.happimobiles.com/order/pinelabs-return";
const PINELABS_NAVIGATION_MODE = process.env.PINELABS_NAVIGATION_MODE || "2";
const PINELABS_TRANSACTION_TYPE = process.env.PINELABS_TRANSACTION_TYPE || "1";
const PINELABS_LPC_SEQ = process.env.PINELABS_LPC_SEQ || "1"; // strSecretKey
const PINELABS_STR_SECRET_KEY = process.env.PINELABS_STR_SECRET_KEY || "42F2F10AE4AE40CC858096722371EF49";
const PINELABS_STR_HASH_TYPE = process.env.PINELABS_STR_HASH_TYPE || "SHA256";
const PINELABS_UNIQUE_MERCHANT_TXNID = process.env.PINELABS_UNIQUE_MERCHANT_TXNID || 'ppc_UniqueMerchantTxnID';

exports.install = function () {
    ROUTE('#popular', view_popular);
    ROUTE('#top', view_top);
    ROUTE('#new', view_new);
    ROUTE('#category', view_category, [30000]); // new category added
    // ROUTE('#categorynew', view_category,[30000]);
    ROUTE('#detail', view_detail, [10000]);
    ROUTE('#detailnew', view_detail, [10000]);
    ROUTE('#checkout', checkout);

    ROUTE('#order', view_order, [10000]);
    ROUTE('#account', 'account', ['authorize']);
    ROUTE('#settings', 'settings', ['authorize']);
    ROUTE('#account', view_signin, ['unauthorize']);
    ROUTE('#logoff', redirect_logoff, ['authorize']);

    // Payment process
    ROUTE('#order/paypal/', paypal_process, ['*Order', 10000]);
    // ROUTE('/order/paytm/', paytm_process, ['post']);
    // ROUTE('/order/paytm-return', paytm_cb, ['post']);
    // ROUTE('/order/paytm-return/', paytm_cb, ['post', 10000]);
    ROUTE('/order/paytm-return-link', paytm_cb_link, ['post']);

    ROUTE('/order/razorpay-payment', update_payment, ['post']);
    ROUTE('/order/cod/', cod_process, ['post']);
    ROUTE('/order/export/', orders_export, ['cors']);
    ROUTE('/csv-download/{id}', download_csv);
    //ROUTE('/order/verify/', verify_process, ['post']);

    // ROUTE('/order/pinelabs/', pinelabs_process, ['post']);
    // ROUTE('/order/pinelabs-return/', pinelabs_cb, ['post', 10000]);
    ROUTE('/order-delivery/{id}', view_delivery_page);
    ROUTE('/order-payment/{id}', view_payment_page);
    //ROUTE('/product-view/{id}', view_product_view);

    //Insurance 
    ROUTE('/warranty/', view_insurance);
    ROUTE('/warranty/{id}', view_insurance_by_id);
    ROUTE('/order/insurance/paytm/', insurance_process, ['post']);
    ROUTE('/order/insurance/paytm-return', insurance_paytm_cb, ['post']);
    ROUTE('/order-confirmation', orderConfirmation, ['post', 'cors']);

    //recaptcha
    ROUTE('/api/get-recaptcha', generateRecaptcha, ['cors']);
    ROUTE('/api/verify-recaptcha', verifyRecaptcha, ['post', 'cors']);

    ROUTE('/api/order/verification/{id}', paymentVerify, ['get', 10000]);

    ROUTE('/api/set-pincode', setPincode, ['get', 10000]);
    ROUTE('/api/logout', logout, ['get', 10000]);
};

function setPincode() {
    var self = this;
    self.cookie('pincode', self.query.pincode, '30 days');
    console.log(self.query.pincode, "PIIIIIIIIIIIIIIN");
    self.redirect('/');
}

function logout() {
    var self = this;
    self.cookie('pincode', '', '-1 day');
    self.redirect('/');
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
    self.layout('nolayout');
    self.view('~order-payment-confirmation', order);
}

function generateRecaptcha() {
    var self = this;
    var captcha = svgCaptcha.create();
    //console.log(captcha);
    self.json({
        status: true,
        data: captcha
    })
}

function verifyRecaptcha() {
    var self = this;
    // recaptcha data verify
    if (self.body.captcha != self.body.userCaptcha) {
        var captcha = svgCaptcha.create();
        return self.json({
            status: false,
            message: "Invalid Captcha",
            data: captcha
        })
    } else {
        self.json({
            status: true,
            message: "Captcha Verified Successfully",
        })
    }
}

function orderConfirmation() {
    var self = this;

}

ON("ORDERS_EXPORT", function (opt) {
    var mnosql = new Agent();

    mnosql.select('ordersmayreport', 'orders').make(function (builder) {
        builder.query('datecreated', {
            $gte: new Date(new Date(opt.fromDate).setUTCHours(00, 00, 00, 000)),
            $lte: new Date(new Date(opt.toDate).setUTCHours(23, 59, 59, 999))
        });
        console.log("builder", builder.builder);
    })
    mnosql.exec(function (err, response) {
        if (err) {
            console.log(err);
        } else {
            console.log("resp", response.ordersmayreport.length);
            var records = [];
            for (var i = 0; i < response.ordersmayreport.length; i++) {
                var each = response.ordersmayreport[i];
                var products = "";
                for (var j = 0; j < each.items.length; j++) {
                    var x = each.items[j].name + ' X ' + each.items[j].count + ' - ';
                    products = products + x;
                }
                var dateformat = each.datecreated;
                dateformat = dateformat.getDate() + "-" + (dateformat.getMonth() + 1) + "-" + dateformat.getFullYear();
                var brands = "";
                var temp = products.toLowerCase();
                if (temp.indexOf("iphone") != -1) {
                    brands = brands + ' ' + "Apple"
                }
                if (temp.indexOf("realme") != -1) {
                    brands = brands + ' ' + "Realme"
                }
                if (temp.indexOf("oppo") != -1) {
                    brands = brands + ' ' + "Oppo"
                }
                if (temp.indexOf("nokia") != -1) {
                    brands = brands + ' ' + "Nokia";
                }
                if (temp.indexOf("oneplus") != -1) {
                    brands = brands + ' ' + "Oneplus"
                }
                if (temp.indexOf("vivo") != -1) {
                    brands = brands + ' ' + "Vivo"
                }
                if (temp.indexOf("honor") != -1) {
                    brands = brands + ' ' + "Honor"
                }
                if (temp.indexOf("mi") != -1) {
                    brands = brands + ' ' + "Xiaomi"
                }
                if (temp.indexOf("samsung") != -1) {
                    brands = brands + ' ' + "Samsung"
                }
                if (temp.indexOf("motorola") != -1) {
                    brands = brands + ' ' + "Motorola"
                }
                if (temp.indexOf("lg") != -1) {
                    brands = brands + ' ' + "LG"
                }

                // console.log("brnds", brands)

                var obj = {
                    Orderid: each.id,
                    OrderNo: each.number,
                    Name: each.name,
                    Email: each.email,
                    price: each.price,
                    status: each.status,
                    internalNote: each.internal_type,
                    CityName: each.deliverycity,
                    BillingAddress: each.billingstreet.split(',').join(' ') + ' ' + each.billingcity + ' ' + each.billingzip,
                    DeliveryAddress: each.deliverystreet.split(',').join(' ') + ' ' + each.deliverycity + ' ' + each.deliveryzip,
                    Products: products,
                    Paymentstatus: "none",
                    Ordertype: "none",
                    Date: dateformat,
                    DeliveryPhoneNum: each.deliveryphone,
                    PhoneNum: each.phone,
                    Brand: brands,
                };
                if (each.ispaid) {
                    obj.Paymentstatus = "paid #" + each.taxid;
                }
                if (each.iscod) {
                    obj.Paymentstatus = "cod"
                }
                if (each.ispickup) {
                    obj.Ordertype = "pickup"
                }
                if (each.istwohrs) {
                    obj.Paymentstatus = "2hrs"
                }
                records.push(obj);
                //console.log("records", JSON.stringify(obj));
            }
            //return self.json(response.ordersmayreport);
            jsonexport(records, function (err, csv) {
                if (err) return console.log(err);
                //console.log(csv);
                var timestamp = new Date().getTime();
                fs.writeFile('./public/csv/t-' + timestamp + '.csv', csv, 'utf8', function (err) {
                    if (err) {
                        console.log('Some error occured - file either not saved or corrupted file saved.');
                    }
                    else {
                        console.log('It\'s saved!');
                        // self.file('csv/t-' + timestamp + '.csv', 'orders_t-' + timestamp + '.csv');
                        // self.json({ url: 'http://localhost:9898/csv/t-' + timestamp + '.csv' })
                        var model = opt;
                        model.url = "https://happimobiles.com/csv-download/" + timestamp;

                        MAIL("saycoolsainadh@gmail.com", `Orders Export From ${opt.fromDate} to ${opt.toDate}`, '=?/mails/order-export', model);
                        MAIL("orders@happimobiles.com", `Orders Export From ${opt.fromDate} to ${opt.toDate}`, '=?/mails/order-export', model);
                        MAIL("bhagat@redmattertech.com", `Orders Export From ${opt.fromDate} to ${opt.toDate}`, '=?/mails/order-export', model);
                        MAIL("sharansreeharsh@gmail.com", `Orders Export From ${opt.fromDate} to ${opt.toDate}`, '=?/mails/order-export', model);
                        MAIL("srikant@redmattertech.com", `Orders Export From ${opt.fromDate} to ${opt.toDate}`, '=?/mails/order-export', model);
                        MAIL("akhil@redmattertech.com", `Orders Export From ${opt.fromDate} to ${opt.toDate}`, '=?/mails/order-export', model);
                    }
                });
            });
        }
    });
});

function checkout() {
    this.redirect('/cart');
}

function download_csv(id) {
    this.file('csv/t-' + id + '.csv', 'orders_t-' + id + '.csv');
}

async function view_delivery_page(id) {
    var self = this;
    var nosql = new Agent();

    nosql.select('order', 'order-link').make(function (builder) {
        builder.where('id', id);
        builder.first();
    });

    console.log("ORDER_ID", id);
    var order = await nosql.promise('order');

    self.layout('nolayout');
    //
    self.view('eshop/order-delivery', order);


}

async function view_payment_page(id) {
    var self = this;
    var nosql = new Agent();
    nosql.select('order', 'order').make(function (builder) {
        builder.where('id', id);
        builder.first();
    });

    nosql.select('getOrderTransaction', 'transaction_details').make(function (builder) {
        builder.where('orderid', id);
        builder.sort('datecreated', 'desc')
    });



    var order = await nosql.promise('order');
    console.log(order, "ORDER IIIIII");
    order.transaction_log = await nosql.promise('getOrderTransaction');
    self.layout('nolayout');
    self.view('eshop/order-payment', order);
}

function orders_export() {
    var self = this;
    var opt = self.query;
    // orders get mongo
    // console.log("opt",opt);
    EMIT("ORDERS_EXPORT", opt);
    self.plain("Shortly will recive an email to orders@happimobiles.com, sharansreeharsh@gmail.com");
}

function orders_cod() {
    var self = this;

    if (self.body.order_id !== null) {
        var mnosql = new Agent();

        mnosql.select('ordersGet', 'orders').make(function (builder) {
            builder.where('id', self.body.order_id);
            builder.first();
        });

        mnosql.exec(function (err, response) {
            if (err) {
                self.redirect('/checkout/' + self.body.order_id);
                return;
            }

        });


    } else {

    }

}

function cod_process() {
    var self = this;

    if (self.body.order_id !== null) {
        // console.log("order_id", self.body.order_id);
        var mnosql = new Agent();
        // start update the COD tag (mongo)
        mnosql.update('orders', 'orders').make(function (builder) {
            builder.set({ iscod: true, datecod: F.datetime, tag: "cod", internal_type: "Order Placed" });
            builder.where('id', self.body.order_id);
        });
        // Start send SMS to Order (mongo)
        mnosql.select('ordersGet', 'orders').make(function (builder) {
            builder.where('id', self.body.order_id);
            builder.first();
        });
        mnosql.exec(function (err, response) {
            if (err) {
                self.redirect('/checkout/' + self.body.order_id);
            }
            //self.redirect('/checkout/' + self.body.order_id + '/?cod=1');
            self.redirect('/api/order/verification/' + self.body.order_id);
            //console.log("FETCH ORDER",err, response.ordersGet);

            var order = response.ordersGet;
            stockModule.OrderConfirm(order.id);
            if (order == null) {
                return;
            }
            var message = `Thankyou for placing order in happimobiles.com. Your order is underprocess for information https://happimobiles.com/checkout/${order.id}`;
            var subject = '@(Order #) ' + order.id;
            var model = response.ordersGet;

            MAIL(model.email, subject, '=?/mails/order', model, model.language);
            if (order.istwohrs) {
                subject = subject + " - 2HRS";
            }
            if (order.ispickup) {
                subject = subject + " - PICK_UP";
            }
            subject = subject + " - COD ";
            subject = subject + order.id;
            MAIL("happionlineorders@gmail.com", subject, '=?/mails/order-admin', model, model.language);
            smsModule.sendSMS(order.phone, message);
        });
    }
    else {
        self.redirect('/checkout/' + self.body.order_id);
    }
}

function prepare_links(d) {
    // for (var i = 0; i < d.length; i++) {
    //     d[i].linker = '/detail/' + d[i].linker;
    // }
    return d;
}

function searchProducts(db, keywords, skip, limit, callback) {
    // Get the documents collection
    console.log("keywords", keywords);
    const collection = db.collection('product');
    // Insert some documents
    collection.aggregate(
        // Pipeline
        [
            // Stage 1 
            {
                $match: {
                    '$and': [{
                        searchkeywords: { $in: keywords },
                        ispublished: true,
                        isactive: true
                    }]
                }
            },
            { $skip: parseInt(skip) || 0 },
            { $limit: parseInt(limit) || 10 },
            // Stage 2
            {
                $project: {
                    "searchkeywords": 1,
                    "name": 1,
                    "payPrice": 1,
                    "id": 1,
                    'mrp': 1, 'linker': 1, 'linker_category': 1, 'linker_manufacturer': 1, 'category': 1, 'manufacturer': 1,
                    'pricemin': 1, 'priceold': 1, 'isnew': 1, 'istop': 1, 'pictures': 1, 'availability': 1, 'datecreated': 1, 'ispublished': 1,
                    'stock': 1, 'product_type': 1, 'weight': 1,
                    "orders": {
                        "$size": {
                            "$setIntersection": [keywords, "$searchkeywords"]
                        }
                    }
                }
            },
            // Stage 3
            {
                $sort: {
                    "orders": -1,
                    "stock": -1,
                    "weight": -1,

                }
            },
        ],
        // Options
        {
            allowDiskUse: true
        }
    ).toArray(function (err, res) {
        if (err) throw err;
        //console.log("res", res);
        var obj = {
            page: 1,
            items: prepare_links(res),
            limit: res.length,
            count: res.length,
            pages: 2,
        };
        callback(obj);
        // console.log(JSON.stringify(res));
        // db.close();
    });;

}

async function view_category() {
    //console.log("view cat called --------------------------------");
    var self = this;
    var pincode = "";
    var cookie = self.cookie('pincode');
    // console.log("cookie", cookie);
    if (self.query.pincode) {
        pincode = self.query.pincode;
    } else if (cookie != null && cookie != "") {
        pincode = cookie;
    } else {
        pincode = "500072"
    }
    var url = self.sitemap_url('category');
    var linker = self.url.substring(url.length, self.url.length - 1);
    var category = null;
    var options = {};

    var metaTag = {};
    // console.log("LINKER____", linker);
    var linkerContext = linker.split('/');
    //console.log("linker.length", linkerContext.length, linkerContext);
    if (linkerContext.length > 2) {
        linker = `${linkerContext[0]}/${linkerContext[1]}`;
        //console.log("NEW LINKER",linker);


        if (linkerContext[2].indexOf('c2') != -1) {
            //console.log("hieeee");
            //console.log("linkerContext[2]", linkerContext[2]);

            var cat_two_id = linkerContext[2].split('-');
            //console.log("cat_two_id[1]",cat_two_id[1]);
            cat_two_id[1] && (options.cat_two_id = cat_two_id[1]);

        }


    } else {
        if (linkerContext[1].indexOf('c1') != -1) {
            //console.log("hieeee");
            // console.log("linkerContext[1]", linkerContext[1]);

            var cat_one_id = linkerContext[1].split('-');
            // console.log("cat_one_id[1]",cat_one_id[1]);
            cat_one_id[1] && (options.cat_one_id = cat_one_id[1]);

        }
    }
    //console.log("ctaegories========== Global", F.global.categories);
    // if (linker !== '/' && linker != undefined) {
    //     category = F.global.categories.findItem('linker', linker);
    //     //console.log("category", category);
    //     if (category == null) {
    //         self.throw404();
    //         return;
    //     }
    // }

    // Binds a sitemap
    self.sitemap();

    options.published = true;
    options.limit = 15;
    var mongoClient = new Agent();
    var stockStatus = false;
    mongoClient.select('getwarehouse', 'pincodes').make(function (builder) {
        builder.where('pincode', pincode);
        builder.first();
    });

    var getwarehouse = await mongoClient.promise('getwarehouse');

    if (getwarehouse != null) {
        if (getwarehouse.wid != "notAllocated") {
            stockStatus = true;
        } else {
            stockStatus = false;
        }
    } else {
        stockStatus = false;
    }
    if (self.query.q != null) {

        const client = new MongoClient(MONGO_URL, { useNewUrlParser: true });

        var keywords = self.query.q.toLowerCase().split(" ");

        //console.log("keywords", keywords);
        client.connect(function (err, C) {
            assert.equal(null, err);
            //console.log("Connected successfully to server");
            const db = C.db(DB_NAME);
            searchProducts(db, keywords, self.query.skip, self.query.limit, function (response) {
                C.close();
                self.repository.linker_category = linker;
                if (self.query.json == "1") {
                    self.json(response);
                    return;
                }
                self.layout('nolayout');
                self.view('category', response);
            });
        });
    } else {
        //var fullUrl = self.protocol + '://' + self.get('host') + self.originalUrl;
        // console.log("req.originalUrl",controller.url);
        self.query.page && (options.page = self.query.page);
        // self.query.q && (options.q = self.query.q);
        self.query.sort && (options.sort = self.query.sort);
        
        self.query.minprice && (options.minprice = self.query.minprice);
        self.query.maxprice && (options.maxprice = self.query.maxprice);
       

        options.pincode = pincode;
        $QUERY('Product', options, function (err, response) {
            self.repository.linker_category = linker;
            if (metaTag.description && metaTag.keywords) {
                response.metaTag = metaTag;
            }
            // else{
            //     response.metaTag = "";
            // }
            var headerJson = JSON.parse(fs.readFileSync(__dirname + '/../public/header.json'));
            response.headerJson = headerJson;

            response.stockStatus = stockStatus;

            for (var i = 0; i < response.items.length; i++) {
                response.items[i].stock = response.items[i].variant.reduce(function (tot, arr) {
                    return tot + arr.stock;
                }, 0);
            }
            if (self.query.json == "1") {
                //console.log("response",response);
                self.json(response);
                return
            }
            self.layout('nolayout');
            self.view('category', response);
        });
    }


}

function view_popular() {
    var self = this;
    var options = {};
    options.published = true;
    self.query.manufacturer && (options.manufacturer = self.query.manufacturer);
    self.query.size && (options.size = self.query.size);
    self.sitemap();
    $WORKFLOW('Product', 'popular', options, self.callback('special'));
}

function view_new() {
    var self = this;
    var options = {};
    options.isnew = true;
    options.published = true;
    self.query.manufacturer && (options.manufacturer = self.query.manufacturer);
    self.query.size && (options.size = self.query.size);
    self.sitemap();
    $QUERY('Product', options, self.callback('special'));
}

function view_top() {
    var self = this;
    var options = {};
    options.istop = true;
    options.published = true;
    self.query.manufacturer && (options.manufacturer = self.query.manufacturer);
    self.query.size && (options.size = self.query.size);
    self.sitemap();
    $QUERY('Product', options, self.callback('special'));
}

async function view_detail(linker) {
    var self = this;
    var options = {};
    options.linker = linker;
    var pincode = "";
    var cookie = self.cookie('pincode');
    // console.log("cookie", cookie);
    if (self.query.pincode) {
        pincode = self.query.pincode;
    } else if (cookie != null && cookie != "") {
        pincode = cookie;
    } else {
        pincode = "500072"
    }
    var mongoClient = new Agent();
    var stockStatus = false;
    mongoClient.select('getwarehouse', 'pincodes').make(function (builder) {
        builder.where('pincode', pincode);
        builder.first();
    });

    var getwarehouse = await mongoClient.promise('getwarehouse');

    if (getwarehouse != null) {
        if (getwarehouse.wid != "notAllocated") {
            stockStatus = true;
        } else {
            stockStatus = false;
        }
    } else {
        stockStatus = false;
    }

    options.pincode = pincode;
    $GET('Product', options, function (err, response) {

        if (err)
            return self.invalid().push(err);

        // Binds a sitemap
        self.sitemap();

        // var path = self.sitemap_url('category');
        // var tmp = response.category;

        // while (tmp) {
        //     self.sitemap_add('category', tmp.name, path + tmp.linker + '/');
        //     tmp = tmp.parent;
        // }

        // // Category menu
        // self.repository.linker_category = response.category.linker;

        self.title(response.name);
        self.description(response.name);
        self.keywords(response.name);
        self.sitemap_change('detail', 'url', linker);
        //console.log('RESPONSEEEEEEEEE', response.prices);
        var headerJson = JSON.parse(fs.readFileSync(__dirname + '/../public/header.json'));
        response.page_type = "product";
        response.headerJson = headerJson;
        if (response.variant != null) {
            response.stock = response.variant.reduce(function (tot, arr) {
                return tot + arr.stock;
            }, 0);
        }

        response.stockStatus = stockStatus;
        if (self.query.json == "1") {
            self.json(response);
        } else {
            //self.view('~cms/' + (response.template || 'product'), response);
            self.layout('nolayout');
            self.view('~cms/product', response);
        }
    });
}

function view_order(id) {
    var self = this;
    var options = {};
    var nosql = new Agent();
    self.id = options.id = id;

    $GET('Order', options, async function (err, response) {
        // console.log("ORDER_FETCH", err, response);
        if (err || response == null) {
            self.invalid().push(err);
            return;

        }
        nosql.select('getOrderTransaction', 'transaction_details').make(function (builder) {
            builder.where('orderid', options.id);
            builder.sort('datecreated', 'desc')
        });



        var getOrderTransaction = await nosql.promise('getOrderTransaction');
        var transactionData = {};
        for (let i = 0; i < getOrderTransaction.length; i++) {
            const element = getOrderTransaction[i];
            if (element.isSuccess) {
                transactionData = element;
            }
        }
        console.log(getOrderTransaction, "getOrderTransaction");
        response.transaction_log = getOrderTransaction;


        // if (!response.ispaid) {
        //     switch (self.query.payment) {
        //         case 'paypal':
        //             paypal_redirect(response, self);
        //             return;
        //     }
        // }

        if (response.ispaid || response.iscod) {

            if (response.counter == undefined) {
                response.counter = 0;

                var mnosql = new Agent();

                mnosql.update('order_update', 'orders').make(function (builder) {
                    builder.set({
                        counter: 0
                    });
                    builder.where('id', self.id);
                });

                mnosql.exec(function (err, resp) {

                })
            } else {

                var mnosql = new Agent();

                mnosql.update('order_update', 'orders').make(function (builder) {
                    builder.inc('counter', 1);
                    builder.where('id', self.id);
                });

                mnosql.exec(function (err, resp) {

                })
            }



        }

        if (self.query.json) {
            self.json(response);
            return;
        }
        if (self.query.userAgent == "Happi-Mobile-App" || self.headers['user-agent'] == "Happi-Mobile-App") {
            self.layout('nolayout');
            self.view('~eshop/order-new', response);
            return;
        }

        // if (response && response.version == 'V2') {
        //     self.layout('nolayout');
        //     self.view('~eshop/order-detail', response);
        //     //self.view('~eshop/order-new-desktop', response);
        //     return;
        // }
        self.layout('nolayout');
        self.view('~eshop/order-detail', response);
        //self.view('order', response);
    });
}

function redirect_logoff() {
    var self = this;
    MODEL('users').logoff(self, self.user);
    self.redirect(self.sitemap_url('account'));
}

function view_signin() {
    var self = this;
    var hash = self.query.hash;

    // Auto-login
    if (hash && hash.length) {
        var user = F.decrypt(hash);
        if (user && user.expire > F.datetime.getTime()) {
            MODEL('users').login(self, user.id);
            self.redirect(self.sitemap_url('settings') + '?password=1');
            return;
        }
    }

    self.sitemap();
    self.view('signin');
}

function paypal_redirect(order, controller) {
    var redirect = F.global.config.url + controller.sitemap_url('order', controller.id) + 'paypal/';
    var paypal = require('paypal-express-checkout').create(F.global.config.paypaluser, F.global.config.paypalpassword, F.global.config.paypalsignature, redirect, redirect, F.global.config.paypaldebug);
    paypal.pay(order.id, order.price, F.config.name, F.global.config.currency, function (err, url) {
        if (err) {
            LOGGER('paypal', order.id, err);
            controller.throw500(err);
        }
        else
            controller.redirect(url);
    });
}

function paypal_process(id) {

    var self = this;
    var redirect = F.global.config.url + self.url;
    var paypal = require('paypal-express-checkout').create(F.global.config.paypaluser,
        F.global.config.paypalpassword, F.global.config.paypalsignature,
        redirect, redirect, F.global.config.paypaldebug);

    self.id = id;

    paypal.detail(self, function (err, data) {

        LOGGER('paypal', self.id, JSON.stringify(data));

        var success = false;

        switch ((data.PAYMENTSTATUS || '').toLowerCase()) {
            case 'pending':
            case 'completed':
            case 'processed':
                success = true;
                break;
        }

        var url = self.sitemap_url('order', self.id);

        if (success)
            self.$workflow('paid', () => self.redirect(url + '?paid=1'));
        else
            self.redirect(url + '?paid=0');
    });
}

function update_payment() {
    var self = this;
    NOSQL('orders').modify({ ispaid: true, datepaid: F.datetime, taxid: self.body.razorpay_payment_id })
        .where('id', self.body.order_id)
        .callback((err, count) => {
            console.log('err', err);
            console.log('count', count);
            self.json({ success: true });
        });

}


function paytm_cb_link() {
    var self = this;
    console.log("PAYTM_CALLBACK_TRIGGERED", JOB_ID, new Date().toISOString(), self.body);
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

    var isValidChecksum = checksum_lib.verifychecksum(paytmParams, CHECK_SUM_KEY, paytmChecksum);
    if (isValidChecksum) {
        console.log("Checksum Matched");
        if (paytmParams["STATUS"] == "TXN_SUCCESS") {

            var order_id = paytmParams["ORDERID"];

            var mnosql = new Agent();
            //NOSQL('orders').one().where('id', $.options.id || $.id).callback($.callback, 'error-orders-404');
            //console.log("id", $.options.id, $.id)

            mnosql.update('order_update', 'order-link').make(function (builder) {
                builder.set({
                    ispaid: true,
                    datepaid: F.datetime,
                    tan_no: "PAYTM-" + paytmParams["TXNID"],
                });
                builder.where('id', order_id);
            });

            mnosql.select('orders', 'order-link').make(function (builder) {
                builder.where('id', order_id);
                builder.first();
            });

            mnosql.exec(function (err, response) {
                if (err) {
                    return self.redirect('/order-payment/' + paytmParams["ORDERID"] + '/#PAYMENT_FAILED');
                }

                if (response.orders != null) {
                    self.redirect('/order-payment/' + order_id + '/?paid=1');
                }

            });


        } else {
            return self.redirect('/order-payment/' + paytmParams["ORDERID"] + '/#PAYMENT_FAILED');
        }
    } else {
        return self.redirect('/order-payment/' + paytmParams["ORDERID"] + '/#PAYMENT_FAILED');
    }
}





function view_insurance() {
    var self = this;
    self.view('eshop/insurance', { status: "Form" });
}


function insurance_process() {
    var self = this;

    const checksum_lib = require('../modules/paytm-checksum');



    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("happi");

        var myobj = self.body;
        myobj.status = "Pending";
        myobj.createdOn = new Date();

        dbo.collection("insurance-orders").insertOne(myobj, function (err, res) {
            if (err) throw err;
            console.log("1 document inserted");
            db.close();
            console.log(res["ops"][0]["_id"]);

            var paytmParams = {

                /* Find your MID in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys */
                "MID": "Happim26189443024001",

                /* Find your WEBSITE in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys */
                "WEBSITE": "WEBPROD",

                /* Find your INDUSTRY_TYPE_ID in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys */
                "INDUSTRY_TYPE_ID": "Retail100",

                /* WEB for website and WAP for Mobile-websites or App */
                "CHANNEL_ID": "WEB",

                /* Enter your unique order id */
                "ORDER_ID": res["ops"][0]["_id"].toString(),

                /* unique id that belongs to your customer */
                "CUST_ID": self.body.mobile,

                /* customer's mobile number */
                "MOBILE_NO": self.body.mobile,

                /* customer's email */
                "EMAIL": self.body.email,

                /**
                 * Amount in INR that is payble by customer
                 * this should be numeric with optionally having two decimal points
                 */
                "TXN_AMOUNT": "499",

                /* on completion of transaction, we will send you the response on this URL */
                // "CALLBACK_URL" : "http://localhost:8000/order/paytm-return", //local
                //"CALLBACK_URL" : "http://13.232.26.24:8888/order/paytm-return", //dev
                //"CALLBACK_URL": "https://happimobiles.com/order/insurance/paytm-return", //prod
                "CALLBACK_URL": "https://dev-happi.iipl.work/order/insurance/paytm-return"
            };

            var message = `Thank you for initiating your extended warranty order. Your order is in process. Please click on link below for status update https://happimobiles.com/warranty/${res["ops"][0]["_id"].toString()}`;
            var options = {
                'method': 'POST',
                'url': `http://api.smscountry.com/SMSCwebservice_bulk.aspx?User=happi9&passwd=Happi@12345&mobilenumber=91${self.body.mobile}&message=${message}&sid=HappiM&mtype=N&DR=Y`,
                'headers': {
                    'Content-Type': 'application/json'
                }
            };
            request(options, function (error, response) {
                if (error) throw new Error(error);
                console.log(response.body);
            });

            myobj._id = res["ops"][0]["_id"].toString();


            MAIL(self.body.email, '@(Order #) ' + res["ops"][0]["_id"].toString(), '=?/mails/warranty', myobj);

            console.log(paytmParams)

            checksum_lib.genchecksum(paytmParams, CHECK_SUM_KEY, function (err, checksum) {

                /* for Staging */
                // var url = "https://securegw-stage.paytm.in/order/process";

                /* for Production */
                var url = "https://securegw.paytm.in/order/process";
                console.log('checksum', checksum);

                paytmParams.checksum = checksum;
                paytmParams.submit_url = url;
                console.log('paytmParams', paytmParams);
                //self.json(paytmParams);
                self.view('paytm-test', paytmParams);
            });
        });
    });
}


function insurance_paytm_cb() {
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


    var isValidChecksum = checksum_lib.verifychecksum(paytmParams, CHECK_SUM_KEY, paytmChecksum);
    if (isValidChecksum) {
        console.log("Checksum Matched");
        if (paytmParams["STATUS"] == "TXN_SUCCESS") {

            MongoClient.connect(url, function (err, db) {
                if (err) throw err;
                var dbo = db.db("happi");
                var myquery = { _id: new ObjectID(paytmParams["ORDERID"]) };
                var newvalues = { $set: { datepaid: new Date(), txnid: paytmParams["TXNID"], 'status': "PAID" } };
                dbo.collection("insurance-orders").updateOne(myquery, newvalues, function (err, res) {
                    if (err) throw err;
                    console.log("1 document updated");
                    //db.close();



                    dbo.collection("insurance-orders").findOne(myquery, function (err, result) {
                        if (err) throw err;
                        // console.log(result.name);
                        db.close();
                        //self.view('eshop/insurance', result);

                        // myobj._id = res["ops"][0]["_id"].toString();


                        MAIL(result.email, '@(Order #) ' + result["_id"].toString(), '=?/mails/warranty', result);


                        var message = `Congratulations your order for 1 year extended warranty is completed.Please click on link below for details https://happimobiles.com/warranty/${paytmParams['ORDERID']}`;
                        var options = {
                            'method': 'POST',
                            'url': `http://api.smscountry.com/SMSCwebservice_bulk.aspx?User=happi9&passwd=Happi@12345&mobilenumber=91${result.phone}&message=${message}&sid=HappiM&mtype=N&DR=Y`,
                            'headers': {
                                'Content-Type': 'application/json'
                            }
                        };
                        request(options, function (error, response) {
                            if (error) throw new Error(error);
                            console.log(response.body);
                        });
                        setTimeout(function () {
                            // body...
                            self.redirect('/warranty/' + paytmParams["ORDERID"] + '#PAID');
                        }, 500);
                    });




                });
            });



        }
        else {
            self.redirect('/warranty/' + paytmParams["ORDERID"] + '#PAYMENT_FAILED');
        }
    }
    else {
        self.redirect('/warranty/' + paytmParams["ORDERID"] + '#PAYMENT_FAILED');
    }

}


function view_insurance_by_id(id) {
    var self = this;
    MongoClient.connect(url, function (err, db) {
        if (err) throw err;
        var dbo = db.db("happi");
        var myquery = { _id: new ObjectID(id) };
        dbo.collection("insurance-orders").findOne(myquery, function (err, result) {
            if (err) throw err;
            console.log(result);
            db.close();
            self.view('eshop/insurance', result);
        });
    });

}



