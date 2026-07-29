/*
  씬느샵 공통 설정
  아래 3개 주소만 실제 주소로 바꾸세요.
*/
const CONFIG = {
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxFSUhaajQqECFLTyEkYBhIr0qgAeggKPb6tVRWEvHykAVEtXqdWX43K9-PUzW7ij0j/exec",
  BAND_URL: "https://www.band.us/band/102398891/post",
  CHANNEL_URL: "https://pf.kakao.com/_YVncn"
};

const CUSTOMER_STORAGE_KEY = "ssinne_customer_info_v2";


function initNoticeGate() {
  const checkbox =
    document.getElementById("noticeConfirmCheckbox");

  const startButton =
    document.getElementById("noticeStartButton");

  const noticeGate =
    document.getElementById("noticeGate");

  const orderContent =
    document.getElementById("orderContent");

  if (
    !checkbox ||
    !startButton ||
    !noticeGate ||
    !orderContent
  ) {
    return;
  }

  function updateButtonState() {
    startButton.disabled = !checkbox.checked;

    startButton.classList.toggle(
      "enabled",
      checkbox.checked
    );
  }

  checkbox.addEventListener(
    "change",
    updateButtonState
  );

  checkbox.addEventListener(
    "click",
    updateButtonState
  );

  startButton.addEventListener(
    "click",
    function() {
      if (!checkbox.checked) {
        alert("필독 내용을 확인한 뒤 체크해주세요.");
        return;
      }

      noticeGate.style.display = "none";

      orderContent.classList.remove(
        "order-content-hidden"
      );

      orderContent.classList.add(
        "order-content-visible"
      );

      orderContent.style.display = "block";

      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    }
  );

  updateButtonState();
}


document.addEventListener("DOMContentLoaded", function () {
  const page = document.body.dataset.page;

  if (page === "order") initNoticeGate();

  if (page === "order") initOrderPage();
  if (page === "admin") initAdminPage();
  if (page === "customer") initCustomerPage();
});

function validScriptUrl() {
  return CONFIG.SCRIPT_URL.startsWith("https://script.google.com/macros/s/") &&
         CONFIG.SCRIPT_URL.endsWith("/exec");
}

async function apiGet(params) {
  if (!validScriptUrl()) {
    throw new Error("script.js의 CONFIG.SCRIPT_URL에 Apps Script /exec 주소를 넣어주세요.");
  }

  const query = new URLSearchParams(params);
  query.set("_t", String(Date.now()));

  let response;

  try {
    response = await fetch(
      CONFIG.SCRIPT_URL + "?" + query.toString(),
      {
        method: "GET",
        cache: "no-store",
        redirect: "follow"
      }
    );
  } catch (error) {
    throw new Error(
      "주문 서버에 연결하지 못했습니다. " +
      "script.js의 SCRIPT_URL, Apps Script 새 버전 배포, " +
      "웹 앱 접근 권한(모든 사용자)을 확인해주세요."
    );
  }

  if (!response.ok) {
    throw new Error(
      "주문 서버 응답 오류(" + response.status + "). " +
      "Apps Script 배포 설정과 /exec 주소를 확인해주세요."
    );
  }

  const data = await response.json();

  if (data.success === false) {
    throw new Error(data.message || "요청 처리 중 오류가 발생했습니다.");
  }

  return data;
}

async function apiPost(payload) {
  if (!validScriptUrl()) {
    throw new Error("script.js의 CONFIG.SCRIPT_URL에 Apps Script /exec 주소를 넣어주세요.");
  }

  let response;

  try {
    response = await fetch(CONFIG.SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(payload),
      redirect: "follow"
    });
  } catch (error) {
    throw new Error(
      "주문 서버에 연결하지 못했습니다. " +
      "script.js의 SCRIPT_URL, Apps Script 새 버전 배포, " +
      "웹 앱 접근 권한(모든 사용자)을 확인해주세요."
    );
  }

  if (!response.ok) {
    throw new Error(
      "주문 서버 응답 오류(" + response.status + "). " +
      "Apps Script 배포 설정과 /exec 주소를 확인해주세요."
    );
  }

  const data = await response.json();

  if (data.success === false) {
    throw new Error(data.message || "요청 처리 중 오류가 발생했습니다.");
  }

  return data;
}

function showLoading(text) {
  const overlay = document.getElementById("loadingOverlay");
  const label = document.getElementById("loadingText");

  if (label) label.textContent = text || "처리 중입니다.";
  if (overlay) overlay.classList.add("show");
}

function hideLoading() {
  const overlay = document.getElementById("loadingOverlay");
  if (overlay) overlay.classList.remove("show");
}

function escapeHtml(value) {
  return String(value == null ? "" : value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value) {
  return Number(String(value || "0").replace(/[^0-9.-]/g, "") || 0)
    .toLocaleString("ko-KR") + "원";
}

function todayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

/* =========================
   고객 주문서
========================= */
let orderProducts=[];let orderCart=[];let selectedOrderProduct=null;let orderSubmitting=false;
async function initOrderPage(){document.getElementById("bandLink").href=CONFIG.BAND_URL;document.getElementById("channelLink").href=CONFIG.CHANNEL_URL;document.getElementById("phone").addEventListener("input",formatPhoneInput);document.getElementById("addressSearchButton").addEventListener("click",openAddressSearch);document.getElementById("singleProductNo").addEventListener("input",function(e){e.target.value=e.target.value.replace(/[^0-9]/g,"");resetSingleProductSelection()});document.getElementById("singleProductNo").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();searchSingleProduct()}});document.getElementById("singleProductSearchButton").addEventListener("click",searchSingleProduct);document.getElementById("singleProductColor").addEventListener("change",updateSingleSizes);document.getElementById("singleMinusButton").addEventListener("click",function(){changeSingleQuantity(-1)});document.getElementById("singlePlusButton").addEventListener("click",function(){changeSingleQuantity(1)});document.getElementById("addToCartButton").addEventListener("click",addSelectedProductToCart);document.getElementById("focusProductButton").addEventListener("click",function(){document.getElementById("singleProductNo").focus();window.scrollTo({top:0,behavior:"smooth"})});document.getElementById("clearCustomerButton").addEventListener("click",clearSavedCustomer);document.getElementById("finishOrderButton").addEventListener("click",finishOrder);document.getElementById("orderForm").addEventListener("submit",submitOrder);loadSavedCustomer();renderOrderCart();try{await loadOrderProducts(false)}catch(e){alert(e.message)}}
async function loadOrderProducts(show){const d=await apiGet({action:"products"});orderProducts=Array.isArray(d.products)?d.products:[];if(!orderProducts.length)throw new Error("상품정보 시트에 등록된 상품이 없습니다.");if(show)alert("상품정보를 새로 불러왔습니다.")}
function resetSingleProductSelection(){selectedOrderProduct=null;singleProductName.value="";singleProductColor.innerHTML='<option value="">칼라를 선택하세요</option>';singleProductSize.innerHTML='<option value="">사이즈를 선택하세요</option>';singleProductColor.disabled=true;singleProductSize.disabled=true;singleProductMessage.className="product-message";singleProductMessage.textContent="상품번호 입력 후 검색을 눌러주세요."}
function searchSingleProduct(){const no=singleProductNo.value.trim();if(!no){singleProductMessage.className="product-message error";singleProductMessage.textContent="상품번호를 입력해주세요.";return}const p=orderProducts.find(x=>String(x.productNo)===no);if(!p){resetSingleProductSelection();singleProductMessage.className="product-message error";singleProductMessage.textContent="등록되지 않은 상품번호입니다.";return}selectedOrderProduct=p;singleProductName.value=p.productName||"";singleProductColor.innerHTML='<option value="">칼라를 선택하세요</option>';Object.keys(p.colors||{}).forEach(c=>{const o=document.createElement("option");o.value=c;o.textContent=c;singleProductColor.appendChild(o)});singleProductColor.disabled=false;singleProductMessage.className="product-message success";singleProductMessage.textContent="상품이 확인되었습니다."}
function updateSingleSizes(){const c=singleProductColor.value;singleProductSize.innerHTML='<option value="">사이즈를 선택하세요</option>';if(!selectedOrderProduct||!c||!selectedOrderProduct.colors[c]){singleProductSize.disabled=true;return}selectedOrderProduct.colors[c].forEach(s=>{const o=document.createElement("option");o.value=s;o.textContent=s;singleProductSize.appendChild(o)});singleProductSize.disabled=false}
function changeSingleQuantity(n){singleProductQuantity.value=Math.min(99,Math.max(1,Number(singleProductQuantity.value||1)+n))}
function addSelectedProductToCart(){const no=singleProductNo.value.trim(),c=singleProductColor.value,s=singleProductSize.value,q=Math.min(99,Math.max(1,Number(singleProductQuantity.value||1)));if(!selectedOrderProduct||String(selectedOrderProduct.productNo)!==no){alert("상품번호를 검색해주세요.");return}if(!c){alert("칼라를 선택해주세요.");return}if(!s){alert("사이즈를 선택해주세요.");return}orderCart.push({productNo:no,productName:selectedOrderProduct.productName||"",color:c,size:s,quantity:q,price:Number(selectedOrderProduct.price||0)});renderOrderCart();singleProductNo.value="";singleProductQuantity.value="1";resetSingleProductSelection();singleProductNo.focus()}
function removeCartItem(i){orderCart.splice(i,1);renderOrderCart()}
function renderOrderCart(){if(!orderCart.length){cartList.innerHTML='<div class="cart-empty">담긴 상품이 없습니다.</div>';purchaseSummary.textContent="상품을 담으면 구매내역이 자동으로 표시됩니다."}else{cartList.innerHTML=orderCart.map((x,i)=>`<div class="cart-item"><div class="cart-number">${i+1}</div><div class="cart-info"><strong>${escapeHtml(x.productNo)}번 ${escapeHtml(x.productName)}</strong><span>${escapeHtml(x.color)} / ${escapeHtml(x.size)} / ${x.quantity}개</span></div><div class="cart-side"><span class="cart-price">${money(x.price*x.quantity)}</span><button type="button" class="cart-delete" data-index="${i}">🗑 삭제</button></div></div>`).join("");cartList.querySelectorAll(".cart-delete").forEach(b=>b.addEventListener("click",()=>removeCartItem(Number(b.dataset.index))));purchaseSummary.textContent=orderCart.map(x=>`${x.productNo}번 ${x.productName} / ${x.color} / ${x.size} / ${x.quantity}개 / ${money(x.price*x.quantity)}`).join("\n")}const count=orderCart.reduce((a,x)=>a+x.quantity,0),total=orderCart.reduce((a,x)=>a+x.price*x.quantity,0);totalItemCount.textContent=count+"개";grandTotal.textContent=money(total);displayPaymentAmount.value=money(total)}
async function submitOrder(e){e.preventDefault();if(orderSubmitting)return;try{if(!orderCart.length)throw new Error("주문 상품을 한 개 이상 담아주세요.");const data={action:"saveOrder",nickname:nickname.value.trim(),receiverName:receiverName.value.trim(),phone:phone.value.trim(),zipcode:zipcode.value.trim(),address:address.value.trim(),detailAddress:detailAddress.value.trim(),shippingMemo:shippingMemo.value.trim(),paymentMethod:paymentMethod.value,products:orderCart.map(x=>({productNo:x.productNo,color:x.color,size:x.size,quantity:x.quantity}))};if(!data.nickname||!data.receiverName)throw new Error("닉네임과 수령인 성함을 입력해주세요.");if(data.phone.replace(/[^0-9]/g,"").length<10)throw new Error("연락처를 정확하게 입력해주세요.");if(!data.zipcode||!data.address||!data.detailAddress)throw new Error("주소와 상세주소를 입력해주세요.");orderSubmitting=true;showLoading("주문서를 저장하고 있습니다.");submitButton.disabled=true;const r=await apiPost(data);saveCustomerInfo();orderForm.style.display="none";completePaymentAmount.textContent=money(r.paymentAmount||0);completeScreen.classList.add("show");window.scrollTo({top:0,behavior:"smooth"})}catch(err){alert(err.message)}finally{orderSubmitting=false;hideLoading();submitButton.disabled=false}}
function saveCustomerInfo(){localStorage.setItem(CUSTOMER_STORAGE_KEY,JSON.stringify({nickname:nickname.value.trim(),receiverName:receiverName.value.trim(),phone:phone.value.trim(),zipcode:zipcode.value.trim(),address:address.value.trim(),detailAddress:detailAddress.value.trim(),shippingMemo:shippingMemo.value.trim()}))}
function loadSavedCustomer(){try{const raw=localStorage.getItem(CUSTOMER_STORAGE_KEY);if(!raw)return;const info=JSON.parse(raw);Object.keys(info).forEach(k=>{const e=document.getElementById(k);if(e)e.value=info[k]||""});if(info.nickname||info.phone)savedNotice.classList.add("show")}catch(e){console.error(e)}}
function clearSavedCustomer(){if(!confirm("저장된 고객정보를 지울까요?"))return;localStorage.removeItem(CUSTOMER_STORAGE_KEY);["nickname","receiverName","phone","zipcode","address","detailAddress","shippingMemo"].forEach(id=>document.getElementById(id).value="");savedNotice.classList.remove("show")}
function finishOrder(){completeScreen.classList.remove("show");orderForm.style.display="grid";orderCart=[];renderOrderCart();loadSavedCustomer();window.scrollTo({top:0,behavior:"smooth"})}
function formatPhoneInput(e){let n=e.target.value.replace(/[^0-9]/g,"").slice(0,11);e.target.value=n.length<=3?n:n.length<=7?n.slice(0,3)+"-"+n.slice(3):n.slice(0,3)+"-"+n.slice(3,7)+"-"+n.slice(7)}
function openAddressSearch(){if(!window.daum||!window.daum.Postcode){alert("주소검색 프로그램을 불러오지 못했습니다.");return}new window.daum.Postcode({oncomplete:d=>{zipcode.value=d.zonecode||"";address.value=d.userSelectedType==="R"?(d.roadAddress||""):(d.jibunAddress||"");detailAddress.value="";detailAddress.focus()}}).open()}

/* =========================
   관리자
========================= */
let adminOrders = [];
let adminProducts = [];
let adminOrderSource = "current";
let adminHasSearched = false;

function initAdminPage() {
  document.querySelectorAll(".side-link[data-tab]").forEach(function(button) {
    button.addEventListener("click", function() {
      showAdminTab(button.dataset.tab);
    });
  });

  document.getElementById("searchOrdersButton")
    .addEventListener("click", searchAdminOrders);

  document.getElementById("todayOrdersButton")
    .addEventListener("click", function() {
      const today = todayString();
      document.getElementById("startDate").value = today;
      document.getElementById("endDate").value = today;
      document.getElementById("orderKeyword").value = "";
      searchAdminOrders();
    });

  document.getElementById("allOrdersButton")
    .addEventListener("click", function() {
      document.getElementById("startDate").value = "";
      document.getElementById("endDate").value = "";
      document.getElementById("orderKeyword").value = "";
      searchAdminOrders();
    });

  document.getElementById("rebuildButton")
    .addEventListener("click", rebuildDerivedSheets);

  document.getElementById("currentOrdersSourceButton")
    .addEventListener("click", function() {
      setAdminOrderSource("current");
    });

  document.getElementById("historyOrdersSourceButton")
    .addEventListener("click", function() {
      setAdminOrderSource("history");
    });

  document.getElementById("summaryPaymentCard")
    .addEventListener("click", showAmountOnlyView);

  document.getElementById("backToOrderListButton")
    .addEventListener("click", showOrderListView);

  document.getElementById("adminProductNo")
    .addEventListener("input", function(event) {
      event.target.value =
        event.target.value.replace(/[^0-9]/g, "");
    });

  document.getElementById("saveProductButton")
    .addEventListener("click", saveAdminProduct);

  document.getElementById("resetProductButton")
    .addEventListener("click", resetAdminProductForm);

  document.getElementById("reloadProductsButton")
    .addEventListener("click", loadAdminProducts);

  document.getElementById("productKeyword")
    .addEventListener("input", renderAdminProducts);

  resetAdminOrderDisplay();
}

function showAdminTab(tabName) {
  document.querySelectorAll(".side-link[data-tab]")
    .forEach(function(button) {
      button.classList.toggle(
        "active",
        button.dataset.tab === tabName
      );
    });

  document.getElementById("ordersTab")
    .classList.toggle("active", tabName === "orders");

  document.getElementById("productsTab")
    .classList.toggle("active", tabName === "products");

  if (tabName === "products") {
    loadAdminProducts();
  }
}

function setAdminOrderSource(source) {
  adminOrderSource = source;

  document.getElementById("currentOrdersSourceButton")
    .classList.toggle("active", source === "current");

  document.getElementById("historyOrdersSourceButton")
    .classList.toggle("active", source === "history");

  document.getElementById("startDate").value = "";
  document.getElementById("endDate").value = "";
  document.getElementById("orderKeyword").value = "";

  resetAdminOrderDisplay();
}

async 

function resetAdminOrderDisplay() {
  adminOrders = [];
  adminHasSearched = false;

  document.getElementById("summaryOrderCount")
    .textContent = "0";

  document.getElementById("summaryPaidCount")
    .textContent = "0";

  document.getElementById("summaryPaymentTotal")
    .textContent = "0원";

  document.getElementById("amountOnlyValue")
    .textContent = "0원";

  document.getElementById("amountOnlyPanel")
    .classList.remove("show");

  document.getElementById("orderListPanel")
    .style.display = "block";

  document.getElementById("adminOrderList")
    .innerHTML =
      '<tr><td colspan="14" class="empty-cell">' +
      '날짜 또는 검색 조건을 선택한 뒤 조회하기를 눌러주세요.' +
      '</td></tr>';
}

async function showAmountOnlyView() {
  const startDate =
    document.getElementById("startDate").value;

  const endDate =
    document.getElementById("endDate").value;

  const keyword =
    document.getElementById("orderKeyword")
      .value.trim();

  if (!startDate || !endDate) {
    alert("조회할 시작일과 종료일을 선택해주세요.");
    return;
  }

  if (startDate > endDate) {
    alert("시작일이 종료일보다 늦을 수 없습니다.");
    return;
  }

  const params = {
    action:
      adminOrderSource === "history"
        ? "adminHistoryOrders"
        : "adminOrders",
    startDate: startDate,
    endDate: endDate,
    search: keyword
  };

  showLoading("선택한 날짜의 주문금액을 계산하는 중입니다.");

  try {
    const data = await apiGet(params);

    adminOrders =
      Array.isArray(data.orders)
        ? data.orders
        : [];

    adminHasSearched = true;

    const total = adminOrders.reduce(
      function(sum, order) {
        return sum +
          Number(order.paymentAmount || 0);
      },
      0
    );

    const paidOrders = adminOrders.filter(
      function(order) {
        return (
          order.paymentStatus === "입금완료" ||
          order.paymentStatus === "카드결제"
        );
      }
    );

    const paidTotal = paidOrders.reduce(
      function(sum, order) {
        return sum +
          Number(order.paymentAmount || 0);
      },
      0
    );

    document.getElementById("summaryOrderCount")
      .textContent = adminOrders.length;

    document.getElementById("summaryPaidCount")
      .textContent = paidOrders.length;

    document.getElementById("summaryPaymentTotal")
      .textContent = money(total);

    document.getElementById("amountOnlyValue")
      .innerHTML =
        '<span class="amount-period">' +
        escapeHtml(startDate) +
        ' ~ ' +
        escapeHtml(endDate) +
        '</span>' +
        '<strong class="amount-grand-total">' +
        money(total) +
        '</strong>' +
        '<div class="amount-breakdown">' +
          '<div><span>총 주문건수</span><b>' +
          adminOrders.length +
          '건</b></div>' +
          '<div><span>입금완료·카드결제 금액</span><b>' +
          money(paidTotal) +
          '</b></div>' +
        '</div>';

    document.getElementById("orderListPanel")
      .style.display = "none";

    document.getElementById("amountOnlyPanel")
      .classList.add("show");

    document.getElementById("amountOnlyPanel")
      .scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

  } catch (error) {
    alert(error.message);

  } finally {
    hideLoading();
  }
}

function showOrderListView() {
  document.getElementById("amountOnlyPanel").classList.remove("show");
  document.getElementById("orderListPanel").style.display = "block";

  document.getElementById("orderListPanel").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

async function searchAdminOrders() {
  const startDate =
    document.getElementById("startDate").value;

  const endDate =
    document.getElementById("endDate").value;

  const keyword =
    document.getElementById("orderKeyword")
      .value.trim();

  if (
    startDate &&
    endDate &&
    startDate > endDate
  ) {
    alert("시작일이 종료일보다 늦을 수 없습니다.");
    return;
  }

  const params = {
    action:
      adminOrderSource === "history"
        ? "adminHistoryOrders"
        : "adminOrders",
    startDate: startDate,
    endDate: endDate,
    search: keyword
  };

  showLoading("주문을 조회하는 중입니다.");

  try {
    const data = await apiGet(params);

    adminOrders =
      Array.isArray(data.orders)
        ? data.orders
        : [];

    adminHasSearched = true;

    renderAdminOrders();
    showOrderListView();

  } catch (error) {
    alert(error.message);

  } finally {
    hideLoading();
  }
}

function loadTodayAdminOrders() {
  const today = todayString();
  document.getElementById("startDate").value = today;
  document.getElementById("endDate").value = today;
  document.getElementById("orderKeyword").value = "";
  searchAdminOrders();
}

function loadAllAdminOrders() {
  document.getElementById("startDate").value = "";
  document.getElementById("endDate").value = "";
  document.getElementById("orderKeyword").value = "";
  searchAdminOrders();
}

function renderAdminOrders() {
  const tbody = document.getElementById("adminOrderList");

  if (!adminHasSearched) {
    resetAdminOrderDisplay();
    return;
  }

  document.getElementById("summaryOrderCount").textContent = adminOrders.length;
  document.getElementById("summaryPaidCount").textContent =
    adminOrders.filter(function (order) {
      return order.paymentStatus === "입금완료" ||
             order.paymentStatus === "카드결제";
    }).length;

  const total = adminOrders.reduce(function (sum, order) {
    return sum + Number(order.paymentAmount || 0);
  }, 0);

  document.getElementById("summaryPaymentTotal").textContent = money(total);

  if (!adminOrders.length) {
    tbody.innerHTML = '<tr><td colspan="12" class="empty-cell">조회된 주문이 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = adminOrders.map(function (order) {
    const isHistory = adminOrderSource === "history";
    const trackingNumber = order.trackingNumber || "";
    const courier = order.courier || (isHistory ? "CJ대한통운" : "");

    return `
      <tr>
        <td data-label="주문일">
          ${escapeHtml(order.orderDate || (isHistory ? "보관 주문" : ""))}
          <div class="order-source-label">${isHistory ? "전체이력" : "오늘주문"}</div>
        </td>
        <td data-label="입금금액">${money(order.paymentAmount)}</td>
        <td data-label="입금상태">
          <select class="status-select" data-row="${order.rowNumber}"
                  data-source="${isHistory ? "history" : "current"}">
            <option value="미입금" ${order.paymentStatus === "미입금" ? "selected" : ""}>미입금</option>
            <option value="입금완료" ${order.paymentStatus === "입금완료" ? "selected" : ""}>입금완료</option>
            <option value="카드결제" ${order.paymentStatus === "카드결제" ? "selected" : ""}>카드결제</option>
          </select>
        </td>
        <td data-label="입금내역">${escapeHtml(order.paymentMemo)}</td>
        <td data-label="닉네임">${escapeHtml(order.nickname)}</td>
        <td data-label="수령인">${escapeHtml(order.receiverName)}</td>
        <td data-label="주소">${escapeHtml(order.address)}</td>
        <td data-label="연락처">${escapeHtml(order.phone)}</td>
        <td data-label="배송메모">${escapeHtml(order.shippingMemo)}</td>
        <td data-label="우편번호">${escapeHtml(order.zipcode)}</td>
        <td data-label="구매내역" class="preline">${escapeHtml(order.orderItems)}</td>
        <td data-label="내품수량">${escapeHtml(order.itemQuantity)}</td>
        <td data-label="택배사">
          ${isHistory ? `
            <span class="shipping-badge">${escapeHtml(courier || "CJ대한통운")}</span>
          ` : "-"}
        </td>
        <td data-label="송장번호" class="tracking-cell">
          ${isHistory ? `
            <input class="tracking-input" type="text"
                   data-row="${order.rowNumber}"
                   value="${escapeHtml(trackingNumber)}"
                   placeholder="송장번호 입력">
            ${trackingNumber ? `
              <a class="delivery-button" target="_blank" rel="noopener"
                 href="https://trace.cjlogistics.com/next/tracking.html?wblNo=${encodeURIComponent(String(trackingNumber).replace(/[^0-9]/g, ""))}">
                배송조회
              </a>
            ` : ""}
          ` : "-"}
        </td>
      </tr>
    `;
  }).join("");

  tbody.querySelectorAll(".status-select").forEach(function (select) {
    select.addEventListener("change", function () {
      updateAdminPaymentStatus(
        Number(select.dataset.row),
        select.value,
        select.dataset.source
      );
    });
  });

  tbody.querySelectorAll(".tracking-input").forEach(function (input) {
    input.addEventListener("change", function () {
      updateHistoryTrackingNumber(
        Number(input.dataset.row),
        input.value.trim()
      );
    });
  });
}

async function updateAdminPaymentStatus(rowNumber, paymentStatus, source) {
  showLoading("입금상태를 변경하는 중입니다.");

  try {
    await apiPost({
      action: source === "history"
        ? "updateHistoryPaymentStatus"
        : "updatePaymentStatus",
      rowNumber: rowNumber,
      paymentStatus: paymentStatus
    });

    await searchAdminOrders();
  } catch (error) {
    alert(error.message);
  } finally {
    hideLoading();
  }
}

async function updateHistoryTrackingNumber(rowNumber, trackingNumber) {
  showLoading("송장번호를 저장하는 중입니다.");

  try {
    await apiPost({
      action: "updateHistoryTracking",
      rowNumber: rowNumber,
      courier: "CJ대한통운",
      trackingNumber: trackingNumber
    });

    await searchAdminOrders();
  } catch (error) {
    alert(error.message);
  } finally {
    hideLoading();
  }
}

async function rebuildDerivedSheets() {
  showLoading("거래처발주와 3PL출고를 다시 만드는 중입니다.");

  try {
    await apiPost({ action: "rebuildAll" });
    alert("거래처발주와 3PL출고가 최신 정보로 다시 만들어졌습니다.");
  } catch (error) {
    alert(error.message);
  } finally {
    hideLoading();
  }
}

async function loadAdminProducts() {
  showLoading("상품정보 시트와 동기화하는 중입니다.");

  try {
    const data = await apiGet({
      action: "adminProducts"
    });

    adminProducts =
      Array.isArray(data.products)
        ? data.products
        : [];

    renderAdminProducts();

  } catch (error) {
    alert(error.message);

  } finally {
    hideLoading();
  }
}

function renderAdminProducts() {
  const tbody = document.getElementById("adminProductList");
  const keyword = document.getElementById("productKeyword").value.trim().toLowerCase();

  const filtered = adminProducts.filter(function (product) {
    return [
      product.productNo,
      product.productName,
      product.color,
      product.size
    ].join(" ").toLowerCase().includes(keyword);
  });

  if (!filtered.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">표시할 상품정보가 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(function (product) {
    return `
      <tr>
        <td data-label="상품번호">${escapeHtml(product.productNo)}</td>
        <td data-label="상품명">${escapeHtml(product.productName)}</td>
        <td data-label="칼라">${escapeHtml(product.color)}</td>
        <td data-label="사이즈">${escapeHtml(product.size)}</td>
        <td data-label="판매가">${money(product.salePrice)}</td>
        <td data-label="입금가">${money(product.depositPrice)}</td>
        <td data-label="관리">
          <button type="button" class="button dark small edit-product"
                  data-row="${product.rowNumber}">수정</button>
          <button type="button" class="button danger small delete-product"
                  data-row="${product.rowNumber}">삭제</button>
        </td>
      </tr>
    `;
  }).join("");

  tbody.querySelectorAll(".edit-product").forEach(function (button) {
    button.addEventListener("click", function () {
      editAdminProduct(Number(button.dataset.row));
    });
  });

  tbody.querySelectorAll(".delete-product").forEach(function (button) {
    button.addEventListener("click", function () {
      deleteAdminProduct(Number(button.dataset.row));
    });
  });
}

function editAdminProduct(rowNumber) {
  const product = adminProducts.find(function (item) {
    return Number(item.rowNumber) === rowNumber;
  });

  if (!product) return;

  document.getElementById("productFormTitle").textContent = "상품정보 수정";
  document.getElementById("productRowNumber").value = rowNumber;
  document.getElementById("adminProductNo").value = product.productNo || "";
  document.getElementById("adminProductName").value = product.productName || "";
  document.getElementById("adminProductColor").value = product.color || "";
  document.getElementById("adminProductSize").value = product.size || "";
  document.getElementById("adminSalePrice").value = product.salePrice || "";
  document.getElementById("adminDepositPrice").value = product.depositPrice || "";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetAdminProductForm() {
  document.getElementById("productFormTitle").textContent = "상품정보 추가";
  document.getElementById("productRowNumber").value = "";
  document.getElementById("adminProductNo").value = "";
  document.getElementById("adminProductName").value = "";
  document.getElementById("adminProductColor").value = "";
  document.getElementById("adminProductSize").value = "";
  document.getElementById("adminSalePrice").value = "";
  document.getElementById("adminDepositPrice").value = "";
}

async function saveAdminProduct() {
  const payload = {
    action: "saveProduct",
    rowNumber: Number(document.getElementById("productRowNumber").value || 0),
    productNo: document.getElementById("adminProductNo").value.trim(),
    productName: document.getElementById("adminProductName").value.trim(),
    color: document.getElementById("adminProductColor").value.trim(),
    size: document.getElementById("adminProductSize").value.trim(),
    salePrice: Number(document.getElementById("adminSalePrice").value || 0),
    depositPrice: Number(document.getElementById("adminDepositPrice").value || 0)
  };

  if (!payload.productNo || !payload.productName || !payload.color || !payload.size) {
    alert("상품번호, 상품명, 칼라, 사이즈를 모두 입력해주세요.");
    return;
  }

  showLoading("상품정보를 저장하는 중입니다.");

  try {
    await apiPost(payload);
    resetAdminProductForm();
    await loadAdminProducts();
  } catch (error) {
    alert(error.message);
  } finally {
    hideLoading();
  }
}

async function deleteAdminProduct(rowNumber) {
  if (!confirm("이 상품정보 행을 삭제할까요?")) return;

  showLoading("상품정보를 삭제하는 중입니다.");

  try {
    await apiPost({
      action: "deleteProduct",
      rowNumber: rowNumber
    });

    resetAdminProductForm();
    await loadAdminProducts();
  } catch (error) {
    alert(error.message);
  } finally {
    hideLoading();
  }
}


/* =========================
   고객 주문조회
========================= */
function initCustomerPage() {
  const phoneInput = document.getElementById("lookupPhoneLast");

  phoneInput.addEventListener("input", function () {
    phoneInput.value = phoneInput.value.replace(/[^0-9]/g, "").slice(0, 4);
  });

  phoneInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") lookupCustomerOrders();
  });

  document.getElementById("lookupButton").addEventListener("click", lookupCustomerOrders);
}

async function lookupCustomerOrders() {
  const name = document.getElementById("lookupName").value.trim();
  const phoneLast = document.getElementById("lookupPhoneLast").value.trim();

  if (!name) {
    alert("수령인 성함을 입력해주세요.");
    return;
  }

  if (phoneLast.length !== 4) {
    alert("연락처 뒤 4자리를 입력해주세요.");
    return;
  }

  showLoading("주문내역을 조회하는 중입니다.");

  try {
    const data = await apiGet({
      action: "customerOrders",
      name: name,
      phoneLast: phoneLast
    });

    const orders = Array.isArray(data.orders) ? data.orders : [];
    renderCustomerOrders(orders);
  } catch (error) {
    alert(error.message);
  } finally {
    hideLoading();
  }
}

function renderCustomerOrders(orders) {
  document.getElementById("lookupCount").textContent = orders.length + "건";
  const container = document.getElementById("customerOrderList");

  if (!orders.length) {
    container.innerHTML =
      '<div class="empty-state">일치하는 주문내역이 없습니다.<br>이름과 연락처 뒤 4자리를 다시 확인해주세요.</div>';
    return;
  }

  container.innerHTML = orders.map(function (order) {
    const trackingNumber = order.trackingNumber || "";
    const courier = order.courier || "CJ대한통운";
    const numericTracking = String(trackingNumber).replace(/[^0-9]/g, "");

    return `
      <article class="order-result-card">
        <h3>${escapeHtml(order.orderDate || "보관 주문")}</h3>

        <div class="order-result-meta">
          <div><strong>입금금액</strong><br>${money(order.paymentAmount)}</div>
          <div><strong>입금상태</strong><br>${escapeHtml(order.paymentStatus)}</div>
          <div><strong>닉네임</strong><br>${escapeHtml(order.nickname)}</div>
          <div><strong>내품수량</strong><br>${escapeHtml(order.itemQuantity)}개</div>
        </div>

        <div class="order-result-items">${escapeHtml(order.orderItems)}</div>

        <div class="customer-delivery-box">
          ${trackingNumber ? `
            <div>
              <span>${escapeHtml(courier)}</span>
              <strong>${escapeHtml(trackingNumber)}</strong>
            </div>
            <a class="delivery-button" target="_blank" rel="noopener"
               href="https://trace.cjlogistics.com/next/tracking.html?wblNo=${encodeURIComponent(numericTracking)}">
              배송조회
            </a>
          ` : `
            <div>
              <span>배송상태</span>
              <strong>배송 준비 중</strong>
            </div>
          `}
        </div>
      </article>
    `;
  }).join("");
}


/* ========================= V2 UI ========================= */
let lastCustomerLookup={name:"",phoneLast:""};
function renderCustomerOrders(orders){
  document.getElementById("lookupCount").textContent=orders.length+"건";const c=document.getElementById("customerOrderList");
  if(!orders.length){c.innerHTML='<div class="empty-state">일치하는 주문내역이 없습니다.<br>이름과 연락처 뒤 4자리를 다시 확인해주세요.</div>';return;}
  c.innerHTML=orders.map(function(o){const tr=o.trackingNumber||"",numeric=String(tr).replace(/[^0-9]/g,"");return `<article class="order-result-card v2-order-card">
    <div class="v2-card-head"><div><span>${escapeHtml(o.orderDate||"보관 주문")}</span><h3>주문번호 ${escapeHtml(o.orderNumber||"-")}</h3></div><b class="status-pill ${o.paymentStatus==='미입금'?'unpaid':'paid'}">${escapeHtml(o.paymentStatus)}</b></div>
    <div class="order-result-items">${escapeHtml(o.orderItems)}</div><div class="v2-total"><span>총 주문금액</span><strong>${money(o.paymentAmount)}</strong></div>
    ${tr?`<div class="customer-delivery-box"><div><span>CJ대한통운</span><strong>${escapeHtml(tr)}</strong></div><a class="delivery-button" target="_blank" rel="noopener" href="https://trace.cjlogistics.com/next/tracking.html?wblNo=${encodeURIComponent(numeric)}">배송조회</a></div>`:''}
    ${o.canEdit||o.canCancel?`<div class="v2-actions">${o.canEdit?`<button class="btn btn-outline customer-edit-btn" data-order="${escapeHtml(o.orderNumber)}">주문 수정</button>`:''}${o.canCancel?`<button class="btn btn-danger customer-cancel-btn" data-order="${escapeHtml(o.orderNumber)}">주문 취소</button>`:''}</div>`:`<div class="locked-note">입금완료 이후 수정·취소는 채널톡으로 문의해주세요.</div>`}
  </article>`;}).join("");
  c.querySelectorAll('.customer-edit-btn').forEach(b=>b.onclick=()=>openCustomerEdit(orders.find(o=>o.orderNumber===b.dataset.order)));
  c.querySelectorAll('.customer-cancel-btn').forEach(b=>b.onclick=()=>cancelCustomerOrder(b.dataset.order));
}

const originalLookupCustomerOrders=lookupCustomerOrders;
lookupCustomerOrders=async function(){const name=lookupName.value.trim(),phoneLast=lookupPhoneLast.value.trim();if(!name||phoneLast.length!==4){alert("수령인 성함과 연락처 뒤 4자리를 입력해주세요.");return;}lastCustomerLookup={name,phoneLast};showLoading("주문내역을 조회하는 중입니다.");try{const d=await apiGet({action:"customerOrders",name,phoneLast});renderCustomerOrders(Array.isArray(d.orders)?d.orders:[]);}catch(e){alert(e.message)}finally{hideLoading()}};

function openCustomerEdit(o){if(!o)return;editOrderNumber.value=o.orderNumber||"";editNickname.value=o.nickname||"";editReceiverName.value=o.receiverName||lastCustomerLookup.name;editPhone.value=o.phone||"";editZipcode.value=o.zipcode||"";editAddress.value=o.address||"";editShippingMemo.value=o.shippingMemo||"";customerEditModal.classList.add('show');customerEditModal.setAttribute('aria-hidden','false');}
async function saveCustomerEditV2(){showLoading("주문정보를 수정하고 있습니다.");try{await apiPost({action:"customerUpdateOrder",orderNumber:editOrderNumber.value,name:lastCustomerLookup.name,phoneLast:lastCustomerLookup.phoneLast,nickname:editNickname.value,receiverName:editReceiverName.value,phone:editPhone.value,zipcode:editZipcode.value,address:editAddress.value,shippingMemo:editShippingMemo.value});customerEditModal.classList.remove('show');await lookupCustomerOrders();alert("주문정보가 수정되었습니다.");}catch(e){alert(e.message)}finally{hideLoading()}}
async function cancelCustomerOrder(orderNumber){const reasons=["실수로 주문","색상 변경","사이즈 변경","중복 주문","기타"];const reason=prompt("취소 사유를 입력해주세요.\n"+reasons.join(" / "),"실수로 주문");if(reason===null)return;if(!confirm("정말 주문을 취소하시겠습니까?\n취소 후 복구는 관리자만 가능합니다."))return;showLoading("주문을 취소하고 있습니다.");try{await apiPost({action:"customerCancelOrder",orderNumber,name:lastCustomerLookup.name,phoneLast:lastCustomerLookup.phoneLast,reason});await lookupCustomerOrders();alert("주문이 취소되었습니다.");}catch(e){alert(e.message)}finally{hideLoading()}}

document.addEventListener('DOMContentLoaded',function(){if(document.body.dataset.page==='customer'){closeCustomerEdit.onclick=()=>customerEditModal.classList.remove('show');saveCustomerEdit.onclick=saveCustomerEditV2;customerEditModal.onclick=e=>{if(e.target===customerEditModal)customerEditModal.classList.remove('show');};}if(document.body.dataset.page==='admin')initCancelledV2();});

function initCancelledV2(){const btn=document.getElementById('cancelledSideButton');if(btn)btn.addEventListener('click',function(){document.querySelectorAll('.tab-section').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.side-link').forEach(x=>x.classList.remove('active'));document.getElementById('cancelledTab').classList.add('active');btn.classList.add('active');loadCancelledOrders();});const search=document.getElementById('searchCancelledButton');if(search)search.onclick=loadCancelledOrders;}
async function loadCancelledOrders(){showLoading("취소주문을 조회하는 중입니다.");try{const d=await apiGet({action:"cancelledOrders",search:(document.getElementById('cancelKeyword')||{}).value||""});renderCancelledOrders(d.orders||[]);}catch(e){alert(e.message)}finally{hideLoading()}}
function renderCancelledOrders(orders){document.getElementById('cancelledCount').textContent=orders.length;const c=document.getElementById('cancelledOrderList');if(!orders.length){c.innerHTML='<div class="empty-state">취소된 주문이 없습니다.</div>';return;}c.innerHTML=orders.map(o=>`<article class="cancel-card"><div class="v2-card-head"><div><span>취소일 ${escapeHtml(o.cancelDate)}</span><h3>${escapeHtml(o.nickname)} · ${escapeHtml(o.receiverName)}</h3></div><b class="status-pill cancelled">고객취소</b></div><p>${escapeHtml(o.phone)} · ${money(o.paymentAmount)}</p><div class="order-result-items">${escapeHtml(o.orderItems)}</div><div class="cancel-reason">취소사유: ${escapeHtml(o.reason||'-')}</div><button class="btn btn-success restore-btn" data-row="${o.rowNumber}">복구</button></article>`).join('');c.querySelectorAll('.restore-btn').forEach(b=>b.onclick=()=>restoreCancelled(Number(b.dataset.row)));}
async function restoreCancelled(rowNumber){if(!confirm("이 주문을 고객주문으로 복구할까요?\n복구 후 입금상태는 미입금으로 설정됩니다."))return;showLoading("주문을 복구하고 있습니다.");try{await apiPost({action:"restoreCancelledOrder",rowNumber});await loadCancelledOrders();alert("주문이 복구되었습니다.");}catch(e){alert(e.message)}finally{hideLoading()}}

const originalRenderAdminOrders=renderAdminOrders;
renderAdminOrders=function(){originalRenderAdminOrders();const el=document.getElementById('summaryUnpaidCount');if(el)el.textContent=adminOrders.filter(o=>o.paymentStatus==='미입금').length;};
