var MONGO_DB_CONNECTION = process.env.MONGO_DB_CONNECTION || F.config['mongo'];;
var Agent = require('sqlagent/mongodb').connect(MONGO_DB_CONNECTION);
async function pincodeVerify(pincode) {
    var nosql = new Agent();
    nosql.select('pincodes', 'pincodes').make(function (builder) {
        builder.where('pincode', pincode);
        builder.first();
    });

    try {
        var pincodes = await nosql.promise('pincodes');
        // console.log("cart", cart);
        if(pincodes != null) {
            if(pincodes.wid != "notAllocated") {
                return pincodes;
            } else {
                return "Pincode not available"
            }
           
        } else {
            return "Invalid Pincode"
        }
    } catch (err) {
        return "Invalid Pincode";
    }
}

module.exports.pincodeVerify = pincodeVerify;