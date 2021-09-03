var MONGO_DB_CONNECTION = process.env.MONGO_DB_CONNECTION || F.config['mongo'];;
var Agent = require('sqlagent/mongodb').connect(MONGO_DB_CONNECTION);
var jwt = require('jsonwebtoken');
var pincodeVerify = MODULE('pincodetest');

// jwt secret key 
var JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'happi_jwt_secret';

var crypto = require('crypto');
const { mode } = require('crypto-js');

NEWSCHEMA('Users').make(function (schema) {

	schema.define('id', 'UID');
	schema.define('name', 'String(100)');
	schema.define('firstname', 'Capitalize(50)');
	schema.define('lastname', 'Capitalize(50)');
	schema.define('phone', String);
	schema.define('email', 'Email');
	schema.define('gender', ['male', 'female']);
	schema.define('addresses', "[Object]");
	schema.define('referal_code', 'String');
	schema.define('referred_by', 'String');
	schema.define('datecreated', Date);
	schema.define('dateupdated', Date);

	// saves user into database
	schema.setSave(function ($) {
		var model = $.model;
		var mnosql = new Agent();
		var token = $.controller.headers['x-auth'];
		// token verify


		console.log("TRIGGERED USER SAVE");
		if (token != null) {
			try {
				decoded = jwt.verify(token, JWT_SECRET_KEY);
				console.log("decoded", decoded);

				if (decoded != null) {
					//console.log("yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy")
					if (decoded.phone != model.phone) {
						$.callback({
							status: false,
							message: "You are not allowed to access this data"
						});
						return;
					};

					mnosql.select('users', 'Users').make(function (builder) {
						builder.where('phone', decoded.phone);
						builder.first()
					});

					mnosql.exec(async function (err, response) {
						console.log("MongoErr", err);
						//console.log("Mongo RES", response.users);
						//return;
						var mongoClient = new Agent();
						// add new user
						if (response.users == null) {
							model.id = UID();
							model.datecreated = new Date();
							model.dateupdated = new Date();
							model.wallet_amount = 0;
							model.is_active = true;
							if (!model.referred_by) {
								model.referred_by = "NOCODE"
							}

							model.referal_code = crypto.createHash('md5').update(`${model.phone}${Math.random()}`).digest("hex").substr(0, 7).toUpperCase();
							var is_default = false;
							if (model.addresses.length > 0) {
								for (let i = 0; i < model.addresses.length; i++) {
									const element = model.addresses[i];
									//console.log("element",element);
									if (element.setDefault && !is_default) {
										is_default = true;
									}
									var pincodedata = await pincodeVerify.pincodeVerify(element.pinCode);
									console.log("pincode data ????????", pincodedata);
									if (pincodedata != "Invalid Pincode" && pincodedata != "Pincode not available") {
										model.pincodeStatus = true;
										// mongoClient.insert('addUser', 'Users').make(function (builder) {
										// 	builder.set(model);
										// });
									} else {
										if (pincodedata == "Pincode not available") {
											var nosql = new Agent();
											var obj = {
												pincode: element.pinCode,
												phonenumber: model.phone,
												datecreated: new Date()
											}
											nosql.insert('exception', 'delivery_coverage_exception').make(function (builder) {
												builder.set(obj);
											});
											var exception = nosql.promise('exception');
										}
										model.pincodeStatus = false;
										// mongoClient.insert('addUser', 'Users').make(function (builder) {
										// 	builder.set(model);
										// });
										// return $.callback({
										// 	status: false,
										// 	message: "Pincode is not available for delivery"
										// });
									}
								}

								if (!is_default) {
									model.addresses[0].setDefault = true;
								}
								mongoClient.insert('addUser', 'Users').make(function (builder) {
									builder.set(model);
								});
							} else {
								mongoClient.insert('addUser', 'Users').make(function (builder) {
									builder.set(model);
								});
							}

						} else { // update user
							model.dateupdated = new Date();
							model.referal_code = response.users.referal_code;
							model.referred_by = response.users.referred_by;
							var is_default = false;
							if (model.addresses.length > 0) {
								for (let i = 0; i < model.addresses.length; i++) {
									const element = model.addresses[i];
									//console.log("element",element);
									if (element.setDefault && !is_default) {
										is_default = true;
									}
									var pincodedata = await pincodeVerify.pincodeVerify(element.pinCode);
									console.log("pincode data ????????", pincodedata);
									if (pincodedata != "Invalid Pincode" && pincodedata != "Pincode not available") {
										model.pincodeStatus = true;
										// mongoClient.update('updateUser', 'Users').make(function (builder) {
										// 	builder.set(model);
										// 	builder.where('phone', decoded.phone);
										// });
									} else {
										if (pincodedata == "Pincode not available") {
											var nosql = new Agent();
											var obj = {
												pincode: element.pinCode,
												phonenumber: model.phone,
												datecreated: new Date()
											}
											nosql.insert('exception', 'delivery_coverage_exception').make(function (builder) {
												builder.set(obj);
											});
											var exception = nosql.promise('exception');
										}
										model.pincodeStatus = true;
										// mongoClient.update('updateUser', 'Users').make(function (builder) {
										// 	builder.set(model);
										// 	builder.where('phone', decoded.phone);
										// });
										// return $.callback({
										// 	status: true,
										// 	data: model
										// });
									}
								}
								//console.log("pincode data", pincodedata);
								if (!is_default) {
									model.addresses[0].setDefault = true;
								}
								mongoClient.update('updateUser', 'Users').make(function (builder) {
									builder.set(model);
									builder.where('phone', decoded.phone);
								});
							} else {
								mongoClient.update('updateUser', 'Users').make(function (builder) {
									builder.set(model);
									builder.where('phone', decoded.phone);
								});
							}

						}
						mongoClient.select('getUser', 'Users').make(function (builder) {
							builder.where('phone', decoded.phone);
						});
						mongoClient.exec(function (err, res) {
							if (err) {
								console.log("mongoerr", err);
								return $.invalid(err);
							}
							//console.log("response", res.getUser);
							$.callback({
								status: true,
								data: res.getUser
							});
						});
					})
				}
			} catch (err) {
				// err
				console.log("err", err);
				$.controller.throw401("Invalid Token");
			}
		} else {
			$.controller.throw401("Please provide token");
		}

		if (model.uid == '') {
			$.invalid('invalid-user');
			return;
		}

	});


	// Gets a specific user
	schema.setGet(function ($) {
		var mnosql = new Agent();
		var token = $.controller.headers['x-auth'];
		if (token != null) {
			try {
				decoded = jwt.verify(token, JWT_SECRET_KEY);
				console.log("decoded", decoded);
				if (decoded != null) {
					mnosql.select('users', 'Users').make(function (builder) {
						builder.where('phone', decoded.phone);
						builder.first()
					})

					mnosql.exec(function (err, response) {
						console.log("MongoErr", err);
						//console.log("Mongo RES", response.users)
						if (response.users == null) {
							$.callback({ status: false, message: "User not registered" });
						}
						//addressVerfiction(response.users);
						$.callback(response.users);
					})
				}
			} catch (err) {
				// err
				$.controller.throw401("Invalid Token");
			}
		} else {
			$.controller.throw401("Please provide token");
		}

	});


});



