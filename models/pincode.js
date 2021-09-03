var MONGO_DB_CONNECTION = process.env.MONGO_DB_CONNECTION || F.config['mongo'];;
var Agent = require('sqlagent/mongodb').connect(MONGO_DB_CONNECTION);
var jwt = require('jsonwebtoken');
var pincodeVerify = MODULE('pincodetest');

// jwt secret key 
var JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'happi_jwt_secret';

NEWSCHEMA('pincode').make(function (schema) {
    schema.define('id', 'UID');
	schema.define('pincode', Number);
	schema.define('city_id', 'UID');
    schema.define('area', 'String');
    schema.define('status', 'String');
})