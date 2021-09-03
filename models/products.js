// For importing
const { each, forEach } = require('async');
const Fs = require('fs');
var MONGO_DB_CONNECTION = process.env.MONGO_DB_CONNECTION || F.config['mongo'];;
var Agent = require('sqlagent/mongodb').connect(MONGO_DB_CONNECTION);
NEWSCHEMA('ProductPrice').make(function (schema) {
	schema.define('id', 'UID');
	schema.define('name', 'String(50)');
	schema.define('colorcode', String);
	schema.define('stock', Number);
	schema.define('price', Number);
});

NEWSCHEMA('Product').make(function (schema) {

	schema.define('id', 'UID');
	schema.define('availability', 'String(40)');
	schema.define('body', String);
	schema.define('bodywidgets', '[String(22)]');       // List of all used widgets
	schema.define('offerdesc', 'String(1000)');
	schema.define('isnew', Boolean);
	schema.define('ispublished', Boolean);
	schema.define('istop', Boolean);
	schema.define('linker', 'String(50)');
	schema.define('name', 'String(250)', true);
	schema.define('pictures', '[String]');
	//schema.define('payPrice', Number);
	schema.define('shippingPrice', Number);
	// schema.define('pricemin', Number);                  // Minimal price
	// schema.define('pricemax', Number);                  // Maximal price
	// schema.define('priceold', Number);                  // Old price from
	//schema.define('mrp', Number);
	schema.define('product_type', 'String');
	schema.define('search_admin_name', 'String');
	schema.define('weight', Number);
	// schema.define('hits', Number);
	// schema.define('delete_log', 'String');
	schema.define('searchkeywords', '[String]');

	schema.define('ispickup', Boolean);
	schema.define('iscod', Boolean);
	schema.define('stock_sync_date', Date);
	//schema.define('bajaj_model_code', 'String');

	schema.define('variant', '[object]');

	//new fields
	schema.define('ss_commission_percent', Number);
	schema.define('main_category', 'String');
	schema.define('delivery_type', 'String');
	schema.define('cat_one_id', 'String');
	schema.define('cat_two_id', 'String');
	schema.define('brand_desc', 'String(1000)');
	schema.define('simpledesc', 'String(1000)');
	schema.define('gst', Number);



	// Gets listing
	schema.setQuery(function ($) {
		var JOB_ID = createUUID();
		var mnosql = new Agent();
		var opt = $.options === EMPTYOBJECT ? $.query : $.options;
		var isAdmin = $.controller ? $.controller.name === 'admin' : false;
		// filter.paginate(opt.page, opt.limit, 70);


		if (isAdmin) {
			var decoded = $.controller.user.userData;
			mnosql.listing('products', 'product').make(function (filter) {
				if (decoded.role == 'vendor') {
					filter.where('delivery_type', decoded.name);
				}
				opt.name && filter.like('search_admin_name', opt.name.toLowerCase(), '*');
				opt.category && filter.adminFilter('category', opt, String);
				opt.manufacturer && filter.adminFilter('manufacturer', opt, String);
				opt.stock && filter.adminFilter('stock', opt, Number);
				opt.pricemin && filter.adminFilter('pricemin', opt, Number);
				opt.pricemin && filter.adminFilter('pricemin', opt, Number);
				filter.where('isactive', opt.isactive || true);
				//opt.pricemin && builder.()
				filter.page(opt.page || 1, opt.limit || 70);
				filter.sort('dateupdated', 'desc');
				filter.fields('id', 'mrp', 'linker', 'linker_category', 'linker_manufacturer',
					'category', 'manufacturer', 'name', 'pricemin', 'priceold', 'isnew', 'istop', 'pictures',
					'availability', 'datecreated', 'ispublished', 'signals', 'size', 'stock', 'color', 'isHomeFeatured',
					'isHomeOnSale', 'isHomeLatest', 'isHomeEnable', 'isHomeArrivals', 'isHomePopular', 'isHomeSuper',
					'isHomeDual', 'isHomeGaming', 'purchase_type', 'ftrFeatures', 'ftrTransfer', 'product_type',
					'prices', 'istvs', 'booking_type', 'variant', 'delivery_type'
					, 'simpledesc', 'brand_desc', 'offerdesc','cat_one_id','cat_two_id');
			});
		} else {

			// console.log("Search", opt.search.keywords(true, true));

			mnosql.listing('products', 'product').make(function (filter) {
				opt.cat_one_id && filter.like('cat_one_id', opt.cat_one_id);
				opt.cat_two_id && filter.like('cat_two_id', opt.cat_two_id);
				opt.category && filter.like('category', opt.category, '*');
				opt.manufacturer && filter.where('linker_manufacturer', opt.manufacturer);
				opt.size && filter.in('size', opt.size);
				opt.color && filter.in('color', opt.color);
				opt.stock && filter.where('stock', '>', 0);
				opt.published && filter.where('ispublished', true);
				opt.q && filter.in('searchkeywords', opt.q.toLowerCase().split(" "));
				opt.skip && filter.where('id', '<>', opt.skip);
				opt.isnew && filter.where('isnew', true);
				opt.istop && filter.where('istop', true);
				opt.ftrFeatures && filter.in('ftrFeatures', opt.ftrFeatures);
				opt.ftrTransfer && filter.in('ftrTransfer', opt.ftrTransfer);
				opt.ftrBrand && filter.where('ftrBrand', opt.ftrBrand);
				opt.ftrCam && filter.where('ftrCam', opt.ftrCam);
				opt.ftrScreen && filter.where('ftrScreen', opt.ftrScreen);
				opt.ftrBattery && filter.in('ftrBattery', opt.ftrBattery);
				opt.ftrProcessor && filter.in('ftrProcessor', opt.ftrProcessor);
				opt.ftrMemory && filter.in('ftrMemory', opt.ftrMemory);
				opt.hBrand && filter.in('hBrand', opt.hBrand);
				opt.hmicrophone && filter.in('hmicrophone', opt.hmicrophone);
				opt.Hconnectivityfeatures && filter.in('Hconnectivityfeatures', opt.Hconnectivityfeatures);
				opt.hfeature && filter.in('hfeature', opt.hfeature);
				opt.hinterface && filter.in('hinterface', opt.hinterface);
				opt.ftrFeatures1 && filter.in('ftrFeatures1', opt.ftrFeatures1);
				opt.ftrTransfer1 && filter.in('ftrTransfer1', opt.ftrTransfer1);
				opt.ftrBrand1 && filter.in('ftrBrand1', opt.ftrBrand1);
				opt.ftrCam1 && filter.where('ftrCam1', opt.ftrCam1);
				opt.ftrScreen1 && filter.where('ftrScreen1', opt.ftrScreen1);
				opt.ftrBattery1 && filter.in('ftrBattery1', opt.ftrBattery1);
				opt.ftrProcessor1 && filter.in('ftrProcessor1', opt.ftrProcessor1);
				opt.ftrMemory1 && filter.in('ftrMemory1', opt.ftrMemory1);
				opt.pBrand && filter.in('pBrand', opt.pBrand);
				opt.pBattery && filter.in('pBattery', opt.pBattery);
				opt.sBrand && filter.in('sBrand', opt.sBrand);
				opt.sDrivecapacity && filter.in('sDrivecapacity', opt.sDrivecapacity);
				opt.ccBrand && filter.in('ccBrand', opt.ccBrand);
				opt.smartBrand && filter.in('smartBrand', opt.smartBrand);
				opt.proBrand && filter.in('proBrand', opt.proBrand);
				opt.cabBrand && filter.in('cabBrand', opt.cabBrand);
				opt.cBrand && filter.in('cBrand', opt.cBrand);
				opt.bhBrand && filter.in('bhBrand', opt.bhBrand);
				opt.bhmicro && filter.in('bhmicro', opt.bhmicro);
				opt.bhconnect && filter.in('bhconnect', opt.bhconnect);
				opt.bhfeature && filter.in('bhfeature', opt.bhfeature);
				opt.bhhead && filter.in('bhhead', opt.bhhead);
				opt.bsBrand && filter.in('bsBrand', opt.bsBrand);
				opt.bsmicro && filter.in('bsmicro', opt.bsmicro);
				opt.bsconnect && filter.in('bsconnect', opt.bsconnect);
				opt.bsfeature && filter.in('bsfeature', opt.bsfeature);
				opt.bshead && filter.in('bshead', opt.bshead);
				// opt.mibrand && filter.in('mibrand', opt.mibrand);
				// opt.miscreen && filter.in('miscreen', opt.miscreen);
				// opt.mitech && filter.in('mitech', opt.mitech);
				opt.tvBrand && filter.in('tvBrand', opt.tvBrand);
				opt.tvsize && filter.where('tvsize', opt.tvsize);
				opt.tvdisplay && filter.in('tvdisplay', opt.tvdisplay);
				opt.minprice && filter.between('payPrice', parseInt(opt.minprice), parseInt(opt.maxprice));
				opt.id && filter.in('id', opt.id);
				filter.where('isactive', true);
				// filter.sort('weight', 'desc');
				filter.sort('stock', 'desc');
				filter.page(opt.page || 1, opt.limit || 12);
				filter.fields('id', 'mrp', 'linker', 'linker_category',
					'linker_manufacturer', 'category', 'manufacturer', 'name',
					'isnew', 'istop', 'pictures', 'availability', 'datecreated',
					'ispublished', 'signals', 'size', 'stock', 'color',
					'isHomeFeatured', 'isHomeOnSale', 'isHomeLatest', 'isHomeEnable',
					'isHomeArrivals', 'isHomePopular', 'isHomeSuper', 'isHomeDual', 'isHomeGaming',
					'purchase_type', 'ftrFeatures', 'ftrTransfer', 'product_type', 'prices', 'istvs',
					'booking_type', 'payPrice', 'bajaj_model_code', 'variant',
					'delivery_type', 'simpledesc', 'brand_desc', 'offerdesc','cat_one_id','cat_two_id');
			})

		}
		//console.log("PRODUCTS_SEARCH_Q", opt.q, new Date().toISOString(), JOB_ID, opt);
		mnosql.exec(async function (err, response) {
			//console.log("MongoDBErr", err);
			// console.log("MongoDBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",response.products.count); // response.user.identity (INSERTED IDENTITY)
			// $.success();
			//!isAdmin && prepare_links(response.products.items);
			var apiType = "listing"
			var nosql = new Agent();
			var result = await areaWiseProductStock(opt.pincode, response, apiType);
			if (isAdmin) {
				console.log("IS ADMINNNNNNNN");
				for (let i = 0; i < response.products.items.length; i++) {
					var product = response.products.items[i];
					//console.log("product.cat_one_id",product);
					// get category names
					nosql.select('getCats', 'category_one').make(function (builder) {
						builder.where('id', product.cat_one_id)
						builder.first();
					})
					var getCats = await nosql.promise('getCats');
                    //console.log("getCats",getCats);
					nosql.select('getCatsTwo', 'category_two').make(function (builder) {
						builder.where('id', product.cat_two_id)
						builder.first();
					})
					var getCatsTwo = await nosql.promise('getCatsTwo');

					product.category = `${getCats.category_one} / ${getCatsTwo.category_two}`;
					console.log("product.category", product.category);
				}
				$.callback(response.products);
			}
			if (!result.products) {
				$.callback(result);
			} else {
				$.callback(result.products);
			}

		});
	});

	// function to get the area wise stock
	async function areaWiseProductStock(pincode, response, apiType) {
		var mongoClient = new Agent();
		mongoClient.select('getwarehouse', 'pincodes').make(function (builder) {
			builder.where('pincode', pincode);
			builder.first();
		});

		var getwarehouse = await mongoClient.promise('getwarehouse');
		//console.log("getwarehouse", getwarehouse);
		if (getwarehouse != null) {
			if (getwarehouse.wid != "notAllocated") {
				var vstock = await stock(getwarehouse.wid, response, apiType);
				vstock.stockStatus = true
				return vstock;

				//console.log("vstock", vstock);
			} else {
				response.stockStatus = false
				return response;
				//return { status: false, message: "Pincode is not available for delivery" }
			}

		} else {
			console.log("NO WAREHOUSE FOUND")
			response.stockStatus = false
			return response;
			//return { status: false, message: "Pincode is not available for delivery" }
		}

	}

	async function stock(wid, response, apiType) {
		var stock = 0;
		var mongoClient = new Agent();
		var wid = wid;
		//console.log("wid -------------------------", wid);
		if (apiType == "listing") {
			for (let k = 0; k < response.products.items.length; k++) {
				const product = response.products.items[k];


				var pid = product.id;
				//console.log("pid =========================", pid);
				for (let j = 0; j < product.variant.length; j++) {
					const variant = product.variant[j];
					var vid = variant.id;
					//console.log("vid ////////////////////////", vid);
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
						variant.stock = 0;
					}
				}
			}
		}

		if (apiType == "single") {
			var pid = response.id;
		
			//console.log("pid =========================", pid);
			for (let j = 0; j < response.variant.length; j++) {
				const variant = response.variant[j];
				var vid = variant.id;
				//console.log("vid ////////////////////////", vid);
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

		}
		return response;
	}

	// Saves the product into the database
	schema.setSave(function ($) {
		var mnosql = new Agent();
		var model = $.model;
		var user = $.user.name;
		var isUpdate = !!model.id;
		var nosql = NOSQL('products');
		//var category = prepare_subcategories(model.category);

		// var min = null;
		// var max = null;
		// var stock = 0;

		if (isUpdate) {
			model.dateupdated = new Date();
			model.adminupdated = user;
		} else {
			model.id = UID();
			model.datecreated = F.datetime;
			model.admincreated = user;
		}
		model.dateupdated = new Date();
		model.search_admin_name = model.name.toLowerCase();

		var specialChars = ['|', '_', ' ', '/', '-'];
		var specialRegex = new RegExp('[' + specialChars.join('') + ']');
		//model.delivery_type = 'shop-sasta';
		var variant = [];
		if (isUpdate) {
			if (model.variant.length > 0) {
				for (let i = 0; i < model.variant.length; i++) {
					const element = model.variant[i];
					if (!element.id) {
						element.id = UID();
					}
					var baseprice = parseInt(element.base_price);
					var mrp = parseInt(element.mrp);
					element.base_price = baseprice;
					element.mrp = mrp;
					//console.log("elemen", element);
					for (let j = 0; j < element.prices.length; j++) {
						const priceObj = element.prices[j];
						var pricep = parseFloat(priceObj.price);
						priceObj.price = pricep;
						var percentage = parseInt(priceObj.percentage);
						priceObj.percentage = percentage;
						var quantity = parseInt(priceObj.quantity);
						priceObj.quantity = quantity;
					}
					variant.push(element);
				}
			}
		} else {
			if (model.variant.length > 0) {
				for (let i = 0; i < model.variant.length; i++) {
					const element = model.variant[i];
					element.id = UID();
					var baseprice = parseInt(element.base_price);
					element.base_price = baseprice;
					var mrp = parseInt(element.mrp);
					element.mrp = mrp;
					//console.log("elemen", element);
					for (let j = 0; j < element.prices.length; j++) {
						const priceObj = element.prices[j];
						var pricep = parseFloat(priceObj.price);
						priceObj.price = pricep;
						var percentage = parseInt(priceObj.percentage);
						priceObj.percentage = percentage;
						var quantity = parseInt(priceObj.quantity);
						priceObj.quantity = quantity;
					}
					variant.push(element);
				}
			}
		}
		//console.log("variant", variant);
		model.variant = variant;
		model.linker = ((model.reference ? model.reference + '-' : '') + model.name).slug();
		// console.log('model.linker', model.linker);
		//model.linker_manufacturer = model.manufacturer ? model.manufacturer.slug() : '';
		//model.linker_category = category.linker;
		//model.category = category.name;
		model.search = (model.name + ' ' + (model.manufacturer || '') + ' ' + (model.reference || '')).keywords(true, true).join(' ').max(500);
		model.body = model.template ? U.minifyHTML(model.body) : '';
		model.isactive = true;

		if (isUpdate) {
			mnosql.update('product', 'product').make(function (builder) {
				builder.set(model);
				builder.where('id', model.id);
			});
		} else {
			mnosql.insert('product', 'product').make(function (builder) {
				builder.set(model);
			});
		}

		//console.log("MODEL", model);

		mnosql.exec(function (err, response) {
			//console.log("MongoDBErr", err);
			//console.log("MongoDB",response.product); // response.user.identity (INSERTED IDENTITY)
			$.callback({
				success: true, message: "Success"
			});
		});

	});

	// Gets a specific product
	schema.setGet(function ($) {
		//console.log("-------------------------------------")
		var mnosql = new Agent();
		var options = $.options;
		//var nosql = NOSQL('products');
		//var builder = nosql.one();
		var isAdmin = $.controller ? $.controller.name === 'admin' : false;
		//console.log("options", options.id)
		mnosql.select('product', 'product').make(function (builder) {
			options.category && builder.where('linker_category', options.category);
			options.linker && builder.where('linker', options.linker);
			options.id && builder.where('id', options.id);
			options.published && builder.where('ispublished', true);
			$.controller && $.controller.id && builder.where('id', $.controller.id);
			builder.first()
		})
		if (isAdmin) {
			mnosql.exec(function (err, response) {
				console.log("MongoErr", err);
				if (err)
					return $.invalid(err);
				$.callback(response.product);
			});
			return;
		} else {
			mnosql.exec(async function (err, response) {
				console.log("MongoErr", err);
				if (err || response == null || response.product == null) {
					return $.invalid(err);
				}
				var productId = response.product.id;
				var { color, err } = await colorRelated(productId);
				var { related, err } = await relatedProducts(productId);
				// console.log("colorRelated------------", color);
				// console.log("relatedProducts----------", related);
				response.product.ColorRelated = color;
				response.product.RelatedProducts = related;


				if (isAdmin) {
					$.callback(response.product);
				}

				var apiType = "single"
				var result = await areaWiseProductStock(options.pincode, response.product, apiType);
				if (result.linker_category) {
					var sub_category = result.linker_category.split('/');
					result.sub_category = sub_category;
				}
				$.callback(result);
			});
		}
	});


	async function colorRelated(id) {
		//console.log("colorrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr", id);
		var mongoClient = new Agent();
		mongoClient.select('products_Group', 'productsGroup').make(function (builder) {
			builder.where("type", 'Color');
			builder.in('productsList', [id]);
			builder.first();
		});
		try {
			var grp = await mongoClient.promise('products_Group');
			if (grp != null && grp.productsList.length != 0) {
				//console.log("grp.products_Group.productsList.length",grp.products_Group.productsList.length);
				const index = grp.productsList.indexOf(id);
				if (index > -1) {
					grp.productsList.splice(index, 1);
				}
				var mongoClient2 = new Agent();
				mongoClient2.select('color', 'product').make(function (builder) {
					builder.in('id', grp.productsList);
					builder.fields("name", "id", "pictures", 'payPrice', "linker");
				});
				var color = await mongoClient2.promise('color');
				return { color: color, err: null };
			} else {
				return { color: [], err: null };
			}
		} catch (error) {
			console.log("COLOR RELATED PRODUCTS FETCHING ERROR", error);
			return { color: [], err: error };
		}
	}

	async function relatedProducts(id) {
		console.log("related");
		var mongoClient = new Agent();
		mongoClient.select('products_Group_related', 'productsGroup').make(function (builder) {
			builder.where("type", 'Related');
			builder.in('productsList', [id]);
			builder.first();
		});
		try {
			var grp = await mongoClient.promise('products_Group_related');
			if (grp != null && grp.productsList.length != 0) {
				const index = grp.productsList.indexOf(id);
				if (index > -1) {
					grp.productsList.splice(index, 1);
				}
				var mongoClient2 = new Agent();
				mongoClient2.select('related', 'product').make(function (builder) {
					builder.in('id', grp.productsList);
					builder.fields("name", "id", "pictures", 'payPrice', "linker");
				});
				var related = await mongoClient2.promise('related');
				return { related: related, err: null };
			} else {
				return { related: [], err: null };
			}
		} catch (err) {
			console.log("RELATED PRODUCTS FETCHING ERROR", err);
			return { related: [], err: err };;
		}
	}


	// Removes a specific product
	schema.setRemove(function ($) {
		var mnosql = new Agent();
		var id = $.body.id;
		var user = $.user.name;

		mnosql.update('product', 'product').make(function (builder) {
			builder.where('id', id);
			builder.set('isactive', false);
			builder.set('delete_log', $.controller.ip + " || " + id + " || " + user);
		});

		mnosql.exec(function (err, response) {
			console.log("MongoErr", err);
			if (err)
				return $.invalid(err);
			console.log("MongoResponse", response.product);
			$.success();
			LOGGER('products-deleted', id, user);
		});
		return;
	});

	schema.addWorkflow('toggle', function ($) {
		var user = $.user.name;
		var arr = $.options.id ? $.options.id : $.query.id.split(',');
		NOSQL('products').update(function (doc) {
			doc.ispublished = !doc.ispublished;
			return doc;
		}).log('Toggle: ' + arr.join(', '), user).in('id', arr).callback(function () {
			refresh_cache();
			$.success();
		});
	});

	schema.addWorkflow('prices', function ($) {
		var mnosql = new Agent();
		//console.log("iddddddddddddddddddddddddddd",$.options.id)
		var id = $.options.id || (($.query.id || '').split(','));
		if (id.length) {
			mnosql.select('product', 'product').make(function (builder) {
				builder.fields('id', 'prices', 'reference', 'stock', 'name');
				builder.where('ispublished', true);
				builder.in('id', id)
			});

			mnosql.exec(function (err, response) {
				if (err) {
					console.log("MongoErr", err);
					return $.invalid(err);
				}
				console.log("MongoResponse", response.product);
				$.callback(response.product)
			});
		}
		//NOSQL('products').find().fields('id', 'prices', 'reference', 'stock', 'name').where('ispublished', true).in('id', id).callback($.callback);
		else {
			$.invalid('error-data');
		}
	});

	schema.addWorkflow('search', function ($) {
		var mnosql = new Agent();
		console.log("WHILESEARCH");
		var q = $.options.search;
		//var q = ($.options.search || $.query.q || '').keywords(true, true).join(' ');
		var JOB_ID = createUUID();
		mnosql.select('products', 'product').make(function (builder) {
			builder.like('search_admin_name', q.toLowerCase(), '*');
			builder.where('ispublished', true);
			filter.fields('id', 'mrp', 'linker', 'linker_category', 'linker_manufacturer', 'category', 'manufacturer', 'name', 'pricemin', 'priceold', 'isnew', 'istop', 'pictures', 'availability', 'datecreated', 'ispublished', 'signals', 'size', 'stock', 'color', 'isHomeFeatured', 'isHomeOnSale', 'isHomeLatest', 'isHomeEnable', 'isHomeArrivals', 'isHomePopular', 'isHomeSuper', 'isHomeDual', 'isHomeGaming', 'purchase_type', 'ftrFeatures', 'ftrTransfer', 'product_type', 'prices', 'istvs', 'booking_type');
			builder.take(15);
		});

		mnosql.exec(function (err, response) {
			if (err) {
				console.log("MongoErr", err);
				return $.invalid(err);
			}
			prepare_links(response);
			//console.log("MongoRess", response.products);
			console.log("SEARCH__RESPONSE", q, new Date().toISOString(), JOB_ID, response.products.count);
			$.callback(response.products);

		});
	});

	schema.addWorkflow('dependencies', function ($) {
		var obj = {};

		obj.categories = [];
		obj.manufacturers = F.global.manufacturers;

		for (var i = 0, length = F.global.categories.length; i < length; i++) {
			var item = F.global.categories[i];
			obj.categories.push({ name: item.name, level: item.level, count: item.count, linker: item.linker });
		}

		obj.categories.quicksort('name');
		$.callback(obj);
	});

	// Clears database
	schema.addWorkflow('clear', function ($) {
		var user = $.user.name;
		NOSQL('products').remove().backup(user).log('Clear all products', user).callback(function () {
			$.success();
			refresh_cache();
		});
	});

	// Refreshes categories
	schema.addWorkflow('refresh', function ($) {
		refresh_cache();
		$.success(true);
	});

	// Replaces category
	schema.addWorkflow('replace-category', function ($) {

		var name_old = prepare_subcategories($.query.name_old);
		var name_new = prepare_subcategories($.query.name_new);

		var update = function (doc) {
			doc.category = doc.category.replace(name_old.name, name_new.name);
			doc.linker_category = doc.linker_category.replace(name_old.linker, name_new.linker);
			return doc;
		};

		NOSQL('products').update(update).like('category', name_old.name, 'beg').callback(function (err, count) {
			if (count) {
				refresh_cache();
				ADMIN.notify({ type: 'products.replace-category', message: name_old.name + ' --> ' + name_new.name });
			}
			$.success();
		});
	});

	// Replaces manufacturer
	schema.addWorkflow('replace-manufacturer', function ($) {

		var name_old = prepare_subcategories($.query.name_old);
		var name_new = prepare_subcategories($.query.name_new);

		var update = function (doc) {
			doc.manufacturer = doc.manufacturer.replace(name_old.name, name_new.name);
			doc.linker_manufacturer = doc.linker_manufacturer.replace(name_old.linker, name_new.linker);
			return doc;
		};

		NOSQL('products').update(update).like('manufacturer', name_old.name, 'beg').callback(function (err, count) {
			if (count) {
				refresh_cache();
				ADMIN.notify({ type: 'products.replace-manufacturer', message: name_old.name + ' --> ' + name_new.name });
			}
			$.success();
		});
	});

	// Stats
	schema.addWorkflow('stats', function ($) {
		NOSQL('products').counter.monthly($.id || $.options.id || 'all', function (err, views) {
			NOSQL('orders').counter.monthly($.id || $.options.id || 'all', function (err, orders) {
				var output = {};
				output.views = views;
				output.orders = orders;
				$.callback(output);
			});
		});
	});

	schema.addWorkflow('popular', function ($) {

		var MAX = $.options.limit || 20;

		NOSQL('orders').counter.stats(MAX, function (err, response) {

			var id = new Array(response.length);
			var compare = {};

			for (var i = 0, length = response.length; i < length; i++) {
				id[i] = response[i].id;
				compare[id[i]] = i;
			}

			var filter = NOSQL('products').find();

			filter.make(function (builder) {
				builder.fields('id', 'linker', 'linker_category', 'linker_manufacturer', 'category', 'manufacturer', 'name', 'pricemin', 'priceold', 'isnew', 'istop', 'pictures', 'availability', 'datecreated', 'ispublished', 'signals', 'size', 'stock', 'color',);
				builder.in('id', id);
				builder.callback(function (err, docs, count) {
					docs.sort((a, b) => compare[a.id] < compare[b.id] ? -1 : 1);
					prepare_links(docs);
					$.callback(filter.adminOutput(docs, count));
				});
			});
		});
	});

	// Imports data
	schema.addWorkflow('import', function ($) {

		// It expects options as array of products
		// Reads all id + references (for updating/inserting)
		NOSQL('products').find().fields('id', 'reference', 'pictures').callback(function (err, database) {

			var count = 0;
			var options = { importing: true };

			$.options.wait(function (item, next) {

				var tmp;

				if (item.reference) {
					tmp = database.findItem('reference', item.reference);
					if (tmp)
						item.id = tmp.id;
					else
						item.id = undefined;
				} else if (item.id) {
					tmp = database.findItem('id', item.id);
					if (!tmp)
						item.id = undefined;
				}

				var fn = function (item) {
					schema.make(item, function (err, model) {
						if (err)
							return next();
						count++;
						model.$controller($.controller);
						model.$save(options, next);
					});
				};

				if (!item.pictures)
					return fn(item);

				var id = [];

				// Download pictures
				item.pictures.wait(function (picture, next) {
					U.download(picture.trim(), ['get', 'dnscache'], function (err, response) {

						if (err || response.status === 302)
							return next();

						var filename = F.path.temp(U.GUID(10) + '.jpg');
						var writer = Fs.createWriteStream(filename);

						response.pipe(writer);

						CLEANUP(writer, function () {
							Fs.readFile(filename, function (err, data) {

								if (data && data.length > 3000) {
									Fs.unlink(filename, NOOP);
									id.push(NOSQL('files').binary.insert('picture.jpg', data));
								}

								setTimeout(next, 200);
							});
						});
					});
				}, function () {
					item.pictures = id;
					fn(item);
				}, 3); // 3 threads

			}, function () {
				if (count) {
					refresh_cache();
					ADMIN.notify({ type: 'products.import', message: count + '' });
				}
			});
		});

		$.success();
	});

	// Exports JSON
	schema.addWorkflow('export', function ($) {
		NOSQL('products').find().callback(function (err, docs) {

			var skip = {};

			// skip.body = true;
			// skip.template = true;
			// skip.linker_category = true;
			// skip.linker_manufacturer = true;
			// skip.linker = true;
			// skip.pictures2 = true;
			// skip.dateupdated = true;
			// skip.admincreated = true;
			// skip.adminupdated = true;
			// skip.signals = true;
			// skip.search = true;
			// skip.widgets = true;

			$.callback(JSON.stringify(docs, function (key, value) {

				if (skip[key])
					return undefined;

				if (key !== 'pictures')
					return value;

				for (var i = 0, length = value.length; i < length; i++)
					value[i] = F.global.config.url + '/download/{0}.jpg'.format(value[i]);

				return value;
			}, '  '));
		});
	});
});


async function refresh() {
	var catJson = [];
	// get sub categories from db and save into json
	var nosql = new Agent();
	nosql.select('getCats', 'category_one').make(function (builder) {
		builder.sort('datecreated', 'desc');
		builder.where('is_active', true);
	})
	var getCats = await nosql.promise('getCats');
	//console.log("getCats", getCats);
	for (let i = 0; i < getCats.length; i++) {
		const element = getCats[i];
		nosql.select('getSubCats', 'category_two').make(function (builder) {
			builder.where('cat_one_id', element.id);
			builder.where('is_active', true);
			builder.sort('datecreated', 'desc');
		})
		var getSubCats = await nosql.promise('getSubCats');
		element.categoryTwo = getSubCats;
	}
	if (getCats.length > 0) {
		for (let i = 0; i < getCats.length; i++) {
			var catOne = getCats[i];
			//console.log("catOne",catOne);
			//return;
			if (catOne.categoryTwo.length > 0) {
				for (let j = 0; j < catOne.categoryTwo.length; j++) {
					var catTwo = catOne.categoryTwo[j];
					var obj = {
						linker: catOne.category_one.slug() + '/' + catTwo.category_two.slug(),
						name: catOne.category_one + ' / ' + catTwo.category_two
					}
					catJson.push(obj)
				}
			} else {
				var obj = {
					linker: catOne.category_one.slug() + '/all',
					name: catOne.category_one + ' / All'
				}
				catJson.push(obj)
			}

			//console.log("catJson",catJson);

			// var category = prepare_subcategories(element.sub_category);
			// var obj = {
			// 	linker: category.linker,
			// 	name: category.name
			// }
			// catJson.push(obj)
		}
	}


	Fs.writeFileSync(__dirname + '/global-categories.json', JSON.stringify(catJson));
	var categories = JSON.parse(Fs.readFileSync(__dirname + '/global-categories.json'));
	//console.log("categories",categories);
	F.global.categories = categories;
}

setInterval(function () {
	refresh();
}, 5000);

//refresh();
// Refreshes internal information (categories and manufacturers)
// function refresh() {

// 	var dbCategories = {};
// 	var dbManufacturers = {};
// 	var dbSizes = [];
// 	var dbColors = [];

// 	(F.global.config.defaultcategories || '').split('\n').quicksort().forEach(function(item) {
// 		if (item) {
// 			var category = prepare_subcategories(item);
// 			if (!dbCategories[category.name])
// 				dbCategories[category.name] = { count: 0, hidden: 0, linker: category.linker, path: category.linker.split('/'), names: category.name.split('/').trim(), size: [] };
// 		}
// 	});

// 	var prepare = function(doc) {

// 		var category = doc.category;
// 		var manufacturer = doc.manufacturer;

// 		if (dbCategories[category]) {
// 			if (doc.ispublished) {

// 				if (doc.size) {
// 					prepare_size(dbCategories[category], doc.size);
// 					prepare_size(dbSizes, doc.size);
// 				}

// 				if (doc.color) {
// 					prepare_color(dbCategories[category], doc.color);
// 					prepare_color(dbColors, doc.color);
// 				}

// 				manufacturer && dbCategories[category].manufacturers.indexOf(manufacturer) === -1 && dbCategories[category].manufacturers.push(manufacturer);
// 				dbCategories[category].count++;
// 			} else
// 				dbCategories[category].hidden++;
// 		} else
// 			dbCategories[category] = { count: doc.ispublished ? 1 : 0, hidden: doc.ispublished ? 0 : 1, linker: doc.linker_category, path: doc.linker_category.split('/'), names: doc.category.split('/').trim(), size: doc.size || [], color: doc.color || [], manufacturers: [doc.manufacturer] };

// 		if (!manufacturer)
// 			return;

// 		if (dbManufacturers[manufacturer]) {
// 			if (doc.ispublished) {
// 				dbManufacturers[manufacturer].count++;
// 				doc.size && prepare_size(dbManufacturers[manufacturer], doc.size);
// 				doc.color && prepare_color(dbManufacturers[manufacturer], doc.color);
// 			} else
// 				dbManufacturers[manufacturer].hidden++;
// 		} else
// 			dbManufacturers[manufacturer] = { count: doc.ispublished ? 1 : 0, hidden: doc.ispublished ? 0 : 1, linker: doc.linker_manufacturer, size: doc.size || [], color: doc.color || [] };
// 	};

// 	NOSQL('products').find().prepare(prepare).callback(function() {

// 		// Prepares categories with their subcategories
// 		var keys = Object.keys(dbCategories);
// 		var categories = [];
// 		var categories_filter = {};
// 		var tmp;

// 		for (var i = 0, length = keys.length; i < length; i++) {
// 			var name = keys[i];
// 			var item = dbCategories[name];

// 			if (!item.manufacturers)
// 				item.manufacturers = [];

// 			for (var j = 0, jl = item.manufacturers.length; j < jl; j++) {
// 				var key = item.manufacturers[j];
// 				if (key) {
// 					item.manufacturers[j] = dbManufacturers[key];
// 					item.manufacturers[j].name = key;
// 				}
// 			}

// 			item.path.forEach(function(path, index) {
// 				var key = item.path.slice(0, index + 1).join('/');

// 				if (categories_filter[key]) {
// 					categories_filter[key].count += item.count;
// 					return;
// 				}

// 				var obj = {};
// 				obj.linker = key;
// 				obj.name = item.names.slice(0, index + 1).join(' / ');
// 				obj.count = item.count;
// 				obj.hidden = item.hidden;
// 				obj.text = item.names[index];
// 				obj.parent = item.path.slice(0, index).join('/');
// 				obj.level = index;
// 				obj.sizes = item.size;
// 				obj.color = item.color;
// 				obj.path = item.path;
// 				obj.manufacturers = item.manufacturers;

// 				obj.contains = function(path) {
// 					return (path + '/').indexOf(this.linker) !== -1;
// 				};

// 				obj.is = function(category) {
// 					if (!category)
// 						return false;
// 					var path = category.path;
// 					for (var i = 0; i < this.level + 1; i++) {
// 						if (path[i] !== this.path[i])
// 							return false;
// 					}
// 					return true;
// 				};
// 				categories_filter[key] = obj;
// 			});
// 		}

// 		Object.keys(categories_filter).forEach(key => categories.push(categories_filter[key]));
// 		categories.sort((a, b) => a.level > b.level ? 1 : a.level < b.level ? -1 : a.name.localeCompare2(b.name));

// 		for (var i = 0, length = categories.length; i < length; i++) {
// 			var item = categories[i];
// 			item.children = categories.where('parent', item.linker);
// 			item.parent = categories.find('linker', item.parent);
// 			item.top = tmp = item.parent;
// 			while (tmp) {
// 				tmp = categories.find('linker', item.parent);
// 				if (tmp)
// 					item.top = tmp;
// 			}
// 		}

// 		// Prepares manufacturers
// 		keys = Object.keys(dbManufacturers);
// 		var manufacturers = new Array(keys.length);
// 		for (var i = 0, length = keys.length; i < length; i++) {
// 			var name = keys[i];
// 			var item = dbManufacturers[name];
// 			manufacturers[i] = { name: name, linker: item.linker, count: item.count, hidden: item.hidden, sizes: item.size, color: item.color };
// 		}

// 		manufacturers.quicksort('name');
// 		// console.log('CATSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS',categories);
// 		F.global.categories = categories;


// 		F.global.manufacturers = manufacturers;
// 		F.global.sizes = dbSizes;
// 		F.global.colors = dbColors;
// 	});
// }

function export_for_camp() {

}

function prepare_size(item, items) {
	for (var i = 0, length = items.length; i < length; i++) {
		if (item instanceof Array) {
			if (item.indexOf(items[i]) === -1)
				item.push(items[i]);
		} else if (item.size.indexOf(items[i]) === -1)
			item.size.push(items[i]);
	}
}

function prepare_color(item, items) {
	for (var i = 0, length = items.length; i < length; i++) {
		if (item instanceof Array) {
			if (item.indexOf(items[i]) === -1)
				item.push(items[i]);
		} else if (item.color.indexOf(items[i]) === -1)
			item.color.push(items[i]);
	}
}

function prepare_links(items) {
	var linker_detail = F.sitemap('detail', true);
	var linker_category = F.sitemap('category', true);
	for (var i = 0, length = items.length; i < length; i++) {
		var item = items[i];
		if (linker_detail)
			item.linker = linker_detail.url.format(item.linker);
		if (linker_category)
			item.linker_category = linker_category.url + item.linker_category;
		item.body = undefined;
	}
}

function prepare_subcategories(name) {

	var builder_link = [];
	var builder_text = [];
	var category = name.split('/');

	for (var i = 0, length = category.length; i < length; i++) {
		var item = category[i].trim();
		builder_link.push(item.slug());
		builder_text.push(item);
	}

	return { linker: builder_link.join('/'), name: builder_text.join(' / ') };
}

function refresh_cache() {
	setTimeout2('cache', () => F.cache.removeAll('cachecms'), 2000);
	setTimeout2('products', refresh, 1000);
}

// Generate a UUID
function createUUID() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	});
}
ON('settings', refresh);
setTimeout(() => {
	refresh();
}, 10000);



