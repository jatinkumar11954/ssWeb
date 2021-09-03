var MONGO_DB_CONNECTION = process.env.MONGO_DB_CONNECTION || F.config['mongo'];;
var Agent = require('sqlagent/mongodb').connect(MONGO_DB_CONNECTION);
var jwt = require('jsonwebtoken');
var fs = require('fs');
const cryptoRandomString = require('crypto-random-string');
const moment = require('moment-timezone');
const as = require('async');

// importing pincode verify module
var pincodeVerify = MODULE('pincodetest');

// create uuid module import
var generateUuidModule = MODULE('generate-uuid');
// send email import module
var emailModule = MODULE('email');
// jwt secret key 
var JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'happi_jwt_secret';

// trasaction Module
var transaction = MODULE('transactionUpdate');

const checksum_lib = require('../modules/paytm-checksum');

// Stock module import
var stockModule = MODULE('productsStock');


// send sms import modile
var smsModule = MODULE('sms');

exports.install = function () {
    // cart apis
    ROUTE('/api/cart/', addCart, ['post', 'cors']);
    ROUTE('/api/cart/v2', addCart, ['post', 'cors']);

    ROUTE('/api/cart/', getCart, ['get', 'cors']);
    ROUTE('/api/cart/', deleteCart, ['delete', 'cors']);
    ROUTE('/api/cart/update', updateCart, ['post', 'cors']);


    ROUTE('/api/wishlist/', addWishlist, ['post', 'cors']);
    ROUTE('/api/wishlist/', getWishlist, ['get', 'cors']);
    ROUTE('/api/wishlist/', deleteWishlist, ['delete', 'cors']);

    ROUTE('/api/order/create-v2', createOrder, ['post', 'cors', 30000]);
    ROUTE('/api/order/v2', fetchOrder, ['post', 'cors', 30000]);

    //coupon
    ROUTE('/api/cart/coupon', verifyCoupon, ['post', 'cors', 30000]);
    ROUTE('/api/cart/remove-coupon', deleteCoupon, ['post', 'cors', 30000]);

    //paytm call back function
    ROUTE('/order/paytm', paytm_process, ['cors']);
    ROUTE('/order/paytm-return', paytm_cb, ['post', 10000]);

    // cancel order
    ROUTE('/api/order-cancel', cancelOrder, ['post', 10000]);

    // api to check the stock for the products
    ROUTE('/api/cart-verify', verifyCart, ['post', '#userVerify', 10000]);
    ROUTE('/api/cart-confirm', cartConfirm, ['post', '#userVerify', 10000]);

    // api to remove  the discounts from cart
    ROUTE('/api/remove-discounts', removeDiscounts, ['post', '#userVerify', 10000]);

    // api to group the cart items based on the vendor 
    ROUTE('/api/cart-group', groupCartItems, ['#userVerify', 10000]);

    // api to update the cart with vendor delivery dates
    ROUTE('/api/cart-vendordelivery-update', updateCartVendorDeliveryDetails, ['post', '#userVerify', 10000]);

}

async function updateCartVendorDeliveryDetails() {
    var self = this;
    var body = self.body;
    var decoded = self.token;
    var nosql = new Agent();
    // var delivery_info = {
    //     'shop-sasta':{
    //         delivery_date:"18-6-2021",
    //         delivery_time:"1 PM - 5 PM"
    //     },
    //     'Bigbasket':{
    //       delivery_date:"18-6-2021",
    //         delivery_time:"1 PM - 5 PM"
    //     }
    // };

    nosql.update('updateCart', 'cart').make(function (builder) {
        builder.set('delivery_info', body.delivery_info);
        builder.where('id', decoded.phone);
    })

    var updatecart = await nosql.promise('updateCart');
    if (updatecart > 0) {
        self.json({
            status: true,
            message: "Cart updated successfully"
        })
    } else {
        self.json({
            status: false
        })
    }
}

function eachProductPriceCalculation(product) {
    var vquantity = [];
    var vpObj = [];
    var vprice = 0;
    const variant = product.variant;
    // console.log("element.id", element.id, vid);
    if (variant.id == product.variantId) {
        vpObj.push(variant);
        LOGGER('addcart', `Variant Object: ${JSON.stringify(vpObj)}`);
        for (let k = 0; k < variant.prices.length; k++) {
            const price = variant.prices[k];
            //console.log("prices and quants", price);
            // WORK HERE -----------------------------------------------------------------------------------------------------------
            vquantity.push(price.quantity);
            // vprices.push(price.price);

        }
    }
    LOGGER('addcart', `Variant Quantities: ${vquantity}`);
    // }
    if (vquantity.length > 0) {
        // console.log("vquantity index", vquantity.indexOf(product.quantity));
        if (vquantity.indexOf(product.quantity) != -1) {
            // console.log("exact quantity", vquantity, "prodquantity", product.quantity);
            // var priceIndex = vquantity.indexOf(product.quantity);
            // vprice = vprices[priceIndex]
            vpObj.map(data => {
                //console.log("data",data);

                data.prices.map(async x => {
                    if (x.quantity == product.quantity) {
                        vprice = x.price * product.quantity;
                        product.price = vprice;
                        product.mrp = data.mrp * product.quantity;
                        //console.log("exact vprice", vprice, data.mrp, product.quantity);

                        LOGGER('addcart', `Exact quantity match vprice: ${vprice} , product:${product.name} `);
                        LOGGER('addcart', `data.mrp: ${data.mrp}`);
                        LOGGER('addcart', `product.quantity: ${product.quantity}`);
                        LOGGER('addcart', `product.mrp: ${product.mrp}`);
                    }
                })
            })

        } else {
            // sorting array ascending
            vquantity.sort(function (a, b) {
                return a - b;
            });
            var goal = product.quantity; // 6

            var closest = vquantity.reverse().find(e => e <= goal);

            // console.log("vquantity", vquantity);
            // console.log("vprices", vprices);
            // console.log("vpObj", vpObj);

            vpObj.map(data => {
                //console.log("data",data);
                data.prices.map(async x => {
                    if (x.quantity == closest) {
                        vprice = x.price * product.quantity;
                        product.price = vprice;
                        product.mrp = data.mrp * product.quantity;
                        // console.log("closest vprice", product.name, vprice, data.mrp, product.quantity);
                        LOGGER('addcart', `closest vprice: ${vprice} , product:${product.name}`);
                        LOGGER('addcart', `data.mrp: ${data.mrp}`);
                        LOGGER('addcart', `product.quantity: ${product.quantity}`);
                        LOGGER('addcart', `product.mrp: ${product.mrp}`);
                    }
                })
            })
            //console.log("clossest quantity", closest, "prodquantity", product.quantity);
        }
    } else {
        console.log("variant qunatity 0");
    }
    if (product.cart_type == "sasta") {
        //console.log("IF SASTA CART -----------------------------------");
        vprice = product.variant.sasta_price * product.quantity;
        // console.log("vprice", vprice);
        product.price = vprice;
        product.mrp = variant.mrp * product.quantity;

    }
    console.log("vprice-------------------------------", vprice);
    return parseFloat(vprice.toFixed(2));
}

async function getVendorDetails(vendor) {
    var nosql = new Agent();
    var json = {}
    if (vendor == 'shop-sasta') {
        nosql.select('delivery', 'configuration').make(function (builder) {
            builder.where('configurationName', 'Delivery')
            builder.first()
        })
        var delivery = await nosql.promise('delivery')
        json.delivery_details = delivery.configurationDetails;
        nosql.select('deliveryCharges', 'configuration').make(function (builder) {
            builder.where('configurationName', 'Delivery_Charges')
            builder.first()
        })
        var deliveryCharges = await nosql.promise('deliveryCharges')
        json.delivery_charges = deliveryCharges.configurationDetails
        return json;
    } else {
        nosql.select('vendor', 'admin_users').make(function (builder) {
            builder.where('name', vendor);
            builder.fields('delivery_details', 'delivery_charges', 'shipping_by');
            builder.first();
        })
        var vendor = await nosql.promise('vendor');
        return vendor
    }

}


// function to calculate the discounts
async function groupCartItems() {
    var self = this;
    var body = self.body;
    var decoded = self.token;
    var nosql = new Agent();
    var { cart, err } = await FetchExistingCart(decoded.phone);
    var deliveryTypes = [];

    var result = [];
    var summary = {
        subTotal: 0,
        delivery_charges: 0,
        total: 0
    };
    var eachDeliveryType;

    // delivery type functionality
    for (let i = 0; i < cart.products.length; i++) {
        var product = cart.products[i];
        if (deliveryTypes.indexOf(product.delivery_type) == -1) {
            if (product.delivery_type == 'shop-sasta') {
                deliveryTypes.unshift(product.delivery_type);
            } else {
                deliveryTypes.push(product.delivery_type);
            }

        }
    }
    console.log("delivery", deliveryTypes);
    for (let j = 0; j < deliveryTypes.length; j++) {
        var obj = {};

        eachDeliveryType = deliveryTypes[j];
        obj.vendor = eachDeliveryType;
        obj.vendorDetails = await getVendorDetails(eachDeliveryType);
        obj.items = [];
        obj.subTotal = 0;
        obj.delivery_charges = 0;

        for (let k = 0; k < cart.products.length; k++) {
            const eachProduct = cart.products[k];

            if (eachProduct.delivery_type == eachDeliveryType) {
                obj.subTotal += eachProductPriceCalculation(eachProduct);

                obj.items.push(eachProduct);
            }
        }
        // check 
        if (obj.vendorDetails && obj.vendorDetails.delivery_charges && obj.vendorDetails.delivery_charges.min_order_amount &&
            obj.subTotal < parseInt(obj.vendorDetails.delivery_charges.min_order_amount)) {
            if (obj.vendorDetails.shipping_by == 'vendor') {
                obj.delivery_charges = parseInt(obj.vendorDetails.delivery_charges.delivery_charge);
                obj.vendorDetails.delivery_charges.delivery_charge = parseInt(obj.vendorDetails.delivery_charges.delivery_charge);
            } else {
                obj.delivery_charges = parseInt(obj.vendorDetails.delivery_charges.delivery_charges);
                obj.vendorDetails.delivery_charges.delivery_charges = parseInt(obj.vendorDetails.delivery_charges.delivery_charges);
            }
        } else {
            obj.delivery_charges = 0;
        }

        obj.total = obj.subTotal + parseInt(obj.delivery_charges);
        summary.subTotal += parseFloat(obj.subTotal.toFixed(2));
        summary.delivery_charges += obj.delivery_charges;
        summary.total += parseFloat(obj.total.toFixed(2));
        // console.log("SUBBBBBBBBBBBBTTTTTTTT",obj.total);
        // console.log("SUBBBBBBBBBBBBDekuved",obj.delivery_charges);
        result.push(obj);
    }
    // update cart with summary data

    nosql.update('updateCart', 'cart').make(function (builder) {
        builder.set('summary', summary);
        builder.set('json', JSON.stringify(result))
        builder.where('id', decoded.phone);
    })

    var updatecart = await nosql.promise('updateCart');
    self.json({ data: result, summary: summary });
}

// function to calculate the discounts
async function removeDiscounts() {
    var self = this;
    var body = self.body;
    var decoded = self.token;
    var nosql = new Agent();
    if (body.is_checkout = true) {
        // remove discounts
        await updateCouponFunc(decoded.phone);
        nosql.update('updatecart', 'cart').make(function (builder) {
            builder.set('wallet_amount', 0);
            builder.set('is_wallet', false);
            builder.set('is_norush', false);
            builder.set('is_checkout', true);
            builder.where('id', decoded.phone);
        });

        var updatecart = await nosql.promise('updatecart');
        if (updatecart > 0) {
            self.json({
                status: true
            })
        } else {
            self.json({
                status: false
            })
        }
    } else {
        self.json({
            status: false
        })
    }
}


// function to update the summary and cart product details when the product price is changed
async function updateCartWhenPriceChange(phone) {
    //console.log("updateCartWhenPriceChange function called ------------------");
    var nosql = new Agent();
    var { cart, err } = await FetchExistingCart(phone);
    var deliveryTypes = [];

    var result = [];
    var summary = {
        subTotal: 0,
        delivery_charges: 0,
        total: 0
    };
    var eachDeliveryType;

    // delivery type functionality
    for (let i = 0; i < cart.products.length; i++) {
        var product = cart.products[i];
        if (deliveryTypes.indexOf(product.delivery_type) == -1) {
            if (product.delivery_type == 'shop-sasta') {
                deliveryTypes.unshift(product.delivery_type);
            } else {
                deliveryTypes.push(product.delivery_type);
            }

        }
    }
    //console.log("delivery", deliveryTypes);
    for (let j = 0; j < deliveryTypes.length; j++) {
        var obj = {};

        eachDeliveryType = deliveryTypes[j];
        obj.vendor = eachDeliveryType;
        obj.vendorDetails = await getVendorDetails(eachDeliveryType);
        obj.items = [];
        obj.subTotal = 0;
        obj.delivery_charges = 0;

        for (let k = 0; k < cart.products.length; k++) {
            const eachProduct = cart.products[k];

            if (eachProduct.delivery_type == eachDeliveryType) {
                obj.subTotal += eachProductPriceCalculation(eachProduct);

                obj.items.push(eachProduct);
            }
        }
        // check 
        if (obj.vendorDetails && obj.vendorDetails.delivery_charges && obj.vendorDetails.delivery_charges.min_order_amount &&
            obj.subTotal < parseInt(obj.vendorDetails.delivery_charges.min_order_amount)) {
            if (obj.vendorDetails.shipping_by == 'vendor') {
                obj.delivery_charges = obj.vendorDetails.delivery_charges.delivery_charge;
            } else {
                obj.delivery_charges = obj.vendorDetails.delivery_charges.delivery_charges;
            }
        } else {
            obj.delivery_charges = 0;
        }

        obj.total = obj.subTotal + parseInt(obj.delivery_charges);
        summary.subTotal += obj.subTotal;
        summary.delivery_charges += obj.delivery_charges;
        summary.total += obj.total;
        // console.log("SUBBBBBBBBBBBBTTTTTTTT",obj.total);
        // console.log("SUBBBBBBBBBBBBDekuved",obj.delivery_charges);
        result.push(obj);
    }
    // update cart with summary data

    nosql.update('updateCart', 'cart').make(function (builder) {
        builder.set('summary', summary);
        builder.set('json', JSON.stringify(result))
        builder.where('id', phone);
    })

    var updatecart = await nosql.promise('updateCart');
}


// function to check the products stock and price of the cart before submitting order
async function cartConfirm() {
    //console.log("INSIDE CONFIRM CART API-==============================================")
    var self = this;
    var body = self.body;
    var nosql = new Agent();
    var decoded = self.token;
    var { cart, err } = await FetchExistingCart(decoded.phone);
    var outOfStockIds = [];
    if (err) {
        return self.json({ status: false, message: "Invalid Cart" });
    }
    for (let i = 0; i < body.length; i++) {
        var singleProduct = body[i];
        for (let j = 0; j < cart.products.length; j++) {
            var cartProduct = cart.products[j];
            // if product out of stock remove the product from cart
            if (singleProduct.statusCode == 'OUTOFSTOCK') {
                console.log("OUTOFSTOCK-------------------");
                if (cartProduct.cartId == `${singleProduct.pid}-${singleProduct.vid}`) {
                    outOfStockIds.push(singleProduct.pid);
                }
            }

            if (singleProduct.statusCode == 'PRICECHECKFAIL') {
                console.log("PRICE CHECK FAIL=======================");
                var { product, err } = await FetchProduct(singleProduct.id, singleProduct.variant.id);

                if (err || product == null) {
                    self.json({
                        status: false,
                        message: "Invalid Product"
                    })
                    return;
                }
                // console.log("product--------", product);
                if (cartProduct.cartId == `${product.id}-${product.variant.id}`) {
                    cart.products[j].variant.prices = product.variant.prices;
                }
            }
        }

    }


    console.log("outOfStockIds", outOfStockIds);
    // remove the out of stock products from cart
    for (let k = 0; k < outOfStockIds.length; k++) {
        var pid = outOfStockIds[k];
        var pindex = cart.products.findIndex(x => x.id == pid);
        //console.log("cart.products.indexOf(pid)",pindex)
        delete cart.products.splice(pindex, 1);
    }

    //  console.log("cart", cart.products);
    //  return;
    // update cart product
    cart.id = decoded.phone;
    nosql.update('updateCart', 'cart').make(function (builder) {
        builder.where('id', decoded.phone)
        builder.set('products', cart.products);
    })
    var updateCart = await nosql.promise('updateCart');
    var cartData = await processCart(cart);
    // console.log("cartData", cartData);
    // return;
    // nosql.update('updateCart', 'cart').make(function (builder) {
    //     builder.set('products', cart.products);
    //     builder.where('id', decoded.phone);
    // });
    // await nosql.promise('updateCart');

    // self.json({
    //     status: true,
    //     data: cartData
    // });
    //console.log("updateCart---------------------------->",updateCart)
    if (updateCart > 0) {
        await updateCartWhenPriceChange(decoded.phone)
        self.json({
            status: true,
            data: cartData
        });
    } else {
        self.json({
            status: false,
            data: []
        });
    }

}


// function to check the products stock and price of the cart before submitting order
async function verifyCart() {
    console.log("INSIDE VERIFY CART API -----------------------------------------")
    var self = this;
    var body = self.body;
    var decoded = self.token;
    var { cart, err } = await FetchExistingCart(decoded.phone);
    var data = await checkCartStock(body.pincode, cart);


    if (data.status == false) {
        return self.json(data);
    }
    var result = [];
    for (let i = 0; i < data.products.length; i++) {
        const productObj = data.products[i];
        var variant = productObj.variant;
        var obj = {};

        if (productObj.variant.stock == 0) {
            console.log("productObj.name", productObj.name);
            console.log("variant.title", productObj.variant.title);
            obj.statusCode = "OUTOFSTOCK";
            obj.productName = productObj.name;
            obj.pid = productObj.id;
            obj.vid = productObj.variant.id;
            obj.variantName = productObj.variant.title;
            obj.message = `${productObj.name}(${productObj.variant.title}) is out of stock`;
            result.push(obj);
        } else {
            obj = productObj
            obj.statusCode = "INSTOCK"

            // check price of the products with price and compare with db
            var { product, err } = await FetchProduct(obj.id, obj.variant.id);

            if (err || product == null) {
                self.json({
                    status: false,
                    message: "Invalid Product"
                })
                return;
            }
            //console.log("product", product);
            if (obj.id == product.id) {
                var vquantity = [];
                var vprices = [];
                for (let k = 0; k < product.variant.prices.length; k++) {
                    const price = product.variant.prices[k];
                    vquantity.push(price.quantity);
                    vprices.push(price.price);
                }

                // new logic start =================================

                if (vquantity.indexOf(obj.quantity) != -1) {
                    vquantity.sort(function (a, b) {
                        return a - b;
                    });
                    console.log("v quantity after sort", vquantity);
                    var priceIndex = vquantity.indexOf(obj.quantity);
                    //console.log("exact quantity", vquantity, "prodquantity", obj.quantity,obj.variant.prices);
                    obj.variant.prices.map(x => {
                        if (x.quantity == obj.quantity) {
                            //console.log("x.price",x.price ,"vprices[priceIndex]",vprices[priceIndex] , vprices);

                            if (x.price != vprices[priceIndex]) {
                                console.log("PRICES CHECK", "cart price", obj.name, x.price, "product price", vprices[priceIndex], "quantity", obj.quantity);
                                obj.statusCode = "PRICECHECKFAIL";
                                obj.message = `Price has been changed from  ₹${x.price} to  ₹${vprices[priceIndex]}  for ${productObj.name}`
                                obj.variant.prices[priceIndex].price = x.price;
                            } else {
                                console.log("PRICE NOT CHANGED---------");
                            }
                        }
                    })

                } else {
                    // console.log("CLOSEST QUANTITY==========================");
                    vquantity.sort(function (a, b) {
                        return a - b;
                    });
                    // console.log("v quantity after sort", vquantity);
                    var goal = obj.quantity; // 6

                    var closest = vquantity.find(e => e <= goal);
                    var priceIndex = vquantity.indexOf(closest);
                    // console.log("closest quantity", vquantity, "prodquantity", closest, "priceIndex", priceIndex);
                    obj.variant.prices.map(x => {
                        if (x.quantity == closest) {
                            console.log("XXXXPRICE ", x.price, "BBBBBBBBBB", vprices[priceIndex]);
                            if (x.price != vprices[priceIndex]) {
                                console.log("PRICES CHECK", "cart price", obj.name, x.price, "product price", vprices[priceIndex], "quantity", closest);
                                obj.statusCode = "PRICECHECKFAIL";
                                obj.message = `Price has been changed from  ₹${x.price} to  ₹${vprices[priceIndex]}  for ${productObj.name}`
                                obj.variant.prices[priceIndex].price = x.price;
                            } else {
                                console.log("PRICE NOT CHANGED---------");
                            }
                        }
                    })
                }

                // new logic end ===================================

            }
            //console.log(product);
            // variants.push(product.variant);
            result.push(obj);
        }
    }
    self.json(result);
}

async function cancelOrder() {
    var self = this;
    var body = self.body;
    var nosql = new Agent();
    // get order status
    //console.log("body-------------", body);
    nosql.select('getOrder', 'orders').make(function (builder) {
        builder.where('id', body.id);
        //builder.fields('status', 'wallet_amount', 'is_wallet', 'iduser', 'zip', 'id');
        builder.first();
    });
    var getOrder = await nosql.promise('getOrder');
    console.log("getOrder", getOrder);
    if (getOrder != null) {
        if (getOrder.status == 'Order Placed') {

            nosql.update('updateOrder', 'orders').make(function (builder) {
                builder.set('status', 'Cancelled');
                builder.set('cancelled_by', 'user');
                builder.where('id', body.id);
            });
            var updateOrder = await nosql.promise('updateOrder');
            console.log("updateOrder", updateOrder);
            console.log("getOrder.wallet_amount", getOrder.wallet_amount);
            if (getOrder.is_wallet) {
                nosql.select('walletGet', 'Users').make(function (builder) {
                    builder.where('phone', getOrder.iduser);
                    builder.fields('wallet_amount');
                    builder.first();
                })
                var walletGet = await nosql.promise('walletGet');
                console.log("walletGet----------------------------------------", walletGet);
                var updatedWallet = walletGet.wallet_amount + getOrder.wallet_amount;
                console.log("updatedWallet----------------------------------------", updatedWallet);
                // update the wallet amount
                nosql.update('walletUpdate', 'Users').make(function (builder) {
                    builder.where('phone', getOrder.iduser)
                    builder.set('wallet_amount', updatedWallet)
                })
                var walletUpdate = await nosql.promise('walletUpdate');
                //console.log("walletUpdate",walletUpdate);
                // add  data to user earnings
                var eachOrderEarning = {};
                eachOrderEarning.cashback_amount = getOrder.wallet_amount;
                eachOrderEarning.pincode = getOrder.zip;
                eachOrderEarning.phone = getOrder.iduser;
                eachOrderEarning.cashback_type = 'wallet';
                //eachOrderEarning.weekId = uuid;
                eachOrderEarning.type = 'Credit';
                eachOrderEarning.createdon = new Date();
                eachOrderEarning.description = `Wallet amount ₹${getOrder.wallet_amount} has been refunded for the order #${getOrder.id}`;


                nosql.insert('earning', 'user_earnings').make(function (builder) {
                    builder.set(eachOrderEarning)
                })

                await nosql.promise('earning');
            }
            if (updateOrder > 0) {
                //message = `Your order with Shop Sasta has been cancelled for more info click here http://3.6.90.124:9000/checkout/${body.id}`
                var template = "SS_Order_Cancelled"
                // stock revise
                await stockModule.OrderCancel(body.id);
                self.json({
                    status: true,
                    message: "Cancelled Successfully"
                })

                smsModule.sendSMS(body.phone, template, getOrder);
                getOrder.status = "Cancelled";
                var subject = `@(Order #)  ${getOrder.id} - Cancelled`;
                getOrder.email_msg = `Hi ${getOrder.name}, Your shopsasta order ${getOrder.number} is successfully cancelled. Ordered amount will be refunded in 7 working days if you paid online. Thanks for shopping with us!`;
                MAIL(getOrder.email, subject, '=?/mails/order', getOrder, "");

            } else {
                self.json({ status: false, message: "Cancel Fail" })
            }
        } else {
            return self.json({ status: false, message: "Sorry! You can't cancel this Order" })
        }
    } else {
        return self.json({ status: false, message: "Invalid Order" })
    }

}

// function to update the wallet amount and the coupon allocation
async function updateCart() {
    var self = this;
    var body = self.body;
    var nosql = new Agent();
    var JOB_ID = generateUuidModule.createUUID();

    var token = self.headers['x-auth'];
    if (token != null) {
        try {
            decoded = jwt.verify(token, JWT_SECRET_KEY);
            var { cart, err } = await FetchExistingCart(decoded.phone);
            console.log("err", err);
            if (cart != null) {
                // console.log("credits", credits);
                // cart update
                nosql.update('updateCart', 'cart').make(function (builder) {
                    builder.where('id', decoded.phone)
                    // builder.set('wallet_amount', credits);
                    builder.set('is_wallet', body.is_wallet)
                })
                var updateCart = await nosql.promise('updateCart');

                // create user trasaction table
                // var transactionObj = {
                //     userId: decoded.phone,
                //     transactionId: `${Date.now() + Math.random()}`,
                //     description: `Used for the purchase of order #${internalOrder.orderId}`,
                //     value: internalOrder.bill.creditsApplied * -1,
                //     timestamp: Date.now(),
                //     paymentDetails: {}
                // }

                self.json({
                    status: true,
                    message: "Success",
                    //data: processCart(cart)
                });
            } else {
                self.json({
                    status: false,
                    message: "Your Cart is empty"
                });
            }

        } catch (err) {
            console.log("err", err);
            self.json({
                status: false,
                message: "Something went wrong"
            });
        }
    }
}



async function deleteCoupon() {
    var self = this;
    var nosql = new Agent();
    var token = self.headers['x-auth'];
    var body = self.body;
    // token verify
    if (token != null) {
        try {
            decoded = jwt.verify(token, JWT_SECRET_KEY);
            console.log("decoded", decoded);
            var phone = decoded.phone;
            if (decoded != null) {
                nosql.select('getCartCoupon', 'cart').make(function (builder) {
                    builder.where('id', phone);
                    builder.first();
                });

                var getCartCoupon = await nosql.promise('getCartCoupon');
                // console.log("getCartCoupon", getCartCoupon);
                if (getCartCoupon != null) {
                    var coupon = "";
                    var discount = null;
                    nosql.update('updateCoupon', 'cart').make(function (builder) {
                        builder.set('coupon', coupon);
                        builder.set('discount', discount);
                        builder.set('is_coupon_applied', false);
                        builder.where('id', decoded.phone);
                    });

                    var updateCoupon = await nosql.promise('updateCoupon');
                    if (updateCoupon > 0) {
                        console.log("COUPON REMOVED");
                        self.json({
                            status: true,
                            message: "Coupon removed"
                        })
                    }
                } else {
                    self.json({
                        status: false,
                        message: "No coupon code found"
                    })
                }
            } else {
                self.throw401("Invalid Token");
            }
        } catch (err) {
            // err
            console.log("err", err);
            self.throw401("Invalid Token");
        }
    } else {
        self.throw401("Please provide token");
    }
}

async function verifyCoupon() {
    var self = this;
    var nosql = new Agent();
    var token = self.headers['x-auth'];
    var body = self.body;

    if (body.coupon == "" || body.coupon == null) {
        return self.json({
            status: false,
            message: "Coupon Code is invalid"
        })
    }
    // token verify
    if (token != null) {
        try {
            decoded = jwt.verify(token, JWT_SECRET_KEY);
            console.log("decoded", decoded);
            var phone = decoded.phone;
            if (decoded != null) {

                // get the coupons from list from the db
                var dbCoupons = await getCoupons();
                var couponsArr = [];

                // store the db coupons into array
                for (let i = 0; i < dbCoupons.length; i++) {
                    var element = dbCoupons[i];
                    couponsArr.push(element.couponCode);
                }

                // if no coupons in db
                if (couponsArr.length == 0) {
                    return self.json({
                        status: false,
                        message: 'Coupon does not exist'
                    });
                }
                // if coupon in the db and the input coupon matches
                if (body.coupon != "" && couponsArr.indexOf(body.coupon) != -1) {

                    // fetching the cart data
                    var cart = await FetchExistingCart(phone);
                    var cartData = cart.cart;
                    if(cartData.totalPrice == 0) {
                        // remove the wallet from cart
                        nosql.update('updateCart', 'cart').make(function (builder) {
                            builder.set('wallet_amount', 0);
                            builder.where('id', phone);
                        })
                        await nosql.promise('updateCart');
                    }
                    
                    // get the coupon details from the db
                    nosql.select('getCouponCode', 'special_events').make(function (builder) {
                        builder.where('couponCode', body.coupon);
                        builder.first();
                    });

                    var getCouponCode = await nosql.promise('getCouponCode');
                    //console.log("getCouponCode=====", getCouponCode);

                    // date calculations for coupon
                    let st = new Date(getCouponCode.startDate);
                    st.setUTCHours(0, 0, 0, 0)
                    //console.log("st" , st.getFullYear() + '-' + (st.getMonth()+1) + '-' + st.getDate());
                    var stnew = new Date(st.getFullYear() + '-' + (st.getMonth() + 1) + '-' + st.getDate());
                    var ed = new Date(getCouponCode.endDate);
                    ed.setUTCHours(23, 59, 59, 999);
                    //console.log("ed" , ed.getFullYear() + '-' + (ed.getMonth()+1) + '-' + ed.getDate());
                    var ednew = new Date(ed.getFullYear() + '-' + (ed.getMonth() + 1) + '-' + ed.getDate());
                    var current = new Date();
                    var currentnew = new Date(current.getFullYear() + '-' + (current.getMonth() + 1) + '-' + current.getDate());


                    //console.log("cartData---------", cartData);
                    //console.log("stnew" , stnew , currentnew , ednew);
                    // Date expiration check
                    if (stnew <= currentnew && currentnew <= ednew) {

                        // If the type is precentage
                        if (getCouponCode.type == 'P') {
                            //console.log("If PERCENT");
                            if (cartData.SubTotal >= getCouponCode.orderMiniAmount) {
                                var offeramount = (cartData.SubTotal * getCouponCode.offerPercentage) / 100;
                                //console.log("offeramount", offeramount, "getCouponCode.offerMaxAmount", getCouponCode.offerMaxAmount);
                                if (offeramount <= getCouponCode.offerMaxAmount) {
                                    nosql.update('updateDiscount', 'cart').make(function (builder) {
                                        builder.set('coupon', body.coupon);
                                        builder.set('discount', offeramount);
                                        builder.set('is_coupon_applied', true);
                                        builder.where('id', phone);
                                    })
                                    var updateDiscount = await nosql.promise('updateDiscount');
                                    //console.log("updateDiscount-------------------", updateDiscount);
                                    self.json({
                                        status: true,
                                        message: 'offer value ' + offeramount,
                                        amount: offeramount
                                    })
                                }
                                else {
                                    nosql.update('updateDiscount', 'cart').make(function (builder) {
                                        builder.set('coupon', body.coupon);
                                        builder.set('discount', getCouponCode.offerMaxAmount);
                                        builder.set('is_coupon_applied', true);
                                        builder.where('id', phone);
                                    })
                                    var updateDiscount = await nosql.promise('updateDiscount');
                                    self.json({
                                        status: true,
                                        message: 'offer value ' + getCouponCode.offerMaxAmount,
                                        amount: getCouponCode.offerMaxAmount
                                    })
                                }

                            }
                            else {
                                self.json({
                                    status: false,
                                    message: 'order minimum value ' + getCouponCode.orderMiniAmount
                                })
                            }
                        }
                        else if (getCouponCode.type == 'A') { // if the type is Amount
                            console.log("cartData.SubTotal", cartData.SubTotal, getCouponCode.orderMiniAmount);
                            if (cartData.SubTotal >= getCouponCode.orderMiniAmount) {
                                var offeramount = getCouponCode.offerMaxAmount;
                                console.log("coupon valid. Offer Amount added")
                                nosql.update('updateDiscount', 'cart').make(function (builder) {
                                    builder.set('coupon', body.coupon);
                                    builder.set('discount', offeramount);
                                    builder.set('is_coupon_applied', true);
                                    builder.where('id', phone);
                                })
                                var updateDiscount = await nosql.promise('updateDiscount');
                                console.log("updateDiscount", updateDiscount);
                                if (updateDiscount > 0) {
                                    self.json({
                                        status: true,
                                        message: 'offer value ' + offeramount,
                                        amount: offeramount
                                    })

                                } else {
                                    self.json({
                                        status: false,
                                        message: "Dicsount update fail",
                                    })
                                }

                            }
                            else {
                                self.json({
                                    status: false,
                                    message: 'order minimum value ' + getCouponCode.orderMiniAmount
                                })
                            }
                        }
                    }
                    else { // if coupon expired
                        console.log("coupon expired")
                        self.json({
                            status: false,
                            message: 'Coupon does not exist'
                        })
                    }
                } else { // if coupon doesnt match with coupons present in db
                    return self.json({
                        status: false,
                        message: "No coupon code found"
                    })
                }

            } else {
                self.throw401("Invalid Token");
            }
        } catch (err) {
            // err
            console.log("err", err);
            self.throw401("Invalid Token");
        }
    } else {
        self.throw401("Please provide token");
    }
}

async function addWishlist() {
    var self = this;
    var nosql = new Agent();
    var JOB_ID = generateUuidModule.createUUID();

    if (self.body.product_id == null || self.body.product_id == '') {
        self.json({
            state: false,
            message: "invalid product_id"
        });
        return;
    }

    var token = self.headers['x-auth'];
    if (token != null) {
        try {

            decoded = jwt.verify(token, JWT_SECRET_KEY);

            nosql.select('wishlist', 'wishlist').make(function (builder) {
                builder.and();
                builder.where('user_id', decoded.phone);
                builder.where('product_id', self.body.product_id);
            });

            var wishlist = await nosql.promise('wishlist');

            console.log("WISHLIST_TRIGGER", JOB_ID, "WISHLIST-VERIFY", wishlist);

            if (wishlist.length != 0) {
                self.json({
                    state: false,
                    message: "Product already added to your wishlist"
                });
                return;
            }

            var obj = {
                id: UID(),
                user_id: decoded.phone,
                product_id: self.body.product_id,
                datecreated: new Date()
            };

            nosql.insert('AddWishlist', 'wishlist').make(function (builder) {
                builder.set(obj);
            });

            var wishlist = await nosql.promise('AddWishlist');

            self.json({
                state: true
            });



        } catch (err) {
            self.json({
                state: false,
                message: "Sorry some thing went wrong"
            });
            return;
        }
    }
}

async function getWishlist() {
    var self = this;
    var nosql = new Agent();
    var JOB_ID = generateUuidModule.createUUID();

    var token = self.headers['x-auth'];
    if (token != null) {
        try {

            decoded = jwt.verify(token, JWT_SECRET_KEY);
            var phone = decoded.phone;

            nosql.select('wishlist', 'wishlist').make(function (builder) {
                builder.where('user_id', decoded.phone);
                builder.fields('product_id');
            });

            var wishlist = await nosql.promise('wishlist');

            console.log("WISHLIST_TRIGGER", JOB_ID, "WISHLIST-VERIFY", wishlist);


            var products = [];

            for (var i = 0; i < wishlist.length; i++) {
                products.push(wishlist[i].product_id);
            }


            nosql.select('product', 'product').make(function (builder) {
                builder.in('id', products);
                builder.fields('id', 'mrp', 'linker', 'linker_category', 'linker_manufacturer', 'category', 'manufacturer', 'name', 'pricemin', 'priceold', 'isnew', 'istop', 'pictures', 'availability', 'datecreated', 'ispublished', 'signals', 'size', 'stock', 'color', 'purchase_type', 'ftrFeatures', 'ftrTransfer', 'product_type', 'prices', 'istvs', 'booking_type', 'payPrice');
            });

            var product = await nosql.promise('product');

            self.json(product);



        } catch (err) {
            console.log("WISHLIST_TRIGGER", JOB_ID, "WISHLIST-ERROR", err);
        }
    }
}

async function deleteWishlist() {
    var self = this;
    var nosql = new Agent();
    var JOB_ID = generateUuidModule.createUUID();

    var token = self.headers['x-auth'];
    if (token != null) {
        try {

            decoded = jwt.verify(token, JWT_SECRET_KEY);

            nosql.remove('wishlist', 'wishlist').make(function (builder) {
                builder.and();
                builder.where('user_id', decoded.phone);
                builder.where('product_id', self.body.product_id);
            });

            var wishlist = await nosql.promise('wishlist');
            console.log("DELETE_WISHLIST_TRIGGER", new Date().toISOString(), JOB_ID, wishlist);
            self.json({
                state: true
            });

        } catch (err) {
            self.json({
                state: false,
                message: "Something went wrong"
            });
        }
    }
}

function createNumber() {
    var seq = cryptoRandomString({ length: 7, type: 'numeric' });
    var date = new Date();
    date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate() + seq;
    //console.log("seq",parseInt(seq) , typeof(parseInt(seq)))
    var number = date.getFullYear() + '' + (date.getMonth() + 1) + '' + date.getDate() + '-' + seq;
    console.log("number", number);
    return number;
}
//createNumber()


async function fetchOrder() {
    var self = this;
    var nosql = new Agent();
    var JOB_ID = generateUuidModule.createUUID();
    var opt = self.query;
    var token = self.headers['x-auth'];
    if (token != null) {
        try {
            decoded = jwt.verify(token, JWT_SECRET_KEY);
            console.log("FETCH_ORDER_V2", JOB_ID, "decoded", decoded);
            var phone = decoded.phone;

            nosql.listing('order', 'orders').make(function (builder) {
                builder.where('iduser', phone);
                builder.sort("_id", 'desc');
                builder.page(opt.page || 1, opt.limit || 100);
            });

            var orders = await nosql.promise('order');
            self.json(orders);

        } catch (err) {
            console.log("fetchOrder", err);
            self.json(err);
        }
    }
}


/* create an api '/api/cart-verify' to check the price and stock check for the products in cart
1.check the stock for the products in cart
2.if stock is 0 send status false and and status code "OUTOFSTOCK",  data with the [product name , variant name , pid , vid] and message with - products out of stock

// need to discuss
3.compare with price for the products in cart and database 
4.If price does not match send status false with the message - price has updated for the respected products pls check.
*/

async function createOrder() {
    var self = this;
    var nosql = new Agent();
    var JOB_ID = generateUuidModule.createUUID();
    var no = NOSQL('orders');
    var userWalletAmount = 0;
    var discount = 0;
    var token = self.headers['x-auth'];
    if (token != null) {
        try {
            decoded = jwt.verify(token, JWT_SECRET_KEY);
            console.log("CREATE_ORDER_V2", JOB_ID, "decoded", decoded);
            var phone = decoded.phone;
            var { cart, err } = await FetchExistingCart(phone);
            // console.log("FetchExistingCartTTTTTTTTTTTTTTT", cart);
            console.log("CREATE_ORDER_V2", JOB_ID, "BODY", self.body);
            if(cart.products.length == 0) {
                return self.json({status: false, message:"Order Fail"})
            }


            const date = new Date();
            const zone = 'Asia/Kolkata';
            const datecreatedString = moment.tz(date, zone).format();

            let createdonDate = datecreatedString.split('T')[0].split('-')[2] + "-" + datecreatedString.split('T')[0].split('-')[1] + "-" + datecreatedString.split('T')[0].split('-')[0];
            console.log('IST Date : ', typeof (datecreatedString));
            //return;
            var pincodedata = await pincodeVerify.pincodeVerify(self.body.billingAddress.pinCode);
            console.log("pincode=========", pincodedata);
            let wid = "";
            if (pincodedata != "Invalid Pincode" || pincodedata != "Pincode not available") {
                wid = pincodedata.wid
            }
            let tempDelDate = new Date(self.body.expected_delivery_date);
            // var deliveryDate = `${tempDelDate.getDate()}-${tempDelDate.getMonth() + 1}-${tempDelDate.getFullYear()}`
            var deliveryDate = self.body.expected_delivery_date;
            var obj = {
                name: self.body.billingAddress.name || "",
                firstname: self.body.billingAddress.name || "",
                lastname: self.body.billingAddress.name || "",
                email: self.body.email || "",
                phone: phone || "",
                street: self.body.billingAddress.streetName,
                zip: self.body.billingAddress.pinCode || "",
                city: self.body.billingAddress.city || "",
                apartmentName: self.body.billingAddress.apartmentName || "",
                officeNum: self.body.billingAddress.officeNum || "",
                landmark: self.body.billingAddress.landmark || "",
                country: "IN",
                datecreated: new Date(),
                created_on: datecreatedString,
                createdon_maildate: createdonDate,
                iduser: phone,
                ispaid: false,
                iscod: false,
                internal_type: "waiting for update",
                tag: "wait",
                order_from: self.body.flag || "phone",
                search_name: self.body.billingAddress.name.toLowerCase(),
                area: self.body.billingAddress.areaDetails,
                //area: pincodedata != "Invalid Pincode" ? `${pincodedata.Districtname},${pincodedata.statename}` : "Invalid Pincode",
                deliveryAddress_json: self.body.billingAddress,
                wid: wid,
                // expected_delivery_date: deliveryDate,
                // expected_delivery_time: self.body.delivery_hrs || "1 PM - 5 PM"
            };


            //console.log("CREATE_ORDER_V2", JOB_ID, "FIRST_FILEDS", JSON.stringify(obj));

            obj.is_settled = false;
            obj.deliverycity = self.body.billingAddress.city || "";
            obj.deliverycountry = 'India';
            obj.deliveryfirstname = self.body.billingAddress.name || "";
            obj.deliverylastname = "";
            obj.deliveryphone = self.body.billingAddress.phone || "";
            obj.deliverystreet = self.body.billingAddress.streetName;
            obj.deliveryzip = self.body.billingAddress.pinCode || "";


            // if (cart.products.length == 1) {
            //     var PinelabsproductCode = cart.products[0].PinelabsproductCode;
            //     obj.product_code = PinelabsproductCode == undefined || PinelabsproductCode == "" ? "none" : PinelabsproductCode;
            // }

            //console.log("CREATE_ORDER_V2", JOB_ID, "SECOND_FILEDS", JSON.stringify(obj));

            obj.version = "V2";
            //obj.id = UID();
            //obj.items = cart.products;
            //console.log("cart-------------------------", cart);
            if (cart.is_coupon_applied == true) {
                discount = cart.discount;
                // obj.discount = cart.discount;
                // obj.coupon = cart.coupon;
                // obj.is_coupon_applied = true;
                console.log("COUPON DISCOUNT FIRST FETCH+++++++++++++++++++++++++++++", discount);
            }

            if (cart.is_wallet) {
                nosql.select('walletGet', 'Users').make(function (builder) {
                    builder.where('phone', decoded.phone);
                    builder.fields('wallet_amount');
                    builder.first();
                })
                var userwalletget = await nosql.promise('walletGet');
                userWalletAmount = userwalletget.wallet_amount;
                console.log("USER WALLET AMOUNT FIRST FETCH+++++++++++++++++++++++++++++", userWalletAmount);
            }


            var cartData;
            var eachDeliveryType;

            //console.log("CREATE_ORDER_V2", JOB_ID, "CART", JSON.stringify(obj));
            if (self.body.payment_type == 'cod' || self.body.payment_type == 'cashback') {
                console.log("INSIDE COD +++++++++++++++++++++++++");

                var deliveryTypes = [];
                // delivery type functionality
                for (let i = 0; i < cart.products.length; i++) {
                    var product = cart.products[i];
                    if (deliveryTypes.indexOf(product.delivery_type) == -1) {
                        deliveryTypes.push(product.delivery_type);
                    }
                }
                var orderIds = [];
                for (let i = 0; i < deliveryTypes.length; i++) {
                    eachDeliveryType = deliveryTypes[i];

                    obj.id = UID();
                    obj.items = [];
                    let totalSourcingPrice = 0;
                    for (let j = 0; j < cart.products.length; j++) {
                        const eachProduct = cart.products[j];
                        if (eachProduct.variant.souricing_price != undefined && eachProduct.delivery_type == eachDeliveryType) {
                            //console.log("eachProduct.variant.souricing_price0000000000000000000000",eachProduct.variant.souricing_price);
                            totalSourcingPrice += parseInt(eachProduct.variant.souricing_price) * eachProduct.quantity
                        }

                        if (eachProduct.delivery_type == eachDeliveryType) {
                            obj.items.push(eachProduct);
                        }
                    }

                    // sourcing price
                    obj.totalSourcingPrice = totalSourcingPrice;
                    //console.log("eachDeliveryType",eachDeliveryType,cart.delivery_info);

                    // calculate the prices for the shop sasta items
                    var cartprocess = { products: obj.items };
                    cartprocess.id = decoded.phone;
                    cartData = await processCart(cartprocess, false);

                    // delivery dates
                    for (let n = 0; n < cart.delivery_info.length; n++) {

                        const info = cart.delivery_info[n];

                        console.log("cart.delivery_info--", info.deliveryBy, "eachDeliveryType--", eachDeliveryType, "index", i)
                        if (info.deliveryBy == eachDeliveryType) {
                            console.log("ENETRED BOTH ARE MATCHING", info.deliveryBy, "eachDeliveryType--", eachDeliveryType, "index", i)
                            obj.expected_delivery_date = info.delivery_date;
                            obj.expected_delivery_time = info.delivery_time;
                            obj.totalShippingPrice = info.delivery_charges;
                            obj.deliveredBy = info.deliveryBy;
                            break;
                        } else {
                            console.log("ENETRED BOTH ARE NOT  MATCHING", info.deliveryBy, "eachDeliveryType--", eachDeliveryType, "index", i)
                            obj.expected_delivery_date = "";
                            obj.expected_delivery_time = "";
                            obj.totalShippingPrice = 0;
                            obj.deliveredBy = info.deliveryBy;
                        }
                    }

                    // for price calculations
                    const json = JSON.parse(cart.json);


                    for (let m = 0; m < json.length; m++) {
                        const element = json[m];
                        if (element.vendor == eachDeliveryType) {
                            obj.SubTotal = element.subTotal;
                            obj.price = element.total;
                            break;
                        } else {
                            console.log("Not MAtching");
                        }
                    }






                    // comment code ------------------------------------------------------------
                    // if (eachDeliveryType == 'shop-sasta') {

                    //     // obj.price = cart.ssTotalPrice + cart.ssMinOrderShippingPrice;
                    //     obj.price = cartData.totalPrice;
                    //     //obj.totalShippingPrice = cartData.ssMinOrderShippingPrice;
                    // } else {
                    //     obj.price = cartData.totalPrice;
                    //     //obj.totalShippingPrice = cartData.internalShippingPrice;
                    // }
                    // comment code -------------------------------------------------------------


                    //console.log("obj-----------", obj.price);

                    //////////////////// ========= CASHBACK CALCULATIONS START ========= ////////////////////////

                    var totalCashbackAmount = 0;
                    var totalDiscount = 0;

                    /////// IF DISCOUNT //////////
                    if (discount > 0) {
                        if (obj.price < discount) {
                            obj.discount = obj.price;
                            //console.log("PRICE LESS THAN DISCOUNT -------------------");
                            discount = discount - obj.price;
                            //console.log("OBJ.PRICE", obj.price, dicount);
                            obj.price = 0;
                            obj.coupon = cart.coupon;
                        } else {
                            obj.discount = discount;
                            obj.price = obj.price - discount;
                            //console.log("OBJ.PRICE", obj.price, discount);
                            discount = 0;
                            obj.coupon = cart.coupon;
                        }
                        totalDiscount += obj.discount;
                        obj.is_coupon_applied = true;
                    } else {
                        console.log("NO DISCOUNT +++++++++++++++++++++++++++++++++++");
                        obj.discount = 0;
                        obj.is_coupon_applied = false;
                        totalDiscount += obj.discount;
                    }

                    /////// IF DISCOUNT //////////

                    //////////////// ------------ WALLET CASHBACK CALC START ------------- /////////////////
                    if (userWalletAmount > 0) {
                        //obj.wallet_amount = userWalletAmount;

                        if (obj.price < userWalletAmount) {
                            // console.log("ORDER PRICEeeeeee---------------CAT 1",obj.price);
                            // console.log("WALLET AMOUNTttttttttt ----------------CAT 1",userWalletAmount);
                            userWalletAmount = userWalletAmount - obj.price;
                            obj.wallet_amount = obj.price;
                            obj.is_wallet = true;
                            obj.price = 0;

                            nosql.update('walletUpdate', 'Users').make(function (builder) {
                                builder.where('phone', decoded.phone)
                                builder.set('wallet_amount', userWalletAmount)
                            })
                            var walletUpdate = await nosql.promise('walletUpdate');
                            console.log("WALLET UPDATE -------", walletUpdate);
                            // add  data to user earnings
                            var eachOrderEarning = {};
                            eachOrderEarning.cashback_amount = obj.wallet_amount;
                            eachOrderEarning.pincode = obj.deliveryzip;
                            eachOrderEarning.phone = decoded.phone;
                            eachOrderEarning.cashback_type = 'wallet';
                            //eachOrderEarning.weekId = uuid;
                            eachOrderEarning.type = 'Debit';
                            eachOrderEarning.createdon = new Date();
                            eachOrderEarning.description = `You have used wallet amount ₹${obj.wallet_amount} for the order #${obj.id}`;


                            nosql.insert('earning', 'user_earnings').make(function (builder) {
                                builder.set(eachOrderEarning)
                            })

                            await nosql.promise('earning');
                            totalDiscount += obj.wallet_amount;
                        }

                        if (obj.price >= userWalletAmount) {
                            // console.log("ORDER PRICE---------------CAT 2",obj.price);
                            // console.log("WALLET AMOUNT ----------------CAT 2",userWalletAmount);
                            obj.price = obj.price - userWalletAmount;
                            obj.wallet_amount = userWalletAmount;
                            obj.is_wallet = true;
                            userWalletAmount = 0;
                            nosql.update('walletUpdate', 'Users').make(function (builder) {
                                builder.where('phone', decoded.phone)
                                builder.set('wallet_amount', 0)
                            })
                            var walletUpdate = await nosql.promise('walletUpdate');
                            //console.log("WALLET UPDATE -------", walletUpdate);
                            // add  data to user earnings
                            var eachOrderEarning = {};
                            eachOrderEarning.cashback_amount = obj.wallet_amount;
                            eachOrderEarning.pincode = obj.deliveryzip;
                            eachOrderEarning.phone = decoded.phone;
                            eachOrderEarning.cashback_type = 'wallet';
                            //eachOrderEarning.weekId = uuid;
                            eachOrderEarning.type = 'Debit';
                            eachOrderEarning.createdon = new Date();
                            eachOrderEarning.description = `You have used wallet amount ₹${obj.wallet_amount} for the order #${obj.id}`;


                            nosql.insert('earning', 'user_earnings').make(function (builder) {
                                builder.set(eachOrderEarning)
                            })

                            await nosql.promise('earning');
                            totalDiscount += obj.wallet_amount;
                        }

                    } else {
                        console.log("NO WALLET AMOUNT");
                        obj.is_wallet = false;
                        obj.wallet_amount = 0;
                        totalDiscount += obj.wallet_amount;
                    }
                    //////////////// ------------ WALLET CASHBACK CALC END ------------- /////////////////


                    // price caluculation on wuhich the cashbacks are calculated 
                    var newSubTotal = Math.abs(obj.SubTotal - totalDiscount);
                    var new_price = Math.min(newSubTotal, obj.price)
                //     console.log("obj.SubTotal", newSubTotal, "obj.price00",obj.price)
                //     console.log("new_price", new_price)
                // return;
                    /////////////// ------------ NO RUSH CASHBACK CALC START ------------- ////////////////
                    if (eachDeliveryType == 'shop-sasta') {
                        obj.norush_cashback = {};
                        obj.is_norush = self.body.nextweekdelivery;
                        if (self.body.nextweekdelivery) {
                            var noRushConfig = await getNoRushCashback();
                            var percent = parseInt(noRushConfig.cashback_percent);
                            var cashback_amount = parseInt(((percent / 100) * new_price));
                            console.log("NO RUSH CASHBACK AMOUNT:", cashback_amount);
                            // round down cashback amount

                            if (cashback_amount == 0) {
                                console.log("NO RUSH Cashback amount 0");
                                obj.norush_cashback.cashback_amount = 0;
                                obj.norush_cashback.percent = percent;
                            } else {
                                totalCashbackAmount += cashback_amount;
                                obj.norush_cashback.cashback_amount = cashback_amount;
                                obj.norush_cashback.percent = percent;
                                obj.norush_cashback.description = `You have earned NoRush cashback ₹${cashback_amount} for the order #${obj.id}`
                            }
                        } else {
                            obj.is_norush = false;
                            console.log("Not a noRush order");
                        }
                    } else {
                        obj.is_norush = false;
                    }

                    //////////////// ------------ NO RUSH CASHBACK CALC END ------------- ////////////////


                    //////////////// ------------ REFERRAL CASHBACK CALC START ------------- ////////////////
                    obj.referral_cashback = {};
                    var cashbackConfig = await getReferralCashback();
                    var userDetails = await userDetailsFunc(phone);
                    if (new_price >= parseInt(cashbackConfig.min_order_amount)) {
                        if (userDetails.referred_by) {
                            nosql.select('getReferaluser', 'Users').make(function (builder) {
                                builder.where('referal_code', userDetails.referred_by);
                                builder.first();
                                console.log("referral builder", builder.builder);
                            })
                            var getReferaluser = await nosql.promise('getReferaluser');
                            //console.log("getReferaluser", getReferaluser);
                            // return;
                            if (getReferaluser != null) {
                                var percent = cashbackConfig.referral_cashback_percent;
                                var cashback_amount = parseInt(((percent / 100) * new_price));
                                // round down cashback amount
                                console.log("REFERRAL CASHBACK AMOUNT: " + cashback_amount);
                                if (cashback_amount == 0) {
                                    console.log("REFERRAL Cashback amount 0");
                                    obj.referral_cashback.cashback_amount = 0;
                                    obj.referral_cashback.percent = percent;
                                } else {
                                    //totalCashbackAmount += cashback_amount;
                                    obj.referral_cashback.cashback_amount = cashback_amount;
                                    obj.referral_cashback.percent = percent;
                                    obj.referral_cashback.description = `You have earned referral cashback ₹${cashback_amount} ordered by ${userDetails.name}`
                                    
                                    //obj.referral_cashback.description = `${getReferaluser.name} earned referral cashback ₹${cashback_amount} from you for the order #${obj.id}`
                                }

                            } else {
                                console.log("NO REFERAL USER");

                            }
                        } else {
                            console.log("NO REFERAL USER")

                        }
                    } else {
                        console.log("MINIMUM ORDER AMOUNT FOR REFERRAL CASHBACK NOT MET");
                    }
                    //////////////// ------------ REFERRAL CASHBACK CALC END ------------- /////////////////

                    //////////////// ------------ SPECIAL EVENTS CASHBACK CALC START ------------- /////////////////
                    obj.special_event_cashback = {};
                    var specialEvents = await getSpecialEventCashback(obj.datecreated);
                    //console.log(orderDetails.datecreated ,"specialEvents",specialEvents);
                    if (specialEvents != "No Special Events") {

                        if (specialEvents.type == 'P') {
                            //console.log("If PERCENT");
                            if (new_price >= specialEvents.orderMiniAmount) {
                                var offeramount = (new_price * specialEvents.offerPercentage) / 100;
                                // console.log("offeramount", offeramount);
                                if (offeramount <= specialEvents.offerMaxAmount) {
                                    totalCashbackAmount += ~~offeramount;
                                    obj.special_event_cashback.cashback_amount = ~~offeramount;
                                    obj.special_event_cashback.percent = specialEvents.offerPercentage;
                                    obj.special_event_cashback.description = `You have earned ${specialEvents.event_name} special event cashback ₹${~~offeramount} for the order #${obj.id}`
                                }
                                else {
                                    totalCashbackAmount += ~~specialEvents.offerMaxAmount;
                                    obj.special_event_cashback.cashback_amount = ~~specialEvents.offerMaxAmount;
                                    obj.special_event_cashback.percent = specialEvents.offerPercentage;
                                    obj.special_event_cashback.description = `You have earned ${specialEvents.event_name} special event cashback ₹${~~specialEvents.offerMaxAmount} for the order #${obj.id}`
                                }
                                if (offeramount == 0) {
                                    obj.special_event_cashback.cashback_amount = 0;
                                    obj.special_event_cashback.percent = 0;
                                    console.log("Cashback amount 0");
                                }
                            }
                            else {
                                console.log("order minimum value" + specialEvents.orderMiniAmount);
                            }
                        }
                        if (specialEvents.type == 'A') { // if the type is Amount
                            console.log("If AMOUNT");
                            var cashback_amount = 0;
                            if (new_price >= specialEvents.orderMiniAmount) {
                                cashback_amount = specialEvents.offerMaxAmount;
                                if (cashback_amount == 0) {
                                    console.log("Cashback amount 0");
                                    obj.special_event_cashback.cashback_amount = 0;

                                } else {
                                    totalCashbackAmount += cashback_amount;
                                    obj.special_event_cashback.cashback_amount = cashback_amount;
                                    obj.special_event_cashback.description = `You have earned ₹${specialEvents.event_name} special event cashback ${cashback_amount} for the order #${obj.id}`
                                }
                            }
                            else {
                                console.log("order minimum value" + specialEvents.orderMiniAmount);
                            }
                        }
                    } else {
                        console.log("No Special Events");
                    }
                    //////////////// ------------ SPECIAL EVENTS CASHBACK CALC END ------------- /////////////////




                    /////////////////// =========  CASHBACK CALCULATIONS END ========= ////////////////////////
                    obj.total_cashback_amount = totalCashbackAmount;
                    obj.mrp = cartData.totalMrp;
                    obj.delivery_type = eachDeliveryType;
                    // obj.SubTotal = cartData.SubTotal;
                    obj.count = cartData.TotalQuantity;
                    obj.iscod = true;
                    obj.datecod = new Date();

                    /* delivery info
                    obj.delivery_info[eachdeliveryType] 
 
                    */


                    if (self.body.payment_type == 'cashback') {
                        obj.tag = "cashback";
                    } else {
                        obj.tag = "cod";
                    }

                    obj.number = createNumber();
                    obj.status = "Order Placed";


                    nosql.insert('order', 'orders').make(function (builder) {
                        builder.set(obj);
                    });

                    await nosql.promise('order');

                    var subject = `Order # ${obj.id} - Order Placed`;
                    obj.email_msg = `Hi ${obj.name}, Your shopsasta order ${obj.number} is
                     successfully placed. Your order will be delivered on ${obj.expected_delivery_date} between ${obj.expected_delivery_time}. Thanks for shopping with us!`;
                    MAIL(obj.email, subject, '=?/mails/order', obj, "");
                    await stockModule.OrderConfirm(obj.id);

                    // send sms to user
                    var template = "SS_Order_Confirmation";
                    smsModule.sendSMS(obj.iduser, template, obj);

                    orderIds.push({ id: obj.id, number: obj.number, amount: obj.price, deliveredBy: obj.delivery_type, data: obj });

                }

                console.log("ORDERDSID", orderIds.length);
                // remove items from the cart
                nosql.remove('cart', 'cart').make(function (builder) {
                    builder.where('id', decoded.phone);
                })
                await nosql.promise('cart');

                let tempObj = {
                    paymentType: "COD",
                    status: true,
                    orderIds: orderIds,
                    // amount: cart.totalPrice,
                    // deliveredBy: eachDeliveryType
                }

                return self.json({ status: true, data: tempObj });

            }

            if (self.body.payment_type == 'online') {
                cartData = await processCart(cart);
                if (cart.is_wallet) {
                    obj.is_wallet = true;
                    obj.wallet_amount = cart.wallet_amount;
                } else {
                    obj.is_wallet = false;

                }
                if (cart.is_coupon_applied == true) {
                    obj.discount = cart.discount;
                    obj.is_coupon_applied = true;
                    //console.log("COUPON DISCOUNT FIRST FETCH+++++++++++++++++++++++++++++", discount);
                } else {
                    obj.is_coupon_applied = false;
                    //obj.discount = cart.discount;
                }

                obj.totalPrice = cartData.totalPrice.toFixed(2);
                obj.price = cartData.totalPrice.toFixed(2);
                obj.totalShippingPrice = cartData.totalShippingPrice.toFixed(2);
                obj.SubTotal = cartData.SubTotal.toFixed(2);
                obj.count = cartData.TotalQuantity.toFixed(2);
                obj.mrp = cartData.totalMrp.toFixed(2);
                obj.is_norush = self.body.nextweekdelivery || false;
                obj.items = cart.products;
                obj.delivery_info = cart.delivery_info;
                obj.json = cart.json;
                //console.log("Obj--------------------------------------------------", obj)
                var transactionObj = {
                    "transactionid": createNumber(),
                    "orderid": [],
                    "order_json": JSON.stringify(obj),
                    "amount_paid": obj.totalPrice,
                    "transaction_type": "paytm",
                    "isSuccess": false,
                    "datecreated": new Date()
                }
                await transaction.saveOrderTransaction(transactionObj);
                self.json({ status: true, txnid: transactionObj.transactionid });


            }

        } catch (err) {
            console.log("CREATE_ORDER_V2", JOB_ID, "ORDER_ERROR", err);
            self.json({ cart: null, err: err });
        }
    }
}


async function paytm_process() {
    var paytmData = await getPaytmConfig();
    //paytm creds
    const MID = paytmData['PAYTM_MID'];
    const WEBSITE = paytmData['PAYTM_WEBSITE'];
    const INDUSTRY_TYPE_ID = paytmData['PAYTM_INDUSTRY_TYPE_ID'];
    const CHANNEL_ID = paytmData['PAYTM_CHANNEL_ID'];
    const CALLBACK_URL = F.config['PAYTM_CALLBACK_URL'];
    const CALLBACK_LINK_URL = F.config['PAYTM_CALLBACK_LINK_URL'];
    const CHECK_SUM_KEY = paytmData['PAYTM_CHECK_SUM_KEY'];
    const ORDER_SUBMIT_URL = F.config['PAYTM_ORDER_SUBMIT_URL'];
    const PAYTM_CALLBACK_COD_URL = F.config['PAYTM_CALLBACK_COD_URL'];
    // paytm creds

    var self = this;
    var transactionid = self.query.txnid;
    var nosql = new Agent();
    // get order transaction details
    nosql.select('getTransaction', 'transaction_details').make(function (builder) {
        builder.where("transactionid", transactionid);
        builder.first();
    });

    var transactionDetails = await nosql.promise('getTransaction');
    var orderjson = transactionDetails.order_json;
    var orderDetails = JSON.parse(orderjson);
    console.log("order deatils", orderDetails);
    var JOB_ID = generateUuidModule.createUUID();
    var paytmParams = {

        /* Find your MID in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys */
        "MID": MID,

        /* Find your WEBSITE in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys */
        "WEBSITE": WEBSITE,

        /* Find your INDUSTRY_TYPE_ID in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys */
        "INDUSTRY_TYPE_ID": INDUSTRY_TYPE_ID,

        /* WEB for website and WAP for Mobile-websites or App */
        "CHANNEL_ID": CHANNEL_ID,

        /* Enter your unique order id */
        "ORDER_ID": transactionid,

        /* unique id that belongs to your customer */
        "CUST_ID": orderDetails.phone + "",

        /* customer's mobile number */
        "MOBILE_NO": orderDetails.phone + "",

        /* customer's email */
        "EMAIL": orderDetails.email,

        /**
         * Amount in INR that is payble by customer
         * this should be numeric with optionally having two decimal points
         */
        "TXN_AMOUNT": orderDetails.totalPrice + "",

        /* on completion of transaction, we will send you the response on this URL */
        // "CALLBACK_URL" : "http://localhost:8000/order/paytm-return", //local
        //"CALLBACK_URL" : "http://13.232.26.24:8888/order/paytm-return", //dev

        "CALLBACK_URL": CALLBACK_URL, //prod

    };
    if (orderDetails.type == "link") {
        paytmParams["CALLBACK_URL"] = CALLBACK_LINK_URL;
    }


    console.log("PAYTM_PARAMS", JOB_ID, new Date().toISOString(), paytmParams);

    checksum_lib.genchecksum(paytmParams, CHECK_SUM_KEY, function (err, checksum) {

        /* for Staging */
        // var url = "https://securegw-stage.paytm.in/order/process";

        /* for Production */
        if (err) {
            console.log("ERROR ---------------------", err);
            return self.redirect('/cart-payment/' + transactionid + '/#PAYMENT_FAILED');
        }
        console.log("CHECK_SUM", JOB_ID, new Date().toISOString(), checksum);

        paytmParams.checksum = checksum;
        paytmParams.submit_url = ORDER_SUBMIT_URL;

        console.log("PAYTM_PARAMS", JOB_ID, new Date().toISOString(), paytmParams);

        self.layout('nolayout');
        self.view('paytm-test', paytmParams);
    });
}


async function paytm_cb() {
    var paytmData = await getPaytmConfig();
    //paytm creds
    const CHECK_SUM_KEY = paytmData['PAYTM_CHECK_SUM_KEY'];
    // paytm creds

    var self = this;
    console.log("paytmcallback", self.body);
    const checksum_lib = require('../modules/paytm-checksum');
    var nosql = new Agent();

    var paytmChecksum = "";


    var paytmParams = {};
    for (var key in self.body) {
        if (key == "CHECKSUMHASH") {
            paytmChecksum = self.body[key];
        }
        else {
            paytmParams[key] = self.body[key];
        }
    }
    var txn_id = paytmParams["ORDERID"];
    console.log("paytmChecksum", paytmChecksum);
    console.log("paytmParams-----------------", paytmParams);
    var isValidChecksum = checksum_lib.verifychecksum(paytmParams, CHECK_SUM_KEY, paytmChecksum);
    console.log("isValidChecksum", isValidChecksum);
    if (isValidChecksum) {
        console.log("Checksum Matched");
        // get the trnsaction details 
        nosql.select('getTransaction', 'transaction_details').make(function (builder) {
            builder.where("transactionid", txn_id);
            builder.first();
        });
        var transactionDetails = await nosql.promise('getTransaction');
        var orderjson = transactionDetails.order_json;
        var orderDetails = JSON.parse(orderjson);
        console.log("order deatils", orderDetails);
        if (paytmParams["STATUS"] == "TXN_SUCCESS" && paytmParams["TXNAMOUNT"] == orderDetails.price) {
            var mnosql = new Agent();
            // segregate the products by delievery type and push to production
            var ordersIds = await productsSegregateByDeliveryType(orderDetails, txn_id);
            await saveOrderTransactionUpdate(txn_id, "PAYTM-" + paytmParams["TXNID"], true, ordersIds);

            // for (let i = 0; i < ordersIds.length; i++) {
            //     const orderId = ordersIds[i];
            //     await stockModule.OrderConfirm(orderId);
            //     var subject = '@(Order #) ' + orderId.id;
            //     MAIL(orderDetails.email, subject, '=?/mails/order', orderDetails, "");
            // }


            self.layout('nolayout');
            self.view('~partials/payment-status', {
                paymentType: "ONLINE",
                status: true,
                orderIds: ordersIds,
                amount: paytmParams["TXNAMOUNT"],
                paytmRefId: paytmParams["TXNID"],
                shopsastaTxnId: txn_id
            });
            nosql.remove('cart', 'cart').make(function (builder) {
                builder.where('id', orderDetails.phone);
            })
            await nosql.promise('cart');
        }
        else {
            self.layout('nolayout');
            self.view('~partials/payment-failed', {
                paymentType: "ONLINE",
                status: true,
                amount: paytmParams["TXNAMOUNT"],
                errorMessage: paytmParams["RESPMSG"],
                shopsastaTxnId: txn_id
            });
            // await saveOrderTransactionUpdate(txn_id, "", false, "");
            // console.log("PAYMENT FAILEDDDDDDDDDDDDDDDDDDDDD");
            // self.redirect('/cart-payment/#PAYMENT_FAILED-' + txn_id);
        }
    }
    else {
        await saveOrderTransactionUpdate(txn_id, "", false, "");
        console.log("PAYMENT FAILEDDDDDDDDDDDDDDDDDDDDD ===================");
        self.layout('nolayout');
        self.view('~partials/payment-failed', {
            paymentType: "ONLINE",
            status: true,
            errorMessage: "Communication with Paytm Failed. Please try again later.",
            shopsastaTxnId: txn_id
        });
        // self.redirect('/cart-payment/#PAYMENT_FAILED-' + txn_id);
    }
}


async function processCart(cart, wallet_check = true) {
    //console.log("cart----------------------", cart);
    var nosql = new Agent();
    // get cart data for delivery charges calculations
    nosql.select('cartData', 'cart').make(function (builder) {
        builder.where('id', cart.id);
        builder.first()
    });

    var cartData = await nosql.promise('cartData');
    //console.log("cartData----------------------", cartData);
    // console.log("vid", vid);

    var totalShippingPrice = 0;
    var SubTotal = 0;
    var TotalQuantity = 0;
    var shippingPrice = 0;



    var ssTotalPrice = 0;
    var internalShippingPrice = 0;
    var totalMrp = 0;
    if (cart.products != undefined) {
        for (var i = 0; i < cart.products.length; i++) {
            var product = cart.products[i];
            var vquantity = [];
            var vpObj = [];
            var vprice = 0;
            //console.log("iddddddddd", product.id);
            LOGGER('addcart', `INSIDE process cart , product name: ${product.name}`);
            if (product.delivery_type != "shop-sasta" && product.shippingPrice != undefined) {
                //totalShippingPrice += product.shippingPrice;
                internalShippingPrice += product.shippingPrice;
            }

            //for (let j = 0; j < product.variant.length; j++) {   
            //console.log("inside for loop");
            //const variant = product.variant[j];
            const variant = product.variant;
            // console.log("element.id", element.id, vid);
            if (variant.id == product.variantId) {
                vpObj.push(variant);
                LOGGER('addcart', `Variant Object: ${JSON.stringify(vpObj)}`);
                for (let k = 0; k < variant.prices.length; k++) {
                    const price = variant.prices[k];
                    //console.log("prices and quants", price);
                    // WORK HERE -----------------------------------------------------------------------------------------------------------
                    vquantity.push(price.quantity);
                    // vprices.push(price.price);

                }
            }
            LOGGER('addcart', `Variant Quantities: ${vquantity}`);
            // }
            if (vquantity.length > 0) {
                // console.log("vquantity index", vquantity.indexOf(product.quantity));
                if (vquantity.indexOf(product.quantity) != -1) {
                    // console.log("exact quantity", vquantity, "prodquantity", product.quantity);
                    // var priceIndex = vquantity.indexOf(product.quantity);
                    // vprice = vprices[priceIndex]
                    vpObj.map(data => {
                        //console.log("data",data);

                        data.prices.map(async x => {
                            if (x.quantity == product.quantity) {
                                vprice = x.price * product.quantity;
                                product.price = parseFloat(vprice.toFixed(2));;
                                product.mrp = data.mrp * product.quantity;
                                //console.log("exact vprice", vprice, data.mrp, product.quantity);

                                LOGGER('addcart', `Exact quantity match vprice: ${vprice} , product:${product.name} `);
                                LOGGER('addcart', `data.mrp: ${data.mrp}`);
                                LOGGER('addcart', `product.quantity: ${product.quantity}`);
                                LOGGER('addcart', `product.mrp: ${product.mrp}`);
                            }
                        })
                    })

                } else {
                    // sorting array ascending
                    vquantity.sort(function (a, b) {
                        return a - b;
                    });
                    var goal = product.quantity; // 6

                    var closest = vquantity.reverse().find(e => e <= goal);

                    // console.log("vquantity", vquantity);
                    // console.log("vprices", vprices);
                    // console.log("vpObj", vpObj);

                    vpObj.map(data => {
                        //console.log("data",data);
                        data.prices.map(async x => {
                            if (x.quantity == closest) {
                                vprice = x.price * product.quantity;
                                product.price = parseFloat(vprice.toFixed(2));
                                product.mrp = data.mrp * product.quantity;
                                //console.log("closest vprice", product.name, vprice, data.mrp, product.quantity);
                                LOGGER('addcart', `closest vprice: ${vprice} , product:${product.name}`);
                                LOGGER('addcart', `data.mrp: ${data.mrp}`);
                                LOGGER('addcart', `product.quantity: ${product.quantity}`);
                                LOGGER('addcart', `product.mrp: ${product.mrp}`);
                            }
                        })
                    })
                    //console.log("clossest quantity", closest, "prodquantity", product.quantity);
                }
            } else {
                console.log("variant qunatity 0");
            }
            if (product.cart_type == "sasta") {
                //console.log("IF SASTA CART -----------------------------------");
                vprice = product.variant.sasta_price * product.quantity;
                // console.log("vprice", vprice);
                product.price = parseFloat(vprice.toFixed(2));
                product.mrp = variant.mrp * product.quantity;

            }
            if (product.delivery_type == 'shop-sasta') {
                //console.log("IF SHOP SASTA-------");
                ssTotalPrice = ssTotalPrice + vprice;
            }
            SubTotal += vprice;
            TotalQuantity += product.quantity;
            totalMrp += product.mrp;
        }

    }
    var deliveryCharges = await getSSDeliveryCharges();

    //console.log("deliveryCharges", deliveryCharges);
    var ssMinOrderShippingPrice = 0;
    // console.log("ssTotalPrice --------------------------------", ssTotalPrice);
    // console.log("cart.delivery_info",cart.delivery_info)
    
    if (cartData != null && (cartData.summary != undefined || cartData.summary != null)) {
       // console.log("INSIDE PROCESS CART DELIVERY CHARGES-------------------------");
        // delivery charges 
        totalShippingPrice = cartData.summary.delivery_charges;
        SubTotal = cartData.summary.subTotal;
        total = cartData.summary.total;
    }

    // if (ssTotalPrice > 0) {
    //     if (ssTotalPrice < deliveryCharges.min_order_amount) {
    //         totalShippingPrice = parseFloat(totalShippingPrice) + parseFloat(deliveryCharges.delivery_charges);
    //         ssMinOrderShippingPrice = parseFloat(deliveryCharges.delivery_charges);
    //     }
    // }
    // console.log("cart.wallet_amount  ======================================", cart.wallet_amount);
    // console.log("cart.discount  ======================================", cart.discount);
    if (wallet_check && cart.wallet_amount > 0 && cart.discount > 0) {
        cart.totalPrice = parseFloat(((totalShippingPrice + SubTotal) - (cart.wallet_amount) - (cart.discount)).toFixed(2));
        console.log("IF WALLET AND COUPON--------", "totalPrice",cart.totalPrice);
        console.log( "S",SubTotal, "TS",totalShippingPrice,"W",cart.wallet_amount,"D",cart.discount);
        cart.TotalQuantity = TotalQuantity;
        cart.SubTotal = parseFloat(SubTotal.toFixed(2));
        cart.totalShippingPrice = parseFloat(totalShippingPrice.toFixed(2));

        cart.internalShippingPrice = parseFloat(internalShippingPrice.toFixed(2));
        cart.ssMinOrderShippingPrice = parseFloat(ssMinOrderShippingPrice.toFixed(2));
        cart.ssTotalPrice = parseFloat(ssTotalPrice.toFixed(2));
        cart.totalMrp = parseFloat(totalMrp.toFixed(2));
        cart.totalSavings = parseFloat((cart.totalMrp - cart.SubTotal).toFixed(2));
    } else if (cart.discount > 0) {
        
        cart.totalPrice = parseFloat(((totalShippingPrice + SubTotal) - (cart.discount)).toFixed(2));
        console.log("IF ONLY COUPON---------","totalPrice",cart.totalPrice);
        console.log( "S",SubTotal, "TS",totalShippingPrice,"W",cart.wallet_amount,"D",cart.discount);
        cart.TotalQuantity = TotalQuantity;
        cart.SubTotal = parseFloat((SubTotal).toFixed(2));
        cart.totalShippingPrice = parseFloat((totalShippingPrice).toFixed(2));

        cart.internalShippingPrice = parseFloat((internalShippingPrice).toFixed(2));
        cart.ssMinOrderShippingPrice = parseFloat((ssMinOrderShippingPrice).toFixed(2));
        cart.ssTotalPrice = parseFloat((ssTotalPrice - (cart.discount)).toFixed(2));
        cart.totalMrp = parseFloat(totalMrp.toFixed(2));
        cart.totalSavings = parseFloat((cart.totalMrp - cart.SubTotal).toFixed(2));

    } else if (wallet_check && cart.wallet_amount > 0) {
        
        //cart.totalPrice = parseFloat(((totalShippingPrice + SubTotal) - (cart.wallet_amount)).toFixed(2));
        cart.totalPrice = parseFloat(((totalShippingPrice + SubTotal) - (cart.wallet_amount)).toFixed(2));
        console.log("IF ONLY WALLET--------","totalPrice",cart.totalPrice);
        console.log( "S",SubTotal, "TS",totalShippingPrice,"W",cart.wallet_amount,"D",cart.discount);
        cart.TotalQuantity = TotalQuantity;
        cart.SubTotal = parseFloat(SubTotal.toFixed(2));
        cart.totalShippingPrice = parseFloat(totalShippingPrice.toFixed(2));

        cart.internalShippingPrice = parseFloat(internalShippingPrice.toFixed(2));
        cart.ssMinOrderShippingPrice = parseFloat(ssMinOrderShippingPrice.toFixed(2));
        cart.ssTotalPrice = parseFloat(ssTotalPrice.toFixed(2));
        cart.totalMrp = parseFloat(totalMrp.toFixed(2));
        cart.totalSavings = parseFloat((cart.totalMrp - cart.SubTotal).toFixed(2));
    } else {
        totalShippingPrice = parseFloat(totalShippingPrice);
        cart.totalPrice = parseFloat((parseFloat(totalShippingPrice) + parseFloat(SubTotal)).toFixed(2));
        console.log("IF NO WALLET AND COUPON-------", "totalPrice",cart.totalPrice);
        console.log( "S",SubTotal, "TS",totalShippingPrice,"W",cart.wallet_amount,"D",cart.discount);
        cart.TotalQuantity = TotalQuantity;
        cart.SubTotal = parseFloat(SubTotal.toFixed(2));
        cart.totalShippingPrice = parseFloat(totalShippingPrice.toFixed(2));

        cart.internalShippingPrice = parseFloat(internalShippingPrice.toFixed(2));
        cart.ssMinOrderShippingPrice = parseFloat(ssMinOrderShippingPrice.toFixed(2));
        cart.ssTotalPrice = parseFloat(ssTotalPrice.toFixed(2));
        cart.totalMrp = parseFloat(totalMrp.toFixed(2));
        cart.totalSavings = parseFloat((cart.totalMrp - cart.SubTotal).toFixed(2));

    }
    console.log("cart", cart.totalPrice);
    return cart;
}

async function FetchExistingCart(phone) {
    //console.log("FETCH EXIXTING CART BEGIN------------------------ ");
    var nosql = new Agent();

    nosql.select('cart', 'cart').make(function (builder) {
        builder.where('id', phone);
        builder.first()
    });
    try {
        var cart = await nosql.promise('cart');

        return { cart: await processCart(cart), err: null };
    } catch (err) {
        return { cart: null, err: err };
    }

}

async function FetchProduct(id, vid) {
    var nosql = new Agent();
    //console.log("id", id)
    nosql.select('getProduct', 'product').make(function (builder) {
        builder.where('id', id);
        builder.and();
        builder.fields('name', 'id', 'shippingPrice', 'pictures', 'stock', 'ftrBrand', 'offerdesc', 'iscod',
            'ispickup', 'stock', 'PinelabsproductCode', 'linker', 'bajaj_model_code', 'variant', 'delivery_type','gst');
        builder.first();
    });
    try {
        var product = await nosql.promise('getProduct');
        // if (product.stock == 0) {
        //     return { product: "Product Out of Stock", err: null }
        // }
        //console.log("productsssssssss", product);
        for (let i = 0; i < product.variant.length; i++) {
            var variant = product.variant[i];
            if (variant.id == vid) {
                product.variant = variant;
            }
        }
        if (product.shippingPrice == null) {
            product.shippingPrice = 0
        }
        // if (product.payPrice == null) {
        //     product.payPrice = 0
        // }
        // console.log("product",product);
        return { product: product, err: null };
    } catch (err) {
        return { product: null, err: err };
    }

}

// function to check the entire cart stock
async function checkCartStock(pincode, cart) {
    var nosql = new Agent();
    var stock = 0;
    nosql.select('getpincode', 'pincodes').make(function (builder) {
        builder.where('pincode', pincode);
        builder.first();
    })

    var getpincode = await nosql.promise('getpincode');
    if (getpincode != null) {
        if (getpincode.wid != "notAllocated") {
            var wid = getpincode.wid;
            for (let k = 0; k < cart.products.length; k++) {
                const product = cart.products[k];
                var pid = product.id;
                //console.log("pid =========================", pid);

                const variant = product.variant;
                var vid = variant.id;
                //console.log("vid ////////////////////////", vid);
                var mongoClient = new Agent();
                mongoClient.select('getwstock', 'warehouse_stock').make(function (builder) {
                    builder.where('variant_id', vid);
                    builder.and();
                    builder.where('warehouse_id', wid);
                    builder.and();
                    builder.where('product_id', pid);
                });
                var getwstock = await mongoClient.promise('getwstock');
                // console.log("getwstock",getwstock);
                if (getwstock.length > 0) {
                    if (getwstock[0].variant_id == vid) {
                        //console.log("hellooo",vid);
                        stock = getwstock[0].stock;
                        //console.log("stock",stock);
                        variant.stock = getwstock[0].stock;
                    } else {
                        console.log("VARIANT ID DOES NOT MATCH");
                    }
                } else {
                    variant.stock = stock;
                }

            }
            return cart;
        } else {
            return { // if pincode is not attached to the warehouse
                status: false,
                message: "Pincode is not available for delivery"
            }
        }
    } else { // if pincode is invalid
        return {
            status: false,
            message: "Pincode is not available for delivery"
        }
    }
}

// function to check the product stock while adding into cart
async function checkproductStock(pincode, pid, vid, quantity) {
    console.log("checkproductStock ============================================================");
    var nosql = new Agent();
    nosql.select('getpincode', 'pincodes').make(function (builder) {
        builder.where('pincode', pincode);
        builder.first();
    })
    var getpincode = await nosql.promise('getpincode');
    if (getpincode != null) {
        if (getpincode.wid != "notAllocated") {
            var wid = getpincode.wid;
            //console.log('wid',wid);
            nosql.select('getwstock', 'warehouse_stock').make(function (builder) {
                builder.where('variant_id', vid);
                builder.and();
                builder.where('warehouse_id', wid);
                builder.and();
                builder.where('product_id', pid);
            });
            var getwstock = await nosql.promise('getwstock');
            //console.log('vid',vid, 'pid',pid, 'wid',wid);
            //console.log("getwstock",getwstock);
            if (getwstock.length > 0) {
                if (getwstock[0].variant_id == vid) {
                    //console.log("hellooo",vid);
                    var stock = getwstock[0].stock;
                    console.log("stock---------------------------", stock, "quantity", quantity);
                    if (stock == 0) {
                        return { // if stock is 0 
                            status: false,
                            message: "Product Out of stock, please select another delivery address."
                        }
                    }
                    if (stock >= quantity) {
                        console.log(pid, "Product Stock available")
                        return {
                            status: true
                        }
                    } else {
                        return { // if stock is 0 
                            status: false,
                            message: "Product Out of stock, please select lower quantity."
                        }
                    }

                } else {
                    console.log("VARIANT ID DOES NOT MATCH");
                    return { // if stock is 0 
                        status: false,
                        message: "Product Out of stock, please select another delivery address."
                    }
                }
            } else {
                return { // if stock is 0 
                    status: false,
                    message: "Pincode is not available for delivery"
                }
            }
        } else {
            return { // if pincode is not attached to the warehouse
                status: false,
                message: "Pincode is not available for delivery"
            }
        }
    } else { // if pincode is invalid
        return {
            status: false,
            message: "Pincode is not available for delivery"
        }
    }
}

async function addCart() {
    var JOB_ID = generateUuidModule.createUUID();
    console.log("ADD CART API TRIGGERED-----------", JOB_ID);
    var self = this;
    var body = self.body;
    var obj = {};
    // obj.id = UID();

    //var phoneNo = obj.phoneNo; 
    // var productId = obj.productId;
    // var productPrice =  obj.productPrice;

    obj.products = [];


    var token = self.headers['x-auth'];

    if (token != null) {
        try {
            decoded = jwt.verify(token, JWT_SECRET_KEY);
            console.log("decoded", decoded);
            obj.id = decoded.phone;

            if (decoded != null) {


                var { cart, err } = await FetchExistingCart(decoded.phone, body.variantId);
                var cartId = body.productId + '-' + body.variantId;

                var mongoClient = new Agent();
                // add cart
                var payment_type = "normal";

                if (cart == null) {
                    console.log("ADD_CART", new Date().toISOString(), JOB_ID, "ADD NEW CART");
                    // productId
                    // Q
                    // Fetch Product By Id , Name, Shipping Price, Picture, payPrice, stock,  

                    var { product, err } = await FetchProduct(body.productId, body.variantId);

                    if (err || product == null) {
                        self.json({
                            status: false,
                            message: "Invalid Product"
                        })
                        return;
                    }

                    product.quantity = body.quantity;
                    product.variantId = body.variantId;
                    product.cartId = cartId;
                    if (body.cart_type == "sasta") {
                        console.log("IF SASTA PRODUCT -----------------------")
                        product.created_time = new Date();
                        product.variant.sasta_price = body.price
                        product.cart_type = "sasta";
                        product.cartId = "sasta-" + cartId;

                    }
                    console.log("product---------------", product.cartId);
                    obj.products.push(product);
                    obj.datecreated = new Date();
                    obj.dateupdated = new Date();
                    obj.payment_type = payment_type;
                    obj.status = "None";
                    obj.is_wallet = false;
                    obj.is_coupon_applied = false;
                    obj.is_checkout = false;
                    obj.is_norush = false;
                    mongoClient.insert('addCart', 'cart').make(function (builder) {
                        builder.set(obj);
                    });
                } else {
                    let itemIndex;
                    // update cart
                    if (body.cart_type == 'sasta') {
                        itemIndex = cart.products.findIndex(p => p.cartId == "sasta-" + cartId);
                    } else {
                        itemIndex = cart.products.findIndex(p => p.cartId == cartId);
                    }
                    console.log("itemIndex----------------------------", itemIndex);
                    LOGGER('addcart', cartId, `ItemIndex:${itemIndex}`);
                    if (itemIndex > -1) {
                        // if pay with bajaj is true
                        // product exists in cart
                        console.log("UPDATE_CART", new Date().toISOString(), JOB_ID, "UPDATE  EXISTING PRODUCT IN CART");
                        LOGGER('addcart', cartId, `UPDATE  EXISTING PRODUCT IN CART`);
                        var lineItems = [];
                        for (let i = 0; i < cart.products.length; i += 1) {
                            if (body.cart_type == "sasta") {
                                cartId = "sasta-" + body.productId + '-' + body.variantId;
                            }
                            if (cart.products[i].cartId == cartId) {
                                // console.log("cart.products[i].cartId", cart.products[i].cartId, "cartId", cartId)
                                // console.log("HEOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO", cart.products[i].quantity, body.quantity)
                                cart.products[i].quantity = Math.max(0, cart.products[i].quantity + body.quantity);
                                // console.log("cart.products[i].quantity", cart.products[i].quantity);
                                LOGGER('addcart', cartId, `UPDATE  EXISTING PRODUCT IN CART:${cart.products[i].name} , quantity:${cart.products[i].quantity}`);
                            }

                            if (cart.products[i].quantity >= 1) {
                                lineItems.push(cart.products[i]);
                            }

                            console.log("Math.sign(positive);", Math.sign(body.quantity));
                            if (Math.sign(body.quantity) == -1) {
                                console.log("NEGATIVE QUNATITY");
                            } else {
                                var stockCheck = await checkproductStock(body.pincode, body.productId, body.variantId, cart.products[i].quantity)
                                if (stockCheck.status == false) {
                                    console.log(`STOCK CHECK BLOCK -- ${body.pincode} -- ${body.productId} -- ${body.variantId} -- ${body.quantity}`);
                                    return self.json(stockCheck);
                                }
                            }



                            //console.log("stockCheck------------------", stockCheck);

                        }


                        cart.products = lineItems;
                        cart.payment_type = "normal";
                        cart.dateupdated = new Date();
                        mongoClient.update('updateCart', 'cart').make(function (builder) {
                            builder.set('products', cart.products);
                            builder.set('payment_type', payment_type);
                            builder.where('id', decoded.phone);
                        });
                        // console.log("lineItems",lineItems);
                    } else {
                        //product does not exists in cart, add new product
                        console.log("UPDATE_CART", new Date().toISOString(), JOB_ID, "ADD NEW PRODUCT IN CART");
                        var { product, err } = await FetchProduct(body.productId, body.variantId);
                        //console.log("product", product);

                        if (product == "Product Out of Stock") {
                            self.json({
                                status: false,
                                message: "Product Out of Stock"
                            })
                            return;
                        }
                        if (err || product == null) {
                            self.json({
                                status: false,
                                message: "Invalid Product"
                            })
                            return;
                        }

                        product.quantity = body.quantity;
                        product.variantId = body.variantId;
                        product.cartId = body.productId + '-' + body.variantId;
                        if (body.cart_type == "sasta") {
                            product.created_time = new Date();
                            product.variant.sasta_price = body.price;
                            product.cart_type = "sasta";
                            product.cartId = "sasta-" + body.productId + '-' + body.variantId;
                        }
                        //   console.log("product", product)
                        cart.products.push(product);
                        //  console.log("cart", cart.products);
                        cart.dateupdated = new Date();
                        mongoClient.update('updateCart', 'cart').make(function (builder) {
                            builder.set('products', cart.products);
                            builder.set('payment_type', payment_type);
                            builder.where('id', decoded.phone);
                        });
                    }

                }

                mongoClient.select('cart', 'cart').make(function (builder) {
                    builder.where('id', decoded.phone);
                    builder.first();
                });

                mongoClient.exec(async function (err, response) {
                    //console.log("res", res.updateCart);
                    if (err) {
                        self.json({
                            status: false,
                            message: "Unable to create cart"
                        })
                    } else {
                        var cartData = await processCart(response.cart, body.variantId);
                        //check the wallet amount
                        LOGGER('addcart', new Date(), `cartData: ${JSON.stringify(cartData)}`);
                        var walletAmount = 0;
                        var credits = 0;
                        if (response.cart.is_wallet) {
                            walletAmount = await getUserWalletAmount(decoded.phone);
                            console.log("walletAmount-----------------------------", walletAmount);
                            credits = Math.min(walletAmount, cartData.totalPrice);
                            console.log("credits-----------------------------------", credits);
                        } else if (response.cart.is_wallet == false) { // remove wallet amount from cart
                            credits = 0;
                        }

                        //console.log("credits", credits);
                        // cart update
                        var nosql = new Agent();
                        nosql.update('updateCart', 'cart').make(function (builder) {
                            builder.where('id', decoded.phone)
                            builder.set('wallet_amount', credits);
                            builder.set('is_wallet', response.cart.is_wallet)
                        });
                        await nosql.promise('updateCart');
                        nosql.select('getCart', 'cart').make(function (builder) {
                            builder.where('id', decoded.phone);
                            builder.first();
                        });
                        var getCart = await nosql.promise('getCart');

                        var message = "";
                        if (body.quantity > 0) {
                            message = "Added to the Cart Successfully";
                        } else {
                            message = "Removed Successfully from cart";
                        }
                        if (getCart.coupon != null || getCart.coupon != undefined) {
                            var couponverifyData = await updateCouponFunction(getCart);
                            //console.log("couponverifyData", couponverifyData);
                        }

                        //console.log("couponverifyData", couponverifyData);
                        self.json({
                            status: true,
                            message: message,
                            data: await processCart(getCart, body.variantId)
                        })

                    }
                });


            }
        } catch (err) {
            // err
            console.log("err", err);
            self.throw401("Invalid Token");
        }
    } else {
        self.throw401("Please provide token");
    }
}

// get wallet amount of the user
async function getUserWalletAmount(phone) {
    var nosql = new Agent();
    nosql.select('wallet', 'Users').make(function (builder) {
        builder.where('phone', phone);
        builder.fields('wallet_amount');
        builder.first();
    })
    var wallet = await nosql.promise('wallet');
    return wallet.wallet_amount;
}

async function getCart() {
    //console.log("GET CART API TRIGGERED --------------------");
    var self = this;
    var mnosql = new Agent();
    var token = self.headers['x-auth'];
    // token verify
    if (token != null) {
        try {
            decoded = jwt.verify(token, JWT_SECRET_KEY);
            //console.log("decoded", decoded);
            if (decoded != null) {
                mnosql.select('cart', 'cart').make(function (builder) {
                    builder.where('id', decoded.phone);
                    builder.first()
                })

                mnosql.exec(async function (err, response) {
                    console.log("MongoErr", err);

                    if (response.cart == null) {
                        self.json({
                            status: false,
                            message: "Your cart is empty"
                        })
                    } else { // update cart
                        var now = new Date();
                        // sasta product time check
                        for (let i = 0; i < response.cart.products.length; i++) {
                            var product = response.cart.products[i];
                            if (product.cart_type == 'sasta') {
                                var diff = Math.abs(product.created_time - now);
                                var minutes = Math.floor((diff / 1000) / 60);
                                console.log("minutes", minutes);
                                if (minutes > 30) {
                                    // remove the item from the cart
                                    console.log("Sasta Product removed------")
                                    response.cart.products.splice(i, 1);
                                }
                            }

                        }
                        var nosql = new Agent();
                        // update the cart 
                        nosql.update('updateCart', 'cart').make(function (builder) {
                            builder.where('id', decoded.phone)
                            builder.set('products', response.cart.products);
                        })
                        var updateCart = await nosql.promise('updateCart');
                        //console.log("response.cart",response.cart);

                        var cartData = await processCart(response.cart,false);


                        var walletAmount = 0;
                        var credits = 0;
                        if (response.cart.is_wallet) {
                            walletAmount = await getUserWalletAmount(decoded.phone);
                            console.log("walletAmount------------------------------", walletAmount, "total amount",cartData.totalPrice);
                            credits = Math.min(walletAmount, cartData.totalPrice);
                            console.log("credits-------------------------------------", credits);
                        } else if (response.cart.is_wallet == false) { // remove wallet amount from cart
                            credits = 0;
                        }

                        //console.log("credits", credits);
                        // cart update

                        nosql.update('updateCart', 'cart').make(function (builder) {
                            builder.where('id', decoded.phone)
                            builder.set('wallet_amount', credits);
                            builder.set('is_wallet', response.cart.is_wallet)
                        })
                        var updateCart = await nosql.promise('updateCart');
                        nosql.select('getCart', 'cart').make(function (builder) {
                            builder.where('id', decoded.phone);
                            builder.first();
                        });
                        var getCart = await nosql.promise('getCart');
                        if (getCart.coupon != null || getCart.coupon != undefined) {
                            var couponverifyData = await updateCouponFunction(getCart);
                            //console.log("couponverifyData", couponverifyData);
                        }


                        self.json({
                            status: true,
                            message: "Success",
                            data: await processCart(getCart)
                        })


                    }
                })
            }
        } catch (err) {
            // err
            console.log("err", err);
            self.throw401("Invalid Token");
        }
    } else {
        self.throw401("Please provide token");
    }
}

function deleteCart() {
    var self = this;
    var mnosql = new Agent();
    var token = self.headers['x-auth'];
    // token verify
    if (token != null) {
        try {
            decoded = jwt.verify(token, JWT_SECRET_KEY);
            console.log("decoded", decoded);
            if (decoded != null) {

                // removes entire cart
                mnosql.remove('cart', 'cart').make(function (builder) {
                    builder.where('id', decoded.phone);
                })

                // // removes specific product
                // mnosql.remove('cart', 'cart').make(function (builder) {
                //     builder.where('id', decoded.phone);
                //     builder.in('productId', self.body.productId);
                //     builder
                // })

                mnosql.exec(function (err, response) {
                    console.log("MongoErr", err);

                    if (response.cart == null) {
                        self.json({
                            status: false,
                            message: "Unable to clear"
                        })
                    } else { // update cart
                        self.json({
                            status: true,
                            message: "Success",
                            data: processCart(response.cart)
                        })
                    }
                })
            }
        } catch (err) {
            // err
            console.log("err", err);
            self.throw401("Invalid Token");
        }
    } else {
        self.throw401("Please provide token");
    }
}

async function updateReferalid(iduser) {
    var nosql = new Agent();
    var res = JSON.parse(fs.readFileSync(__dirname + '/../ExtraFunctions/referal.json'));
    //console.log("res", res);
    // return;
    res.forEach(element => {
        if (element['Mobile Number'] == iduser) {
            console.log("mobile number", element['Mobile Number']);
            nosql.update('updateOrder', 'orders').make(function (builder) {
                builder.set('referalId', element['Retailer Locality Area']);
                builder.where('iduser', element['Mobile Number'])
            });
            nosql.exec(function (err, response) {
                if (err) {
                    console.log("mongoerr", err);
                }
                console.log("response", response.updateOrder);

            });
        }

    });

}

async function updateCouponFunc(phone) {
    var nosql = new Agent();
    var coupon = "";
    var discount = null;
    nosql.update('updateCoupon', 'cart').make(function (builder) {
        builder.set('coupon', coupon);
        builder.set('discount', discount);
        builder.set('is_coupon_applied', false);
        builder.where('id', phone);
    });

    var updateCoupon = await nosql.promise('updateCoupon');
    if (updateCoupon > 0) {
        console.log("COUPON REMOVED");
    }
}


// to update the onetime coupon so that it cant be used again
async function updateOneTimeCoupon(coupon, orderid, phone) {
    var nosql = new Agent();
    nosql.update('updateCoupon', 'one_time_coupon').make(function (builder) {
        builder.set({
            'isActive': false,
            'orderid': orderid,
            'phone': phone,
            'dateused': new Date()
        });
        builder.where('coupon', coupon);
    });

    var updateCoupon = await nosql.promise('updateCoupon');
    if (updateCoupon > 0) {
        console.log("COUPON EXPIRED " + coupon);
    }
}

// function to get the regular coupons from coupon collection
async function getCoupons() {
    var nosql = new Agent();
    nosql.select('getCoupons', 'special_events').make(function (builder) {
        builder.where('isActive', true);
        builder.and();
        builder.where('eventType', "Instant");
        builder.and();
        builder.where('isCouponRequired', true);

    })
    var getCoupons = await nosql.promise('getCoupons');
    //console.log("getCoupons",getCoupons);
    return getCoupons;
}


// function to check the cart price and update the  regular coupon in the cart
async function cartPriceCheck(cartData, phone) {
    var output = {};
    var dbCoupons = await getCoupons();
    var couponMessage;
    for (let i = 0; i < dbCoupons.length; i++) {
        const element = dbCoupons[i];
        if (element.code == cartData.coupon) {
            couponMessage = element.description;
        }
    }
    if (cartData.totalPrice < 10000) {
        console.log("LESS THAN 10000");
        var updateCoupon = await updateCouponFunc(phone);
        return output = {
            status: true,
            message: "Success",
            data: cartData
        }
    } else if (cartData.products.length == 0) {
        console.log("NO PRODUCTS");
        var updateCoupon = await updateCouponFunc(phone);

        return output = {
            status: true,
            message: "Success",
            data: cartData
        }
    } else {
        return output = {
            status: true,
            message: "Success",
            data: cartData,
            couponMessage: couponMessage
        }
    }
}

// function to check the cart price and update the onetime coupon in the cart
async function cartPriceCheckForOnetime(cartData, phone) {
    var output = {};
    if (cartData.totalPrice < 10000) {
        console.log("LESS THAN 10000");
        var updateCoupon = await updateCouponFunc(phone);
        return output = {
            status: true,
            message: "Success",
            data: cartData
        }
    } else if (cartData.products.length == 0) {
        console.log("NO PRODUCTS");
        var updateCoupon = await updateCouponFunc(phone);
        return output = {
            status: true,
            message: "Success",
            data: cartData
        }
    } else {
        return output = {
            status: true,
            message: "Success",
            data: cartData
        }
    }
}

// function to check the regular coupon is reused while creating order
async function updateRegularCoupon(coupon, orderid, phone) {
    //console.log("inside updateRegularCoupon funtion");
    var nosql = new Agent();
    var output;
    nosql.select('getcouponExpiry', 'coupon_expiry_details').make(function (builder) {
        builder.where('id', phone);
        builder.where('coupon', coupon);
        builder.first();
    })

    var getcouponExpiry = await nosql.promise('getcouponExpiry');
    if (getcouponExpiry != null) {
        return output = {
            status: false,
            message: `${coupon} is already used`
        }
    } else {
        nosql.insert('update_RegularCoupon', 'coupon_expiry_details').make(function (builder) {
            builder.set({
                'id': phone,
                'orderid': orderid,
                'coupon': coupon,
                'dateused': new Date()
            });
        });

        var update_RegularCoupon = await nosql.promise('update_RegularCoupon');
        if (update_RegularCoupon != null) {
            console.log(`COUPON :${coupon} EXPIRED FOR USER ${phone}`);
        }
    }
}

// function to check the regular coupon is reused while verifying coupon
async function checkRegularCoupon(coupon, phone) {
    //console.log("inside updateRegularCoupon funtion");
    var nosql = new Agent();
    var output;
    nosql.select('getcouponExpiry', 'coupon_expiry_details').make(function (builder) {
        builder.where('id', phone);
        builder.where('coupon', coupon);
        builder.first();
    })

    var getcouponExpiry = await nosql.promise('getcouponExpiry');
    if (getcouponExpiry != null) {
        return output = {
            status: false,
            message: `${coupon} is already used`
        }
    }
}

async function getSSDeliveryCharges() {
    var nosql = new Agent();
    nosql.select('delivery', 'configuration').make(function (builder) {
        builder.where('configurationName', 'Delivery_Charges')
        builder.first();
    })
    var delivery = await nosql.promise('delivery');
    return delivery.configurationDetails;
}


async function saveOrderTransactionUpdate(txnid, refid, status, orderIds) {
    var JOB_ID = generateUuidModule.createUUID();
    var nosql = new Agent();
    console.log("txnid", txnid, "refid", refid, "status", status);
    if (status == true) {
        console.log("PAYTM SUCCESS------------------------------");
        nosql.update('updateTransaction', 'transaction_details').make(function (builder) {
            builder.set("transaction_type", "paytm");
            builder.set("reference_id", refid);
            builder.set("isSuccess", true);
            builder.set('orderid', orderIds)
            builder.set('dateupdated', new Date());
            builder.where("transactionid", txnid);
        });
        // action_type:bajaj_emi_pass_downpay_pending  in order

    } else {
        console.log("PAYTM FAILLLLLLL--------------------------------");
        nosql.update('updateTransaction', 'transaction_details').make(function (builder) {
            builder.set("isSuccess", false);
            builder.set("transaction_type", "paytm");
            builder.set("reference_id", "");
            builder.set('dateupdated', new Date());
            builder.where("transactionid", txnid);
        });
        // add action_type in order 
        // await updateOrderPaymentDetails(orderId[0], false)
    }


    var updateTransaction = await nosql.promise('updateTransaction');
    console.log("UPDATE PAYTM TRANSACTION DETAILS TRIGGERED ", JOB_ID, updateTransaction);
}

async function productsSegregateByDeliveryType(cart, txnid) {
    var deliveryTypes = [];
    var nosql = new Agent();
    var userWalletAmount = 0;
    var discount = 0;
    if (cart.is_coupon_applied == true) {
        discount = cart.discount;
        // obj.discount = cart.discount;
        // obj.coupon = cart.coupon;
        // obj.is_coupon_applied = true;
        console.log("COUPON DISCOUNT FIRST FETCH+++++++++++++++++++++++++++++", discount);
    }

    if (cart.is_wallet) {
        nosql.select('walletGet', 'Users').make(function (builder) {
            builder.where('phone', cart.iduser);
            builder.fields('wallet_amount');
            builder.first();
        })
        var userwalletget = await nosql.promise('walletGet');
        userWalletAmount = userwalletget.wallet_amount;
        console.log("USER WALLET AMOUNT FIRST FETCH+++++++++++++++++++++++++++++", userWalletAmount);
    }
    // delivery type functionality
    for (let i = 0; i < cart.items.length; i++) {
        var product = cart.items[i];
        if (deliveryTypes.indexOf(product.delivery_type) == -1) {
            deliveryTypes.push(product.delivery_type);
        }
    }
    // console.log("deliveryTypes",deliveryTypes);
    var orderIds = [];
    for (let i = 0; i < deliveryTypes.length; i++) {
        const eachDeliveryType = deliveryTypes[i];
        var items = [];
        var obj = {};
        obj.id = UID();
        let totalSourcingPrice = 0;
        for (let j = 0; j < cart.items.length; j++) {
            const eachProduct = cart.items[j];
            //console.log("eachProduct",eachProduct);
            if (eachProduct.variant.souricing_price != undefined && eachProduct.delivery_type == eachDeliveryType) {
                //console.log("eachProduct.variant.souricing_price0000000000000000000000",eachProduct.variant.souricing_price);
                totalSourcingPrice += parseInt(eachProduct.variant.souricing_price) * eachProduct.quantity
            }
            if (eachProduct.delivery_type == eachDeliveryType) {
                // console.log("eachDeliveryType",eachProduct.delivery_type);
                items.push(eachProduct);
            }
        }
        // sourcing price
        obj.totalSourcingPrice = totalSourcingPrice;
        // console.log("cart items", items);

        // delivery charges 
        for (let n = 0; n < cart.delivery_info.length; n++) {

            const info = cart.delivery_info[n];
            console.log("cart.delivery_info--", info.deliveryBy, "eachDeliveryType--", eachDeliveryType, "index", i)
            if (info.deliveryBy == eachDeliveryType) {
                console.log("ENETRED BOTH ARE MATCHING", info.deliveryBy, "eachDeliveryType--", eachDeliveryType, "index", i)
                obj.expected_delivery_date = info.delivery_date;
                obj.expected_delivery_time = info.delivery_time;
                obj.totalShippingPrice = info.delivery_charges;
                obj.deliveredBy = info.deliveryBy;
                break;
            } else {
                console.log("ENETRED BOTH ARE NOT  MATCHING", info.deliveryBy, "eachDeliveryType--", eachDeliveryType, "index", i)
                obj.expected_delivery_date = "";
                obj.expected_delivery_time = "";
                obj.totalShippingPrice = 0;
                obj.deliveredBy = info.deliveryBy;
            }
        }

        // for price calculations
        const json = JSON.parse(cart.json);


        for (let m = 0; m < json.length; m++) {
            const element = json[m];
            if (element.vendor == eachDeliveryType) {
                obj.SubTotal = element.subTotal;
                obj.price = element.total;
                break;
            } else {
                console.log("Not MAtching");
            }
        }


        // calculate the prices for the shop sasta items

        var cartprocess = { products: items };
        cartprocess.id = cart.iduser;
        var cartData = await processCart(cartprocess, false);
        // comment code ------------------------------------------------------------
        // if (eachDeliveryType == 'shop-sasta') {
        //     obj.price = cartData.totalPrice;
        //     //obj.totalShippingPrice = cartData.totalShippingPrice;
        // } else {
        //     obj.price = cartData.totalPrice;
        //     //obj.totalShippingPrice = cartData.totalShippingPrice;
        // }
        // comment code ------------------------------------------------------------

        console.log("obj-----------", obj.price);

        //////////////////// ========= CASHBACK CALCULATIONS START ========= ////////////////////////

        var totalCashbackAmount = 0;

        /////// IF DISCOUNT //////////
        if (discount > 0) {
            if (obj.price < discount) {
                obj.discount = obj.price;
                console.log("PRICE LESS THAN DISCOUNT -------------------");
                discount = discount - obj.price;
                console.log("OBJ.PRICE", obj.price, dicount);
                obj.price = 0;
                obj.coupon = cart.coupon;
            } else {
                obj.discount = discount;
                obj.price = obj.price - discount;
                console.log("OBJ.PRICE", obj.price, discount);
                discount = 0;
                obj.coupon = cart.coupon;
            }

            obj.is_coupon_applied = true;
        } else {
            //console.log("NO DISCOUNT +++++++++++++++++++++++++++++++++++");
            obj.discount = 0;
            obj.coupon = "";
            obj.is_coupon_applied = false;
        }

        /////// IF DISCOUNT //////////




        //////////////// ------------ WALLET CASHBACK CALC START ------------- /////////////////
        if (userWalletAmount > 0) {
            //obj.wallet_amount = userWalletAmount;

            if (obj.price < userWalletAmount) {
                // console.log("ORDER PRICEeeeeee---------------CAT 1",obj.price);
                // console.log("WALLET AMOUNTttttttttt ----------------CAT 1",userWalletAmount);
                userWalletAmount = userWalletAmount - obj.price;
                obj.wallet_amount = obj.price;
                obj.is_wallet = true;
                obj.price = 0;

                nosql.update('walletUpdate', 'Users').make(function (builder) {
                    builder.where('phone', decoded.phone)
                    builder.set('wallet_amount', userWalletAmount)
                })
                var walletUpdate = await nosql.promise('walletUpdate');
                console.log("WALLET UPDATE -------", walletUpdate);
                // add  data to user earnings
                var eachOrderEarning = {};
                eachOrderEarning.cashback_amount = obj.wallet_amount;
                eachOrderEarning.pincode = obj.deliveryzip;
                eachOrderEarning.phone = decoded.phone;
                eachOrderEarning.cashback_type = 'wallet';
                //eachOrderEarning.weekId = uuid;
                eachOrderEarning.type = 'Debit';
                eachOrderEarning.createdon = new Date();
                eachOrderEarning.description = `You have used wallet amount ₹${obj.wallet_amount} for the order #${obj.id}`;


                nosql.insert('earning', 'user_earnings').make(function (builder) {
                    builder.set(eachOrderEarning)
                })

                await nosql.promise('earning');
            }

            if (obj.price >= userWalletAmount) {
                // console.log("ORDER PRICE---------------CAT 2",obj.price);
                // console.log("WALLET AMOUNT ----------------CAT 2",userWalletAmount);
                obj.price = obj.price - userWalletAmount;
                obj.wallet_amount = userWalletAmount;
                obj.is_wallet = true;
                userWalletAmount = 0;
                nosql.update('walletUpdate', 'Users').make(function (builder) {
                    builder.where('phone', decoded.phone)
                    builder.set('wallet_amount', 0)
                })
                var walletUpdate = await nosql.promise('walletUpdate');
                console.log("WALLET UPDATE -------", walletUpdate);
                // add  data to user earnings
                var eachOrderEarning = {};
                eachOrderEarning.cashback_amount = obj.wallet_amount;
                eachOrderEarning.pincode = obj.deliveryzip;
                eachOrderEarning.phone = decoded.phone;
                eachOrderEarning.cashback_type = 'wallet';
                //eachOrderEarning.weekId = uuid;
                eachOrderEarning.type = 'Debit';
                eachOrderEarning.createdon = new Date();
                eachOrderEarning.description = `You have used wallet amount ₹${obj.wallet_amount} for the order #${obj.id}`;


                nosql.insert('earning', 'user_earnings').make(function (builder) {
                    builder.set(eachOrderEarning)
                })

                await nosql.promise('earning');
            }

        } else {
            console.log("NO WALLET AMOUNT");
            obj.is_wallet = false;
            obj.wallet_amount = 0;
        }
        //////////////// ------------ WALLET CASHBACK CALC END ------------- /////////////////


        // price caluculation on wuhich the cashbacks are calculated 
        var new_price = Math.min(obj.SubTotal, obj.price)


        /////////////// ------------ NO RUSH CASHBACK CALC START ------------- ////////////////
        obj.norush_cashback = {};
        if (cart.nextweekdelivery) {
            var noRushConfig = await getNoRushCashback();
            var percent = parseInt(noRushConfig.cashback_percent);
            var cashback_amount = parseInt(((percent / 100) * new_price));
            // round down cashback amount

            if (cashback_amount == 0) {
                console.log("NO RUSH Cashback amount 0");
                obj.norush_cashback.cashback_amount = 0;
                obj.norush_cashback.percent = percent;
            } else {
                totalCashbackAmount += cashback_amount;
                obj.norush_cashback.cashback_amount = cashback_amount;
                obj.norush_cashback.percent = percent;
                obj.norush_cashback.description = `You have earned NoRush cashback ₹${cashback_amount} for the order #${obj.id}`
            }
        } else {
            console.log("Not a noRush order");
        }
        //////////////// ------------ NO RUSH CASHBACK CALC END ------------- ////////////////


        //////////////// ------------ REFERRAL CASHBACK CALC START ------------- ////////////////
        obj.referral_cashback = {};
        var cashbackConfig = await getReferralCashback();
        var userDetails = await userDetailsFunc(cart.phone);
        if (new_price >= parseInt(cashbackConfig.min_order_amount)) {
            if (userDetails.referal_code) {
                nosql.select('getReferaluser', 'Users').make(function (builder) {
                    builder.where('referal_code', userDetails.referred_by);
                    builder.first();
                    console.log("referral builder", builder.builder);
                })
                var getReferaluser = await nosql.promise('getReferaluser');
                //console.log("getReferaluser", getReferaluser);
                // return;
                if (getReferaluser != null) {
                    var percent = parseInt(cashbackConfig.referral_cashback_percent);
                    var cashback_amount = parseInt(((percent / 100) * new_price));
                    // round down cashback amount

                    if (cashback_amount == 0) {
                        console.log("REFERRAL Cashback amount 0");
                        obj.referral_cashback.cashback_amount = 0;
                        obj.referral_cashback.percent = percent;
                    } else {
                        //totalCashbackAmount += cashback_amount;
                        obj.referral_cashback.cashback_amount = cashback_amount;
                        obj.referral_cashback.percent = percent;
                        obj.referral_cashback.description = `You have earned referral cashback ₹${cashback_amount} ordered by ${userDetails.name}`
                        //obj.referral_cashback.description = `${getReferaluser.name} earned referral cashback ₹${cashback_amount} from you for the order #${obj.id}`
                    }

                } else {
                    console.log("NO REFERAL USER");

                }
            } else {
                console.log("NO REFERAL USER")

            }
        } else {
            console.log("MINIMUM ORDER AMOUNT FOR REFERRAL CASHBACK NOT MET");
        }
        //////////////// ------------ REFERRAL CASHBACK CALC END ------------- /////////////////

        //////////////// ------------ SPECIAL EVENTS CASHBACK CALC START ------------- /////////////////
        obj.special_event_cashback = {};
        var specialEvents = await getSpecialEventCashback(new Date(cart.datecreated));
        //console.log(orderDetails.datecreated ,"specialEvents",specialEvents);
        if (specialEvents != "No Special Events") {

            if (specialEvents.type == 'P') {
                //console.log("If PERCENT");
                if (new_price >= specialEvents.orderMiniAmount) {
                    var offeramount = (new_price * specialEvents.offerPercentage) / 100;
                    //console.log("offeramount", offeramount);
                    if (offeramount <= specialEvents.offerMaxAmount) {
                        totalCashbackAmount += ~~offeramount;
                        obj.special_event_cashback.cashback_amount = ~~offeramount;
                        obj.special_event_cashback.percent = specialEvents.offerPercentage;
                        obj.special_event_cashback.description = `You have earned ${specialEvents.event_name} special event cashback ₹${~~offeramount} for the order #${obj.id}`
                    }
                    else {
                        totalCashbackAmount += ~~specialEvents.offerMaxAmount;
                        obj.special_event_cashback.cashback_amount = ~~specialEvents.offerMaxAmount;
                        obj.special_event_cashback.percent = specialEvents.offerPercentage;
                        obj.special_event_cashback.description = `You have earned ${specialEvents.event_name} special event cashback ₹${~~specialEvents.offerMaxAmount} for the order #${obj.id}`
                    }
                    if (offeramount == 0) {
                        obj.special_event_cashback.cashback_amount = 0;
                        obj.special_event_cashback.percent = 0;
                        console.log("Cashback amount 0");
                    }

                }
                else {
                    console.log("order minimum value" + specialEvents.orderMiniAmount);
                }
            }
            if (specialEvents.type == 'A') { // if the type is Amount
                console.log("If AMOUNT");
                var cashback_amount = 0;
                if (new_price >= specialEvents.orderMiniAmount) {
                    cashback_amount = specialEvents.offerMaxAmount;
                    if (cashback_amount == 0) {
                        console.log("Cashback amount 0");
                        obj.special_event_cashback.cashback_amount = 0;

                    } else {
                        totalCashbackAmount += cashback_amount;
                        obj.special_event_cashback.cashback_amount = cashback_amount;
                        obj.special_event_cashback.description = `You have earned ${specialEvents.event_name} special event cashback ₹${cashback_amount} for the order #${obj.id}`
                    }
                }
                else {
                    console.log("order minimum value" + specialEvents.orderMiniAmount);
                }
            }
        } else {
            console.log("No Special Events");
        }
        //////////////// ------------ SPECIAL EVENTS CASHBACK CALC END ------------- /////////////////




        /////////////////// =========  CASHBACK CALCULATIONS END ========= ////////////////////////

        obj.total_cashback_amount = totalCashbackAmount;
        obj.landmark = cart.landmark;
        obj.officeNum = cart.officeNum;
        obj.apartmentName = cart.apartmentName;
        obj.deliveryAddress_json = cart.deliveryAddress_json;
        obj.search_name = cart.name.toLowerCase();
        obj.name = cart.name;
        obj.firstname = cart.name;
        obj.lastname = cart.name;
        obj.email = cart.email;
        obj.phone = cart.phone;
        obj.street = cart.street;
        obj.zip = cart.zip;
        obj.city = cart.city;
        obj.country = "IN";
        obj.deliverycity = cart.deliverycity;
        obj.deliverycountry = 'India';
        obj.deliveryfirstname = cart.deliveryfirstname;
        obj.deliverylastname = cart.deliverylastname;
        obj.deliveryphone = cart.deliveryphone;
        obj.deliverystreet = cart.deliverystreet;
        obj.deliveryzip = cart.deliveryzip;
        obj.created_on = cart.created_on;
        obj.items = items;
        obj.mrp = cartData.totalMrp;
        obj.delivery_type = eachDeliveryType;
        // obj.SubTotal = cartData.SubTotal;
        obj.count = cartData.TotalQuantity;
        obj.ispaid = true;
        obj.datepaid = new Date();
        obj.tag = "paid";
        obj.number = createNumber();
        obj.status = "Order Placed";
        obj.txnid = txnid;
        obj.action_type = "paytm_done";
        obj.iduser = cart.iduser;
        obj.datecreated = new Date(cart.datecreated);
        obj.is_norush = cart.is_norush;
        obj.wid = cart.wid;
        obj.is_settled = false;
        // obj.expected_delivery_date = cart.expected_delivery_date;
        // obj.expected_delivery_time = cart.delivery_hrs || "1 PM - 5 PM"
        //console.log("cart", new Date(cart.datecreated));
        //return;
        nosql.insert('order', 'orders').make(function (builder) {
            builder.set(obj);
        });

        await nosql.promise('order');
        await stockModule.OrderConfirm(obj.id);
        // var deliveryDate = `${obj.expected_delivery_date.getDate()}-${obj.expected_delivery_date.getMonth()}-${obj.expected_delivery_date.getFullYear()}`
        var subject = `@(Order #)  ${obj.id} - Order Placed`;
        obj.email_msg = `Hi ${obj.name}, Your shopsasta order ${obj.number} is successfully placed. 
        Your order will be delivered on ${obj.expected_delivery_date} between ${obj.expected_delivery_time}. Thanks for shopping with us!`;
        MAIL(obj.email, subject, '=?/mails/order', obj, "");

        // send sms 
        var template = "SS_Order_Confirmation";
        smsModule.sendSMS(obj.iduser, template, obj);
        orderIds.push({ id: obj.id, number: obj.number, amount: obj.price, deliveredBy: obj.delivery_type });
    }

    return orderIds;
}


// function to get the paytm config data
async function getPaytmConfig() {
    var nosql = new Agent();
    nosql.select('getData', 'configuration').make(function (builder) {
        builder.where('configurationName', 'Paytm');
        builder.first();
    });
    var getData = await nosql.promise('getData');
    var json = getData.configurationDetails;
    //console.log("data",json)
    return json;
}

async function userDetailsFunc(id) {
    var mnosql = new Agent();
    mnosql.select('getUsers', 'Users').make(function (builder) {
        builder.where('phone', id);
        builder.first();
    })
    var getUsers = await mnosql.promise('getUsers');

    return getUsers;
}


// cashback configs get data

async function getReferralCashback() {
    var self = this;
    var nosql = new Agent();
    nosql.select('referral', 'configuration').make(function (builder) {
        builder.where('configurationName', 'Referral_Cashback');
        builder.first();
    });
    var referral = await nosql.promise('referral');
    var json = referral.configurationDetails;
    return json;
}

async function getSpecialEventCashback(orderDate) {
    var nosql = new Agent();
    nosql.select('special', 'special_events').make(function (builder) {
        var fromDt = orderDate.setUTCHours(0, 0, 0, 0);
        var toDt = orderDate.setUTCHours(23, 59, 59, 999);
        builder.query('startDate', {
            $lte: new Date(fromDt)
        });
        //builder.and()
        builder.query('endDate', {
            $gte: new Date(toDt)
        });
        builder.and()
        builder.where('eventType', 'Cashback');
        builder.first();
        //console.log("builder", builder.builder);
    });
    var special = await nosql.promise('special');
    //console.log("special", special);
    if (special != null) {
        return special;
    } else {
        return "No Special Events";
    }

}

async function getNoRushCashback() {
    var self = this;
    var nosql = new Agent();
    nosql.select('norush', 'configuration').make(function (builder) {
        builder.where('configurationName', 'No_Rush_Delivery');
        builder.first();
    });
    var norush = await nosql.promise('norush');
    var json = norush.configurationDetails;
    return json;
}


// function to verify coupon 
async function updateCouponFunction(cart) {
    //console.log("UPDATE COUPON CALCULATIONS FUNCTION CALLED --------------------------------");
    var nosql = new Agent();
    // fetching the cart data
    var cartData = await processCart(cart);
    //console.log("cartData.coupon", cartData.coupon);
    if (cartData.coupon == undefined || cartData.coupon == "") {
        return "Coupon code does not exist";
    }
    // get the coupon details from the db
    nosql.select('getCouponCode', 'special_events').make(function (builder) {
        builder.where('couponCode', cartData.coupon);
        builder.first();
    });

    var getCouponCode = await nosql.promise('getCouponCode');
    // console.log("getCouponCode========", getCouponCode);

    if (getCouponCode == null) {
        return "COUPON CODE IS NULL!!"
    }

    // date calculations for coupon
    let st = new Date(getCouponCode.startDate);
    st.setUTCHours(0, 0, 0, 0)
    //console.log("st" , st.getFullYear() + '-' + (st.getMonth()+1) + '-' + st.getDate());
    var stnew = new Date(st.getFullYear() + '-' + (st.getMonth() + 1) + '-' + st.getDate());
    var ed = new Date(getCouponCode.endDate);
    ed.setUTCHours(23, 59, 59, 999);
    //console.log("ed" , ed.getFullYear() + '-' + (ed.getMonth()+1) + '-' + ed.getDate());
    var ednew = new Date(ed.getFullYear() + '-' + (ed.getMonth() + 1) + '-' + ed.getDate());
    var current = new Date();
    var currentnew = new Date(current.getFullYear() + '-' + (current.getMonth() + 1) + '-' + current.getDate());


    //console.log("cartData---------", cartData);
    //console.log("stnew" , stnew , currentnew , ednew);
    // Date expiration check
    if (stnew <= currentnew && currentnew <= ednew) {
        var obj = {};
        // If the type is precentage
        if (getCouponCode.type == 'P') {
            //console.log("If PERCENT");
            if (cartData.SubTotal >= getCouponCode.orderMiniAmount) {
                var offeramount = (cartData.SubTotal * getCouponCode.offerPercentage) / 100;
                //console.log("offeramount", offeramount, "getCouponCode.offerMaxAmount", getCouponCode.offerMaxAmount);
                if (offeramount <= getCouponCode.offerMaxAmount) {
                    nosql.update('updateDiscount', 'cart').make(function (builder) {
                        //builder.set('coupon', body.coupon);
                        builder.set('discount', offeramount);
                        builder.set('is_coupon_applied', true);
                        builder.where('id', cartData.id);
                    })
                    var updateDiscount = await nosql.promise('updateDiscount');
                    //console.log("updateDiscount-------------------", updateDiscount);
                    return obj = {
                        status: true,
                        data: 'offer value ' + offeramount,
                        amount: offeramount
                    }
                }
                else {
                    nosql.update('updateDiscount', 'cart').make(function (builder) {
                        //builder.set('coupon', body.coupon);
                        builder.set('discount', getCouponCode.offerMaxAmount);
                        builder.set('is_coupon_applied', true);
                        builder.where('id', cartData.id);
                    })
                    var updateDiscount = await nosql.promise('updateDiscount');
                    return {
                        status: true,
                        data: 'offer value ' + getCouponCode.offerMaxAmount,
                        amount: getCouponCode.offerMaxAmount
                    }
                }

            }
            else {
                nosql.update('updateDiscount', 'cart').make(function (builder) {
                    //builder.set('coupon', body.coupon);
                    builder.set('discount', 0);
                    builder.set('is_coupon_applied', false);
                    builder.where('id', cartData.id);
                })
                var updateDiscount = await nosql.promise('updateDiscount');
                return obj = {
                    status: false,
                    data: 'order minimum value ' + getCouponCode.orderMiniAmount
                }
            }
        }
        else if (getCouponCode.type == 'A') { // if the type is Amount
            //console.log("cartData.SubTotal", cartData.SubTotal, getCouponCode.orderMiniAmount);
            if (cartData.SubTotal >= getCouponCode.orderMiniAmount) {
                var offeramount = getCouponCode.offerMaxAmount;
                console.log("coupon valid. Offer Amount added")
                nosql.update('updateDiscount', 'cart').make(function (builder) {
                    //builder.set('coupon', body.coupon);
                    builder.set('discount', offeramount);
                    builder.set('is_coupon_applied', true);
                    builder.where('id', cartData.id);
                })
                var updateDiscount = await nosql.promise('updateDiscount');
                console.log("updateDiscount", updateDiscount);
                if (updateDiscount > 0) {
                    return obj = {
                        status: true,
                        message: 'offer value ' + offeramount,
                        amount: offeramount
                    }

                } else {
                    return obj = {
                        status: false,
                        message: "Dicsount update fail",
                    }
                }
            }
            else {
                nosql.update('updateDiscount', 'cart').make(function (builder) {
                    //builder.set('coupon', body.coupon);
                    builder.set('discount', 0);
                    builder.set('is_coupon_applied', false);
                    builder.where('id', cartData.id);
                })
                var updateDiscount = await nosql.promise('updateDiscount');
                return obj = {
                    status: false,
                    message: 'order minimum value ' + getCouponCode.orderMiniAmount
                }
            }
        }
    }
    else { // if coupon expired
        console.log("coupon expired")
        return obj = {
            status: false,
            message: 'Coupon does not exist'
        }
    }
}










