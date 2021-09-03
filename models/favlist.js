// For importing
const Fs = require('fs');

NEWSCHEMA('wishlist').make(function(schema) {
	schema.define('id', 'UID');
	schema.define('uid', 'String(50)');
	schema.define('pid', 'String(50)');
    schema.define('active', Boolean);


    schema.setQuery(function($) {
        var opt = $.options === EMPTYOBJECT ? $.query : $.options;
        
        var uid =  $.user ? $.user.id : '';


        var filter = NOSQL('wishlist').find().where('uid', uid).where('active', true);

        
        filter.callback(function(err, docs, count) {
			$.callback(filter.adminOutput(docs, count));
		});

    });

    schema.setSave(function($) {

        var model = $.model;
		
		var nosql = NOSQL('wishlist');

        // NOSQL('wishlist')
        model.id = UID();
        model.datecreated = F.datetime;

        model.uid = $.user ? $.user.id : '';
        model.active = true;
        
        if(model.uid == ''){
            $.invalid('invalid-user');
			return;
        }

        nosql.insert(model);
			$.success(true, model.id);

    });

    schema.addWorkflow('delete', function($) {
        // ADMIN.notify({ type: 'subscribers.unsubscribe', message: $.query.email });
        console.log("DELETE", $.query.id );
        
        //NOSQL('wishlist').modify({ active: false }).where('id', $.query.id);
        var uid = $.user ? $.user.id : '';

        NOSQL('wishlist').modify({ active: false }).make(function(builder) {
            // builder.first(); --> modifies only the one document
            builder.where('pid', $.query.id);
            builder.where('uid', uid);

            builder.callback(function(err, count) {
                console.log('modified documents:', count);
                $.success();
            });
        });

		
	});

    // schema.addWorkflow('verify', function($) {
	// 	// ADMIN.notify({ type: 'subscribers.unsubscribe', message: $.query.email });
      
    //     var uid =  $.user ? $.user.id : '';
    //     var q = 'pid='+$.query.pid+' && uid='+uid+'';
    //     NOSQL('wishlist').find().query(q).callback(function (e,res) {
    //         $.success(true,response);
    //         console.log('WiShhhhhhhhhhhhhhhhhhhhh',response)
    //     });
    //     // $QUERY('wishlist', [{ pid: $.query.pid},{uid : uid}], (err, response) => {
           
        
    //     // });

	// });

});


