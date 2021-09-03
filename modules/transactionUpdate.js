var request = require('request');
// create uuid module import
var generateUuidModule = MODULE('generate-uuid');

var MONGO_DB_CONNECTION = process.env.MONGO_DB_CONNECTION || F.config['mongo'];;
var Agent = require('sqlagent/mongodb').connect(MONGO_DB_CONNECTION);


async function saveOrderTransaction(obj) {
    var JOB_ID = generateUuidModule.createUUID();
    var nosql = new Agent();
    // var obj = {
    //     transactionid: orderId+"-"+UID(),
    //     orderid: orderId,
    //     amount: amount,
    //     isSuccess: false,
    //     datecreated: new Date()
    // };

    nosql.insert('saveTransaction', 'transaction_details').make(function (builder) {
        builder.set(obj);
    });

    var saveTransaction = await nosql.promise('saveTransaction');
    console.log("SAVE TRASACTION TRIGGERED ",JOB_ID, saveTransaction);
}

module.exports.saveOrderTransaction = saveOrderTransaction;