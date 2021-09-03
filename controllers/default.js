const fs = require('fs');
// mongo db connection 
var MONGO_DB_CONNECTION = process.env.MONGO_DB_CONNECTION || F.config['mongo'];;
var Agent = require('sqlagent/mongodb').connect(MONGO_DB_CONNECTION);

exports.install = function () {
	//ROUTE('/pages/*', view_cms);
	ROUTE('/', view_home, [30000]);
	ROUTE('/categories', view_listing);
	ROUTE('/product-detail', view_detail);
	ROUTE('/cart', view_cart);
	ROUTE('/cart-payment', view_cart2);
	ROUTE('/cart-preview', view_cart_preview);
	ROUTE('/checkout', view_checkout);
	ROUTE('/contact', view_contact);
	ROUTE('/about', view_about);
	ROUTE('/faq', view_faq);
	ROUTE('/mobile', view_mobile);
	ROUTE('/my-address', view_address);
	ROUTE('/cod-payment', view_codpayment);
	ROUTE('/my-account', view_account);

	ROUTE('/my-account-update', view_accountUpdate);
	ROUTE('/product', view_product);
	ROUTE('/my-wishlist', view_wishlist);
	ROUTE('/my-orders', view_orderslist);
	ROUTE('/support', view_support);
	ROUTE('/refer-friend', view_refer);
	ROUTE('/my-earnings', view_earnings);
	ROUTE('/my-group', view_mygroup);
	ROUTE('/exchange', view_exchange);
	ROUTE('/product-variat', view_product_variants);
	
	ROUTE('#posts', view_posts, ['*Post']);
	ROUTE('#post', view_posts_detail, ['*Post']);	
	ROUTE('#notices', view_notices, ['*Notice']);

	// Delivery Person API's
	ROUTE('/delivery', view_delivery);
	ROUTE('/delivery-list', view_delivery_list);
};

async function view_delivery() {
	var self = this;
	self.layout('nolayout');
	self.view('~partials/delivery', {});
}

async function view_delivery_list() {
	var self = this;
	self.layout('nolayout');
	self.view('~partials/delivery-list', {});
}

function view_product_variants() {
	var self = this;
	var options = {};
	options.id = self.query.id;
	var pincode = "";
	var cookie = self.cookie('pincode');
	// console.log("cookie", cookie);
	if (self.query.pincode) {
		pincode = self.query.pincode;
	} else if (cookie != null && cookie != "") { 
		pincode = cookie;
	} else {
		pincode = "500072"
	}

	options.pincode = pincode;
	$GET('Product', options, function (err, response) {
		if(self.query.json == "1") {
			self.json(response);
			return;
		}

		self.layout('nolayout');
		self.view('~cms/product-fetch', response);

	});
}

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
			return {stockStatus: true, data: vstock }

			//console.log("vstock", vstock);
		} else {
			return {stockStatus: false, data: response }
			//return { status: false, message: "Pincode is not available for delivery" }
		}

	} else {
		console.log("NO WAREHOUSE FOUND")
		return {stockStatus: false, data: response }
		//return { status: false, message: "Pincode is not available for delivery" }
	}

}

async function stock(wid, response, apiType) {
	var stock = 0;
	var mongoClient = new Agent();
	var wid = wid;
	//console.log("wid -------------------------", wid);
	if (apiType == "home") {
		for (var homepageCat in response) {
			if (response[homepageCat].products) {
				//console.log("homeCategoryName", homepageCat);
				for (let k = 0; k < response[homepageCat].products.length; k++) {
					var product = response[homepageCat].products[k];
					product.stock = 0;
					var pid = product.id;
					//console.log("pid =========================", pid);
					for (let j = 0; j < product.variant.length; j++) {
						var variant = product.variant[j];
						var vid = variant.id;
						//console.log("vid ////////////////////////", vid);
						mongoClient.select('getwstock', 'warehouse_stock').make(function (builder) {
							builder.where('variant_id', vid);
							builder.and();
							builder.where('warehouse_id', wid);
							builder.and();
							builder.where('product_id', pid);
						});
						//console.log('Home vid',vid, 'Home pid',pid, 'Home wid',wid);
						var getwstock = await mongoClient.promise('getwstock');
						//console.log("Home getwstock",getwstock);
						if (getwstock.length > 0) {
							if (getwstock[0].variant_id == vid) {
								//console.log("hellooo",vid);
								stock = getwstock[0].stock;
								//console.log("stock",stock);
								variant.stock = getwstock[0].stock;
								product.stock += variant.stock;
							} else {
								console.log("VARIANT ID DOES NOT MATCH");
							}
						} else {
							variant.stock = 0;
							product.stock = product.stock;
						}
					}
				}
			}
		}
	}
	return response;
}


async function view_home() {
	var self = this;
	var key = 'Homepage_Json';
	//var homepageJson = CACHE(key);
	var pincode = "";
	var cookie = self.cookie('pincode');
	// console.log("cookie", cookie);
	if (self.query.pincode) {
		pincode = self.query.pincode;
	} else if (cookie != null && cookie != "") { 
		pincode = cookie;
	} else {
		pincode = "500072"
	}

	console.log("pincode-home", pincode);

	// if (!homepageJson) {
	// 	var homepageJson = JSON.parse(fs.readFileSync(__dirname+'/../public/homepage.json'));
	// 	var apiType = "home";
	// 	var result = await areaWiseProductStock(pincode, homepageJson, apiType);
	// 	homepageJson = result;
	// 	homepageJson.page_type = "home-page";
	// 	console.log("DDDDDDDIR NAME", __dirname);

	// 	CACHE(key, homepageJson, '10 minutes');
	// }

	var homepageJson = JSON.parse(fs.readFileSync(__dirname + '/../public/homepage.json'));
	var headerJson = JSON.parse(fs.readFileSync(__dirname + '/../public/header.json'));
	var model = {};

	var apiType = "home";
	var result = await areaWiseProductStock(pincode, homepageJson, apiType);
	homepageJson = result;
	homepageJson.page_type = "home-page";
	model.homepageJson = homepageJson;
	model.headerJson = headerJson;
	if (self.query.json) {
		//console.log("homepageJson",model);
		self.json(model);
		return;
	}


	self.layout('nolayout');
	self.view('~home', model);

}


async function view_listing() {
	var self = this;
	self.layout('nolayout');
	self.view('~partials/products', {});
}
async function view_codpayment() {
	var self = this;
	self.layout('nolayout');
	self.view('~partials/cod-payment');
}

async function view_faq() {
	var self = this;
	var nosql = new Agent();
	var model = {};
	nosql.select('getfaq', 'configuration').make(function (builder) {
		builder.where('configurationName', 'FAQ');
		builder.first();
	});
	var getfaq = await nosql.promise('getfaq');
	var json = getfaq.configurationDetails;
	//console.log("data",json)
	model.faq = json;
	if (self.query.json == 1) {
		return self.json(model);
	}
	self.layout('nolayout');
	self.view('~partials/faq', model);
}

async function view_address() {
	var self = this;
	self.layout('nolayout');
	self.view('~eshop/my-address', {});
}

async function view_mobile() {
	var self = this;
	self.layout('nolayout');
	self.view('~partials/mobile', {});
}

async function view_contact() {
	var self = this;
	self.layout('nolayout');
	self.view('~partials/contact', {});
}

async function view_about() {
	var self = this;
	self.layout('nolayout');
	self.view('~partials/about', {});
}

async function view_detail() {
	var self = this;
	self.layout('nolayout');
	self.view('~cms/product', {});
}

function view_cart() {
	var self = this;
	self.layout('nolayout');
	self.view('~eshop/cart');
}


function view_cart2() {
	var self = this;
	self.layout('nolayout');
	self.view('~eshop/cart2');
}

function view_cart_preview() {
	var self = this;
	self.layout('nolayout');

	self.view('~eshop/cart-preview');
}


function view_checkout() {
	var self = this;
	self.layout('nolayout');
	self.view('~eshop/checkout');
}


function view_account() {
	var self = this;
	self.layout('nolayout');
	self.view('~eshop/new-account');
}

function view_wishlist() {
	var self = this;
	self.layout('nolayout');
	self.view('~eshop/wishlist');
}

function view_exchange() {

	var self = this;

	self.layout('nolayout');
	self.view('~cms/exchange');
}

function view_orderslist() {

	var self = this;

	self.layout('nolayout');
	self.view('~eshop/orders-list');
}

function view_support() {

	var self = this;

	self.layout('nolayout');
	self.view('~partials/support');
}

function view_refer() {

	var self = this;

	self.layout('nolayout');
	self.view('~partials/refer');
}

function view_earnings() {

	var self = this;

	self.layout('nolayout');
	self.view('~eshop/earnings');
}


function view_accountUpdate() {

	var self = this;

	self.layout('nolayout');
	self.view('~eshop/account-update');
}


function view_mygroup() {

	var self = this;

	self.layout('nolayout');
	self.view('~partials/my-groups');
}

function view_cms() {
	//console.log("view CMS called------------------");

	var self = this;
	self.CMSpage();
}



function view_product() {

	var self = this;

	self.layout('nolayout');
	self.view('~cms/product-new');
}

function view_posts() {
	var self = this;
	var options = {};

	options.page = self.query.page;
	options.published = true;
	options.limit = 10;
	// options.category = 'category_linker';

	self.sitemap();
	self.$query(options, self.callback('posts'));
}

function view_posts_detail(linker) {

	var self = this;
	var options = {};

	options.linker = linker;
	// options.category = 'category_linker';

	self.$workflow('render', options, function (err, response) {

		if (err) {
			self.throw404();
			return;
		}

		self.sitemap();
		self.sitemap_replace(self.sitemapid, response.name);
		self.view('cms/' + response.template, response);
	});
}

function view_notices() {
	var self = this;
	var options = {};

	options.published = true;

	self.sitemap();
	self.$query(options, self.callback('notices'));
}


// ON('error404', function(req, res, exception) {
// 	var self = this;
// 	//self.throw404();
// 	res.render('page404');

// });




