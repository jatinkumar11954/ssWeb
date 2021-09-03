var newBaseUrl = "/";
//var newBaseUrl = 'http://036ada29b9de.ngrok.io/';
var userData;
var cartData;
var varId;
var prodID;
var quanID;
var cartEmpty = true;
var pincodeId = "";
var nextweekdelivery = false;
var cartPaymentType = "online";
var isChangeAddress = false;
$(".accept-error").hide();
$(".copied-txt").hide();
$(".account-name-error").hide();
$(".account-email-error").hide();
$(".support-phone-error").hide();
$(".support-email-error").hide();
$(".spDetails-error").hide();
$(".sasta-deal-msg").hide();
$(".nodel").hide();
//address validation
$(".pop-name-error").hide();
$(".pop-email-error").hide();
$(".pop-city-error").hide();
$(".pop-pin-error").hide();
$(".pop-aprt-error").hide();
$(".pop-flat-error").hide();
$(".pop-street-error").hide();
$(".pop-land-error").hide();
$(".pop-area-error").hide();

$(".page-name-error").hide();
$(".page-email-error").hide();
$(".page-city-error").hide();
$(".page-pin-error").hide();
$(".page-aprt-error").hide();
$(".page-flat-error").hide();
$(".page-street-error").hide();
$(".page-land-error").hide();
$(".page-area-error").hide();
$(".earnings-found").hide();
$(".earnings-no").hide();
$(".selectedCity").hide();
$(".new-address").hide();
$(".email-error").hide();
$(".name-error").hide();
$(".show-only-sasta").hide();
var isSastaProducts = false;
var current_page = 1;
var records_per_page = 5;
// console.log('@{model.limit}',"LIMIT");
// console.log(records_per_page);
var objJson = {
  length: 0,
};
var monthsArray = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
var noRushObj, nextWeekObj, delivery_date, delivery_hrs;
var deliveryDetailsFinal,
  deliveryDetailsFinal2,
  finalDeliveryArray = [],
  shopsasta_delivery_charges = 0;
var citiesData = [];

if (window.location.pathname.split("/")[1] != "sasta-deals-mob") {
  document.getElementById("setDefaults").checked = true;
}
if (getCookie("pincode") == null || getCookie("pincode") == "") {
  if (localStorage.getItem("userData") != null) {
    var userData = JSON.parse(localStorage.getItem("userData"));
    var json = userData;
    for (var i = 0; i < json.addresses.length; i++) {
      var address = json.addresses[i];
      if (address.setDefault) {
        //alert('/api/set-pincode?pincode=' + address.pinCode);
        location.replace("/api/set-pincode?pincode=" + address.pinCode);
      }
    }
  }
}

function getCookie(name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(";");
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == " ") c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}
var isFlutter = false;

$(document).ready(function () {
  $("#museleave").mouseleave(function () {
    $(".copied-txt").hide();
  });

  window.addEventListener("flutterInAppWebViewPlatformReady", function (event) {
    isFlutter = true;
  });

  if (
    window.location.pathname.split("/")[1] != "sasta-deals-mob" &&
    !window.location.pathname.includes("paytm")
  ) {
    var isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      return (window.location.href = "/mobile");
    }
  }

  if (window.location.pathname.split("/")[1] != "cod-payment") {
    if (localStorage.getItem("codObj") != null) {
      localStorage.removeItem("codObj");
    }
  }

  if (window.location.pathname.split("/")[1] == "category") {
    setTimeout(() => {
      $.ajax({
        url: `${window.location.pathname}?json=1`,
        success: function (result) {
          if (!result.stockStatus) {
            $(".nodel").show();
          }
        },
      });
    }, 1500);
  }
  $.ajax({
    url: `${window.location.origin}?json=1`,
    success: function (result) {
      // console.log("H{PJ", result);
      if (!result.homepageJson.stockStatus) {
        // console.log("HHHHHHOME");
        $(".nodel").show();
      }
      for (
        let i = 0;
        i < result.homepageJson.data.allGroceries.products.length;
        i++
      ) {
        const element = result.homepageJson.data.allGroceries.products[i];
        let btnTxt = "";
        if (localStorage.getItem("userData")) {
          if (result.homepageJson.stockStatus) {
            if (element.stock == 0) {
              btnTxt =
                '<button type="button" class="btn btn-outofstock btn-lg">Out of stock</button>';
            } else {
              btnTxt = `<a href="javascript:addToCartPop('${element.id}')">
                         <button type="button" class="btn btn-secondary btn-lg">+ Add</button>
                         </a>`;
            }
          }
        } else {
          btnTxt = `<a href="javascript:login()">
                    <button type="button" class="btn btn-secondary btn-lg">+ Add</button>
                    </a>`;
        }
        let img_block;
        if (element.pictures.length != 0) {
          img_block = `<img class="img-fluid"  src="https://shop-sasta.s3.ap-south-1.amazonaws.com/shopsasta/${element.pictures[0]}.jpg" alt="">`;
        } else {
          img_block = `<img class="img-fluid" src="/img/no-prod.svg" alt="shopsasta">`;
        }

        $(".plp-list").append(`
                    <div class="item">
                        <div class="product">
                            <a href="/detail/${element.linker}">
                                <div class="product-header">
                                    ${img_block}
                                </div>
                                <div class="product-body">
                                    <h5>${element.name}</h5>
                                </div>
                                <div class="product-footer">
                                <p class="offer-price mb-0"><span class="price-format">${element.variant[0].base_price}</span> <i
                                class="mdi mdi-tag-outline"></i>
                                    <span class="regular-price price-format">${element.variant[0].mrp}</span>
                                </p>

                                    ${btnTxt}
                                </div>
                            </a>
                        </div>
                    </div>
                    `);
      }
    },
  });
  if (window.location.pathname.split("/")[1] == "") {
    setTimeout(() => {
      $.ajax({
        url: `?json=1`,
        success: function (result) {
          if (!result.homepageJson.stockStatus) {
            $(".nodel").show();
          }
        },
      });
    }, 1500);
  }
  if (
    window.location.pathname.split("/")[1] == "sasta-deals" ||
    window.location.pathname.split("/")[1] == "sasta-deals-mob"
  ) {
    getSastaPageByZone(1);
  }

  $(".edit-btn").hide();
  $("#verifyForm").hide();
  $(".sendotp-error").hide();
  $(".verify-error").hide();
  $(".registration-error").hide();

  $(".user-in").hide();
  $(".user-out").hide();

  if (
    window.location.pathname.split("/")[1] != "cart" &&
    window.location.pathname.split("/")[1] != "cart-payment" &&
    window.location.pathname.split("/")[1] != "sasta-deals" &&
    window.location.pathname.split("/")[1] != "sasta-deals-mob"
  ) {
    setTimeout(() => {
      priceFormating();
    }, 1000);
  }
  if (window.location.pathname.split("/")[1] != "my-earnings") {
    // getCities();
    // $("#popCity").select2();
  }

  if (window.location.pathname.split("/")[1] == "my-orders") {
    getOrders();
  }

  if (window.location.pathname.split("/")[1] == "faq") {
    getFaq();
  }

  if (window.location.pathname.split("/")[1] == "order-detail") {
    let orderedDt = new Date($(".format-dt").html());

    $(".format-dt").html(
      `${orderedDt.getDate()}-${
        monthsArray[orderedDt.getMonth()]
      }-${orderedDt.getFullYear()} ${orderedDt.getHours()} : ${orderedDt.getMinutes()}`
    );
    let orderedDtExpected = new Date($(".format-dt-expected").html());

    $(".format-dt-expected").html(
      `${orderedDtExpected.getDate()}-${
        monthsArray[orderedDtExpected.getMonth()]
      }-${orderedDtExpected.getFullYear()}`
    );
  }
  if (
    window.location.pathname.split("/")[1] == "refer-friend" ||
    window.location.pathname.split("/")[1] == "my-group"
  ) {
    referalCashback();
  }
  if (localStorage.getItem("userData")) {
    userData = JSON.parse(localStorage.getItem("userData"));
    refresh_cart();
    getDetails();

    $(".profile-num").html(userData.phone);
    $(".profile-name").html(userData.name);
    $("#account-name").val(userData.name);
    $("#account-number").val(userData.phone);
    $("#account-email").val(userData.email);
    $(".user-name").html(userData.name);
    $(".refer-code-c").html(userData.referal_code);

    $(".refer-code-c").val(`${userData.referal_code}`);

    $(".user-in").show();
    $(".user-out").hide();

    if (window.location.href.indexOf("PAYMENT_FAILED") != "-1") {
      $(".payment-failed").show();
    } else {
      $(".payment-failed").hide();
    }
    if (window.location.pathname.split("/")[1] == "my-address") {
      addressAppend();
    }

    if (window.location.pathname.split("/")[1] == "cart") {
      getDeliveryCharges();
    }

    if (window.location.pathname.split("/")[1] == "cart-payment") {
      getNorush();
      getRegularDelivery();
      setTimeout(() => {
        specialEventCall();
      }, 3000);
      window.setInterval(function () {
        window.location.href = "/cart";
      }, 1800000);
    }
    if (window.location.pathname.split("/")[1] == "cart-preview") {
      getItemsByVendor();
      setTimeout(() => {
        getNorush();
        getRegularDelivery();
      }, 1500);
    }

    if (window.location.pathname.split("/")[1] == "my-earnings") {
      getEarnings(1, 10);
      getEarningsSummary();
    }
    if (window.location.pathname.split("/")[1] == "my-group") {
      selectedGroup();
    }

    if (userData.addresses.length > 0) {
      appendSelectedLoc();
      $("#addresses").html("");
      for (let i = 0; i < userData.addresses.length; i++) {
        const element = userData.addresses[i];
        let active = "";
        let defaultText = "";
        let clicktext = "";
        if (element.setDefault) {
          active = "active";
          defaultText = ` <span class="${active}">Default : </span>`;
          clicktext = ` <span    style="margin-right:.5rem;border: 1px solid #ccc;
                    width: 100%;
                    padding: .5rem;margin:.5rem;">`;
          // console.log("LLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLll");
          localStorage.setItem("userPin", element.pinCode);
          // $('#stockPincode').attr('value', element.pinCode);
          // document.changePin.submit();
        } else {
          active = "";
          defaultText = "";
          clicktext = ` <span  onclick='selectLoc("${i}")'  style="margin-right:.5rem;
                    border: 1px solid #ccc; cursor: pointer;
                    width: 100%;
                    padding: .5rem;margin:.5rem;">`;
        }
        $(".loc-list").append(`
               ${clicktext}
               ${defaultText}
                ${element.name},
                
                ${element.apartmentName},
                ${element.officeNum},
                ${element.streetName},
                ${element.landmark},<br>
                ${element.areaDetails},
                ${element.city}     ,       
                ${element.pinCode}
                </span>
                                        
                `);
      }
    } else {
      $(".loc-list").append(`<a href="/my-address">Add Locations</a>`);
    }

    if (window.location.pathname.split("/")[1] == "support") {
      $("#spNumber").val(userData.phone);
      $("#spEmail").val(userData.email);
    }
  } else {
    console.log("OUT");
    localStorage.removeItem("tempUserData");
    localStorage.removeItem("userToken");
    localStorage.removeItem("userData");
    localStorage.removeItem("phonepeResponse");
    $(".user-in").hide();
    $(".user-out").show();
    if (
      window.location.pathname.split("/")[1] == "cart" ||
      window.location.pathname.split("/")[1] == "cart-payment" ||
      window.location.pathname.split("/")[1] == "checkout" ||
      window.location.pathname.split("/")[1] == "my-wishlist" ||
      window.location.pathname.split("/")[1] == "my-orders" ||
      window.location.pathname.split("/")[1] == "my-account-update" ||
      window.location.pathname.split("/")[1] == "my-account" ||
      window.location.pathname.split("/")[1] == "my-address" ||
      window.location.pathname.split("/")[1] == "refer-friend" ||
      window.location.pathname.split("/")[1] == "my-group" ||
      window.location.pathname.split("/")[1] == "sasta-deals"
    ) {
      location.replace("/");
    }
  }

  $(".search-text").focusout(function () {
    setTimeout(() => {
      $(".search-list-text").hide();
    }, 3000);
  });

  $(".search-text").on("keyup", function () {
    console.log("SSSSSSSSS");
    var searchObj = {};

    searchObj.name = $(".search-text").val();

    $.ajax(`${newBaseUrl}api/product-search`, {
      type: "POST",
      data: JSON.stringify(searchObj),
      headers: {
        "x-auth": localStorage.getItem("userToken"),
      },
      dataType: "json", // type of response data
      contentType: "application/json",
      success: function (response, status, xhr) {
        // success callback function
        $("#search-result").html("");
        if (response["items"].length > 0) {
          for (let i = 0; i < response["items"].length; i++) {
            const element = response["items"][i];

            $("#search-result").append(`
                        <a href="/detail/${element.linker}" style="color: #000;text-decoration: none;">${element.name}</a>
                        `);
          }
          $(".search-list-text").show();
        } else {
          $(".search-list-text").hide();
        }
      },
      error: function (jqXhr, textStatus, errorMessage) {
        // error callback
        console.log("errror");
        $(".search-list-text").hide();
      },
    });
  });
});

// $('.getCityPin').focusout(function() {
//     console.log("DDDD");
// })

function specialEventCall() {
  let cartss = localStorage.getItem("cart-value");
  if (cartss != null) {
    var cartValue = JSON.parse(cartss);
    var price = cartValue.totalPrice - cartValue.totalShippingPrice;
    if (price < 1) {
      $("#special-event").html(
        `You will be getting the approximate special event cashback of ₹0 from this order`
      );
      return;
    } else {
      $.ajax({
        url: "/api/special-event",
        type: "POST",
        data: JSON.stringify({ price: price }),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function (result) {
          if (result.status) {
            $("#special-event").html(
              `You will be getting the approximate special event cashback of ₹${result.data.cashback_amount} from this order`
            );
          } else if (price == 0) {
            $("#special-event").html(
              `You will be getting the approximate special event cashback of ₹0 from this order`
            );
          } else {
            $("#special-event").html("");
          }
        },
      });
    }
  }
}
function getCities(pin) {
  $.ajax(newBaseUrl + "api/city?pincode=" + pin, {
    type: "GET",
    dataType: "json", // type of response data
    contentType: "application/json",
    success: function (data, status, xhr) {
      // success callback function

      console.log(data);
      if (data.status) {
        $("#pageCity").val(data.data.city);
        $("#popCity").val(data.data.city);
      } else {
        console.log("Errr");
        Swal.fire({
          position: "center",
          icon: "error",
          title: data["message"],
          showConfirmButton: false,
          timer: 3000,
        });
        $("#pageCity").val("");
        $("#popCity").val("");
      }
      // citiesData = data;
      // for (let i = 0; i < data.length; i++) {
      //     const element = data[i];
      //     $('#pageCity').append(` <option value='${element.city}'>${element.city}</option>`);
      //     $('#popCity').append(` <option value='${element.city}'>${element.city}</option>`);
      // }
    },
    error: function (jqXhr, textStatus, errorMessage) {
      // error callback
    },
  });
}
$(document).on("shown.bs.tab", 'a[data-toggle="tab"]', function (e) {
  var tab = $(e.target);
  var contentId = tab.attr("href");

  //This check if the tab is active
  if (tab.parent().hasClass("active")) {
    console.log(contentId);
  } else {
    // console.log(contentId,"AAAaa");
    if (contentId == "#menu1") {
      // console.log("MENU !!!!!!");
      getSastaPageByZone(2);
    } else if (contentId == "#menu2") {
      // console.log("MENU #333");
      getSastaPageByZone(3);
    } else {
      // console.log("hme #333");
      getSastaPageByZone(1);
    }
  }
});

function skipNumOf(date, days) {
  const copy = new Date(Number(date));
  copy.setDate(date.getDate() + days);
  return copy;
}

function isSundayBtw(startDate, endDate) {
  while (startDate <= endDate) {
    if (startDate.getDay() === 0) {
      return true;
    }
    startDate.setDate(startDate.getDate() + 1);
  }
  return false;
}

function getSastaPageByZone(timezone) {
  let isDealPincode = new URLSearchParams(window.location.search);
  if (isDealPincode.has("pincode")) {
    pinC = `${isDealPincode.get("pincode")}&timezone=${timezone}`;
  } else {
    pinC = `${localStorage.getItem("userPin")}&timezone=${timezone}`;
  }
  $(".btn-1").hide();
  $(".btn-2").hide();
  $(".btn-3").hide();
  $(".loader").show();
  $(".no-loader").hide();
  $.ajax(`${newBaseUrl}api/sasta-page?pincode=${pinC}`, {
    type: "GET",

    dataType: "json", // type of response data
    contentType: "application/json",
    success: function (data, status, xhr) {
      // success callback function

      let stockbtn1 = "";
      let add_btn = "";

      $(".deal-prods").html("");
      $(".deal-prods-mob").html("");
      for (let i = 0; i < data.products.data.length; i++) {
        const element = data.products.data[i];
        stockbtn1 = "";
        add_btn = "";
        if (data.products["stockStatus"]) {
          if (element.sastaVariant.stock == 0) {
            add_btn = ``;
            stockbtn1 = ` <button type="button" class="btn btn-outofstock btn-lg">Out of stock</button>`;
          } else {
            if (isFlutter) {
              $(".row.deal-prods-mob").addClass("mob-deals");
              add_btn = `<span class="plus-icon btn-${timezone}" onclick="addCartDeal('${element.id}','${element.sastaVariant.id}','${element.sastaVariant.sastaPrice}')">+</span>`;
            } else {
              $(".row.deal-prods-mob").removeClass("mob-deals");
              add_btn = `<span class="plus-icon btn-${timezone}" onclick="sastaAdd('${element.id}',1,'${element.sastaVariant.id}','${element.sastaVariant.sastaPrice}')">+</span>`;
            }

            stockbtn1 = `<a href="javascript:addToCartPop('${element.id}')">
                        <button type="button" class="btn btn-secondary btn-lg">+ Add</button>
                       </a>`;
          }
        } else {
        }

        let img_block;
        if (element.pictures.length != 0) {
          img_block = `<img class="img-fluid"  src="https://shop-sasta.s3.ap-south-1.amazonaws.com/shopsasta/${element.pictures[0]}.jpg" alt="">`;
        } else {
          img_block = `<img class="img-fluid" src="/img/no-prod.svg" alt="shopsasta">`;
        }
        $(".deal-prods").append(`
                    <div class="col-md-3 flutterblock pmb-3">
                    <div class="product">
    
                        <div class="product-header">
                        ${img_block}
                        ${add_btn}
                        </div>
                        <div class="product-body">
                            <a href="#">
                                <h5>${element.name} (${element.sastaVariant.title})</h5>
                            </a>
    
                        </div>
                        <div class="product-footer">
                            <p class="offer-price mb-0 d-flex justify-content-between">
                                <span class="regular-price price-format">${element.sastaVariant.mrp}</span>
                                <span class="price-format">${element.sastaVariant.sastaPrice}</span>
                                </p>   
                        </div>
                    </div>
                </div>
                    `);
        $(".deal-prods-mob").append(`
                    <div class="each-ii mb-2" >
                    <div class="left-deal">
                    ${img_block}
                    </div>
                    <div class="right-deal" style="width: -webkit-fill-available;">
                    <div class="row m-0">
                        <span class=" sasta-mob-name">${element.name} (${
          element.sastaVariant.title
        })</span>
                        </div>
                       
                        <div class="row m-0" >
                        <div class="price-show-b">
                        <div >
                        <span>MRP :  <span class="price-format">	${
                          element.sastaVariant.mrp
                        }</span></span>
                        <span style="display:none;">Save : <span class="price-format">	 	${
                          element.sastaVariant.mrp -
                          element.sastaVariant.base_price
                        }</span></span>
                        <span style="font-size: 12px;
                        color: red;
                        margin-left: 1rem;">You Pay :  <span class="price-format">		${
                          element.sastaVariant.base_price
                        }</span></span>
                        </div>
                        <div>${add_btn}</div>
                        </div>
                        
                         </div>
                </div>
                  
                    `);
        if (i == data.products.data.length - 1) {
          $(".loader").hide();
          $(".no-loader").show();
        }
      }

      priceFormating();
      $(".btn-1").hide();
      $(".btn-2").hide();
      $(".btn-3").hide();
    },
    error: function (jqXhr, textStatus, errorMessage) {
      // error callback
    },
  });
}

function getFaq() {
  $.ajax(`${newBaseUrl}api/faqs`, {
    type: "GET",
    success: function (data, status, xhr) {
      // success callback function
      console.log(data);

      for (let i = 0; i < data.length; i++) {
        let obj = data[i];
        let first = i;
        var header2 = "";
        let active = "";
        let show = "";
        if (i == 0) {
          active = "active";
        }

        header2 = `  <li class="nav-item">
                            <a class="nav-link ${active}" data-toggle="tab" href="#${obj.id}${i}">   ${obj.title}</a>
                           </li>`;

        $("#v-pills-tab").append(`${header2}`);

        var ques = "";
        for (let j = 0; j < obj.context.length; j++) {
          const quesDetails = obj.context[j];
          var ques_each = "";
          if (j == 0) {
            show = "show";
          } else {
            show = "";
          }
          ques_each = `  <div class="card mb-0">
                    <div class="card-header" id="headingOne">
                       <h6 class="mb-0">
                          <a href="#" data-toggle="collapse" data-target="#collapseOne${j}" aria-expanded="true" aria-controls="collapseOne">
                          <i class="icofont icofont-question-square"></i> ${quesDetails.que}
                          </a>
                       </h6>
                    </div>
                    <div id="collapseOne${j}" class="collapse ${show}" aria-labelledby="headingOne" data-parent="#accordionExample">
                       <div class="card-body">
                       ${quesDetails.ans} 
                       </div>
                    </div>
                 </div>`;

          ques = ques + ques_each;
        }
        var details = "";

        details = `<div class="tab-pane container ${active}" id="${obj.id}${i}">
                    <div class="accordion" id="accordionExample">
                        
                    ${ques}
                        
                     </div>
                 
                </div>
                    
                
                                `;

        $("#v-pills-tabContent").append(`
                                ${details}
                                `);
      }
    },
    error: function (jqXhr, textStatus, errorMessage) {
      if (jqXhr.status == 401) {
        console.log("401 Err");
      }
    },
  });
}

function searchClick() {
  document.searchq.submit();
}

function saveMyAccount() {
  let nameErrorAccount = false;
  let emailErrorAccount = false;

  if (!isName($("#account-name").val())) {
    $(".account-name-error").show();
    nameErrorAccount = true;
  } else {
    $(".account-name-error").hide();
    nameErrorAccount = false;
  }

  if (!isEmail($("#account-email").val())) {
    $(".account-email-error").show();
    emailErrorAccount = true;
  } else {
    $(".account-email-error").hide();
    emailErrorAccount = false;
  }
  if (nameErrorAccount || emailErrorAccount) {
    return;
  } else {
    userData.name = $("#account-name").val();
    userData.phone = $("#account-number").val();
    userData.email = $("#account-email").val();
    $.ajax(`${newBaseUrl}api/user`, {
      type: "POST",
      data: JSON.stringify(userData),
      headers: {
        "x-auth": localStorage.getItem("userToken"),
      },
      dataType: "json", // type of response data
      contentType: "application/json",
      success: function (response, status, xhr) {
        // success callback function

        if (response["status"]) {
          $("#addressForm").hide();
          Swal.fire({
            position: "center",
            icon: "success",
            title: response["message"],
            showConfirmButton: false,
            timer: 3000,
          });

          setTimeout(() => {
            localStorage.setItem(
              "userData",
              JSON.stringify(response["data"][0])
            );
          }, 2500);
        } else {
          Swal.fire({
            position: "center",
            icon: "error",
            title: response["message"],
            showConfirmButton: false,
            timer: 3000,
          });
        }
      },
      error: function (jqXhr, textStatus, errorMessage) {
        // error callback
        console.log("errror");
      },
    });
  }
}

function priceFormating() {
  $(".price-format").each(function () {
    let num = parseFloat($(this).html());

    num = num.toLocaleString("en-IN", {
      maximumFractionDigits: 2,
      style: "currency",
      currency: "INR",
    });
    $(this).html(num);
  });
}

function refresh_cart() {
  $.ajax(newBaseUrl + "api/cart?t=" + new Date().getTime(), {
    type: "GET",
    headers: {
      "x-auth": localStorage.getItem("userToken"),
    },
    dataType: "json", // type of response data
    contentType: "application/json",
    success: function (data, status, xhr) {
      // success callback function

      if (data["status"]) {
        cartEmpty = false;
        cartData = data.data;
        $(".cart-value").html(data.data.products.length);
        localStorage.setItem("cart-value", JSON.stringify(cartData));
        if (
          window.location.pathname.split("/")[1] == "cart" ||
          window.location.pathname.split("/")[1] == "cart-payment"
        ) {
          appendCart();
          if (cartData.ssTotalPrice == 0) {
            // $('.coupon-b').hide();
            // $('.apply-cashback').hide();
            // $('.cashb-row').hide();
            // $('.nextweek-row').hide();
            // $('.coupon-row').hide();
            // $('#nextweek-check').attr('disabled', true);
            // $('#cashback-check').attr('disabled', true);
            // $('#couponValue').attr('disabled', true);
            // $('.coupon-apply-btn').attr('disabled', true);
          } else {
            $(".coupon-apply-btn").attr("disabled", false);
            $("#nextweek-check").attr("disabled", false);
            // $('#cashback-check').attr('disabled', false);
            $("#couponValue").attr("disabled", false);
          }
          if (cartData.products.length == 0) {
            cartEmpty = true;
            $("#cart-view").hide();
            $(".no-cart-view").show();
          } else {
            $("#cart-view").show();
            $(".no-cart-view").hide();
            if (cartData.is_wallet) {
              $("#cashback-check").prop("checked", true);
            } else {
              $("#cashback-check").prop("checked", false);
            }

            if (cartData.is_coupon_applied) {
              cartData.discount = cartData.discount.toLocaleString("en-IN", {
                maximumFractionDigits: 2,
                style: "currency",
                currency: "INR",
              });
              console.log(cartData.discount, "DDDDD");
              $(".couponAmount").html("-" + cartData.discount);
              $(".coupon-apply-btn").attr("disabled", true);
              $(".coupon-name-view").html(
                `<strong> Coupon Applied :  ${cartData.coupon} </strong>  <a data-toggle="tooltip" data-placement="top" title="" href="javascript:removeCoupon()" data-original-title="Remove Coupon" class="btn btn-secondary btn-sm" style="padding: 0 3px;margin-left:.5rem;"> <i class="mdi mdi-close"></i></a>`
              );
            } else {
              $(".coupon-apply-btn").attr("disabled", false);
              $(".coupon-name-view").html("");
              $(".couponAmount").html(0);
            }
          }
        }

        if (window.location.pathname.split("/")[1] == "cart-payment") {
          specialEventCall();
        }
      } else {
        cartEmpty = true;
        $("#cart-view").hide();
      }
    },
    error: function (jqXhr, textStatus, errorMessage) {
      // error callback
      if (jqXhr.status == 401) {
        localStorage.removeItem("userToken");
        localStorage.removeItem("userData");
        localStorage.removeItem("phonepeResponse");
        location.reload();
      }
    },
  });
}

function appendCart() {
  $("#cart-row").html("");

  $(".no-cart-view").hide();
  var subtotal = 0;
  var savings = 0;
  if (cartEmpty) {
    $("#cart-view").hide();
    $(".no-cart-view").show();
  } else {
    $(".subtotal").html(cartData.totalPrice);
    if (cartData.wallet_amount) {
      $(".cashback-amt ").html(-cartData.wallet_amount);
    } else {
      $(".cashback-amt ").html(0);
    }

    $(".total-savings").html(-cartData.totalSavings);
    $(".total-mrp").html(cartData.totalPrice);
    $(".subtotal-mrp").html(cartData.SubTotal);
    if (userData.wallet_amount == 0) {
      $(".cashb-row").hide();
    } else {
      $(".cashb-row").show();
    }
    if (userData.wallet_amount == 0) {
      $("#cashback-check").attr("disabled", true);
    }
    $(".wallet-amt").html(userData.wallet_amount);

    $(".shipping-price").html(cartData.totalShippingPrice);
    for (let i = 0; i < cartData.products.length; i++) {
      const element = cartData.products[i];
      // let variantPrice;
      // let variantName;
      // let payPrice;
      // let mrpPrice;
      let deliveryNote = "";

      if (element.shippingPrice == 0) {
        deliveryNote = "";
      } else {
        //deliveryNote = `Delivery Fee &nbsp; : &nbsp; ${element.shippingPrice}`;
      }
      let minusClick = "";
      let plusClick = "";
      let deleteClick = "";
      let cartType = "";

      if (element.cart_type == "sasta") {
        console.log("LLLLLLLLLLLLLLLLLLLLLLLLLL");
        $(".sasta-deal-msg").show();
        $(".sasta-deal-msg").html(
          `Sasta Deal products will be removed from the cart after 30 minutes of inactivity`
        );
        cartType = `<h6 style="margin-bottom:0;color:red;">Sasta Deal</h6>`;
        minusClick = `onclick="sastaAdd('${element.id}',-1,'${element.variantId}','${element.variant.sasta_price}')"`;
        plusClick = `onclick="sastaAdd('${element.id}',1,'${element.variantId}','${element.variant.sasta_price}')"`;
        deleteClick = `onclick="sastaAdd('${element.id}',-${element.quantity},'${element.variantId}','${element.variant.sasta_price}')"`;
      } else {
        cartType = "";
        minusClick = `onclick="itemMinusCart(1,'${element.id}','${element.variantId}','${element.quantity}')"`;
        plusClick = `onclick="itemPlusCart(1,'${element.id}','${element.variantId}')"`;
        deleteClick = `onclick="itemMinusCart(${element.quantity},'${element.id}','${element.variantId}','${element.quantity}')"`;
      }

      let youSaveVar = (element.mrp - element.price).toFixed(2);
      subtotal += element.price;
      savings += element.mrp - element.price;

      if (element.delivery_type == "shop-sasta") {
        element.delivery_type = "shopsasta";
      }
      // <h6 style="margin-bottom:0;">${deliveryNote}</h6>
      $("#cart-row").append(`
            <tr>
            <td class="cart_description cart_product " colspan="3">
            <span>
            <a href="/detail/${element.linker}">
            <img class="img-fluid" src="https://shop-sasta.s3.ap-south-1.amazonaws.com/shopsasta/${element.pictures[0]}.jpg"
                     alt="Shop Sasta"
                     onerror="if (this.src != '/img/no-prod.svg') this.src = '/img/no-prod.svg';"
                     ></a>
                     </span>
                     <span>
               <h5 class="product-name"><a href="/detail/${element.linker}">${element.name} (${element.variant.title})</a></h5>
               <h6 style="margin-bottom:0;">Sold By &nbsp; : &nbsp; ${element.delivery_type}</h6>
               <h6 style="margin-bottom:0;">${deliveryNote}</h6>
               ${cartType}
                </span>
            </td>
            <td class="availability in-stock price-format" colspan="1">${element.mrp}</td>
          
            <td class="qty" colspan="1">
               <div class="input-group cart-actions">
               
               <span class="minus" ${minusClick}>-</span>
                                            <span class="cart-quantity">${element.quantity}</span>
                                            <span class="plus" ${plusClick}>+</span>
             
               </div>
            </td>
            <td class="price" colspan="1">
            <span class="price-format">${element.price}</span>
         
            </td>
            <td class="availability in-stock price-format" colspan="1">${youSaveVar}</td>
            <td colspan="1">    <img src="./img/cart-trash.png" style="height: 18px;cursor: pointer;"  ${deleteClick} /></td>
           
            </tr>
            `);
    }
    $(".total-savings").html(-savings);
    $(".total-mrp").html(subtotal);
    $(".subtotal-mrp").html(subtotal);
    priceFormating();
  }

  $(".cart-del-address").html("");
  for (let index = 0; index < userData.addresses.length; index++) {
    const element = userData.addresses[index];
    if (element.setDefault) {
      $(".cart-del-address").append(
        `<strong style="margin-right:1rem;">Delivery Address :</strong>${element.name} , ${element.city}, ${element.apartmentName} ,${element.streetName}- ${element.pinCode}`
      );
    }
  }
}

function referalCashback() {
  $.ajax(newBaseUrl + "api/referral-cashback", {
    type: "GET",
    dataType: "json", // type of response data
    contentType: "application/json",
    success: function (data, status, xhr) {
      // success callback function
      if (data.status) {
        $(".refer-percent").html(data.data.referral_cashback_percent);
        $(".referal-cb").html(`${data.data.referral_cashback_percent}% &nbsp;`);
      }
    },
    error: function (jqXhr, textStatus, errorMessage) {
      // error callback
    },
  });
}
function getDetails() {
  $.ajax(newBaseUrl + "api/user?t=" + new Date().getTime(), {
    type: "GET",
    headers: {
      "x-auth": localStorage.getItem("userToken"),
    },
    dataType: "json", // type of response data
    contentType: "application/json",
    success: function (data, status, xhr) {
      // success callback function
      localStorage.setItem("userData", JSON.stringify(data));
      if (data.addresses.length == 0) {
        if (window.location.pathname.split("/")[1] == "my-address") {
          document.getElementById("setDefault").checked = true;
          document.getElementById("setDefault").disabled = true;
        }
      }
      for (let i = 0; i < data.addresses.length; i++) {
        const element = data.addresses[i];
        if (element.setDefault) {
          pincodeId = element.pinCode;
          localStorage.setItem("userPin", element.pinCode);
        }
      }
    },
    error: function (jqXhr, textStatus, errorMessage) {
      // error callback
      if (jqXhr.status == 401) {
        localStorage.removeItem("userToken");
        localStorage.removeItem("userData");
        localStorage.removeItem("phonepeResponse");
        location.reload();
      }
    },
  });
}

function sendOtpSubmit() {
  var sendOtpObj = {
    phoneNo: $("#phoneNo").val(),
  };

  $.ajax(`${newBaseUrl}api/user-login/`, {
    type: "POST",
    data: JSON.stringify(sendOtpObj),
    dataType: "json", // type of response data
    contentType: "application/json",
    success: function (response, status, xhr) {
      // success callback function

      if (response["status"]) {
        $(".sendotp-error").hide();
        $("#sendOtpForm").hide();
        $("#verifyForm").show();
      } else {
        $(".sendotp-error").show();
        $(".sendotp-error").html(response["message"]);
      }
    },
    error: function (jqXhr, textStatus, errorMessage) {
      // error callback
      console.log("errror");
    },
  });
}

function verifyOtpSubmit() {
  var verifyOtpObj = {
    phoneNo: $("#phoneNo").val(),
    otp: $("#otp").val(),
  };

  $.ajax(`${newBaseUrl}api/user-verify`, {
    type: "POST",
    data: JSON.stringify(verifyOtpObj),
    dataType: "json", // type of response data
    contentType: "application/json",
    success: function (response, status, xhr) {
      // success callback function

      if (response["status"]) {
        $(".verify-error").hide();
        $("#verifyForm").hide();
        Swal.fire({
          position: "center",
          icon: "success",
          title: response["message"],
          showConfirmButton: false,
          timer: 2000,
        }).then(() => {
          localStorage.setItem("userToken", response["token"]);
          if (response["userState"]) {
            localStorage.setItem("userData", JSON.stringify(response["data"]));
            location.reload();
          } else {
            $("#dontClose").hide();
            $("#registrationForm").show();
            $("#phone").val($("#phoneNo").val());
          }
        });
      } else {
        $(".verify-error").show();
        $(".verify-error").html(response["message"]);
      }
    },
    error: function (jqXhr, textStatus, errorMessage) {
      // error callback
      console.log("errror");
    },
  });
}

function isEmail(email) {
  var regex =
    /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
  return regex.test(email);
}

function isName(id) {
  var regex = /^[a-zA-Z\s ]{2,30}$/;

  if (regex.test(id)) {
    return true;
  } else {
    return false;
  }
}

function isPara(id) {
  if (id == "") {
    return false;
  } else {
    return true;
  }
}

function registrationOtpSubmit() {
  let nameError = false;
  let emailError = false;
  let streetError = false;
  let cityError = false;
  let areaError = false;
  let zipError = false;

  if (!$("#customCheck2").prop("checked")) {
    console.log("not check");
    $(".accept-error").show();
    $(".accept-error").html("Please accept Terms & Conditions.");
  } else {
    console.log("Check");
    $(".accept-error").hide();

    if (!isName($("#name").val())) {
      $(".name-error").show();
      nameError = true;
    } else {
      $(".name-error").hide();
      nameError = false;
    }

    if (!isEmail($("#email").val())) {
      $(".email-error").show();
      emailError = true;
    } else {
      $(".email-error").hide();
      emailError = false;
    }

    if ($("#street").val() == "") {
      $(".street-error").show();
      streetError = true;
    } else {
      $(".street-error").hide();
      streetError = false;
    }

    if ($("#area").val() == "") {
      $(".area-error").show();
      areaError = true;
    } else {
      $(".area-error").hide();
      areaError = false;
    }

    if ($("#city").val() == "") {
      $(".city-error").show();
      cityError = true;
    } else {
      cityError = false;
      $(".city-error").hide();
    }

    if ($("#zip").val() == "") {
      zipError = true;
      $(".zip-error").show();
    } else {
      zipError = false;
      $(".zip-error").hide();
    }
    if (nameError || emailError) {
      console.log("EMAI ERRR");
      return;
    } else {
      var registrationOtpObj = {
        name: $("#name").val(),
        phone: $("#phone").val(),
        email: $("#email").val(),
        addresses: [],
      };
      $("#registrationForm").hide();
      $("#addressForm").show();
      $("#popName").val($("#name").val());
      localStorage.setItem("tempUserData", JSON.stringify(registrationOtpObj));

      console.log(registrationOtpObj);

      $.ajax(`${newBaseUrl}api/user`, {
        type: "POST",
        data: JSON.stringify(registrationOtpObj),
        headers: {
          "x-auth": localStorage.getItem("userToken"),
        },
        dataType: "json", // type of response data
        contentType: "application/json",
        success: function (response, status, xhr) {
          // success callback function

          if (response["status"]) {
            $(".registration-error").hide();
            $("#registrationForm").hide();
            $("#addressForm").show();
            $("#popName").val($("#name").val());
            Swal.fire({
              position: "center",
              icon: "success",
              title: response["message"],
              showConfirmButton: false,
              timer: 3000,
            }).then(() => {});

            setTimeout(() => {
              localStorage.setItem(
                "userData",
                JSON.stringify(response["data"][0])
              );
              // location.reload();
            }, 2500);
          } else {
            $(".registration-error").show();
            $(".registration-error").html(response["message"]);
          }
        },
        error: function (jqXhr, textStatus, errorMessage) {
          // error callback
          console.log("errror");
        },
      });
    }
  }
}

function phonenumber(inputtxt) {
  var phoneno = /^\d{10}$/;
  if (inputtxt.match(phoneno)) {
    return true;
  } else {
    return false;
  }
}

function shopView() {
  window.location.href = "/";
}
function sendSupportMail() {
  let supportPhone = false;
  let supportEmail = false;
  let supportDetails = false;

  if (!phonenumber($("#spNumber").val())) {
    $(".support-phone-error").show();
    supportPhone = true;
  } else {
    $(".support-phone-error").hide();
    supportPhone = false;
  }

  if (!isEmail($("#spEmail").val())) {
    $(".support-email-error").show();
    supportEmail = true;
  } else {
    $(".support-email-error").hide();
    supportEmail = false;
  }

  if (!isName($("#spDetails").val())) {
    $(".spDetails-error").show();
    supportDetails = true;
  } else {
    $(".spDetails-error").hide();
    supportDetails = false;
  }

  if (supportPhone || supportEmail || supportDetails) {
    return;
  } else {
    let tempObj = {
      name: userData.name,
      email: userData.email,
      phone: $("#spNumber").val(),
      que: $("#spDetails").val(),
      title: $("#spTitle").val(),
    };

    $.ajax(`${newBaseUrl}api/support-mail/`, {
      type: "POST",
      data: JSON.stringify(tempObj),
      dataType: "json", // type of response data
      contentType: "application/json",
      success: function (response, status, xhr) {
        // success callback function
        if (response["status"]) {
          Swal.fire({
            position: "center",
            icon: "success",
            title: response["message"],
            showConfirmButton: false,
            timer: 3000,
          }).then(() => {
            location.reload();
          });
        } else {
          Swal.fire({
            position: "center",
            icon: "error",
            title: response["message"],
            showConfirmButton: false,
            timer: 3000,
          });
        }
      },
      error: function (jqXhr, textStatus, errorMessage) {
        // error callback
        console.log("errror");
      },
    });
  }
}

function appendSelectedLoc() {
  for (let i = 0; i < userData.addresses.length; i++) {
    const element = userData.addresses[i];
    if (element.setDefault) {
      $(".loc-txt").html("");
      $(".loc-txt").append(` 
            <span> ${element.areaDetails} </span> &nbsp; -  &nbsp;<span> ${element.pinCode} </span>
                                `);
    }
  }
}

function addToCartPop(id) {
  if (
    localStorage.getItem("userData") == null ||
    localStorage.getItem("userData") == undefined
  ) {
    login();
    return;
  } else {
    $(".modal-addCart").click();
    $(".add-modal-pop").html("");
    $.ajax(
      `${newBaseUrl}product-variat?id=${id}&pincode=${localStorage.getItem(
        "userPin"
      )}`,
      {
        type: "GET",
        success: function (data, status, xhr) {
          // success callback function
          $(".add-modal-pop").append(data);

          $("input:radio[name=product_amount_value]").change(function () {
            $("#addItemBtn").attr("disabled", false);
            $(".total-item-price").html("");
            let price = parseFloat($(this).attr("data-price"));
            varId = $(this).attr("data-variantId");
            prodID = $(this).attr("data-productId");
            quanID = parseInt($(this).attr("data-quantity"));
            let totalPrice = quanID * price;
            price = price.toLocaleString("en-IN", {
              maximumFractionDigits: 2,
              style: "currency",
              currency: "INR",
            });
            totalPrice = totalPrice.toLocaleString("en-IN", {
              maximumFractionDigits: 2,
              style: "currency",
              currency: "INR",
            });

            $(".total-item-price").append(`
               ${quanID} &nbsp; X &nbsp; ${price}&nbsp; =&nbsp; ${totalPrice}
                `);
          });

          $(".price-format-modal").each(function () {
            let num = parseFloat($(this).html());

            num = num.toLocaleString("en-IN", {
              maximumFractionDigits: 2,
              style: "currency",
              currency: "INR",
            });

            $(this).html(num);
          });
        },
        error: function (jqXhr, textStatus, errorMessage) {
          if (jqXhr.status == 401) {
            console.log("401 Err");
          }
        },
      }
    );
  }
}

function popupAddCart() {
  itemAdd(prodID, quanID, varId, pincodeId);
  $(".addCartClose").click();
}

$("#cashback-check").on("click", function (params) {
  if ($("#cashback-check").is(":checked")) {
    walletCheck(true);
    specialEventCall();
  } else {
    walletCheck(false);
  }
});

$("#nextweek-check").on("click", function (params) {
  console.log($("#nextweek-check").is(":checked"));
  if ($("#nextweek-check").is(":checked")) {
    nextweekdelivery = true;
  } else {
    nextweekdelivery = false;
  }
});

function walletCheck(obj) {
  let walletCheck = {
    is_wallet: obj,
    //pincode: pincodeId
  };
  $.ajax(`${newBaseUrl}api/cart/update`, {
    type: "POST",
    data: JSON.stringify(walletCheck),
    headers: {
      "x-auth": localStorage.getItem("userToken"),
    },
    dataType: "json", // type of response data
    contentType: "application/json",
    success: function (response, status, xhr) {
      // success callback function

      if (response["status"]) {
        Swal.fire({
          position: "center",
          icon: "success",
          title: response["message"],
          showConfirmButton: false,
          timer: 3000,
        });
        refresh_cart();
      } else {
        Swal.fire({
          position: "center",
          icon: "error",
          title: response["message"],
          showConfirmButton: false,
          timer: 3000,
        });
      }
    },
    error: function (jqXhr, textStatus, errorMessage) {
      // error callback
      console.log("errror");
    },
  });
}

function couponCheck(obj) {
  let couponObj = {
    coupon: $("#couponValue").val(),
  };
  console.log(couponObj);

  $.ajax(`${newBaseUrl}api/cart/coupon`, {
    type: "POST",
    data: JSON.stringify(couponObj),
    headers: {
      "x-auth": localStorage.getItem("userToken"),
    },
    dataType: "json", // type of response data
    contentType: "application/json",
    success: function (response, status, xhr) {
      // success callback function

      if (response["status"]) {
        Swal.fire({
          position: "center",
          icon: "success",
          title: response["message"],
          showConfirmButton: false,
          timer: 3000,
        });

        response.amount = response.amount.toLocaleString("en-IN", {
          maximumFractionDigits: 2,
          style: "currency",
          currency: "INR",
        });
        $(".coupon-err-msg").html("");
        $(".couponAmount").html("-" + response.amount);
        $(".coupon-name-view").html(
          `<strong> Coupon Applied :  ${cartData.coupon} </strong> <a data-toggle="tooltip" data-placement="top" title="" href="javascript:removeCoupon()" data-original-title="Remove Coupon" class="btn btn-secondary btn-sm " style="padding: 0 3px;margin-left:.5rem;"> <i class="mdi mdi-close"></i></a>`
        );
        refresh_cart();
      } else {
        $(".coupon-name-view").html("");
        $(".coupon-err-msg").html(`${response.message}`);
      }
    },
    error: function (jqXhr, textStatus, errorMessage) {
      // error callback
      console.log("errror");
    },
  });
}

function removeCoupon() {
  let couponObj = {
    coupon: "",
  };

  $.ajax(`${newBaseUrl}api/cart/remove-coupon`, {
    type: "POST",
    data: JSON.stringify(couponObj),
    headers: {
      "x-auth": localStorage.getItem("userToken"),
    },
    dataType: "json", // type of response data
    contentType: "application/json",
    success: function (response, status, xhr) {
      // success callback function
      $(".coupon-name-view").html("");
      refresh_cart();
      if (response["status"]) {
        Swal.fire({
          position: "center",
          icon: "success",
          title: response["message"],
          showConfirmButton: false,
          timer: 3000,
        });

        $(".couponAmount").html(0);
      } else {
        Swal.fire({
          position: "center",
          icon: "error",
          title: response["message"],
          showConfirmButton: false,
          timer: 3000,
        });
        $(".couponAmount").html(0);
      }
    },
    error: function (jqXhr, textStatus, errorMessage) {
      // error callback
      console.log("errror");
    },
  });
}

function popAddressValidation() {
  let popApartErr = false;
  let popNameErr = false;
  let popFlatErr = false;
  let popStreetErr = false;
  let popLandErr = false;
  let popAreaErr = false;
  let popCityErr = false;
  let popPinErr = false;

  if (!isName($("#popName").val())) {
    $(".pop-name-error").show();
    popNameErr = true;
  } else {
    $(".pop-name-error").hide();
    popNameErr = false;
  }

  if (!isPara($("#popApartmentName").val())) {
    $(".pop-aprt-error").show();
    popApartErr = true;
  } else {
    $(".pop-aprt-error").hide();
    popApartErr = false;
  }

  if (!isPara($("#popOfficeNum").val())) {
    $(".pop-flat-error").show();
    popFlatErr = true;
  } else {
    $(".pop-flat-error").hide();
    popFlatErr = false;
  }

  if (!isPara($("#popStreetName").val())) {
    $(".pop-street-error").show();
    popStreetErr = true;
  } else {
    $(".pop-street-error").hide();
    popStreetErr = false;
  }

  if (!isPara($("#popLandmark").val())) {
    $(".pop-land-error").show();
    popLandErr = true;
  } else {
    $(".pop-land-error").hide();
    popLandErr = false;
  }

  if (!isPara($("#popAreaDetails").val())) {
    $(".pop-area-error").show();
    popAreaErr = true;
  } else {
    $(".pop-area-error").hide();
    popAreaErr = false;
  }

  if (!isPara($("#popCity").val())) {
    $(".pop-city-error").show();
    popCityErr = true;
  } else {
    $(".pop-city-error").hide();
    popCityErr = false;
  }

  if (!isPara($("#popPinCode").val())) {
    $(".pop-pin-error").show();
    popPinErr = true;
  } else {
    $(".pop-pin-error").hide();
    popPinErr = false;
  }

  if (
    popNameErr ||
    popFlatErr ||
    popApartErr ||
    popStreetErr ||
    popLandErr ||
    popAreaErr ||
    popCityErr ||
    popPinErr
  ) {
    return true;
  } else {
    return false;
  }
}

function pageAddressValidation() {
  let pageApartErr = false;
  let pageNameErr = false;
  let pageFlatErr = false;
  let pageStreetErr = false;
  let pageLandErr = false;
  let pageAreaErr = false;
  let pageCityErr = false;
  let pagePinErr = false;

  if (!isName($("#pageName").val())) {
    $(".page-name-error").show();
    pageNameErr = true;
  } else {
    $(".page-name-error").hide();
    pageNameErr = false;
  }

  if (!isPara($("#pageApartmentName").val())) {
    $(".page-aprt-error").show();
    pageApartErr = true;
  } else {
    $(".page-aprt-error").hide();
    pageApartErr = false;
  }

  if (!isPara($("#pageOfficeNum").val())) {
    $(".page-flat-error").show();
    pageFlatErr = true;
  } else {
    $(".page-flat-error").hide();
    pageFlatErr = false;
  }

  if (!isPara($("#pageStreetName").val())) {
    $(".page-street-error").show();
    pageStreetErr = true;
  } else {
    $(".page-street-error").hide();
    pageStreetErr = false;
  }

  if (!isPara($("#pageLandmark").val())) {
    $(".page-land-error").show();
    pageLandErr = true;
  } else {
    $(".page-land-error").hide();
    pageLandErr = false;
  }

  if (!isPara($("#pageAreaDetails").val())) {
    $(".page-area-error").show();
    pageAreaErr = true;
  } else {
    $(".page-area-error").hide();
    pageAreaErr = false;
  }

  if (!isPara($("#pageCity").val())) {
    $(".page-city-error").show();
    pageCityErr = true;
  } else {
    $(".page-city-error").hide();
    pageCityErr = false;
  }

  if (!isPara($("#pagePinCode").val())) {
    $(".page-pin-error").show();
    pagePinErr = true;
  } else {
    $(".page-pin-error").hide();
    pagePinErr = false;
  }

  if (
    pageNameErr ||
    pageFlatErr ||
    pageApartErr ||
    pageStreetErr ||
    pageLandErr ||
    pageAreaErr ||
    pageCityErr ||
    pagePinErr
  ) {
    return true;
  } else {
    return false;
  }
}

function addAddress(a) {
  if (a == "pop") {
    if (popAddressValidation()) {
      return;
    } else {
      let userObj = JSON.parse(localStorage.getItem("tempUserData"));
      let tempObj = {};
      tempObj = {
        apartmentName: $("#popApartmentName").val(),
        name: $("#popName").val(),
        officeNum: $("#popOfficeNum").val(),
        streetName: $("#popStreetName").val(),
        landmark: $("#popLandmark").val(),
        areaDetails: $("#popAreaDetails").val(),
        city: $("#popCity").val(),
        pinCode: $("#popPinCode").val(),
        setDefault: $("#setDefaults").prop("checked"),
        addressType: $("input[name=popType]:checked").val(),
      };
      userObj.addresses.push(tempObj);
      if ($("#setDefaults").prop("checked")) {
        console.log("IS DEFAul");
        localStorage.setItem("userPin", $("#popPinCode").val());
        $("#stockPincode").attr("value", $("#popPinCode").val());
      }

      saveUserData(userObj);
    }
  } else {
    if (pageAddressValidation()) {
      return;
    } else {
      let userObj = JSON.parse(localStorage.getItem("userData"));
      let tempObj = {};
      tempObj = {
        apartmentName: $("#pageApartmentName").val(),
        name: $("#pageName").val(),
        officeNum: $("#pageOfficeNum").val(),
        streetName: $("#pageStreetName").val(),
        landmark: $("#pageLandmark").val(),
        areaDetails: $("#pageAreaDetails").val(),
        city: $("#pageCity").val(),
        pinCode: $("#pagePinCode").val(),
        setDefault: $("#setDefault").prop("checked"),
        addressType: $("input[name=pageType]:checked").val(),
      };

      if ($("#setDefault").prop("checked")) {
        console.log("IS DEFAul");
        localStorage.setItem("userPin", $("#pagePinCode").val());
        $("#stockPincode").attr("value", $("#pagePinCode").val());
        for (let i = 0; i < userObj.addresses.length; i++) {
          userObj.addresses[i].setDefault = false;
        }
      }

      userObj.addresses.push(tempObj);
      saveUserData(userObj);
    }
  }
}

function editAddress() {
  if (pageAddressValidation()) {
    return;
  } else {
    let userObj = JSON.parse(localStorage.getItem("userData"));
    let tempObj = {};
    tempObj = {
      apartmentName: $("#pageApartmentName").val(),
      name: $("#pageName").val(),
      officeNum: $("#pageOfficeNum").val(),
      streetName: $("#pageStreetName").val(),
      landmark: $("#pageLandmark").val(),
      areaDetails: $("#pageAreaDetails").val(),
      city: $("#pageCity").val(),
      pinCode: $("#pagePinCode").val(),
      setDefault: $("#setDefault").prop("checked"),
      addressType: $("input[name=pageType]:checked").val(),
    };

    for (let i = 0; i < userObj.addresses.length; i++) {
      userObj.addresses[i].setDefault = false;
    }

    userObj.addresses.splice(
      parseInt($(".edit-btn").attr("data-value")),
      1,
      tempObj
    );
    saveUserData(userObj);
  }
}

function addNewAddBtn() {
  window.location.reload();
}

function editAppendAddress(obj, id) {
  $(".new-address").show();
  $(".address-title").html("Edit Address");
  let tempAddress = {};
  for (let i = 0; i < userData.addresses.length; i++) {
    console.log(tempAddress, obj, userData.addresses[i].pinCode);
    if (id == i) {
      tempAddress = userData.addresses[i];
    }
  }
  console.log(tempAddress);
  $(".edit-btn").show();
  $(".new-btn").hide();
  $(".edit-btn").attr("data-value", id);
  $("#pageApartmentName").val(tempAddress.apartmentName);
  $("#pageName").val(tempAddress.name);
  $("#pageOfficeNum").val(tempAddress.officeNum);
  $("#pageStreetName").val(tempAddress.streetName);
  $("#pageLandmark").val(tempAddress.landmark);
  $("#pageAreaDetails").val(tempAddress.areaDetails);
  $("#pageCity").val(tempAddress.city);
  $(".selectedCityNo").hide();
  $(".selectedCity").show();
  $("#pagePinCode").attr("disabled", true);
  $(".selectedCity span").html(tempAddress.city);
  $("#pagePinCode").val(tempAddress.pinCode);
  $("input[name=pageType][value=" + tempAddress.addressType + "]").attr(
    "checked",
    "checked"
  );
  if (tempAddress.setDefault) {
    $("#setDefault").attr("disabled", "disabled");
  } else {
    $("#setDefault").attr("disabled", false);
  }
  if (userData.addresses.length == 0 || userData.addresses.length == 1) {
    document.getElementById("setDefault").checked = true;
    $("#setDefault").attr("disabled", "disabled");
  } else {
    document.getElementById("setDefault").checked = tempAddress.setDefault;
  }
}

function saveUserData(obj) {
  $.ajax(`${newBaseUrl}api/user`, {
    type: "POST",
    data: JSON.stringify(obj),
    headers: {
      "x-auth": localStorage.getItem("userToken"),
    },
    dataType: "json", // type of response data
    contentType: "application/json",
    success: function (response, status, xhr) {
      // success callback function

      if (response["status"]) {
        $("#addressForm").hide();
        Swal.fire({
          position: "center",
          icon: "success",
          title: response["message"],
          showConfirmButton: false,
          timer: 3000,
        });

        setTimeout(() => {
          localStorage.setItem("userData", JSON.stringify(response["data"][0]));
          document.changePin.submit();
        }, 2500);
      } else {
        Swal.fire({
          position: "center",
          icon: "error",
          title: response["message"],
          showConfirmButton: false,
          timer: 3000,
        });
      }
    },
    error: function (jqXhr, textStatus, errorMessage) {
      // error callback
      console.log("errror");
    },
  });
}

function selectLoc(obj) {
  Swal.fire({
    title: "Are you sure?",
    text: "Your cart will be cleared with address change for product stock availability.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes!",
  }).then((result) => {
    if (result.isConfirmed) {
      for (let i = 0; i < userData.addresses.length; i++) {
        userData.addresses[i].setDefault = false;
      }
      userData.addresses[obj].setDefault = true;
      localStorage.setItem("userPin", userData.addresses[obj].pinCode);
      $("#stockPincode").attr("value", userData.addresses[obj].pinCode);
      localStorage.setItem("userData", JSON.stringify(userData));
      isChangeAddress = true;
      makeCartEmpty();
    }
  });
}

function makeCartEmpty() {
  $.ajax(`${newBaseUrl}api/cart?t=` + new Date().getTime(), {
    type: "DELETE",
    headers: {
      "x-auth": localStorage.getItem("userToken"),
    },
    dataType: "json", // type of response data
    contentType: "application/json",
    success: function (data, status, xhr) {
      // success callback function

      console.log(data);

      if (data.status) {
        saveUserData(userData);
      } else {
        Swal.fire({
          position: "center",
          icon: "error",
          title: data["message"],
          showConfirmButton: false,
          timer: 1500,
        });
      }
    },
    error: function (jqXhr, textStatus, errorMessage) {
      if (jqXhr.status == 401) {
        location.reload();
      }
    },
  });
}

function itemAdd(pId, qId, vId, pin) {
  if (
    localStorage.getItem("userData") == null ||
    localStorage.getItem("userData") == undefined
  ) {
    localStorage.setItem("tobesaved", pId);
    login();
    return;
  } else {
    if (
      localStorage.getItem("userPin") == undefined ||
      localStorage.getItem("userPin") == null
    ) {
      Swal.fire({
        position: "center",
        icon: "warning",
        title: "Please add address",
        showConfirmButton: false,
        timer: 2500,
      }).then(() => {
        window.location.href = "/my-address";
      });
    } else {
      var tempobj = {
        productId: pId.toString(),
        quantity: parseInt(qId),
        variantId: vId,
        pincode: localStorage.getItem("userPin"),
      };
      if (window.location.pathname.split("/")[1] == "cart") {
        tempobj.is_wallet = $("#nextweek-check").is(":checked");
      }
      $.ajax(`${newBaseUrl}api/cart?t=` + new Date().getTime(), {
        type: "POST",
        headers: {
          "x-auth": localStorage.getItem("userToken"),
        },
        data: JSON.stringify(tempobj),
        dataType: "json", // type of response data
        contentType: "application/json",
        success: function (data, status, xhr) {
          // success callback function

          if (data["status"]) {
            Swal.fire({
              position: "center",
              icon: "success",
              title: data["message"],
              showConfirmButton: false,
              timer: 1500,
            }).then(() => {
              // if (payWithBajaj) {
              //     setTimeout(() => {
              //         location.replace("/cart")
              //     }, 1000);

              // }
              // payWithBajaj = false;

              refresh_cart();
            });
          } else {
            Swal.fire({
              position: "center",
              icon: "warning",
              title: data["message"],
              showConfirmButton: false,
              timer: 1500,
            });
          }
        },
        error: function (jqXhr, textStatus, errorMessage) {
          if (jqXhr.status == 401) {
            console.log("401 Err");
            localStorage.removeItem("userToken");
            localStorage.removeItem("userData");
            localStorage.removeItem("phonepeResponse");
            location.reload();
          }
        },
      });
    }
  }
}

function sastaAdd(pId, qId, vId, price) {
  console.log("YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY");
  if (
    localStorage.getItem("userData") == null ||
    localStorage.getItem("userData") == undefined
  ) {
    localStorage.setItem("tobesaved", pId);
    login();
    return;
  } else {
    if (
      localStorage.getItem("userPin") == undefined ||
      localStorage.getItem("userPin") == null
    ) {
      Swal.fire({
        position: "center",
        icon: "warning",
        title: "Please add address",
        showConfirmButton: false,
        timer: 2500,
      }).then(() => {
        window.location.href = "/my-address";
      });
    } else {
      var tempobj = {
        productId: pId.toString(),
        quantity: parseInt(qId),
        variantId: vId,
        cart_type: "sasta",
        price: parseInt(price),
        pincode: localStorage.getItem("userPin"),
      };

      $.ajax(`${newBaseUrl}api/cart?t=` + new Date().getTime(), {
        type: "POST",
        headers: {
          "x-auth": localStorage.getItem("userToken"),
        },
        data: JSON.stringify(tempobj),
        dataType: "json", // type of response data
        contentType: "application/json",
        success: function (data, status, xhr) {
          // success callback function

          if (data["status"]) {
            Swal.fire({
              position: "center",
              icon: "success",
              title: data["message"],
              showConfirmButton: false,
              timer: 1500,
            }).then(() => {
              refresh_cart();
            });
          } else {
            Swal.fire({
              position: "center",
              icon: "warning",
              title: data["message"],
              showConfirmButton: false,
              timer: 1500,
            });
          }
        },
        error: function (jqXhr, textStatus, errorMessage) {
          if (jqXhr.status == 401) {
            console.log("401 Err");
            localStorage.removeItem("userToken");
            localStorage.removeItem("userData");
            localStorage.removeItem("phonepeResponse");
            location.reload();
          }
        },
      });
    }
  }
}
function login() {
  $(".open-login").click();
}

function userLogout() {
  localStorage.removeItem("userToken");
  localStorage.removeItem("userData");
  localStorage.removeItem("userPin");
  Swal.fire({
    position: "center",
    icon: "success",
    title: "Logout Successfully",
    showConfirmButton: false,
    timer: 3000,
  }).then(() => {
    location.reload();
  });
}

function delCartItem(params) {
  cartData.products.splice(params, 1);
  appendCart();
}

function addressAppend() {
  $(".each-address-list").html("");
  for (let i = 0; i < userData.addresses.length; i++) {
    const element = userData.addresses[i];
    let firstElement = "";
    let defaultAddress = "";
    if (i != 0) {
      firstElement = `<i class="mdi mdi-delete-forever delete" onclick="delAddress(${i})" aria-hidden="true"></i>`;
    }
    if (element.setDefault) {
      defaultAddress = `-  &nbsp; &nbsp;<Strong style="border:1px solid #029b97;padding:2px .5rem">Default</Strong>`;
    }
    console.log(element);
    $(".each-address-list").append(`
        <div class="" style="display:flex;align-items:center;">    
      

        <div class="w-90 p-0">
         <div class="card" >
           <label class="radio-inline " style="padding-left: 15px;display:flex;align-items:center;margin-bottom: 0;"> 
            <div class="card-body" style="padding: 10px;">
              <h6>Address  ${i + 1}  ${defaultAddress}</h6> 
              <h6><span> ${element["name"]} <span></h6>
              <h6> <span> ${element["apartmentName"]}, ${
      element["officeNum"]
    }, ${element["streetName"]}, ${element["landmark"]}, ${
      element["areaDetails"]
    }, ${element["city"]}, ${element["pinCode"]}<span></h6>

            </div>
        </label>
        </div>
        </div>
        <div class="w-10 actions-address">
           ${firstElement}
           <i class="mdi mdi-pencil edit" onclick="editAppendAddress(${
             element["pinCode"]
           },${i})" aria-hidden="true"></i>
        </div>  </div>
        <br>
        `);
  }
}

function delAddress(i) {
  Swal.fire({
    title: "Are you sure you want to delete this address",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes, Delete it!",
  }).then((result) => {
    if (result.isConfirmed) {
      userData.addresses.splice(i, 1);
      console.log(userData.addresses);

      saveUserData(userData);
    }
  });
}

function itemPlusCart(qId, pId, vId) {
  console.log(qId, pId, vId);
  // $('.cart-quantity').html(parseInt(qId) + 1);

  itemAdd(pId, parseInt(qId), vId, "500072");
  appendCart();
}

function itemMinusCart(qId, pId, vId, quantId) {
  if (cartData.products.length <= 1) {
    if (quantId <= 1) {
      Swal.fire({
        title: "Your cart will be empty",

        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, remove it!",
      }).then((result) => {
        if (result.isConfirmed) {
          itemAdd(pId, -parseInt(qId), vId, "500072");
          Swal.fire("Removed!", "Your item has been removed.", "success");
          location.replace("/");
        }
      });
    } else {
      console.log("LLLLLLLLLLLLL");
      itemAdd(pId, -parseInt(qId), vId, "500072");
      appendCart();
    }
  } else {
    console.log("LLLLLLLLLLLLL");
    itemAdd(pId, -parseInt(qId), vId, "500072");
    appendCart();
  }
}

$("input:radio[name=cartPaymentType]").change(function () {
  cartPaymentType = $(this).val();
});

function nextWeekdayDate() {
  var d = new Date();
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7) + 3);

  return monthsArray[d.getMonth()] + " " + d.getDate() + " " + d.getFullYear();
}

const getDateAfterWeek = (week) => {
  let today = new Date();
  const nextweek = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 7 * week
  );
  return nextweek.toUTCString();
};

$("input:radio[name=nextweek-check]").change(function () {
  $(".delivery-type-msg").html("");
  if ($(this).val() == "regular") {
    nextweekdelivery = false;
    delivery_date = nextWeekObj.date;
    delivery_hrs = nextWeekObj.delivery_hours;
    $(".delivery-type-msg").append(
      `Your order expected delivery &nbsp;: &nbsp;  ${nextWeekObj.msg} &nbsp; ( ${nextWeekObj.delivery_hours} )`
    );
    let aa = monthsArray.indexOf(nextWeekObj.msg.split(" ")[0]) + 1;
    deliveryDetailsFinal = {
      deliveryBy: "shop-sasta",
      delivery_date:
        nextWeekObj.msg.split(" ")[1] +
        "-" +
        aa +
        "-" +
        nextWeekObj.msg.split(" ")[2],
      delivery_time: nextWeekObj.delivery_hours,
      delivery_charges: shopsasta_delivery_charges,
    };

    for (let k = 0; k < finalDeliveryArray.length; k++) {
      const element = finalDeliveryArray[k];
      if (element.deliveryBy == "shop-sasta") {
        finalDeliveryArray.pop();
      }
    }

    finalDeliveryArray.push(deliveryDetailsFinal);
  } else {
    nextweekdelivery = true;
    // let nxtTime = nextWeekdayDate();
    Date.prototype.getNextWeekDay = function (d) {
      if (d) {
        var next = this;
        next.setDate(this.getDate() - this.getDay() + 7 + d);
        delivery_date = next;
        // console.log("KKKKKKKKKKK", next);
        return (
          monthsArray[next.getMonth()] +
          " " +
          next.getDate() +
          " " +
          next.getFullYear()
        );
      }
    };

    let dayArray = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    var now = new Date();
    let nxtTime;
    delivery_hrs = noRushObj.delivery_hours;
    nxtTime = now.getNextWeekDay(dayArray.indexOf(noRushObj.delivery_day) + 1); //
    $(".delivery-type-msg").append(
      `Your order expected delivery &nbsp;: &nbsp; ${nxtTime}  (${noRushObj.delivery_hours})`
    );
    let bb = monthsArray.indexOf(nxtTime.split(" ")[0]) + 1;
    let monthDel =
      nxtTime.split(" ")[1] + "-" + bb + "-" + nxtTime.split(" ")[2];
    deliveryDetailsFinal = {
      deliveryBy: "shop-sasta",
      delivery_date: monthDel,
      delivery_time: noRushObj.delivery_hours,
      delivery_charges: shopsasta_delivery_charges,
    };
    for (let k = 0; k < finalDeliveryArray.length; k++) {
      const element = finalDeliveryArray[k];
      if (element.deliveryBy == "shop-sasta") {
        finalDeliveryArray.pop();
      }
    }
    finalDeliveryArray.push(deliveryDetailsFinal);
  }

  // console.log("FINAKAKKAKAK", finalDeliveryArray);
});

function gotToPayment() {
  let tempObj = {
    is_checkout: true,
  };

  $.ajax(`${newBaseUrl}api/remove-discounts`, {
    type: "POST",
    data: JSON.stringify(tempObj),
    headers: {
      "x-auth": localStorage.getItem("userToken"),
    },
    dataType: "json", // type of response data
    contentType: "application/json",
    success: function (response, status, xhr) {
      // success callback function
      console.log(response);
      if (response.status) {
        window.location.href = "/cart-preview";
      } else {
        Swal.fire({
          position: "center",
          icon: "error",
          title: "Failed",
          showConfirmButton: false,
          timer: 3000,
        });
      }
    },
    error: function (jqXhr, textStatus, errorMessage) {
      // error callback
      console.log("errror");
    },
  });
}

function getItemsByVendor() {
  $.ajax(`${newBaseUrl}api/cart-group`, {
    type: "GET",

    headers: {
      "x-auth": localStorage.getItem("userToken"),
    },
    dataType: "json", // type of response data
    contentType: "application/json",
    success: function (response, status, xhr) {
      // success callback function
      if (response.data.length) {
        for (let i = 0; i < response.data.length; i++) {
          const element = response.data[i];

          let innerItems = ``;
          for (let j = 0; j < element.items.length; j++) {
            const elems = element.items[j];
            var eachitems = "";
            eachitems = `<ol class="shipping-items">
                        <li>
                           <h6>${elems.name}</h6>
                           <div class="shipping-prices">
                              <span class="p-spliting"><span class="price-format" style="text-decoration: line-through;">${elems.mrp}</span> &nbsp;&nbsp; <span class="price-format">${elems.price}</span> &nbsp;</span>
                              <span class="p-quantity"> - &nbsp; Quantity  &nbsp; :  &nbsp; ${elems.quantity}</span>
                           </div>
                        </li>    
                     </ol>`;
            innerItems = innerItems + eachitems;
          }
          let vednorByName = "";
          let onlyShopsasta = "";
          let vendorBy = "";
          if (element.vendor == "shop-sasta") {
            shopsasta_delivery_charges = element.delivery_charges;
            vednorByName = ` <img style="height:20px" class="ml-2" src="/img/SHOPSASTA.png" alt="logo">`;
            vendorBy = ` <img style="height:20px" class="ml-2" src="/img/SHOPSASTA.png" alt="logo">`;
            onlyShopsasta = ` <div class="delivery-options "></div>
                        <br>
                        <h6 style="font-size: 12px;font-weight: 600;color: #029b97;margin-top: 1.5rem;" class="delivery-type-msg"></h6>
                        `;
            $(".show-only-sasta").show();
          } else {
            vednorByName = element.vendor;
            if (element.vendorDetails.shipping_by == "shop-sasta") {
              vendorBy = ` <img style="height:20px" class="ml-2" src="/img/SHOPSASTA.png" alt="logo">`;
            } else {
              vendorBy = element.vendor;
            }

            if (element.vendorDetails.delivery_details) {
              const skipDate = skipNumOf(
                new Date(),
                parseInt(element.vendorDetails.delivery_details.days_of_skip) +
                  1
              );

              var sundayBool = isSundayBtw(new Date(), skipDate);

              if (sundayBool) {
                if (element.vendorDetails.delivery_details.sunday_delivery) {
                } else {
                  skipDate.setDate(skipDate.getDate() + 1);
                }
              }
              let nextWeekObj2 = {
                date: skipDate,
                msg:
                  monthsArray[skipDate.getMonth()] +
                  " " +
                  skipDate.getDate() +
                  " " +
                  skipDate.getFullYear(),
                delivery_hours:
                  element.vendorDetails.delivery_details.delivery_hours,
              };
              delivery_hrs = nextWeekObj2.delivery_hours;
              delivery_date = nextWeekObj2.date;
              let bb = monthsArray.indexOf(nextWeekObj2.msg.split(" ")[0]) + 1;

              deliveryDetailsFinal2 = {
                deliveryBy: element.vendor,
                delivery_date:
                  nextWeekObj2.msg.split(" ")[1] +
                  "-" +
                  bb +
                  "-" +
                  nextWeekObj2.msg.split(" ")[2],
                delivery_time: nextWeekObj2.delivery_hours,
                delivery_charges: element.delivery_charges,
              };
              finalDeliveryArray.push(deliveryDetailsFinal2);
              console.log("FINAKAKKAKAK", deliveryDetailsFinal2);
              onlyShopsasta = `<h6 style="font-size: 12px;font-weight: 600;color: #029b97;margin-top: .5rem;"
                        >Your order expected delivery &nbsp; : &nbsp; ${nextWeekObj2.msg} ( ${nextWeekObj2.delivery_hours} )</h6>`;
            }
          }

          $(".vendor-shipping").append(`
                        <div class="row" style="border-bottom: 1px solid #efefef;">
                        <div class="col-6">
                            <span class="shipping-info">Sold By &nbsp; ${vednorByName} &nbsp; and Fulfilled By ${vendorBy} </span>
                            ${innerItems}
                            
                        </div>

                            <div class="col-md-6">
                            ${onlyShopsasta}
                            <br/>
                            
                            <p style="color:#000;width: 70%;"> <b>Sub Total:</b> &nbsp; <span class="price-format" style="float:right" >${element.subTotal}</span>  <br/> <b>Delivery Charges:</b> &nbsp;&nbsp;&nbsp; <span class="price-format" style="float:right">${element.delivery_charges} </span> <br/> <b>Total:</b> &nbsp; <span class="price-format" style="float:right"> ${element.total} </span> </p>

                            </div>
                            </div>
                        `);
        }
      } else {
        // Swal.fire({
        //     position: 'center',
        //     icon: 'error',
        //     title: "Failed",
        //     showConfirmButton: false,
        //     timer: 3000
        // })
      }
    },
    error: function (jqXhr, textStatus, errorMessage) {
      // error callback
      console.log("errror");
    },
  });
}

function goToCheckout() {
  let deliveryDetailsObj = {
    delivery_info: finalDeliveryArray,
  };
  console.log(deliveryDetailsObj);

  $.ajax(`${newBaseUrl}api/cart-vendordelivery-update`, {
    type: "POST",
    data: JSON.stringify(deliveryDetailsObj),
    headers: {
      "x-auth": localStorage.getItem("userToken"),
    },
    dataType: "json", // type of response data
    contentType: "application/json",
    success: function (response, status, xhr) {
      // success callback function

      console.log(response);
      if (response.status) {
        window.location.href = "/cart-payment";
      } else {
        Swal.fire({
          position: "center",
          icon: "error",
          title: "Failed",
          showConfirmButton: false,
          timer: 3000,
        });
      }
    },
    error: function (jqXhr, textStatus, errorMessage) {
      // error callback
      console.log("errror");
    },
  });
}
function submitOrder() {
  let finalOrderObj = {};
  for (let i = 0; i < userData.addresses.length; i++) {
    const element = userData.addresses[i];
    if (element.setDefault) {
      finalOrderObj.billingAddress = {
        apartmentName: element.apartmentName,
        name: element.name,
        officeNum: element.officeNum,
        streetName: element.streetName,
        landmark: element.landmark,
        areaDetails: element.areaDetails,
        city: element.city,
        pinCode: element.pinCode,
        addressType: element.addressType,
        setDefault: true,
        istwohrs: false,
      };
    }
  }
  finalOrderObj.delivery_hrs = delivery_hrs;
  finalOrderObj.expected_delivery_date = delivery_date;
  finalOrderObj.email = userData.email;
  finalOrderObj.nextweekdelivery = nextweekdelivery;
  finalOrderObj.payment_type = cartPaymentType;
  console.log(finalOrderObj);
  $(".submit-btn").attr("disabled", true);

  $.ajax(`${newBaseUrl}api/order/create-v2`, {
    type: "POST",
    data: JSON.stringify(finalOrderObj),
    headers: {
      "x-auth": localStorage.getItem("userToken"),
    },
    dataType: "json", // type of response data
    contentType: "application/json",
    success: function (response, status, xhr) {
      // success callback function
      if (response["status"]) {
        if (cartPaymentType == "cod") {
          localStorage.setItem("codObj", JSON.stringify(response["data"]));
          window.location.href = "/cod-payment";
        } else {
          window.location.href = "/order/paytm?txnid=" + response.txnid;
        }
      } else {
        // $('.submit-btn').attr("disabled", false);
        // $('.submit-btn').html("Submit Order");
        // $('.registration-error').show();
        // $('.registration-error').html(response["message"]);
      }
    },
    error: function (jqXhr, textStatus, errorMessage) {
      // error callback
      console.log("errror");
    },
  });
}

var cartVaryArray = [];
function verifyCart() {
  cartVaryArray = [];
  // localStorage.getItem('userPin')
  let tempObj = {
    pincode: localStorage.getItem("userPin"),
  };
  $.ajax(`${newBaseUrl}api/cart-verify`, {
    type: "POST",
    data: JSON.stringify(tempObj),
    headers: {
      "x-auth": localStorage.getItem("userToken"),
    },
    dataType: "json", // type of response data
    contentType: "application/json",
    success: function (response, status, xhr) {
      // success callback function

      for (let i = 0; i < response.length; i++) {
        const element = response[i];
        if (element.statusCode != "INSTOCK") {
          cartVaryArray.push(element);
          $(".modal-verify-cart").click();
        }
      }
      $(".cart-verify-b").html("");
      if (cartVaryArray.length > 0) {
        $(".cart-verify-b").html("");
        for (let i = 0; i < cartVaryArray.length; i++) {
          const element = cartVaryArray[i];
          $(".cart-verify-b").append(`<h5>${element.message}</h5>`);
        }
      } else {
        submitOrder();
      }

      console.log(cartVaryArray);
    },
    error: function (jqXhr, textStatus, errorMessage) {
      // error callback
      console.log("errror");
    },
  });
}

function confirmCart() {
  $.ajax(`${newBaseUrl}api/cart-confirm`, {
    type: "POST",
    data: JSON.stringify(cartVaryArray),
    headers: {
      "x-auth": localStorage.getItem("userToken"),
    },
    dataType: "json", // type of response data
    contentType: "application/json",
    success: function (response, status, xhr) {
      // success callback function
      if (response.status) {
        //return;
        submitOrder();
        // window.location.href = '/cart';
      } else {
        Swal.fire({
          position: "center",
          icon: "error",
          title: "Failed",
          showConfirmButton: false,
          timer: 3000,
        });
      }
    },
    error: function (jqXhr, textStatus, errorMessage) {
      // error callback
      console.log("errror");
    },
  });
}

function cancelOrder(id) {
  $(".cancel-order-btn").attr("disabled", true);
  Swal.fire({
    position: "center",
    icon: "warning",
    title: "Are you sure you want to cancel your order?",
    showConfirmButton: true,
    showCancelButton: true,
    confirmButtonColor: "#3085d6",
    cancelButtonColor: "#d33",
    confirmButtonText: "Yes",
    cancelButtonText: "No",
  }).then((result) => {
    if (result.isConfirmed) {
      let tempObj = {
        id: id,
        phone: userData.phone,
      };
      $.ajax(`${newBaseUrl}api/order-cancel`, {
        type: "POST",
        data: JSON.stringify(tempObj),
        headers: {
          "x-auth": localStorage.getItem("userToken"),
        },
        dataType: "json", // type of response data
        contentType: "application/json",
        success: function (response, status, xhr) {
          // success callback function
          if (response.status) {
            Swal.fire({
              position: "center",
              icon: "success",
              title: response.message,
              showConfirmButton: false,
              timer: 3000,
            }).then(() => {
              window.location.href = "/my-orders";
            });
          } else {
            Swal.fire({
              position: "center",
              icon: "error",
              title: "Failed",
              showConfirmButton: false,
              timer: 3000,
            });
          }
        },
        error: function (jqXhr, textStatus, errorMessage) {
          // error callback
          console.log("errror");
        },
      });
    } else {
      $(".cancel-order-btn").attr("disabled", false);
    }
  });
}

$(".accept-btn").on("click", function (params) {
  if ($("#accept2").is(":checked")) {
    $(".submit-btn").attr("disabled", false);
  } else {
    $(".submit-btn").attr("disabled", true);
  }
});

function getOrders() {
  $.ajax(`${newBaseUrl}api/order/v2`, {
    type: "POST",
    data: JSON.stringify({}),
    headers: {
      "x-auth": localStorage.getItem("userToken"),
    },
    dataType: "json", // type of response data
    contentType: "application/json",
    success: function (response, status, xhr) {
      // success callback function

      for (let i = 0; i < response.items.length; i++) {
        console.log(response.items[i].datecreated.split("T")[0]);
        const element = response.items[i];
        let twodigits = response.items[i].price.toFixed(2);
        if (element.delivery_type == "shop-sasta") {
          element.delivery_type = "shopsasta";
        }
        if (
          element.status == "Delivered" ||
          element.status == "Cancelled" ||
          element.status == "Refunded"
        ) {
          $("#thirdparty-orders").append(`
                        <tr >
                            <td>${element.number}</td>
                            <td>${element.count}</td>
                            <td>${
                              element.datecreated.split("T")[0].split("-")[2]
                            } -
                                ${
                                  element.datecreated
                                    .split("T")[0]
                                    .split("-")[1]
                                } -
                                ${
                                  element.datecreated
                                    .split("T")[0]
                                    .split("-")[0]
                                }</td>
                            <td>${element.delivery_type}</td>
                            <td><span class="badge badge-secondary">${
                              element.status
                            }</span></td>
                            <td class="price-format">${twodigits}</td>
                            <td><a data-toggle="tooltip" data-placement="top" title="" href="/order-detail/${
                              element.id
                            }"
                                data-original-title="View Detail" class="btn btn-info btn-sm"><i
                                    class="mdi mdi-eye"></i></a></td>
                        </tr>
                    `);
        } else {
          $("#active-orders").append(`
                <tr >
                    <td>${element.number}</td>
                    <td>${element.count}</td>
                    <td>${element.datecreated.split("T")[0].split("-")[2]} -
                        ${element.datecreated.split("T")[0].split("-")[1]} -
                        ${element.datecreated.split("T")[0].split("-")[0]}</td>
                    <td>${element.delivery_type}</td>
                    <td><span class="badge badge-danger">${
                      element.status
                    }</span></td>
                    <td class="price-format">${twodigits}</td>
                    <td><a data-toggle="tooltip" data-placement="top" title="" href="/order-detail/${
                      element.id
                    }"
                        data-original-title="View Detail" class="btn btn-info btn-sm"><i
                            class="mdi mdi-eye"></i></a></td>
                  </tr>
                `);
        }
      }
    },
    error: function (jqXhr, textStatus, errorMessage) {
      // error callback
      console.log("errror");
    },
  });
}

function getEarnings(page, limit) {
  $.ajax(newBaseUrl + `api/user-earnings?page=${page}&&limit=${limit}`, {
    type: "GET",
    headers: {
      "x-auth": localStorage.getItem("userToken"),
    },
    dataType: "json", // type of response data
    contentType: "application/json",
    success: function (data, status, xhr) {
      // success callback function

      if (data.status) {
        $("#earnings-list").html("");
        if (data.data.items.length == 0) {
          $(".earnings-found").hide();
          $(".no-earnings").show();
        } else {
          $(".earnings-found").show();
          $(".no-earnings").hide();
        }
        for (let i = 0; i < data.data.items.length; i++) {
          const element = data.data.items[i];
          let desc = `<a href="/order-detail/${
            element.description.split("#")[1]
          }" style="color: #029b97;
                    font-weight: 600;" >${
                      element.description.split("#")[1]
                    }</a>`;
          let amtType = "";
          if (element.type == "Debit") {
            amtType = `<span style="color:red;">-<span class="price-format"> ${element.cashback_amount}</span></span>`;
          } else {
            amtType = `<span style="color:green;">+<span class="price-format"> ${element.cashback_amount}</span></span>`;
          }
          $("#earnings-list").append(`
                        <tr>
                        <td>${amtType}</td>
                        <td>${element.createdon.split("T")[0].split("-")[2]} -
                        ${element.createdon.split("T")[0].split("-")[1]} -
                        ${element.createdon.split("T")[0].split("-")[0]}
                        </td>
                        <td>${element.description.split("#")[0]}${desc}</td>
                     </tr>`);
        }
        // var current_page = 1;
        // var records_per_page = 5;
        // console.log('@{model.limit}',"LIMIT");
        // console.log(records_per_page);
        objJson = {
          length: data.data.items.length,
        }; // Can be obtained from another source, such as your objJson variable
        changePage(page);
        // console.log(objJson);
      } else {
        $(".earnings-found").hide();
        $(".earnings-no").show();
        Swal.fire({
          position: "center",
          icon: "error",
          title: data["message"],
          showConfirmButton: false,
          timer: 3000,
        });
      }
    },
    error: function (jqXhr, textStatus, errorMessage) {
      // error callback
      Swal.fire({
        position: "center",
        icon: "error",
        title: "Please Try again",
        showConfirmButton: false,
        timer: 3000,
      });
    },
  });
}

function prevPage() {
  if (current_page > 1) {
    current_page--;
    changePage(current_page);
    getEarnings(current_page, 10);
  }
}

function nextPage() {
  if (current_page < numPages()) {
    current_page++;
    changePage(current_page);
    getEarnings(current_page, 10);
  }
}

function changePage(page) {
  var btn_next = document.getElementById("btn_next");
  var btn_prev = document.getElementById("btn_prev");
  var listing_table = document.getElementById("listingTable");
  var page_span = document.getElementById("page");

  // Validate page
  if (page < 1) page = 1;
  if (page > numPages()) page = numPages();

  listing_table.innerHTML = "";

  // for (var i = (page - 1) * records_per_page; i < (page * records_per_page); i++) {
  // 	listing_table.innerHTML += objJson[i].adName + "<br>";
  // }
  page_span.innerHTML = page;

  if (page == 1) {
    btn_prev.style.visibility = "hidden";
  } else {
    btn_prev.style.visibility = "visible";
  }
  // $('#btn_next').html('>');
  // $('#btn_prev').html('<');
  // console.log(page, "COMA", numPages(), "KKKKKKK",objJson.length);
  if (page == numPages()) {
    btn_next.style.visibility = "hidden";
  } else {
    btn_next.style.visibility = "visible";
  }
}

function numPages() {
  // console.log(objJson.length, records_per_page);
  return Math.ceil(objJson.length / records_per_page);
}

function getEarningsSummary() {
  $.ajax(newBaseUrl + "api/user-earnings-summary", {
    type: "GET",
    headers: {
      "x-auth": localStorage.getItem("userToken"),
    },

    success: function (data, status, xhr) {
      // success callback function

      if (data.status) {
        $(".your-balance").html(
          `  <img src="/img/earnings32.png" alt=""> Your Balance:   <span class="price-format">${data.data.balance}</span>`
        );
        $(".total-earned").html(
          ` <b>Total Earned : </b> &nbsp; <span class="price-format">${data.data.TotalEarned}</span>`
        );
        $(".total-used").html(
          `<b>Total Used : </b> &nbsp; <span class="price-format">${data.data.totalUsed}</span>`
        );
      } else {
      }
    },
    error: function (jqXhr, textStatus, errorMessage) {
      // error callback
      Swal.fire({
        position: "center",
        icon: "error",
        title: "Please Try again",
        showConfirmButton: false,
        timer: 3000,
      });
    },
  });
}

$("#group-pincode").change(function () {
  getGroups($("#group-pincode").val());
});

function selectedGroup() {
  let pincodes = [];
  for (let i = 0; i < userData.addresses.length; i++) {
    const element = userData.addresses[i];
    pincodes.push(element.pinCode);
    $("#group-pincode").append(
      `   <option value="${element.pinCode}">${element.pinCode}</option>`
    );
  }
  let tempArr = Array.from(new Set(pincodes));
  getGroups(tempArr[0]);
}

function getGroups(pin) {
  let tempArr = [];
  tempArr.push(pin);

  $.ajax(newBaseUrl + "api/user-group", {
    type: "POST",
    headers: {
      "x-auth": localStorage.getItem("userToken"),
    },
    data: JSON.stringify({ pincodes: tempArr }),
    dataType: "json", // type of response data
    contentType: "application/json",
    success: function (data, status, xhr) {
      // success callback function

      if (data.status) {
        $(".groups-found").show();
        $(".groups-no").hide();
        $(".grp-list").html("");

        $(".mygroup-percent")
          .html(`Your community received the total ${data.data[0].cashback_percent}% &nbsp; cashback last week. 
                You can place an order now and receive the cashback on your order between ${data.data[0].minVal}% &nbsp; - &nbsp;${data.data[0].maxVal}%.`);
        return;
        for (let i = 0; i < data.data.length; i++) {
          const element = data.data[i];
          if (i == 0) {
            if (element.pincode == pin) {
              $(".grp-list").append(`
                            <div class="col-md-6">
                            <div class="group-each">
                                <p class="mb-2 text-right pin">PIN Code - ${pin}
                                </p>
                                <p class="mb-2 center">Cashback Amount : <strong>${
                                  element.cashback_amount
                                }</strong>
                                </p>
                                <p class="mb-2 center">Cashback Percent : <strong>${
                                  element.cashback_percent
                                }</strong>
                                </p>
                                <p class="mb-2 center">Date: ${
                                  element.createdon.split("T")[0]
                                }</p>                        
                                
                            </div>
                        </div>`);
            }
          }
        }
      } else {
        $(".mygroup-percent").html(
          `Your community is qualified to get 0%  cashback till now. You can place an order now and save 0% on your order as a cashback.`
        );
        $(".earnings-found").hide();
        $(".earnings-no").show();
        $(".grp-list").html(
          `<p class="center" style="width:100%;font-weight:600;">No User Group found yet</p>`
        );
      }
    },
    error: function (jqXhr, textStatus, errorMessage) {
      // error callback
      Swal.fire({
        position: "center",
        icon: "error",
        title: "Please Try again",
        showConfirmButton: false,
        timer: 3000,
      });
    },
  });
}

function getNorush() {
  $.ajax(newBaseUrl + "api/norush-delivery", {
    type: "GET",
    headers: {
      "x-auth": localStorage.getItem("userToken"),
    },
    success: function (data, status, xhr) {
      // success callback function

      console.log(data);
      if (data.status) {
        $(".no-rush-del").html(`${data.data.cashback_percent}`);
        noRushObj = data.data;
      }
    },
    error: function (jqXhr, textStatus, errorMessage) {
      // error callback
      Swal.fire({
        position: "center",
        icon: "error",
        title: "Please Try again",
        showConfirmButton: false,
        timer: 3000,
      });
    },
  });
}

function getRegularDelivery() {
  $.ajax(newBaseUrl + "api/regular-delivery", {
    type: "GET",
    headers: {
      "x-auth": localStorage.getItem("userToken"),
    },
    success: function (data, status, xhr) {
      // success callback function

      if (data.status) {
        // console.log(data.data.days_of_skip);
        const skipDate = skipNumOf(
          new Date(),
          parseInt(data.data.days_of_skip) + 1
        );

        var sundayBool = isSundayBtw(new Date(), skipDate);

        if (sundayBool) {
          if (data.data.sunday_delivery) {
          } else {
            skipDate.setDate(skipDate.getDate() + 1);
          }
        }
        // console.log("DATAE", skipDate);
        // console.log("Get DAte", skipDate.getDate());
        // console.log("Get Day", skipDate.getMonth());
        nextWeekObj = {
          date: skipDate,
          msg:
            monthsArray[skipDate.getMonth()] +
            " " +
            skipDate.getDate() +
            " " +
            skipDate.getFullYear(),
          delivery_hours: data.data.delivery_hours,
        };
        delivery_hrs = nextWeekObj.delivery_hours;
        delivery_date = nextWeekObj.date;
        $(".delivery-type-msg").append(
          `Your order expected delivery &nbsp; : &nbsp; ${nextWeekObj.msg} &nbsp; ( ${nextWeekObj.delivery_hours} )`
        );
        let aa = monthsArray.indexOf(nextWeekObj.msg.split(" ")[0]) + 1;
        deliveryDetailsFinal = {
          deliveryBy: "shop-sasta",
          delivery_date:
            nextWeekObj.msg.split(" ")[1] +
            "-" +
            aa +
            "-" +
            nextWeekObj.msg.split(" ")[2],
          delivery_time: nextWeekObj.delivery_hours,
          delivery_charges: shopsasta_delivery_charges,
        };
        finalDeliveryArray.push(deliveryDetailsFinal);
      }
    },
    error: function (jqXhr, textStatus, errorMessage) {
      // error callback
      Swal.fire({
        position: "center",
        icon: "error",
        title: "Please Try again",
        showConfirmButton: false,
        timer: 3000,
      });
    },
  });
}

function getDeliveryCharges() {
  $.ajax(newBaseUrl + "api/sasta-delivery", {
    type: "GET",
    headers: {
      "x-auth": localStorage.getItem("userToken"),
    },
    success: function (data, status, xhr) {
      // success callback function

      console.log(data);
      if (data.status) {
        $(".free-delivery").html(
          `*&nbsp;Free delivery with order value ${data.data.min_order_amount} &nbsp; and above.`
        );
      }
    },
    error: function (jqXhr, textStatus, errorMessage) {
      // error callback
      Swal.fire({
        position: "center",
        icon: "error",
        title: "Please Try again",
        showConfirmButton: false,
        timer: 3000,
      });
    },
  });
}

function myFunction() {
  var copyText = document.getElementById("myInput");
  copyText.select();
  copyText.setSelectionRange(0, 99999);
  document.execCommand("copy");

  var tooltip = document.getElementById("myTooltip");
  tooltip.innerHTML = "Copied: " + copyText.value;
}

function outFunc() {
  var tooltip = document.getElementById("myTooltip");
  tooltip.innerHTML = "Copy to clipboard";
}

function referCodeCopy() {
  let appUrl = "https://shopsasta.com";
  let wrapText =
    "Find best deals on Grocery every day on ShopSasta. Get cashback and Save. Share with friends and family and earn. FREE Home Delivery. Install App and use my referral code " +
    userData.referal_code +
    ", " +
    " while signing up. " +
    appUrl;
  $(".refer-code-c").val(wrapText);

  var copyText = document.getElementById("refer-Id");
  copyText.select();
  copyText.setSelectionRange(0, 99999);
  document.execCommand("copy");
  $(".refer-code-c").val(`${userData.referal_code}`);
  $(".copied-txt").html("Copied");
  $(".copied-txt").show();
}

function hideCopied() {
  console.log("REMVE");
  $(".copied-txt").hide();
}
