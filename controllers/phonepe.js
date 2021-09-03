var fs = require('fs');
var jwt = require('jsonwebtoken');
var request = require('request');
var PhoneNumber = require('awesome-phonenumber');
var otplib = require('otplib');
var sha256 = require('sha-256-js');
var btoa = require('btoa');
var logger = require('logger').createLogger('phonepe.log'); // logs to a file
var bcrypt = null;// = require('bcrypt');
const axios = require('axios');





var PHONEPE_SLAT_KEY = process.env.PHONEPE_SLAT_KEY || '74503119-6988-45d5-978c-4ed3e99a02e0';
var PHONEPE_REDIRECTION_URL = process.env.PHONEPE_REDIRECTION_URL || 'https://www.happimobiles.com/checkout/';
var PHONEPE_CLINET_ID = process.env.PHONEPE_CLINET_ID || 'HAPPIMOBILESINAPP';
var PHONEPE_HOST = process.env.PHONEPE_HOST || 'apps.phonepe.com';
var MONGO_DB_CONNECTION = process.env.MONGO_DB_CONNECTION || F.config['mongo'];;
var Agent = require('sqlagent/mongodb').connect(MONGO_DB_CONNECTION);

exports.install = function () {
  //
  // ROUTE('/api/delivery/', order_push_to_delhivery, ["post", 10000]);
  // ROUTE('/api/delivery/{id}', detailsproduct);

  ROUTE('/api/phonepelogin/', get_access_phonepe_token, ['post', 10000])
  ROUTE('/api/phonepe-payment', phonepe_process, ['post', 10000])
  ROUTE('/api/phonepe-fetch', phonepe_fetch, ['post', 10000])
}

// var apm = require('elastic-apm-node').start({
//   // Override service name from package.json
//   // Allowed characters: a-z, A-Z, 0-9, -, _, and space
//   serviceName: 'happi-prod',

//   // Use if APM Server requires a token
//   secretToken: 'vonY511n39c51i96GN',

//   // Set custom APM Server URL (default: http://localhost:8200)
//   serverUrl: 'https://24d16068d91b4d25896441fdd960d8ac.apm.us-east-1.aws.cloud.es.io:443'
// });

function fetchAccessTokenFromPhonePe(token, cb){
    
    var resp = {
        "grantToken" : token
    };
    var b2a = btoa(JSON.stringify(resp));

    var verify = sha256(`${b2a}/v3/service/auth/access${PHONEPE_SLAT_KEY}`) + '###1';

    var options = { method: 'POST',
        url: `https://${PHONEPE_HOST}/v3/service/auth/access`,
        headers:
            { 'content-type': 'application/json',
                'x-client-id': PHONEPE_CLINET_ID,
                'x-verify': verify 
            },
            body: { 
                request: b2a 
            },
        json: true 
    };

    console.log("PHONEPE", options);

    request(options, function (error, response, body) {
    if (error) throw new Error(error);
        console.log("PHONEPE", body);
        
            var options2 = { 
                method: 'GET',
                url: `https://${PHONEPE_HOST}/v3/service/userdetails`,
                headers: { 
                    'x-access-token': body.data.accessToken,
                    'x-client-id': PHONEPE_CLINET_ID,
                    'content-type': 'application/json',
                    'x-verify': sha256(`/v3/service/userdetails${PHONEPE_SLAT_KEY}`) + '###1'
                } 
            };
            
            console.log("PHONEPE2", options2);

            request(options2, function (error, response, body2) {
                if (error) throw new Error(error);
                console.log("PHONEPE2", body2);
                cb(body2);
            });
    });
}


async function fetchOrderById(id, uuid){

    var nosql = new Agent();
  
    nosql.update('orderUpdate', 'orders').make(function (builder) {
      builder.set(
        {
          uuid: uuid,
          tag: "wait-phonepe"
        }
      );
      builder.where('id', id);
    });
  
      nosql.select('order', 'orders').make(function (builder) {
          builder.where('id', id);
          builder.first()
      });
  
      var order = null;  
      try {
        order = await nosql.promise('order');
        await nosql.promise('orderUpdate');
         // console.log("cart", cart);
          //return { cart: processCart(cart), err: null };
          var cartItems = [];
          for(var i =0; i < order.items.length; i++){
            var item = order.items[i];
            
            console.log("item", item);
  
            var cartItem = {
              "category": "SHOPPING",
              "itemId": item.id,
              "price": item.payPrice * 100,
              "itemName": item.name,
              "quantity": item.quantity,
              "address": {
                "addressString": order.billingstreet,
                "city": order.billingcity,
                "pincode": order.billingzip,
                "country": "IN",
              },
              "shippingInfo": {
                "deliveryType": "STANDARD",
                "time": {
                  "timestamp": new Date().getTime(),
                  "zoneOffSet": "+05:30"
                }
              }
            };
            cartItems.push(cartItem);
          };
  
          var t = {
            "orderContext": {
              "trackingInfo": {
                "type": "HTTPS",
                "url": `${PHONEPE_REDIRECTION_URL}${id}`
              }
            },
            "fareDetails": {
              "totalAmount": order.price * 100,
              "payableAmount": order.price * 100
            },
            "cartDetails": {
              "cartItems": cartItems
            }
          };
        
          return { order: t, err: null };
    } catch (err) {
          return { order: null, err: err };
    } 
  }

async function phonepe_process () {
  // var span = apm.startSpan('phonepe_process')

  var self = this

  var uuid = createUUID()

  var { order, err } = await fetchOrderById(self.body.order_id, uuid)

  console.log('transactionContext', JSON.stringify(order))

  var transactionContext = btoa(JSON.stringify(order))

  var resp = {
    merchantId: PHONEPE_CLINET_ID,
    amount: self.body.amount * 100,
    validFor: 900000,
    transactionId: uuid,
    merchantOrderId: self.body.order_id,
    redirectUrl:  PHONEPE_REDIRECTION_URL + self.body.order_id,
    transactionContext: transactionContext
  }

  console.log('resp', resp)

  var b2a = btoa(JSON.stringify(resp))

  var verify = sha256(`${b2a}/v3/transaction/sdk-less/initiate${PHONEPE_SLAT_KEY}`) + '###1';

  var options = {
    method: 'POST',
    url: `https://${PHONEPE_HOST}/v3/transaction/sdk-less/initiate`,
    headers: {
      'x-callback-url': PHONEPE_REDIRECTION_URL + self.body.order_id,
      'content-type': 'application/json',
      'x-client-id': PHONEPE_CLINET_ID,
      'x-verify': verify
    },
    body: {
      request: b2a
    },
    json: true
  };

  request(options, function (error, response, body) {
    if (error) throw new Error(error)
    //if (span) span.end()
    self.plain(body)
  });
}

async function phonepe_fetch () {
  //var span = apm.startSpan('phonepe_fetch')

  var self = this

  var nosql = new Agent()

  nosql.select('order', 'orders').make(function (builder) {
    builder.where('id', self.body.id)
    builder.first()
  });

  var order = null
  try {
    order = await nosql.promise('order')

    if (order.uuid == null) {
      self.json({
        state: 'NO-UUID',
        message: 'No Phone Pe'
      })
      //if (span) span.end()
      return
    }

    var verify =
      sha256(
        `/v3/transaction/${PHONEPE_CLINET_ID}/${order.uuid}/status${PHONEPE_SLAT_KEY}`
      ) + '###1'

    var options = {
      method: 'GET',
      url: `https://${PHONEPE_HOST}/v3/transaction/${PHONEPE_CLINET_ID}/${order.uuid}/status`,
      headers: {
        'content-type': 'application/json',
        'x-client-id': PHONEPE_CLINET_ID,
        'x-verify': verify,
      }
    }

    //var body2 = await request(options);
    var body2 = await axios.request(options)
    console.log('PHONEPEbody2', body2.data)
    var data = body2.data

    if (data.success && data.code == 'PAYMENT_SUCCESS') {
      nosql.select('order', 'orders').make(function (builder) {
        builder.where('id', self.body.id)
        builder.first()
      });
      await nosql.promise('order')

      // UPDATE PAYMENT STATUS IN DB 
      nosql.update('Updateorder', 'orders').make(function (builder) {
        builder.where('id', self.body.id);
        builder.set('taxid', data.data.transactionId+'/'+data.data.providerReferenceId);
        builder.set('ispaid', true);
        builder.set('tag', 'phonepe-paid');
      });

      await nosql.promise('Updateorder')

      self.json({
        state: data.code,
        message: 'PAYMENT SUCCESS',
        providerReferenceId: data.data.providerReferenceId
      });
    } else if (data.code == 'PAYMENT_ERROR') {
      self.json({
        state: data.code,
        message: 'PAYMENT ERROR'
      })
    } else if (
      data.code == 'PAYMENT_DECLINED' ||
      data.code == 'PAYMENT_CANCELLED'
    ) {
      self.json({
        state: data.code,
        message: 'PAYMENT DECLINED/CANCELLED'
      })
    } else if (data.code == 'PAYMENT_PENDING') {
      self.json({
        state: data.code,
        message: 'PAYMENT PENDING'
      })
    } else {
      self.json({
        state: 'NO-UUID',
        message: 'No Phone Pe'
      })
    }
    //   {
    //     "success": true,
    //     "code": "PAYMENT_SUCCESS", // code
    //     "data": {
    //         "transactionId": "cf015dab-0fsafds4799bf6fds03",
    //         "amount": 100,
    //         "merchantId": "TESTMAIN",
    //         "providerReferenceId": "P1907101401597592710760",
    //         "status": "SUCCESS",
    //         "payResponseCode": "SUCCESS"
    //     }
    //  }
    //if (span) span.end()

    //});
  } catch (err) {
    //return { order: null, err: err };
    console.log('PHONEPEERR', err)
    self.json({ message: 'somethingWentRong' })
  }
  //if (span) span.end()
}



function createUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
  });
}


function get_access_phonepe_token () {
  var self = this

  if (self.body.grand_token) {
    fetchAccessTokenFromPhonePe(self.body.grand_token, function (b) {
      self.plain(b)
    })
  } else {
    self.json({
      state: false,
      message: 'No grand_token'
    })
  }
}
