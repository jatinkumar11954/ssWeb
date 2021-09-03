var request = require('request');
// create uuid module import
var generateUuidModule = MODULE('generate-uuid');

// otplib secret key
var OTP_SECRET = process.env.OTP_SECRET || 'ec1fde07-6a2c-11eb-8153-0200cd936042';
// send sms
function sendSMS(phone, template,order) {
    console.log(phone, template);
    var JOB_ID = generateUuidModule.createUUID();
    var obj;
    if(template == "SS_Order_Cancelled") {
        obj =  {
            'From':"SSGROC",
            'To':`+91${phone}`,
            'TemplateName':template,
            'VAR1':order.name,
            'VAR2':order.number
          }
    }

    if(template == "SS_Customer_OTP") {
        obj =  {
            'From':"SSGROC",
            'To':`+91${phone}`,
            'TemplateName':template,
            'VAR1':order,
          }
    }

    if(template == "SS_Order_Confirmation") {
        obj =  {
            'From':"SSGROC",
            'To':`+91${phone}`,
            'TemplateName':template,
            'VAR1':order.name,
            'VAR2':order.number,
            'VAR3':order.expected_delivery_date,
            'VAR4':order.expected_delivery_time
          }
    }

    if(template == "SS_Order_Dispatched") {
        obj =  {
            'From':"SSGROC",
            'To':`+91${phone}`,
            'TemplateName':template,
            'VAR1':order.name,
            'VAR2':order.number
          }
    }

    if(template == "SS_Delivery_Attempted") {
        obj =  {
            'From':"SSGROC",
            'To':`+91${phone}`,
            'TemplateName':template,
            'VAR1':order.name,
            'VAR2':order.number
          }
    }

    if(template == "SS_Order_Delivered") {
        obj =  {
            'From':"SSGROC",
            'To':`+91${phone}`,
            'TemplateName':template,
            'VAR1':order.name,
            'VAR2':order.number
          }
    }

    if(template == "SS_Cashbacks") {
        obj =  {
            'From':"SSGROC",
            'To':`+91${phone}`,
            'TemplateName':template,
            'VAR1':order.name
          }
    }

    if(template == "SS_OR_Refund") {
        obj =  {
            'From':"SSGROC",
            'To':`+91${phone}`,
            'TemplateName':template,
            'VAR1':order.name,
            'VAR2':order.number
          }
    }

     
    //   http://2factor.in/API/V1/293832-67745-11e5-88de-5600000c6b13/ADDON_SERVICES/SEND/TSMS
    var options = {
        'method': 'POST',
        'url': `http://2factor.in/API/V1/${OTP_SECRET}/ADDON_SERVICES/SEND/TSMS`,
        'headers': {
            'Content-Type': 'application/json',
        },
        'body': JSON.stringify(obj)
    };
    request(options, function (error, response) {
        if (error) {
            console.log("SMS_SEND_ERROR",JOB_ID, new Date().toISOString(), error);
        } 
         console.log("SMS_SEND_RESPONSE",JOB_ID, new Date().toISOString(), response.body, `+91${phone}`);
    });
}

module.exports.sendSMS = sendSMS;



// function sendSMS(phone, message) {
//     var JOB_ID = generateUuidModule.createUUID();
//     var options = {
//         'method': 'POST',
//         'url': `http://api.smscountry.com/SMSCwebservice_bulk.aspx?User=happi9&passwd=Happi@12345&mobilenumber=${phone}&message=${encodeURI(message)}&sid=HappiM&mtype=N&DR=Y`,
//         'headers': {
//             'Content-Type': 'application/json'
//         }
//     };
//     request(options, function (error, response) {
//         if (error) {
//             console.log("SMS_SEND_ERROR",JOB_ID, new Date().toISOString(), error);
//         } 
//          console.log("SMS_SEND_RESPONSE",JOB_ID, new Date().toISOString(), response.body, phone);
//     });
// }