var MONGO_DB_CONNECTION = process.env.MONGO_DB_CONNECTION || F.config['mongo'];;
var Agent = require('sqlagent/mongodb').connect(MONGO_DB_CONNECTION);



NEWSCHEMA('media').make(function (schema) {
    schema.define('id', 'UID');
    schema.define('name', 'String');
    schema.define('key', 'String');
    schema.define('datecreated', Date);
    schema.define('dateupdated', Date);
    schema.define('type', 'String');

    // gets listing
    schema.setQuery(function ($) {
        var mnosql = new Agent();
        var opt = $.query;
        
        mnosql.listing('media', 'media').make(function (builder) {
            opt.name && builder.where('name', opt.name);
            opt.type && builder.where('type', opt.type);
            builder.sort('datecreated', 'desc')
            builder.page(opt.page || 1, opt.limit || 100);
        });

        mnosql.exec(function (err, response) {
            if (err) {
                console.log("mongoerr", err);
                return $.invalid(err);
            }
            //console.log(response.media);
             $.callback(response.media);
        });
    });


    // saves media into database
    schema.setSave(function ($) {
        var mnosql = new Agent();
        var model = $.model;
        var isUpdate = !!model.id;
        model.name = model.name.toLowerCase();

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
        }

        if (isUpdate) {
            mnosql.update('media', 'media').make(function (builder) {
                builder.set(model);
                builder.where('id', model.id)
            });
        } else {
            mnosql.insert('media', 'media').make(function (builder) {
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

    
    // delete media
    schema.setRemove(function ($) {
        var id = $.query.id;
        //var user = $.user.name;
        var mnosql = new Agent();
        console.log("id", id)

        mnosql.remove('media', 'media').make(function (builder) {
            builder.where('id', id);
        });

        mnosql.exec(function (err, response) {
            if (err) {
                console.log("mongoerr", err);
                return $.invalid(err);
            }
            console.log(response.media); // response.user.identity (INSERTED IDENTITY)
            $.success();
        });
    });

    //gets specific media
	schema.setGet(function ($) {
        var mnosql = new Agent();
        
		mnosql.select('media', 'media').make(function (builder) {
			builder.where('id', $.options.id || $.id)
			builder.first()
		})

		mnosql.exec(function (err, response) {
			console.log("MongoErr", err);
			$.callback(response.media);
		})

	});


});




