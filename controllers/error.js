// exports.install = function() {
//     ROUTE('#400', custom); // Bad Request
//     ROUTE('#401', custom401); // Unauthorized
//     ROUTE('#403', custom); // Forbidden
//     ROUTE('#404', custom404); // Not Found
//     ROUTE('#408', custom); // Request Timeout
//     ROUTE('#409', custom); // Conflict
//     ROUTE('#431', custom); // Request Header Fields Too Large
//     ROUTE('#500', custom); // Internal Server Error
//     ROUTE('#501', custom); // Not Implemented
// }
// function custom() {

//     var self = this;
//     console.log('error custeom');
//     self.layout('layout-new');
// 	self.view('errorview');

// }

// // function custom404() {
// //     var self = this;
// //     console.log('error 404');
// //     self.layout('layout-new');
// //     self.view('errorview');
    
// // }

// function custom401() {
//     console.log('error 401');
//     this.json({
//         message:"Invalid Token"
//     })
// }
