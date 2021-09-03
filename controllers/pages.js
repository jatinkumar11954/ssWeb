var MONGO_DB_CONNECTION = process.env.MONGO_DB_CONNECTION || F.config['mongo'];;
var Agent = require('sqlagent/mongodb').connect(MONGO_DB_CONNECTION);


exports.install = function () {
    // Pages 
    ROUTE('#admin/api/page', savePages, ['POST', 'cors', 10000]);
    ROUTE('#admin/api/page', getPages, ['cors', 10000]);
    ROUTE('#admin/api/page/{id}', deletePages, ['delete', 'cors', 10000]);
    ROUTE('#admin/api/page/{id}', getPage, ['cors']);

    // render page
    ROUTE('/pages/*', renderPages, ['cors', 10000]);

    // Mob Pages
    ROUTE('#admin/api/page-mob', savePagesMob, ['POST', 'cors', 10000]);
    ROUTE('#admin/api/page-mob', getPagesMob, ['cors', 10000]);
    ROUTE('#admin/api/page-mob/{id}', deletePagesMob, ['delete', 'cors', 10000]);
    ROUTE('#admin/api/page-mob/{id}', getPageMob, ['cors']);

    //Render Mob page
    ROUTE('/pages-mob/*', renderPagesMob, ['cors', 10000]);

}

// Pages Admin

async function savePages() {
    var self = this;
    var model = self.body;
    model.datecreated = new Date();
    var isUpdate = !!model.id;
    //console.log("model",model);
    var nosql = new Agent();
    if (isUpdate) {
        model.dateupdated = new Date();
    } else {
        model.id = UID();
        model.datecreated = new Date();
        model.dateupdated = new Date();
    }
    if (isUpdate) {
        nosql.update('updatePage', 'pages').make(function (builder) {
            builder.set(model);
            builder.where('id', model.id)
        })

        var updatePage = await nosql.promise('updatePage');
        if (updatePage > 0) {
            self.json({
                status: true,
                message: "Success"
            })
        } else {
            self.json({
                status: false,
                message: "Fail"
            })
        }
    } else {
        nosql.insert('savePage', 'pages').make(function (builder) {
            builder.set(model)
        })
        var savePage = await nosql.promise('savePage');
        //console.log("savePage",savePage);
        if (savePage != null) {
            self.json({
                status: true,
                message: "Success"
            })
        } else {
            self.json({
                status: false,
                message: "Fail"
            })
        }
    }

}

async function getPages() {
    var self = this;
    var opt = self.query;
    var nosql = new Agent();
    nosql.select('getPages', 'pages').make(function (builder) {
        builder.page(opt.page || 1, opt.limit || 10);
        builder.sort('datecreated', 'desc');
    })
    var getPages = await nosql.promise('getPages');
    //console.log("getPages", getPages);
    if (getPages != null) {
        self.json({
            status: true,
            data: getPages
        })
    } else {
        self.json({
            status: false
        })
    }
}

async function deletePages() {
    var self = this;
    var pageInfo = self.params;
    var nosql = new Agent();

    nosql.remove('deletePage', 'pages').make(function (builder) {
        builder.where('id', pageInfo.id);
    });

    var deletePage = await nosql.promise('deletePage');
    console.log("deletePage", deletePage);
    if (deletePage > 0) {
        self.json({
            status: true,
            message: "Page deleted Successfully"
        })
    } else {
        self.json({
            status: false
        })
    }
}

async function getPage() {
    var self = this;
    var opt = self.params;
    var nosql = new Agent();
    //console.log("id", opt);
    nosql.select('getPage', 'pages').make(function (builder) {
        builder.where('id', opt.id);
        builder.first();
    });

    var getPage = await nosql.promise('getPage');
    if (getPage != null) {
        self.json({
            status: true,
            message: "Success",
            data: getPage
        })
    } else {
        self.json({
            status: false
        })
    }
}


async function savePagesMob() {
    var self = this;
    var model = self.body;
    model.datecreated = new Date();
    var isUpdate = !!model.id;
    //console.log("model",model);
    var nosql = new Agent();
    if (isUpdate) {
        model.dateupdated = new Date();
    } else {
        model.id = UID();
        model.datecreated = new Date();
        model.dateupdated = new Date();
    }
    if (isUpdate) {
        nosql.update('updatePage', 'pages-mob').make(function (builder) {
            builder.set(model);
            builder.where('id', model.id)
        })

        var updatePage = await nosql.promise('updatePage');
        if (updatePage > 0) {
            self.json({
                status: true,
                message: "Success"
            })
        } else {
            self.json({
                status: false,
                message: "Fail"
            })
        }
    } else {
        nosql.insert('savePage', 'pages-mob').make(function (builder) {
            builder.set(model)
        })
        var savePage = await nosql.promise('savePage');
        //console.log("savePage",savePage);
        if (savePage != null) {
            self.json({
                status: true,
                message: "Success"
            })
        } else {
            self.json({
                status: false,
                message: "Fail"
            })
        }
    }

}

async function getPagesMob() {
    var self = this;
    var opt = self.query;
    var nosql = new Agent();
    nosql.select('getPages', 'pages-mob').make(function (builder) {
        builder.page(opt.page || 1, opt.limit || 10);
        builder.sort('datecreated', 'desc');
    })
    var getPages = await nosql.promise('getPages');
    //console.log("getPages", getPages);
    if (getPages != null) {
        self.json({
            status: true,
            data: getPages
        })
    } else {
        self.json({
            status: false
        })
    }
}

async function deletePagesMob() {
    var self = this;
    var pageInfo = self.params;
    var nosql = new Agent();

    nosql.remove('deletePage', 'pages-mob').make(function (builder) {
        builder.where('id', pageInfo.id);
    });

    var deletePage = await nosql.promise('deletePage');
    console.log("deletePage", deletePage);
    if (deletePage > 0) {
        self.json({
            status: true,
            message: "Page deleted Successfully"
        })
    } else {
        self.json({
            status: false
        })
    }
}

async function getPageMob() {
    var self = this;
    var opt = self.params;
    var nosql = new Agent();
    //console.log("id", opt);
    nosql.select('getPage', 'pages-mob').make(function (builder) {
        builder.where('id', opt.id);
        builder.first();
    });

    var getPage = await nosql.promise('getPage');
    if (getPage != null) {
        self.json({
            status: true,
            message: "Success",
            data: getPage
        })
    } else {
        self.json({
            status: false
        })
    }
}

// user render page
async function renderPages() {
    var self = this;
    var url = self.url.substr(6, self.url.length - 1);
    console.log("URL -----------------------------------------", url);
    var opt = self.params;
    var nosql = new Agent();
    //console.log("id", opt);
    nosql.select('getPage', 'pages').make(function (builder) {
        builder.where('url', url);
        builder.first();
    });

    var getPage = await nosql.promise('getPage');
    if (getPage != null) {
        if(self.query.json) {
            self.json(getPage);
            return;
        }
        self.layout('nolayout');
        self.view('~cms/default', getPage);
    } else {
        self.json({
            status: false
        })
    }
}

// user render page Mobile
async function renderPagesMob() {
    var self = this;
    var url = self.url.substr(10, self.url.length - 1);
    console.log("URL -----------------------------------------", url);
    var opt = self.params;
    var nosql = new Agent();
    //console.log("id", opt);
    nosql.select('getPage', 'pages-mob').make(function (builder) {
        builder.where('url', url);
        builder.first();
    });

    var getPage = await nosql.promise('getPage');
    if (getPage != null) {
        if(self.query.json) {
            self.json(getPage);
            return;
        }
        self.layout('nolayout');
        self.view('~cms/default-new', getPage);
    } else {
        self.json({
            status: false
        })
    }
}


// {"id":"382166001ll61b",
// "body":"<div class=\"CMS_widgets\" data-cms-category=\"Content,Columns\"><style>#demo,#demo2,.arrival-b,.dual-b,.gaming-b,.gadgets-b,.popular-b,.logos-sec,.home-videos,.top,.home-only,.tv-b{display:none !important}.wc156links a{color:black;text-decoration:none;color:#16ace2;padding:10px 0}.wc156links{background-color:#e7e7e7;padding:15px}.blood-donation{height:800px}</style><iframe class=\"blood-donation\" src=\"https://old.happimobiles.com/iphone-12/\" style=\"width:100%;\"></iframe><div></div></div>",
// "bodywidgets":[],"icon":"","ispartial":false,"keywords":"iPhone 12 Prebook",
// "description":"","name":"iPhone 12 Prebook","parent":"","partial":[],"summary":"",
// "pictures":[],"search":"12 ipho prebo","template":"default","title":"iPhone 12 Prebook",
// "url":"/iphone-12-prebooking/","widgets":[],"signals":[],"navigations":null,"navicon":true ,
// "navname":true ,"replacelink":true ,"datecreated":"2020-10-23T08:26:29.698Z","admincreated":"Administrator"}
