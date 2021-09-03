var MONGO_DB_CONNECTION = process.env.MONGO_DB_CONNECTION || F.config['mongo'];;
var Agent = require('sqlagent/mongodb').connect(MONGO_DB_CONNECTION);

// send email import module
var emailModule = MODULE('email');

const path = require('path');

// create uuid module import
var generateUuidModule = MODULE('generate-uuid');

exports.install = function () { 
    ROUTE('/admin/api/faq', addAndUpdateFaq, ['post', '#adminVerify', 'cors']);
    ROUTE('/admin/api/faq', getFaq, ['#adminVerify', 'cors']);
    ROUTE('/api/faqs', getUserFaq, ['cors']);
    ROUTE('/api/support-mail', sendSupportMail, ['post','cors']);

}

async function addAndUpdateFaq() {
	var self = this;
	var data = self.body;
	var JOB_ID = generateUuidModule.createUUID();
	var nosql = new Agent();
	if (!data) {
		self.json({
			status: false,
			message: "no data"
		})
	} else {
		// check if json is present in db
		nosql.select('getFaq', 'configuration').make(function (builder) {
			builder.where('configurationName', 'FAQ');
			builder.first();
		});

		var getFaq = await nosql.promise('getFaq');
		if (getFaq != null) {
			nosql.update('saveFaq', 'configuration').make(function (builder) {
				builder.where('configurationName', 'FAQ');
				builder.set('configurationDetails', data);
			});
		} else {
			nosql.insert('saveFaq', 'configuration').make(function (builder) {
				builder.set('configurationName', 'FAQ');
				builder.set('configurationDetails', data);
			});
		}

		var FaqData = await nosql.promise('saveFaq');
		self.json({
			status: true,
			message: "Saved Successfully"
		})
		console.log("FAQ_RAW_SAVE_TRIGGERED", new Date().toISOString(), JOB_ID, FaqData);
	}
}

// function to get data
async function getFaq() {
	var self = this;
	var nosql = new Agent();
	nosql.select('getfaq', 'configuration').make(function (builder) {
		builder.where('configurationName', 'FAQ');
		builder.first();
	});
	var getfaq = await nosql.promise('getfaq');
	var json = getfaq.configurationDetails;
	//console.log("data",json)
	self.json(json);
}

// function to get data
async function getUserFaq() {
	var self = this;
	var nosql = new Agent();
	nosql.select('getfaq', 'configuration').make(function (builder) {
		builder.where('configurationName', 'FAQ');
		builder.first();
	});
	var getfaq = await nosql.promise('getfaq');
	var json = getfaq.configurationDetails;
    //console.log("data",json)
    if(self.query.json == 1) {
        return self.json(json);
    }
	return self.json(json);
	
}

async function sendSupportMail() {
    var self = this;
    var body = self.body;
	body.name = body.name || "N/A";
    var email = {
        // to:["sowmya@iipl.work"],
		to: ['shopsasta20@gmail.com'],
		from:'shopsasta - Community Group Buying <noreply@mail.shopsasta.com>',
		//bcc: ['rakesh@iipl.work'],
        subject: `Support Request From ${body.email}`,
        body: `
        User Name: ${body.name}
        Email: ${body.email}
        Phone: ${body.phone}
		Title: ${body.title}
        Question: ${body.que}`,
        attachments: []
    };
    emailModule.send_mail(email.to,email.from, email.subject, email.body, email.attachments, function (err, result1) {
        console.log("Email Res", err, result1);
		if (err) {
			return	self.json({
				status:false,
				message:"Sorry, Email not sent."
			})
		}
	
		self.json({
			status:true,
			message:"Mail sent successfully.Shop sasta team will contact you shortly by email or call."
		})
    })

	
}



