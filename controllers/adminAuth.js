var MONGO_DB_CONNECTION = process.env.MONGO_DB_CONNECTION || F.config['mongo'];;
var Agent = require('sqlagent/mongodb').connect(MONGO_DB_CONNECTION);
var jwt = require('jsonwebtoken');
var md5 = require('md5');

// jwt secret key 
var JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'JDSFNKLSJDGKLJW4732KEWFNKNE8978SDNFSNS9834JDF';

exports.install = function () {
  // admin users
  ROUTE('/admin-auth/api/admin-user', createAdminUser, ['POST', '#adminVerify', 'cors', 10000]);
  ROUTE('/admin-auth/api/admin-user', getAdminUsers, ['cors', '#adminVerify', 10000]);
  ROUTE('/admin-auth/api/admin-user', deleteAdminUser, ['DELETE', '#adminVerify', 'cors', 10000]);
  ROUTE('/admin-auth/api/admin-user/{id}', getAdminUserById, ['cors', '#adminVerify', 10000]);
  ROUTE('/admin-auth/api/admin-user/update-password/{id}', updatePassword, ['PUT', '#adminVerify', 'cors', 10000]);

  // admin user login
  ROUTE('/admin-login', adminAuthLogin, ['POST', 'cors']);
}

// update admin user password
function updatePassword() {
  var self = this;
  var body = self.body;
  var id = self.params.id;
  try {
    var decoded = self.token;
    console.log("decoded ------", decoded, md5(body.password))
    var mnosql = new Agent();
    // update
    //console.log("UPDATE ADMIN USER")
    mnosql.update('updateAdmin', 'admin_users').make(function (builder) {
      builder.where('id', id);
      builder.set('password', md5(body.password));
      builder.set('dateupdated', new Date());
    });


    //var addAdmin = await mnosql.promise('addAdmin');
    mnosql.exec(function (err, response) {
      console.log("MONGO err", err)
      if (err) {
        return self.json({
          status: false,
          message: err
        })
      }
      //console.log("resp", response.updateAdmin);
      self.json({
        status: true,
        message: "Password Updated Successfully"
      })
    })


  } catch (err) {
    console.log("err", err)
    self.json({
      status: false,
      message: "Sorry some thing went wrong"
    });
    return;
  }
}


//admin user login
function adminAuthLogin() {
  var self = this;
  var mnosql = new Agent();
  console.log("admin login function called ----------------------------------------------------------");
  mnosql.select('getAdmin', 'admin_users').make(function (builder) {
    builder.where('name', self.body.name);
    builder.first();
  });
  mnosql.exec(function (err, response) {
    //console.log("rresponse", response.getAdmin)
    if (err) {
      console.log("MONGO ERR", err)
      self.json({ status: false })
      return;
    }
    if (response.getAdmin != null) {
      console.log(md5(self.body.password), response.getAdmin.password);
      var EncryptPassword = md5(self.body.password);


      if (EncryptPassword == response.getAdmin.password) {
       // console.log("response-----------",response);
      
        var token = jwt.sign({
          name: 'Administrator',
          login: 'admin',
          password: '1234567890',
          roles: [],
          sa: true,
          userData: {
            id: response.getAdmin.id,
            email: response.getAdmin.email,
            name: response.getAdmin.name,
            role: response.getAdmin.role,
            warehouse_ids: response.getAdmin.warehouse_ids || []
          }
        }, JWT_SECRET_KEY, { expiresIn: '23h' });
        self.json({
          status: true,
          message: "Login Success",
          token: token,
          data: response.getAdmin
        })
      } else {
        self.json({
          status: false,
          message: "Invalid Password",
        })
      }
    } else {
      self.json({ status: false, message: "User not found" })
    }
  })
}

// add and update admin user
function createAdminUser() {

  var self = this;
  var body = self.body;


  try {
    var decoded = self.token.userData;
    console.log("decoded ------", decoded)


    var mnosql = new Agent();
    if (body.id) { // update
      //console.log("UPDATE ADMIN USER")
      var updateObj = {
        //id: UID(),
        name: body.name,
        email: body.email,
        gender: body.gender,
        access: body.access || [],
        menuList: body.menuList || [],
        //createdBy: decoded.name,
        updatedBy: decoded.name,
        role: body.role,
        dateupdated: new Date(),
        warehouse_ids: body.warehouse_ids || [],
        shipping_by: body.shipping_by || "",
        delivery_details: body.delivery_details || "",
        delivery_charges: body.delivery_charges || ""
      }
      
      mnosql.update('updateAdmin', 'admin_users').make(function (builder) {
        builder.where('id', body.id);
        builder.set(updateObj)
      });
    } else { // add new user
      //console.log("ADD ADMIN USER")
      var obj = {
        id: UID(),
        name: body.name,
        email: body.email,
        password: md5(body.password),
        gender: body.gender,
        access: body.access || [],
        menuList: body.menuList || [],
        createdBy: decoded.name || "",
        //createdBy: "",
        role: body.role,
        datecreated: new Date(),
        dateupdated: new Date(),
        warehouse_ids: body.warehouse_ids || [], 
        shipping_by: body.shipping_by || "",
        delivery_details: body.delivery_details || "",
        delivery_charges: body.delivery_charges || ""
      };
      mnosql.insert('addAdmin', 'admin_users').make(function (builder) {
        builder.set(obj)
      });
    }

    //var addAdmin = await mnosql.promise('addAdmin');
    mnosql.exec(function (err, response) {
      console.log("MONGO err", err, response)
      if (err) {
        return self.json({
          status: false,
          message: err
        })
      }
      self.json({
        status: true,
        // id: obj.id
      })
    })


  } catch (err) {
    console.log("err", err)
    self.json({
      status: false,
      message: "Sorry some thing went wrong"
    });
    return;
  }
}

// get admin users
async function getAdminUsers() {
  //console.log("get admin login users");
  var self = this;
  var opt = self.query;
  var mnosql = new Agent();
  var token = self.headers['x-auth'];
  console.log("admin token---------", token);

  try {
    var decoded = self.token.userData;
    //console.log("decoded", decoded)
    mnosql.listing('getAdmin', 'admin_users').make(function (builder) {
      builder.sort('dateupdated', 'desc');
      //builder.where('createdBy', decoded.name);
      builder.page(opt.page || 1, opt.limit || 10);
    });

    var getAdmin = await mnosql.promise('getAdmin');

    //console.log(getAdmin);
    if (getAdmin != null) {
      self.json({ status: true, data: getAdmin })
    } else {
      self.json({ status: false })
    }

  } catch (err) {
    console.log("err", err)
    self.json({
      status: false,
      message: "Sorry some thing went wrong"
    });
    return;
  }

}

// delete admin user
async function deleteAdminUser() {
  var self = this;


  try {
    var decoded = self.token.userData;
    // console.log("decoded---", decoded)

    var mnosql = new Agent();
    mnosql.remove('deleteAdmin', 'admin_users').make(function (builder) {
      builder.where('id', self.query.id);
    });
    var deleteAdmin = await mnosql.promise('deleteAdmin');
    if (deleteAdmin > 0) {
      self.json({ status: true, message: "Admin deleted" })
    } else {
      self.json({ status: false })
    }

  } catch (err) {
    // console.log("err", err)
    self.json({
      status: false,
      message: "Sorry some thing went wrong"
    });
    return;
  }

}

// get admin user by id
async function getAdminUserById(id) {
  var self = this;

  try {
    var decoded = self.token.userData;
    //console.log("decoded", decoded)
    var mnosql = new Agent();
    console.log("admin", self.controller);
    mnosql.select('getAdmin', 'admin_users').make(function (builder) {
      builder.where('id', id);
      builder.first();
    });

    var getAdmin = await mnosql.promise('getAdmin');

    if (getAdmin != null) {
      self.json({ status: true, data: getAdmin })
    } else {
      self.json({ status: false })
    }

  } catch (err) {
    console.log("err", err)
    self.json({
      status: false,
      message: "Sorry some thing went wrong"
    });
    return;
  }

}


