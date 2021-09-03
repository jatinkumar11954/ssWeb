var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
const assert = require('assert');
var jwt = require('jsonwebtoken');
var moment = require('moment');

var MONGO_DB_CONNECTION = process.env.MONGO_DB_CONNECTION || F.config['mongo'];
var Agent = require('sqlagent/mongodb').connect(MONGO_DB_CONNECTION);
var as = require('async');


exports.install = function () {
    ROUTE('/admin/reports/users', usersReports, ['post', '#adminVerify', 'cors', 10000]);
    ROUTE('/admin/reports/orders', ordersReports, ['post', '#adminVerify', 'cors']);
    ROUTE('/admin/reports/inventory', inventoryReport, ['post', '#adminVerify', 'cors', 30000]);
    ROUTE('/admin/reports/finance', financeReport, ['post', '#adminVerify', 'cors']);
    ROUTE('/admin/reports/vendor', vendorReport, ['post', '#adminVerify', 'cors']);
    ROUTE('/admin/reports/vendor-settlement', vendorOrdersSettlementReport, ['post', '#adminVerify', 'cors']);
    ROUTE('/admin/reports/delivery-person', deliveryPersonReport, ['post', '#adminVerify', 'cors']);
}

// function to get the delivery person reports
async function deliveryPersonReport() {
    var self = this;
    var nosql = new Agent();
    var opt = self.body;
    var summary = {
        total: 0,
        online_orders_amount: 0,
        razorpay_orders_amount: 0,
        cod_orders_amount: 0
    }
    nosql.select('getDelivery', 'delivery_person').make(function (builder) {
        builder.where('id', opt.delivery_person_id);
        builder.first();
    })
    var getDelivery = await nosql.promise('getDelivery');
    // console.log("getDelivery", getDelivery);
    var fromDt = new Date(opt.dt).setUTCHours(0, 0, 0, 0);
    var toDt = new Date(opt.dt).setUTCHours(23, 59, 59, 999);
    var result = await DeliveryPersonOrders(getDelivery.order_ids, fromDt, toDt);

    if (result.length > 0) {
        for (let i = 0; i < result.length; i++) {
            var order = result[i];
            if (order.status == "Delivered") {
                if (order.tag == 'paid' && order.txnid != null || order.txnid != undefined) {
                    summary.online_orders_amount += order.price;
                }
                if (order.tag == 'paid' && order.razorpay_paymentid != null || order.razorpay_paymentid != undefined) {
                    summary.razorpay_orders_amount += order.price;
                }

                if (order.tag == 'cod') {
                    summary.cod_orders_amount += order.price;
                }

            }
            summary.total += order.price;
        }
        self.json({ status: true, data: result, summary: summary });
    } else {
        self.json({ status: false, message: "No Orders" });
    }


}

// function to get the user reports
async function usersReports() {
    var self = this;
    var nosql = new Agent();
    var opt = self.body;
    // var pincode = parseInt(opt.pinCode);
    // console.log("opt", opt);
    // console.log("type", typeof (opt.pinCode));
    nosql.select('usersReports', 'Users').make(function (builder) {
        opt.city && builder.where('addresses.city', opt.city);
        if (opt.isActive != undefined) {
            builder.where('is_active', opt.isActive);
        }
        opt.pinCode && builder.where('addresses.pinCode', opt.pinCode);
        builder.fields();
    })
    var usersReports = await nosql.promise('usersReports');


    if (usersReports.length > 0) {
        let finalUserData = await fetchOrderDetails(usersReports);
        self.json({
            status: true,
            data: finalUserData
        })
    } else {
        self.json({
            status: true,
            message: "No data found",
            data: []
        })
    }

    return;
    if (opt.warehouse) {
        // get warehouse pincode
        nosql.select('getWarehouse', 'warehouse').make(function (builder) {
            opt.warehouse && builder.where('name', opt.warehouse);
            builder.first();
        })

        let getWarehouse = await nosql.promise('getWarehouse');

        if (getWarehouse != null) {
            var result = [];
            for (let i = 0; i < getWarehouse.pincode.length; i++) {
                let pincode = getWarehouse.pincode[i];
                nosql.select('isPincode', 'Users').make(function (builder) {
                    builder.where('addresses.pinCode', pincode);
                    //builder.first();
                })
                let isPincode = await nosql.promise('isPincode');
                //console.log("isPincode",isPincode);
                if (isPincode.length > 0 && isPincode != null) {
                    result = [...isPincode];
                }
            }
            let finalUserData = await fetchOrderDetails(usersReports);
            self.json({ status: true, data: finalUserData });

        } else {
            return self.json({ status: false, message: "Warehouse not found" })
        }
    }
}

// function to get the orders reports
async function ordersReports() {
    var self = this;
    var nosql = new Agent();
    var opt = self.body;
    let totalOrderAmount = 0;
    nosql.select('orderReports', 'orders').make(function (builder) {
        opt.city && builder.where('city', opt.city);
        opt.pinCode && builder.where('zip', opt.pinCode);
        opt.status && builder.where('status', opt.status);
        opt.vendor && builder.where('delivery_type', opt.vendor);
        opt.warehouse && builder.where('wid', opt.warehouse);
        builder.sort('datecreated', 'desc');
        if (opt.payment_type) {
            if (opt.payment_type == 'online') {
                builder.where('ispaid', true);
            }

            if (opt.payment_type == 'cod') {
                builder.where('iscod', true);
            }
        }
        if (opt.fromDt && opt.toDt) {
            var fromDt = new Date(opt.fromDt).setUTCHours(0, 0, 0, 0);
            var toDt = new Date(opt.toDt).setUTCHours(23, 59, 59, 999);
            builder.query('datecreated', {
                $gte: new Date(fromDt),
                $lte: new Date(toDt)
            });
        }

        builder.fields('number', 'id', 'status', 'delivery_type', 'zip', 'price', 'ispaid', 'expected_delivery_date', 'expected_delivery_time',
            'iscod', 'datecreated', 'name', 'city', 'wid', 'created_on')
    })
    var orderReports = await nosql.promise('orderReports');
    for (let i = 0; i < orderReports.length; i++) {
        var order = orderReports[i];
        //console.log("getWarehouse",order.wid);
        if (order.wid != undefined) {
            nosql.select('getwarehouse', 'warehouse').make(function (builder) {
                builder.where('wid', order.wid);
                builder.first();
            })
            var warehouse = await nosql.promise('getwarehouse');
            if (warehouse != null) {
                order.warehouse = warehouse.name;
            }

        }
    }

    if (orderReports != null) {
        let ordersCount = orderReports.length;
        for (let j = 0; j < orderReports.length; j++) {
            let singleOrder = orderReports[j];
            totalOrderAmount += singleOrder.price
        }
        var summary = {
            totalOrderAmount: totalOrderAmount,
            totalNumberOfOrders: ordersCount
        }

        self.json({
            status: true,
            data: orderReports,
            summary: summary
        })
    } else {
        self.json({
            status: false,
            message: "No data found"
        })
    }
}

// function to get the orders reports
async function inventoryReport() {
    var self = this;
    var nosql = new Agent();
    var opt = self.body;
    console.log("body", opt);
    // if (opt.warehouse) {
    //     nosql.select('getWarehouse', 'warehouse').make(function (builder) {
    //         builder.where('name', opt.warehouse);
    //         builder.first();
    //     })

    //     let getWarehouse = await nosql.promise('getWarehouse');
    //     console.log("getWarehouse", getWarehouse);
    //     if (getWarehouse != null) {
    //         nosql.select('getWareStock', 'warehouse_stock').make(function (builder) {
    //             builder.where('warehouse_id', getWarehouse.wid);
    //         })

    //         let getWareStock = await nosql.promise('getWareStock');

    //         let prodArray = [];
    //         if (getWareStock != null && getWareStock.length > 0) {

    //             var unique = [...new Set(getWareStock.map(item => item.product_id))];
    //             //console.log("unique",unique);
    //             for (let i = 0; i < unique.length; i++) {
    //                 nosql.select('getProducts', 'product').make(function (builder) {
    //                     builder.where('id', unique[i]);
    //                     builder.fields('name', 'delivery_type', 'cat_one_id', 'cat_two_id', 'mrp', 'variant', 'id');
    //                     builder.first();
    //                 })

    //                 let getProducts = await nosql.promise('getProducts');

    //                 if (getProducts != null) {
    //                     //console.log("getProducts", getProducts);
    //                     prodArray.push(getProducts);
    //                 }

    //             }
    //         }
    //         let finalResult = await fetchCats(prodArray);
    //         self.json({
    //             status: true,
    //             data: finalResult
    //         })


    //     }
    // }

    if (opt.category) {
        nosql.select('category', 'category_one').make(function (builder) {
            builder.where('category_one', opt.category)
            builder.fields('id');
            builder.first();
        })
        var category = await nosql.promise('category');
        if (category != null) {
            nosql.select('getProducts', 'product').make(function (builder) {
                builder.where('cat_one_id', category.id);
                builder.fields('name', 'delivery_type', 'cat_one_id', 'cat_two_id', 'mrp', 'variant', 'id');
            })

            var getProducts = await nosql.promise('getProducts');
            if (getProducts.length > 0) {
                let finalResult = await fetchCats(getProducts, opt.warehouseId);
                self.json({
                    status: true,
                    data: finalResult
                })
            } else {
                return self.json({ status: false, message: "No Products found with the given category" });
            }
        } else {
            return self.json({ status: false, message: "No category found" });
        }
    }

    if (opt.subCategory) {
        nosql.select('category', 'category_two').make(function (builder) {
            builder.where('category_two', opt.subCategory)
            builder.fields('id');
            builder.first();
        })
        var category = await nosql.promise('category');
        if (category != null) {
            nosql.select('getProducts', 'product').make(function (builder) {
                builder.where('cat_two_id', category.id);
                builder.fields('name', 'delivery_type', 'cat_one_id', 'cat_two_id', 'mrp', 'variant', 'id');
            })

            var getProducts = await nosql.promise('getProducts');
            if (getProducts.length > 0) {
                let finalResult = await fetchCats(getProducts, opt.warehouseId);
                self.json({
                    status: true,
                    data: finalResult
                })
            } else {
                return self.json({ status: false, message: "No Products found with the given category" });
            }
        } else {
            return self.json({ status: false, message: "No category found" });
        }
    }

    nosql.select('inventoryReport', 'product').make(function (builder) {
        opt.vendor && builder.where('delivery_type', opt.vendor);
        opt.product && builder.where('name', opt.product);
        builder.fields('name', 'delivery_type', 'cat_one_id', 'cat_two_id', 'mrp', 'variant', 'id');
    })
    var inventoryReport = await nosql.promise('inventoryReport');

    let finalResult = await fetchCats(inventoryReport, opt.warehouseId);
    if (inventoryReport != null) {
        self.json({
            status: true,
            data: finalResult
        })
    } else {
        self.json({
            status: false,
            message: "No data found"
        })
    }


}

// function to get the finance reports
async function financeReport() {
    var self = this;
    var nosql = new Agent();
    var opt = self.body;
    nosql.select('orderReports', 'orders').make(function (builder) {
        opt.city && builder.where('city', opt.city);
        opt.pinCode && builder.where('zip', opt.pinCode);
        if (opt.status != undefined && opt.status != "") {
            console.log("hello")
            opt.status && builder.where('status', opt.status);
        } else {
            console.log("hello111111111111")
            builder.where('status', "Delivered");
        }

        opt.vendor && builder.where('delivery_type', opt.vendor);

        if (opt.payment_type) {
            if (opt.payment_type == 'online') {
                builder.where('ispaid', true);
            }

            if (opt.payment_type == 'cod') {
                builder.where('iscod', true);
            }
        }
        if (opt.fromDt && opt.toDt) {
            var fromDt = new Date(opt.fromDt).setUTCHours(0, 0, 0, 0);
            var toDt = new Date(opt.toDt).setUTCHours(23, 59, 59, 999);
            builder.query('datecreated', {
                $gte: new Date(fromDt),
                $lte: new Date(toDt)
            });
            console.log("DATE FILTER->", builder.builder)
        }

        builder.fields('number', 'id', 'status', 'delivery_type', 'zip', 'price', 'grouping_cashback', 'ispaid', 'iscod',
            'datecreated', 'totalShippingPrice', 'discount', 'SubTotal', 'norush_cashback', 'referral_cashback',
            'special_event_cashback', 'wallet_amount', 'totalSourcingPrice','iduser','total_cashback_amount');
    })
    var orderReports = await nosql.promise('orderReports');


    if (orderReports != null) {

        let finalUserData = await fetchOrderDetailsSummary(orderReports);
        self.json({
            status: true,
            data: finalUserData
        })
    } else {
        self.json({
            status: false,
            message: "No data found"
        })
    }
}

// function to get the vendor reports
async function vendorReport() {
    var self = this;
    var nosql = new Agent();
    var opt = self.body;
    nosql.select('getVendor', 'admin_users').make(function (builder) {
        builder.where('name', opt.vendor);
        builder.fields('name', 'warehouse_ids');
        builder.first();
    })
    var vendor = await nosql.promise('getVendor');

    //console.log("vendor", vendor);
    if (vendor != null) {
        if (vendor.warehouse_ids != undefined && vendor.warehouse_ids.length > 0) {
            if (opt.fromDt && opt.toDt) {
                var fromDt = new Date(opt.fromDt).setUTCHours(0, 0, 0, 0);
                var toDt = new Date(opt.toDt).setUTCHours(23, 59, 59, 999);
                let finalUserData = await vendorDetails(vendor, fromDt, toDt);
                self.json({
                    status: true,
                    data: finalUserData
                })
            } else {
                let finalUserData = await vendorDetails(vendor, "", "");
                self.json({
                    status: true,
                    data: finalUserData
                })
            }

        } else {
            return self.json({ status: false, message: "No warehouse allocated to this vendor" })
        }
    } else {
        self.json({
            status: false,
            message: "No data found"
        })
    }
}

// function to get the vendor orders settlement reports
async function vendorOrdersSettlementReport() {
    var self = this;
    var nosql = new Agent();
    var opt = self.body;
    nosql.select('getVendor', 'admin_users').make(function (builder) {
        builder.where('name', opt.vendor);
        builder.fields('name');
        builder.first();
    })
    var vendor = await nosql.promise('getVendor');

    //console.log("vendor", vendor);
    if (vendor != null) {
        if (opt.fromDt && opt.toDt) {
            var fromDt = new Date(opt.fromDt).setUTCHours(0, 0, 0, 0);
            var toDt = new Date(opt.toDt).setUTCHours(23, 59, 59, 999);
            let finalUserData = await vendorOrderDetails(vendor, fromDt, toDt);
            self.json({
                status: true,
                data: finalUserData
            })
        } else {
            let finalUserData = await vendorOrderDetails(vendor, "", "");
            self.json({
                status: true,
                data: finalUserData
            })
        }


    } else {
        self.json({
            status: false,
            message: "No data found"
        })
    }
}


// function to get the vendor orders
async function vendorOrderDetails(vendor, fromDt, toDt) {
    var nosql = new Agent();
    var result = {};
    var orderSummary = [];
    var vendorOrders = [];
    var codObj = {
        vendor: vendor.name,
        ordersCount: 0,
        type: "cod",
        totalAmount: 0,
        settledAmount: 0,
        dueAmount: 0
    }
    var onlineObj = {
        vendor: vendor.name,
        ordersCount: 0,
        type: "online",
        totalAmount: 0,
        settledAmount: 0,
        dueAmount: 0
    }

    var obj = {
        vendor: vendor.name,
        ordersCount: 0,
        totalAmount: 0,
        settledAmount: 0,
        dueAmount: 0
    }

    nosql.select('getOrders', 'orders').make(function (builder) {
        builder.where('delivery_type', vendor.name);
        builder.and();
        if (fromDt != "" && toDt != "") {
            builder.query('datecreated', {
                $gte: new Date(fromDt),
                $lte: new Date(toDt)
            });
        }
        builder.sort('datecreated', 'desc');
    })
    var orders = await nosql.promise('getOrders');

    var orderObj = {};
    var adminUser = await getShippingType(vendor.name);
    for (var i = 0; i < orders.length; i++) {
        var order = orders[i];
        // if (order.tag == "cod") {
        //     if (order.is_settled) {
        //         codObj.settledAmount += order.totalSourcingPrice + order.totalShippingPrice - order.price;
        //     }
        //     //codObj.ordersCount = orders.length;
        //     codObj.totalAmount += order.totalSourcingPrice + order.totalShippingPrice - order.price;
        //     codObj.dueAmount += codObj.totalAmount - codObj.settledAmount;
        // } else {
        //     if (order.is_settled) {
        //         onlineObj.settledAmount += order.totalSourcingPrice + order.totalShippingPrice;
        //     }
        //     //onlineObj.ordersCount = orders.length;
        //     onlineObj.totalAmount += order.totalSourcingPrice + order.totalShippingPrice;
        //     onlineObj.dueAmount += onlineObj.totalAmount - onlineObj.settledAmount;
        // }

        if (order.is_settled) {
            obj.settledAmount += order.totalSourcingPrice + order.totalShippingPrice;

        }
        obj.ordersCount = orders.length;
        obj.totalAmount += order.totalSourcingPrice + order.totalShippingPrice;
        obj.dueAmount = obj.totalAmount - obj.settledAmount;


        orderObj = {
            orderId: order.id,
            sourcingPrice: order.totalSourcingPrice,
            paidPrice: order.price,
            deliveryFee: order.totalShippingPrice,
            type: order.tag,
            settled: order.is_settled,
            settleAmount: 0,
            narration: "",
            delivery_by: ""
        }

        //console.log("admin",adminUser)
        if (adminUser != "Fail") {
            if (adminUser.role == "vendor") {
                if (adminUser.shipping_by == "shop-sasta") {
                    orderObj.settleAmount = parseFloat(order.totalSourcingPrice.toFixed(2));
                    orderObj.narration = "To vendor";

                } else {
                    if (order.tag == "cod") {
                        orderObj.settleAmount = parseFloat((order.totalSourcingPrice + order.totalShippingPrice - order.price).toFixed(2));
                        orderObj.narration = orderObj.settleAmount > 0 ? "To vendor" : "To Shop Sasta";
                    } else if (order.tag == "paid") {
                        orderObj.settleAmount = parseFloat((order.totalSourcingPrice + order.totalShippingPrice).toFixed(2));
                        orderObj.narration = orderObj.settleAmount > 0 ? "To vendor" : "To Shop Sasta";
                    }

                }
            } else {
                orderObj.settleAmount = parseFloat(order.totalSourcingPrice.toFixed(2));
                orderObj.narration = "To vendor";
            }

        } else {
            console.log("ADMIN USER ERROR");
        }

        vendorOrders.push(orderObj);

    }
    if (adminUser != "Fail") {
        if (adminUser.role == "vendor") {
            if (adminUser.shipping_by == "shop-sasta") {
                obj.delivery_by = "shop-sasta"
            } else {
                obj.delivery_by = "vendor"
            }
        } else {
            obj.delivery_by = "shop-sasta"
        }
    }
    // orderSummary.push(codObj);
    // orderSummary.push(onlineObj);
    obj.message = obj.dueAmount == 0 ? "Settlement Close!" : obj.dueAmount > 0 ? "Due Amount Transfer to Vendor" : "Due Amount Transfer to Shop Sasta";
    //orderSummary.push(obj);

    result.vendorOrders = vendorOrders;
    result.orderSummary = obj;
    return result;
}

async function getShippingType(vendor) {
    var nosql = new Agent();
    nosql.select('getUser', 'admin_users').make(function (builder) {
        builder.where('name', vendor);
        builder.first();
    });

    var getUser = await nosql.promise('getUser');
    if (getUser != null) {
        return getUser;
    }
    return "Fail";
}

// function vendor related data
async function vendorDetails(vendor, fromDt, toDt) {
    console.log("vendor", vendor);
    console.log(" new Date(fromDt)", new Date(fromDt), new Date(toDt))
    var nosql = new Agent();
    var result = [];
    var obj = {
        //warehouse: "",
        name: "",
        ordersCount: 0,
        productsCount: 0
    }

    // get warehouse details
    // nosql.select('getwarehouse', 'warehouse').make(function (builder) {
    //     builder.where('wid', wid);
    //     builder.first();
    // })
    // var warehouse = await nosql.promise('getwarehouse');
    // obj.warehouse = warehouse.name;
    obj.name = vendor.name;

    // get order details
    nosql.select('getOrders', 'orders').make(function (builder) {
        builder.where('delivery_type', vendor.name);
        builder.and();
        if (fromDt != "" && toDt != "") {
            builder.query('datecreated', {
                $gte: new Date(fromDt),
                $lte: new Date(toDt)
            });
        }

    })
    var orders = await nosql.promise('getOrders');
    obj.ordersCount = orders.length;

    // get product details
    nosql.select('getProduct', 'product').make(function (builder) {
        builder.where('delivery_type', vendor.name);
    })
    var products = await nosql.promise('getProduct');
    obj.productsCount = products.length;

    result.push(obj);

    return result;
}



// function to get the category names
async function fetchCats(products, wid) {
    var nosql = new Agent();
    var variantProducts = [];
    nosql.select('getWarehouse', 'warehouse').make(function (builder) {
        builder.where('wid', wid);
        builder.fields('name');
        builder.first();
    })

    let getWarehouse = await nosql.promise('getWarehouse');
    for (let i = 0; i < products.length; i++) {
        let singleProduct = products[i];

        nosql.select('category', 'category_one').make(function (builder) {
            builder.where('id', singleProduct.cat_one_id)
            builder.fields('category_one');
            builder.first();
        })
        var category = await nosql.promise('category');
        if (category != null) {
            singleProduct.category = category.category_one;
        }
        nosql.select('subCategory', 'category_two').make(function (builder) {
            builder.where('id', singleProduct.cat_two_id)
            builder.fields('category_two');
            builder.first();
        })
        var subCategory = await nosql.promise('subCategory');
        if (subCategory != null) {
            singleProduct.subCategory = subCategory.category_two;
        }



        for (let j = 0; j < singleProduct.variant.length; j++) {
            var variant = singleProduct.variant[j];
            var product = JSON.parse(JSON.stringify(singleProduct));
            product.variant = variant;
            product.name = product.name + "-" + variant.title;
            product.reatilPrice = variant.base_price;
            if (variant.souricing_price != undefined) {
                product.sourcePrice = parseInt(variant.souricing_price);
            }

            // fetch the available and sold stock 
            nosql.select('getStock', 'warehouse_stock').make(function (builder) {
                builder.where('variant_id', variant.id);
                builder.and();
                builder.where('product_id', product.id);
                builder.and();
                builder.where('warehouse_id', wid);
                builder.fields('sold_stock', 'stock');
                builder.first();
            })
            var getStock = await nosql.promise('getStock');
            //console.log("variant.id", variant.id,product.id ,wid);
            if (getStock != null) {
                product.soldQuantity = getStock.sold_stock;
                product.availableQuantity = getStock.stock;
            } else {
                product.soldQuantity = 0;
                product.availableQuantity = 0;
            }
            product.warehouse = getWarehouse.name;
            variantProducts.push(product);
        }


    }

    return variantProducts;
}

//To fetch order info of multiple Users -- reusable function
async function fetchOrderDetails(users) {
    var nosql = new Agent()
    var result = [];

    for (let i = 0; i < users.length; i++) {
        let user = users[i];
        let totalPurchaseAmount = 0;
        let totalCashbackAmount = 0;
        let referredUsers = 0;
        // get referral user count
        nosql.select('referallUser', 'Users').make(function (builder) {
            builder.where('referred_by', user.referal_code);
        })

        let referall = await nosql.promise('referallUser');
        if (referall.length > 0) {
            referredUsers = referall.length;
        }
        nosql.select('getOrder', 'orders').make(function (builder) {
            builder.where('iduser', user.phone);
            builder.sort('datecreated', 'desc');
        })

        let getOrder = await nosql.promise('getOrder');
        if (getOrder.length > 0 && getOrder != null) {
            for (let j = 0; j < getOrder.length; j++) {
                let singleOrder = getOrder[j];
                totalPurchaseAmount += singleOrder.price;

                // if (singleOrder.norush_cashback != undefined && singleOrder.norush_cashback.cashback_amount != undefined && singleOrder.norush_cashback.cashback_amount > 0) {
                //     totalCashbackAmount += singleOrder.norush_cashback.cashback_amount
                // }

                // if (singleOrder.special_event_cashback != undefined && singleOrder.special_event_cashback.cashback_amount != undefined && singleOrder.special_event_cashback.cashback_amount > 0) {
                //     totalCashbackAmount += singleOrder.special_event_cashback.cashback_amount
                // }
            }
            user.referredUsers = referredUsers;
            nosql.select('earnings', 'user_earnings').make(function (builder) {
                builder.where('phone', user.phone);
                builder.and();
                builder.where('cashback_type', '!=', 'wallet');
            })

            var earnings = await nosql.promise('earnings');
            for (let i = 0; i < earnings.length; i++) {
                totalCashbackAmount += earnings[i].cashback_amount;

            }
            user.orderInfo = {
                count: getOrder.length,
                totalPurchaseAmount: totalPurchaseAmount,
                totalCashbackAmount: totalCashbackAmount,
                lastOrderDate: getOrder[0].datecreated
            }

        }
        result.push(user);
    }

    return result;

}

//To fetch order info of multiple Users -- reusable function
async function fetchOrderDetailsSummary(getOrder) {
    console.log("getOrder.length", getOrder.length);
    var nosql = new Agent()
    //var result = [];
    let totalOrderAmount = 0;
    let totalCashbackAmount = 0;
    var totalRetailPrice = 0;
    var totalSourcingPrice = 0;
    var deliveryCharges = 0;
    var codAmount = 0;
    var onlinepayAmount = 0;
    var discount = 0;
    var walletAmountUsed = 0;
    var users = [];
    if (getOrder.length > 0 && getOrder != null) {
        for (let j = 0; j < getOrder.length; j++) {
            let singleOrder = getOrder[j];
            
            // push users
            if (users.indexOf(singleOrder.iduser) == -1) {
                users.push(singleOrder.iduser);
            } 

            totalOrderAmount += singleOrder.price;
            totalRetailPrice += singleOrder.SubTotal;
            if (singleOrder.discount != undefined || singleOrder.discount > 0) {
                discount += singleOrder.discount;
            }

            if (singleOrder.iscod) {
                codAmount += singleOrder.price;
            }

            if (singleOrder.ispaid) {
                onlinepayAmount += singleOrder.price;
            }
            if (singleOrder.totalShippingPrice != undefined || singleOrder.totalShippingPrice > 0) {
                deliveryCharges += singleOrder.totalShippingPrice;
            }

            // total cashback calculation ----------------------------
            // if (singleOrder.norush_cashback != undefined && singleOrder.norush_cashback.cashback_amount != undefined && singleOrder.norush_cashback.cashback_amount > 0) {
            //     totalCashbackAmount += singleOrder.norush_cashback.cashback_amount
            // }
            // if (singleOrder.referral_cashback != undefined && singleOrder.referral_cashback.cashback_amount != undefined && singleOrder.referral_cashback.cashback_amount > 0) {
            //     totalCashbackAmount += singleOrder.referral_cashback.cashback_amount
            // }
            // if (singleOrder.special_event_cashback != undefined && singleOrder.special_event_cashback.cashback_amount != undefined && singleOrder.special_event_cashback.cashback_amount > 0) {
            //     totalCashbackAmount += singleOrder.special_event_cashback.cashback_amount
            // }
            //console.log("singleOrder.total_cashback_amount",singleOrder.total_cashback_amount)
            if (singleOrder.total_cashback_amount != undefined && singleOrder.total_cashback_amount > 0) {
                totalCashbackAmount += singleOrder.total_cashback_amount;
            }
            if (singleOrder.grouping_cashback != undefined && singleOrder.grouping_cashback.cashback_amount > 0) {
                totalCashbackAmount += singleOrder.grouping_cashback.cashback_amount;
            }
             if (singleOrder.referral_cashback != undefined && singleOrder.referral_cashback.cashback_amount > 0) {
                totalCashbackAmount += singleOrder.referral_cashback.cashback_amount;
            }
            // total cashback calculation ----------------------------


            if (singleOrder.wallet_amount != undefined || singleOrder.wallet_amount > 0) {
                //console.log("singleOrder.wallet_amount",singleOrder.wallet_amount)
                walletAmountUsed += singleOrder.wallet_amount;
            }
            // console.log("singleOrder.totalSourcingPrice", singleOrder.totalSourcingPrice);
            if (singleOrder.totalSourcingPrice != undefined) {

                totalSourcingPrice += singleOrder.totalSourcingPrice;
            }
        }

    }
    //console.log("usrs",users);
    //newCashbackAmount = await GetUsersWallet(users);
    // console.log("data",data);
    
    console.log("totalCashbackAmount", totalCashbackAmount, "walletAmountUsed", walletAmountUsed)
    // var newCashbackAmount = Math.abs(totalCashbackAmount - walletAmountUsed);

    newCashbackAmount = totalCashbackAmount;
    var result = {
        totalOrderAmount: totalOrderAmount,
        totalRetailPrice: totalRetailPrice,
        deliveryCharges: deliveryCharges,
        cashbackUsedByUser: walletAmountUsed,
        discount: discount,
        paidViaCod: codAmount || 0,
        paidViaPaymentGateway: onlinepayAmount || 0,
        newCashBackIssuedToUsers: totalCashbackAmount,
        totalSourcingPrice: totalSourcingPrice

    }
    //result.push(user);


    return result;

}

async function GetUsersWallet(users) {
    var newCashbackAmount = 0;
    var nosql = new Agent();
    for (let i = 0; i < users.length; i++) {
        const element = users[i];
        nosql.select('getUsers', 'Users').make(function (builder) {
            builder.where('phone', element);
            builder.fields('wallet_amount');
            builder.first();
        })
        var getUsers = await nosql.promise('getUsers');
        newCashbackAmount += getUsers.wallet_amount;
    }
    return newCashbackAmount;
}


// function to get the order details for the order report
async function fetchOrderDetailsForOrdersReport(getOrder) {
    var nosql = new Agent()
    var result = [];
    let totalOrderAmount = 0;
    let ordersCount = getOrder.length;
    if (getOrder.length > 0 && getOrder != null) {
        for (let j = 0; j < getOrder.length; j++) {
            let singleOrder = getOrder[j];
            totalOrderAmount += singleOrder.price
        }

    }
    var summary = {
        totalOrderAmount: totalOrderAmount,
        totalNumberOfOrders: ordersCount

    }
    //result.push(user);


    return result;
}

// function to get the order details
async function DeliveryPersonOrders(orderIds, fromDt, toDt) {
    var nosql = new Agent();
    var orders = [];
    for (let i = 0; i < orderIds.length; i++) {
        const element = orderIds[i];
        nosql.select('getOrders', 'orders').make(function (builder) {
            builder.where('id', element);
            builder.query('datecreated', {
                $gte: new Date(fromDt),
                $lte: new Date(toDt)
            });
            builder.fields('id', 'name', 'status', 'datecreated', 'phone', 'tag', 'iscod', 'ispaid', 'razorpay_paymentid', 'p_type', 'price', 'txnid', 'number');
            builder.first();
            //console.log("builder", builder.builder);
        })
        var getOrders = await nosql.promise('getOrders');
        if (getOrders != null) {
            orders.push(getOrders);
        }

    }
    return orders;
}


// get vendor details
// async function vendorDetails(vendor, fromDt, toDt) {
//     console.log("vendor",vendor);
//     console.log(" new Date(fromDt)", new Date(fromDt), new Date(toDt))
//     var nosql = new Agent();
//     var result = [];
//     for (let i = 0; i < vendor.warehouse_ids.length; i++) {
//         var obj = {
//             warehouse: "",
//             name: "",
//             ordersCount: 0,
//             productsCount: 0
//         }
//         let wid = vendor.warehouse_ids[i];

//         // get warehouse details
//         nosql.select('getwarehouse', 'warehouse').make(function (builder) {
//             builder.where('wid', wid);
//             builder.first();
//         })
//         var warehouse = await nosql.promise('getwarehouse');
//         //console.log("warehouse", warehouse);
//         obj.warehouse = warehouse.name;
//         obj.name = vendor.name;

//         // get order details
//         nosql.select('getOrders', 'orders').make(function (builder) {
//             builder.where('delivery_type', vendor.name);
//             builder.and();
//             builder.where('wid', wid);
//             builder.and();
//             if (fromDt != "" && toDt != "") {
//                 builder.query('datecreated', {
//                     $gte: new Date(fromDt),
//                     $lte: new Date(toDt)
//                 });
//             }

//         })
//         var orders = await nosql.promise('getOrders');
//         obj.ordersCount = orders.length;

//         // get product details
//         nosql.select('getProduct', 'warehouse_stock').make(function (builder) {
//             builder.where('warehouse_id', wid);
//             builder.fields('product_id');
//         })
//         var products = await nosql.promise('getProduct');
//         //console.log("products",products);
//         let uniqueProducts = [...new Set(products.map(item => item.product_id))];
//         //console.log("uniqueProducts",uniqueProducts);
//         obj.productsCount = uniqueProducts.length;

//         result.push(obj);
//     }
//     return result;
// }






















// Customer master :   001  - TOIPL

// 002 - bpcl

// 003 - iocl

// 004 - AEGIS GAS

// 4 -  Explant

// Product master : 001 - LPG 002 - PROPANE

// db.getCollection("truck_masters").find({}).forEach(function (docs) {
//     if (docs.product_code == "001") {
//         docs.product_code = "LPG"
//     }
//     if (docs.product_code == "002") {
//         docs.product_code = "PROPANE"
//     }

//     if (docs.customer_code == 1) {
//         docs.customer_code = "TOIPL"
//     }
//     if (docs.customer_code == 2) {
//         docs.customer_code = "BPCL"
//     }
//     if (docs.customer_code == 3) {
//         docs.customer_code = "IOCL"
//     }
//     if (docs.customer_code == 4) {
//         docs.customer_code = "AEGIS GAS"
//     }

//         db.getCollection("truck_masters").save(docs);
//         print("UPDATED : " );
// });
