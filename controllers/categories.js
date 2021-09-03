var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
const assert = require('assert');

// mongo db long url
const MONGO_URL = process.env.MONGO_URL || 'mongodb://admin:VsKl9x8yEWIqllxh@cluster0-shard-00-00.m73oz.mongodb.net:27017,cluster0-shard-00-01.m73oz.mongodb.net:27017,cluster0-shard-00-02.m73oz.mongodb.net:27017/shop-sasta?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin&retryWrites=true&w=majority';

// Database Name
const DB_NAME = process.env.DB_NAME || F.config['db-name'];

// mongo db connection 
var MONGO_DB_CONNECTION = process.env.MONGO_DB_CONNECTION || F.config['mongo'];;
var Agent = require('sqlagent/mongodb').connect(MONGO_DB_CONNECTION);


exports.install = function () {
    // category one  crud api's
    ROUTE('#admin/api/product-categories', saveCategoryOne, ['post', '#adminVerify', 'cors']);
    ROUTE('#admin/api/product-categories', getCategoryOne, ['#adminVerify', 'cors']);
    ROUTE('#admin/api/product-categories/{id}', getCategoryOneById, ['#adminVerify', 'cors']);
    
    // category two crud api's
    ROUTE('#admin/api/product-categories-two/{catid}', saveCategoryTwo, ['post', '#adminVerify', 'cors']);


    // categories filter admin api's
    ROUTE('#admin/api/category', getCat, ['#adminVerify', 'cors']);
    ROUTE('#admin/api/sub-category', getSubCat, ['post', '#adminVerify', 'cors']);


    // categories filter user api's
    ROUTE('/api/category', getCat, ['post', 'cors']);
    ROUTE('/api/sub-category', getSubCat, ['post', 'cors']);

};


// product category crud functions

// function to create and update product category
function saveCategoryOne() {
    var self = this;
    var nosql = new Agent();
    var body = self.body;

    var isUpdate = !!body.id;
    var category_one = body.category_one.slug();
   
    if (isUpdate) {
        body.dateupdated = new Date();
        body.linker = `/category/${category_one}/c1-${body.id}`;
        nosql.update('updateCat', 'category_one').make(function (builder) {
            builder.set(body);
            builder.where('id', body.id)
        });
    } else {
        body.datecreated = new Date();
        body.dateupdated = new Date();
        body.id = UID();
        body.linker = `/category/${category_one}/c1-${body.id}`;
        nosql.insert('saveCat', 'category_one').make(function (builder) {
            builder.set(body);
        });
    }

    nosql.exec(function (err, response) {
        if (err) {
            console.log("mongoerr", err);
        }
        // console.log("response", response.saveCat);
        self.json({
            status: true,
            message: "Success"
        })
    });
}

// function to get all product categories
async function getCategoryOne() {
    var self = this;
    var opt = self.query;
    var nosql = new Agent();
    nosql.listing('getCats', 'category_one').make(function (builder) {
        builder.page(opt.page || 1, opt.limit || 1000);
        opt.isActive && builder.where('is_active',Boolean(opt.isActive));
        builder.sort('datecreated', 'desc');
    })
    var getCats = await nosql.promise('getCats');
    //console.log("getCats", getCats);
    getCats.items.reverse();
    for (let i = 0; i < getCats.items.length; i++) {
        const element = getCats.items[i];
        nosql.select('getSubCats', 'category_two').make(function (builder) {
            builder.where('cat_one_id', element.id);
            opt.isActive && builder.where('is_active',Boolean(opt.isActive));
            builder.sort('datecreated', 'desc');
        })
        var getSubCats = await nosql.promise('getSubCats');
        getSubCats.reverse();
        element.categoryTwo = getSubCats;

    }
    if (getCats != null) {
        self.json({
            status: true,
            data: getCats
        })
    } else {
        self.json({
            status: false
        })
    }
}

// function to get product category by id
async function getCategoryOneById() {
    var self = this;
    var opt = self.params;
    var nosql = new Agent();
    //console.log("id", opt);
    nosql.select('getCat', 'category_one').make(function (builder) {
        builder.where('id', opt.id);
        builder.first();
    });

    var getCat = await nosql.promise('getCat');

    if (getCat != null) {
        nosql.select('getSubCats', 'category_two').make(function (builder) {
            builder.where('cat_one_id', getCat.id)
            //builder.sort('datecreated', 'asc');
        })
        var getSubCats = await nosql.promise('getSubCats');
        getCat.categoryTwo = getSubCats;
        self.json({
            status: true,
            message: "Success",
            data: getCat
        })
    } else {
        self.json({
            status: false
        })
    }
}



// function to add and update  category two
async function saveCategoryTwo() {
    var self = this;
    var nosql = new Agent();
    var body = self.body;
    body.cat_one_id = self.params.catid;
    body.key = body.cat_one_id+'-'+body.category_two;
    var category_two = body.category_two.slug();
    var isUpdate = !!body.id;
    // get cat one data
    nosql.select('gatCatOne', 'category_one').make(function (builder) {
        builder.where('id', self.params.catid);
        builder.first();
    });
    var gatCatOne = await nosql.promise('gatCatOne');
    //console.log("gatCatOne",gatCatOne);
    var category_one = gatCatOne.category_one.slug();
    //return;
    if(gatCatOne != null) {
        if (isUpdate) {
            body.dateupdated = new Date();
            body.linker = `/category/${category_one}/${category_two}/c2-${body.id}`
            nosql.update('updateCat', 'category_two').make(function (builder) {
                builder.set(body);
                builder.where('id', body.id)
            });
        } else {
            body.datecreated = new Date();
            body.dateupdated = new Date();
            body.id = UID();
            body.linker = `/category/${category_one}/${category_two}/c2-${body.id}`
            nosql.insert('saveCat', 'category_two').make(function (builder) {
                builder.set(body);
            });
        }
    } else {
        console.log("No cat one-----");
    }
    

    nosql.exec(function (err, response) {
        if (err) {
            console.log("mongoerr", err);
            if(err.items[0].error.includes("E11000") ) {
                self.json({
                    status: false,
                    message:`Category ${body.category_two} already exists`
                })
            }
        }
        // console.log("response", response.saveCat);
        self.json({
            status: true,
            message: "Success"
        })
    });
}

// category filter functions
async function getCat() {
    var self = this;
    const client = new MongoClient(MONGO_DB_CONNECTION, { useNewUrlParser: true });
    client.connect(function (err, C) {
        assert.equal(null, err);
        const db = C.db(DB_NAME);

        catAggr(db, function (cat) {
            C.close();
            self.json(cat);
        });
    });
}

async function getSubCat() {
    var self = this;
    const client = new MongoClient(MONGO_DB_CONNECTION, { useNewUrlParser: true });
    client.connect(function (err, C) {
        assert.equal(null, err);
        const db = C.db(DB_NAME);

        subCatAggr(db, self.body.category, function (subcat) {
            C.close();
            self.json(subcat);
        });
    });
}

// aggregation function to get the categories
function catAggr(db, cb) {
    const collection = db.collection('product_categories');
    collection.aggregate([
        {
            "$group": {
                _id: {
                    category: "$category",
                }
            }
        }, {
            $project: {
                "Category": "$_id.category",
                "_id": 0
            }
        }
    ]).toArray(function (err, result) {
        console.log("CAT AGGREGATE", "err", err, result);
        var output = {
            status: false,
            message: "No Category"
        }
        if (result.length == 0 || result[0].Category == null) {
            cb(output);
            return;
        }
        cb(result);
    });
}

// aggr function to get the sub categories
function subCatAggr(db, cat, cb) {
    const collection = db.collection('product_categories');
    collection.aggregate([
        {
            $match: {
                category: cat
            }
        },
        {
            $group: {
                "_id": {
                    "sub_category": "$sub_category"
                },
                "Count": { "$sum": 1 }
            }
        }, {
            $project: {
                "sub_category": "$_id.sub_category",
                "_id": 0
            }
        }
    ]).toArray(function (err, result) {
        //console.log("result", result);
        var output = {
            status: false,
            message: "No Sub Category"
        }
        if (result.length == 0 || result[0].sub_category == null) {
            cb(output);
            return;
        } else {
            result.forEach(element => {
                var display_name = element.sub_category.split(cat + ' / ');
                element.display_name = display_name[1]
            });
        }
        cb(result);
    });
}

// db.getCollection("pincodes").find({}).forEach(function (docs) {
//         docs.isAvailable = false;

//         db.getCollection("pincodes").save(docs);
//         print("UPDATED : " + docs.isAvailable);
// });