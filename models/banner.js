
// NEWSCHEMA('Banners').make(function(schema) {
// 	schema.define('id', 'UID');
// 	schema.define('title', 'String(50)');
// 	schema.define('link', String);
// 	schema.define('target', String);
//     schema.define('pictures', String);
//     schema.define('active', Boolean);
//     schema.define('datecreated', Date);
//     schema.define('devicetype', String);
//     schema.define('modified', Date);

//     schema.setQuery(function($) {
//         var opt = $.query;
        
       
//         var filter;
//         if(opt.active){
//             filter = NOSQL('Banner').find().where('active', true);
//         }else{
//             filter = NOSQL('Banner').find()
//         }

//         filter.callback(function(err, docs, count) {
// 			$.callback(filter.adminOutput(docs, count));
//         });
        
//     });

//     schema.setSave(function($) {

//         var model = $.model;
		
//         var nosql = NOSQL('Banner');
        
//         // NOSQL('wishlist')
//         model.id = UID();
//         model.datecreated = F.datetime;
        
//         if(model.uid == ''){
//             $.invalid('invalid-user');
// 			return;
        
//         }

//         nosql.insert(model);
//             $.success(true, model.id);
            
//     });

// //     schema.addWorkflow('inactive', function($) {
// //         // ADMIN.notify({ type: 'subscribers.unsubscribe', message: $.query.email });
// //         console.log("DELETE", $.query.id );
// //         //NOSQL('wishlist').modify({ active: false }).where('id', $.query.id);
// //         NOSQL('Banner').modify({ active: false }).make(function(builder) {
// //             // builder.first(); --> modifies only the one document
// //             builder.where('id', $.query.id);
// // ​
// //             builder.callback(function(err, count) {
// //                 console.log('modified documents:', count);
// //                 $.success();
// //             });
// //         });
// // ​
// //     });
// //     schema.addWorkflow('active', function($) {
// //         // ADMIN.notify({ type: 'subscribers.unsubscribe', message: $.query.email });
// //         console.log("DELETE", $.query.id );
// //         //NOSQL('wishlist').modify({ active: false }).where('id', $.query.id);
// //         NOSQL('Banner').modify({ active: true }).make(function(builder) {
// //             // builder.first(); --> modifies only the one document
// //             builder.where('id', $.query.id);
// // ​
// //             builder.callback(function(err, count) {
// //                 console.log('modified documents:', count);
// //                 $.success();
// //             });
// //         });
// // ​
// // 	});
// });