// import entire SDK
var AWS = require('aws-sdk')
var jwt = require('jsonwebtoken')
var MONGO_DB_CONNECTION = process.env.MONGO_DB_CONNECTION || F.config['mongo'];
var Agent = require('sqlagent/mongodb').connect(MONGO_DB_CONNECTION)
const MSG_NOTIFY = { TYPE: 'notify' }
const ALLOW = [
  '/api/dependencies/',
  '/api/pages/preview/',
  '/api/upload/',
  '/api/nav/',
  '/api/files/',
  '/stats/',
  '/live/',
  '/api/widgets/'
]

var cron = require('node-cron')
const fs = require('fs')
var request = require('request')
var DDOS = {}
var WS = null
var MongoClient = require('mongodb').MongoClient
var ObjectID = require('mongodb').ObjectID
const assert = require('assert')

// mongo db long url
const MONGO_URL =
  process.env.MONGO_URL ||
  'mongodb://admin:VsKl9x8yEWIqllxh@cluster0-shard-00-00.m73oz.mongodb.net:27017,cluster0-shard-00-01.m73oz.mongodb.net:27017,cluster0-shard-00-02.m73oz.mongodb.net:27017/shop-sasta?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin&retryWrites=true&w=majority'

// Database Name
const DB_NAME = process.env.DB_NAME || F.config['db-name']

// aws access key id
var ACCESS_KEY_ID =
  F.config['ACCESS_KEY_ID'] ||
  process.env.ACCESS_KEY_ID ||
  'AKIASTAEMZYQTLP6FLB4'

// aws secret access key
var SECRET_ACCESS_KEY =
  process.env.SECRET_ACCESS_KEY || 'MaEdglPhsaM0TrJ4c+nBhU80p64VTncaVabMTzNV'

// jwt secret key
var JWT_SECRET_KEY =
  process.env.JWT_SECRET_KEY || 'JDSFNKLSJDGKLJW4732KEWFNKNE8978SDNFSNS9834JDF'

// aws bucket name
var BUCKET = process.env.BUCKET || 'happimobiles'

// create uuid module import
var generateUuidModule = MODULE('generate-uuid')

// importing stock update module
var stock = MODULE('productStockUpdate')

// send sms import modile
var smsModule = MODULE('sms');

// importing cashbacks emitter module
const EventEmitter = require('events');
const myEmitter = new EventEmitter();

// importing the emitter
var weeklyCashbackEmmitter = require('../emitter/cashbacks_weekly_emitter');

// importing cities module
const indianCitiesDatabase = require('indian-cities-database')

const s3 = new AWS.S3({
  accessKeyId: ACCESS_KEY_ID,
  secretAccessKey: SECRET_ACCESS_KEY
})

global.ADMIN = {}
global.ADMIN.notify = function (value) {
  if (WS) {
    MSG_NOTIFY.type = value instanceof Object ? value.type : value
    MSG_NOTIFY.message = value instanceof Object ? value.message : ''
    WS.send(MSG_NOTIFY)
  }
}

F.config['admin-tracking'] &&
  ON('visitor', function (obj) {
    if (WS) {
      MSG_NOTIFY.type = 'visitor'
      MSG_NOTIFY.message = obj
      WS.send(MSG_NOTIFY)
    }
  })

exports.install = function () {
  CORS('/api/*', ['get', 'post', 'put', 'delete'], true)

  // Routes are according to the sitemap
  //ROUTE('#admin', '=admin/index')

  ROUTE('#admin/api/upload/', upload, ['post', 'upload', 10000], 3084) // 3 MB
  ROUTE('#admin/api/upload/base64/', upload_base64, ['post', 10000], 2048) // 2 MB

  ROUTE('#admin/api/dashboard/', json_dashboard)
  ROUTE('#admin/api/dashboard/referrers/', json_dashboard_referrers)
  ROUTE('#admin/api/dashboard/online/', json_dashboard_online)

  // Internal
  ROUTE('#admin/api/dependencies/', ['*Settings --> dependencies'])

  // MODEL: /models/widgets.js
  ROUTE('#admin/api/widgets/', ['*Widget --> query'])
  ROUTE('#admin/api/widgets/{id}/', ['*Widget --> read'])
  ROUTE('#admin/api/widgets/', ['*Widget --> save', 'post'])
  ROUTE('#admin/api/widgets/', ['*Widget --> remove', 'delete'])
  ROUTE('#admin/api/widgets/{id}/editor/', ['*Widget --> editor'])
  ROUTE('#admin/api/widgets/dependencies/', ['*Widget --> dependencies'])
  ROUTE('#admin/api/widgets/{id}/settings/', json_widget_settings, ['*Widget'])
  ROUTE('#admin/api/widgets/{id}/backups/', json_backups)

  // MODEL: /models/widgets.js
  ROUTE('#admin/api/widgetsglobals/', ['*WidgetGlobals --> read'])
  ROUTE('#admin/api/widgetsglobals/', ['*WidgetGlobals --> save', 'post'], 30)

  // MODEL: /models/pages.js
  ROUTE('#admin/api/pages/', ['*Page --> query'])
  ROUTE('#admin/api/pages/{id}/', ['*Page --> read'])
  ROUTE('#admin/api/pages/', ['*Page --> save', 'post'])
  ROUTE('#admin/api/pages/', ['*Page --> remove', 'delete'])
  ROUTE('#admin/api/pages/stats/', ['*Page --> stats'])
  ROUTE('#admin/api/pages/{id}/stats/', ['*Page --> stats'])
  ROUTE('#admin/api/pages/{id}/backups/', json_backups)
  ROUTE('#admin/api/pages/preview/', view_pages_preview, ['json'], 512)
  ROUTE('#admin/api/pages/links/', json_pages_links)

  // MODEL: /models/pages.js
  ROUTE('#admin/api/pagesglobals/', ['*PageGlobals --> read'])
  ROUTE('#admin/api/pagesglobals/', ['*PageGlobals --> save', 'post'], 30)

  // MODEL: /models/posts.js
  ROUTE('#admin/api/posts/', ['*Post --> query'])
  ROUTE('#admin/api/posts/{id}/', ['*Post --> read'])
  ROUTE('#admin/api/posts/', ['*Post --> save', 'post'])
  ROUTE('#admin/api/posts/', ['*Post --> remove', 'delete'])
  ROUTE('#admin/api/posts/toggle/', ['*Post --> toggle'])
  ROUTE('#admin/api/posts/stats/', ['*Post --> stats'])
  ROUTE('#admin/api/posts/{id}/stats/', ['*Post --> stats'])
  ROUTE('#admin/api/posts/{id}/backups/', json_backups)

  // MODEL: /models/notices.js
  ROUTE('#admin/api/notices/', ['*Notice --> query'])
  ROUTE('#admin/api/notices/{id}/', ['*Notice --> read'])
  ROUTE('#admin/api/notices/', ['*Notice --> save', 'post'])
  ROUTE('#admin/api/notices/', ['*Notice --> remove', 'delete'])
  ROUTE('#admin/api/notices/toggle/', ['*Notice --> toggle'])
  ROUTE('#admin/api/notices/preview/', view_notices_preview, ['json'])

  // MODEL: /models/subscribers.js
  ROUTE('#admin/api/subscribers/', ['*Subscriber --> query'])
  ROUTE('#admin/api/subscribers/{id}/', ['*Subscriber --> read'])
  ROUTE('#admin/api/subscribers/', ['*Subscriber --> save', 'post'])
  ROUTE('#admin/api/subscribers/', ['*Subscriber --> remove', 'delete'])
  ROUTE('#admin/api/subscribers/stats/', ['*Subscriber --> stats'])
  ROUTE('#admin/api/subscribers/toggle/', ['*Subscriber --> toggle'])

  // MODEL: /models/newsletters.js
  ROUTE('#admin/api/newsletters/', ['*Newsletter --> query'])
  ROUTE('#admin/api/newsletters/{id}/', ['*Newsletter --> read'])
  ROUTE('#admin/api/newsletters/', ['*Newsletter --> save', 'post'])
  ROUTE('#admin/api/newsletters/', ['*Newsletter --> remove', 'delete'])
  ROUTE('#admin/api/newsletters/test/', ['*Newsletter --> test', 'post'])
  ROUTE('#admin/api/newsletters/toggle/', ['*Newsletter --> toggle'])
  ROUTE('#admin/api/newsletters/stats/', ['*Newsletter --> stats'])
  ROUTE('#admin/api/newsletters/{id}/stats/', ['*Newsletter --> stats'])
  ROUTE('#admin/api/newsletters/{id}/backups/', json_backups)
  ROUTE('#admin/api/newsletters/state/', json_newsletter_state)

  // MODEL: /models/navigations.js
  ROUTE('#admin/api/nav/{id}/', ['*Navigation --> read'])
  ROUTE('#admin/api/nav/', ['*Navigation --> save', 'post'])

  // MODEL: /models/settings.js
  ROUTE('#admin/api/settings/', ['*Settings --> read'])
  ROUTE('#admin/api/settings/', ['*Settings --> save', 'post'])

  // ESHOP
  // MODEL: /models/products.js
  ROUTE('#admin/api/products/', ['*Product --> query', 'cors', 30000])
  ROUTE('#admin/api/products/{id}/', ['*Product --> read', 'cors', 30000])
  ROUTE('#admin/api/products/', ['*Product --> save', 'post', 'cors', 30000])
  ROUTE('#admin/api/products/', ['*Product --> remove', 'delete', 'cors'])
  ROUTE('#admin/api/products/toggle/', ['*Product --> toggle'])
  ROUTE('#admin/api/products/dependencies/', ['*Product --> dependencies'])
  ROUTE('#admin/api/products/stats/', ['*Product --> stats'])
  ROUTE('#admin/api/products/{id}/stats/', ['*Product --> stats'])
  ROUTE('#admin/api/products/{id}/backups/', json_backups)
  ROUTE('#admin/api/products/category/', json_products_replace, ['*Product'])
  ROUTE('#admin/api/products/manufacturer/', json_products_replace, ['*Product'])
  ROUTE('#admin/api/products/import/', json_products_import, ['post'])
  ROUTE('#admin/api/products/export/', json_products_export, ['*Product'])

  // MODEL: /models/productsgroup.js
  ROUTE('#admin/api/products-group/', ['*ProductsGroup --> save', 'post', 'cors'])
  ROUTE('#admin/api/products-group/', ['*ProductsGroup --> query', 'cors'])
  ROUTE('#admin/api/products-group/{id}/', ['*ProductsGroup --> read', 'cors'])
  ROUTE('#admin/api/products-group/', ['*ProductsGroup --> remove', 'delete', 'cors'])

  // MODEL: /models/orders.js
  ROUTE('#admin/api/orders/', ['*Order --> query', 'cors'])
  ROUTE('#admin/api/orders/{id}/', ['*Order --> read', 'cors'])
  ROUTE('#admin/api/orders/', ['*Order --> save', 'post', 'cors'])
  ROUTE('#admin/api/orders/', ['*Order --> remove', 'delete'])
  ROUTE('#admin/api/orders/stats/', ['*Order --> stats'])
  ROUTE('#admin/api/orders/toggle/', ['*Order --> toggle'])
  ROUTE('#admin/api/orders/dependencies/', ['*Order --> dependencies'])
  ROUTE('#admin/api/orders/export/', json_orders_export, ['*Order'])

  // MODEL: /models/users.js
  ROUTE('#admin/api/users/', ['*User --> query'])
  ROUTE('#admin/api/users/{id}/', ['*User --> read'])
  ROUTE('#admin/api/users/', ['*User --> save', 'post'])
  ROUTE('#admin/api/users/', ['*User --> remove', 'delete'])
  ROUTE('#admin/api/users/stats/', ['*User --> stats'])
  ROUTE('#admin/api/users/{id}/stats/', ['*User --> stats'])

  // Files
  ROUTE('#admin/api/files/', ['*File --> query'])
  ROUTE('#admin/api/files/clear/', ['*File --> clear'])

  //banners
  // ROUTE('#admin/api/banner/', 					['*Banners --> query', 'get']);
  // ROUTE('#admin/api/banner/',  					['*Banners --> save','post']);
  // Other
  ROUTE('#admin/api/contactforms/stats/', ['*Contact --> stats'])

  // Websocket
  WEBSOCKET('#admin/live/', socket, ['json'])

  // Login
  ROUTE('/api/login/admin/', login, ['post'])

  //banners
  ROUTE('#admin/api/banner/', ['*Slider --> query', 'get', 'cors'])
  ROUTE('#admin/api/banner/', ['*Slider --> save', 'post', 'cors'])
  ROUTE('#admin/api/banner/', ['*Slider --> remove', 'delete', 'cors'])
  ROUTE('#admin/api/banner/{id}/', ['*Slider --> read', 'cors'])

  // media
  ROUTE('#admin/api/media/', ['*Media --> save', 'post', 'cors'])
  ROUTE('#admin/api/media/', ['*Media --> query', 'cors'])
  ROUTE('#admin/api/media/', ['*Media --> remove', 'delete', 'cors'])
  ROUTE('#admin/api/media/{id}/', ['*Media --> read', 'cors'])

  //homepage data
  ROUTE('#admin/api/homepage-data', homepageData, ['POST', 'cors', 10000])
  ROUTE('#admin/api/homepage-data', homepageGetData, ['cors', 10000])

  ROUTE('#admin/api/payment-link', createpaymentLink, ['POST', 'cors', 10000])
  ROUTE('#admin/api/payment-link/{id}', fetchPaymentLink, ['cors', 10000])
  ROUTE('#admin/api/order-notify', order_notify, ['POST', 'cors', 10000])
  ROUTE('#admin/api/otp-requests', getOtpRequests, ['cors', 10000])
  ROUTE('#admin/api/cart-details', getCartDetails, ['cors', 10000])
  ROUTE('#admin/api/product-stock-update', updateStock, ['post', 'cors', 10000])
  ROUTE('#admin/api/product-stock-fetch', fetchStock, ['post', 'cors', 100000])

  // update cart status
  ROUTE('#admin/api/update-cart-status', updateCartStatus, ['post', 'cors', 10000])

  // get notify user details
  ROUTE('#admin/api/notify-user', getNotifyUser, ['cors', 10000])

  // notify user
  ROUTE('#admin/api/notify-user', sendNotifyUser, ['post', 'cors', 10000])

  // offer details for category
  ROUTE('#admin/api/offers', saveOffers, ['POST', 'cors', 10000])
  ROUTE('#admin/api/offers', getOffers, ['cors', 10000])
  ROUTE('#admin/api/offers/{id}', deleteOffers, ['delete', 'cors', 10000])
  ROUTE('#admin/api/offers/{id}', getOffer, ['cors'])

  // coupon
  ROUTE('#admin/api/coupon', addCoupon, ['post', 'cors'])
  ROUTE('#admin/api/coupon', updateCoupon, ['put', 'cors'])
  ROUTE('#admin/api/coupon/{id}', deleteCoupon, ['delete', 'cors'])
  ROUTE('#admin/api/coupon', getCoupons, ['cors'])
  ROUTE('#admin/api/coupon/{id}', getCoupon, ['cors'])

  // cod dynamic
  ROUTE('#admin/api/cod', addCod, ['post', 'cors'])
  ROUTE('#admin/api/cod', getCod, ['cors'])

  // all products stock sync
  ROUTE('#admin/api/products-stock-sync', productsStockSync, ['cors'])

  // warehouse crud
  ROUTE('#admin/api/warehouse', addWarehouse, ['post', 'cors'])
  ROUTE('#admin/api/warehouse', updateWarehouse, ['put', 'cors'])
  ROUTE('#admin/api/warehouse', getWarehouses, ['cors'])
  ROUTE('#admin/api/warehouse/{id}', getWarehouse, ['cors'])
  ROUTE('#admin/api/warehouse/{id}', deleteWarehouse, ['delete', 'cors'])
  ROUTE('#admin/api/warehouse-cities', getWarehouseCities, ['cors'])
  ROUTE('#admin/api/warehouse-dropdown', getWarehousesDropDown, ['cors'])

  // api to allocate warehouses to  Inventory Manager and Office Manager.
  //ROUTE('#admin/api/warehouse-allocation', warehouseAllocation, ['POST','cors']);

  // warehouse stock updation
  ROUTE('#admin/api/warehouse-stock', addAndUpdateWarehouseStock, ['post', 'cors'])
  ROUTE('#admin/api/warehouse-stock', getAllWarehouseStock, ['cors'])
  ROUTE('#admin/api/warehouse-stock/{id}', getWarehouseStock, ['cors'])
  ROUTE('#admin/api/warehouse-stock/{id}', deleteWarehouseStock, ['delete', 'cors'])

  // api to get the stock of a product
  ROUTE('#admin/api/product-stock/{pid}/{wid}', getProductStock, ['cors'])

  //regular delivery apis
  ROUTE('#admin/api/delivery', saveAndUpdateDelivery, ['POST', 'cors', 10000])
  ROUTE('#admin/api/delivery', getDelivery, ['cors', 10000])

  // no rush delivery apis
  ROUTE('#admin/api/norush-delivery', saveAndUpdateNoRushDelivery, ['POST', 'cors', 10000])
  ROUTE('#admin/api/norush-delivery', getNoRushDelivery, ['cors', 10000])

  // cashbacks crud apis
  ROUTE('#admin/api/cashback', addAndUpdateCashback, ['post', 'cors'])
  ROUTE('#admin/api/cashback/{id}', deleteCashback, ['delete', 'cors'])
  ROUTE('#admin/api/cashback', getCashbacks, ['cors'])
  ROUTE('#admin/api/cashback/{id}', getCashback, ['cors'])

  // special events crud apis
  ROUTE('#admin/api/special-events', addAndUpdateSpecialEvents, ['post', 'cors'])
  ROUTE('#admin/api/special-events/{id}', deleteSpecialEvents, ['delete', 'cors'])
  ROUTE('#admin/api/special-events', getSpecialEvents, ['cors'])
  ROUTE('#admin/api/special-events/{id}', getSpecialEvent, ['cors'])

  // delivery charges api
  ROUTE('#admin/api/delivery-charges', saveAndUpdateDeliveryCharges, ['POST', 'cors', 10000])
  ROUTE('#admin/api/delivery-charges', getDeliveryCharges, ['cors', 10000])

  // api to get the cities dropdown
  ROUTE('#admin/api/cities', getCities, ['cors', 10000])

  // referral apis
  ROUTE('#admin/api/referral-cashback', saveAndUpdateReferralCashback, ['POST', 'cors', 10000])
  ROUTE('#admin/api/referral-cashback', getReferralCashback, ['cors', 10000])

  // grouping cashback apis
  ROUTE('#admin/api/grouping-cashback', saveAndUpdateGroupingCashback, ['POST', 'cors', 10000])
  ROUTE('#admin/api/grouping-cashback', getGroupingCashback, ['cors', 10000])

  // api to write menu json data
  ROUTE('#admin/api/menu-json', saveMenuJson, ['POST', 'cors'])
  ROUTE('#admin/api/menu-json', getMenuJson, ['cors'])

  // api to get the variats based on the product id
  ROUTE('#admin/api/product-variants', getProductVariant, ['cors', 10000])

  // api to configure the  paytm keys
  ROUTE('#admin/api/paytm-config', savePaytmConfig, ['POST', 'cors', 10000])
  ROUTE('#admin/api/paytm-config', getPaytmConfig, ['cors', 10000])


  // api to run the weekly cashbacks_emitter
  ROUTE('#admin/api/weekly-cashbacks', runWeeklyCashbacks, ['cors', 10000])

  // api to get the weekly cashbacks data
  ROUTE('#admin/api/get-weekly-cashbacks', getWeeklyCashbacks, ['cors', 10000])

  // api to store the picode and city in db
  ROUTE('#admin/api/pincode-city', addAndUpdatePincodeCity, ['POST', 'cors', 10000])

  // api to get  the single picode and city from db
  ROUTE('#admin/api/pincode-city/{id}', getPincodeCity, ['cors', 10000])

  // api to get  the all picode and city from db
  ROUTE('#admin/api/pincode-city', getAllPincodeCity, ['cors', 10000])

  // api to get the pincodes based on the city
  ROUTE('#admin/api/get-pincode-city', getPincodesByCity, ['POST', 'cors', 10000])

  // api to add city
  ROUTE('#admin/api/city', addCity, ['POST', 'cors', 10000])

  // api to get city
  ROUTE('#admin/api/city', getCity, ['cors', 10000])


  // api to add printer config
  ROUTE('#admin/api/printer-config', addPrinterConfig, ['POST', 'cors', 10000])

  // api to get printer config
  ROUTE('#admin/api/printer-config', getPrinterConfig, ['cors', 10000])


  // api to get calculate gst for order
  ROUTE('#admin/api/gst-calc', gstCalculation, ['POST', 'cors', 10000])

}

ON('controller', function (controller, name) {
  // console.log("ONNNNNN");
  if (name !== 'admin' || controller.url === '/api/login/admin/') return

  var ddos = DDOS[controller.ip]

  // 20 failed attempts
  // if (ddos > 20) {
  // 	controller.cancel();
  // 	controller.throw401();

  // 	return;
  // }

  var cookie = controller.cookie(F.config['admin-cookie'])
  console.log('controller.headers', controller.headers)
  var token = controller.headers['x-auth']
  var decoded = null
  var user = null

  // if ((cookie == null || !cookie.length) && token == null) {
  // 	console.log("COOKIE");
  // 	DDOS[controller.ip] = ddos ? ddos + 1 : 1;
  // 	controller.cancel();
  // 	controller.theme('admin');
  // 	controller.view('~login');
  // 	return;
  // }

  console.log('cookie', cookie, cookie.length)
  console.log('token', token)

  if (cookie != null && cookie.length != 0) {
    console.log('COOKIE')
    user = F.global.config.users[+cookie]
    if (user == null) {
      DDOS[controller.ip] = ddos ? ddos + 1 : 1
      controller.cancel()
      controller.theme('admin')
      controller.view('~login')
      return
    }

    // Roles
    if (
      !user.sa &&
      user.roles.length &&
      controller.url !== controller.sitemap_url('admin')
    ) {
      var cancel = true

      for (var i = 0, length = user.roles.length; i < length; i++) {
        var role = user.roles[i]
        if (controller.url.indexOf(role.toLowerCase()) !== -1) {
          cancel = false
          break
        }
      }

      // Allowed URL
      if (cancel) {
        for (var i = 0, length = ALLOW.length; i < length; i++) {
          if (controller.url.indexOf(ALLOW[i]) !== -1) {
            cancel = false
            break
          }
        }

        if (cancel) {
          controller.cancel()
          controller.throw401()
          return
        }
      }
    }

    // console.log("ADMIN-USER", user);
    controller.user = user
  } else if (token != null) {
    try {
      decoded = jwt.verify(token, JWT_SECRET_KEY)
      console.log("decoded-------", decoded);
      if (decoded != null) {
        user = decoded
        controller.user = user
      }
    } catch (err) {
      // err
      console.log('err', err)
      controller.cancel()
      controller.throw401()
    }
  } else {
    controller.cancel()
    controller.theme('admin')
    controller.view('~login')
    return
  }
})

ON('service', function (counter) {
  if (counter % 15 === 0) DDOS = {}
})

async function findDuplicatesCount(arr, key) {

  let arr2 = [];

  arr.forEach((x) => {
    // Checking if there is any object in arr2
    // which contains the key value
    if (arr2.some((val) => { return val[key] == x[key] })) {

      // If yes! then increase the occurrence by 1
      arr2.forEach((k) => {
        if (k[key] === x[key]) {
          //console.log("xxxxxxxxx", x)
          //console.log("k[key]",k[key],"x[key]",x[key],x["mrp"])
          k["qty"]++
          k["price"] += x["price"];
        }
      })

    } else if (x[key] == undefined || x[key] == null) {
      let a = {}
      a[key] = 0
      a["qty"] = 1
      a["price"] = x["price"];
      arr2.push(a);
    } else {
      // If not! Then create a new object initialize 
      // it with the present iteration key's value and 
      // set the occurrence to 1
      let a = {}
      a[key] = x[key]
      a["qty"] = 1
      a["price"] = x["price"];
      arr2.push(a);
    }
  })

  return arr2

}

async function gstCalculation() {
  var self = this;
  var orderId = self.body.orderId;
  var nosql = new Agent();

  // fetch order information
  nosql.select('getorder', 'orders').make(function (builder) {
    builder.where('id', orderId);
    builder.first();
  });
  var order = await nosql.promise('getorder');
  var data = await findDuplicatesCount(order.items, 'gst');

  var summary = {
    gst:0,
    qty:0,
    gstAmount:0,
    taxable:0,
    Sgst:0,
    Cgst:0,
    taxAmount:0
  };
  // Retail Price = Retail price inclusive of GST
  // GST Amount = (Retail Price * GST%)/100 + GST%
  // Taxable Amount = Retail Price - GST Amount

  //   Retail Price = 120, GST = 5%
  //  GST Amount = 120*5/(100 + 5)
  //  GST Amount = 5.71
  //  Taxable Amount = 120 - 5.71 = 114.29
  for (let i = 0; i < data.length; i++) {
    var element = data[i];
     console.log("========");
     console.log(element);
    element.gstAmount = parseFloat(((element.price * element.gst) / (100 + element.gst)).toFixed(2));
    element.taxable = element.price - element.gstAmount;
    element.Sgst = parseFloat((element.gstAmount / 2).toFixed(2));
    element.Cgst = parseFloat((element.gstAmount / 2).toFixed(2));
    element.taxAmount = parseFloat((element.Sgst + element.Cgst).toFixed(2));
    summary.gst += element.gst;
    summary.qty += element.qty;
    summary.gstAmount += element.gstAmount;
    summary.taxable += element.taxable;
    summary.Sgst += element.Sgst;
    summary.Cgst += element.Cgst;
    summary.taxAmount += element.taxAmount;

  }
  self.json({status:true , data:data, summary:summary});


}


// function to add printer config
async function addPrinterConfig() {
  var self = this
  var data = self.body
  var JOB_ID = generateUuidModule.createUUID()
  var nosql = new Agent()
  if (!data) {
    self.json({
      status: false,
      message: 'no data'
    })
  } else {
    // check if json is present in db
    nosql.select('getPrinter', 'configuration').make(function (builder) {
      builder.where('configurationName', 'Printer_Config')
      builder.first()
    })

    var getPrinter = await nosql.promise('getPrinter')
    if (getPrinter != null) {
      nosql.update('saveCity', 'configuration').make(function (builder) {
        builder.where('configurationName', 'Printer_Config')
        builder.set('configurationDetails', data)
      })
    } else {
      nosql.insert('savePrinter', 'configuration').make(function (builder) {
        builder.set('configurationName', 'Printer_Config')
        builder.set('configurationDetails', data)
      })
    }

    await nosql.promise('savePrinter')
    self.json({
      status: true,
      message: 'Saved Successfully'
    })

  }
}

// function to get printer config
async function getPrinterConfig() {
  var self = this
  var nosql = new Agent()
  nosql.select('getPrinter', 'configuration').make(function (builder) {
    builder.where('configurationName', 'Printer_Config')
    builder.first()
  })
  var getPrinter = await nosql.promise('getPrinter')
  var json = getPrinter.configurationDetails;
  //console.log("data",json)
  self.json(json)
}

// function to write data
async function addCity() {
  var self = this
  var data = self.body
  var JOB_ID = generateUuidModule.createUUID()
  var nosql = new Agent()
  if (!data) {
    self.json({
      status: false,
      message: 'no data'
    })
  } else {
    // check if json is present in db
    nosql.select('getCity', 'configuration').make(function (builder) {
      builder.where('configurationName', 'Cities_List')
      builder.first()
    })

    var getCity = await nosql.promise('getCity')
    if (getCity != null) {
      nosql.update('saveCity', 'configuration').make(function (builder) {
        builder.where('configurationName', 'Cities_List')
        builder.set('configurationDetails', data)
      })
    } else {
      nosql.insert('saveCity', 'configuration').make(function (builder) {
        builder.set('configurationName', 'Cities_List')
        builder.set('configurationDetails', data)
      })
    }

    await nosql.promise('saveCity')
    self.json({
      status: true,
      message: 'Saved Successfully'
    })

  }
}

// function to get data
async function getCity() {
  var self = this
  var nosql = new Agent()
  nosql.select('getCity', 'configuration').make(function (builder) {
    builder.where('configurationName', 'Cities_List')
    builder.first()
  })
  var getCity = await nosql.promise('getCity')
  var json = getCity.configurationDetails
  json.sort();
  //console.log("data",json)
  self.json(json)
}

//function to store the picode and city in db
async function addAndUpdatePincodeCity() {
  var self = this
  var model = self.body

  var isUpdate = !!model.id
  var nosql = new Agent()
  if (isUpdate) {
    model.dateupdated = new Date()
  } else {
    model.id = UID()
    model.datecreated = new Date()
    model.dateupdated = new Date()
  }
  if (isUpdate) {
    nosql.update('update', 'pincode_city').make(function (builder) {
      builder.set(model)
      builder.where('id', model.id)
    })

    var update = await nosql.promise('update')
    if (update > 0) {
      self.json({
        status: true,
        message: 'Updated Successfully',
        id: model.id
      })
    } else {
      self.json({
        status: false,
        message: 'Fail'
      })
    }
  } else {
    nosql.select('get', 'pincode_city').make(function (builder) {
      builder.where('city', model.city)
    })
    var get = await nosql.promise('get');
    if (get.length > 0) {
      return self.json({
        status: false,
        message: 'City Already Exists'
      })
    }
    nosql.insert('save', 'pincode_city').make(function (builder) {
      builder.set(model)
    })
    var save = await nosql.promise('save');
    console.log("save", save);
    if (save != null) {
      self.json({
        status: true,
        message: 'Success',
        id: model.id
      })
    } else {
      self.json({
        status: false,
        message: 'Fail'
      })
    }
  }
}

// function to get  the single picode and city from db
async function getPincodeCity() {
  var self = this;
  var nosql = new Agent();
  var opt = self.params;
  nosql.select('getPincodeCity', 'pincode_city').make(function (builder) {
    builder.where('id', opt.id);
    builder.first();
  })
  var getPincodeCity = await nosql.promise('getPincodeCity')
  if (getPincodeCity != null) {
    self.json({
      status: true,
      data: getPincodeCity
    })
  } else {
    self.json({
      status: false,
      message: "No data found"
    })
  }
}

// function to get the pincodes by city
async function getPincodesByCity() {
  var self = this;
  var nosql = new Agent();
  var opt = self.body;
  nosql.select('getPincodeCity', 'pincode_city').make(function (builder) {
    builder.where('city', opt.city);
    builder.first();
  })
  var getPincodeCity = await nosql.promise('getPincodeCity')
  if (getPincodeCity != null) {
    self.json({
      status: true,
      data: getPincodeCity
    })
  } else {
    self.json({
      status: false,
      message: "No data found"
    })
  }
}


// function to get all  picode and city from db
async function getAllPincodeCity() {
  var self = this;
  var nosql = new Agent();
  var opt = self.query;
  nosql.listing('getPincodeCity', 'pincode_city').make(function (builder) {
    builder.page(opt.page || 1, opt.limit || 10)
  })
  var getPincodeCity = await nosql.promise('getPincodeCity')
  if (getPincodeCity != null) {
    self.json({
      status: true,
      data: getPincodeCity
    })
  } else {
    self.json({
      status: false,
      message: "No data found"
    })
  }
}


// function to get the weekly cashback 
async function getWeeklyCashbacks() {
  var self = this;
  var nosql = new Agent();
  nosql.select('getCashbacks', 'group_orders').make(function (builder) {
    builder.sort('datecreated', 'desc')
  })
  var cashbacks = await nosql.promise('getCashbacks')
  if (cashbacks.length > 0) {
    self.json({
      status: true,
      data: cashbacks
    })
  } else {
    self.json({
      status: false,
      message: "No data found"
    })
  }
}

// function to run the weekly cashback 
async function runWeeklyCashbacks() {
  var self = this;
  weeklyCashbackEmmitter.emit('weekly-cashback');
  self.json({ status: true, message: "Cashbacks job initiated successfully" })
}


async function savePaytmConfig() {
  var self = this
  var data = self.body
  var nosql = new Agent()
  if (!data) {
    self.json({
      status: false,
      message: 'no data'
    })
  } else {
    // check if json is present in db
    nosql.select('getD', 'configuration').make(function (builder) {
      builder.where('configurationName', 'Paytm')
      builder.first()
    })

    var getD = await nosql.promise('getD')
    if (getD != null) {
      nosql.update('delivery', 'configuration').make(function (builder) {
        builder.where('configurationName', 'Paytm')
        builder.set('configurationDetails', data)
      })
    } else {
      nosql.insert('delivery', 'configuration').make(function (builder) {
        builder.set('configurationName', 'Paytm')
        builder.set('configurationDetails', data)
      })
    }

    var delivery = await nosql.promise('delivery')
    self.json({
      status: true,
      message: 'Saved Successfully'
    })
    console.log(
      'DELIVEY_CHARGES_SAVE_TRIGGERED',
      new Date().toISOString(),
      delivery
    )
  }
}

// function to get data
async function getPaytmConfig() {
  var self = this
  var nosql = new Agent()
  nosql.select('getData', 'configuration').make(function (builder) {
    builder.where('configurationName', 'Paytm')
    builder.first()
  })
  var getData = await nosql.promise('getData')
  var json = getData.configurationDetails
  //console.log("data",json)
  self.json({
    status: true,
    data: json
  })
}

// function to get the product variants
async function getProductVariant() {
  var self = this
  var nosql = new Agent()
  var opt = self.query
  nosql.select('getVariant', 'product').make(function (builder) {
    builder.where('id', opt.id)
    builder.first()
  })
  var getVariant = await nosql.promise('getVariant')
  var variants = getVariant.variant
  if (getVariant != null) {
    if (variants.length > 0) {
      self.json({
        status: true,
        data: variants
      })
    } else {
      self.json({
        status: false,
        message: 'Variants not yet added for this product'
      })
    }
  } else {
    self.json({
      status: false,
      message: 'Product not found'
    })
  }
}

// function to write menu json data
async function saveMenuJson() {
  var self = this
  var data = self.body
  var JOB_ID = generateUuidModule.createUUID()
  var nosql = new Agent()
  if (!data) {
    self.json({
      status: false,
      message: 'no data'
    })
  } else {
    // check if data is present in db
    nosql.select('getMenu', 'configuration').make(function (builder) {
      builder.where('configurationName', 'Menu_Json')
      builder.set('configurationDetails', data)
      builder.first()
    })
    var getMenu = await nosql.promise('getMenu')
    if (getMenu != null) {
      nosql.update('saveMenu', 'configuration').make(function (builder) {
        builder.where('configurationName', 'Menu_Json')
        builder.set('configurationDetails', data)
      })
    } else {
      nosql.insert('saveMenu', 'configuration').make(function (builder) {
        builder.set('configurationName', 'Menu_Json')
        builder.set('configurationDetails', data)
      })
    }

    var MenuData = await nosql.promise('saveMenu')
    self.json({
      status: true,
      message: 'Saved Successfully'
    })
    await menuPageCronJob()
    console.log(
      'MENU_JSON_SAVE_TRIGGERED',
      new Date().toISOString(),
      JOB_ID,
      MenuData
    )
  }
}

// function to get the menu json
async function getMenuJson() {
  var self = this
  var nosql = new Agent()
  nosql.select('getMenu', 'configuration').make(function (builder) {
    builder.where('configurationName', 'Menu_Json')
    builder.first()
  })
  var getMenu = await nosql.promise('getMenu')
  var json = getMenu.configurationDetails
  //console.log("data",json)
  self.json(json)
}

// referral cashback  apis
// function to write data
async function saveAndUpdateGroupingCashback() {
  var self = this
  var data = self.body
  var nosql = new Agent()
  if (!data) {
    self.json({
      status: false,
      message: 'no data'
    })
  } else {
    // check if data exixts in db
    nosql.select('getData', 'configuration').make(function (builder) {
      builder.where('configurationName', 'Grouping_Cashback')
      builder.first()
    })

    var getData = await nosql.promise('getData')
    if (getData != null) {
      nosql.update('Grouping', 'configuration').make(function (builder) {
        builder.where('configurationName', 'Grouping_Cashback')
        builder.set('configurationDetails', data)
      })
    } else {
      nosql.insert('Grouping', 'configuration').make(function (builder) {
        builder.set('configurationName', 'Grouping_Cashback')
        builder.set('configurationDetails', data)
      })
    }

    var Grouping = await nosql.promise('Grouping')
    self.json({
      status: true,
      message: 'Saved Successfully'
    })
    console.log(
      'Grouping_RAW_SAVE_TRIGGERED',
      new Date().toISOString(),
      Grouping
    )
  }
}

// function to get data
async function getGroupingCashback() {
  var self = this
  var nosql = new Agent()
  nosql.select('grouping', 'configuration').make(function (builder) {
    builder.where('configurationName', 'Grouping_Cashback')
    builder.first()
  })
  var grouping = await nosql.promise('grouping')
  var json = grouping.configurationDetails
  //console.log("data",json)
  self.json({
    status: true,
    data: json
  })
}

// referral cashback  apis
// function to write data
async function saveAndUpdateReferralCashback() {
  var self = this
  var data = self.body
  var nosql = new Agent()
  if (!data) {
    self.json({
      status: false,
      message: 'no data'
    })
  } else {
    // check if data exixts in db
    nosql.select('getData', 'configuration').make(function (builder) {
      builder.where('configurationName', 'Referral_Cashback')
      builder.first()
    })

    var getData = await nosql.promise('getData')
    if (getData != null) {
      nosql.update('referral', 'configuration').make(function (builder) {
        builder.where('configurationName', 'Referral_Cashback')
        builder.set('configurationDetails', data)
      })
    } else {
      nosql.insert('referral', 'configuration').make(function (builder) {
        builder.set('configurationName', 'Referral_Cashback')
        builder.set('configurationDetails', data)
      })
    }

    var referral = await nosql.promise('referral')
    self.json({
      status: true,
      message: 'Saved Successfully'
    })
    console.log(
      'REFERRAL_RAW_SAVE_TRIGGERED',
      new Date().toISOString(),
      referral
    )
  }
}

// function to get data
async function getReferralCashback() {
  var self = this
  var nosql = new Agent()
  nosql.select('referral', 'configuration').make(function (builder) {
    builder.where('configurationName', 'Referral_Cashback')
    builder.first()
  })
  var referral = await nosql.promise('referral')
  var json = referral.configurationDetails
  //console.log("data",json)
  self.json({
    status: true,
    data: json
  })
}

// function to get the cities list
function getCities() {
  var self = this
  var cities = indianCitiesDatabase.cities
  self.json(cities)
}

// delivery charges api
// function to write data
async function saveAndUpdateDeliveryCharges() {
  var self = this
  var data = self.body
  var nosql = new Agent()
  if (!data) {
    self.json({
      status: false,
      message: 'no data'
    })
  } else {
    // check if json is present in db
    nosql.select('getD', 'configuration').make(function (builder) {
      builder.where('configurationName', 'Delivery_Charges')
      builder.first()
    })

    var getD = await nosql.promise('getD')
    if (getD != null) {
      nosql.update('delivery', 'configuration').make(function (builder) {
        builder.where('configurationName', 'Delivery_Charges')
        builder.set('configurationDetails', data)
      })
    } else {
      nosql.insert('delivery', 'configuration').make(function (builder) {
        builder.set('configurationName', 'Delivery_Charges')
        builder.set('configurationDetails', data)
      })
    }

    var delivery = await nosql.promise('delivery')
    self.json({
      status: true,
      message: 'Saved Successfully'
    })
    console.log(
      'DELIVEY_CHARGES_SAVE_TRIGGERED',
      new Date().toISOString(),
      delivery
    )
  }
}

// function to get data
async function getDeliveryCharges() {
  var self = this
  var nosql = new Agent()
  nosql.select('delivery', 'configuration').make(function (builder) {
    builder.where('configurationName', 'Delivery_Charges')
    builder.first()
  })
  var delivery = await nosql.promise('delivery')
  var json = delivery.configurationDetails
  //console.log("data",json)
  self.json({
    status: true,
    data: json
  })
}

// special events

async function addAndUpdateSpecialEvents() {
  var self = this
  var model = self.body
  model.startDate = new Date(new Date(model.startDate).setUTCHours(0, 0, 0, 0));
  model.endDate = new Date(new Date(model.endDate).setUTCHours(23, 59, 59, 999));
  model.orderMiniAmount = parseInt(model.orderMiniAmount)
  if (model.offerMaxAmount) {
    model.offerMaxAmount = parseInt(model.offerMaxAmount)
  }
  if (model.offerPercentage) {
    model.offerPercentage = parseInt(model.offerPercentage)
  }
  var isUpdate = !!model.id
  var nosql = new Agent()
  if (isUpdate) {
    model.dateupdated = new Date()
  } else {
    model.id = UID()
    model.datecreated = new Date()
    model.dateupdated = new Date()
  }
  if (isUpdate) {
    nosql.update('update', 'special_events').make(function (builder) {
      builder.set(model)
      builder.where('id', model.id)
    })

    var update = await nosql.promise('update')
    if (update > 0) {
      self.json({
        status: true,
        message: 'Updated Successfully',
        id: model.id
      })
    } else {
      self.json({
        status: false,
        message: 'Fail'
      })
    }
  } else {
    nosql.insert('save', 'special_events').make(function (builder) {
      builder.set(model)
    })
    var save = await nosql.promise('save')
    if (save != null) {
      self.json({
        status: true,
        message: 'Success',
        id: model.id
      })
    } else {
      self.json({
        status: false,
        message: 'Fail'
      })
    }
  }
}

async function deleteSpecialEvents() {
  var self = this
  var opt = self.params
  var nosql = new Agent()

  nosql.remove('delete', 'special_events').make(function (builder) {
    builder.where('id', opt.id)
  })

  var deleteCoupon = await nosql.promise('delete')
  if (deleteCoupon > 0) {
    self.json({
      status: true,
      message: 'Special Event deleted Successfully'
    })
  } else {
    self.json({
      status: false
    })
  }
}

async function getSpecialEvents() {
  var self = this
  var opt = self.query
  var nosql = new Agent()

  nosql.listing('getAll', 'special_events').make(function (builder) {
    builder.page(opt.page || 1, opt.limit || 10)
  })

  var getAll = await nosql.promise('getAll')
  if (getAll != null) {
    self.json({
      status: true,
      message: 'Success',
      data: getAll
    })
  } else {
    self.json({
      status: false
    })
  }
}

async function getSpecialEvent() {
  var self = this
  var opt = self.params
  var nosql = new Agent()
  //console.log("id", opt);
  nosql.select('get', 'special_events').make(function (builder) {
    builder.where('id', opt.id)
    builder.first()
  })

  var get = await nosql.promise('get')
  if (get != null) {
    self.json({
      status: true,
      message: 'Success',
      data: get
    })
  } else {
    self.json({
      status: false
    })
  }
}

// cashbacks

async function addAndUpdateCashback() {
  var self = this
  var model = self.body
  model.datecreated = new Date()
  var isUpdate = !!model.id
  var nosql = new Agent()
  if (isUpdate) {
    model.dateupdated = new Date()
  } else {
    model.id = UID()
    model.datecreated = new Date()
    model.dateupdated = new Date()
  }
  if (isUpdate) {
    nosql.update('updateCashback', 'cashback').make(function (builder) {
      builder.set(model)
      builder.where('id', model.id)
    })

    var updateCashback = await nosql.promise('updateCashback')
    if (updateCashback > 0) {
      self.json({
        status: true,
        message: 'Updated Successfully',
        id: model.id
      })
    } else {
      self.json({
        status: false,
        message: 'Fail'
      })
    }
  } else {
    nosql.insert('saveCashback', 'cashback').make(function (builder) {
      builder.set(model)
    })
    var saveCashback = await nosql.promise('saveCashback')
    if (saveCashback != null) {
      self.json({
        status: true,
        message: 'Success',
        id: model.id
      })
    } else {
      self.json({
        status: false,
        message: 'Fail'
      })
    }
  }
}

async function deleteCashback() {
  var self = this
  var couponInfo = self.params
  var nosql = new Agent()

  nosql.remove('deleteCoupon', 'cashback').make(function (builder) {
    builder.where('id', couponInfo.id)
  })

  var deleteCoupon = await nosql.promise('deleteCoupon')
  if (deleteCoupon > 0) {
    self.json({
      status: true,
      message: 'Cashback deleted Successfully'
    })
  } else {
    self.json({
      status: false
    })
  }
}

async function getCashbacks() {
  var self = this
  var opt = self.query
  var nosql = new Agent()

  nosql.listing('getCoupon', 'cashback').make(function (builder) {
    builder.page(opt.page || 1, opt.limit || 10)
  })

  var getCoupon = await nosql.promise('getCoupon')
  if (getCoupon != null) {
    self.json({
      status: true,
      message: 'Success',
      data: getCoupon
    })
  } else {
    self.json({
      status: false
    })
  }
}

async function getCashback() {
  var self = this
  var opt = self.params
  var nosql = new Agent()
  //console.log("id", opt);
  nosql.select('getCoupon', 'cashback').make(function (builder) {
    builder.where('id', opt.id)
    builder.first()
  })

  var getCoupon = await nosql.promise('getCoupon')
  if (getCoupon != null) {
    self.json({
      status: true,
      message: 'Success',
      data: getCoupon
    })
  } else {
    self.json({
      status: false
    })
  }
}

// no rush delivery  apis
// function to write data
async function saveAndUpdateNoRushDelivery() {
  var self = this
  var data = self.body
  var nosql = new Agent()
  if (!data) {
    self.json({
      status: false,
      message: 'no data'
    })
  } else {
    nosql.update('delivery', 'configuration').make(function (builder) {
      builder.where('configurationName', 'No_Rush_Delivery')
      builder.set('configurationDetails', data)
    })
    var delivery = await nosql.promise('delivery')
    self.json({
      status: true,
      message: 'Saved Successfully'
    })
    console.log(
      'DELIVEY_RAW_SAVE_TRIGGERED',
      new Date().toISOString(),
      delivery
    )
  }
}

// function to get data
async function getNoRushDelivery() {
  var self = this
  var nosql = new Agent()
  nosql.select('delivery', 'configuration').make(function (builder) {
    builder.where('configurationName', 'No_Rush_Delivery')
    builder.first()
  })
  var delivery = await nosql.promise('delivery')
  var json = delivery.configurationDetails
  //console.log("data",json)
  self.json({
    status: true,
    data: json
  })
}

// delivery  apis
// function to write data
async function saveAndUpdateDelivery() {
  var self = this
  var data = self.body
  var nosql = new Agent()
  if (!data) {
    self.json({
      status: false,
      message: 'no data'
    })
  } else {
    nosql.update('delivery', 'configuration').make(function (builder) {
      builder.where('configurationName', 'Delivery')
      builder.set('configurationDetails', data)
    })
    var delivery = await nosql.promise('delivery')
    self.json({
      status: true,
      message: 'Saved Successfully'
    })
    console.log(
      'DELIVEY_RAW_SAVE_TRIGGERED',
      new Date().toISOString(),
      delivery
    )
  }
}

// function to get data
async function getDelivery() {
  var self = this
  var nosql = new Agent()
  nosql.select('delivery', 'configuration').make(function (builder) {
    builder.where('configurationName', 'Delivery')
    builder.first()
  })
  var delivery = await nosql.promise('delivery')
  var json = delivery.configurationDetails
  //console.log("data",json)
  self.json({
    status: true,
    data: json
  })
}

async function saveStockTracking(trackObj) {
  var nosql = new Agent()
  nosql.insert('saveTrack', 'stock_tracking').make(function (builder) {
    builder.set({
      trackid: trackObj.trackid,
      type: trackObj.type,
      qauntity: trackObj.quantity,
      notes: trackObj.notes,
      datecreated: new Date()
    })
  })
  var saveTrack = await nosql.promise('saveTrack')
}

// function to get the variants for the product
async function getProductVariants(id) {
  var nosql = new Agent()
  nosql.select('getProductVariant', 'product').make(function (builder) {
    builder.where('id', id)
    builder.fields('variant', 'name')
    builder.first()
  })
  var getProductVariant = await nosql.promise('getProductVariant')
  return getProductVariant
}

// function to get the product stock based on product id and warehouse id
async function getProductStock() {
  var self = this
  var opt = self.params
  var nosql = new Agent()
  nosql.select('getStock', 'warehouse_stock').make(function (builder) {
    builder.where('product_id', opt.pid)
    builder.and()
    builder.where('warehouse_id', opt.wid)
    builder.sort('datecreated', 'desc')
  })
  var getStock = await nosql.promise('getStock')
  // get variant names for the product
  var variants = await getProductVariants(opt.pid)
  //console.log("variants", variants);

  var variantsArr = []
  if (variants != null) {
    if (variants.variant.length > 0) {
      for (let i = 0; i < variants.variant.length; i++) {
        const element = variants.variant[i]
        var variantObj = {
          variantName: element.title,
          vid: element.id,
          productName: variants.name,
          prices: variants.variant[i].prices,
          stock: 0,
          stockObj: {
            stock: 0,
            notes: '',
            status: true
          }
        }
        variantsArr.push(variantObj)
      }
      //console.log("getStock", getStock);
      if (getStock.length > 0) {
        //console.log("IF STOCK PRESENT-------------")
        for (var i = 0; i < variants.variant.length; i++) {
          var each = variants.variant[i]
          console.log('each', each.title, each.id)
          getStock.forEach(element => {
            if (each.id == element.variant_id) {
              console.log('element', element.stock)
              if (!element.stockObj) {
                each.stockObj = {
                  stock: 0,
                  notes: '',
                  status: true
                }
              }
              each.variantName = each.title
              each.vid = each.id
              each.stock = element.stock
              each.productName = variants.name

              //console.log("stock",stock);
            } else {
              console.log('elseeeeeeeeeeeeeeeeeeeeeeeee')
              each.variantName = each.title
              each.vid = each.id
              // each.stock = 0;
              each.productName = variants.name
              each.stockObj = {
                stock: 0,
                notes: '',
                status: true
              }
            }
          })
        }
        self.json({
          status: true,
          data: variants.variant
        })
      } else {
        //console.log("IF NO STOCK-------------");
        //console.log("variantsArr",variantsArr)
        self.json({
          status: true,
          data: variantsArr
        })
      }
    } else {
      return self.json({ status: false, message: 'No Variant found' })
    }
  } else {
    return self.json({ status: false, message: 'No Variant found' })
  }
}

// warehouse stock apis

// add and update warehouse-stock
async function addAndUpdateWarehouseStock() {
  var self = this
  var model = self.body
  model.datecreated = new Date()
  //var isUpdate = !!model.variant_id;
  var nosql = new Agent()
  var trackStock = parseInt(model.stock)
  //console.log("trackStock", trackStock);
  var stock = parseInt(model.stock)

  model.stock = stock
  //if (isUpdate) {
  // get the existing stock
  console.log('model', model)
  nosql.select('getstock', 'warehouse_stock').make(function (builder) {
    builder.where('variant_id', model.variant_id)
    builder.and()
    builder.where('warehouse_id', model.warehouse_id)
    builder.and()
    builder.where('product_id', model.product_id)
    builder.first()
  })

  var getstock = await nosql.promise('getstock')
  if (getstock != null) {
    // update  stock
    var previousStock = getstock.stock
    var newStock = previousStock + model.stock
    if (newStock > 0) {
      model.stock = newStock
    } else {
      model.stock = 0
    }
    model.dateupdated = new Date()

    //console.log("UPDATE model", model);
    nosql.update('updateWarehouse', 'warehouse_stock').make(function (builder) {
      builder.set(model)
      builder.where('variant_id', model.variant_id)
      builder.and()
      builder.where('warehouse_id', model.warehouse_id)
      builder.and()
      builder.where('product_id', model.product_id)
    })

    var updateWarehouse = await nosql.promise('updateWarehouse')
    if (updateWarehouse > 0) {
      // save data into the transaction tracking table
      var trackObj = {
        trackid:
          model.warehouse_id + '/' + model.product_id + '/' + model.variant_id,
        type: 'admin',
        quantity: trackStock,
        notes: model.notes || ''
      }
      //console.log("trackObj", trackObj);
      await saveStockTracking(trackObj)
      self.json({
        status: true,
        message: 'Success',
        id: model.id
      })
    } else {
      self.json({
        status: false,
        message: 'Fail'
      })
    }
  } else {
    // add stock
    model.id = UID()
    model.datecreated = new Date()
    model.dateupdated = new Date()
    model.sold_stock = 0;
    //console.log("ADD model", model);
    nosql.insert('saveWarehouse', 'warehouse_stock').make(function (builder) {
      builder.set(model)
    })
    var saveWarehouse = await nosql.promise('saveWarehouse')
    if (saveWarehouse != null) {
      var trackObj = {
        trackid:
          model.warehouse_id + '/' + model.product_id + '/' + model.variant_id,
        type: 'admin',
        quantity: trackStock,
        notes: model.notes || ''
      }
      await saveStockTracking(trackObj)
      self.json({
        status: true,
        message: 'Success',
        id: model.id
      })
    } else {
      self.json({
        status: false,
        message: 'Fail'
      })
    }
  }
}

// get all warehouses-stock
async function getAllWarehouseStock() {
  var self = this
  var opt = self.query
  var nosql = new Agent()
  //console.log("opt", opt);
  var decoded = self.user.userData;
  if (opt.wid && opt.pid && opt.vid) {
    var trackid = opt.wid + '/' + opt.pid + '/' + opt.vid

    nosql.listing('getWarehouse', 'stock_tracking').make(function (builder) {
      builder.where('trackid', trackid);
      builder.sort('datecreated', 'desc');
      builder.page(opt.page || 1, opt.limit || 10);
    })
    var getWarehouse = await nosql.promise('getWarehouse')
    //console.log("getWarehouse", getWarehouse);
    if (getWarehouse != null) {
      self.json({
        status: true,
        data: getWarehouse
      })
    } else {
      self.json({
        status: false
      })
    }
  } else {
    self.json({
      status: false,
      message: 'Missing params'
    })
  }
}

// delete warehouses-stock
async function deleteWarehouseStock() {
  var self = this
  var WarehouseInfo = self.params
  var nosql = new Agent()

  nosql.remove('deleteWarehouse', 'warehouse_stock').make(function (builder) {
    builder.where('id', WarehouseInfo.id)
  })

  var deleteWarehouse = await nosql.promise('deleteWarehouse')
  console.log('deleteWarehouse', deleteWarehouse)
  if (deleteWarehouse > 0) {
    self.json({
      status: true,
      message: 'Warehouse deleted Successfully'
    })
  } else {
    self.json({
      status: false
    })
  }
}

// get warehouse-stock by id
async function getWarehouseStock() {
  var self = this
  var opt = self.params
  var nosql = new Agent()
  //console.log("id", opt);
  nosql.select('getWarehouse', 'warehouse_stock').make(function (builder) {
    builder.where('id', opt.id)
    builder.first()
  })

  var getWarehouse = await nosql.promise('getWarehouse')
  if (getWarehouse != null) {
    self.json({
      status: true,
      message: 'Success',
      data: getWarehouse
    })
  } else {
    self.json({
      status: false
    })
  }
}

// warehouse crud functions

// function to find the available pincodes from pincodes table
async function checkAvailablePincodes(pincodes) {
  //console.log("pincodes", pincodes, pincodes.length);
  var nosql = new Agent()
  var result = []

  for (let i = 0; i < pincodes.length; i++) {
    const element = pincodes[i]
    console.log('element', element)
    nosql.select('getpincodes', 'pincodes').make(function (builder) {
      builder.where('pincode', element)
      builder.first()
    })

    var getpincodes = await nosql.promise('getpincodes')
    //console.log("getpincodes", getpincodes);
    if (getpincodes != null) {
      if (getpincodes.wid != 'notAllocated') {
        var obj = {}
        obj.pincode = element
        obj.wid = getpincodes.wid
        // get the warehouse name
        nosql.select('getwarehouse', 'warehouse').make(function (builder) {
          builder.where('id', obj.wid)
          builder.first()
        })
        var getwarehouse = await nosql.promise('getwarehouse')

        obj.message = `${obj.pincode} is already used in ${getwarehouse.name}`
        obj.msg = 'pincode already used'
        //console.log("onj", obj);
        result.push(obj)
      } else {
        var obj1 = {}
        obj1.pincode = element
        obj1.wid = 'notAvailable'
        obj1.message = 'pincode valid'
        //console.log("onj", obj1);
        result.push(obj1)
      }
    } else {
      var obj2 = {}
      obj2.pincode = element
      obj2.wid = 'notAvailable'
      obj2.message = 'pincode invalid'
      //console.log("onj", obj2);
      result.push(obj2)
    }
  }
  return result
}

// function to save the warehouse id in the pincode table
async function saveWarehouseIdInPincode(wid, pincodes) {
  var nosql = new Agent()
  for (let i = 0; i < pincodes.length; i++) {
    const element = pincodes[i]
    nosql.update('saveWarehouse', 'pincodes').make(function (builder) {
      builder.where('pincode', element)
      builder.set('wid', wid)
    })
    var saveWarehouse = await nosql.promise('saveWarehouse')
  }
}

// function to delete  the pincodes from warehouse
async function deleteWarehousePincodes(pincodes) {
  var nosql = new Agent()
  if (pincodes.length == 0) {
    return {
      status: false,
      message: 'Pincode Empty'
    }
  }
  for (let i = 0; i < pincodes.length; i++) {
    const element = pincodes[i]
    nosql.update('saveWarehouse', 'pincodes').make(function (builder) {
      builder.where('pincode', element)
      builder.set('wid', 'notAllocated')
    })
    var saveWarehouse = await nosql.promise('saveWarehouse')
  }
  return {
    status: true,
    message: 'Update Success'
  }
}

// dunction to add pincodes to the warehoy=use
async function addWarehousePincodes(pincodes, wid) {
  var nosql = new Agent()
  console.log('addPincodes', pincodes)
  if (pincodes.length == 0) {
    return self.json({
      status: false,
      message: 'Pincode Empty'
    })
  }
  var nosql = new Agent()
  var data = await checkAvailablePincodes(pincodes)
  console.log('data', data)
  var invalidPincodes = []
  var pincodeUsed = []
  data.map(element => {
    if (element.message == 'pincode invalid') {
      invalidPincodes.push(element)
    }
    if (element.msg == 'pincode already used') {
      pincodeUsed.push(element)
    }
  })
  if (invalidPincodes.length > 0) {
    return {
      status: false,
      data: invalidPincodes,
      message: 'Please enter valid pincodes'
    }
  }

  if (pincodeUsed.length > 0) {
    return {
      status: false,
      data: pincodeUsed,
      message: 'The given pincodes already used'
    }
  }
  for (let i = 0; i < pincodes.length; i++) {
    const element = pincodes[i]
    nosql.update('saveWarehouse', 'pincodes').make(function (builder) {
      builder.where('pincode', element)
      builder.set('wid', wid)
    })
    var saveWarehouse = await nosql.promise('saveWarehouse')
  }
  return {
    status: true,
    message: 'Add Success'
  }
}

// add and update warehouse api
async function addWarehouse() {
  var self = this
  var model = self.body
  var nosql = new Agent()
  var decoded = self.user.userData;

  model.id = UID()
  model.wid = model.id;
  model.datecreated = new Date()
  model.dateupdated = new Date()
  model.createdby = decoded.name
  model.pincode = model.pincode.split(',')
  for (let i = 0; i < model.pincode.length; i++) {
    model.pincode[i] = model.pincode[i].trim()
  }
  var data = await checkAvailablePincodes(model.pincode)
  console.log('data', data)
  var invalidPincodes = []
  var pincodeUsed = []
  data.map(element => {
    if (element.message == 'pincode invalid') {
      invalidPincodes.push(element)
    }
    if (element.msg == 'pincode already used') {
      pincodeUsed.push(element)
    }
  })
  if (invalidPincodes.length > 0) {
    return self.json({
      status: false,
      data: invalidPincodes,
      message: 'Please enter valid pincodes'
    })
  }

  if (pincodeUsed.length > 0) {
    return self.json({
      status: false,
      data: pincodeUsed,
      message: 'The given pincodes already used'
    })
  }
  nosql.insert('saveWarehouse', 'warehouse').make(function (builder) {
    builder.set(model)
  })
  var saveWarehouse = await nosql.promise('saveWarehouse')
  if (saveWarehouse != null) {
    self.json({
      status: true,
      message: 'Success',
      id: model.id
    })
    await saveWarehouseIdInPincode(model.id, model.pincode)
  } else {
    self.json({
      status: false,
      message: 'Fail'
    })
  }
}

// add and update warehouse api
async function updateWarehouse() {
  var self = this
  var model = self.body
  var decoded = self.user.userData;
  var nosql = new Agent()
  model.dateupdated = new Date()
  model.updatedby = decoded.name
  console.log('model', model)
  // function to update the pincode warehouse status in pincode table
  if (model.delPincodes.length > 0) {
    var delres = await deleteWarehousePincodes(model.delPincodes)
  }

  // function to update the pincode warehouse status in pincode table
  if (model.addPincodes.length > 0) {
    var addres = await addWarehousePincodes(model.addPincodes, model.wid)
    if (addres.status == false) {
      return self.json(addres)
    }
  }

  nosql.update('updateWarehouse', 'warehouse').make(function (builder) {
    builder.set(model)
    builder.where('id', model.id)
  })

  var updateWarehouse = await nosql.promise('updateWarehouse')
  if (updateWarehouse > 0) {
    self.json({
      status: true,
      message: 'Update Success'
    })
  } else {
    self.json({
      status: false,
      message: 'Fail'
    })
  }
}

// get all warehouses
async function getWarehouses() {
  var self = this
  var opt = self.query
  var nosql = new Agent()
  var decoded = self.user.userData;
  //var decoded = self.controller.user.userData;
  //console.log("decoded", self.user.userData);
  if (decoded.role != 'admin') {
    var warehouseArr = [];
    for (let i = 0; i < decoded.warehouse_ids.length; i++) {
      var wid = decoded.warehouse_ids[i];
      nosql.listing('getWarehouse', 'warehouse').make(function (builder) {
        builder.where('wid', wid);
        builder.page(opt.page || 1, opt.limit || 1000);
        builder.sort('datecreated', 'desc');
      })

      var getWarehouse = await nosql.promise('getWarehouse');

      warehouseArr.push(getWarehouse.items[0]);
    }

    if (getWarehouse != null) {
      getWarehouse.items = warehouseArr;
      getWarehouse.items.sort((a, b) => a.name.localeCompare(b.name))
      self.json({
        status: true,
        data: getWarehouse
      })
    } else {
      self.json({
        status: false
      })
    }

  } else {
    nosql.listing('getWarehouse', 'warehouse').make(function (builder) {
      builder.page(opt.page || 1, opt.limit || 1000)
      builder.sort('datecreated', 'desc')
    })

    var getWarehouse = await nosql.promise('getWarehouse');

    //console.log("getWarehouse", getWarehouse);
    if (getWarehouse != null) {
      getWarehouse.items.sort((a, b) => a.name.localeCompare(b.name))
      self.json({
        status: true,
        data: getWarehouse
      })
    } else {
      self.json({
        status: false
      })
    }
  }


}

// get all warehouses Dropdown
async function getWarehousesDropDown() {
  var self = this
  var opt = self.query
  var nosql = new Agent()
  var decoded = self.user.userData;
  //var decoded = self.controller.user.userData;

  //console.log("decoded", self.user.userData);
  if (decoded.role != 'admin') {
    for (let i = 0; i < decoded.warehouse_ids.length; i++) {
      var wid = decoded.warehouse_ids[i];
      nosql.select('getWarehouse', 'warehouse').make(function (builder) {
        builder.where('wid', wid);
        builder.sort('datecreated', 'desc');
      })
    }
  } else {
    nosql.select('getWarehouse', 'warehouse').make(function (builder) {
      builder.sort('datecreated', 'desc')
    })
  }

  var getWarehouse = await nosql.promise('getWarehouse');
  if (getWarehouse.length > 0) {
    for (let i = 0; i < getWarehouse.length; i++) {
      var element = getWarehouse[i];
      element.itemName = element.name;

    }
  }
  //console.log("getWarehouse", getWarehouse);
  if (getWarehouse != null) {
    self.json({
      status: true,
      data: getWarehouse
    })
  } else {
    self.json({
      status: false
    })
  }
}


// delete warehouses
async function deleteWarehouse() {
  var self = this
  var WarehouseInfo = self.params
  var nosql = new Agent()
  var pincodes = []
  // get pincode data
  nosql.select('getWarehouse', 'warehouse').make(function (builder) {
    builder.where('id', WarehouseInfo.id)
    builder.first()
  })

  var getWarehouse = await nosql.promise('getWarehouse')
  pincodes = getWarehouse.pincodes
  nosql.remove('deleteWarehouse', 'warehouse').make(function (builder) {
    builder.where('id', WarehouseInfo.id)
  })

  var deleteWarehouse = await nosql.promise('deleteWarehouse')
  console.log('deleteWarehouse', deleteWarehouse)
  if (deleteWarehouse > 0) {
    self.json({
      status: true,
      message: 'Warehouse deleted Successfully'
    })
    if (pincodes.length > 0) {
      for (let i = 0; i < pincodes.length; i++) {
        const element = pincodes[i]
        nosql.update('saveWarehouse', 'pincodes').make(function (builder) {
          builder.where('pincode', element)
          builder.set('wid', 'notAllocated')
        })
        var saveWarehouse = await nosql.promise('saveWarehouse')
      }
    }
  } else {
    self.json({
      status: false
    })
  }
}

// get warehouse by id
async function getWarehouse() {
  var self = this
  var opt = self.params
  var nosql = new Agent()
  //console.log("id", opt);
  nosql.select('getWarehouse', 'warehouse').make(function (builder) {
    builder.where('id', opt.id)
    builder.first()
  })

  var getWarehouse = await nosql.promise('getWarehouse')
  if (getWarehouse != null) {
    self.json({
      status: true,
      message: 'Success',
      data: getWarehouse
    })
  } else {
    self.json({
      status: false
    })
  }
}

// function to get the warehouses cities
function getWarehouseCities() {
  var self = this
  const client = new MongoClient(MONGO_DB_CONNECTION, { useNewUrlParser: true })
  client.connect(function (err, C) {
    assert.equal(null, err)
    const db = C.db(DB_NAME)

    const collection = db.collection('warehouse')
    collection
      .aggregate([
        {
          $group: {
            _id: {
              city: '$city'
            }
          }
        },
        {
          $project: {
            city: '$_id.city',
            _id: 0
          }
        }
      ])
      .toArray(function (err, result) {
        console.log('err', err, result)
        C.close()
        self.json(result)
      })
  })
}

// function to update all the products stock
async function productsStockSync() {
  var self = this
  self.json({
    status: true,
    message: 'Products Stock Syncing started'
  })

  stockSyncEmitter.emit('stock')
}

// cod dynamic
async function addCod() {
  var self = this
  var data = self.body
  var JOB_ID = generateUuidModule.createUUID()
  var nosql = new Agent()
  if (!data) {
    self.json({
      status: false,
      message: 'no data'
    })
  } else {
    nosql.update('saveCod', 'configuration').make(function (builder) {
      builder.where('configurationName', 'COD')
      builder.set('configurationDetails', data)
    })
    var saveCod = await nosql.promise('saveCod')
    if (saveCod != null) {
      self.json({
        status: true,
        message: 'Saved Successfully'
      })
    } else {
      self.json({
        status: false
      })
    }

    console.log('COD_SAVE_TRIGGERED', new Date().toISOString(), JOB_ID, saveCod)
  }
}

async function getCod() {
  var self = this
  var nosql = new Agent()
  nosql.select('getCod', 'configuration').make(function (builder) {
    builder.where('configurationName', 'COD')
    builder.first()
  })
  var getCod = await nosql.promise('getCod')
  var json = getCod.configurationDetails
  //console.log("data",json)
  if (json != null) {
    self.json({
      status: true,
      message: 'Success',
      data: json
    })
  } else {
    self.json({
      status: false
    })
  }
}

// coupon

async function addCoupon() {
  var self = this
  var couponInfo = self.body
  var nosql = new Agent()
  couponInfo.id = UID()
  couponInfo.datecreated = new Date()
  couponInfo.startDate = new Date(couponInfo.startDate)
  couponInfo.endDate = new Date(couponInfo.endDate)
  couponInfo.orderMiniAmount = parseInt(couponInfo.orderMiniAmount)
  couponInfo.offerMaxAmount = parseInt(couponInfo.offerMaxAmount)
  nosql.insert('addCoupon', 'coupon').make(function (builder) {
    builder.set(couponInfo)
  })

  var addCoupon = await nosql.promise('addCoupon')
  if (addCoupon != null) {
    self.json({
      status: true,
      message: 'Coupon Saved Successfully'
    })
  } else {
    self.json({
      status: false
    })
  }
}

async function updateCoupon() {
  var self = this
  var couponInfo = self.body
  var nosql = new Agent()
  couponInfo.dateupdated = new Date()
  couponInfo.startDate = new Date(couponInfo.startDate)
  couponInfo.endDate = new Date(couponInfo.endDate)

  nosql.update('updateCoupon', 'coupon').make(function (builder) {
    builder.set(couponInfo)
    builder.where('id', couponInfo.id)
  })

  var updateCoupon = await nosql.promise('updateCoupon')
  if (updateCoupon > 0) {
    self.json({
      status: true,
      message: 'Coupon Updated Successfully'
    })
  } else {
    self.json({
      status: false
    })
  }
}

async function deleteCoupon() {
  var self = this
  var couponInfo = self.params
  var nosql = new Agent()

  nosql.remove('deleteCoupon', 'coupon').make(function (builder) {
    builder.where('id', couponInfo.id)
  })

  var deleteCoupon = await nosql.promise('deleteCoupon')
  if (deleteCoupon > 0) {
    self.json({
      status: true,
      message: 'Coupon deleted Successfully'
    })
  } else {
    self.json({
      status: false
    })
  }
}

async function getCoupons() {
  var self = this
  var opt = self.query
  var nosql = new Agent()

  nosql.listing('getCoupon', 'coupon').make(function (builder) {
    builder.page(opt.page || 1, opt.limit || 10)
  })

  var getCoupon = await nosql.promise('getCoupon')
  if (getCoupon != null) {
    self.json({
      status: true,
      message: 'Success',
      data: getCoupon
    })
  } else {
    self.json({
      status: false
    })
  }
}

async function getCoupon() {
  var self = this
  var opt = self.params
  var nosql = new Agent()
  //console.log("id", opt);
  nosql.select('getCoupon', 'coupon').make(function (builder) {
    builder.where('id', opt.id)
    builder.first()
  })

  var getCoupon = await nosql.promise('getCoupon')
  if (getCoupon != null) {
    self.json({
      status: true,
      message: 'Success',
      data: getCoupon
    })
  } else {
    self.json({
      status: false
    })
  }
}

// offer details for category

async function saveOffers() {
  var self = this
  var model = self.body
  model.datecreated = new Date()
  var isUpdate = !!model.id
  var nosql = new Agent()
  if (isUpdate) {
    model.dateupdated = new Date()
  } else {
    model.id = UID()
    model.datecreated = new Date()
    model.dateupdated = new Date()
  }
  if (isUpdate) {
    nosql.update('updateOffer', 'product_offer').make(function (builder) {
      builder.set(model)
      builder.where('id', model.id)
    })

    var updateOffer = await nosql.promise('updateOffer')
    if (updateOffer > 0) {
      self.json({
        status: true,
        message: 'Success'
      })
    } else {
      self.json({
        status: false,
        message: 'Fail'
      })
    }
  } else {
    nosql.insert('saveOffer', 'product_offer').make(function (builder) {
      builder.set(model)
    })
    var saveOffer = await nosql.promise('saveOffer')
    if (saveOffer != null) {
      self.json({
        status: true,
        message: 'Success'
      })
    } else {
      self.json({
        status: false,
        message: 'Fail'
      })
    }
  }
}

async function getOffers() {
  var self = this
  var opt = self.query
  var nosql = new Agent()
  nosql.select('getOffer', 'product_offer').make(function (builder) {
    builder.page(opt.page || 1, opt.limit || 10)
    builder.sort('datecreated', 'desc')
  })
  var getOffer = await nosql.promise('getOffer')
  //console.log("getOffer", getOffer);
  if (getOffer != null) {
    self.json({
      status: true,
      data: getOffer
    })
  } else {
    self.json({
      status: false
    })
  }
}

async function deleteOffers() {
  var self = this
  var offerInfo = self.params
  var nosql = new Agent()

  nosql.remove('deleteOffer', 'product_offer').make(function (builder) {
    builder.where('id', offerInfo.id)
  })

  var deleteOffer = await nosql.promise('deleteOffer')
  console.log('deleteOffer', deleteOffer)
  if (deleteOffer > 0) {
    self.json({
      status: true,
      message: 'Offer deleted Successfully'
    })
  } else {
    self.json({
      status: false
    })
  }
}

async function getOffer() {
  var self = this
  var opt = self.params
  var nosql = new Agent()
  //console.log("id", opt);
  nosql.select('getOffer', 'product_offer').make(function (builder) {
    builder.where('id', opt.id)
    builder.first()
  })

  var getOffer = await nosql.promise('getOffer')
  if (getOffer != null) {
    self.json({
      status: true,
      message: 'Success',
      data: getOffer
    })
  } else {
    self.json({
      status: false
    })
  }
}

// notify user
function sendNotifyUser() {
  var self = this
  var productName = self.body.productName
  var phone = self.body.phone
  var message = `Dear user, ${productName} is in stock now. Please log on to http://www.happlimobiles.com and place your order.`

  smsModule.sendSMS(phone, message)
  self.json({
    status: true,
    message: 'Notify user success'
  })
}

// function to fetch product details
async function FetchProduct(id) {
  var nosql = new Agent()
  //console.log("id", id)
  nosql.select('getProduct', 'product').make(function (builder) {
    builder.where('id', id)
    builder.first()
  })
  try {
    var product = await nosql.promise('getProduct')
    return { product: product, err: null }
  } catch (err) {
    return { product: null, err: err }
  }
}

async function getNotifyUser() {
  var self = this
  var nosql = new Agent()

  nosql.listing('getNotifyUser', 'notify_user').make(function (builder) {
    builder.page(self.query.page || 1, self.query.limit || 10)
    builder.sort('timeStamp', 'desc')
  })

  var getNotifyUser = await nosql.promise('getNotifyUser')
  if (getNotifyUser != null) {
    var array = getNotifyUser.items
    for (let i = 0; i < array.length; i++) {
      const element = array[i]
      var { product, err } = await FetchProduct(element.productId)
      if (err || product == null) {
        console.log('product fetch err', err, product)
      }
      element.productDetails = product
    }
    self.json({
      status: true,
      data: getNotifyUser
    })
  } else {
    self.json({
      status: false
    })
  }
}

async function updateCartStatus() {
  var self = this
  var nosql = new Agent()
  nosql.update('updateCart', 'cart').make(function (builder) {
    builder.where('id', self.body.id)
    builder.set('status', self.body.status)
  })
  var updateCart = await nosql.promise('updateCart')
  console.log('updateCart', updateCart)
  if (updateCart > 0) {
    self.json({
      status: true,
      message: 'Cart status updated Successfully'
    })
  } else {
    self.json({
      status: false,
      message: 'Cart status update Fail'
    })
  }
}

async function fetchStock() {
  var self = this
  var nosql = new Agent()
  var body = self.body

  nosql.select('getStock', 'product_stock').make(function (builder) {
    builder.where('productId', body.productId)
  })

  var getStock = await nosql.promise('getStock')
  // console.log("getStock",getStock.length);
  if (getStock.length > 0) {
    self.json({
      status: true,
      data: getStock
    })
  } else {
    self.json({
      status: false,
      message: 'Stock Unavailable'
    })
  }
}

async function updateStock() {
  var self = this
  var body = self.body
  self.json({
    status: true
  })
  await stock.getAPXitemCode(body.productId)
}

async function getCartDetails() {
  var self = this
  var nosql = new Agent()
  var opt = self.query
  nosql.listing('getCart', 'cart').make(function (builder) {
    opt.phoneno && builder.where('id', opt.phoneno)
    builder.page(self.query.page || 1, self.query.limit || 10)
    builder.sort('dateupdated', 'desc')
  })

  var getCart = await nosql.promise('getCart')
  if (getCart != null) {
    self.json({
      status: true,
      data: getCart
    })
  } else {
    self.json({
      status: false
    })
  }
}

async function getOtpRequests() {
  var self = this
  var nosql = new Agent()

  nosql.listing('getOtp', 'otp_request').make(function (builder) {
    builder.page(self.query.page || 1, self.query.limit || 10)
    builder.sort('timeStamp', 'desc')
  })

  var otpRequests = await nosql.promise('getOtp')
  if (otpRequests != null) {
    self.json({
      status: true,
      data: otpRequests
    })
  } else {
    self.json({
      status: false
    })
  }
}

function login() {
  var self = this
  var key = (self.body.name + ':' + self.body.password).hash()

  if (F.global.config.users[key]) {
    OPERATION('admin.notify', { type: 'admin.login', message: self.body.name })
    self.cookie(F.config['admin-cookie'], key, '1 month')
    self.success()
  } else self.invalid().push('error-users-credentials')
}

function order_notify() {
  var self = this
  var message = null

  if (self.body.status == 'Cancel') {
    message = `Your order with Happi Mobiles has been canceled for more info, https://happimobiles.com/checkout/${self.body.order_id}`
  }

  if (self.body.status == 'Sent') {
    message = `Your order with Happi Mobiles is out for delivery, https://happimobiles.com/checkout/${self.body.order_id}`
  }

  if (self.body.status == 'Finished') {
    message = `Your order with Happi Mobiles is delivered, https://happimobiles.com/checkout/${self.body.order_id}`
  }

  if (self.body.status == 'Hold') {
    message = `Your order with Happi Mobiles is on Hold, https://happimobiles.com/checkout/${self.body.order_id}`
  }

  if (self.body.status == 'Accepted') {
    message = `Your order with Happi Mobiles is  Accepted, https://happimobiles.com/checkout/${self.body.order_id}`
  }

  if (message == null) {
    self.json({
      state: false,
      message: 'Invalid Status'
    })
    return
  }

  var options = {
    method: 'POST',
    url: `http://api.smscountry.com/SMSCwebservice_bulk.aspx?User=happi9&passwd=Happi@12345&mobilenumber=91${self.body.phone
      }&message=${encodeURI(message)}&sid=HappiM&mtype=N&DR=Y`,
    headers: {
      'Content-Type': 'application/json'
    }
  }

  request(options, function (error, response) {
    if (error) throw new Error(error)
    console.log(response.body)
    self.json({
      state: true
    })
  })
}

async function createpaymentLink() {
  var self = this
  var nosql = new Agent()
  var self = this
  var obj = self.body

  obj.data_created = new Date()
  obj.ispaid = false

  nosql.insert('LinkCreate', 'order-link').make(function (builder) {
    builder.set(obj)
  })

  var message = `Your Payment Link is https://happimobiles.com/order-delivery/${obj.id}`
  var options = {
    method: 'POST',
    url: `http://api.smscountry.com/SMSCwebservice_bulk.aspx?User=happi9&passwd=Happi@12345&mobilenumber=91${obj.delivery_phone
      }&message=${encodeURI(message)}&sid=HappiM&mtype=N&DR=Y`,
    headers: {
      'Content-Type': 'application/json'
    }
  }

  request(options, function (error, response) {
    if (error) throw new Error(error)
    console.log(response.body)
  })

  try {
    var link = await nosql.promise('LinkCreate')
    // console.log("cart", cart);
    self.json(link)
  } catch (err) {
    self.status(400)
    self.json({ err: err })
  }
}

async function fetchPaymentLink(id) {
  var self = this
  var nosql = new Agent()

  nosql.select('order', 'order-link').make(function (builder) {
    builder.where('id', id)
    builder.first()
  })

  try {
    var link = await nosql.promise('order')
    // console.log("cart", cart);
    self.json(link)
  } catch (err) {
    self.status(400)
    self.json(err)
  }
}

function socket() {
  var self = this
  WS = self
  self.autodestroy(() => (WS = null))
}

function makeid(length) {
  var result = ''
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  var charactersLength = characters.length
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}

//console.log("ID", makeid(6));

// Upload (multiple) pictures
function upload() {
  var id = []
  var self = this

  //console.log(self.query);

  self.files.wait(
    function (file, next) {
      file.read(function (err, data) {
        if (
          self.query.type == 'product' ||
          self.query.type == 'sliders' ||
          self.query.type == 'banners'
        ) {
          if (self.query.type == 'product') {
            if (file.width == 600 && file.height == 800) {
              file.extension = U.getExtension(file.filename)
              if (file.extension != 'jpg') {
                self.throw400('Invalid Image Format')
                return
              }

              //var ref = NOSQL('files').binary.insert(file.filename, []);
              var ref = makeid(6) + '-' + Date.now()
              console.log('PRODUCT', {
                id: ref,
                name: file.filename,
                size: file.size,
                width: file.width,
                height: file.height,
                type: file.type,
                ctime: F.datetime,
                mtime: F.datetime,
                extension: file.extension,
                download: '/download/' + ref + '.' + file.extension,
                s3Key: 'happi/' + ref + '.' + file.extension
              })

              id.push({
                id: ref,
                name: file.filename,
                size: file.size,
                width: file.width,
                height: file.height,
                type: file.type,
                ctime: F.datetime,
                mtime: F.datetime,
                extension: file.extension,
                download: '/download/' + ref + '.' + file.extension,
                s3Key: 'happi/' + ref + '.' + file.extension
              })

              const params = {
                Bucket: BUCKET, // pass your bucket name
                Key: 'happi/' + ref + '.' + file.extension, // file will be saved as testBucket/contacts.csv
                Body: data,
                ACL: 'public-read'
              }

              s3.upload(params, function (s3Err, data1) {
                if (s3Err) {
                  // fs.unlinkSync(element.destination + "/" + element.filename);
                  // res.send({ "status": false, "message": "Image upload Fail" });
                } else {
                  console.log('video file', data1.Key)
                }
              })
            } else {
              self.throw400(
                'Invalid Image size please upload the 350px X 450px and .JPG'
              )
              return
            }
          }

          if (self.query.type == 'banners' || self.query.type == 'sliders') {
            if (file.width == 1900 && file.height == 500) {
              file.extension = U.getExtension(file.filename)
              if (file.extension != 'jpg') {
                self.throw400('Invalid Image Format')
                return
              }
              //var ref = NOSQL('files').binary.insert(file.filename, data);
              var ref = makeid(6) + '-' + Date.now()
              id.push({
                id: ref,
                name: file.filename,
                size: file.size,
                width: file.width,
                height: file.height,
                type: file.type,
                ctime: F.datetime,
                mtime: F.datetime,
                extension: file.extension,
                download: '/download/' + ref + '.' + file.extension,
                s3Key: 'happi/' + ref + '.' + file.extension
              })

              const params = {
                Bucket: BUCKET, // pass your bucket name
                Key: 'happi/' + ref + '.' + file.extension, // file will be saved as testBucket/contacts.csv
                Body: data,
                ACL: 'public-read'
              }

              s3.upload(params, function (s3Err, data1) {
                if (s3Err) {
                  // fs.unlinkSync(element.destination + "/" + element.filename);
                  // res.send({ "status": false, "message": "Image upload Fail" });
                } else {
                  console.log('video file', data1.Key)
                }
              })
            } else {
              self.throw400(
                'Invalid Image size please upload the 350px X 450px and .JPG'
              )
              return
            }
          }
        } else {
          // Store current file into the HDD
          file.extension = U.getExtension(file.filename)
          ///var ref = NOSQL('files').binary.insert(file.filename, data);
          var ref = makeid(6) + '-' + Date.now()
          id.push({
            id: ref,
            name: file.filename,
            size: file.size,
            width: file.width,
            height: file.height,
            type: file.type,
            ctime: F.datetime,
            mtime: F.datetime,
            extension: file.extension,
            download: '/download/' + ref + '.' + file.extension,
            s3Key: 'happi/' + ref + '.' + file.extension
          })

          const params = {
            Bucket: BUCKET, // pass your bucket name
            Key: 'happi/' + ref + '.' + file.extension, // file will be saved as testBucket/contacts.csv
            Body: data,
            ACL: 'public-read'
          }

          s3.upload(params, function (s3Err, data1) {
            console.error(s3Err)
            console.log(data1)
            if (s3Err) {
              // fs.unlinkSync(element.destination + "/" + element.filename);
              // res.send({ "status": false, "message": "Image upload Fail" });
            } else {
              console.log('video file', data1.Key)
            }
          })
        }

        // Next file
        setTimeout(next, 100)
      })
    },
    () => {
      setTimeout(function () {
        self.json(id)
      }, 6000)
    }
  )
}

// Upload base64
function upload_base64() {
  var self = this

  if (!self.body.file) {
    self.json(null)
    return
  }

  var type = self.body.file.base64ContentType()
  var ext

  switch (type) {
    case 'image/png':
      ext = '.png'
      break
    case 'image/jpeg':
      ext = '.jpg'
      break
    case 'image/gif':
      ext = '.gif'
      break
    default:
      self.json(null)
      return
  }

  var data = self.body.file.base64ToBuffer()
  var id = NOSQL('files').binary.insert(
    (self.body.name || 'base64').replace(/\.[0-9a-z]+$/i, '').max(40) + ext,
    data
  )
  self.json('/download/' + id + ext)
}

// Creates a preview
function view_pages_preview() {
  var self = this
  self.layout('layout-preview')
  self.repository.preview = true
  self.repository.page = self.body
  self.view('~cms/' + self.body.template)
}

function json_widget_settings(id) {
  var self = this
  var item = F.global.widgets[id]
  self.json(item ? item.editor : null)
}

function json_backups(id) {
  var self = this
  NOSQL(self.req.split[self.req.split.length - 3]).backups(
    n => n.data.id === id,
    self.callback()
  )
}

function json_newsletter_state() {
  this.json(F.global.newsletter)
}

function json_products_replace() {
  var self = this
  self.$workflow(
    'replace-' + self.req.split[self.req.split.length - 1],
    self.callback()
  )
}

function json_products_export() {
  var self = this
  self.$workflow('export', (err, response) =>
    self.binary(
      Buffer.from(response),
      'applications/json',
      'binary',
      'products.json'
    )
  )
}

function json_orders_export() {
  var self = this
  self.$workflow('export', (err, response) =>
    self.binary(
      Buffer.from(response),
      'applications/json',
      'binary',
      'orders.json'
    )
  )
}

function json_products_import() {
  $WORKFLOW('Product', 'import', this.body, this.callback(), this)
}

function json_dashboard_online() {
  var self = this
  self.json(MODULE('visitors').today())
}

function json_pages_links() {
  var self = this
  var arr = []
  for (var i = 0, length = F.global.pages.length; i < length; i++) {
    var item = F.global.pages[i]
    arr.push({ url: item.url, name: item.name, parent: item.parent })
  }
  self.json(arr)
}

function json_dashboard() {
  MODULE('visitors').monthly(this.callback())
}

function json_dashboard_referrers() {
  NOSQL('visitors').counter.stats_sum(
    24,
    F.datetime.getFullYear(),
    this.callback()
  )
}

function view_notices_preview() {
  var self = this
  $WORKFLOW('Notice', 'preview', self.body.body || '', function (
    err,
    response
  ) {
    self.content(response, 'text/html')
  })
}

// function to write data
async function homepageData() {
  var self = this
  var data = self.body
  var JOB_ID = generateUuidModule.createUUID()
  var nosql = new Agent()
  if (!data) {
    self.json({
      status: false,
      message: 'no data'
    })
  } else {
    // check if json is present in db
    nosql.select('getHomeRaw', 'configuration').make(function (builder) {
      builder.where('configurationName', 'Homepage_Raw_Json')
      builder.first()
    })

    var getHomeRaw = await nosql.promise('getHomeRaw')
    if (getHomeRaw != null) {
      nosql.update('saveHomepageRaw', 'configuration').make(function (builder) {
        builder.where('configurationName', 'Homepage_Raw_Json')
        builder.set('configurationDetails', data)
      })
    } else {
      nosql.insert('saveHomepageRaw', 'configuration').make(function (builder) {
        builder.set('configurationName', 'Homepage_Raw_Json')
        builder.set('configurationDetails', data)
      })
    }

    var homepageRawData = await nosql.promise('saveHomepageRaw')
    self.json({
      status: true,
      message: 'Saved Successfully'
    })
    console.log(
      'HOMEPAGE_RAW_SAVE_TRIGGERED',
      new Date().toISOString(),
      JOB_ID,
      homepageRawData
    )
  }
}

// function to get data
async function homepageGetData() {
  var self = this
  var nosql = new Agent()
  nosql.select('getHomepageRaw', 'configuration').make(function (builder) {
    builder.where('configurationName', 'Homepage_Raw_Json')
    builder.first()
  })
  var homepageRawData = await nosql.promise('getHomepageRaw')
  var json = homepageRawData.configurationDetails
  //console.log("data",json)
  self.json(json)
}

// // Cron for every 15 mins
cron.schedule('*/15 * * * *', () => {
  homeCronPageJob()
})

cron.schedule('*/15 * * * *', () => {
  menuPageCronJob()
})


// will run the home page jon are 5 sec + start or restart time;
setTimeout(function () {
  homeCronPageJob()
}, 5000)

async function menuPageCronJob() {
  var nosql = new Agent()
  var JOB_ID = generateUuidModule.createUUID()

  nosql.select('getCats', 'category_one').make(function (builder) {
    builder.where('is_active', true)
    builder.sort('datecreated', 'desc')
  })
  var getCats = await nosql.promise('getCats');
  getCats.reverse();
  //console.log("getCats", getCats);
  for (let i = 0; i < getCats.length; i++) {
    const element = getCats[i]
    nosql.select('getSubCats', 'category_two').make(function (builder) {
      builder.where('cat_one_id', element.id)
      builder.where('is_active', true)
      builder.sort('datecreated', 'desc')
    })
    var getSubCats = await nosql.promise('getSubCats');
    getSubCats.reverse();
    element.categoryTwo = getSubCats
  }
  if (getCats != null) {
    //console.log("getCats", getCats);

    var headerJson = []
    for (let i = 0; i < getCats.length; i++) {
      var subMenu = []
      var headerObj = {}
      var catOne = getCats[i]
      if (catOne.categoryTwo.length > 0) {
        for (let j = 0; j < catOne.categoryTwo.length; j++) {
          var subMenuObj = {}
          var catTwo = catOne.categoryTwo[j]

          if (catTwo.category_two != '') {
            if (catTwo.cat_one_id == catOne.id) {
              subMenuObj = {
                subMenu1Name: catTwo.category_two,
                hrefUrl: catTwo.linker
              }
              subMenu.push(subMenuObj)
            }
          }
        }
        if (catTwo.cat_one_id == catOne.id) {
          headerObj = {
            menuName: catOne.category_one,
            hrefUrl: catOne.linker,
            menuType: 'tab',
            subMenu1: subMenu
          }
          headerJson.push(headerObj)
        }
      } else {
        if (catOne.category_one != '') {
          headerObj = {
            menuName: catOne.category_one,
            hrefUrl: catOne.linker,
            menuType: 'none'
          }
          headerJson.push(headerObj)
        }
      }
    }
  } else {
    console.log('NO CATEGORIES FOUND')
  }
  if (!headerJson) {
    console.log(
      'MENU_PAGE_CRON_JOB',
      new Date().toISOString(),
      JOB_ID,
      'DATA GET FAILED'
    )
  } else {
    fs.writeFile(
      __dirname + '/../public/header.json',
      JSON.stringify(headerJson),
      function (err) {
        if (err) {
          console.log(
            'MENU_PAGE_CRON_JOB',
            new Date().toISOString(),
            JOB_ID,
            'FILE SAVE ERROR'
          )
        } else {
          console.log(
            'MENU_PAGE_CRON_JOB',
            new Date().toISOString(),
            JOB_ID,
            'FILE SAVE SUCCESS'
          )
        }
      }
    )
  }
}


async function homeCronPageJob() {
  var JOB_ID = generateUuidModule.createUUID();
  //console.log("HOMEPAGE_CRON_JOB", new Date().toISOString(), JOB_ID, "TRIGGERED");
  var mnosql = new Agent();
  var self = this;
  //console.log("NO- CACHE");

  mnosql.select('getHomepageRaw', 'configuration').make(function (builder) {
    builder.where('configurationName', 'Homepage_Raw_Json');
    builder.first();
  });
  var homepageRawData = await mnosql.promise('getHomepageRaw');
  var res = homepageRawData.configurationDetails;
  //var res = JSON.parse(fs.readFileSync('./homepageRaw.json'));
  if (!res) {
    console.log("HOMEPAGE_CRON_JOB", new Date().toISOString(), JOB_ID, "DATA GET FAILED");
  }
  else {
    // var res = JSON.parse(data);
    let tempallGroceries = [];
    for (let i = 0; i < res.allGroceries.products.length; i++) {
      const element = res.allGroceries.products[i];
      tempallGroceries.push(element.id);
    }

    let tempdealOfTheDay = [];
    for (let i = 0; i < res.dealOfTheDay.products.length; i++) {
      const element = res.dealOfTheDay.products[i];
      tempdealOfTheDay.push(element.id);
    }

    let tempbestSeller = [];
    for (let i = 0; i < res.bestSeller.products.length; i++) {
      const element = res.bestSeller.products[i];
      tempbestSeller.push(element.id);
    }

    let temphouseHolds = [];
    for (let i = 0; i < res.houseHolds.products.length; i++) {
      const element = res.houseHolds.products[i];
      temphouseHolds.push(element.id);
    }

    let temphealthierFood = [];
    for (let i = 0; i < res.healthierFood.products.length; i++) {
      const element = res.healthierFood.products[i];
      temphealthierFood.push(element.id);
    }

    //	console.log("tempisHomeGaming", tempisHomeGaming)
    mnosql.select('bannersDesk', 'slider').make(function (builder) {
      builder.sort('weight', 'desc');
      builder.where('active', true);
      builder.where('devicetype', 'desktop');
    })

    mnosql.select('bannersMobile', 'slider').make(function (builder) {
      builder.sort('weight', 'desc');
      builder.where('active', true);
      builder.where('devicetype', 'mobile');
    })

    mnosql.select('allGroceries', 'product').make(function (builder) {
      builder.in('id', tempallGroceries);
      builder.fields('offerdesc', 'availability', 'booking_type', 'category', 'color',
        'datecreated', 'ftrFeatures', 'ftrTransfer', 'id', 'isHomeArrivals',
        'isnew', 'ispublished', 'istop', 'linker',
        'linker_category', 'linker_manufacturer', 'manufacturer', 'mrp', 'name', 'pictures', 'pricemin',
        'priceold', 'payPrice', 'shippingPrice', 'colorcode', 'product_type', 'purchase_type', 'signals',
        'size', 'variant');
    })

    mnosql.select('dealOfTheDay', 'product').make(function (builder) {
      builder.in('id', tempdealOfTheDay);
      builder.fields('offerdesc', 'availability', 'booking_type', 'category', 'color',
        'datecreated', 'ftrFeatures', 'ftrTransfer', 'id', 'isHomeArrivals',
        'isnew', 'ispublished', 'istop', 'linker',
        'linker_category', 'linker_manufacturer', 'manufacturer', 'mrp', 'name', 'pictures', 'pricemin',
        'priceold', 'payPrice', 'shippingPrice', 'colorcode', 'product_type', 'purchase_type', 'signals',
        'size', 'variant');
    })

    mnosql.select('bestSeller', 'product').make(function (builder) {
      builder.in('id', tempbestSeller);
      builder.fields('offerdesc', 'availability', 'booking_type', 'category', 'color',
        'datecreated', 'ftrFeatures', 'ftrTransfer', 'id', 'isHomeArrivals',
        'isnew', 'ispublished', 'istop', 'linker',
        'linker_category', 'linker_manufacturer', 'manufacturer', 'mrp', 'name', 'pictures', 'pricemin',
        'priceold', 'payPrice', 'shippingPrice', 'colorcode', 'product_type', 'purchase_type', 'signals',
        'size', 'variant');
    })

    mnosql.select('houseHolds', 'product').make(function (builder) {
      builder.in('id', temphouseHolds);
      builder.fields('offerdesc', 'availability', 'booking_type', 'category', 'color',
        'datecreated', 'ftrFeatures', 'ftrTransfer', 'id', 'isHomeArrivals',
        'isnew', 'ispublished', 'istop', 'linker',
        'linker_category', 'linker_manufacturer', 'manufacturer', 'mrp', 'name', 'pictures', 'pricemin',
        'priceold', 'payPrice', 'shippingPrice', 'colorcode', 'product_type', 'purchase_type', 'signals',
        'size', 'variant');
    })

    mnosql.select('healthierFood', 'product').make(function (builder) {
      builder.in('id', temphealthierFood);
      builder.fields('offerdesc', 'availability', 'booking_type', 'category', 'color',
        'datecreated', 'ftrFeatures', 'ftrTransfer', 'id', 'isHomeArrivals',
        'isnew', 'ispublished', 'istop', 'linker',
        'linker_category', 'linker_manufacturer', 'manufacturer', 'mrp', 'name', 'pictures', 'pricemin',
        'priceold', 'payPrice', 'shippingPrice', 'colorcode', 'product_type', 'purchase_type', 'signals',
        'size', 'variant');
    })

    mnosql.exec(async function (err, response) {
      if (err) {
        console.log("HOMEPAGE_CRON_JOB", new Date().toISOString(), JOB_ID, "MONGO ERROR");
      } else {

        res.allGroceries.products = response.allGroceries;
        res.dealOfTheDay.products = response.dealOfTheDay;
        res.bestSeller.products = response.bestSeller;
        res.houseHolds.products = response.houseHolds;
        res.healthierFood.products = response.healthierFood;
        res.bannersMobile = response.bannersMobile;
        res.bannersDesk = response.bannersDesk;

        // check if the homepage json in db
        mnosql.select('getHome', 'configuration').make(function (builder) {
          builder.where('configurationName', 'Homepage_Json');
          builder.first();
        });

        var getHome = await mnosql.promise('getHome');
        if (getHome != null) {
          mnosql.update('saveHomepageJson', 'configuration').make(function (builder) {
            builder.where('configurationName', 'Homepage_Json');
            builder.set('configurationDetails', res)
          });
        } else {
          mnosql.insert('saveHomepageJson', 'configuration').make(function (builder) {
            builder.set('configurationName', 'Homepage_Json');
            builder.set('configurationDetails', res)
          });
        }

        var saveHomepage = await mnosql.promise('saveHomepageJson');
        //console.log("HOMEPAGE_CRON_JOB", new Date().toISOString(), JOB_ID, "FILE SAVE SUCCESS", saveHomepage);

        fs.writeFile(__dirname + '/../public/homepage.json', JSON.stringify(res), function (err) {
          if (err) {

            console.log("HOMEPAGE_CRON_JOB", new Date().toISOString(), JOB_ID, "FILE SAVE ERROR");
          }
          else {

            console.log("HOMEPAGE_CRON_JOB", new Date().toISOString(), JOB_ID, "FILE SAVE SUCCESS");
          }
        });

      }
    });

  }
}

//will run the menu page jon are 5 sec + start or restart time;
setTimeout(function () {
  menuPageCronJob()
}, 5000)

