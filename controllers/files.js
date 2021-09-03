
var AWS = require('aws-sdk');
// var ImageResize = require('image-resize');
var Jimp = require('jimp');

exports.install = function() {
	// COMMON
	FILE('/download/', file_read);

	// ESHOP
	FILE('/images/small/*.jpg', file_image);
	FILE('/images/large/*.jpg', file_image);
	FILE('/img/com/*.jpg', image);
};


// Reads a specific file from database
// For images (jpg, gif, png) supports percentual resizing according "?s=NUMBER" argument in query string e.g.: .jpg?s=50, .jpg?s=80 (for image galleries)
// URL: /download/*.*
// http://localhost:8000/img/com/EUDIVB-1589528178553.jpg
function image(req, res){
	// var imageResize = new ImageResize({
	// 	format: 'jpg',
	// 	width: 190
	//   });
	  var self = this;
	 
	  var url = "https://d34e6224thkkna.cloudfront.net/happi/"+req.split[2];

	  Jimp.read(url)
		.then(image => {
			// Do stuff with the image.
			console.log('image.resize', image);
			image.resize(200, Jimp.AUTO, function(err, image){
				image.write('public/temp/'+req.split[2]);
				console.log('image.writer');
				setTimeout(function(){
					res.redirect('/temp/'+req.split[2]);
					console.log('image.CLEANUP');
				},100);
				setTimeout(function(){
					require('fs').unlinkSync('public/temp/'+req.split[2])
				}, 1500);
				
				// var writer = require('fs').createWriteStream('public/temp-'+req.split[2]);
				
				// 	// Releases F.exists()
				// 	console.log('image.CLEANUP');
				// 	//next();
				// 	// Image processing
				// 	res.image('temp-'+req.split[2], function(img) {
				// 		img.output('jpg');
				// 		img.quality(90);
				// 		img.minify();
				// 	});
				
				//image.pipe(writer);
			});
			// image
			// 	.resize(200, Jimp.AUTO) // resize
			// 	.write('lena-small-bw.jpg');
		})
		.catch(err => {
			// Handle an exception.
			console.error(err);
		});

	// imageResize.play(url)
	//   .then(function(response) {
	// 	console.log(response);
	//   })
	//   .catch(function(error) {
	// 	console.error(error);
	//   });  



}

function file_read(req, res) {

	var id = req.split[1].replace('.' + req.extension, '');

	if (!req.query.s || (req.extension !== 'jpg' && req.extension !== 'gif' && req.extension !== 'png')) {
		// Reads specific file by ID
		F.exists(req, res, function(next, filename) {
			NOSQL('files').binary.read(id, function(err, stream) {

				if (err) {
					next();
					return res.throw404();
				}

				var writer = require('fs').createWriteStream(filename);

				CLEANUP(writer, function() {
					res.file(filename);
					next();
				});

				stream.pipe(writer);
			});
		});
		return;
	}

	// Custom image resizing
	var size;

	// Small hack for the file cache.
	// F.exists() uses req.uri.pathname for creating temp identificator and skips all query strings by creating (because this hack).
	if (req.query.s) {
		size = req.query.s.parseInt();
		req.uri.pathname = req.uri.pathname.replace('.', size + '.');
	}

	// Below method checks if the file exists (processed) in temporary directory
	// More information in total.js documentation
	F.exists(req, res, 10, function(next, filename) {

		// Reads specific file by ID
		NOSQL('files').binary.read(id, function(err, stream) {

			if (err) {
				next();
				return res.throw404();
			}

			var writer = require('fs').createWriteStream(filename);
			CLEANUP(writer, function() {

				// Releases F.exists()
				next();

				// Image processing
				res.image(filename, function(image) {
					image.output(req.extension);
					req.extension === 'jpg' && image.quality(85);
					size && image.resize(size + '%');
					image.minify();
				});
			});

			stream.pipe(writer);
		});
	});
}

// Reads specific picture from database
// URL: /images/small|large/*.jpg
function file_image(req, res) {

	// Below method checks if the file exists (processed) in temporary directory
	// More information in total.js documentation

	// 	console.log(req.split[2]);

	// const s3 = new AWS.S3({
	// 	accessKeyId: "AKIAJAPPVINW2LMTOVXA",
	// 	secretAccessKey: "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"
	// });

	// happi S3 credentails 
	// AKIASTAEMZYQTLP6FLB4
	// MaEdglPhsaM0TrJ4c+nBhU80p64VTncaVabMTzNV

	//var params = {Bucket: 'storage.wrkwth.com', Key: 'happi/'+req.split[2]};
	//var url = s3.getSignedUrl('getObject', params);

	//console.log(url);
	var url = "https://d34e6224thkkna.cloudfront.net/happi/"+req.split[2];
	//console.log("CDN", url);
	res.redirect(url);
	// res.writeHead(301, {'Location' : url});
  	// res.end();

	// F.exists(req, res, 10, function(next, filename) {

	// 	// Reads specific file by ID
	// 	NOSQL('files').binary.read(req.split[2].replace('.jpg', ''), function(err, stream) {

	// 		if (err) {
	// 			next();
	// 			return res.throw404();
	// 		}

	// 		var writer = require('fs').createWriteStream(filename);

	// 		CLEANUP(writer, function() {

	// 			// Releases F.exists()
	// 			next();

	// 			// Image processing
	// 			res.image(filename, function(image) {
	// 				image.output('jpg');
	// 				image.quality(90);

	// 				if (req.split[1] === 'large')
	// 					image.miniature(1024, 768);
	// 				else
	// 					image.miniature(200, 150);

	// 				image.minify();
	// 			});
	// 		});

	// 		stream.pipe(writer);
	// 	});
	// });
}