if (getCookie("pincode") == null) {
    if (localStorage.getItem('userData') != null) {
        var userData = JSON.parse(localStorage.getItem('userData'));
        var json = userData;
        for (var i = 0; i < json.addresses.length; i++) {
            var address = json.addresses[i];
            if (address.setDefault) {
                alert('/api/set-pincode?pincode=' + address.pinCode);
                location.replace('/api/set-pincode?pincode=' + address.pinCode);
            }
        }
    }
}

function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

$('.user-in').hide();
$('.user-out').hide();
$('.sendotp-error').hide();
$('.verify-error').hide();
$('.registration-error').hide();
$('#verifyForm').hide();
$('#registrationForm').hide();

$('.name-error').hide();
$('.email-error').hide();
$('.street-error').hide();
$('.area-error').hide();
$('.city-error').hide();
$('.zip-error').hide();
var payWithBajaj = false;


var duringRegistration = false;
var baseUrl = '/';
// var newBaseUrl = 'https://qa-happi.iipl.work/';
// var newBaseUrl = 'https://api.happimobiles.com/';
var newBaseUrl = '/';

$(document).ready(function () {


    var linker = $('.htmlview').html();
    $.ajax({
        url: `/${linker}?json=1`,
        success: function (result) {
            $("#htmlview").html(result.liveproductObj_html);
        }
    });

    $('.submit-btn').attr("disabled", true);

    if (localStorage.getItem('userData') == 'undefined') {
        localStorage.removeItem('userData');
    }

    $('.cart-img').attr('src', '/img/carticons/cart.png');
    if (localStorage.getItem('userData')) {
        var userData = JSON.parse(localStorage.getItem('userData'));
        refresh_cart();
        setInterval(() => {
            refresh_cart();
        }, 60000);

        getDetails();
        $('.user-name').html(userData.name);
        $('.user-in').show();
        $('.user-out').hide();
        if (localStorage.getItem("tobesaved")) {
            console.log("to be added");

            itemAdd(localStorage.getItem("tobesaved"));

            localStorage.removeItem("tobesaved");
        } else {
            console.log("Noo need be added");
        }


    } else {
        console.log("OUT");
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        localStorage.removeItem("phonepeResponse");
        $('.user-in').hide();
        $('.user-out').show();
        if (window.location.pathname.split('/')[1] == "cart"
            || window.location.pathname.split('/')[1] == "checkout"
            || window.location.pathname.split('/')[1] == "my-wishlist"
            || window.location.pathname.split('/')[1] == "my-orders"
            || window.location.pathname.split('/')[1] == "my-account-update") {
            location.replace('/');
        }
    }


});

function isEmail(email) {
    var regex = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    return regex.test(email);
}

function isName(id) {
    var regex = /^[a-zA-Z ]{2,30}$/;

    if (regex.test(id)) {
        return true;
    }
    else {
        return false;
    }
}

function itemAdd(i) {


    if (localStorage.getItem('userData') == null || localStorage.getItem('userData') == undefined) {

        localStorage.setItem("tobesaved", i);
        login();
        return;

    } else {
        var tempobj = {
            "productId": i.toString(),
            "quantity": 1
        };

        if (payWithBajaj) {
            tempobj.payWithBajaj = payWithBajaj;

        }

        console.log(tempobj);

        $.ajax(`${newBaseUrl}api/cart?t=` + new Date().getTime(), {
            type: 'POST',
            headers: {
                'x-auth': localStorage.getItem('userToken')
            },
            data: JSON.stringify(tempobj),
            dataType: 'json', // type of response data
            contentType: 'application/json',
            success: function (data, status, xhr) { // success callback function

                if (data["status"]) {
                    Swal.fire({
                        position: 'center',
                        icon: 'success',
                        title: 'Added Successfully to cart',
                        showConfirmButton: false,
                        timer: 1500
                    }).then(() => {
                        if (payWithBajaj) {
                            setTimeout(() => {
                                location.replace("/cart")
                            }, 1000);

                        }
                        payWithBajaj = false;

                        refresh_cart();
                    });
                }
            },
            error: function (jqXhr, textStatus, errorMessage) {
                if (jqXhr.status == 401) {
                    console.log("401 Err");
                    localStorage.removeItem('userToken');
                    localStorage.removeItem('userData');
                    localStorage.removeItem("phonepeResponse");
                    location.reload();
                }

            }
        });
    }
}



function getDetails() {
    $.ajax(newBaseUrl + 'api/user?t=' + new Date().getTime(), {
        type: 'GET',
        headers: {
            'x-auth': localStorage.getItem('userToken')
        },
        dataType: 'json', // type of response data
        contentType: 'application/json',
        success: function (data, status, xhr) { // success callback function
            localStorage.setItem('userData', JSON.stringify(data));
        },
        error: function (jqXhr, textStatus, errorMessage) { // error callback 
            if (jqXhr.status == 401) {
                console.log("DDDDDDDDDDDDDDDDDDDDDDDD");
                localStorage.removeItem('userToken');
                localStorage.removeItem('userData');
                localStorage.removeItem("phonepeResponse");
                location.reload();
            }

        }
    });

}

function refresh_cart() {


    $.ajax(newBaseUrl + 'api/cart?t=' + new Date().getTime(), {
        type: 'GET',
        headers: {
            'x-auth': localStorage.getItem('userToken')
        },
        dataType: 'json', // type of response data
        contentType: 'application/json',
        success: function (data, status, xhr) { // success callback function
            // console.log("Wish", data);

            if (data["status"]) {



                if (data.data.payment_type == "bajaj" && data.data.TotalQuantity == 1) {
                    document.getElementById("bajaj-radio").checked = true;
                    $('.bajaj-radio-b').show();
                    $('.payments-b').hide();
                } else if (data.data.payment_type == "normal") {
                    document.getElementById("online-radio").checked = true;
                    $('.bajaj-radio-b').hide();
                    $('.payments-b').show();
                } else {
                    document.getElementById("online-radio").checked = true;
                    $('.bajaj-radio-b').hide();
                    $('.payments-b').show();
                }
                if (data.data.products.length == 0) {
                    $('.cart-img').attr('src', '/img/carticons/cart.png');
                } else if (data.data.products.length <= 9) {
                    $('.cart-img').attr('src', '/img/carticons/cart' + data.data.products.length + '.png');
                } else {
                    $('.cart-img').attr('src', '/img/carticons/cart9+.png');
                }
            }
        },
        error: function (jqXhr, textStatus, errorMessage) { // error callback 
            if (jqXhr.status == 401) {
                console.log("DDDDDDDDDDDDDDDDDDDDDDDD");
                localStorage.removeItem('userToken');
                localStorage.removeItem('userData');
                localStorage.removeItem("phonepeResponse");
                location.reload()
            }

        }
    });

}

function sendOtpSubmit() {

    var sendOtpObj = {
        phoneNo: $('#phoneNo').val(),

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

function addToWishlist(id) {
    if (localStorage.getItem('userData') == null || localStorage.getItem('userData') == undefined) {
        $(".open-modal").click();
        return;

    } else {
        var tempobj = {
            "product_id": id.toString()
        };

        $.ajax(newBaseUrl + 'api/wishlist', {
            type: 'POST',
            headers: {
                'x-auth': localStorage.getItem('userToken')
            },
            data: JSON.stringify(tempobj),
            dataType: 'json', // type of response data
            contentType: 'application/json',
            success: function (data, status, xhr) { // success callback function

                if (data["state"]) {
                    Swal.fire({
                        position: 'center',
                        icon: 'success',
                        title: 'Added Successfully to wishlist',
                        showConfirmButton: false,
                        timer: 1500
                    }).then(() => {


                    });
                } else {
                    Swal.fire({
                        position: 'center',
                        icon: 'warning',
                        title: data["message"],
                        showConfirmButton: false,
                        timer: 1500
                    })
                }
            },
            error: function (jqXhr, textStatus, errorMessage) { // error callback 
                Swal.fire({
                    position: 'center',
                    icon: 'error',
                    title: 'Please try again',
                    showConfirmButton: false,
                    timer: 1500
                });
            }
        });
    }
}

function verifyOtpSubmit() {

    var verifyOtpObj = {
        phoneNo: $('#phoneNo').val(),
        otp: $('#otp').val(),

    };

    $.ajax(`${newBaseUrl}api/user-verify`, {
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
                    localStorage.setItem('userToken', response["token"]);
                    if (response["userState"]) {
                        localStorage.setItem('userData', JSON.stringify(response["data"]));
                        location.reload();
                    } else {
                        $('#dontClose').hide();
                        $('#registrationForm').show();
                        $('#phone').val($('#phoneNo').val());
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



function registrationOtpSubmit() {
    let nameError = false;
    let emailError = false;
    let streetError = false;
    let cityError = false;
    let areaError = false;
    let zipError = false;


    if (!isName($('#name').val())) {
        $('.name-error').show();
        nameError = true;
    } else {
        $('.name-error').hide();
        nameError = false;
    }


    if (!isEmail($('#email').val())) {
        $('.email-error').show();
        emailError = true;
    } else {
        $('.email-error').hide();
        emailError = false;
    }

    if ($('#street').val() == '') {
        $('.street-error').show();
        streetError = true;
    } else {
        $('.street-error').hide();
        streetError = false;
    }

    if ($('#area').val() == '') {
        $('.area-error').show();
        areaError = true;
    } else {
        $('.area-error').hide();
        areaError = false;
    }

    if ($('#city').val() == '') {
        $('.city-error').show();
        cityError = true;
    } else {
        cityError = false;
        $('.city-error').hide();
    }

    if ($('#zip').val() == '') {
        zipError = true;
        $('.zip-error').show();
    } else {
        zipError = false;
        $('.zip-error').hide();
    }

    if (nameError || emailError || streetError || cityError || areaError || zipError) {
        return;
    } else {
        var registrationOtpObj = {
            name: $('#name').val(),

            phone: $('#phone').val(),
            email: $('#email').val(),

            addresses: [
                {
                    name: $('#name').val(),
                    phone: $('#phone').val(),
                    street: $('#street').val(),
                    area: $('#area').val(),
                    city: $('#city').val(),
                    zip: $('#zip').val(),
                }
            ]
        };

        $.ajax(`${newBaseUrl}api/user`, {
            type: 'POST',
            data: JSON.stringify(registrationOtpObj),
            headers: {
                'x-auth': localStorage.getItem('userToken')
            },
            dataType: 'json', // type of response data
            contentType: 'application/json',
            success: function (response, status, xhr) { // success callback function

                if (response['status']) {
                    $('.registration-error').hide();
                    $('#registrationForm').hide();
                    Swal.fire({
                        position: 'center',
                        icon: 'success',
                        title: response["message"],
                        showConfirmButton: false,
                        timer: 3000
                    }).then(() => {

                    });

                    setTimeout(() => {
                        localStorage.setItem('userData', JSON.stringify(response['data'][0]));
                        location.reload();
                    }, 2500);

                }
                else {

                    $('.registration-error').show();
                    $('.registration-error').html(response["message"]);

                }
            },
            error: function (jqXhr, textStatus, errorMessage) { // error callback 
                console.log("errror");

            }
        });


    }
}

function phonepyVerifyOtpSubmit(a, b) {
    // alert("jph");
    var verifyOtpObj = {
        phoneNo: a,
        otp: b,

    };

    $.ajax(`/api/user-verify`, {
        type: 'POST',
        data: JSON.stringify(verifyOtpObj),
        dataType: 'json', // type of response data
        contentType: 'application/json',
        success: function (response, status, xhr) { // success callback function
            // alert("jph ----"+JSON.stringify(response));
            if (response['status']) {


                if (response["userState"]) {
                    localStorage.setItem('userToken', response["token"]);
                    localStorage.setItem('userData', JSON.stringify(response['data']));
                    location.reload();
                } else {
                    var phData = localStorage.getItem("phonepeResponse");

                    $('#email').val(phData["data"]["primaryEmail"]);
                    $('#name').val(phData["data"]["name"]);
                    $('#dontClose').hide();
                    $('#registrationForm').show();
                    $('#phone').val($('#phoneNo').val());
                }
            }

        },
        error: function (jqXhr, textStatus, errorMessage) { // error callback 
            console.log("errror");
            // alert("error"+JSON.stringify(errorMessage));

        }
    });
}

const observer = lozad(); // lazy loads elements with default selector as '.lozad'
observer.observe();



function subscribeBtn() {

    let emailObj = {
        email: $('#subscribeEmail').val()
    };

    console.log(emailObj);

    $.ajax('/api/subscribers/', {
        type: 'POST',
        data: JSON.stringify(emailObj),
        dataType: 'json', // type of response data
        contentType: 'application/json',
        timeout: 5000, // timeout milliseconds
        success: function (data, status, xhr) { // success callback function


            Swal.fire({
                position: 'center',
                icon: 'success',
                title: 'successfully subscribed ',
                showConfirmButton: true
            });

            $('#subscribeEmail').val("");
        },
        error: function (jqXhr, textStatus, errorMessage) { // error callback 
            console.log("errror");
        }
    });

}

$(document).ready(function () {
    $('#rm').removeClass('ui-loading');

    window.addEventListener("storage", function () {

    }, false);
    window.onstorage = () => {
        // When local storage changes, dump the list to
        // the console.
        console.log(JSON.parse(window.localStorage.getItem('sampleList')));
    };

});

$(document).ready(function () {
    $(".searchm").focusout(function () {
        setTimeout(() => {
            $('.search-list-text').hide();
        }, 3000);
    });
    $(".search-text").focusout(function () {

        setTimeout(() => {
            $('.search-list-text').hide();
        }, 3000);

    });
    $(".search-text").on('keyup', function () {

        var searchObj = {};

        searchObj.name = $('.search-text').val();

        $.ajax(`${newBaseUrl}api/product-search`, {
            type: 'POST',
            data: JSON.stringify(searchObj),
            headers: {
                'x-auth': localStorage.getItem('userToken')
            },
            dataType: 'json', // type of response data
            contentType: 'application/json',
            success: function (response, status, xhr) { // success callback function
                $('#search-result').html('');
                if (response['items'].length > 0) {
                    for (let i = 0; i < response["items"].length; i++) {
                        const element = response["items"][i];

                        $('#search-result').append(`
				<li> <a href="/${element.linker}" style="color: #000;text-decoration: none;">${element.name}</a></li>
			`);
                    }
                    $('.search-list-text').show();

                } else {
                    $('.search-list-text').hide();
                }


            },
            error: function (jqXhr, textStatus, errorMessage) { // error callback 
                console.log("errror");
                $('.search-list-text').hide();
            }
        });

    });

    function searchClick() {
        document.searchq.submit();
    }

    $(".searchm").on('keyup', function () {

        var searchMobileObj = {};

        searchMobileObj.name = $('.searchm').val();


        $.ajax(`${newBaseUrl}api/product-search`, {
            type: 'POST',
            data: JSON.stringify(searchMobileObj),
            headers: {
                'x-auth': localStorage.getItem('userToken')
            },
            dataType: 'json', // type of response data
            contentType: 'application/json',
            success: function (response, status, xhr) { // success callback function
                $('#search-result-m').html('');
                if (response['items'].length > 0) {
                    for (let i = 0; i < response["items"].length; i++) {
                        const element = response["items"][i];

                        $('#search-result-m').append(`
<li> <a href="/${element.linker}" style="color: #000;text-decoration: none;">${element.name}</a></li>
`);
                    }
                    $('.search-list-text').show();

                } else {
                    $('.search-list-text').hide();
                }


            },
            error: function (jqXhr, textStatus, errorMessage) { // error callback 
                console.log("errror");
                $('.search-list-text').hide();
            }
        });



    });

    function searchMobileClick() {
        document.searchm.submit();
    }


});

var sdk;


function login() {
    $(".open-modal").click();
    console.log("no phpy");
}

function getUserDetailFromPH(token) {
    var data = JSON.stringify(false);

    var xhr = new XMLHttpRequest();
    xhr.withCredentials = true;
    var verify2 = sha256(`/v3/service/userdetails81c3dc6c-6eff-411f-9711-42ab3ee40cc4`) + '###1';



    xhr.addEventListener("readystatechange", function () {
        if (xhr.readyState === XMLHttpRequest.DONE) {
            console.log(this.responseText);
            $('.errors-b').append(`<br>${this.responseText} ===`);

        }
    });

    xhr.open("GET", "https://apps-uat.phonepe.com/v3/service/userdetails");
    xhr.setRequestHeader("X-VERIFY", verify2);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("X-CLIENT-ID", "HAPPIMOBILESTEST");
    xhr.setRequestHeader("X-ACCESS-TOKEN", token);


    xhr.send(data);
}

// Products.html begin

var url = new URL(window.location.href);


$(document).ready(function () {



    checkFilter();

    setFilterValues();

    $('.p-c').each(function () {
        var val = parseInt($(this).attr('data-value'));
        $(this).html(val.toLocaleString('en-IN', {
            maximumFractionDigits: 2,
            style: 'currency',
            currency: 'INR'
        }));
    });

    $('.pfilter').change(function () {

        var object = localStorage.getItem('filter') == null ? [] : JSON.parse(localStorage.getItem('filter'));

        for (var i = 0; i <= object.length; i++) {
            if (object[i]) {
                if (object[i].name == 'maxprice' || object[i].name == 'minprice') {
                    object.splice(i, 1);
                }
            }

        }

        $('.pfilter').each(function (index, value) {
            var is = $(this).is(":checked");
            console.log("is", is);
            if (is) {
                var minp = $(this).attr('data-minprice');
                var maxp = $(this).attr('data-maxprice');

                var obj = {
                    name: 'maxprice',
                    val: maxp,
                };

                object.push(obj);

                obj = {
                    name: 'minprice',
                    val: minp,
                };
                object.push(obj);
                console.log(object);
            } else {
                // do nothing
            }
        });



        setTimeout(function () {
            localStorage.setItem('filter', JSON.stringify(object));
            var query = "?";

            object.forEach(function (ele) {
                query = query + ele.name + "=" + ele.val + "&";
            });
            console.log(url.pathname + query);
            let categoryPath = url.pathname.split('/');

            window.location.href = url.pathname + query;
        }, 500);




    });




    setChecked();


    function setChecked() {

        var object = localStorage.getItem('filter') == null ? [] : JSON.parse(localStorage.getItem('filter'));

        var c = window.location.search.indexOf('?');

        if (c == -1) {
            localStorage.removeItem('filter')
        } else {
            object.forEach(function (ele) {
                $('.filter').each(function (index, value) {
                    if ($(this).attr('name') == ele.name && $(this).val() == ele.val) {
                        $(this).attr("checked", "checked");
                    }
                });
            });
        }
    }

    setTimeout(function () {
        $('.filter').change(function () {


            var object = [];

            $('.filter').each(function (index, value) {
                var is = $(this).is(":checked");

                if (is) {
                    var obj = {
                        name: $(this).attr('name'),
                        val: $(this).val(),
                    };
                    object.push(obj);
                } else {
                    // do nothing
                }
            });

            if (object.length == 0) {
                $('.clear-fiter').hide();
                localStorage.setItem('filter', JSON.stringify(object));
                let categoryPath = url.pathname.split('/');
                console.log(categoryPath);

                window.location.href = categoryPath.join('/');
            } else {
                $('.clear-fiter').show();
                setTimeout(function () {
                    localStorage.setItem('filter', JSON.stringify(object));
                    var query = "?";

                    object.forEach(function (ele) {
                        query = query + ele.name + "=" + ele.val + "&";
                    });
                    let categoryPath = url.pathname.split('/');
                    console.log(categoryPath.join('/') + query);

                    window.location.href = categoryPath.join('/') + query;
                }, 500);
            }
        });
    }, 500);




});

function setFilterValues() {
    let filterObj = localStorage.getItem('filter') == null ? [] : JSON.parse(localStorage.getItem('filter'));

    $('#filter-names').html(``);
    if (filterObj.length == 0) {
        $('.clear-fiter').hide();
    } else {
        for (let i = 0; i < filterObj.length; i++) {

            const element = filterObj[i];
            console.log(element);

            $('#filter-names').append(`<p> <b>${element.name} : </b> ${element.val} <span><i class="fa fa-times" aria-hidden="true" onclick="removeFilter('${element.val}')"></i></span></p>
            `);
        }

    }
}
function checkFilter() {
    var c = url.search.indexOf('?');

    if (c == -1) {
        $('.clear-fiter').hide();
        setFilterValues();
        // window.location.href = '/categories/mobiles/';
    } else {
        $('.clear-fiter').show();
        $('#clear-fiters').click(function () {

            var c = window.location.search.indexOf('?');

            if (c == -1) {
                console.log('no filter');
            } else {
                window.location.href = window.location.href.replace(/\?.+/, '');

            }
            localStorage.removeItem('filter');
            setFilterValues();
        });

    }
}

function removeFilter(params) {
    console.log('removed FILTER', localStorage.getItem('filter'));



    let filterObj2 = localStorage.getItem('filter') == null ? [] : JSON.parse(localStorage.getItem('filter'));
    console.log(filterObj2.length);
    if (filterObj2.length == 0) {
        $('.clear-fiter').hide();
    } else {
        $('.clear-fiter').show();
        for (var i = filterObj2.length - 1; i >= 0; --i) {
            if (filterObj2[i].val == params) {
                filterObj2.splice(i, 1);
            }
        }
        console.log('FILTER', filterObj2);

        localStorage.setItem('filter', JSON.stringify(filterObj2));

        let obj2 = JSON.parse(localStorage.getItem('filter'));
        var query = "?";

        obj2.forEach(function (ele) {
            query = query + ele.name + "=" + ele.val + "&";
        });
        let categoryPath = url.pathname.split('/');

        window.location.href = '/categories/' + categoryPath[2] + '/' + query;
    }


}
// Products.html end


// home.html begin
$(document).ready(function () {
    $('.prod-i #htmlview').hide();
    var isContains = navigator.userAgent.indexOf("phonepe");

    if (isContains == -1) {
        console.log("LLLLLLL");
        setTimeout(() => {
            $('.open-pop-modal').click();
        }, 3000);
    }


});

var owl = $('.owl-carousel');
owl.owlCarousel({
    loop: true,
    margin: 10,
    responsiveClass: true,
    autoplay: true,
    autoplayTimeout: 1000,
    autoplayHoverPause: true,
    responsive: {
        0: {
            items: 1,
            nav: true
        },
        600: {
            items: 3,
            nav: true
        },
        1000: {
            items: 6,
            nav: true,
        }
    }
});
setTimeout(() => {


    // console.log(Object.keys("@{model.metaTag}"),"DDDDDDDDDDDDDDDDDD");

    var converter = new showdown.Converter();
    var text = $('#meta-desc').html();
    console.log($('#meta-desc').html(), "OOOO");
    $('#meta-desc').html($.parseHTML(text)[0].data);


}, 1500);
// home.html end


//Product.html begin
$(document).ready(function () {
    $('.each-carousel:first').addClass('active');
    $('#first-tab1').click();
    $('#first-tab2').click();

    $('#globalOffer').hide();

    imgClick = function (params) {
        $('#change-url').attr("src", params);
    }

    // console.log('@{model.cardslot}');

    console.log('PRE_BOOKING');
    if ($('#pinelabsCode').length != 0) {
        var pinecode = $('#pinelabsCode').attr("data-pinelabsCode");
        if (pinecode.trim() == "") {
            $('#pinelabsCode').hide();
        } else {
            $('.buy-now').hide();
        }
    }
});
$(function () {
    $('.each-c').on('click', function () {
        $('.each-c').removeClass('active');
        $(this).addClass('active');
    });
});


function exhcnageClick(params) {
    console.log(params);

    itemAdd(params);
    window.location.replace("/exchange");
}

setTimeout(() => {

    console.log("MARKDOWN");
    getGlobalOffer();
    var converter = new showdown.Converter();
    var text = $('#desc').html();
    $('#desc').html(converter.makeHtml(text));
    var offertext = $('#offerdesc').html();
    $('#offerdesc').html(converter.makeHtml(offertext));



    $('.prod-i #htmlview').show();
}, 1500);

function getGlobalOffer() {
    let globalOfferObj = {
        category_name: $('#globalOffer').html()
    }
    console.log("GLOBAL");
    $.ajax(newBaseUrl + '/api/product-offers', {
        type: 'POST',
        data: globalOfferObj,
        dataType: 'json', // timeout milliseconds
        success: function (data, status, xhr) { // success callback function
            console.log(data.data.description);
            if (data.status) {
                var converter = new showdown.Converter();
                $('#globalOffer').html(converter.makeHtml(data.data.description));
                $('#globalOffer').show();
            } else {
                $('#globalOffer').hide();
            }

        },
        error: function (jqXhr, textStatus, errorMessage) { // error callback 
            console.log("errror");

        }
    });

}

$(document).ready(function () {
    //If your <ul> has the id "glasscase"
    setTimeout(function () {
        $('#glasscase').glassCase({ 'widthDisplay': 370, 'heightDisplay': 550, 'isSlowZoom': true, 'isZoomDiffWH': true, 'zoomWidth': 400, 'zoomHeight': 500, 'zoomAlignment': 'displayArea', 'isDownloadEnabled': false, 'captionType': 'out', 'captionPosition': 'bottom', 'captionAlignment': 'center', 'colorIcons': '#fff', 'colorActiveThumb': '#333' });
    }, 1000);
    setTimeout(function () {
        $('#glasscase2').glassCase({ 'isZoomEnabled': false, 'widthDisplay': 370, 'heightDisplay': 550, 'isSlowZoom': true, 'isZoomDiffWH': true, 'zoomWidth': 400, 'zoomHeight': 500, 'zoomAlignment': 'displayArea', 'isDownloadEnabled': false, 'captionType': 'out', 'captionPosition': 'bottom', 'captionAlignment': 'center', 'colorIcons': '#fff', 'colorActiveThumb': '#333' });
    }, 1000);

});

var related1 = true;
var related2 = true;
var related3 = true;
var related4 = true;

var compared2 = true;
var compared3 = true;
var compared4 = true;

function buyNow(id, txt) {
    console.log("BBBB", txt);

    if (txt == 'buy-now') {
        itemAdd(id);
        // buy now fix
        if (localStorage.getItem("userToken") != null) {
            setTimeout(() => {

                location.replace('/cart')
            }, 2000);
        }
    }
}

function buyBajaj(id, txt) {
    console.log("BBBB", txt);
    payWithBajaj = false;
    if (txt == 'bajaj') {
        payWithBajaj = true;
        itemAdd(id);
    } else {
        payWithBajaj = false;
    }
}
$(document).ready(function () {

    $('.p-c').each(function () {

        var val = parseInt($(this).attr('data-value'));
        $(this).html(val.toLocaleString('en-IN', {
            maximumFractionDigits: 2,
            style: 'currency',
            currency: 'INR'
        }));
    });

    var counter = 0;

    $('.each-color').each(function () {

        if (counter == 0) {
            $(this).addClass('active');
        } else {
            $("#view-cat-" + $(this).attr('data-id')).hide();
        }
        console.log(counter, $(this).attr('data-id'));
        counter++;
    });

    $('.each-color').click(function () {
        console.log("CLICK", $(this).attr('data-id'));
        $('.each-color').each(function () {


            $(this).removeClass('active');

        });
        // $('.each-color').removeClass('acitve');
        $(".select-color").hide();
        $(this).addClass('active');

        $("#view-cat-" + $(this).attr('data-id')).show();
    });

    if (window.location.href.indexOf('#addToCart') > 0) {
        addcart('@{model.id}', '@{model.id}', '', '@{model.name}', '@{model.payPrice}', '@{model.stock}', '@{model.count}');
        setTimeout(() => {
            //document.location.href = String(document.location.href).replace('/#addToCart', "");
            window.location.replace("/checkout/");
        }, 2000);
    }


    if (window.location.href.indexOf('#wishlist') > 0) {
        verifyWish();

        setTimeout(() => {
            document.location.href = String(document.location.href).replace('/#wishlist', "");
        }, 2000);
    }
    $('#slider4').ubislider({
        arrowsToggle: true,
        type: 'ecommerce',
        hideArrows: true,
        autoSlideOnLastClick: true,
        modalOnClick: true,
        position: 'vertical',
        onTopImageChange: function () {
            $('#imageSlider4 img').elevateZoom();
        }
    });


});

function checkPin() {
    console.log("hh");

    $(".pincode-status").html();
    regexp = /^\d{6}$/;

    if (regexp.test($('#pincode').val())) {


        let pin = {
            pinCode: $('#pincode').val(),
            productId: "@{model.id}"
        };

        console.log(pin);
        $.ajax(newBaseUrl + 'api/pincodeVerify', {
            type: 'POST',
            data: pin,
            dataType: 'json', // timeout milliseconds
            success: function (data, status, xhr) { // success callback function
                console.log(data);

                if (data.status) {
                    $('.pincode-status').show();
                    $('.pincode-status').html(`${data.message}`);
                    Swal.fire({
                        position: 'center',
                        icon: 'success',
                        title: data.message,
                        showConfirmButton: false,

                    });
                } else {
                    $('.pincode-status').show();
                    $('.pincode-status').html(`${data.message}`);
                    Swal.fire({
                        position: 'center',
                        icon: 'warning',
                        title: data.message,
                        showConfirmButton: false,


                    });
                }

            },
            error: function (jqXhr, textStatus, errorMessage) { // error callback 
                console.log("errror");

            }
        });

    } else {
        $('.pincode-status').show();
        $('.pincode-status').html(`Invalid Pincode`);
    }



}

function getEmiOptions(amt) {
    console.log(amt);

    $('#v-pills-tab').append(``);
    $('#v-pills-tabContent').append(``);


    $.ajax(newBaseUrl + 'api/emi?amount=' + amt, {
        type: 'POST',
        data: {},
        dataType: 'json', // type of response data
        timeout: 500, // timeout milliseconds
        success: function (data, status, xhr) { // success callback function
            let objnew = [];
            objnew = data.data;

            console.log('git dat');

            if (data.status) {
                // $('#accordion').html(``);
                $('#v-pills-tab').html('');
                $('#v-pills-tabContent').html('');

                for (let i = 0; i < objnew.length; i++) {
                    let obj = objnew[i];
                    let first = i;
                    var header = '';
                    header = `<div class="panel-heading">
									<h4 class="panel-title" data-toggle="collapse" data-parent="#accordion" href="#collapse${i}">
										
										${obj.bank_name}
									</h4>
								   </div>`;

                    var emi = '';
                    for (let j = 0; j < obj.rate.length; j++) {
                        const bankdetails = obj.rate[j];
                        var emi_each = '';
                        emi_each = `<tr>
										<td><span style="font-weight:400;font-size:11px">₹ ${bankdetails.monthly} </span>  </td>
										<td>${bankdetails.month}m</td>
										<td>₹ ${bankdetails.intrest} (${bankdetails.val}%)</td>
										<td>₹ ${bankdetails.total}</td>
										</tr>`;
                        emi = emi + emi_each;
                    }
                    var details = '';
                    if (i == 0) {
                        details = `<div class="tab-pane fade show active" id="${obj.bank_name}" role="tabpanel" aria-labelledby="v-pills-home-tab">
										<div class="panel-body">
											<table class="table table-bordered"> 
												<thead class="thead-dark two-tabs tab-border">
												<tr>
													<th>EMI Plan</th>
													<th>Months</th>
													<th>Interest</th>
													<th>Total Cost</th>
												</tr>
												${emi}</thead>											</table>
										</div></div>
									`;
                    } else {
                        details = `<div class="tab-pane fade" id="${obj.bank_name}" role="tabpanel" aria-labelledby="v-pills-home-tab">
										<div class="panel-body">
											<table class="table table-bordered jjjj" style="white-space: nowrap;"> 
												<thead class="thead-dark two-tabs tab-border">
													<tr>
													<th>EMI Plan</th>
													<th>Months</th>
													<th>Interest</th>
													<th>Total Cost</th>
												</tr>
												${emi}</thead>
											</table>
										</div></div>
									`;
                    }



                    var header2 = '';

                    if (i == 0) {
                        header2 = `<a class="nav-link active" id="v-pills-home-tab" data-toggle="pill" href="#${obj.bank_name}" role="tab" aria-controls="v-pills-home" aria-selected="true">${obj.bank_name}
									</a>`;
                    } else {
                        header2 = `<a class="nav-link" id="v-pills-home-tab" data-toggle="pill" href="#${obj.bank_name}" role="tab" aria-controls="v-pills-home" aria-selected="true">${obj.bank_name}
									</a>`;
                    }




                    $('#v-pills-tab').append(`
										${header2}
										
									`);
                    $('#v-pills-tabContent').append(`
									${details}
									`);

                }

            }


        },
        error: function (jqXhr, textStatus, errorMessage) { // error callback 
            console.log("errror");

        }
    });
}

function verifyWish() {

    $.ajax(newBaseUrl + 'api/account/wishlist/', {
        type: 'GET',

        dataType: 'json', // type of response data
        contentType: 'application/json',
        timeout: 500, // timeout milliseconds
        success: function (data, status, xhr) { // success callback function
            console.log('Verify', data);
            var items = data.items;
            var contains = false;
            for (let i = 0; i < items.length; i++) {
                const element = items[i];
                if (element.pid == '@{model.id}') {

                    contains = true;
                }
            }

            if (contains) {
                Swal.fire({
                    position: 'center',
                    icon: 'warning',
                    title: 'This product is already added to wishlist.',
                    showConfirmButton: true,

                });
            } else {
                addWishList();
            }
            // addWishList();
        },
        error: function (jqXhr, textStatus, errorMessage) { // error callback 
            console.log("errror", localStorage.getItem('userNotloggedIn'));
            localStorage.setItem('userNotloggedIn', document.location.href);
            if (localStorage.getItem('userNotloggedIn')) {
                window.location.href = '/account';
            }

        }
    });
}

function addWishList() {
    console.log('wish', '@{model.id}');
    var wishObj = {
        pid: '@{model.id}'
    };
    $.ajax(newBaseUrl + 'api/account/wishlist/', {
        type: 'POST',
        data: JSON.stringify(wishObj),
        dataType: 'json', // type of response data
        contentType: 'application/json',
        timeout: 500, // timeout milliseconds
        success: function (data, status, xhr) { // success callback function
            console.log('ADd to wish lsit', data);
            Swal.fire({
                position: 'center',
                icon: 'success',
                title: 'Saved to wishlist',
                showConfirmButton: false,
                timer: 2500
            });
        },
        error: function (jqXhr, textStatus, errorMessage) { // error callback 
            console.log("errror");

        }
    });
}



$("#moreinfo").click(function () {
    $('html,body').animate({
        scrollTop: $("#moredesc").offset().top - 30
    },
        'slow');
});

$("#comparePrice").click(function () {
    $('html,body').animate({
        scrollTop: $("#compareB").offset().top - 30
    },
        'slow');
});

var carts = [];

function addcartEmi(id, vid, vname, name, price, stock, count, product_code) {
    var token = HASH(id + vid).toString();
    localStorage.removeItem("shoppingcart");

    var carts = [];

    var obj = {
        id: id,
        idvariant: vid,
        variant: vname,
        name: name,
        price: parseInt(price),
        sum: parseInt(price),
        token: token,
        created: new Date(),
        stock: parseInt(stock),
        count: 1
    };

    carts.push(obj);

    localStorage.setItem("product_code", product_code);
    localStorage.setItem("shoppingcart", JSON.stringify(carts));

    Swal.fire({
        position: 'center',
        icon: 'success',
        title: name + ' added to cart',
        showConfirmButton: false,
        timer: 2500
    });


    setTimeout(function () {
        refresh_cart();
        window.location.href = '/checkout/';
    }, 1500);

}

function addcart(id, vid, vname, name, price, stock, count, flag) {

    console.log('PRE_BOOKING', $('#pre-booking-btn').html());



    if ($('#pre-booking-btn').html() == "Pre-Booking") {
        localStorage.setItem('prebooking', true);
    }



    if (localStorage.getItem("shoppingcart") == null) {

    } else {
        carts = JSON.parse(localStorage.getItem("shoppingcart"));
    }

    localStorage.removeItem("product_code");

    var token = HASH(id + vid).toString();

    var contains = false;

    var obj = {
        id: id,
        idvariant: vid,
        variant: vname,
        name: name,
        price: parseInt(price),
        sum: parseInt(price),
        token: token,
        created: new Date(),
        stock: parseInt(stock),
        count: 1
    };

    for (i = 0; i < carts.length; i++) {

        if (carts[i].id == id && carts[i].idvariant == vid) {
            contains = true;
            carts[i].count += 1;
        }

    }


    //console.log("addcart", carts);
    if (contains != true) {
        carts.push(obj);
    }

    //console.log(carts);

    Swal.fire({
        position: 'center',
        icon: 'success',
        title: name + ' added to cart',
        showConfirmButton: false,
        timer: 2500
    });

    localStorage.setItem("shoppingcart", JSON.stringify(carts));
    setTimeout(function () {
        refresh_cart();


        if (flag == 1) {
            window.location.href = '/checkout/';
        }

    }, 1500);


}

// function refresh_cart() {

// 	$('.icon-block').hide();
// 	setTimeout(() => {
// 		var carts = [];
// 		if (localStorage.getItem("shoppingcart") == null) {
// 			$('.badge').hide();
// 		} else {
// 			$('.icon-block').show();
// 			carts = JSON.parse(localStorage.getItem("shoppingcart"));
// 		}

// 		if (carts.length == 0) {
// 			$('.cart-img').attr('src', '/img/carticons/cart.png');
// 		} else if (carts.length <= 9) {
// 			$('.cart-img').attr('src', '/img/carticons/cart' + carts.length + '.png');
// 		}
// 		else {
// 			$('.cart-img').attr('src', '/img/carticons/cart9+.png');
// 		}
// 	}, 200);

// }


function checkRelated() {
    if (related1 || related2 || related3 || related4) {

        $('.rel-p').show();
    } else {
        $('.rel-p').hide();
    }
}

function checkCompared() {

    if (compared2 || compared3 || compared4) {
        $('.prod-comp').show();
    } else {
        $('.prod-comp').hide();
    }
}
//product.html end


//fotter.html begin
$(document).ready(function () {
    var isContains = navigator.userAgent.indexOf("phonepe");
    // $('.isPH').html(navigator.userAgent);
    if (isContains != -1) {
        $('.phonepe').hide();
        $('.phonepe-show').show();
    } else {
        $('.phonepe-show').hide();
    }
});
//footer.html end

//categories.html begin
function menuNav(params) {
    console.log(params);
    localStorage.removeItem('filter');
    var menuArray = [];

    var obj = {
        name: 'ftrBrand',
        val: params
    };


    menuArray.push(obj);
    localStorage.setItem('filter', JSON.stringify(menuArray));
    window.location.href = '/categories/mobiles/?ftrBrand=' + params;
    //  /categories/mobiles/?ftrBrand=
}
function menuNavTv(params) {
    console.log(params);
    localStorage.removeItem('filter');
    var menuArray = [];

    var obj = {
        name: 'tvBrand',
        val: params
    };


    menuArray.push(obj);
    localStorage.setItem('filter', JSON.stringify(menuArray));
    window.location.href = '/categories/tv-s/?tvBrand=' + params;
    //  /categories/mobiles/?ftrBrand=
}
// categories.html end

// checkout.html

var userData = JSON.parse(localStorage.getItem('userData'));
var storeAddress = {};
var finalBillingAddress = {};
var isPickupBool = false;
var typeSelectedBool = false;
var checkbool = false;
var CART;
var CartItems;
var enableTwoHrs = false;

$(document).ready(function () {
    $('#coupon-display').hide();
    if (localStorage.getItem('userData')) {
        $('.no-loading').hide();
        $('.loading').show();
        $("#first-b").show();
        $("#second-b").hide();
        $('.2hr-name').hide();
        $('.free-name').hide();

        $('.both-name').hide();
        $('.pickup-b-name').hide();
        addressAppend();
        getCart();
        fetchOrders();
        fetchUser();
        fetchWish();


        $('.orders-empty').hide();
        $('.orders-block').hide();

        $('.main-coupon-preview').hide();
    } else {
        // location.replace('/');
    }






});

$('.accept-btn').on("click", function (params) {
    if ($('#accept').is(":checked") || $('#accept2').is(":checked")) {
        checkbool = true;
    }
    else {
        checkbool = false;
        $('.submit-btn').attr("disabled", true);
    }
    enableSubmitOrder();
})

function enableSubmitOrder() {
    console.log(typeSelectedBool, checkbool);
    if (typeSelectedBool && checkbool) {
        $('.submit-btn').attr("disabled", false);
    } else {
        $('.submit-btn').attr("disabled", true);
    }
}

function addressView() {
    $('.address-new-b').toggle();
}

function removeCoupon() {
    $.ajax(`${newBaseUrl}api/cart/remove-coupon`, {
        type: 'POST',
        headers: {
            'x-auth': localStorage.getItem('userToken')
        },
        data: {},
        dataType: 'json', // type of response data
        contentType: 'application/json',
        success: function (data, status, xhr) { // success callback function
            console.log(data);
            if (data.status) {
                Swal.fire({
                    position: 'center',
                    icon: 'success',
                    title: data.message,
                    showConfirmButton: false,
                    timer: 1000
                }).then(() => {

                    getCart();
                });
            }
        },
        error: function (jqXhr, textStatus, errorMessage) { // error callback

            console.log("errror");

        }
    });
}

function validateCoupon() {

    let couponData = {

        'coupon': $('#couponCode').val(),

    };
    $(".error").remove();
    $.ajax(`${newBaseUrl}api/cart/coupon`, {
        type: 'POST',
        headers: {
            'x-auth': localStorage.getItem('userToken')
        },
        data: JSON.stringify(couponData),
        dataType: 'json', // type of response data
        contentType: 'application/json',
        success: function (data, status, xhr) { // success callback function
            console.log(data);


            if (data.status) {

                getCart();
            } else {
                $('#couponCode').after(`<span class="error">${data.message}</span>`);

            }
        },
        error: function (jqXhr, textStatus, errorMessage) { // error callback

            console.log("errror");

        }
    });
}

function getCart() {

    $.ajax(`${newBaseUrl}api/cart?t=` + new Date().getTime(), {
        type: 'GET',
        headers: {
            'x-auth': localStorage.getItem('userToken')
        },
        dataType: 'json', // type of response data
        contentType: 'application/json',
        success: function (response, status, xhr) { // success callback function
            // console.log(response,"res");

            if (response['status']) {
                refresh_cart();
                $('.no-loading').show();
                $('.isCartEmpty').hide();
                $('.isCartNotEmpty').show();
                $('.loading').hide();
                $('#cart-row').html('');
                const element = response['data']["products"];
                CartItems = response['data']['products'];
                CART = response['data'];
                sum = response['data']["totalPrice"];
                count = response['data']["TotalQuantity"];
                for (let i = 0; i < element.length; i++) {


                    if (element[i].ftrBrand == "Redmi" || element[i].ftrBrand == "xiaomi") {
                        $('.pickupRadio').hide();
                    } else {
                        $('.pickupRadio').show();
                    }
                    var variant = element[i].variant == '' ? '' : `(${element[i].variant})`;
                    console.log("EACH", element[i]);
                    $('#cart-row').append(`<tr>
                                        <td>${i + 1}</td>
                                            <td style='white-space: inherit;font-weight:600;' >${element[i].name}  <br> <span  style="font-weight:400;font-style: italic;" id="${element[i].id}"></span> </td>
                                            <td><i class="fa fa-minus" onclick="minus('${element[i].id}')" aria-hidden="true"></i>
                                              
                                                </td>
                                            <td>${element[i].quantity}</td>
                                            <td><i class="fa fa-plus" onclick="plus('${element[i].id}')" aria-hidden="true"></i></td>
                                            <td>${element[i].payPrice}</td>
                                        </tr>`);
                    $('.table').show();


                }
                if (element.length == 0) {
                    $('.loading').hide();
                    $('.isCartNotEmpty').hide();
                    $('.isCartEmpty').show();
                }

                $('#vq').html(count);

                $("#vt").html(sum);
                console.log(response['data']['discount'], "DSSSSSSSS");
                if (response['data']['discount'] != null) {
                    console.log("Discount");
                    $('#coupon-display').show();
                    if (response['couponMessage'] && response['data']['discount'] == 0) {
                        $('#ca-text').html(`${response['couponMessage']}`);
                        $('#ca').html(``);
                    }
                    // else if(response['couponMessage'] && response['data']['discount'] != 0) {
                    //     $('#ca-text').html(`${response['couponMessage']}`);
                    //     $('#ca').html(`Coupon Applied - ${response['data']['coupon']}    -${response['data']['discount']}`);
                    // }
                    else {
                        $('#ca-text').html(`Coupon Applied - ${response['data']['coupon']}`);
                        $('#ca').html(`-${response['data']['discount']}`);
                    }
                    console.log("to be disabled");
                    $('#couponCode').attr("disabled", "disabled");
                    $('#validateId').attr("disabled", "disabled");
                }
                else {
                    $('#coupon-display').hide();
                    $('#couponCode').removeAttr("disabled");
                    $('#validateId').removeAttr("disabled");
                }
            } else {
                $('.loading').hide();
                $('.isCartNotEmpty').hide();
                $('.isCartEmpty').show();
            }

        },
        error: function (jqXhr, textStatus, errorMessage) { // error callback 
            console.log("errror");
        }
    });

}


function minus(i) {
    $('.loading').show();
    var tempobj = {
        "productId": i.toString(),
        "quantity": -1
    };

    $.ajax(`${newBaseUrl}api/product/${i}`, {
        type: 'GET',
        dataType: 'json', // type of response data
        contentType: 'application/json',
        success: function (data, status, xhr) {
            dataLayer.push({
                'event': 'removeFromCart',
                'ecommerce': {
                    'currencyCode': 'INR',
                    'remove': {
                        'products': [{
                            'name': data.name,
                            'id': data.id,
                            'price': data.payPrice,
                            'brand': data.manufacturer,
                            'category': data.linker_category,
                            'quantity': 1
                        }]
                    }
                }
            });
        }
    });

    $.ajax(newBaseUrl + 'api/cart?t=' + new Date().getTime(), {
        type: 'POST',
        headers: {
            'x-auth': localStorage.getItem('userToken')
        },
        data: JSON.stringify(tempobj),
        dataType: 'json', // type of response data
        contentType: 'application/json',
        success: function (data, status, xhr) { // success callback function

            if (data["status"]) {
                Swal.fire({
                    position: 'center',
                    icon: 'success',
                    title: 'Removed item from cart',
                    showConfirmButton: false,
                    timer: 1500
                }).then(() => {

                    getCart();
                });
            }
        },
        error: function (jqXhr, textStatus, errorMessage) { // error callback 
            Swal.fire({
                position: 'center',
                icon: 'error',
                title: 'Please try again',
                showConfirmButton: false,
                timer: 1500
            }).then(() => {

                getCart();
            });
        }
    });

}

function plus(i) {
    $('.loading').show();
    var tempobj = {
        "productId": i.toString(),
        "quantity": 1
    };

    $.ajax(`${newBaseUrl}api/cart`, {
        type: 'POST',
        headers: {
            'x-auth': localStorage.getItem('userToken')
        },
        data: JSON.stringify(tempobj),
        dataType: 'json', // type of response data
        contentType: 'application/json',
        success: function (data, status, xhr) { // success callback function

            if (data["status"]) {
                Swal.fire({
                    position: 'center',
                    icon: 'success',
                    title: 'Added Successfully to cart',
                    showConfirmButton: false,
                    timer: 1500
                }).then(() => {

                    getCart();
                });
            }
        },
        error: function (jqXhr, textStatus, errorMessage) { // error callback 
            Swal.fire({
                position: 'center',
                icon: 'error',
                title: 'Please try again',
                showConfirmButton: false,
                timer: 1500
            }).then(() => {

                getCart();
            });
        }
    });

}


function addressAppend() {
    if (localStorage.getItem('userData')) {

        for (let i = 0; i < userData["addresses"].length; i++) {
            const element = userData["addresses"][i];
            if (element["istwohrs"]) {

                $('.each-address').append(`
                    <div class="col-md-12" style="display:flex;align-items:center;">

                    <div class="w-90 p-0">
            <div class="card" >
                <label class="radio-inline " style="padding-left: 15px;display:flex;align-items:center">
                    <input type="radio" name="address"  value="${i}" onclick="selectedAddressTwo(${i},${element["zip"]})" id="twohrs-del">
              
            <div class="card-body" style="padding: 10px;">
                <span style="float: right;font-size: 10px;color: #004c00;font-weight: 600;"> Two hour delivery Available</span>
                <h6>  Address - ${i + 1}</h6>
                <h6><span>Name : <span> <span> ${element["name"]} <span></h6>
                <h6><span>Phone : <span> <span> ${element["phone"]} <span></h6>
                <h6><span>Address : <span> <span> ${element["street"]},${element["city"]},${element["zip"]} <span></h6>
                
                </div>
                </label>
            </div>
            </div>
            <div class="w-10"><i class="fa fa-trash"  onclick="checkToDel(${i})" aria-hidden="true"></i>
            </div>  </div>
            `);
            } else {
                $('.each-address').append(`<div class="col-md-12" style="display:flex;align-items:center;">
                    <div class="w-90 p-0">
            <div class="card" >
                <label class="radio-inline " style="padding-left: 15px;display:flex;align-items:center">
                    <input type="radio" name="address" disabled="true" value="${i}" onclick="selectedAddress(${i})">
              
            <div class="card-body" style="padding: 10px;">
                <span style="float: right;font-size: 10px;color: #980000;font-weight: 600;"> Two hour delivery Not Available </span>
                <h6>  Address - ${i + 1}</h6>
                <h6><span>Name : </span> <span> ${element["name"]} <span></h6>
                <h6><span>Phone : </span> <span> ${element["phone"]} <span></h6>
                <h6><span>Address : </span> <span> ${element["street"]},${element["city"]},${element["zip"]} <span></h6>
                
                </div>
                </label>
            </div>
        </div>
            <div class="w-10"><i class="fa fa-trash"  onclick="checkToDel(${i})" aria-hidden="true"></i>
            </div>  </div>
            `);
            }




            $('.each-address-free').append(` <div class="col-md-12" style="display:flex;align-items:center;"><div class="w-90 p-0">
                <div class="card" >
                    <label class="radio-inline " style="padding-left: 15px;display:flex;align-items:center">
                        <input type="radio" name="address"  value="${i}" onclick="selectedAddress(${i})">
                
                        <div class="card-body" style="padding: 10px;">
                            
                            <h6>  Address - ${i + 1}</h6>

                            <h6><span>Name : </span> <span> ${element["name"]} <span></h6>
                            <h6><span>Phone : </span> <span> ${element["phone"]} <span></h6>
                            <h6><span>Address : </span> <span> ${element["street"]},${element["city"]},${element["zip"]} <span></h6>
                        
                            </div>
                            </label>
                        </div>
                    </div>
                <div class="w-10"><i class="fa fa-trash"  onclick="checkToDel(${i})" aria-hidden="true"></i></div>  
            </div>
            `);



        }
    }
}

function checkToDel(id) {

    userData["addresses"].pop([id]);

    $.ajax(`${newBaseUrl}api/user`, {
        type: 'POST',
        data: JSON.stringify(userData),
        headers: {
            'x-auth': localStorage.getItem('userToken')
        },
        dataType: 'json', // type of response data
        contentType: 'application/json',
        success: function (response, status, xhr) { // success callback function

            if (response['status']) {
                $('.registration-error').hide();
                $('#registrationForm').hide();
                Swal.fire({
                    position: 'center',
                    icon: 'success',
                    title: response["message"],
                    showConfirmButton: false,
                    timer: 3000
                }).then(() => {

                });

                setTimeout(() => {
                    localStorage.setItem('userData', JSON.stringify(response['data'][0]));
                    location.reload();
                }, 2500);

            }
            else {

                $('.registration-error').show();
                $('.registration-error').html(response["message"]);

            }
        },
        error: function (jqXhr, textStatus, errorMessage) { // error callback 
            console.log("errror");

        }
    });
}

function selectedAddress(id) {
    finalBillingAddress = userData['addresses'][id];
    typeSelectedBool = true;
    enableSubmitOrder();
    enableTwoHrs = false;
}

function selectedAddressTwo(id, pin) {
    finalBillingAddress = userData['addresses'][id];
    console.log("DDDDDDDDDD");
    enableTwoHrs = true;
    typeSelectedBool = true;
    enableSubmitOrder();
    check2hrsDel(pin);
}

function check2hrsDel(pinCode) {
    let isFreeDel = true;
    for (let i = 0; i < CartItems.length; i++) {



        let pin = {
            pinCode: pinCode,
            productId: CartItems[i].id
        };
        $.ajax(`${newBaseUrl}api/pincodeVerify`, {
            type: 'POST',
            data: pin,
            dataType: 'json',
            success: function (response, status, xhr) { // success callback function
                console.log(response);
                if (!response.status) {
                    isFreeDel = false;
                }
                $(`#${CartItems[i].id}`).html(response.message);


            },
            error: function (jqXhr, textStatus, errorMessage) { // error callback 
                console.log("errror");
            }
        });
        if (!isFreeDel && i > CartItems.length) {
            $('.two-hrs-msg').html("Selected items are in transit, we shall try delivering the products within 24Hrs");
        }

    }


}

function addNewAddress() {

    var tempaddressobj = {
        name: $('#name').val(),
        phone: $('#phone').val(),
        street: $('#street').val(),
        area: $('#area').val(),
        city: $('#city').val(),
        zip: $('#zip').val(),
    };

    userData['addresses'].push(tempaddressobj);


    $.ajax(`${newBaseUrl}api/user`, {
        type: 'POST',
        data: JSON.stringify(userData),
        headers: {
            'x-auth': localStorage.getItem('userToken')
        },
        dataType: 'json', // type of response data
        contentType: 'application/json',
        success: function (response, status, xhr) { // success callback function

            if (response['status']) {
                $('.registration-error').hide();
                $('#registrationForm').hide();
                Swal.fire({
                    position: 'center',
                    icon: 'success',
                    title: response["message"],
                    showConfirmButton: false,
                    timer: 3000
                }).then(() => {

                });

                setTimeout(() => {
                    localStorage.setItem('userData', JSON.stringify(response['data'][0]));
                    location.reload();
                }, 4500);

            }
            else {

                $('.registration-error').show();
                $('.registration-error').html(response["message"]);

            }
        },
        error: function (jqXhr, textStatus, errorMessage) { // error callback 
            console.log("errror");

        }
    });

}

function submitorder() {


    $('.submit-btn').attr("disabled", true);
    $('.submit-btn').html("Loading...");

    let userObj = JSON.parse(localStorage.getItem("userData"));

    var finalOrderObj = {};
    if (isPickupBool) {
        finalOrderObj = {};
        finalOrderObj = {
            isPickupAtStore: true,
            email: userObj['email'],
            phone: userObj['phone'],
            storeAddress: storeAddress,
            billingAddress: finalBillingAddress
        };

    } else {
        finalOrderObj = {};
        finalOrderObj = {
            isPickupAtStore: false,
            email: userObj['email'],
            billingAddress: finalBillingAddress
        };
    }
    if (enableTwoHrs) {
        finalOrderObj.istwohrs = true;
    }
    finalOrderObj.flag = "WEB";
    console.log(finalOrderObj, "CREATE");


    $.ajax(`${newBaseUrl}api/order/create-v2`, {
        type: 'POST',
        data: JSON.stringify(finalOrderObj),
        headers: {
            'x-auth': localStorage.getItem('userToken')
        },
        dataType: 'json', // type of response data
        contentType: 'application/json',
        success: function (response, status, xhr) { // success callback function

            if (response['success']) {

                setTimeout(() => {


                    var products = [];

                    for (var i = 0; i < CART.products.length; i++) {
                        var product = {
                            'name': CART.products[i].name,
                            'id': CART.products[i].id,
                            'price': CART.products[i].payPrice,
                            'brand': CART.products[i].ftrBrand,
                            'quantity': CART.products[i].quantity
                        };
                        products.push(product);
                    }

                    dataLayer.push({
                        'event': 'checkout',
                        'ecommerce': {
                            'checkout': {
                                'actionField': [
                                    { 'step': 1, 'option': 'PayTM' },
                                    { 'step': 2, 'option': 'Pinelabs' },
                                    { 'step': 3, 'option': 'COD' }
                                ],
                                'products': products
                            }
                        },
                        'eventCallback': function () {

                            $('.orderId').val(response.value);
                            console.log("JJJJJJJJJJ", $('input:radio[name=paymentRadio]').val());
                            if ($('input:radio[name=paymentRadio]:checked').val() == "online-radio") {
                                dataLayer.push({
                                    'event': 'checkoutOption',
                                    'ecommerce': {
                                        'checkout_option': {
                                            'actionField': { 'step': 1, 'option': "PayTM" }
                                        }
                                    }
                                });
                                console.log("PAY WITH PAYTM");
                                document.paytm.submit();
                            } else if ($('input:radio[name=paymentRadio]:checked').val() == "pg-radio") {
                                dataLayer.push({
                                    'event': 'checkoutOption',
                                    'ecommerce': {
                                        'checkout_option': {
                                            'actionField': { 'step': 2, 'option': "Pinelabs" }
                                        }
                                    }
                                });

                                setTimeout(function () {
                                    document.pinelab.submit();
                                }, 2500);
                            } else if ($('input:radio[name=paymentRadio]:checked').val() == "cash-radio") {
                                dataLayer.push({
                                    'event': 'checkoutOption',
                                    'ecommerce': {
                                        'checkout_option': {
                                            'actionField': { 'step': 3, 'option': "COD" }
                                        }
                                    }
                                });
                                setTimeout(function () {
                                    document.codfree.submit();


                                }, 2500);
                            } else if ($('input:radio[name=paymentRadio]:checked').val() == "bajaj-radio") {
                                console.log("BAJAJ");

                                setTimeout(function () {
                                    document.bajajemi.submit();


                                }, 2500);

                            }


                            // location.replace(`/checkout/${response['value']}`);
                            //document.location = 'checkout.html';
                        }
                    });
                }, 3000);

                // setTimeout(() => {
                //     localStorage.setItem('userData', JSON.stringify(response['data'][0]));
                //     location.reload();
                // }, 2500);

            }
            else {
                $('.submit-btn').attr("disabled", false);
                $('.submit-btn').html("Submit Order");
                $('.registration-error').show();
                $('.registration-error').html(response["message"]);

            }
        },
        error: function (jqXhr, textStatus, errorMessage) { // error callback 
            console.log("errror");

        }
    });

}

$("input:radio[name=gender]").change(function () {
    $('.address-new-b').hide();
    if ($(this).val() == "2hrdelivery") {

        isPickupBool = false;
        enableTwoHrs = true;
        $("#first-b").show();

        $('.2hr-name').show();
        $('.both-name').hide();
        $('.free-name').hide();
        $('.pickup-b-name').hide();
    } else if ($(this).val() == "pickupatstore") {
        isPickupBool = true;
        $("#first-b").show();
        $('.2hr-name').hide();
        $('.free-name').hide();
        $('.both-name').show();
        $("#store").show();
        $('.pickup-b-name').show();
        enableTwoHrs = false;
    } else if ($(this).val() == "freehomedelivery") {
        isPickupBool = false;
        enableTwoHrs = false;
        $("#first-b").show();
        $('.both-name').show();
        $('.2hr-name').hide();
        $('.free-name').show();
        $('.pickup-b-name').hide();
    }
});

var isTwoHrsDel = false;

$("#chkdeliv").click(function () {

    isTwoHrsDel = false;
    if (this.checked) {
        $(".pick1").show();
        $(".pickup-block").hide();
        $(".isDeliveryFree").show();
    } else {
        $(".pick1").hide();
        $(".isDeliveryFree").hide();
        $(".pickup-block").show();
        $("#deliveryzip").attr("disabled", false);

    }

});

function checkPin() {

    $(".pincode-status").html();
    regexp = /^\d{6}$/;

    if (regexp.test($('#pincode').val())) {


        let pin = {
            pinCode: $('#pincode').val()
        };
        $.ajax(newBaseUrl + 'api/pincodeVerify', {
            type: 'POST',
            data: pin,
            dataType: 'json', // type of response data
            timeout: 5000, // timeout milliseconds
            success: function (data, status, xhr) { // success callback function

                if (data.status) {
                    isTwoHrsDel = true;
                    $('#deliveryzip').val($('#pincode').val());
                    $("#deliveryzip").attr("disabled", true);
                    $('.pincode-status').html(`${data.message}`);
                    Swal.fire({
                        position: 'center',
                        icon: 'success',
                        title: data.message,
                        showConfirmButton: false,

                    });
                } else {
                    isTwoHrsDel = false;
                    $('.pincode-status').html(`${data.message}`);

                    Swal.fire({
                        position: 'center',
                        icon: 'warning',
                        title: data.message,
                        showConfirmButton: false,


                    });
                }

            },
            error: function (jqXhr, textStatus, errorMessage) { // error callback
                console.log("errror");

            }
        });

    } else {
        $('.pincode-status').html(`Invalid Pincode`);
    }



}

var cart = [];
var sum = 0;
var count = 0;
var coupounObj = {};

// cart = JSON.parse(localStorage.getItem('shoppingcart'));
// var tempCartlength = cart.length;
$('.error-content').hide();

$('.noItemsInCart').hide();


var districts = [
    {
        "City": " Hyderabad",
        "Retailer Locality Area": "Kphb",
        "Full Postal Address ": "No 8 & 9, 1St Floor, Aphb Commercial Complex, Tabla Building Opp Klm, Opp Sivaparvathi Theatre, Main Road, Kphb, Hyderabad.",
        "Mobile Number": "9100930666",
        "State": "TG",
        "Pincode": "500072"
    },
    {
        "City": " Hyderabad",
        "Retailer Locality Area": "Uppal",
        "Full Postal Address ": "Door No: 2-1-90, Opp Mahankali Mandhir, Main Road, Uppal, Hyderabad",
        "Mobile Number": "9100908666",
        "State": "TG",
        "Pincode": "500039"
    },
    {
        "City": " Hyderabad",
        "Retailer Locality Area": "Ramanthapur",
        "Full Postal Address ": "Door No: 2-2-56/A, Muthoot Finance Building, Vishal Meega Mart, Ramanthapur , Hyderabad",
        "Mobile Number": "9100812666",
        "State": "TG",
        "Pincode": "500013"
    },
    {
        "City": " Hyderabad",
        "Retailer Locality Area": "Karmanghat",
        "Full Postal Address ": "Door No: 2-2-56/A, Muthoot Finance Building, Vishal Meega Mart, Ramanthapur , Hyderabad",
        "Mobile Number": "9100812666",
        "State": "TG",
        "Pincode": "500079"
    },
    {
        "City": " Hyderabad",
        "Retailer Locality Area": "SD Road",
        "Full Postal Address ": "Door No: 2-2-56/A, Muthoot Finance Building, Vishal Meega Mart, Ramanthapur , Hyderabad",
        "Mobile Number": "9100812666",
        "State": "TG",
        "Pincode": "500003"
    },
    {
        "City": " Hyderabad",
        "Retailer Locality Area": "SR Nagar",
        "Full Postal Address ": "Door No: 2-2-56/A, Muthoot Finance Building, Vishal Meega Mart, Ramanthapur , Hyderabad",
        "Mobile Number": "9100812666",
        "State": "TG",
        "Pincode": "500038"
    },
    {
        "City": " Hyderabad",
        "Retailer Locality Area": "Hydernagar",
        "Full Postal Address ": "Plot No: 21/Mig, Near Axis Bank, Near Metro Station, Dharmareddy Colony, Hydernagar, Hydernagar, ",
        "Mobile Number": "9100813666",
        "State": "TG",
        "Pincode": "500085"
    },
    {
        "City": " Hyderabad",
        "Retailer Locality Area": "Himayatnagar",
        "Full Postal Address ": "3-6-563/1/A, Liberty Road, Near Max Fashion, Mc.Donalds, Upper Ground Floor, Himayatnagar, ",
        "Mobile Number": "9100814666",
        "State": "TG",
        "Pincode": "500029"
    },
    {
        "City": " Hyderabad",
        "Retailer Locality Area": "Malkajgiri",
        "Full Postal Address ": "Door No: 2-130, Beside Shah Electronics, Hanuman Temple Opp, Near Central Bank, Vani Nagar, Malkajgiri, ",
        "Mobile Number": "9100823666",
        "State": "TG",
        "Pincode": "500047"
    },
    {
        "City": " Hyderabad",
        "Retailer Locality Area": "Greenlands",
        "Full Postal Address ": "No:8, Beside Lal Banglaw, Opp Greenpark Hotel,Oppo Dr.Reddy’S Hospital, Greenlands",
        "Mobile Number": "9100824666",
        "State": "TG",
        "Pincode": "500016"
    },
    {
        "City": " Hyderabad",
        "Retailer Locality Area": "Chandanagar",
        "Full Postal Address ": "4-92, Block No-4, Inside Gramakantam, Opp Swagath Grand, Chandanagar.",
        "Mobile Number": "9100825666",
        "State": "TG",
        "Pincode": "500050"
    },
    {
        "City": " Hyderabad",
        "Retailer Locality Area": "Chaitanyapuri",
        "Full Postal Address ": "G-1, 13-18-97/5/Nr, Ground Floor, Opp Grean Leaves, Near Busstop, Opp Biba,Rajanigandha Appartments, Kamalanagar Colony, Gaddiannaram Village, Chaitanyapuri",
        "Mobile Number": "9573823666",
        "State": "TG",
        "Pincode": "500060"
    },
    {
        "City": " Hyderabad",
        "Retailer Locality Area": "Vanastalipuram",
        "Full Postal Address ": "Shop No-1, H. No-436, Opp Red Water Tank, Govt Hospital, Lig Phase-Ii, Vanastalipuram, ",
        "Mobile Number": "9573865666",
        "State": "TG",
        "Pincode": "500070"
    },
    {
        "City": " Hyderabad",
        "Retailer Locality Area": "Karkhana",
        "Full Postal Address ": "Shop No-25, Beside Mahankali Mandhir, Kharkhana Road, Secunderabad",
        "Mobile Number": "9573887666",
        "State": "TG",
        "Pincode": "500009"
    },
    {
        "City": " Hyderabad",
        "Retailer Locality Area": "Rtc X Road",
        "Full Postal Address ": "D.No.1-1-115 & 116, Beside Crystal Hotel, Rtc X Roads, ",
        "Mobile Number": "9573911666",
        "State": "TG",
        "Pincode": "500020"
    },
    {
        "City": " Hyderabad",
        "Retailer Locality Area": "Boduppal",
        "Full Postal Address ": "Shop No -9-14/3,Beside Reliance Digital, Opp.Oriental Bank Of Commerce, ",
        "Mobile Number": "9573899666",
        "State": "TG",
        "Pincode": "500039"
    },
    {
        "City": " Hyderabad",
        "Retailer Locality Area": "A S Rao Nagar",
        "Full Postal Address ": "Plot No-1, Door No-1-1-272/1/Nr, Beside Axis Bank, A S Rao Nagar, Secunderabad",
        "Mobile Number": "7702488666",
        "State": "TG",
        "Pincode": "500062"
    },
    {
        "City": " Hyderabad",
        "Retailer Locality Area": "Langarhouse",
        "Full Postal Address ": "13-6-798/1/21, Beside Bapughat, Langarhouse, Hyderabad",
        "Mobile Number": "9573867666",
        "State": "TG",
        "Pincode": "500008"
    },
    {
        "City": " Hyderabad",
        "Retailer Locality Area": "Neredmet-2",
        "Full Postal Address ": "Plot No -7, Opp Sbi Bank, Sbi Defence Colony, Saptagiri Colony Sainikpuri, Neredmet X Road, ",
        "Mobile Number": "7702511666",
        "State": "TG",
        "Pincode": "500056"
    },
    {
        "City": " Hyderabad",
        "Retailer Locality Area": "Madhapur",
        "Full Postal Address ": "Door No: 2-38/A, Ground Floor,Kavuri Hills Phase 1 Pillar No.27, South India Ank Building,  Hitech City Road, Madhapur",
        "Mobile Number": "7702399666",
        "State": "TG",
        "Pincode": "500081"
    },
    {
        "City": " Hyderabad",
        "Retailer Locality Area": "Attapur",
        "Full Postal Address ": "Pillar No-118, Shop No-4-3-144/6,Ground & 1St Floor,  Beside Asian Threatre,  Attapur, Hyderabad, ",
        "Mobile Number": "7893587666",
        "State": "TG",
        "Pincode": "500048"
    },
    {
        "City": " Hyderabad",
        "Retailer Locality Area": "Shamshabad",
        "Full Postal Address ": "Shop No-11-132 & 131, Opp Bus Stop, Beside Appolo Pharmacy, Shamshabad, ",
        "Mobile Number": "7702455666",
        "State": "TG",
        "Pincode": "500038"
    },
    {
        "City": " Hyderabad",
        "Retailer Locality Area": "Ameerpet",
        "Full Postal Address ": "D-No.8-3-948-949, Yellareddy Guda, Beside Bata Showroom,  Opp Klm Shopping Mall, Ameerpet",
        "Mobile Number": "9100780666",
        "State": "TG",
        "Pincode": " 500016"
    },
    {
        "City": " Hyderabad",
        "Retailer Locality Area": "Banjara Hills",
        "Full Postal Address ": "Ghmc No-8-2-630 To 636/2& 3, Ground Floor And Mezzanine Floor, M/S. R.M.K Plaza, Road No 1 & 12 Junction, Banjara Hills, ",
        "Mobile Number": "7702388666",
        "State": "TG",
        "Pincode": "500034"
    },
    {
        "City": " Hyderabad",
        "Retailer Locality Area": "Chintal",
        "Full Postal Address ": "Plot No-1, Survey No -185, Prabhav Akred, Ranga Nagar, Chintal, Kutbullapur",
        "Mobile Number": "7893722666",
        "State": "TG",
        "Pincode": "500055"
    },
    {
        "City": " Hyderabad",
        "Retailer Locality Area": "Dilsukhnagar",
        "Full Postal Address ": "Sh No :16-11/740/4/A/B, Gaddianaram, Opp Vijaya Diagnostic Center, ",
        "Mobile Number": "7993157666",
        "State": "TG",
        "Pincode": "500060"
    },
    {
        "City": " Hyderabad",
        "Retailer Locality Area": "Santoshnagar",
        "Full Postal Address ": "Sh No: 9-7-218, Maruti Nagar, Beside Dr. Agarwal Eye Hospital, Santoshnagar ",
        "Mobile Number": "7993139666",
        "State": "TG",
        "Pincode": "500060"
    },
    {
        "City": " Hyderabad",
        "Retailer Locality Area": "Ecil",
        "Full Postal Address ": "1-7-214/2, Kamala Nagar Road, Ecil X Road, Ecil",
        "Mobile Number": "9121861666",
        "State": "TG",
        "Pincode": "500062"
    },
    {
        "City": " Hyderabad",
        "Retailer Locality Area": "Kondapur",
        "Full Postal Address ": "2Nd Floor, 134-135, Sharath Capital City Mall, Kondapur Vilage, Serilingampally Mandal, R.R.District,",
        "Mobile Number": "9121853666",
        "State": "TG",
        "Pincode": "500084"
    },
    {
        "City": " Hyderabad",
        "Retailer Locality Area": "Saroornagar",
        "Full Postal Address ": "Bsnl Building, Opp. Pillar No A1586, Beside Fruit Market, Saroornagar",
        "Mobile Number": "7993913666",
        "State": "TG",
        "Pincode": "500060"
    },
    {
        "City": "Adilabad",
        "Retailer Locality Area": "Adilabad",
        "Full Postal Address ": "Door No-4-2-198/13/1/13, Vp Complex, Mochigalli, Netaji Chowk, Adilabad, Opp Central District Library, ",
        "Mobile Number": "7893712666",
        "State": "TG",
        "Pincode": "504001"
    },
    {
        "City": "Anantapur",
        "Retailer Locality Area": "Tadipatri",
        "Full Postal Address ": "D.No:13/208, Opp Jcnrm Complex, C.B Road, Tadipatri, Ananthapur ",
        "Mobile Number": "9121864666",
        "State": "AP",
        "Pincode": "515591"
    },
    {
        "City": "Anantapur",
        "Retailer Locality Area": "Kadiri",
        "Full Postal Address ": "Sh.N-17771, Bypass Road, Opp Girls High School, Upstair Axis Bank, Kadiri,",
        "Mobile Number": "7993158666",
        "State": "AP",
        "Pincode": "515671"
    },
    {
        "City": "Anantapur",
        "Retailer Locality Area": "Dharmavaram",
        "Full Postal Address ": "Door No: 13/536,537, Indira Nagar,Opp Icic Bank, R.S Road, Dharmavaram,",
        "Mobile Number": "7702377666",
        "State": "AP",
        "Pincode": "515671"
    },
    {
        "City": "Anantapur",
        "Retailer Locality Area": "Anantapur",
        "Full Postal Address ": "Door No: 10/380,18/381, Subash Road, Opp Reliance Trendz, Anantapur",
        "Mobile Number": "9100797666",
        "State": "AP",
        "Pincode": "515001"
    },
    {
        "City": "Bhimavaram",
        "Retailer Locality Area": "Bhimavaram",
        "Full Postal Address ": "Door No-16-2-189 To 191, Ward # 7, Sy No.404/10,Prabha Complex, Pp Road, Annapurna Threatre,  Bhimavaram Town, Weast Godhavari,",
        "Mobile Number": "7893655666",
        "State": "AP",
        "Pincode": "534201"
    },
    {
        "City": "Godavarikhani",
        "Retailer Locality Area": "Godavarikhani",
        "Full Postal Address ": "Door No: 18-5-193, 1St Floor Lakshmi Nagar, Opp Sbi Bank, Godavarikhani  ",
        "Mobile Number": "7893622666",
        "State": "TG",
        "Pincode": "505209"
    },
    {
        "City": "Guntur",
        "Retailer Locality Area": "Guntur",
        "Full Postal Address ": "Door No-5/37/43/1, Roshan Complex Brodipet 4Th Lane 2Nd Cross  Opp Sindhuri Hotel, Guntur ",
        "Mobile Number": "7993155666",
        "State": "AP",
        "Pincode": "522002"
    },
    {
        "City": "Guntur",
        "Retailer Locality Area": "Naaz Center - Guntur",
        "Full Postal Address ": "Sh.No: 9-10-1, Station Road, Naaz Building, Naaz Center, Guntur, Andhra Pradesh",
        "Mobile Number": "7993153666",
        "State": "AP",
        "Pincode": "522001"
    },
    {
        "City": "Karimnagar",
        "Retailer Locality Area": "Karimnagar",
        "Full Postal Address ": "Door No: 2-10-17, Geetha Bhavan Road, Near Ii Town Police Station",
        "Mobile Number": "9100798666",
        "State": "TG",
        "Pincode": " 505001"
    },
    {
        "City": "Khammam",
        "Retailer Locality Area": "Khammam",
        "Full Postal Address ": "Sh No: 8-1-152 & 8-1-153, Opposite Bus Stop, Municipal Office Road",
        "Mobile Number": "9100783666",
        "State": "TG",
        "Pincode": "507001"
    },
    {
        "City": "Kurnool",
        "Retailer Locality Area": "Kurnool",
        "Full Postal Address ": "D.No-40/354/1,1A,1B, Pedha Park Road, Opp Malabar Gold, Kurnool",
        "Mobile Number": "9573933666",
        "State": "AP",
        "Pincode": "518001"
    },
    {
        "City": "Kurnool",
        "Retailer Locality Area": "Nandyal Road - Kurnool",
        "Full Postal Address ": "D.No: 87/986 – 1I & 87/986 – 2F,Nandyal Road, Viswanath Plaza, Kurnool ",
        "Mobile Number": "7702745666",
        "State": "AP",
        "Pincode": "518001"
    },
    {
        "City": "Mahbubnagar",
        "Retailer Locality Area": "Mahbubnagar",
        "Full Postal Address ": "D.No.2-2-1/5, Shah Gouse Plaza,Vineela Coffee Centre, Near New Bus Stop, Opp Collector’S Office",
        "Mobile Number": "9618898666",
        "State": "TG",
        "Pincode": "509001"
    },
    {
        "City": "Nalgonda",
        "Retailer Locality Area": "Nalgonda",
        "Full Postal Address ": "No-6-2-654 & 655 (Old H-No-6-2-19/21/1), Ground Floor & 1St Floor, Yelishala Colony",
        "Mobile Number": "7893567666",
        "State": "TG",
        "Pincode": "508001"
    },
    {
        "City": "Nizamabad",
        "Retailer Locality Area": "Nizamabad",
        "Full Postal Address ": "Shop No- 47 & 48, New Muncipal Complex , Station Road",
        "Mobile Number": "7893633666",
        "State": "TG",
        "Pincode": "503001"
    },
    {
        "City": "Ongole",
        "Retailer Locality Area": "Ongole",
        "Full Postal Address ": "Opp: Rtc Depot, Hotel Y Palace Premises, Kurnool Road, ",
        "Mobile Number": "7993411666",
        "State": "AP",
        "Pincode": "523002"
    },
    {
        "City": "Rajamundary",
        "Retailer Locality Area": "Rajamundary",
        "Full Postal Address ": "Door No: 30-1-29, Kumarshetty Kutter, Manipuram Gold, J.P. Road, Rajamundry",
        "Mobile Number": "7702788666",
        "State": "AP",
        "Pincode": "533101"
    },
    {
        "City": "Sangareddy",
        "Retailer Locality Area": "Sangareddy",
        "Full Postal Address ": "Door No-5-2-19/5, Opp Raithu Bazar, Near Bus Stand",
        "Mobile Number": "7893543666",
        "State": "TG",
        "Pincode": "502001"
    },
    {
        "City": "Siddipet",
        "Retailer Locality Area": "Siddipet",
        "Full Postal Address ": "Sh.No: 11-1-150/A,Medak Road, Beside Andhra Bank, Siddipe",
        "Mobile Number": "7993140666",
        "State": "TG",
        "Pincode": "502103"
    },
    {
        "City": "Srikakulam",
        "Retailer Locality Area": "Srikakulam",
        "Full Postal Address ": "Shop Bearing No: 8/67/68, Gt Road, Opp. State Bank Main Branch, Srikakulam, ",
        "Mobile Number": "7702699666",
        "State": "AP",
        "Pincode": "532001"
    },
    {
        "City": "Suryapet",
        "Retailer Locality Area": "Suryapet",
        "Full Postal Address ": "Sh.No: 1-2-270/46/4 & 1-2-270/46/5, M.G. Road, Opp: Yes Bank",
        "Mobile Number": "9100921666",
        "State": "TG",
        "Pincode": "508213"
    },
    {
        "City": "Tadepalligudem",
        "Retailer Locality Area": "Tadepalligudem",
        "Full Postal Address ": "Sh.No: 3-1-13/2 K.N. Road, Nandhiboma Center, Tadepalligudem -1, West Godavari District, ",
        "Mobile Number": "7993149666",
        "State": "AP",
        "Pincode": "534101"
    },
    {
        "City": "Tenali",
        "Retailer Locality Area": "Tenali",
        "Full Postal Address ": "16, Mdr83, Bose Rd, Kothapet, Ramalingeswara Pet, Tenali, Andhra Pradesh ",
        "Mobile Number": "7702987666",
        "State": "AP",
        "Pincode": "522201"
    },
    {
        "City": "Vijayawada",
        "Retailer Locality Area": "P&T Colony, Mg Road - Vijayawada",
        "Full Postal Address ": "Plot No: 40-1-51, Israeloet, Opp-P&T Colony, Mgroad, Vijaywada – 520010O Pp To Bsnl / Sbi Bank.",
        "Mobile Number": "9121867666",
        "State": "AP",
        "Pincode": "520010"
    },
    {
        "City": "Vijayawada",
        "Retailer Locality Area": "Masjid Street - Vijayawada",
        "Full Postal Address ": "Ward No – 9, Block No – 12, Door No – 22-11-2&3, 28-10-27 & 28-10-10/1 To 6, Masjid Street,Arandal Pet, Vijayawada",
        "Mobile Number": "7993907666",
        "State": "AP",
        "Pincode": "520002"
    },
    {
        "City": "Vijayawada",
        "Retailer Locality Area": "Eluru Road, Governerpet - Vijayawada",
        "Full Postal Address ": "Door No – 29-37-149, Ward No – 24, Block No – 9 Eluru Road, Governerpet, Vijayawada",
        "Mobile Number": "7993908666",
        "State": "AP",
        "Pincode": "520002"
    },
    {
        "City": "Vijayawada",
        "Retailer Locality Area": "Patamata - Vijayawada",
        "Full Postal Address ": "D.No 73-2-1, Oppo Kotak Mahindra Bank, Patamata, Vijayawada,",
        "Mobile Number": "7993909666",
        "State": "AP",
        "Pincode": "520010"
    },
    {
        "City": "Visakhapatnam",
        "Retailer Locality Area": "Gajuwaka",
        "Full Postal Address ": "D.No.9-7-256/4, High School Rd, New Gajuwaka Main Rd, Opp: Mohini Cinema Hall, Gajuwaka, Visakhapatnam",
        "Mobile Number": "77027 67666",
        "State": "AP",
        "Pincode": "530026"
    },
    {
        "City": "Visakhapatnam",
        "Retailer Locality Area": "Gopalapatnam(Nad Junction)",
        "Full Postal Address ": "58-1-332, Sh 39, Nad Junction, Buchirajupalem, Dungalavanipalem, Visakhapatnam, Andhra Pradesh",
        "Mobile Number": "79931 48666",
        "State": "AP",
        "Pincode": "530027"
    },
    {
        "City": "Visakhapatnam",
        "Retailer Locality Area": "Daba Gardens",
        "Full Postal Address ": "Opp. Sri Vamsi Shopping Mall, Main Rd, Beside Postal Office, Daba Gardens, 104 Area, Visakhapatnam, Andhra Pradesh ",
        "Mobile Number": "79931 41666",
        "State": "AP",
        "Pincode": "530020"
    },
    {
        "City": "Warangal",
        "Retailer Locality Area": "Warangal",
        "Full Postal Address ": "1St & 2Nd Floor (Entire Building) Shop No-9-10-13, Opp Sbi Main Branch, Jpn Road",
        "Mobile Number": "7702943666",
        "State": "TG",
        "Pincode": "506002"
    },
    {
        "City": "Warangal",
        "Retailer Locality Area": "Hanumakonda",
        "Full Postal Address ": "D-No-5-9-167/1, Sikhwadi, Kishanpura, Nayeem Nagar Road",
        "Mobile Number": "7702934666",
        "State": "TG",
        "Pincode": "506001"
    },
    {
        "City": "Warangal",
        "Retailer Locality Area": "Hanumakonda – 2",
        "Full Postal Address ": "Sh.No: 3-3-33/34, Beside Mahendra Showroom, Hanumakonda",
        "Mobile Number": "7993142666",
        "State": "TG",
        "Pincode": "506001"
    },
    {
        "City": "Warangal",
        "Retailer Locality Area": "Narsampet",
        "Full Postal Address ": "Ward No:9, H.No:9-74/1-C, Main Road, Narsampet",
        "Mobile Number": "9100952666",
        "State": "TG",
        "Pincode": "506132"
    }
];

var isPickupStore = true;

$(document).ready(function () {


    $('#place-order').click(function () {
        $('html, body').animate({
            scrollTop: $("#cart-view").offset().top - 150
        }, 1000);
    });

    window.addEventListener("storage", function () {

    }, false);

    $('.stores-block').hide();
    $("#store").hide();
    $("#scales").click(function () {

        isPickupStore = true;
        $('#filladdress').prop('checked', true);


        $("#store").show();
        if ($(this).is(":checked")) {
            $("#deliv").hide();
            isPickupStore = true;
            $('.pincode-del').hide();
        } else {
            isPickupStore = false;
            $("#deliv").show();
            $("#store").hide();
            $('.pincode-del').show();
        }
    });

    var distArray = [];
    $.each(districts, function (index, value) {

        distArray.push(value.City);

    });

    let unique = [...new Set(distArray)];
    // console.log("UUNIQ",unique);
    $('#List').html('');

    $('#List').append(`<option disabled selected value = "null">select city</option>`);

    for (i = 0; i < unique.length; i++) {

        let element = unique[i];

        $('#List').append(`
                        <option value = "${element}">${element}</option>
                    `);
    }


    $('#List').on('change', function () {


        $('.stores-block').show();
        let unique2 = [];
        let self = this;
        $.each(districts, function (index, value) {
            if (value.City.toLowerCase() == self.value.toLowerCase()) {
                unique2.push(value['Retailer Locality Area']);
            }

        });

        $('#List2').html('');
        $('#List2').append(`<option disabled selected value = "null">select Store</option>`);
        for (i = 0; i < unique2.length; i++) {
            let element = unique2[i];
            $('#List2').append(`
                            <option value = "${element}">${element}</option>
                        `);
        }

    });

    $('#List2').on('change', function () {
        let self = this;
        $.each(districts, function (index, value) {
            if (value['Retailer Locality Area'] == self.value) {

                storeAddress.City = value['City'];

                storeAddress.Area = value['Retailer Locality Area'];

                storeAddress["Full Postal Address"] = value['Full Postal Address '];

                storeAddress['Mobile Number'] = value['Mobile Number'];

                storeAddress['State'] = value['State'];

                storeAddress['Pincode'] = value['Pincode'];

            }

        });

        // console.log(storeAddress);

    });






});





function couponApply() {

    let couponData = {
        'email': $('#email').val(),
        'phoneNumber': $('#phone').val(),
        'voucherId': coupounObj.voucherId,
        'voucherCode': $('#couponCode').val(),
        'orderValue': sum,
        'offerValue': coupounObj.amount

    };
    // console.log(couponData);

    $.ajax(newBaseUrl + 'api/voucherAllocation/', {
        type: 'POST',
        data: JSON.stringify(couponData),
        dataType: 'json', // type of response data
        contentType: 'application/json',
        timeout: 5000, // timeout milliseconds
        success: function (data, status, xhr) { // success callback function
            // console.log(data);
            let totalamt = data.data.orderValue - data.data.offerValue;
            if (data.status) {
                $('.apply').hide();
                document.getElementById('vt').innerHTML = totalamt.toLocaleString('en-IN', {
                    maximumFractionDigits: 2,
                    style: 'currency',
                    currency: 'INR'
                });
                Swal.fire({
                    position: 'center',
                    icon: 'success',
                    title: data.message,
                    showConfirmButton: true
                });
            } else {
                Swal.fire({
                    position: 'center',
                    icon: 'Failed',
                    title: data.message,
                    showConfirmButton: true,
                });
                $('.apply').show();
            }
        },
        error: function (jqXhr, textStatus, errorMessage) { // error callback
            console.log("errror");

        }
    });
}




if (JSON.parse(localStorage.getItem('shoppingcart')) == 0 || JSON.parse(localStorage.getItem('shoppingcart')) == null) {

    $('.empty').show();
    $('.main-view').hide();
} else {
    $('.empty').hide();
    $('.main-view').show();
}


// Checkout.html end

// wishlsit.html begin

// wishlist.html end


function userLogout() {


    localStorage.removeItem('userToken');
    localStorage.removeItem('userData');
    localStorage.removeItem("phonepeResponse");

    setTimeout(() => {
        location.replace('/');
    }, 2000);

    Swal.fire({
        position: 'center',
        icon: 'success',
        title: "Logout Successfully",
        showConfirmButton: false,
        timer: 3000
    }).then(() => {

    });



}

function fetchUser() {
    userData = JSON.parse(localStorage.getItem('userData'));

    $(".name-append").html(`${userData.name}`);
    $(".email-append").html(`${userData.email}`);
    $(".phone-append").html(`${userData.phone}`);
}


// account-update.html begin
$(document).ready(function () {
    $('.pwd-block').hide();
    $('#signuperror').hide();
    getUserDetails();
    $("#changePwd").on("click", function () {
        if (this.checked) {
            $('.pwd-block').show();

        }
        else {
            $('.pwd-block').hide();

        }
    });
});

function getUserDetails() {
    if (localStorage.getItem('userData')) {
        var userData = JSON.parse(localStorage.getItem('userData'));
        console.log("IN", userData);
        $('#name').val(userData.name);

        $('#email').val(userData.email);
        $('#phone').val(userData.phone);

        $('#street').val(userData.addresses[0].street);
        $('#area').val(userData.addresses[0].area);
        $('#city').val(userData.addresses[0].city);
        $('#zip').val(userData.addresses[0].zip);
    }
}

function settingsFromSubmit() {
    var updateProfile = {
        name: $('#name').val(),

        phone: $('#phone').val(),
        email: $('#email').val(),

        addresses: [
            {
                name: $('#name').val(),
                phone: $('#phone').val(),
                street: $('#street').val(),
                area: $('#area').val(),
                city: $('#city').val(),
                zip: $('#zip').val(),
            }
        ]
    };



    console.log(updateProfile);


    $.ajax('/api/user', {
        type: 'POST',
        data: JSON.stringify(updateProfile),
        headers: {
            'x-auth': localStorage.getItem('userToken')
        },
        dataType: 'json', // type of response data
        contentType: 'application/json',
        success: function (response, status, xhr) { // success callback function

            console.log("Updated", response);
            if (response["status"]) {
                Swal.fire({
                    position: 'center',
                    icon: 'success',
                    title: 'Updated Successfully',
                    showConfirmButton: false,
                    timer: 1500
                }).then(() => {
                    localStorage.setItem('userData', JSON.stringify(response['data'][0]));
                    location.replace('/my-account');

                });



            } else {

                Swal.fire({
                    position: 'center',
                    icon: 'error',
                    title: 'Failed, please try again',
                    showConfirmButton: false,
                    timer: 1500
                }).then(() => {
                    getUserDetails();
                });

            }
        },
        error: function (jqXhr, textStatus, errorMessage) { // error callback 
            console.log("errror");

        }
    });




}


// account.update.html end


// Orders-list.html begin
function fetchOrders() {

    $.ajax(newBaseUrl + 'api/order/v2', {
        type: 'POST',
        headers: {
            'x-auth': localStorage.getItem('userToken')
        },
        data: {},
        dataType: 'json', // type of response data
        contentType: 'application/json',
        success: function (data, status, xhr) { // success callback function
            // console.log('ORDers obj', data);
            if (data.length == 0) {
                $('#wish-table').hide();
                $('.wish-empty').show();
                $('.no-loading').hide();
                $('.loading').show();
            } else {
                $('.no-loading').show();
                $('.loading').hide();
                $('.wish-empty').hide();


                $('#cart-row-new').html('');
                var statusVal;
                for (let i = 0; i < data.length; i++) {
                    const params = data[i];
                    $('#cart-row-new').append('');
                    statusVal = '';
                    if (params["status"] != undefined) {
                        // console.log("STAT",params["status"]);
                        statusVal = ` <span style="    display: flex;align-items: center; font-weight: 400;">Status : <h6 style="font-weight: 600;font-size: 14px;padding-left: 5px;margin: 0;"> ${params.status}</h6></span>`;
                    }
                    $('#cart-row-new').append(`
								<div class="col-md-6 wish-b-each">
                                  

									<div class="col-md-3 col-xs-4 img-b"	>
										<img src="https://d34e6224thkkna.cloudfront.net/happi/${params.items[0].pictures[0]}.jpg">
										</div>
										<div class="col-md-9 col-xs-8  details-prod-b"	>
											<div class="name">
												<span>${params.items[0].name}</span>

												</div>
                                                <div class="price-btn">
                                                    <span style="display: grid;">
                                                    <span style="    display: flex;align-items: center; font-weight: 400;">No of Items <h6 style="font-weight: 600;font-size: 14px;padding-left: 5px;margin: 0;">${params.count} </h6></span>
                                                <span class="price-v" style="    display: flex;align-items: center; font-weight: 400;">Order Value <h6 style="font-weight: 600;font-size: 14px;padding-left: 5px;margin: 0;"> &#8377 ${params.SubTotal}</h6></span>
                                                </span>
                                                <span>

                                               ${statusVal}
                                                <span style="    display: flex;align-items: center; font-weight: 400;"><a href='/checkout/${params.id}' style="display: flex; align-items: center;   background-color: #fb9013;   padding: 2px 5px;   border-radius: 2px;   font-size: 14px;   color: #fff;">Click Here</a></span>
                                                </span>
											</div>
                                        </div>
                                        
										
								</div>
							`);



                }
                $('#wish-table').show();
            }

        },
        error: function (jqXhr, textStatus, errorMessage) { // error callback 
            Swal.fire({
                position: 'center',
                icon: 'error',
                title: 'Please try again',
                showConfirmButton: false,
                timer: 1500
            }).then(() => {
                fetchOrders();
            });

        }
    });
}



// orders-list.html end


// mobiles.html filter begin

var filterText = true;
$('.close-text').hide();

function showFilter() {
    filterText = !filterText;
    $('.filter-list').toggle();
    if (!filterText) {
        $('.save-text').hide();
        $('.close-text').show();
    } else {
        $('.save-text').show();
        $('.close-text').hide();
    }


}


$(document).ready(function () {
    console.log("dfffffffffffff");
    console.log(window.location.pathname);
    var url = window.location.href
    var params = url.split("?")[1];
    var message = params.split("=")[1];
    message.toString();
    console.log("message", message);
    $('#bajaj-msg').html(message.replaceAll("%20", " "));
    $('.price-result').hide();
    $(".each-filter h6").click(function () {
        let min = '';
        let max = '';
        min = this.getAttribute('data-min');
        max = this.getAttribute('data-max');


        console.log();
        location.replace(`/${window.location.pathname.split('/')[1]}/${window.location.pathname.split('/')[2]}/price-${min}-${max}`);

    });

});


    // mobils.html filter end