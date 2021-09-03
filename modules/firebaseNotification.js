var fcm = require('fcm-notification');
var FCM = new fcm('./firebase.json');

exports.sendNotification = function (message) {
    FCM.send(message, function (err, response) {
        console.log("FIRE BASE NOTIFICATION FUNCTION TRIGGERRED--------------------------------------");
        if (err) {
            console.log('error found', err);
        } else {
            console.log('response here', response);
        } 
    })
    // FCM.sendToMultipleToken(message, tokens, function (err, response) {
    //     console.log("FIRE BASE NOTIFICATION FUNCTION TRIGGERRED--------------------------------------");
    //    // console.log("err", err, "response", response)
    //     if (err) {
    //         console.log('error found', err);
    //     } else {
    //         console.log('response here', response);
    //     }
    // })

}

exports.sendMultipleNotification = function (message,tokens) {
    FCM.sendToMultipleToken(message, tokens, function (err, response) {
        console.log("FIRE BASE MULTIPLE NOTIFICATION FUNCTION TRIGGERRED--------------------------------------");
        // console.log("err", err, "response", response)
        if (err) {
            console.log('error found', err);
        } else {
            console.log('response here', response);
        }
    })
}




