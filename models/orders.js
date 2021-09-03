// ====== Supported operations:
// "dashboard"  - gets stats

// ====== Supported workflows:
// "create"     - creates an order
// "paid"       - sets ispaid to true
// "clear"      - removes all orders
var MONGO_DB_CONNECTION = process.env.MONGO_DB_CONNECTION || F.config['mongo'];;
var Agent = require('sqlagent/mongodb').connect(MONGO_DB_CONNECTION);
var request = require('request');
var fs = require('fs');

NEWSCHEMA('OrderItem').make(function (schema) {
	schema.define('id', 'String(24)');
	schema.define('idvariant', 'UID');
	schema.define('price', Number);
	schema.define('name', 'String(50)', true);
	schema.define('reference', 'String(20)');
	schema.define('count', Number, true);
});

NEWSCHEMA('OrderStatus').make(function (schema) {
	schema.define('date', Date);
	schema.define('status', 'String(100)');
});

NEWSCHEMA('Order').make(function (schema) {

	schema.define('id', 'UID');
	schema.define('iduser', 'String');
	schema.define('number', 'String(10)');
	schema.define('status', 'String(100)');
	schema.define('statushistory', '[Object]');
	schema.define('delivery', 'String(50)');
	schema.define('payment', 'String(50)');
	schema.define('name', 'Capitalize(40)');
	schema.define('lastname', 'Capitalize(40)');
	schema.define('email', 'Email');
	schema.define('phone', 'Phone');
	schema.define('message', 'String(500)');
	schema.define('note', 'String(100)');
	schema.define('language', 'Lower(2)');
	schema.define('reference', 'String(50)');
	schema.define('trackingcode', 'String(50)');
	schema.define('discount', Number);
	schema.define('price', Number);
	schema.define('count', Number);
	schema.define('items', '[Object]');
	schema.define('firstname', 'Capitalize(40)');


	schema.define('company', 'String(40)');
	schema.define('companyid', 'String(15)');
	schema.define('companyvat', 'String(30)');

	schema.define('billingstreet', 'String(750)');
	schema.define('billingzip', 'String(150)');
	schema.define('billingcity', 'String(750)');
	schema.define('billingcountry', 'String(250)');


	schema.define('deliveryfirstname', 'String(150)');
	schema.define('deliverylastname', 'String(150)');
	schema.define('deliverystreet', 'String(750)');
	schema.define('deliveryzip', 'String(150)');
	schema.define('deliverycity', 'String(750)');
	schema.define('deliverycountry', 'String(150)');
	schema.define('deliveryphone', 'Phone');

	schema.define('pickupCity', 'String(50)');
	schema.define('pickupLocation', 'String(50)');

	schema.define('pickupAddress', 'String(50)');
	schema.define('pickupMobile', 'String(50)');
	schema.define('pickupState', 'String(50)');
	schema.define('pickupPincode', 'String(50)');

	schema.define('internal_type', String);
	schema.define('isRefEmpId', String);

	schema.define('istwohrs', Boolean);
	schema.define('iscompany', String);
	schema.define('isfinished', Boolean);
	schema.define('isemail', Boolean);              // internal
	schema.define('isnewsletter', Boolean);         // internal
	schema.define('ispaid', Boolean);
	schema.define('isterms', Boolean);              // internal
	schema.define('iscod', Boolean);
	schema.define('ispickup', Boolean);
	schema.define('taxid', String);
	schema.define('isbookingtype', Boolean);
	schema.define('isRefEmp', Boolean);
	schema.define('referalId', String);
	schema.define('uuid', String);
	schema.define('notification', Boolean);

	// Custom validaiton
	schema.required('company, companyvat, companyid', n => n.iscompany);

	schema.define('product_code', 'String');
	schema.define('delivery_logs', '[Object]');
	schema.define('delivery_status', Object);
	schema.define('delivery_track', '[Object]');
	schema.define('AWB', String);
	schema.define('coupon', String);
	schema.define('invoice_file', String);
	schema.define('delivery_type', 'String');

	// Sets default values
	schema.setDefault(function (name) {
		switch (name) {
			case 'status':
				return F.global.config.defaultorderstatus;
		}
	});

	// Gets listing
	schema.setQuery(function ($) {

		var opt = $.options === EMPTYOBJECT ? $.query : $.options;
		var isAdmin = $.controller ? $.controller.name === 'admin' : false;

		//var filter = NOSQL('orders').find();

		var mnosql = new Agent();
		//filter.paginate(opt.page, opt.limit, 70);

		if (isAdmin) {
			var decoded = $.controller.user.userData;
			console.log("ORDERS decoded----------", decoded);
			mnosql.listing('orders', 'orders').make(function (filter) {
				if (decoded.role == 'vendor') {
					filter.where('delivery_type', decoded.name);
				}
				if (decoded.role == 'manager') {
					filter.in('wid',decoded.warehouse_ids)
					
				}
				opt.number && filter.where('number', opt.number);
				if (opt.orderStatus == "1" || opt.orderStatus == 1) { // confirmed Orders
					filter.or();
					filter.where('iscod', true);
					filter.where('ispaid', true);
				}
				if (opt.orderStatus == "2" || opt.orderStatus == 2) { // Non confirmed Orders
					filter.where('ispaid', false);
					filter.where('iscod', false);
				}
				// if (opt.name) {
				// 	// opt.name = opt.name.keywords(true, true).join(' ');
				// 	filter.or();
				// 	filter.where('firstname', opt.name);
				// 	filter.where('lastname', opt.name);
				// }
				if (opt.noRush == "1") {
					opt.noRush && filter.where('is_norush', true);
				}
				if (opt.shopSasta == "1") {
					opt.shopSasta && filter.where('delivery_type', 'shop-sasta');
				}

				if (opt.vendor == "1") {
					opt.vendor && filter.where('delivery_type', '!=', 'shop-sasta');
				}

				opt.searchId && filter.like('id', opt.searchId, '*');
				opt.searchPhone && filter.like('phone', opt.searchPhone, '*');
				opt.searchNumber && filter.like('number', opt.searchNumber, '*');
				opt.name && filter.like('search_name', opt.name.toLowerCase(), '*');
				opt.delivery && filter.where('delivery', opt.delivery);
				opt.payment && filter.where('payment', opt.payment);
				opt.discount && filter.where('discount', opt.discount);
				opt.minPrice && opt.maxPrice && filter.between('price', parseInt(opt.minPrice), parseInt(opt.maxPrice)); // between
				opt.status && filter.where('status', opt.status);// sent,cancel,hold,Accepted,Finished  
				opt.internal_type && filter.where('internal_type', opt.internal_type.toLowerCase());// Send to sales, Intransit, Delivered
				opt.fromDatecreated && opt.toDatecreated && filter.between('datecreated', new Date(opt.fromDatecreated), new Date(opt.toDatecreated)); // between
				// Admin Tabs filter
				opt.ispickup && filter.where('ispickup', Boolean(opt.ispickup));
				opt.istwohrs && filter.where('istwohrs', Boolean(opt.istwohrs));
				opt.isRefEmp && filter.where('isRefEmp', Boolean(opt.isRefEmp));
				opt.pickupPincode && filter.where('pickupPincode', opt.pickupPincode);
				opt.iscod && filter.where('iscod', Boolean(opt.iscod));
				opt.ispaid && filter.where('ispaid', Boolean(opt.ispaid));
				opt.id && filter.where('id', opt.id);
				opt.number && filter.where('number', opt.number);
				opt.referalId && filter.where('referalId', opt.referalId);
				opt.phone && filter.where('phone', opt.phone);
				opt.orderFrom && filter.where('order_from', opt.orderFrom);
				console.log("filterrrr", filter.builder);
				//console.log("opt",opt)
				// if (opt.sort) {
				// 	filter.adminSort(opt.sort);
				// }
				//filter.sort('datecreated', true);
				filter.page(opt.page || 1, opt.limit || 100);
				//filter.sort("dateupdated", 'desc');
				//filter.sort("datecreated", 'desc');
				//to get latest orders
				filter.sort("created_on", 'desc');
				filter.fields('id', 'number', 'name', 'status', 'price', 'discount', 'count',
					'delivery', 'payment', 'email', 'phone', 'datecreated', 'ispaid', 'isfinished',
					'iscod', 'ispickup', 'istwohrs', 'isbookingtype', 'internal_type', 'storename', 'firstname',
					'referalId', 'coupon', 'delivery_type', 'deliverycity', 'deliverycountry', 'deliveryfirstname',
					'deliverylastname', 'deliveryphone', 'deliverystreet', 'deliveryzip', 'iduser',
					 'is_norush', 'mrp','created_on');
			})
			//filter.fields('note');
		} else {

			mnosql.listing('orders', 'orders').make(function (filter) {
				filter.page(opt.page || 1, opt.limit || 100);
				filter.sort("created_on", 'desc');
				// filter.sort("dateupdated", 'desc');
				filter.fields('id', 'number', 'name', 'status', 'price', 'discount', 'count',
					'delivery', 'payment', 'email', 'phone', 'datecreated', 'ispaid', 'isfinished',
					'iscod', 'ispickup', 'istwohrs', 'isbookingtype', 'internal_type', 'storename', 'firstname',
					'referalId', 'coupon', 'delivery_type', 'deliverycity', 'deliverycountry', 'deliveryfirstname',
					'deliverylastname', 'deliveryphone', 'deliverystreet', 'deliveryzip', 
					'iduser', 'is_norush', 'mrp','created_on');
			})
		}

		mnosql.exec(function (err, response) {
			console.log("MongoErr", err)
			console.log("MongoRes", response.orders.count);
			$.callback(response.orders)
		})
		//filter.fields('id', 'number', 'name', 'status', 'price', 'discount', 'count', 'delivery', 'payment', 'email', 'phone', 'datecreated', 'ispaid', 'isfinished', 'iscod', 'ispickup', 'istwohrs', 'isbookingtype', 'internal_type');
		//filter.callback((err, docs, count) => $.callback(filter.adminOutput(docs, count)));
	});

	// Saves the order into the database
	schema.setSave(function ($) {

		var model = $.model;
		var user = $.user.name;
		//var isemail = model.isemail;
		var isUpdate = !!model.id;
		var nosql = NOSQL('orders');
		var mnosql = new Agent();
		// Cleans unnecessary properties
		// model.isnewsletter = undefined;
		// model.isemail = undefined;

		// if (model.iscompany && !model.company)
		// 	model.iscompany = false;

		if (isUpdate) {
			model.adminupdated = user;
			model.dateupdated = new Date();
			model.ip = $.ip;
			model.internal_type = model.internal_type.toLowerCase();
		} else {
			model.id = UID();
			model.admincreated = user;
			model.datecreated = new Date();
			model.dateupdated = new Date();
			model.number = createNumber(nosql);
			nosql.counter.hit('all');
		}

		// if (model.isfinished && !model.datefinished)
		// 	model.datefinished = new Date();

		// if (model.ispaid && !model.datepaid)
		// 	model.datepaid = new Date();

		// model.name = model.iscompany ? model.company : model.lastname + ' ' + model.firstname;
		// model.search = (model.id + ' ' + (model.reference || '') + ' ' + model.firstname + ' ' + model.lastname + ' ' + model.email + ' ' + model.company).keywords(true, true).join(' ').max(500);

		// model.price = 0;
		// model.count = 0;

		// model.search_name =  model.firstname.toLowerCase() + ' ' + model.lastname.toLowerCase();

		// for (var i = 0, length = model.items.length; i < length; i++) {
		// 	var item = model.items[i];
		// 	model.price += (item.price * item.count);
		// 	model.count += item.count;
		// }

		//	var db = isUpdate ? nosql.modify(model).where('id', model.id).backup(user).log('Update: ' + model.id, user) : nosql.insert(model).log('Create: ' + model.id, user);

		if (isUpdate) {
			mnosql.update('orders', 'orders').make(function (builder) {
				builder.set(model);
				builder.where('id', model.id);
			});
		} else {
			mnosql.insert('orders', 'orders').make(function (builder) {
				builder.set(model);
			});
		}

		//console.log("MODEL", model.datecreated);

		mnosql.exec(function (err, response) {
			//console.log("MongoDBErr", err);
			console.log("MongoDB", response.orders); // response.user.identity (INSERTED IDENTITY)
			EMIT('orders.save', model);
			ADMIN.notify({ type: 'orders.save', message: model.name + ', ' + model.price.format(2) });
			if (model.oldStatus != "Finished" && model.status == "Finished") {
				updateProductOrders(model.id);
			}

			$.success();
		});

		// db.callback(function () {
		// 	EMIT('orders.save', model);
		// 	ADMIN.notify({ type: 'orders.save', message: model.name + ', ' + model.price.format(2) });
		// 	$.success();
		// });

		// Sends email
		//isemail && MAIL(model.email, '@(Order status #) ' + model.id, '=?/mails/order-status', model, model.language);
	});

	// Creates order
	schema.addWorkflow('create', function ($) {

		var model = $.model;
		var mnosql = new Agent();
		// Check terms and conditions
		if (!model.isterms) {
			$.invalid('error-terms');
			return;
		}

		var options = { id: [] };
		for (var i = 0, length = model.items.length; i < length; i++)
			options.id.push(model.items[i].id);
		console.log("optionssssssssssssssssssssssssss", options);
		// Get prices of ordered products
		// This is the check for price hijacking
		$WORKFLOW('Product', 'prices', options, function (err, response) {
			console.log("responseeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", response);
			// Some unexpected error
			if (err) {
				$.invalid(err);
				return;
			}

			var db = NOSQL('orders');
			var counter = db.counter;
			var discount = $.user ? $.user.discount : 0;

			// model.price = 0;
			// model.count = 0;

			var items = [];
			var stock = {};
			var stocksum = {};

			for (var i = 0, length = model.items.length; i < length; i++) {

				var item = model.items[i];


				model.price += item.price * item.count;
				model.count += item.count;

				// Add to list of ordered products
				items.push(item);
			}

			if ($.error.hasError()) {
				$.callback();
				return;
			}

			model.items = items;
			model.id = UID();
			model.discount = discount;
			model.datecreated = F.datetime;
			model.number = createNumber(db);
			model.ip = $.ip;
			model.language = $.language;
			model.iduser = $.user ? $.user.id : '';
			model.name = model.iscompany ? model.company : (model.lastname + ' ' + model.firstname);
			model.statushistory = [{ date: F.datetime, status: model.status }];

			var pincodes = [
				500038,
				515001,
				500062,
				500039,
				500060,
				500050,
				515671,
				500016,
				500072,
				515001,
				505001,
				500009,
				500072,
				518001,
				500008,
				500081,
				509001,
				500047,
				500034,
				500013,
				500020,
				501218,
				500039,
				500070,
				500072,
				500034,
				508002,
				506002,
				500048,
				506001,
				505209,
				518001,
				515591,
				502001,
				503001,
				534201,
				504001,
				500055,
				522002,
				533101,
				502103,
				500059,
				500070,
				506001,
				534101,
				522001,
				500084,
				522201,
				508213,
				506132,
				507001,
				500062,
				520010,
				520010,
				520002,
				520002,
				515411,
				530006,
				530001,
				532001,
				530020,
				523002,
				500035,
				500079,
				500004,
				500007,
				500043,
				500101,
				501102,
				500010,
				500044,
				501301,
				500015,
				500091,
				500040,
				500058,
				500064,
				500027,
				500037,
				500013,
				500003,
				500075,
				500078,
				500011,
				500092,
				500005,
				500022,
				500046,
				501401,
				500024,
				500086,
				500033,
				500018,
				500053,
				500001,
				500065,
				500096,
				500080,
				500097,
				500068,
				500014,
				500042,
				500066,
				500025,
				500051,
				500054,
				500028,
				500002,
				500076,
				500082,
				500031,
				500087,
				500006,
				500088,
				500077,
				500030,
				500100,
				500074,
				500017,
				500063,
				500036,
				500089,
				500032,
				500098,
				500049,
				500083,
				500026,
				500090,
				500095,
				500069,
				500041,
				500059,
				500094,
				500035,
				500061,
				500073,
				500067,
				500052,
				500079,
				500057,
				501101,
				500093,
				500023,
				520003,
				520012,
				520008,
				520007,
				520015,
				520001,
				520004,
				520011,
				521528,
				520013,
				521104,
				521108,
				530016,
				530003,
				530001,
				530002,
				530045,
				530040,
				530022,
				530024,
				530017,
				530013,
				530041,
				530043,
				530035,
				530012,
				531163,
				531162,
				530004,
				530005,
				530007,
				530008,
				530011,
				530018,
				530009,
				530014,
				530044,
				530029,
				531219,
				530028,
				530032,
				530046,
				530047,
				530031,
				530015
			]


			if (model.istwohrs) {
				if (pincodes.indexOf(model.deliveryzip) != -1) {
					model.istwohrs = true;
				} else {
					model.istwohrs = false;
				}
			}
			// //Updates stock
			// NOSQL('products').modify({
			// 	prices: function (val) {
			// 		for (var i = 0; i < val.length; i++) {
			// 			var price = val[i];
			// 			if (stock[price.id])
			// 				price.stock -= stock[price.id];
			// 		}
			// 		return val;
			// 	}, stock: function (val, doc) {
			// 		return val - stocksum[doc.id];
			// 	}
			// }).in('id', options.id).log('Update stock, order #: ' + model.id, model.name + ' (customer)');

			// // Writes stats
			// //counter.hit('all');

			// // Stats of user orders
			// model.iduser && NOSQL('users').counter.hit('order' + model.iduser);

			if (model.iduser) {
				console.log(` ${model.iduser} Order Created by user `);
			}

			if (model.isnewsletter) {
				var subscriber = CREATE('Subscriber');
				subscriber.email = model.email;
				subscriber.$controller($.controller);
				subscriber.$save();
			}

			// Cleans unnecessary properties
			model.isnewsletter = undefined;
			model.isemail = undefined;
			model.isterms = undefined;
			model.internal_type = "waiting for update";
			model.tag = "wait";
			model.iscod = false;
			model.ispaid = false;
			// Inserts order into the database
			// db.insert(model);
			$.success(true, model.id);

			// console.log("model id", model.id);

			// Inserts order into mongo
			mnosql.insert('orders', 'orders').make(function (builder) {
				builder.set(model);
			});
			mnosql.exec(function (err, response) {

				if (err) {
					console.log("MongoErr1", err);
					return $.invalid(err);
				} else {
					console.log("MongoResssss", response.orders);
					var output = {
						success: true,
						value: model.id
					}
					//console.log("11111111111")
					//$.callback(output);
					//console.log("2222222222222222")
					EMIT('orders.save', model);
					var subject = '@(Order #) ' + model.id;


					//console.log("333333333333333333333")
					if (model.istwohrs) {
						subject = subject + " - 2HRS"
					}

					if (model.ispickup) {
						subject = subject + " - PICK_UP"
					}

					if (model.isRefEmp) {
						subject = subject + " - ReferalId"
					}
					//console.log("0000000000000000000000000")
					// Sends email
					//var mail2 = MAIL("happionlineorders@gmail.com", subject, '=?/mails/order-admin', model, model.language);
					//var mail2 = MAIL("shanmmukha1589@gmail.com", subject, '=?/mails/order-admin', model, model.language);

					//if(model.notfication){
					var message = `Thankyou for placing order in happimobiles.com. Your order is waiting for confirmation for more information https://happimobiles.com/checkout/${model.id}`;
					var options = {
						'method': 'POST',
						'url': `http://api.smscountry.com/SMSCwebservice_bulk.aspx?User=happi9&passwd=Happi@12345&mobilenumber=91${model.phone}&message=${encodeURI(message)}&sid=HappiM&mtype=N&DR=Y`,
						'headers': {
							'Content-Type': 'application/json'
						}
					};



					request(options, function (error, response) {
						if (error) throw new Error(error);
						console.log("ORDER_CREATE_SMS", response.body);
					});
					//}


					updateStoreName(model.id, model.deliveryzip);
					if (model.iduser != "") {
						updateReferalid(model.iduser);
					}


					var mail = MAIL(model.email, '@(Order #) ' + model.id, '=?/mails/order', model, model.language);
					F.global.config.emailorderform && mail.bcc(F.global.config.emailorderform);

					ADMIN.notify({ type: 'orders.create', message: model.name + ', ' + model.price.format(2) });

				}
			})

		});
	});

	// Gets a specific order
	schema.setGet(function ($) {
		var mnosql = new Agent();
		//NOSQL('orders').one().where('id', $.options.id || $.id).callback($.callback, 'error-orders-404');
		//console.log("id", $.options.id, $.id)
		mnosql.select('orders', 'orders').make(function (builder) {
			builder.where('id', $.options.id || $.id)
			builder.first()
		})

		mnosql.exec(async function (err, response) {
			console.log("MongoErr", err);
			//console.log("MongoRes", response.orders);
			//	console.log("mongo id", response.orders.id)
			var adminUser = await getShippingType(response.orders.delivery_type);
			if (adminUser != "Fail") {
				if (adminUser.role == "vendor") {
					if (adminUser.shipping_by == "shop-sasta") {
						response.orders.shipping_by = "shop-sasta"
					} else {
						response.orders.shipping_by = "vendor"
					}
				} else {
					response.orders.shipping_by = "shop-sasta"
				}
			}
			$.callback(response.orders);
		})

	});
	
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
	// Removes order from DB
	schema.setRemove(function ($) {
		var mnosql = new Agent();
		var id = $.body.id;
		var user = $.user.name;
		//NOSQL('orders').remove().backup(user).log('Remove: ' + id, user).where('id', id).callback(() => $.success());

		mnosql.remove('orders', 'orders').make(function (builder) {
			builder.where('id', id);
		});

		mnosql.exec(function (err, response) {
			console.log("MongoErr", err);
			if (err)
				return $.invalid(err);
			console.log("MongoResponse", response.orders);
			$.success()
			LOGGER('orders-deleted', id, user);
		});
		return;
	});

	schema.addWorkflow('toggle', function ($) {

		var user = $.user.name;
		var arr = $.options.id ? $.options.id : $.query.id.split(',');
		var upd = {};
		var log;

		switch ($.options.type || $.query.type) {
			case 'completed':
				log = 'Completed';
				upd.isfinished = true;
				upd.datefinished = F.datetime;
				break;
			case 'paid':
				log = 'Paid';
				upd.ispaid = true;
				upd.datepaid = F.datetime;
				break;
		}

		if (log)
			NOSQL('orders').modify(upd).log(log + ': ' + arr.join(', '), user).in('id', arr).callback(() => $.success());
		else
			$.success();
	});

	// Clears DB
	schema.addWorkflow('clear', function ($) {
		var user = $.user.name;
		NOSQL('orders').remove().backup(user).log('Clear all orders', user).callback(() => $.success());
	});

	// Stats
	schema.addWorkflow('stats', function (error, model, options, callback) {
		NOSQL('orders').counter.monthly('all', callback);
	});

	schema.addWorkflow('dependencies', function ($) {
		var obj = {};
		obj.paymenttypes = F.global.config.paymenttypes;
		obj.deliverytypes = F.global.config.deliverytypes;
		$.callback(obj);
	});

	// Gets some stats from orders for Dashboard
	schema.addOperation('dashboard', function (error, model, options, callback) {

		var stats = {};

		stats.completed = 0;
		stats.completed_price = 0;
		stats.pending = 0;
		stats.pending_price = 0;

		var prepare = function (doc) {
			if (doc.isfinished) {
				stats.completed++;
				stats.completed_price += doc.price;
			} else {
				stats.pending++;
				stats.pending_price += doc.price;
			}
		};

		// Returns data for dashboard
		NOSQL('orders').find().prepare(prepare).callback(() => callback(stats));
	});

	// Sets the payment status to paid
	schema.addWorkflow('paid', function ($) {

		NOSQL('orders').modify({ ispaid: true, datepaid: F.datetime, taxid: $.body['TXNID'] })
			.where('ispaid', false).where('id', $.body['ORDERID'])
			.callback((err, count) => $.success(true, count > 0));

	});
});

function createNumber(nosql) {
	var year = F.datetime.getFullYear();
	var key = 'numbering' + year;
	var number = (nosql.get(key) || 0) + 1;
	nosql.set(key, number);
	return (year + '000001').parseInt() + number;
}


function updateStoreName(orderid, deliveryPinCode) {
	var mnosql = new Agent();
	mnosql.select('pincode', 'pincodes-storemapping').make(function (builder) {
		builder.where("Pincode", deliveryPinCode);
		builder.first()
	});

	mnosql.exec(function (err, response) {
		if (err) {
			console.log(err)
		} else {
			var mydoc = response.pincode;
			var storename = "";
			if (mydoc == null) {
				storename = "N/A";
			} else {
				storename = mydoc.HappiStores + ', ' + mydoc['CITY'] + ', ' + mydoc['StorePincode'];
			}
			var orderUpdate = new Agent();
			orderUpdate.update('orders', 'orders').make(function (builder) {
				builder.set('storename', storename);
				builder.where('id', orderid)
			})

			orderUpdate.exec(function (err, resp) {
				console.log("orderupdate", err, resp);
			})
		}
	})
}


async function updateProductOrders(id) {
	console.log("PRODUCT ORDER BEGIN +++++++++++++++++++++++++++++++++++++++++++++++++++++++");
	var mongoClient = new Agent();
	var { order, err } = await FetchOrder(id);
	if (err || order == null) {
		console.log("order null");
	}
	for (let i = 0; i < order.items.length; i++) {
		console.log("INSIDE PRODUCT ORDER FOR LOOP --------------------------------------");
		const element = order.items[i];
		var obj;
		if (order.version == "V2") {
			obj = {
				"name": element.name,
				"price": element.payPrice * element.quantity,
				"count": element.quantity,
				"datecreated": order.datecreated,
				"referalId": order.referalId,
				"status": order.status,
				"orderId": order.id
			}
		} else {
			obj = {
				"name": element.name,
				"price": element.price * element.count,
				"count": element.count,
				"datecreated": order.datecreated,
				"referalId": order.referalId,
				"status": order.status,
				"orderId": order.id
			}
		}
		console.log("product order OBJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ", obj);
		//return;
		mongoClient.insert('productOrders', 'product_orders').make(function (builder) {
			builder.set(obj);
		});

		var productOrders = await mongoClient.promise('productOrders');
		console.log("productOrders", productOrders);
	}
	console.log("PRODUCT ORDER ENDDDDDD +++++++++++++++++++++++++++++++++++++++++++++++++++++++");
}

async function updateReferalid(iduser) {
	var nosql = new Agent();
	var res = JSON.parse(fs.readFileSync(__dirname + '/../ExtraFunctions/referal.json'));
	//console.log("res", res);
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

async function FetchOrder(id) {
	var nosql = new Agent();
	//console.log("id", id)
	nosql.select('getOrder', 'orders').make(function (builder) {
		builder.where('id', id);
		builder.first();
	});
	try {
		var order = await nosql.promise('getOrder');
		return { order: order, err: null };
	} catch (err) {
		return { order: null, err: err };
	}

}

// // v1 orders
// db.getCollection("orders").find().forEach(function (docs) {
//     if (!docs.version) {
//         docs.items.forEach(element => {
//             if (docs.status == "Accepted" || docs.status == "Sent" || docs.status == "Finished") {
//                 var obj = {
//                     "name": element.name,
//                     "price": element.price * element.count,
//                     "count": element.count,
//                     "datecreated": docs.datecreated,
//                     "referalId": docs.referalId,
// 					"status": docs.status,
// 					"orderId":docs.id
//                 }
//                 db.getCollection("product_orders").save(obj);
//                 print("UPDATED : " + obj.name);
//             }
//         });
//     }
// });

// // v2 Orders
// db.getCollection("orders").find({ version: "V2" }).forEach(function (docs) {
//         docs.items.forEach(element => {
//             if (docs.status == "Accepted" || docs.status == "Sent" || docs.status == "Finished") {
//                 var obj = {
//                     "name": element.name,
//                     "price": element.payPrice * element.quantity,
//                     "count": element.quantity,
//                     "datecreated": docs.datecreated,
// 					"referalId": docs.referalId,
// 					"status": docs.status,
// 					"orderId":docs.id
//                 }
//                 db.getCollection("product_orders").save(obj);
//                 print("UPDATED : " + obj.name);
//             }
//         });

// });


