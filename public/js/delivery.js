// var newBaseUrl = 'http://localhost:8005/';
var newBaseUrl = '/';
$('#verifyForm').hide();
$('.sendotp-error').hide();
$('.verify-error').hide();
$('.registration-error').hide();
$('.order-detail').hide();
$('.orders-list').show();
$('.back-btn').hide();
var isDelivered = "Delivered";
$('.cash-phone').hide();
$('.phone-error').hide();
var isCod = true;
var tempObj = {};
$('.reload-btn').hide();
$(document).ready(function () {

    // var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    // if (!isMobile) {
    //     return window.location.href = '/';
    // }


    if (localStorage.getItem('deluserData')) {
        console.log("LLLLLLLLLLLLLLLLLLLLLLL");
        if (window.location.pathname.split('/')[1] == "delivery") {
            window.location.href = "/delivery-list";
        }
        if (window.location.pathname.split('/')[1] == "delivery-list") {
            getDeliveryList();
        }
    } else {
        if (window.location.pathname.split('/')[1] == "delivery-list") {
            window.location.href = "/delivery";
        }
        // 
    }
});

function phonenumber(inputtxt) {
    var phoneno = /^\d{10}$/;
    if ((inputtxt.match(phoneno))) {
        return true
    }
    else {
        return false
    }
}

$("input:radio[name=delivered]").change(function () {
    $('.phone-error').hide();
    if ($(this).val() == "notdelivered") {
        isDelivered = "Delivery Attempted";
        $('.final-btn').html('Submit');
        $('.payment-block').hide();
    } else {
        if (isCod) {
            isDelivered = "Delivered";
            $("#paymentType").val("cash");
            $('.final-btn').html('Submit');
            $('.cash-phone').hide();
            $('.payment-block').show();
        }

    }
});

function login() {
    var sendOtpObj = {
        phoneNo: $('#del-phone').val(),
    };

    $.ajax(`${newBaseUrl}api/user-login/`, {
        type: 'POST',
        data: JSON.stringify(sendOtpObj),
        dataType: 'json', // type of response data
        contentType: 'application/json',
        success: function (response, status, xhr) { // success callback function



            if (response['status']) {
                $('.sendotp-error').hide();
                $('#sendOtpForm').hide();
                $('#verifyForm').show();
            }
            else {
                $('.sendotp-error').show();
                $('.sendotp-error').html(response["message"]);

            }
        },
        error: function (jqXhr, textStatus, errorMessage) { // error callback 
            console.log("errror");

        }
    });
}

function verifyOtpSubmit() {

    var verifyOtpObj = {
        phoneNo: $('#del-phone').val(),
        otp: $('#otp').val(),

    };

    $.ajax(`${newBaseUrl}api/delivery-person/otp-verify`, {
        type: 'POST',
        data: JSON.stringify(verifyOtpObj),
        dataType: 'json', // type of response data
        contentType: 'application/json',
        success: function (response, status, xhr) { // success callback function

            if (response['status']) {
                $('.verify-error').hide();
                $('#verifyForm').hide();
                Swal.fire({
                    position: 'center',
                    icon: 'success',
                    title: response["message"],
                    showConfirmButton: false,
                    timer: 2000
                }).then(() => {
                    localStorage.setItem('deluserToken', response["token"]);
                    if (response["userState"]) {
                        localStorage.setItem('deluserData', JSON.stringify(response["data"]));
                        window.location.href = '/delivery-list';
                    } else {
                        console.log("USER STATE FALSE");
                        // $('#dontClose').hide();
                        // $('#registrationForm').show();
                        // $('#phone').val($('#phoneNo').val());
                    }
                });

            }
            else {

                $('.verify-error').show();
                $('.verify-error').html(response["message"]);

            }
        },
        error: function (jqXhr, textStatus, errorMessage) { // error callback 
            console.log("errror");

        }
    });
}


function getDeliveryList() {


    $.ajax(`${newBaseUrl}api/delivery-person/fetch-orders`, {
        type: 'GET',
        headers: {
            'x-auth': localStorage.getItem('deluserToken')
        },
        dataType: 'json', // type of response data
        contentType: 'application/json',
        success: function (response, status, xhr) { // success callback function



            if (response['status']) {
                for (let i = 0; i < response.data.length; i++) {
                    const element = response.data[i];
                    let daten = element.datecreated.split('T')[0].split('-');
                    let mnth = daten[1];
                    let dt = daten[2] + '-' +
                        mnth + '-' + daten[0];
                    let statusCls = 'warning';
                    let clickCls = '';
                    if (element.status == 'Delivered') {
                        statusCls = 'success';
                        clickCls = null;
                    } else if (element.status == 'Out for Delivery') {
                        statusCls = 'warning';
                        clickCls = element.id;
                    } else if (element.status == 'Delivery Attempted') {
                        statusCls = 'danger';
                        clickCls = null;
                    }
                    $('.each-order').append(`
                        <div style="border-bottom: 3px solid #efefef;" class="pb-3">
                        <div onclick="viewOrder('${clickCls}')">
                        <div class="top-b d-flex justify-content-between mb-3">
                        <div class="tp-f">
                            Order <span> #${element.id}</span>
                        </div>
                        <div class="tp-s">
                       
                
                        ${element.phone}
                        </div>
                    </div>
                    <div class="btm-b d-flex justify-content-between"  >
                        <div class="btm-f">
                            DATE ${dt}
                        </div>
                        <div class="btm-s">
                            <span class="badge badge-${statusCls}" style="font-size: 16px; font-weight: 500;">${element.status}</span>
                        </div>
                    </div></div>
                    </div>
                        `);
                }

            }
            else {

            }
        },
        error: function (jqXhr, textStatus, errorMessage) { // error callback 
            console.log("errror");

        }
    });
}

function viewOrder(id) {

    if (id == 'null') {
        console.log("NULLLLL");
        return;
    } else {
        $('.back-btn').show();
        $('.order-detail').show();
        $('.orders-list').hide();

        $.ajax(`${newBaseUrl}api/delivery-person/fetch-order/${id}`, {
            type: 'GET',
            headers: {
                'x-auth': localStorage.getItem('deluserToken')
            },
            dataType: 'json', // type of response data
            contentType: 'application/json',
            success: function (response, status, xhr) { // success callback function

                if (response.status) {
                    tempObj = response.data;
                    if (tempObj.p_type && tempObj.p_type == 'online') {
                        reloadStatus();
                        setInterval(() => {
                            reloadStatus();
                        }, 5000);
                    }
                    $('.sub-id').attr('value', tempObj.id);
                    $('.del-status').html(tempObj.status);
                    $('.each-detail').append(`
                    <ul style="padding-left:0;">
                    <li><span>Order Number:</span><span>${tempObj.number}</span></li>
                    <li><span>Name:</span><span>${tempObj.deliveryfirstname}${tempObj.deliverylastname}</span></li>
                    <li><span>Phone :</span> <span>      <a href="tel:${tempObj.phone}" style="text-decoration:none;">${tempObj.phone}</a>&nbsp;&nbsp;<img src="/img/phone.png" style=" height:15px;" />  </span></li>
                    <li><span>Address :</span> <span>
                    <a href="https://maps.google.com/?q=${tempObj.deliveryAddress_json.apartmentName}, ${tempObj.deliveryAddress_json.landmark}, ${tempObj.deliveryAddress_json.streetName},${tempObj.deliveryAddress_json.pinCode}" target="_blank">
                    ${tempObj.deliveryAddress_json.officeNum},${tempObj.deliveryAddress_json.apartmentName}, ${tempObj.deliveryAddress_json.landmark}, ${tempObj.deliveryAddress_json.streetName},${tempObj.deliveryAddress_json.areaDetails},${tempObj.deliveryAddress_json.city},${tempObj.deliverycountry}</a></span></li>
                    <li> <span>City PIN Code : </span> <span>${tempObj.deliveryzip}</span></li>
                    <li> <span>Order Value : </span> <span>₹${tempObj.price}</span></li>
                    <li> <span>Order Type : </span> <span>${tempObj.tag}</span></li>
                </ul>
                    `);
                    if (tempObj.p_type == 'online') {
                        $('.reload-btn').show();
                    } else {
                        $('.reload-btn').hide();
                    }

                }
                if (response.data.tag == "cod") {
                    isCod = true;
                    $('.payment-block').show();
                } else {
                    isCod = false;

                    $('.payment-block').hide();
                }
            },
            error: function (jqXhr, textStatus, errorMessage) { // error callback 
                console.log("errror");

            }
        });
    }


}

function getval(sel) {
    $('.phone-error').hide();
    if (sel.value == 'online') {
        $('.cash-phone').show();
        $('#phone').val(tempObj.phone);
        $('.final-btn').html('Generate Payment Link');

    } else {
        $('.final-btn').html('Submit');
        $('.cash-phone').hide();
        $('#phone').val('');
    }
}

function udpateStatus() {

    var verifyOtpObj = {
        status: isDelivered,
        type: $('#paymentType').val(),
        comment: $('#comment').val(),
        phone: $('#phone').val()
    };
    if (!isCod) {
        verifyOtpObj.phone = tempObj.phone;
        delete verifyOtpObj.type;
    }
    if (isDelivered == "Delivery Attempted") {
        delete verifyOtpObj.type;
        delete verifyOtpObj.phone;
    }

    if (verifyOtpObj.type == 'cash') {
        delete verifyOtpObj.phone;
    }
    let id = $('.sub-id').attr('value');


    let userPhone = false;
    if (!phonenumber($('#phone').val())) {
        $('.phone-error').show();
        userPhone = true;
    } else {
        $('.phone-error').hide();
        userPhone = false;
    }
    console.log("ddd", verifyOtpObj);

    $.ajax(`${newBaseUrl}api/delivery-person/delivery-status/${id}`, {
        type: 'POST',
        data: JSON.stringify(verifyOtpObj),
        dataType: 'json', // type of response data
        contentType: 'application/json',
        headers: {
            'x-auth': localStorage.getItem('deluserToken')
        },
        success: function (response, status, xhr) { // success callback function
            if (response.status) {
                Swal.fire({
                    position: 'center',
                    icon: 'success',
                    title: response["message"],
                    showConfirmButton: false,
                    timer: 2000
                }).then(() => {
                    if (response.message == "Payment link sent to customer successfully!") {
                        $('.reload-btn').show();
                        setInterval(() => {
                            reloadStatus();
                        }, 5000);
                    } else {
                        $('.reload-btn').hide();
                        window.location.href = '/delivery-list';
                    }

                    // 
                });
            } else {
                $('.reload-btn').hide();
                Swal.fire({
                    position: 'center',
                    icon: 'error',
                    title: response["message"],
                    showConfirmButton: false,
                    timer: 2000
                });
            }
        },
        error: function (jqXhr, textStatus, errorMessage) { // error callback 
            console.log("errror");

        }
    });
}

function backClick() {
    location.reload();
}

function reloadStatus() {
    $.ajax(`${newBaseUrl}api/delivery-person/payment-status/${tempObj.id}`, {
        type: 'GET',
        headers: {
            'x-auth': localStorage.getItem('deluserToken')
        },
        dataType: 'json', // type of response data
        contentType: 'application/json',
        success: function (response, status, xhr) { // success callback function
            $('.reload-txt').html('');
            if (response.status) {
                Swal.fire({
                    position: 'center',
                    icon: 'success',
                    title: response["message"],
                    showConfirmButton: false,
                    timer: 2000
                }).then(() => {
                    window.location.href = '/delivery-list';
                });
                $('.reload-txt').html(`<span>${response.message}</span>`);
                $('.reload-btn').hide();

            } else {
                $('.reload-btn').show();
                $('.reload-txt').html(`<span>${response.message}</span>`);
            }

        },
        error: function (jqXhr, textStatus, errorMessage) { // error callback 
            console.log("errror");

        }
    });
}


function userLogout() {


    localStorage.removeItem('deluserData');
    localStorage.removeItem('deluserToken');
    Swal.fire({
        position: 'center',
        icon: 'success',
        title: "Logout Successfully",
        showConfirmButton: false,
        timer: 3000
    }).then(() => {
        window.location.href = "/delivery";
    });

}