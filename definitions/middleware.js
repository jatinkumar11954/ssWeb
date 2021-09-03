
const jwt = require('jsonwebtoken');

// jwt user secret key 
var jsonSecretKey = process.env.JWT_SECRET_KEY || 'happi_jwt_secret';

// jwt admin secret key 
var JWT_ADMIN_SECRET_KEY = process.env.JWT_ADMIN_SECRET_KEY || 'JDSFNKLSJDGKLJW4732KEWFNKNE8978SDNFSNS9834JDF';

// jwt delivery person secret key 
var JWT_DELIVERY_SECRET_KEY = process.env.JWT_SECRET_KEY || 'JHASFKAWJEIRWUW4I642847KLMVFD8279WIDFSLSDFLKJSELDKQW371823';

MIDDLEWARE('jwtVerify', function (req, res, next, options, controller) {
    // console.log(req);
    // console.log(res);
    //console.log("options");
    var token = req.headers['x-auth']
   // console.log('token',token)
    // console.log(controller);
    // console.log(next);
    //console.log("token", token)
    jwt.verify(token, jsonSecretKey, function (err, decoded) {
        if (err) {
            console.log("invalid token");
            res.send({
                status: false,
                message: "Invalid Token"
            })
        } else {
            //console.log("decoded", decoded)

           req.token = decoded;
           //console.log("req.token", req.token)
           controller.token = decoded;
           //console.log("success")
           next(req.token)
        };
    });
});


MIDDLEWARE('userVerify', function (req, res, next, options, controller) {
    // console.log(req);
    // console.log(res);
    //console.log("options");
    var token = req.headers['x-auth']
   // console.log('token',token)
    // console.log(controller);
    // console.log(next);
    //console.log("token", token)
    jwt.verify(token, jsonSecretKey, function (err, decoded) {
        if (err) {
            console.log("invalid token");
            res.send({
                status: false,
                message: "Invalid Token"
            })
        } else {
            //console.log("decoded", decoded)

           req.token = decoded;
           //console.log("req.token", req.token)
           controller.token = decoded;
           //console.log("success")
           next(req.token)
        };
    });
});

MIDDLEWARE('adminVerify', function (req, res, next, options, controller) {
    // console.log(req);
    // console.log(res);
    //console.log("options");
    var token = req.headers['x-auth']
    //console.log('token',token)
    // console.log(controller);
    // console.log(next);
    //console.log("token", token)
    jwt.verify(token, JWT_ADMIN_SECRET_KEY, function (err, decoded) {
        if (err) {
            console.log("invalid token");
            res.send({
                status: false,
                message: "Invalid Token"
            })
        } else {
            //console.log("decoded", decoded)

           req.token = decoded;
           //console.log("req.token", req.token)
           controller.token = decoded;
           //console.log("success")
           next(req.token)
        };
    });
});

MIDDLEWARE('deliveryVerify', function (req, res, next, options, controller) {
    // console.log(req);
    // console.log(res);
    //console.log("options");
    var token = req.headers['x-auth']
   // console.log('token',token)
    // console.log(controller);
    // console.log(next);
    //console.log("token", token)
    jwt.verify(token, JWT_DELIVERY_SECRET_KEY, function (err, decoded) {
        if (err) {
            console.log("invalid token");
            res.send({
                status: false,
                message: "Invalid Token"
            })
        } else {
            console.log("decoded", decoded)

           req.token = decoded;
           //console.log("req.token", req.token)
           controller.token = decoded;
           //console.log("success")
           next(req.token)
        };
    });
});




