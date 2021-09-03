var MONGO_DB_CONNECTION = process.env.MONGO_DB_CONNECTION || F.config['mongo'];;
var Agent = require('sqlagent/mongodb').connect(MONGO_DB_CONNECTION);
var async = require('async');
// productsgroup schema
NEWSCHEMA('productsGroup').make(function (schema) {
    schema.define('id', 'UID');
    schema.define('name', 'String');
    schema.define('productsList', '[String]');
    schema.define('type', 'String');


    // Saves the productGroup into the database
    schema.setSave(function ($) {
        var mnosql = new Agent();

        var model = $.model;
        var name = model.name;
        var productsList = model.productsList;
        var type = model.type;
        var isUpdate = !!model.id;

        if (isUpdate) {
            model.dateupdated = new Date();
            //model.adminupdated = user;
        } else {
            model.id = UID();
            model.datecreated = new Date();
            model.dateupdated = new Date();
            //model.admincreated = user;
        }


        if (isUpdate) {
            if (type == 'Related' || type == 'Compare') {
                if (model.productsList.length > 5) {
                    return $.invalid("Cant add more than five products")
                } else {
                    mnosql.update('productsGroup', 'productsGroup').make(function (builder) {
                        builder.set(model);
                        builder.where('id', model.id);
                    });
                }
            } else {
                mnosql.update('productsGroup', 'productsGroup').make(function (builder) {
                    builder.set(model);
                    builder.where('id', model.id);
                });
            }
        } else {
            if (type == 'Related' || type == 'Compare') {
                if (model.productsList.length > 5) {
                    return $.invalid("Cant add more than five products")
                } else {
                    mnosql.insert('productsGroup', 'productsGroup').make(function (builder) {
                        builder.set(model);
                    });
                }
            } else {
                mnosql.insert('productsGroup', 'productsGroup').make(function (builder) {
                    builder.set(model);
                });
            }
        }

        mnosql.exec(function (err, response) {
            if (err) {
                //console.log("MongoDBErr", err);
                return $.invalid(err);
            }
            //console.log("MongoDB", response.productsGroup); // response.user.identity (INSERTED IDENTITY)
            $.callback({ id: model.id });
        });

    });


    // Gets listing
    schema.setQuery(function ($) {

        var opt = $.options === EMPTYOBJECT ? $.query : $.options;
        //var isAdmin = $.controller ? $.controller.name === 'admin' : false;

        var mnosql = new Agent();
        mnosql.listing('productsGroup', 'productsGroup').make(function (builder) {
            builder.sort('dateupdated', 'desc');
            builder.page(opt.page || 1, opt.limit || 100);
        })

        mnosql.exec(function (err, response) {
            if (err) {
                //console.log("MongoDBErr", err);
                return $.invalid(err);
            }
            // console.log("MongoDB", response.ProductsGroup); // response.user.identity (INSERTED IDENTITY)
            //$.callback(response.productsGroup);

            var options = { id: [] };
            var products = []
            for (var i = 0, length = response.productsGroup.items.length; i < length; i++) {

                products.push(response.productsGroup.items[i].productsList);
                if (products.length == response.productsGroup.items.length) {
                    //console.log("products", products)
                    for (var j = 0; j < products.length; j++) {
                        products[j].forEach(element => {
                            options.id.push(element);
                        });
                    }
                }

            }

            // Get products details 
            $WORKFLOW('productsGroup', 'productsGet', options, function (err, res) {
                //console.log("response", res);
                // Some unexpected error
                if (err) {
                    $.invalid(err);
                    return;
                } else {
                    for (i = 0; i < response.productsGroup.items.length; i++) {
                        var item = response.productsGroup.items[i];
                        //console.log("item", item.productsList);
                        item.ProductData = [];
                        item.productsList.forEach(element => {
                            //console.log("element", element);

                            res.forEach(i => {
                                if (element == i.id) {
                                    item.ProductData.push(i);
                                }
                            })
                        });
                    }
                    $.callback(response.productsGroup);
                }
            })

        });
    });

    // Gets a specific product group
    schema.setGet(function ($) {
        console.log("-------------------------------------")
        var mnosql = new Agent();
        var options = $.options;
        var isAdmin = $.controller ? $.controller.name === 'admin' : false;

        mnosql.select('productsGroup', 'productsGroup').make(function (builder) {
            options.type && builder.where('type', options.type);
            options.id && builder.where('id', options.id);
            $.controller && $.controller.id && builder.where('id', $.controller.id);
            builder.first()
        })
        console.log("$.controller.id", $.controller.id);
        if (isAdmin) {
            //builder.callback($.callback, 'error-products-404');
            mnosql.exec(function (err, response) {
                console.log("MongoErr", err);
                if (err) {
                    return $.invalid(err);
                }
                var productsIds = [];
                var products = response.productsGroup.productsList;
                for (var i = 0; i < products.length; i++)
                    productsIds.push(products[i]);
                    var mnosql = new Agent();
                    mnosql.select('product', 'product').make(function (builder) {
                        //builder.fields('id', 'prices', 'reference', 'stock', 'name');
                        //builder.where('ispublished', true);
                        builder.in('id', productsIds)
                    })

                mnosql.exec(function (err, res) {
                    if (err) {
                        console.log("MongoErr", err);
                        return $.invalid(err);
                    }
                   // console.log("MongoResponseee", res.product);
                    response.productsGroup.productsData = res.product;
                    //$.callback(res.product)
                    $.callback(response.productsGroup);
                });
            });

        } else {
            mnosql.exec(function (err, res) {
                if (err) {
                    console.log("MongoErr", err);
                    return $.invalid(err);
                }
                //console.log("MongoResponseee", res.productsGroup);
                response.productsData = res.product
                $.callback(response.productsGroup);
            });
        }
    });

    // delete product group from database
    schema.setRemove(function ($) {
        var id = $.query.id;
        //var user = $.user.name;
        var mnosql = new Agent();
        console.log("id", id)
        // NOSQL('Slider').remove().where('id', id).callback(function () {
        //     $.success();
        //     // refresh_cache();
        // });
        mnosql.remove('productsGroup', 'productsGroup').make(function (builder) {
            builder.where('id', id);
        });

        mnosql.exec(function (err, response) {
            if (err) {
                console.log("mongoerr", err);
                return $.invalid(err);
            }
            console.log(response.productsGroup); // response.user.identity (INSERTED IDENTITY)
            $.success();
        });
    });

    // to get the product details
    schema.addWorkflow('productsGet', function ($) {
        var mnosql = new Agent();
        //console.log("iddddddddddddddddddddddddddd", $.options.id)
        var id = $.options.id || (($.query.id || '').split(','));
        if (id.length) {
            mnosql.select('product', 'product').make(function (builder) {
                builder.fields('id', 'name');
                // builder.where('ispublished', true);
                builder.in('id', id)
            })

            mnosql.exec(function (err, response) {
                if (err) {
                    console.log("MongoErr", err);
                    return $.invalid(err);
                }
                //console.log("MongoResponse", response.product);
                $.callback(response.product)
            })
        }
        //NOSQL('products').find().fields('id', 'prices', 'reference', 'stock', 'name').where('ispublished', true).in('id', id).callback($.callback);
        else {
            $.invalid('error-data');
        }
    });

})



