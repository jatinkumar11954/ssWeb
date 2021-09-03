var MONGO_DB_CONNECTION = process.env.MONGO_DB_CONNECTION || F.config['mongo'];;
var Agent = require('sqlagent/mongodb').connect(MONGO_DB_CONNECTION);
var generateUuidModule = MODULE('generate-uuid');


// jwt secret key 
var JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'JDSFNKLSJDGKLJW4732KEWFNKNE8978SDNFSNS9834JDF';

const fs = require('fs');
var request = require('request');

exports.install = function () {
	// admin users
	ROUTE('/admin/api/sasta-page', saveSastaConfig, ['POST', '#adminVerify', 'cors', 10000]);
	ROUTE('/admin/api/sasta-page', getSastaConfig, ['cors', '#adminVerify', 10000]);
	ROUTE('/api/sasta-page', getSastaProducts, ['cors', 10000]);
	ROUTE('/sasta-deals', getSastaTimings, ['cors', 10000]);
	ROUTE('/sasta-deals-mob', getSastaTimingsMob, ['cors', 10000]);



}

// function to write data
async function saveSastaConfig() {
	var self = this;
	var data = self.body;
	var nosql = new Agent();
	if (!data) {
		self.json({
			status: false,
			message: "no data"
		})
	} else {
		// check if json is present in db
		nosql.select('getD', 'configuration').make(function (builder) {
			builder.where('configurationName', 'Sasta_Page');
			builder.first();
		});

		var getD = await nosql.promise('getD');
		if (getD != null) {
			nosql.update('update', 'configuration').make(function (builder) {
				builder.where('configurationName', 'Sasta_Page');
				builder.set('configurationDetails', data);
			});
		} else {
			nosql.insert('update', 'configuration').make(function (builder) {
				builder.set('configurationName', 'Sasta_Page');
				builder.set('configurationDetails', data);
			});
		}

		var update = await nosql.promise('update');
		self.json({
			status: true,
			message: "Saved Successfully"
		})
		sastaPageJob();
		console.log("SASTA_PAGE_SAVE_TRIGGERED", new Date().toISOString(), update);
	}
}

// function to get data
async function getSastaConfig() {
	var self = this;
	var nosql = new Agent();
	nosql.select('getData', 'configuration').make(function (builder) {
		builder.where('configurationName', 'Sasta_Page');
		builder.first();
	});
	var getData = await nosql.promise('getData');
	var json = getData.configurationDetails;
	//console.log("data",json)
	self.json({
		status: true,
		data: json
	});
}

async function getSastaTimings() {
	var JOB_ID = generateUuidModule.createUUID();
	console.log("SASTA PAGE", new Date().toISOString(), JOB_ID, "TRIGGERED");
	var mnosql = new Agent();
	var self = this;
	var opt = self.query;
	//console.log("NO- CACHE");
	var pincode = "";
	var cookie = self.cookie('pincode');
	console.log("cookie", cookie);
	if (opt.pincode) {
		pincode = opt.pincode;
	} else if (cookie) {
		pincode = cookie;
	} else {
		pincode = "500072"
	}
	mnosql.select('getSastaRaw', 'configuration').make(function (builder) {
		builder.where('configurationName', 'Sasta_Page');
		builder.first();
	});
	var getSastaRaw = await mnosql.promise('getSastaRaw');
	var model = getSastaRaw.configurationDetails;
	//console.log("res", res);
	if (!model) {
		console.log("SASTA_CRON_JOB", new Date().toISOString(), JOB_ID, "DATA GET FAILED");
	}
	else {
		var productsArr = [];
		console.log("INSIDE THE AFTER GETTING RESSSSSSSSS", model);
		self.layout('nolayout');
		if (self.query.json == 1) {
			return self.json(model);
		}
		return self.view('~cms/deal', model);
		
		for (var key in res) {
			for (let i = 0; i < res[key].length; i++) {
				var timezoneObj = res[key][i];
				//console.log("timezoneObj", timezoneObj);
				
				
					for (let j = 0; j < timezoneObj.products.length; j++) {
						var product = timezoneObj.products[j];
						//console.log("product", JSON.stringify(product));
						mnosql.select('getp', 'product').make(async function (builder) {
							builder.where('id', product.pid);
							builder.first();
						});
						var getp = await mnosql.promise('getp');
						var variantArr = [];
						for (let k = 0; k < getp.variant.length; k++) {
							var variantObj = getp.variant[k];
							if (variantObj.id == product.vid) {
								getp.sastaVariant = variantObj;
								getp.sastaVariant.sastaPrice = timezoneObj.products[j].price;

							}
						}
						timezoneObj.products[j] = getp;
					}
					var result = await areaWiseProductStock(pincode, timezoneObj.products);
					timezoneObj.products = result;
					self.json(timezoneObj)
				
			}
		}

	}
}

async function getSastaTimingsMob() {
	var JOB_ID = generateUuidModule.createUUID();
	console.log("SASTA PAGE", new Date().toISOString(), JOB_ID, "TRIGGERED");
	var mnosql = new Agent();
	var self = this;
	var opt = self.query;
	//console.log("NO- CACHE");
	var pincode = "";
	var cookie = self.cookie('pincode');
	console.log("cookie", cookie);
	if (opt.pincode) {
		pincode = opt.pincode;
	} else if (cookie) {
		pincode = cookie;
	} else {
		pincode = "500072"
	}
	mnosql.select('getSastaRaw', 'configuration').make(function (builder) {
		builder.where('configurationName', 'Sasta_Page');
		builder.first();
	});
	var getSastaRaw = await mnosql.promise('getSastaRaw');
	var model = getSastaRaw.configurationDetails;
	//console.log("res", res);
	if (!model) {
		console.log("SASTA_CRON_JOB", new Date().toISOString(), JOB_ID, "DATA GET FAILED");
	}
	else {
		var productsArr = [];
		console.log("INSIDE THE AFTER GETTING RESSSSSSSSS", model);
		self.layout('nolayout');
		if (self.query.json == 1) {
			return self.json(model);
		}
		return self.view('~cms/deal-mob', model);
		
		for (var key in res) {
			for (let i = 0; i < res[key].length; i++) {
				var timezoneObj = res[key][i];
				//console.log("timezoneObj", timezoneObj);
				
				
					for (let j = 0; j < timezoneObj.products.length; j++) {
						var product = timezoneObj.products[j];
						//console.log("product", JSON.stringify(product));
						mnosql.select('getp', 'product').make(async function (builder) {
							builder.where('id', product.pid);
							builder.first();
						});
						var getp = await mnosql.promise('getp');
						var variantArr = [];
						for (let k = 0; k < getp.variant.length; k++) {
							var variantObj = getp.variant[k];
							if (variantObj.id == product.vid) {
								getp.sastaVariant = variantObj;
								getp.sastaVariant.sastaPrice = timezoneObj.products[j].price;

							}
						}
						timezoneObj.products[j] = getp;
					}
					var result = await areaWiseProductStock(pincode, timezoneObj.products);
					timezoneObj.products = result;
					self.json(timezoneObj)
				
			}
		}

	}
}

// home page job 
async function getSastaProducts() {
	var JOB_ID = generateUuidModule.createUUID();
	console.log("SASTA PAGE", new Date().toISOString(), JOB_ID, "TRIGGERED");
	var mnosql = new Agent();
	var self = this;
	var opt = self.query;
	//console.log("NO- CACHE");
	var pincode = "";
	var cookie = self.cookie('pincode');
	console.log("cookie", cookie);
	if (opt.pincode) {
		pincode = opt.pincode;
	} else if (cookie) {
		pincode = cookie;
	} else {
		pincode = "500072"
	}
	mnosql.select('getSastaRaw', 'configuration').make(function (builder) {
		builder.where('configurationName', 'Sasta_Page');
		builder.first();
	});
	var getSastaRaw = await mnosql.promise('getSastaRaw');
	var res = getSastaRaw.configurationDetails;
	//console.log("res", res);
	if (!res) {
		console.log("SASTA_CRON_JOB", new Date().toISOString(), JOB_ID, "DATA GET FAILED");
	}
	else {
		var productsArr = [];
		for (var key in res) {
			
			for (let i = 0; i < res[key].length; i++) {
				var timezoneObj = res[key][i];
				
				if (timezoneObj.timezone == opt.timezone) {
					 //console.log("timezone", JSON.stringify(timezoneObj));
					// return;
					for (let j = 0; j < timezoneObj.products.length; j++) {
						var product = timezoneObj.products[j];
						//console.log("product", JSON.stringify(product));
						mnosql.select('getp', 'product').make(async function (builder) {
							builder.where('id', product.pid);
							builder.first();
						});
						var getp = await mnosql.promise('getp');
						var variantArr = [];
						for (let k = 0; k < getp.variant.length; k++) {
							var variantObj = getp.variant[k];
							if (variantObj.id == product.vid) {
								getp.sastaVariant = variantObj;
								getp.sastaVariant.sastaPrice = parseInt(timezoneObj.products[j].price);

							}
						}
						timezoneObj.products[j] = getp;
					}
					var result = await areaWiseProductStock(pincode, timezoneObj.products);
					timezoneObj.products = result;
					self.json(timezoneObj)
				}
			}
		}

	}
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
			return { stockStatus: true, data: vstock }
			//console.log("vstock", vstock);
		} else {
			return { stockStatus: false, data: response }
			//return { status: false, message: "Pincode is not available for delivery" }
		}

	} else {
		console.log("NO WAREHOUSE FOUND")
		return { stockStatus: false, data: response }
		//return { status: false, message: "Pincode is not available for delivery" }
	}

}

async function stock(wid, response, apiType) {
	var stock = 0;
	var mongoClient = new Agent();
	var wid = wid;
	//console.log("wid -------------------------", wid);
	for (let k = 0; k < response.length; k++) {
		var product = response[k];
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
				product.stock = 0;
			}
		}
	}



	return response;
}
