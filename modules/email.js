var nodemailer = require('nodemailer');
// send mail 
var options = {
    host: "smtp.mailgun.org",
    port: 465,
    ignoreTLS: true,
    secure: true, // use TLS
    auth: {
        user: "noreply@mail.shopsasta.com",
        pass: "2652fc199e1f1e1ef7366e5da6952e30-1553bd45-87e037c4"
    },
    timeout: 10000
}
let smtpTransport = nodemailer.createTransport(options);

function send_mail(to,from, subject, body, attachments, cb) {
    var obj = {
        from: from, // sender address
        to: to, // list of receivers
        subject: subject, // Subject line
        text: body, // plain text body
        //html: html, // html body
        attachments: attachments
    };
    smtpTransport.sendMail(
        obj
        , function (err, data) {

            cb(err, data);
        });
};

module.exports.send_mail = send_mail;
