// V3.23 - 수령인 이름 우선 입금대조 / 은행 C,G열 / 주문서 속도개선
/*
  씬느샵 공통 설정
  아래 3개 주소만 실제 주소로 바꾸세요.
*/
const CONFIG = {
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwUEc7W9XJgCbxZsqa3K2gEWpOOblrtfAD-LK53zfNHaP4dliCoOvyKjsiw1YcP9bh-/exec",
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

  const responseText = await response.text();
  let data;
  try {
    data = JSON.parse(responseText);
  } catch (error) {
    throw new Error("주문 서버가 JSON이 아닌 응답을 보냈습니다. Apps Script 웹앱을 새 버전으로 배포하고 접근 권한을 '모든 사용자'로 설정해주세요.");
  }

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

  const responseText = await response.text();
  let data;
  try {
    data = JSON.parse(responseText);
  } catch (error) {
    throw new Error("주문 서버가 JSON이 아닌 응답을 보냈습니다. Apps Script 웹앱을 새 버전으로 배포하고 접근 권한을 '모든 사용자'로 설정해주세요.");
  }

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
let orderProducts=[];
let orderCart=[];
let selectedOrderProduct=null;
let orderSubmitting=false;
let orderPreviewTimer=null;
let orderProductsPromise=null;
let paymentPreviewCache=new Map();
let paymentPreviewSeq=0;
let lastPaymentPreview={existingProductAmount:0,currentProductAmount:0,cumulativeProductAmount:0,shippingFee:0,cumulativeFinalAmount:0,additionalOrder:false,remote:false};

async function initOrderPage(){
  document.getElementById("bandLink").href=CONFIG.BAND_URL;
  document.getElementById("channelLink").href=CONFIG.CHANNEL_URL;
  document.getElementById("phone").addEventListener("input",function(e){formatPhoneInput(e);schedulePaymentPreview();});
  document.getElementById("receiverName").addEventListener("input",schedulePaymentPreview);
  document.getElementById("addressSearchButton").addEventListener("click",openAddressSearch);
  const addressCloseButton=document.getElementById("addressSearchCloseButton");
  if(addressCloseButton)addressCloseButton.addEventListener("click",closeAddressSearch);
  document.getElementById("shippingRegion").addEventListener("change",schedulePaymentPreview);
  document.getElementById("paymentMethod").addEventListener("change",updateCardVatNotice);
  document.getElementById("singleProductNo").addEventListener("input",function(e){e.target.value=e.target.value.replace(/[^0-9]/g,"");resetSingleProductSelection()});
  document.getElementById("singleProductNo").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();searchSingleProduct()}});
  document.getElementById("singleProductSearchButton").addEventListener("click",searchSingleProduct);
  document.getElementById("singleProductColor").addEventListener("change",updateSingleSizes);
  document.getElementById("singleMinusButton").addEventListener("click",function(){changeSingleQuantity(-1)});
  document.getElementById("singlePlusButton").addEventListener("click",function(){changeSingleQuantity(1)});
  document.getElementById("addToCartButton").addEventListener("click",addSelectedProductToCart);
  document.getElementById("focusProductButton").addEventListener("click",function(){document.getElementById("singleProductNo").focus();window.scrollTo({top:0,behavior:"smooth"})});
  document.getElementById("clearCustomerButton").addEventListener("click",clearSavedCustomer);
  document.getElementById("finishOrderButton").addEventListener("click",finishOrder);
  document.getElementById("orderForm").addEventListener("submit",submitOrder);
  loadSavedCustomer();
  renderOrderCart();
  updateCardVatNotice();
  // V3.21: 첫 화면은 서버 응답을 기다리지 않고 즉시 표시합니다.
  // 상품목록은 브라우저가 한가할 때 미리 받아두고, 검색 시 아직 없으면 그때만 기다립니다.
  const warm=()=>ensureOrderProductsLoaded().catch(function(e){console.warn("상품정보 사전 로딩:",e.message)});
  if("requestIdleCallback" in window) requestIdleCallback(warm,{timeout:2500});
  else setTimeout(warm,1200);
}

async function loadOrderProducts(show){
  const d=await apiGet({action:"products"});
  orderProducts=Array.isArray(d.products)?d.products:[];
  if(!orderProducts.length)throw new Error("상품정보 시트에 등록된 상품이 없습니다.");
  if(show)alert("상품정보를 새로 불러왔습니다.");
  return orderProducts;
}
function ensureOrderProductsLoaded(){
  if(orderProducts.length)return Promise.resolve(orderProducts);
  if(!orderProductsPromise){
    orderProductsPromise=loadOrderProducts(false).finally(function(){orderProductsPromise=null});
  }
  return orderProductsPromise;
}
function resetSingleProductSelection(){selectedOrderProduct=null;singleProductName.value="";singleProductColor.innerHTML='<option value="">칼라를 선택하세요</option>';singleProductSize.innerHTML='<option value="">사이즈를 선택하세요</option>';singleProductColor.disabled=true;singleProductSize.disabled=true;singleProductMessage.className="product-message";singleProductMessage.textContent="상품번호 입력 후 검색을 눌러주세요."}
async function searchSingleProduct(){const no=singleProductNo.value.trim();if(!no){singleProductMessage.className="product-message error";singleProductMessage.textContent="상품번호를 입력해주세요.";return}if(!orderProducts.length){singleProductMessage.className="product-message";singleProductMessage.textContent="상품정보를 확인하는 중입니다...";try{await ensureOrderProductsLoaded()}catch(e){singleProductMessage.className="product-message error";singleProductMessage.textContent=e.message;return}}const p=orderProducts.find(x=>String(x.productNo)===no);if(!p){resetSingleProductSelection();singleProductMessage.className="product-message error";singleProductMessage.textContent="등록되지 않은 상품번호입니다.";return}selectedOrderProduct=p;singleProductName.value=p.productName||"";singleProductColor.innerHTML='<option value="">칼라를 선택하세요</option>';Object.keys(p.colors||{}).forEach(c=>{const o=document.createElement("option");o.value=c;o.textContent=c;singleProductColor.appendChild(o)});singleProductColor.disabled=false;singleProductMessage.className="product-message success";singleProductMessage.textContent="상품이 확인되었습니다."}
function updateSingleSizes(){const c=singleProductColor.value;singleProductSize.innerHTML='<option value="">사이즈를 선택하세요</option>';if(!selectedOrderProduct||!c||!selectedOrderProduct.colors[c]){singleProductSize.disabled=true;return}selectedOrderProduct.colors[c].forEach(s=>{const o=document.createElement("option");o.value=s;o.textContent=s;singleProductSize.appendChild(o)});singleProductSize.disabled=false}
function changeSingleQuantity(n){singleProductQuantity.value=Math.min(99,Math.max(1,Number(singleProductQuantity.value||1)+n))}
function addSelectedProductToCart(){const no=singleProductNo.value.trim(),c=singleProductColor.value,s=singleProductSize.value,q=Math.min(99,Math.max(1,Number(singleProductQuantity.value||1)));if(!selectedOrderProduct||String(selectedOrderProduct.productNo)!==no){alert("상품번호를 검색해주세요.");return}if(!c){alert("칼라를 선택해주세요.");return}if(!s){alert("사이즈를 선택해주세요.");return}orderCart.push({productNo:no,productName:selectedOrderProduct.productName||"",color:c,size:s,quantity:q,price:Number(selectedOrderProduct.price||0)});renderOrderCart();singleProductNo.value="";singleProductQuantity.value="1";resetSingleProductSelection();singleProductNo.focus()}
function removeCartItem(i){orderCart.splice(i,1);renderOrderCart()}

function getCurrentCartProductAmount(){return orderCart.reduce((a,x)=>a+Number(x.price||0)*Number(x.quantity||0),0)}
function renderOrderCart(){
  if(!orderCart.length){cartList.innerHTML='<div class="cart-empty">담긴 상품이 없습니다.</div>';purchaseSummary.textContent="상품을 담으면 구매내역이 자동으로 표시됩니다."}
  else{cartList.innerHTML=orderCart.map((x,i)=>`<div class="cart-item"><div class="cart-number">${i+1}</div><div class="cart-info"><strong>${escapeHtml(x.productNo)}번 ${escapeHtml(x.productName)}</strong><span>${escapeHtml(x.color)} / ${escapeHtml(x.size)} / ${x.quantity}개</span></div><div class="cart-side"><span class="cart-price">${money(x.price*x.quantity)}</span><button type="button" class="cart-delete" data-index="${i}">🗑 삭제</button></div></div>`).join("");cartList.querySelectorAll(".cart-delete").forEach(b=>b.addEventListener("click",()=>removeCartItem(Number(b.dataset.index))));purchaseSummary.textContent=orderCart.map(x=>`${x.productNo}번 ${x.productName} / ${x.color} / ${x.size} / ${x.quantity}개 / ${money(x.price*x.quantity)}`).join("\n")}
  const count=orderCart.reduce((a,x)=>a+x.quantity,0),total=getCurrentCartProductAmount();
  totalItemCount.textContent=count+"개";
  grandTotal.textContent=money(total);
  schedulePaymentPreview();
}

function updateCardVatNotice(){
  const notice=document.getElementById("cardVatNotice");
  if(!notice)return;
  notice.classList.toggle("show",paymentMethod.value==="카드결제");
}

function schedulePaymentPreview(){
  clearTimeout(orderPreviewTimer);
  orderPreviewTimer=setTimeout(refreshPaymentPreview,550);
}

async function refreshPaymentPreview(){
  const seq=++paymentPreviewSeq;
  const current=getCurrentCartProductAmount();
  const receiver=(document.getElementById("receiverName")||{}).value||"";
  const phone=(document.getElementById("phone")||{}).value||"";
  const remote=(document.getElementById("shippingRegion")||{}).value==="remote";
  let preview={existingProductAmount:0,currentProductAmount:current,cumulativeProductAmount:current,shippingFee:current?((current>=200000)?0:(remote?7000:4000)):0,cumulativeFinalAmount:current?current+((current>=200000)?0:(remote?7000:4000)):0,additionalOrder:false,remote:remote};
  if(current>0&&receiver.trim()&&phone.replace(/[^0-9]/g,"").length>=10){
    const key=[receiver.trim(),phone.replace(/[^0-9]/g,""),current,remote?1:0].join("|");
    if(paymentPreviewCache.has(key)){
      preview=paymentPreviewCache.get(key);
    }else{
      try{
        const d=await apiGet({action:"paymentPreview",receiverName:receiver.trim(),phone:phone,currentProductAmount:String(current),remote:remote?"1":"0"});
        if(d&&d.preview){preview=d.preview;paymentPreviewCache.set(key,preview);if(paymentPreviewCache.size>30)paymentPreviewCache.delete(paymentPreviewCache.keys().next().value);}
      }catch(e){console.warn("배송비 미리보기:",e.message)}
    }
  }
  if(seq!==paymentPreviewSeq)return;
  lastPaymentPreview=preview;
  renderPaymentPreview(preview);
}

function renderPaymentPreview(p){
  const current=Number(p.currentProductAmount||0),existing=Number(p.existingProductAmount||0),cumulative=Number(p.cumulativeProductAmount||0),fee=Number(p.shippingFee||0),finalAmount=Number(p.cumulativeFinalAmount||0);
  const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=money(val)};
  set("currentProductAmount",current);set("existingProductAmount",existing);set("cumulativeProductAmount",cumulative);set("calculatedShippingFee",fee);set("cumulativeFinalAmount",finalAmount);
  const existingRow=document.getElementById("existingOrderAmountRow");if(existingRow)existingRow.classList.toggle("show",existing>0);
  const msg=document.getElementById("shippingMessage");
  if(msg){
    if(!current)msg.textContent="상품을 담으면 배송비와 최종 입금금액이 자동으로 계산됩니다.";
    else if(cumulative>=200000)msg.innerHTML="🎁 누적 상품금액이 20만원 이상이라 <strong>무료배송</strong>입니다.";
    else if(existing>0)msg.innerHTML="⭐ 추가 주문입니다. 배송비는 같은 방송에서 <strong>1회만</strong> 적용되고 누적 최종금액을 보여드립니다.";
    else msg.innerHTML=(p.remote?"🚚 제주·도서산간 배송비 7,000원이 적용됩니다.":"🚚 기본 배송비 4,000원이 적용됩니다.");
  }
  const hidden=document.getElementById("displayPaymentAmount");if(hidden)hidden.value=money(finalAmount);
  const cb=document.getElementById("paymentConfirmCheckbox");if(cb)cb.checked=false;
}

async function submitOrder(e){
  e.preventDefault();if(orderSubmitting)return;
  try{
    if(!orderCart.length)throw new Error("주문 상품을 한 개 이상 담아주세요.");
    if(!paymentConfirmCheckbox.checked)throw new Error("최종 입금금액을 확인한 뒤 체크해주세요.");
    const data={action:"saveOrder",nickname:nickname.value.trim(),receiverName:receiverName.value.trim(),phone:phone.value.trim(),zipcode:zipcode.value.trim(),address:address.value.trim(),detailAddress:detailAddress.value.trim(),shippingMemo:shippingMemo.value.trim(),paymentMethod:paymentMethod.value,isRemoteShipping:shippingRegion.value==="remote",products:orderCart.map(x=>({productNo:x.productNo,color:x.color,size:x.size,quantity:x.quantity}))};
    if(!data.nickname||!data.receiverName)throw new Error("닉네임과 수령인 성함을 입력해주세요.");
    if(data.phone.replace(/[^0-9]/g,"").length<10)throw new Error("연락처를 정확하게 입력해주세요.");
    if(!data.zipcode||!data.address||!data.detailAddress)throw new Error("주소와 상세주소를 입력해주세요.");
    orderSubmitting=true;showLoading("주문서를 저장하고 있습니다.");submitButton.disabled=true;
    const r=await apiPost(data);paymentPreviewCache.clear();saveCustomerInfo();orderForm.style.display="none";
    completePaymentAmount.textContent=money(r.cumulativeFinalAmount||r.paymentAmount||0);
    const note=document.getElementById("completeShippingNote");
    if(note){note.textContent=(r.cumulativeProductAmount>=200000?"20만원 이상 무료배송 적용":(r.additionalOrder?"같은 방송 배송비 1회 적용":"배송비 포함 금액"));}
    completeScreen.classList.add("show");window.scrollTo({top:0,behavior:"smooth"});
  }catch(err){alert(err.message)}finally{orderSubmitting=false;hideLoading();submitButton.disabled=false}
}

function saveCustomerInfo(){localStorage.setItem(CUSTOMER_STORAGE_KEY,JSON.stringify({nickname:nickname.value.trim(),receiverName:receiverName.value.trim(),phone:phone.value.trim(),zipcode:zipcode.value.trim(),address:address.value.trim(),detailAddress:detailAddress.value.trim(),shippingMemo:shippingMemo.value.trim(),shippingRegion:shippingRegion.value}))}
function loadSavedCustomer(){try{const raw=localStorage.getItem(CUSTOMER_STORAGE_KEY);if(!raw)return;const info=JSON.parse(raw);Object.keys(info).forEach(k=>{const e=document.getElementById(k);if(e)e.value=info[k]||""});if(info.nickname||info.phone)savedNotice.classList.add("show");schedulePaymentPreview()}catch(e){console.error(e)}}
function clearSavedCustomer(){if(!confirm("저장된 고객정보를 지울까요?"))return;localStorage.removeItem(CUSTOMER_STORAGE_KEY);["nickname","receiverName","phone","zipcode","address","detailAddress","shippingMemo"].forEach(id=>document.getElementById(id).value="");shippingRegion.value="normal";savedNotice.classList.remove("show");schedulePaymentPreview()}
function finishOrder(){completeScreen.classList.remove("show");orderForm.style.display="grid";orderCart=[];renderOrderCart();loadSavedCustomer();window.scrollTo({top:0,behavior:"smooth"})}
function formatPhoneInput(e){let n=e.target.value.replace(/[^0-9]/g,"").slice(0,11);e.target.value=n.length<=3?n:n.length<=7?n.slice(0,3)+"-"+n.slice(3):n.slice(0,3)+"-"+n.slice(3,7)+"-"+n.slice(7)}
let postcodeScriptPromise=null;
let postcodeEmbedded=false;
function loadPostcodeScript(){
  if(window.daum&&window.daum.Postcode)return Promise.resolve();
  if(postcodeScriptPromise)return postcodeScriptPromise;
  postcodeScriptPromise=new Promise((resolve,reject)=>{
    const sc=document.createElement("script");
    sc.src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    sc.async=true;
    sc.onload=()=>window.daum&&window.daum.Postcode?resolve():reject(new Error("주소검색 모듈을 초기화하지 못했습니다."));
    sc.onerror=()=>reject(new Error("주소검색 서비스를 불러오지 못했습니다."));
    document.head.appendChild(sc);
  });
  return postcodeScriptPromise;
}
function setAddressSearchStatus(message,isError){
  const el=document.getElementById("addressSearchStatus");
  if(!el)return;
  el.textContent=message;
  el.classList.toggle("address-manual-help",!!isError);
}
function enableManualAddressFallback(){
  const zip=document.getElementById("zipcode"),addr=document.getElementById("address");
  if(zip){zip.readOnly=false;zip.placeholder="우편번호 직접 입력";}
  if(addr){addr.readOnly=false;addr.placeholder="주소를 직접 입력해주세요";}
  setAddressSearchStatus("주소검색이 차단된 환경입니다. 우편번호와 주소를 직접 입력할 수 있게 전환했습니다.",true);
}
async function openAddressSearch(){
  const panel=document.getElementById("addressSearchPanel");
  const embed=document.getElementById("postcodeEmbed");
  if(!panel||!embed)return;
  panel.classList.add("show");panel.setAttribute("aria-hidden","false");
  setAddressSearchStatus("주소검색을 불러오는 중입니다...",false);
  try{
    await loadPostcodeScript();
    setAddressSearchStatus("도로명, 건물명 또는 지번으로 검색해주세요.",false);
    if(!postcodeEmbedded){
      new window.daum.Postcode({
        width:"100%",height:"100%",
        oncomplete:d=>{
          zipcode.value=d.zonecode||"";
          address.value=d.userSelectedType==="R"?(d.roadAddress||""):(d.jibunAddress||"");
          detailAddress.value="";
          shippingRegion.value=String(address.value).indexOf("제주")!==-1?"remote":"normal";
          schedulePaymentPreview();
          closeAddressSearch();
          setTimeout(()=>detailAddress.focus(),50);
        }
      }).embed(embed);
      postcodeEmbedded=true;
    }
    panel.scrollIntoView({behavior:"smooth",block:"center"});
  }catch(err){
    console.error(err);
    enableManualAddressFallback();
  }
}
function closeAddressSearch(){
  const panel=document.getElementById("addressSearchPanel");
  if(panel){panel.classList.remove("show");panel.setAttribute("aria-hidden","true");}
}

/* =========================
   관리자
========================= */
let adminOrders = [];
let adminProducts = [];
let adminOrderSource = "current";
let adminHasSearched = false;
let adminPaymentFilter = "all";

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

  const summaryUnpaidCard = document.getElementById("summaryUnpaidCard");
  if (summaryUnpaidCard) {
    summaryUnpaidCard.addEventListener("click", showUnpaidAndCardOrders);
  }

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
  initBankMatchPage();
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

  const bankmatchTab = document.getElementById("bankmatchTab");
  if (bankmatchTab) bankmatchTab.classList.toggle("active", tabName === "bankmatch");

  const cancelledTab = document.getElementById("cancelledTab");
  if (cancelledTab && tabName !== "cancelled") cancelledTab.classList.remove("active");

  if (tabName === "products") {
    loadAdminProducts();
  }
  if (tabName === "bankmatch") {
    loadBankMatchOrders();
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

function resetAdminOrderDisplay() {
  adminOrders = [];
  adminHasSearched = false;
  adminPaymentFilter = "all";
  const unpaidCard = document.getElementById("summaryUnpaidCard");
  if (unpaidCard) unpaidCard.classList.remove("active-filter");

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
  adminPaymentFilter = "all";
  const unpaidCard = document.getElementById("summaryUnpaidCard");
  if (unpaidCard) unpaidCard.classList.remove("active-filter");

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

function showUnpaidAndCardOrders() {
  if (!adminHasSearched) {
    alert("먼저 조회하기, 오늘 주문 또는 전체 보기를 눌러 주문을 조회해주세요.");
    return;
  }

  adminPaymentFilter = "unpaid-card";
  const card = document.getElementById("summaryUnpaidCard");
  if (card) card.classList.add("active-filter");
  renderAdminOrders();
  showOrderListView();
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

  const unpaidSummary = document.getElementById("summaryUnpaidCount");
  if (unpaidSummary) {
    unpaidSummary.textContent = adminOrders.filter(function (order) {
      return order.paymentStatus === "미입금" ||
             order.paymentStatus === "카드결제";
    }).length;
  }

  const total = adminOrders.reduce(function (sum, order) {
    return sum + Number(order.paymentAmount || 0);
  }, 0);

  document.getElementById("summaryPaymentTotal").textContent = money(total);

  const displayOrders = adminPaymentFilter === "unpaid-card"
    ? adminOrders.filter(function(order) {
        return order.paymentStatus === "미입금" ||
               order.paymentStatus === "카드결제";
      })
    : adminOrders;

  if (!displayOrders.length) {
    tbody.innerHTML = '<tr><td colspan="14" class="empty-cell">' +
      (adminPaymentFilter === "unpaid-card"
        ? '미입금 또는 카드결제 주문이 없습니다.'
        : '조회된 주문이 없습니다.') +
      '</td></tr>';
    return;
  }

  tbody.innerHTML = displayOrders.map(function (order) {
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
    applyStatusSelectColor(select);
    select.addEventListener("change", function () {
      applyStatusSelectColor(select);
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


function applyStatusSelectColor(select) {
  if (!select) return;
  select.classList.remove("status-unpaid", "status-paid", "status-card");
  if (select.value === "미입금") select.classList.add("status-unpaid");
  if (select.value === "입금완료") select.classList.add("status-paid");
  if (select.value === "카드결제") select.classList.add("status-card");
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

let lastCustomerLookup = { name: "", phoneLast: "" };

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

  lastCustomerLookup = { name: name, phoneLast: phoneLast };
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

/* ========================= V2 UI ========================= */
function renderCustomerOrders(orders){
  document.getElementById("lookupCount").textContent=orders.length+"건";const c=document.getElementById("customerOrderList");
  if(!orders.length){c.innerHTML='<div class="empty-state">일치하는 주문내역이 없습니다.<br>이름과 연락처 뒤 4자리를 다시 확인해주세요.</div>';return;}
  c.innerHTML=orders.map(function(o){const tr=o.trackingNumber||"",numeric=String(tr).replace(/[^0-9]/g,"");return `<article class="order-result-card v2-order-card">
    <div class="v2-card-head"><div><span>${escapeHtml(o.orderDate||"보관 주문")}</span><h3>주문번호 ${escapeHtml(o.orderNumber||"-")}</h3></div><b class="status-pill ${o.paymentStatus==='미입금'?'unpaid':(o.paymentStatus==='카드결제'?'card-paid':'paid')}">${escapeHtml(o.paymentStatus)}</b></div>
    <div class="order-result-items">${escapeHtml(o.orderItems)}</div><div class="v2-total"><span>총 주문금액</span><strong>${money(o.paymentAmount)}</strong></div>
    ${tr?`<div class="customer-delivery-box"><div><span>CJ대한통운</span><strong>${escapeHtml(tr)}</strong></div><a class="delivery-button" target="_blank" rel="noopener" href="https://trace.cjlogistics.com/next/tracking.html?wblNo=${encodeURIComponent(numeric)}">배송조회</a></div>`:''}
    ${o.canEdit||o.canCancel?`<div class="v2-actions">${o.canEdit?`<button class="btn btn-outline customer-edit-btn" data-order="${escapeHtml(o.orderNumber)}">주문 수정</button>`:''}${o.canCancel?`<button class="btn btn-danger customer-cancel-btn" data-order="${escapeHtml(o.orderNumber)}">주문 취소</button>`:''}</div>`:`<div class="locked-note">입금완료 주문은 수정·취소가 불가합니다. 채널톡으로 문의해주세요.</div>`}
  </article>`;}).join("");
  c.querySelectorAll('.customer-edit-btn').forEach(b=>b.onclick=()=>openCustomerEdit(orders.find(o=>o.orderNumber===b.dataset.order)));
  c.querySelectorAll('.customer-cancel-btn').forEach(b=>b.onclick=()=>cancelCustomerOrder(b.dataset.order));
}



async function cancelCustomerOrder(orderNumber) {
  if (!orderNumber) {
    alert("취소할 주문번호를 찾을 수 없습니다.");
    return;
  }

  if (!lastCustomerLookup.name || lastCustomerLookup.phoneLast.length !== 4) {
    alert("주문을 다시 조회한 뒤 취소해주세요.");
    return;
  }

  const reason = prompt(
    "취소 사유를 입력해주세요.\n예: 실수로 주문 / 색상 변경 / 사이즈 변경 / 중복 주문 / 기타",
    "실수로 주문"
  );

  if (reason === null) return;

  if (!confirm(
    "정말 이 주문을 취소하시겠습니까?\n\n" +
    "취소된 주문은 관리자 취소주문 목록에 보관되며 관리자만 복구할 수 있습니다."
  )) {
    return;
  }

  showLoading("주문을 취소하고 있습니다.");

  try {
    const result = await apiPost({
      action: "customerCancelOrder",
      orderNumber: orderNumber,
      name: lastCustomerLookup.name,
      phoneLast: lastCustomerLookup.phoneLast,
      reason: String(reason || "고객취소").trim() || "고객취소"
    });

    await lookupCustomerOrders();
    alert(result.message || "주문이 취소되었습니다.");
  } catch (error) {
    alert(error.message);
  } finally {
    hideLoading();
  }
}


let editOrderProducts = [];
let editProductCatalog = [];
let editSelectedAddProduct = null;

function parseEditableOrderItems(orderItems) {
  return String(orderItems || "")
    .split(/\r?\n/)
    .map(function(line) { return line.trim(); })
    .filter(function(line) { return line && line.indexOf("[사은품]") !== 0; })
    .map(function(line) {
      const parts = line.split("/").map(function(part) { return part.trim(); });
      const productNo = String(parts[0] || "").replace(/[^0-9]/g, "");
      const hasName = parts.length >= 5;
      const color = parts[hasName ? 2 : 1] || "";
      const size = parts[hasName ? 3 : 2] || "";
      const quantity = Math.max(1, Number(String(parts[hasName ? 4 : 3] || "1").replace(/[^0-9]/g, "")) || 1);
      return { productNo: productNo, color: color, size: size, quantity: quantity };
    })
    .filter(function(item) { return item.productNo && item.color && item.size; });
}

async function ensureEditProductCatalog() {
  if (editProductCatalog.length) return;
  const data = await apiGet({ action: "products" });
  editProductCatalog = Array.isArray(data.products) ? data.products : [];
  if (!editProductCatalog.length) {
    throw new Error("상품정보 시트에 등록된 상품이 없습니다.");
  }
}

function getEditCatalogProduct(productNo) {
  return editProductCatalog.find(function(product) {
    return String(product.productNo) === String(productNo);
  }) || null;
}

function getEditItemPrice(item) {
  const product = getEditCatalogProduct(item.productNo);
  return product ? Number(product.price || 0) : 0;
}

function renderEditOrderProducts() {
  const list = document.getElementById("editProductList");
  const totalLabel = document.getElementById("editProductsTotal");
  if (!list || !totalLabel) return;

  if (!editOrderProducts.length) {
    list.innerHTML = '<div class="edit-products-empty">주문 상품이 없습니다. 아래에서 상품을 추가해주세요.</div>';
    totalLabel.textContent = "0원";
    return;
  }

  list.innerHTML = editOrderProducts.map(function(item, index) {
    const product = getEditCatalogProduct(item.productNo);
    const productName = product ? product.productName : "상품정보 없음";
    const colors = product ? Object.keys(product.colors || {}) : [item.color];
    const sizes = product && product.colors && product.colors[item.color]
      ? product.colors[item.color]
      : [item.size];
    const lineTotal = getEditItemPrice(item) * item.quantity;

    return `
      <article class="edit-product-card" data-index="${index}">
        <div class="edit-product-title">
          <div>
            <span>${escapeHtml(item.productNo)}번</span>
            <strong>${escapeHtml(productName)}</strong>
          </div>
          <button type="button" class="edit-product-delete" data-action="delete" data-index="${index}">삭제</button>
        </div>
        <div class="edit-product-grid">
          <div class="field">
            <label>칼라</label>
            <select data-action="color" data-index="${index}">
              ${colors.map(function(color) {
                return `<option value="${escapeHtml(color)}" ${color === item.color ? "selected" : ""}>${escapeHtml(color)}</option>`;
              }).join("")}
            </select>
          </div>
          <div class="field">
            <label>사이즈</label>
            <select data-action="size" data-index="${index}">
              ${sizes.map(function(size) {
                return `<option value="${escapeHtml(size)}" ${size === item.size ? "selected" : ""}>${escapeHtml(size)}</option>`;
              }).join("")}
            </select>
          </div>
          <div class="field">
            <label>수량</label>
            <div class="edit-quantity-row">
              <button type="button" data-action="minus" data-index="${index}">−</button>
              <input type="number" min="1" max="99" value="${item.quantity}" data-action="quantity" data-index="${index}">
              <button type="button" data-action="plus" data-index="${index}">＋</button>
            </div>
          </div>
          <div class="edit-line-total">
            <span>상품금액</span>
            <strong>${money(lineTotal)}</strong>
          </div>
        </div>
      </article>
    `;
  }).join("");

  list.querySelectorAll("[data-action]").forEach(function(element) {
    element.addEventListener("change", handleEditProductAction);
    if (element.tagName === "BUTTON") {
      element.addEventListener("click", handleEditProductAction);
    }
  });

  const total = editOrderProducts.reduce(function(sum, item) {
    return sum + getEditItemPrice(item) * item.quantity;
  }, 0);
  totalLabel.textContent = money(total);
}

function handleEditProductAction(event) {
  const target = event.currentTarget;
  const action = target.dataset.action;
  const index = Number(target.dataset.index);
  const item = editOrderProducts[index];
  if (!item) return;

  if (action === "delete") {
    if (!confirm("이 상품을 주문에서 삭제할까요?")) return;
    editOrderProducts.splice(index, 1);
  } else if (action === "color") {
    item.color = target.value;
    const product = getEditCatalogProduct(item.productNo);
    const sizes = product && product.colors ? (product.colors[item.color] || []) : [];
    item.size = sizes[0] || "";
  } else if (action === "size") {
    item.size = target.value;
  } else if (action === "minus") {
    item.quantity = Math.max(1, item.quantity - 1);
  } else if (action === "plus") {
    item.quantity = Math.min(99, item.quantity + 1);
  } else if (action === "quantity") {
    item.quantity = Math.min(99, Math.max(1, Number(target.value || 1)));
  }

  renderEditOrderProducts();
}

function resetEditAddProduct() {
  editSelectedAddProduct = null;
  editAddProductName.value = "";
  editAddColor.innerHTML = '<option value="">칼라 선택</option>';
  editAddSize.innerHTML = '<option value="">사이즈 선택</option>';
  editAddColor.disabled = true;
  editAddSize.disabled = true;
  editAddQuantity.value = "1";
  editAddMessage.textContent = "상품번호를 검색해주세요.";
  editAddMessage.className = "edit-product-message";
}

function searchEditAddProduct() {
  const productNo = editAddProductNo.value.replace(/[^0-9]/g, "");
  editAddProductNo.value = productNo;
  const product = getEditCatalogProduct(productNo);

  if (!product) {
    resetEditAddProduct();
    editAddProductNo.value = productNo;
    editAddMessage.textContent = "등록되지 않은 상품번호입니다.";
    editAddMessage.className = "edit-product-message error";
    return;
  }

  editSelectedAddProduct = product;
  editAddProductName.value = product.productName || "";
  editAddColor.innerHTML = '<option value="">칼라 선택</option>' +
    Object.keys(product.colors || {}).map(function(color) {
      return `<option value="${escapeHtml(color)}">${escapeHtml(color)}</option>`;
    }).join("");
  editAddColor.disabled = false;
  editAddSize.disabled = true;
  editAddSize.innerHTML = '<option value="">사이즈 선택</option>';
  editAddMessage.textContent = "상품이 확인되었습니다.";
  editAddMessage.className = "edit-product-message success";
}

function updateEditAddSizes() {
  const color = editAddColor.value;
  const sizes = editSelectedAddProduct && editSelectedAddProduct.colors
    ? (editSelectedAddProduct.colors[color] || [])
    : [];

  editAddSize.innerHTML = '<option value="">사이즈 선택</option>' +
    sizes.map(function(size) {
      return `<option value="${escapeHtml(size)}">${escapeHtml(size)}</option>`;
    }).join("");
  editAddSize.disabled = !color || !sizes.length;
}

function addEditOrderProduct() {
  if (!editSelectedAddProduct) {
    alert("상품번호를 검색해주세요.");
    return;
  }
  if (!editAddColor.value || !editAddSize.value) {
    alert("칼라와 사이즈를 선택해주세요.");
    return;
  }

  const quantity = Math.min(99, Math.max(1, Number(editAddQuantity.value || 1)));
  const existing = editOrderProducts.find(function(item) {
    return item.productNo === String(editSelectedAddProduct.productNo) &&
      item.color === editAddColor.value &&
      item.size === editAddSize.value;
  });

  if (existing) {
    existing.quantity = Math.min(99, existing.quantity + quantity);
  } else {
    editOrderProducts.push({
      productNo: String(editSelectedAddProduct.productNo),
      color: editAddColor.value,
      size: editAddSize.value,
      quantity: quantity
    });
  }

  editAddProductNo.value = "";
  resetEditAddProduct();
  renderEditOrderProducts();
}

async function openCustomerEdit(o) {
  if (!o) return;

  showLoading("주문 상품정보를 불러오는 중입니다.");
  try {
    await ensureEditProductCatalog();

    editOrderNumber.value = o.orderNumber || "";
    editNickname.value = o.nickname || "";
    editReceiverName.value = o.receiverName || lastCustomerLookup.name;
    editPhone.value = o.phone || "";
    editZipcode.value = o.zipcode || "";
    editAddress.value = o.address || "";
    editShippingMemo.value = o.shippingMemo || "";
    editOrderProducts = parseEditableOrderItems(o.orderItems);

    resetEditAddProduct();
    renderEditOrderProducts();

    customerEditModal.classList.add("show");
    customerEditModal.setAttribute("aria-hidden", "false");
  } catch (error) {
    alert(error.message);
  } finally {
    hideLoading();
  }
}

async function saveCustomerEditV2() {
  if (!editOrderProducts.length) {
    alert("주문 상품을 모두 삭제할 수 없습니다. 주문 전체를 취소하려면 주문 취소 버튼을 이용해주세요.");
    return;
  }

  showLoading("주문정보와 상품을 수정하고 있습니다.");
  try {
    await apiPost({
      action: "customerUpdateOrder",
      orderNumber: editOrderNumber.value,
      name: lastCustomerLookup.name,
      phoneLast: lastCustomerLookup.phoneLast,
      nickname: editNickname.value,
      receiverName: editReceiverName.value,
      phone: editPhone.value,
      zipcode: editZipcode.value,
      address: editAddress.value,
      shippingMemo: editShippingMemo.value,
      products: editOrderProducts.map(function(item) {
        return {
          productNo: item.productNo,
          color: item.color,
          size: item.size,
          quantity: item.quantity
        };
      })
    });

    customerEditModal.classList.remove("show");
    await lookupCustomerOrders();
    alert("주문정보와 주문 상품이 수정되었습니다.");
  } catch (error) {
    alert(error.message);
  } finally {
    hideLoading();
  }
}

document.addEventListener("DOMContentLoaded", function() {
  if (document.body.dataset.page === "customer") {
    closeCustomerEdit.onclick = function() {
      customerEditModal.classList.remove("show");
    };
    saveCustomerEdit.onclick = saveCustomerEditV2;
    customerEditModal.onclick = function(event) {
      if (event.target === customerEditModal) customerEditModal.classList.remove("show");
    };

    editAddProductNo.addEventListener("input", function(event) {
      event.target.value = event.target.value.replace(/[^0-9]/g, "");
      resetEditAddProduct();
      editAddProductNo.value = event.target.value;
    });
    editAddProductNo.addEventListener("keydown", function(event) {
      if (event.key === "Enter") {
        event.preventDefault();
        searchEditAddProduct();
      }
    });
    editAddSearchButton.onclick = searchEditAddProduct;
    editAddColor.onchange = updateEditAddSizes;
    editAddProductButton.onclick = addEditOrderProduct;
  }

  if (document.body.dataset.page === "admin") initCancelledV2();
});


function initCancelledV2(){const btn=document.getElementById('cancelledSideButton');if(btn)btn.addEventListener('click',function(){document.querySelectorAll('.tab-section').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.side-link').forEach(x=>x.classList.remove('active'));document.getElementById('cancelledTab').classList.add('active');btn.classList.add('active');loadCancelledOrders();});const search=document.getElementById('searchCancelledButton');if(search)search.onclick=loadCancelledOrders;}
async function loadCancelledOrders(){showLoading("취소주문을 조회하는 중입니다.");try{const d=await apiGet({action:"cancelledOrders",search:(document.getElementById('cancelKeyword')||{}).value||""});renderCancelledOrders(d.orders||[]);}catch(e){alert(e.message)}finally{hideLoading()}}
function renderCancelledOrders(orders){document.getElementById('cancelledCount').textContent=orders.length;const c=document.getElementById('cancelledOrderList');if(!orders.length){c.innerHTML='<div class="empty-state">취소된 주문이 없습니다.</div>';return;}c.innerHTML=orders.map(o=>`<article class="cancel-card"><div class="v2-card-head"><div><span>취소일 ${escapeHtml(o.cancelDate)}</span><h3>${escapeHtml(o.nickname)} · ${escapeHtml(o.receiverName)}</h3></div><b class="status-pill cancelled">고객취소</b></div><p>${escapeHtml(o.phone)} · ${money(o.paymentAmount)}</p><div class="order-result-items">${escapeHtml(o.orderItems)}</div><div class="cancel-reason">취소사유: ${escapeHtml(o.reason||'-')}</div><button class="btn btn-success restore-btn" data-row="${o.rowNumber}">복구</button></article>`).join('');c.querySelectorAll('.restore-btn').forEach(b=>b.onclick=()=>restoreCancelled(Number(b.dataset.row)));}
async function restoreCancelled(rowNumber){if(!confirm("이 주문을 고객주문으로 복구할까요?\n복구 후 입금상태는 미입금으로 설정됩니다."))return;showLoading("주문을 복구하고 있습니다.");try{await apiPost({action:"restoreCancelledOrder",rowNumber});await loadCancelledOrders();alert("주문이 복구되었습니다.");}catch(e){alert(e.message)}finally{hideLoading()}}


/* V3.11 주문 전 안내 - 계좌번호 복사 */
(function(){
  const ACCOUNT_NUMBER = "100257908378";
  async function copyAccountNumber(){
    const button=document.getElementById("noticeCopyAccountButton");
    const status=document.getElementById("noticeCopyStatus");
    if(!button) return;
    let ok=false;
    try{
      if(navigator.clipboard && window.isSecureContext){
        await navigator.clipboard.writeText(ACCOUNT_NUMBER); ok=true;
      }else{
        const ta=document.createElement("textarea");
        ta.value=ACCOUNT_NUMBER; ta.setAttribute("readonly","");
        ta.style.position="fixed"; ta.style.opacity="0";
        document.body.appendChild(ta); ta.select();
        ok=document.execCommand("copy"); ta.remove();
      }
    }catch(e){ ok=false; }
    if(ok){
      button.textContent="✓ 복사되었습니다"; button.classList.add("copied");
      if(status) status.textContent="계좌번호가 복사되었습니다!";
      setTimeout(()=>{button.textContent="📋 계좌번호 복사";button.classList.remove("copied");if(status)status.textContent="";},2200);
    }else{
      if(status) status.textContent="복사가 안 되면 계좌번호를 길게 눌러 복사해주세요.";
    }
  }
  document.addEventListener("DOMContentLoaded",()=>{
    const b=document.getElementById("noticeCopyAccountButton");
    if(b) b.addEventListener("click",copyAccountNumber);
  });
})();


/* =========================================================
   V3.22 수령인 이름 우선 입금대조 + 주문서 속도개선 유지
   - 암호 제거 XLSX/XLS 파일만 사용
   - 이름 + 금액이 유일하게 정확히 일치할 때만 자동일치
   - 자동일치 일괄 입금완료
========================================================= */
let bankMatchFiles = [];
let bankMatchOrders = [];
let bankMatchTransactions = [];
let bankMatchResult = { matched: [], review: [], unpaid: [], orphan: [] };
let bankMatchInitialized = false;

function initBankMatchPage() {
  if (bankMatchInitialized) return;
  const input = document.getElementById("bankFileInput");
  const pick = document.getElementById("bankFileButton");
  const start = document.getElementById("bankMatchStartButton");
  const reset = document.getElementById("bankMatchResetButton");
  const bulk = document.getElementById("bankBulkPaidButton");
  if (!input || !pick || !start || !reset || !bulk) return;

  bankMatchInitialized = true;
  pick.addEventListener("click", function(){ input.click(); });
  input.addEventListener("change", function(){
    bankMatchFiles = Array.from(input.files || []);
    renderBankSelectedFiles();
    start.disabled = bankMatchFiles.length === 0;
  });
  start.addEventListener("click", startBankReconciliation);
  reset.addEventListener("click", resetBankReconciliation);
  bulk.addEventListener("click", bulkCompleteBankMatches);
}

async function loadBankMatchOrders() {
  try {
    const data = await apiGet({ action: "adminOrders", startDate: "", endDate: "", search: "" });
    bankMatchOrders = Array.isArray(data.orders) ? data.orders : [];
  } catch (error) {
    console.error(error);
    const notice = document.getElementById("bankMatchNotice");
    if (notice) notice.textContent = "고객주문을 불러오지 못했습니다: " + error.message;
  }
}

function renderBankSelectedFiles() {
  const box = document.getElementById("bankSelectedFiles");
  if (!box) return;
  if (!bankMatchFiles.length) {
    box.textContent = "선택된 파일이 없습니다.";
    return;
  }
  box.innerHTML = bankMatchFiles.map(function(file){
    return '<span class="bank-file-chip">📄 ' + escapeHtml(file.name) + '</span>';
  }).join("");
}

function resetBankReconciliation() {
  const input = document.getElementById("bankFileInput");
  if (input) input.value = "";
  bankMatchFiles = [];
  bankMatchTransactions = [];
  bankMatchResult = { matched: [], review: [], unpaid: [], orphan: [] };
  renderBankSelectedFiles();
  document.getElementById("bankMatchStartButton").disabled = true;
  renderBankMatchResults();
  const notice = document.getElementById("bankMatchNotice");
  if (notice) {
    notice.className = "bankmatch-notice";
    notice.textContent = "은행 파일을 선택한 뒤 자동대조 시작을 눌러주세요.";
  }
}

function normalizeBankName(value) {
  return String(value == null ? "" : value)
    .toLowerCase()
    .replace(/\(주\)|주식회사|유한회사/g, "")
    .replace(/[^0-9a-z가-힣]/g, "");
}

function bankNameVariants(value) {
  const raw = String(value == null ? "" : value).trim();
  const parts = [raw];
  raw.split(/[\/|,]/).forEach(function(part){ parts.push(part); });
  const paren = raw.match(/\(([^)]+)\)/g) || [];
  paren.forEach(function(v){ parts.push(v.replace(/[()]/g, "")); });
  return Array.from(new Set(parts.map(normalizeBankName).filter(Boolean)));
}

function parseBankAmount(value) {
  if (typeof value === "number") return Math.round(value);
  return Math.round(Number(String(value || "0").replace(/[^0-9.-]/g, "")) || 0);
}

function normalizeHeader(value) {
  return String(value == null ? "" : value).replace(/\s+/g, "").trim();
}

/* V3.21
   은행 거래내역 자동대조 규칙
   - 고객주문 F열 = 수령인 / B열 = 입금금액
   - 은행 엑셀 C열(index 2) = 입금자명 / G열(index 6) = 입금금액
   - 헤더 이름이나 시작 행을 추측하지 않습니다. 전체 행 중 C열 이름 + G열 양수 금액이 있는 행만 거래로 읽습니다.
   - D열에 '출금'이 명시된 행은 제외합니다.
*/
function detectBankFromRows(rows, fileName) {
  const flat=(rows||[]).slice(0,20).flat().map(function(v){return String(v||"")}).join(" ");
  const name=String(fileName||"");
  if(/토스|toss/i.test(flat+" "+name))return "토스뱅크";
  if(/하나|hana/i.test(flat+" "+name))return "하나은행";
  return "은행";
}

function parseFixedCGTransactions(rows,fileName){
  const bank=detectBankFromRows(rows,fileName);
  const txs=[];
  (rows||[]).forEach(function(row,r){
    row=row||[];
    const depositor=String(row[2]==null?"":row[2]).trim(); // C열
    const amount=parseBankAmount(row[6]);                    // G열
    const typeText=String(row[3]==null?"":row[3]).replace(/\s+/g,"").trim(); // D열(있을 때만 참고)
    const time=String(row[1]||row[0]||"").trim();

    if(!depositor||amount<=0)return;
    if(/출금|이체출금|지급/.test(typeText))return;
    const normalized=normalizeBankName(depositor);
    if(!normalized||["적요","수령인","입금자명","입금자","의뢰인수취인","성명","계좌번호","조회기간"].includes(normalized))return;

    txs.push({bank:bank,time:time,depositor:depositor,names:bankNameVariants(depositor),amount:amount,fileName:fileName,sourceRow:r+1});
  });
  return txs;
}

function findBankHeader(rows) {
  // V3.18 호환용: 화면/기존 코드에서 호출될 수 있으므로 남겨두되,
  // 실제 거래 파싱은 C열/G열 고정 방식으로 수행합니다.
  for (let i = 0; i < Math.min((rows || []).length, 40); i++) {
    const h = (rows[i] || []).map(normalizeHeader);
    if (h.some(function(x){ return x === "거래일시" || x === "거래일시"; }) || h.includes("적요")) {
      return { bank: detectBankFromRows(rows, ""), row: i, headers: h };
    }
  }
  return { bank: detectBankFromRows(rows, ""), row: -1, headers: [] };
}

function parseBankSheetRows(rows, fileName) {
  const txs = parseFixedCGTransactions(rows, fileName);
  if (!txs.length) {
    throw new Error(fileName + ": C열에 입금자명, G열에 입금금액이 있는 행을 찾지 못했습니다. 암호를 제거한 엑셀인지 확인해주세요.");
  }
  return txs;
}

async function readBankFile(file) {
  if (!window.XLSX) throw new Error("엑셀 읽기 프로그램을 불러오지 못했습니다. 인터넷 연결 후 관리자페이지를 새로고침해주세요.");
  let buffer;
  try {
    buffer = await file.arrayBuffer();
  } catch (error) {
    throw new Error(file.name + ": 파일을 읽지 못했습니다.");
  }
  let workbook;
  try {
    workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  } catch (error) {
    throw new Error(file.name + ": 파일을 열 수 없습니다. 은행 엑셀의 비밀번호를 제거한 뒤 다시 저장해주세요.");
  }
  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: false, defval: "" });
    const txs = parseFixedCGTransactions(rows, file.name);
    if (txs.length) return txs;
  }
  throw new Error(file.name + ": C열에 입금자명, G열에 입금금액이 있는 행을 찾지 못했습니다. 파일을 확인해주세요.");
}

function buildOutstandingGroups(orders) {
  const groups = new Map();
  (orders || []).forEach(function(order){
    if (String(order.paymentStatus || "") !== "미입금") return;
    const phone = String(order.phone || "").replace(/[^0-9]/g, "");
    // V3.20: 입금 자동대조 이름 기준은 고객주문 F열 수령인 ↔ 은행 엑셀 C열 입금자명입니다.
    // 닉네임은 자동일치에 절대 사용하지 않습니다.
    const receiver = String(order.receiverName || "").trim();
    const receiverNormalized = normalizeBankName(receiver);
    if (!receiverNormalized || !phone) return;
    const key = receiverNormalized + "|" + phone;
    if (!groups.has(key)) {
      groups.set(key, {
        key: key,
        receiverName: receiver,
        receiverNormalized: receiverNormalized,
        nickname: String(order.nickname || "").trim(),
        phone: order.phone || "",
        amount: 0,
        rows: [],
        orderNumbers: [],
        orderCount: 0
      });
    }
    const g = groups.get(key);
    g.amount += Number(order.paymentAmount || 0);
    g.rows.push(Number(order.rowNumber));
    g.orderNumbers.push(String(order.orderNumber || ""));
    g.orderCount += 1;
  });
  return Array.from(groups.values()).filter(function(g){ return g.amount > 0 && g.rows.length; });
}

function namesIntersect(group, tx) {
  // V3.20: 은행 엑셀 C열 입금자명과 고객주문 F열 수령인이 공백/특수문자를 제외하고 정확히 같을 때만 이름 일치.
  // 예: F열 '김미자' ↔ 은행 '김미자' = 일치
  //     F열 '민지선' ↔ 은행 '민지선COCO002' = 자동일치 아님(확인필요)
  return (tx.names || []).some(function(n){ return n === group.receiverNormalized; });
}

function bankNameRelated(group, tx) {
  const g = group.receiverNormalized || "";
  if (!g) return false;
  return (tx.names || []).some(function(n){
    if (!n) return false;
    if (n === g) return true;
    // 실제 은행 적요에 이름 뒤 닉네임/문자가 붙는 경우는 자동완료하지 않고 관련 후보로만 표시
    return (g.length >= 2 && n.indexOf(g) >= 0) || (n.length >= 2 && g.indexOf(n) >= 0);
  });
}

function reconcileBankData(groups, transactions) {
  const usedTx = new Set();
  const referencedTx = new Set();
  const matchedGroup = new Set();
  const matched = [];
  const review = [];

  /* V3.22 핵심 규칙
     1) 고객주문 F열 수령인 이름을 은행 C열 입금자명에서 먼저 찾습니다.
     2) 이름이 정확히 같고 금액도 같으면 자동일치.
     3) 이름이 정확히 같지만 금액이 다르면 절대 미입금으로 보내지 않고 확인필요.
     4) 같은 이름으로 여러 번 입금했다면 합계가 주문금액과 같을 때도 자동일치 후보로 처리.
     5) 이름 뒤에 문자/닉네임이 붙은 경우는 확인필요.
     6) 이름 자체를 전혀 찾지 못했을 때만 미입금.
  */

  groups.forEach(function(group, gi){
    const available = transactions.map(function(tx, ti){ return {tx:tx, ti:ti}; })
      .filter(function(x){ return !usedTx.has(x.ti); });

    // A. 수령인 이름이 은행 입금자명과 정확히 같은 거래를 가장 먼저 찾습니다.
    const exactName = available.filter(function(x){ return namesIntersect(group, x.tx); });

    if (exactName.length) {
      // A-1. 정확한 이름 + 정확한 금액 한 건이면 자동일치
      const exactAmount = exactName.filter(function(x){ return x.tx.amount === group.amount; });
      if (exactAmount.length === 1) {
        const candidate = exactAmount[0];
        const competing = groups.filter(function(other, oi){
          return oi !== gi && !matchedGroup.has(oi) && other.amount === candidate.tx.amount && namesIntersect(other, candidate.tx);
        });
        if (competing.length === 0) {
          matched.push({ group: group, tx: candidate.tx, txIndexes: [candidate.ti] });
          usedTx.add(candidate.ti);
          referencedTx.add(candidate.ti);
          matchedGroup.add(gi);
          return;
        }
      }

      // A-2. 같은 이름으로 여러 번 나눠 입금한 합계가 주문금액과 같으면 자동일치
      const exactNameTotal = exactName.reduce(function(sum, x){ return sum + Number(x.tx.amount || 0); }, 0);
      if (exactName.length > 1 && exactNameTotal === group.amount) {
        const combinedTx = {
          bank: Array.from(new Set(exactName.map(function(x){ return x.tx.bank; }))).join(" + "),
          time: exactName.map(function(x){ return x.tx.time; }).filter(Boolean).join(" / "),
          depositor: exactName[0].tx.depositor,
          names: exactName[0].tx.names,
          amount: exactNameTotal,
          fileName: exactName.map(function(x){ return x.tx.fileName; }).filter(Boolean).join(" / "),
          sourceRow: exactName.map(function(x){ return x.tx.sourceRow; }).join(",")
        };
        matched.push({ group: group, tx: combinedTx, txIndexes: exactName.map(function(x){ return x.ti; }) });
        exactName.forEach(function(x){ usedTx.add(x.ti); referencedTx.add(x.ti); });
        matchedGroup.add(gi);
        return;
      }

      // A-3. 이름은 찾았지만 금액이 다르면 반드시 확인필요
      exactName.sort(function(a,b){
        return Math.abs(group.amount - a.tx.amount) - Math.abs(group.amount - b.tx.amount);
      });
      const candidate = exactName[0];
      referencedTx.add(candidate.ti);
      review.push({
        group: group,
        tx: candidate.tx,
        reason: exactName.length > 1
          ? "수령인 이름 일치 · 입금 여러 건/금액 확인"
          : "수령인 이름 일치 · 금액 다름"
      });
      return;
    }

    // B. 정확한 이름은 아니지만 '민지선COCO002'처럼 이름이 포함된 거래는 확인필요
    const relatedName = available.filter(function(x){ return bankNameRelated(group, x.tx); });
    if (relatedName.length) {
      relatedName.sort(function(a,b){
        const ae = a.tx.amount === group.amount ? 0 : 1;
        const be = b.tx.amount === group.amount ? 0 : 1;
        if (ae !== be) return ae - be;
        return Math.abs(group.amount-a.tx.amount)-Math.abs(group.amount-b.tx.amount);
      });
      const candidate = relatedName[0];
      referencedTx.add(candidate.ti);
      review.push({
        group: group,
        tx: candidate.tx,
        reason: candidate.tx.amount === group.amount
          ? "입금자명에 수령인 포함 · 금액 일치"
          : "입금자명에 수령인 포함 · 금액 확인"
      });
      return;
    }

    // C. 이름은 전혀 없지만 금액이 같은 거래가 있으면 잘못 자동처리하지 않고 후보로 표시
    const sameAmount = available.filter(function(x){ return x.tx.amount === group.amount; });
    if (sameAmount.length) {
      const candidate = sameAmount[0];
      referencedTx.add(candidate.ti);
      review.push({ group: group, tx: candidate.tx, reason: "금액 일치 · 입금자명 다름" });
      return;
    }
  });

  const unpaid = groups.filter(function(group, gi){
    if (matchedGroup.has(gi)) return false;
    return !review.some(function(x){ return x.group.key === group.key; });
  });

  // 현재 미입금 주문과 이름 또는 금액이 관련된 미사용 거래만 표시합니다.
  const orphan = transactions.map(function(tx,ti){ return {tx:tx,ti:ti}; }).filter(function(x){
    if (usedTx.has(x.ti) || referencedTx.has(x.ti)) return false;
    return groups.some(function(group){ return bankNameRelated(group,x.tx) || x.tx.amount === group.amount; });
  }).map(function(x){ return x.tx; });

  return { matched: matched, review: review, unpaid: unpaid, orphan: orphan };
}

async function startBankReconciliation() {
  if (!bankMatchFiles.length) {
    alert("먼저 토스뱅크 또는 하나은행 엑셀 파일을 선택해주세요.");
    return;
  }
  showLoading("은행 입금내역과 미입금 주문을 자동대조하는 중입니다.");
  try {
    if (!bankMatchOrders.length) await loadBankMatchOrders();
    const all = [];
    for (const file of bankMatchFiles) {
      const txs = await readBankFile(file);
      all.push.apply(all, txs);
    }
    bankMatchTransactions = all;
    const groups = buildOutstandingGroups(bankMatchOrders);
    bankMatchResult = reconcileBankData(groups, all);
    renderBankMatchResults();
    const banks = Array.from(new Set(all.map(function(tx){ return tx.bank; }))).join(" + ") || "은행";
    const notice = document.getElementById("bankMatchNotice");
    notice.className = "bankmatch-notice success";
    notice.textContent = banks + " 입금 " + all.length + "건과 현재 미입금 고객 " + groups.length + "명을 비교했습니다. 수령인 이름을 먼저 찾습니다. 이름+금액 일치는 자동일치, 이름은 같고 금액이 다르면 확인필요로 표시됩니다.";
  } catch (error) {
    const notice = document.getElementById("bankMatchNotice");
    notice.className = "bankmatch-notice warning";
    notice.textContent = error.message;
    alert(error.message);
  } finally {
    hideLoading();
  }
}

function renderBankMatchResults() {
  const r = bankMatchResult || {matched:[],review:[],unpaid:[],orphan:[]};
  document.getElementById("bankMatchedCount").textContent = r.matched.length;
  document.getElementById("bankReviewCount").textContent = r.review.length;
  document.getElementById("bankUnpaidCount").textContent = r.unpaid.length;
  document.getElementById("bankOrphanCount").textContent = r.orphan.length;
  document.getElementById("bankBulkPaidButton").disabled = r.matched.length === 0;

  const matched = document.getElementById("bankMatchedList");
  matched.innerHTML = r.matched.length ? r.matched.map(function(x, i){
    return `<tr><td>${escapeHtml(x.group.nickname)}</td><td>${escapeHtml(x.group.receiverName)}</td><td>${x.group.orderCount}건</td><td>${money(x.group.amount)}</td><td>${escapeHtml(x.tx.depositor)}</td><td>${money(x.tx.amount)}</td><td>${escapeHtml(x.tx.bank)}</td><td>${escapeHtml(x.tx.time)}</td><td><button type="button" class="btn btn-primary bank-confirm-btn" onclick="confirmSingleBankMatch('matched', ${i})">입금확인</button></td></tr>`;
  }).join("") : '<tr><td colspan="9" class="empty-cell">자동일치 결과가 없습니다.</td></tr>';

  const review = document.getElementById("bankReviewList");
  review.innerHTML = r.review.length ? r.review.map(function(x, i){
    const diff = x.tx.amount - x.group.amount;
    return `<tr><td>${escapeHtml(x.group.nickname)}</td><td>${escapeHtml(x.group.receiverName)}</td><td>${money(x.group.amount)}</td><td>${escapeHtml(x.tx.depositor)}</td><td>${money(x.tx.amount)}</td><td>${diff === 0 ? "0원" : (diff > 0 ? "+" : "") + money(diff)}</td><td>${escapeHtml(x.reason)}<div class="match-reason">${escapeHtml(x.tx.bank)} ${escapeHtml(x.tx.time)}</div></td><td><button type="button" class="btn btn-outline bank-confirm-btn" onclick="confirmSingleBankMatch('review', ${i})">직접 입금확인</button></td></tr>`;
  }).join("") : '<tr><td colspan="8" class="empty-cell">확인필요 결과가 없습니다.</td></tr>';

  const unpaid = document.getElementById("bankUnpaidList");
  unpaid.innerHTML = r.unpaid.length ? r.unpaid.map(function(g, i){
    return `<tr><td>${escapeHtml(g.nickname)}</td><td>${escapeHtml(g.receiverName)}</td><td>${escapeHtml(g.phone)}</td><td>${g.orderCount}건</td><td>${money(g.amount)}</td><td><button type="button" class="btn btn-danger bank-cancel-btn" onclick="cancelUnpaidBankGroup(${i})">주문취소</button></td></tr>`;
  }).join("") : '<tr><td colspan="6" class="empty-cell">미입금 결과가 없습니다.</td></tr>';

  const orphan = document.getElementById("bankOrphanList");
  orphan.innerHTML = r.orphan.length ? r.orphan.map(function(tx){
    return `<tr><td>${escapeHtml(tx.bank)}</td><td>${escapeHtml(tx.time)}</td><td>${escapeHtml(tx.depositor)}</td><td>${money(tx.amount)}</td></tr>`;
  }).join("") : '<tr><td colspan="4" class="empty-cell">미매칭 은행 입금이 없습니다.</td></tr>';
}

async function cancelUnpaidBankGroup(index) {
  const g = (bankMatchResult.unpaid || [])[index];
  if (!g) return;

  const detail =
    "닉네임: " + (g.nickname || "-") + "\n" +
    "수령인: " + (g.receiverName || "-") + "\n" +
    "주문: " + g.orderCount + "건\n" +
    "입금예정액: " + money(g.amount) + "\n\n" +
    "이 미입금 주문을 취소할까요?\n" +
    "고객주문에서는 삭제되고 취소주문 시트로 이동합니다.\n" +
    "거래처발주와 3PL출고도 남은 주문 기준으로 다시 계산됩니다.";
  if (!confirm(detail)) return;

  const reasonInput = prompt("취소 사유를 입력해주세요.", "미입금취소");
  if (reasonInput === null) return;
  const reason = String(reasonInput || "미입금취소").trim() || "미입금취소";
  const rows = Array.from(new Set((g.rows || []).filter(function(row){ return Number(row) >= 2; })));
  const orderNumbers = Array.from(new Set((g.orderNumbers || []).filter(Boolean)));

  showLoading("미입금 주문을 취소주문 시트로 이동하는 중입니다.");
  try {
    const result = await apiPost({
      action: "cancelUnpaidOrders",
      rowNumbers: rows,
      orderNumbers: orderNumbers,
      reason: reason
    });
    alert((result && result.message) || "미입금 주문을 취소했습니다.");
    await loadBankMatchOrders();
    const groups = buildOutstandingGroups(bankMatchOrders);
    bankMatchResult = reconcileBankData(groups, bankMatchTransactions);
    renderBankMatchResults();
    const notice = document.getElementById("bankMatchNotice");
    if (notice) {
      notice.className = "bankmatch-notice success";
      notice.textContent = (g.nickname || g.receiverName) + " 고객의 미입금 주문을 취소주문 시트로 이동했습니다.";
    }
  } catch (error) {
    alert(error.message);
  } finally {
    hideLoading();
  }
}

async function confirmSingleBankMatch(type, index) {
  const list = type === "review" ? (bankMatchResult.review || []) : (bankMatchResult.matched || []);
  const item = list[index];
  if (!item || !item.group) return;

  const g = item.group;
  const tx = item.tx || {};
  const isReview = type === "review";
  const warning = isReview
    ? "\n\n⚠ 확인필요 건입니다. 주문금액과 입금자/입금금액을 직접 확인한 경우에만 진행해주세요."
    : "";
  const message =
    g.nickname + " / " + g.receiverName + "\n" +
    "주문 " + g.orderCount + "건 · 입금예정 " + money(g.amount) + "\n" +
    "은행입금 " + escapeTextForConfirm(tx.depositor) + " · " + money(tx.amount || 0) +
    (tx.bank ? " · " + tx.bank : "") +
    "\n\n이 고객의 관련 주문을 모두 입금완료로 변경할까요?" + warning;
  if (!confirm(message)) return;

  const rows = Array.from(new Set((g.rows || []).filter(function(row){ return Number(row) >= 2; })));
  const orderNumbers = Array.from(new Set((g.orderNumbers || []).filter(Boolean)));
  if (!rows.length && !orderNumbers.length) {
    alert("처리할 주문을 찾지 못했습니다.");
    return;
  }

  showLoading("입금확인 처리 중입니다.");
  try {
    const result = await apiPost({
      action: "bulkUpdatePaymentStatus",
      rowNumbers: rows,
      orderNumbers: orderNumbers,
      paymentStatus: "입금완료"
    });
    alert((result && result.message) || "입금완료 처리했습니다.");
    await loadBankMatchOrders();
    const groups = buildOutstandingGroups(bankMatchOrders);
    bankMatchResult = reconcileBankData(groups, bankMatchTransactions);
    renderBankMatchResults();
    const notice = document.getElementById("bankMatchNotice");
    if (notice) {
      notice.className = "bankmatch-notice success";
      notice.textContent = g.nickname + " 고객의 입금확인이 완료되었습니다.";
    }
  } catch (error) {
    alert(error.message);
  } finally {
    hideLoading();
  }
}

function escapeTextForConfirm(value) {
  return String(value == null ? "" : value).replace(/[\r\n]+/g, " ").trim();
}

async function bulkCompleteBankMatches() {
  const matched = bankMatchResult.matched || [];
  if (!matched.length) return;
  const rows = [];
  const orderNumbers = [];
  matched.forEach(function(x){
    x.group.rows.forEach(function(row){ rows.push(row); });
    x.group.orderNumbers.forEach(function(no){ if (no) orderNumbers.push(no); });
  });
  const uniqueRows = Array.from(new Set(rows)).filter(function(row){ return row >= 2; });
  const uniqueOrderNumbers = Array.from(new Set(orderNumbers));
  if (!uniqueRows.length && !uniqueOrderNumbers.length) return;
  if (!confirm("자동일치 " + matched.length + "명의 주문 " + Math.max(uniqueRows.length, uniqueOrderNumbers.length) + "건을 모두 입금완료로 변경할까요?\n\n이름과 금액이 정확히 일치한 고객만 처리됩니다.")) return;

  showLoading("자동일치 주문을 한 번에 입금완료 처리하는 중입니다.");
  try {
    const result = await apiPost({ action: "bulkUpdatePaymentStatus", rowNumbers: uniqueRows, orderNumbers: uniqueOrderNumbers, paymentStatus: "입금완료" });
    alert((result && result.message) || (matched.length + "명의 주문을 입금완료 처리했습니다."));
    await loadBankMatchOrders();
    // 처리한 입금거래는 화면상 완료로 간주하여 다시 현재 미입금과 대조
    const groups = buildOutstandingGroups(bankMatchOrders);
    bankMatchResult = reconcileBankData(groups, bankMatchTransactions);
    renderBankMatchResults();
    const notice = document.getElementById("bankMatchNotice");
    notice.className = "bankmatch-notice success";
    notice.textContent = "자동일치 입금완료 처리가 끝났습니다. 남은 확인필요/미입금 고객만 확인해주세요.";
  } catch (error) {
    alert(error.message);
  } finally {
    hideLoading();
  }
}
