var Agent = require('sqlagent/mongodb').connect(CONFIG('mongo'));



async function OrderConfirm(orderId) {
    //console.log("orderIDDDDDDD", orderId);

    var nosql = new Agent();

    nosql.select('fetchOrder', 'orders').make(function (builder) {
        builder.where('id', orderId);
        builder.first();
    });

    try {
        //var order = fetchOrder
        var order = await nosql.promise('fetchOrder');
        // console.log("cart", cart);
        if (order != null) {
            for (var i = 0; i < order.items.length; i++) {
                var trackObj = {
                    trackid: order.wid + '/' + order.items[i].id + '/' + order.items[i].variant.id,
                    type: 'user',
                    quantity: -1 * order.items[i].quantity,
                    notes: "order created"
                }
                await saveStockTracking(trackObj)
                await StockUpdate(order.items[i].id, order.wid, order.items[i].variantId, (-1 * order.items[i].quantity));
            }
        } else {
            console.log("Invalid orderId")
        }
    } catch (err) {
        console.log("Invalid order Err", err);
    }
}

async function StockUpdate(productId, wid, vid, value) {
    console.log("INSIDE STOCK UPDATE---------", "pid", productId, "wid", wid, "vid", vid)
    console.log("value---------------", value);

    var mongoClient = new Agent();
    // mongoClient.select('getwarehouse', 'pincodes').make(function (builder) {
    //     builder.where('pincode', pincode);
    //     builder.first();
    // });

    // var getwarehouse = await mongoClient.promise('getwarehouse');
    mongoClient.select('getwstock', 'warehouse_stock').make(function (builder) {
        builder.where('variant_id', vid);
        builder.and();
        builder.where('warehouse_id', wid);
        builder.and();
        builder.where('product_id', productId);
        builder.set('stock', value);
        builder.first();
    });
    var getwstock = await mongoClient.promise('getwstock');
    var previousStock = getwstock.stock;
    var previousSoldStock = getwstock.sold_stock;
    var revisedStock = previousStock + value;
    var revisedSoldStock = previousSoldStock + (-1 * value);
    //console.log("revisedSoldStock----------------------------------------",revisedSoldStock)
    mongoClient.update('updatewstock', 'warehouse_stock').make(function (builder) {
        builder.where('variant_id', vid);
        builder.and();
        builder.where('warehouse_id', wid);
        builder.and();
        builder.where('product_id', productId);
        builder.set('stock', revisedStock);
        builder.set('sold_stock', revisedSoldStock);
    });

    var updatewstock = await mongoClient.promise('updatewstock');
    if (updatewstock > 0) {
        console.log("STOCK UPDATE SUCCESs");
    } else {
        console.log("STOCK UPDATE FAIL");
    }
}


async function OrderCancel(orderId) {

    var nosql = new Agent();

    nosql.select('fetchOrder', 'orders').make(function (builder) {
        builder.where('id', orderId);
        builder.first();
    });

    try {
        //var order = fetchOrder
        var order = await nosql.promise('fetchOrder');
        // console.log("cart", cart);
        if (order != null) {
            for (var i = 0; i < order.items.length; i++) {
                var trackObj = {
                    trackid: order.wid + '/' + order.items[i].id + '/' + order.items[i].variant.id,
                    type: 'user',
                    quantity: 1 * order.items[i].quantity,
                    notes: "order cancelled"
                }
                await saveStockTracking(trackObj)
                await StockUpdate(order.items[i].id, order.wid, order.items[i].variantId, (1 * order.items[i].quantity));
            }
        } else {
            console.log("Invalid orderId")
        }
    } catch (err) {
        console.log("Invalid order Err", err);
    }
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




module.exports.OrderConfirm = OrderConfirm;
module.exports.OrderCancel = OrderCancel;