var MONGO_DB_CONNECTION = process.env.MONGO_DB_CONNECTION || F.config['mongo'];;
var Agent = require('sqlagent/mongodb').connect(MONGO_DB_CONNECTION);



NEWSCHEMA('Slider').make(function (schema) {
    schema.define('id', 'UID');
    schema.define('title', 'String(50)');
    schema.define('link', String);
    schema.define('target', String);
    schema.define('pictures', 'String');
    schema.define('active', Boolean);
    schema.define('datecreated', Date);
    schema.define('devicetype', String);
    schema.define('dateupdated', Date);
    schema.define('weight', Number);


    // gets listing
    schema.setQuery(function ($) {
        var opt = $.query;
        var mnosql = new Agent();
        console.log("sliderrrrrrrrrrrrrrrrrrrrrrrrrrrr");
        var filter;

        if (opt.active) {
            console.log("Active")
            mnosql.listing('slider', 'slider').make(function (builder) {
                builder.where('active', true);
                builder.sort('dateupdated', 'desc');
                // builder.sort('weight','desc');
                builder.page(opt.page || 1, opt.limit || 100);
            });

            //filter = mnosql('Slider').find().where('active', true);

        } else {
            mnosql.listing('slider', 'slider').make(function (builder) {
                builder.sort('dateupdated', 'desc');
                builder.page(opt.page || 1, opt.limit || 100);
            });
        }

        mnosql.exec(function (err, response) {
            if (err) {
                console.log("mongoerr", err);
                return $.invalid(err);
            }
            //console.log(response.slider); 
            $.callback(response.slider);
        });
    });

    // saves slider into database
    schema.setSave(function ($) {

        var model = $.model;
        var isUpdate = !!model.id;

        //var nosql = mnosql('Slider');
        var mnosql = new Agent();

        if (model.uid == '') {
            $.invalid('invalid-user');
            return;
        }
        //console.log("model", model);

        if (isUpdate) {
            model.dateupdated = new Date();
        } else {
            model.id = UID();
            model.datecreated = new Date();
            model.dateupdated = new Date();
        }

        if (isUpdate) {
            mnosql.update('slider', 'slider').make(function (builder) {
                builder.set(model);
                builder.where('id', model.id);
            });
        } else {
            mnosql.insert('slider', 'slider').make(function (builder) {
                builder.set(model);
            });
        }



        mnosql.exec(function (err, response) {
            if (err) {
                console.log("mongoerr", err);
                return $.invalid(err);
            }
            // console.log(response.slider); // response.log.identity (INSERTED IDENTITY)
            $.success(true, model.id);
        });

        //nosql.insert(model);

    });


    schema.addWorkflow('inactive', function ($) {
        var mnosql = new Agent();
        console.log("DELETE", $.query.id);

        mnosql.update('slider', 'slider').make(function (builder) {
            builder.set({ active: false });
            builder.where('id', $.query.id);
        });

        mnosql.exec(function (err, response) {
            if (err) {
                console.log("mongoerr", err);
                return $.invalid(err);
            }
            console.log(response.slider); // response.user.identity (INSERTED IDENTITY)
            $.success();
        });


    });


    schema.addWorkflow('active', function ($) {
        // ADMIN.notify({ type: 'subscribers.unsubscribe', message: $.query.email });
        console.log("DELETE", $.query.id);
        var mnosql = new Agent();
        //NOSQL('wishlist').modify({ active: false }).where('id', $.query.id);

        // NOSQL('Slider').modify({ active: true }).make(function (builder) {
        //     // builder.first(); --> modifies only the one document
        //     builder.where('id', $.query.id);

        //     builder.callback(function (err, count) {
        //         console.log('modified documents:', count);
        //         $.success();
        //     });
        // });
        mnosql.update('slider', 'slider').make(function (builder) {
            builder.set({ active: true });
            builder.where('id', $.query.id);
        });

        mnosql.exec(function (err, response) {
            if (err) {
                console.log("mongoerr", err);
                return $.invalid(err);
            }
            console.log(response.slider); // response.user.identity (INSERTED IDENTITY)
            $.success();
        });


    });

    schema.setRemove(function ($) {
        var id = $.query.id;
        //var user = $.user.name;
        var mnosql = new Agent();
        console.log("id", id)
        // NOSQL('Slider').remove().where('id', id).callback(function () {
        //     $.success();
        //     // refresh_cache();
        // });
        mnosql.remove('slider', 'slider').make(function (builder) {
            builder.where('id', id);
        });

        mnosql.exec(function (err, response) {
            if (err) {
                console.log("mongoerr", err);
                return $.invalid(err);
            }
            console.log(response.slider); // response.user.identity (INSERTED IDENTITY)
            $.success();
        });
    });

    // Gets a specific slider
    schema.setGet(function ($) {
        var mnosql = new Agent();

        mnosql.select('slider', 'slider').make(function (builder) {
            builder.where('id', $.options.id || $.id)
            builder.first()
        })

        mnosql.exec(function (err, response) {
            console.log("MongoErr", err);
            $.callback(response.slider);
        })

    });

});




