var MONGO_DB_CONNECTION = process.env.MONGO_DB_CONNECTION || F.config['mongo'];;
var Agent = require('sqlagent/mongodb').connect(MONGO_DB_CONNECTION);
var jwt = require('jsonwebtoken');


// jwt secret key 
var JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'happi_jwt_secret';

const fcm = MODULE('firebaseNotification');
exports.install = function () {
    ROUTE('/api/user-fcm', addUserFcmToken, ['POST', 'cors', 10000]);
    ROUTE('/api/send-notify', sendFcmNotification, ['POST', 'cors', 10000]);
}

async function addUserFcmToken() {
    console.log("FCM TOKEN USER API TRIGGER-------------------")
    var self = this;
    var body = self.body;
    var nosql = new Agent();
    var JOB_ID = createUUID();
    var token = self.headers['x-auth'];
    // console.log("body", body);
    // console.log("token", token);
    if (token == null || token == undefined || token == "null") {
        //console.log("NO x-auth");
        var obj = {
            id: UID(),
            fcmToken: body.fcmToken,
            datecreated: new Date()
        };
        nosql.insert('AddFcm', 'fcmtoken_user').make(function (builder) {
            builder.set(obj);
        });

        var AddFcm = await nosql.promise('AddFcm');

        self.json({
            status: true
        });

    } else {
        //console.log("IF  x-auth");
        try {
            decoded = jwt.verify(token, JWT_SECRET_KEY);

            nosql.select('getFcm', 'fcmtoken_user').make(function (builder) {
                builder.and();
                builder.where('phone', decoded.phone);
            });

            var getFcm = await nosql.promise('getFcm');

            console.log("FCM_TRIGGER", JOB_ID, "FCM-VERIFY", getFcm);

            if (getFcm.length != 0) {
                self.json({
                    status: false,
                    message: "FCM token already added"
                });
                return;
            }

            var obj = {
                id: UID(),
                phone: decoded.phone,
                fcmToken: body.fcmToken,
                datecreated: new Date()
            };

            nosql.insert('AddFcm', 'fcmtoken_user').make(function (builder) {
                builder.set(obj);
            });

            var AddFcm = await nosql.promise('AddFcm');

            self.json({
                status: true
            });

        } catch (err) {
            console.log("err", err)
            self.json({
                state: false,
                message: "Sorry some thing went wrong"
            });
            return;
        }
    }
}


// Generate a UUID
function createUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

async function sendFcmNotification() {
    var self = this;
    var nosql = new Agent();
    var tokens = [];
    
    // get fcm tokens from users table
    nosql.select('getUsers', 'Users').make(function (builder) {

    })
    var users = await nosql.promise('getUsers');
    for (let i = 0; i < users.length; i++) {
        var user = users[i];
        if (user.token != undefined && user.token != null) {
            tokens.push(user.token);
        }

    }
    var message = {
        data: {
           
        },
        notification: {
            title: self.body.title,
            body: self.body.message
        }
    };
    fcm.sendMultipleNotification(message, tokens)
    self.json({ status: true })
}



