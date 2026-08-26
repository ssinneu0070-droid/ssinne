// V4.00 - 수령인+닉네임 포함 자동일치 / 분할입금 조합합산 / 부족·초과 / 중복입금 방지
// V3.30 - 입금 자동대조 시 수령인 + 닉네임 함께 조회
// V3.29 - 단일 script.js 운영 + 토스뱅크/하나은행 통합 입금대조 + 입금완료 2차 재검사
// V3.24 - 현재 주문 새로고침 / 한글이름 포함대조 / 대조기준 표시
/*
  씬느샵 공통 설정
  아래 3개 주소만 실제 주소로 바꾸세요.
*/
const CONFIG = {
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbwObiO2MpJk7xOKwmSWgBevZQH5NXnoU8EA-oZ6lH4lg9Rzkf3PEj_J6MGPvTuymkae/exec",
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
  const archiveBtn = document.getElementById("archiveHistoryButton");
  if (archiveBtn) archiveBtn.addEventListener("click", archiveCurrentOrders);

  const fillLegacyBtn = document.getElementById("fillLegacyOrderNumbersButton");
  if (fillLegacyBtn) fillLegacyBtn.addEventListener("click", fillLegacyOrderNumbers);

  const lotteExcelBtn = document.getElementById("lotteExcelButtonV415");
  if (lotteExcelBtn) lotteExcelBtn.addEventListener("click", downloadLotteExcelV415);
  const lotteTrackingBtn = document.getElementById("lotteTrackingButton");
  const lotteTrackingFile = document.getElementById("lotteTrackingFile");
  if (lotteTrackingBtn && lotteTrackingFile) {
    lotteTrackingBtn.addEventListener("click", function(){ lotteTrackingFile.value = ""; lotteTrackingFile.click(); });
    lotteTrackingFile.addEventListener("change", uploadLotteTrackingResult);
  }

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


async function ensureBackendV414() {
  const info = await apiGet({ action: "systemInfo", _ts: Date.now() });
  const version = String(info && info.version || "");
  if (version.indexOf("V4.14") !== 0) {
    throw new Error("Apps Script 서버가 아직 V4.14가 아닙니다.\n현재 서버: " + (version || "확인불가") + "\n\n새 Code.gs로 교체한 뒤 Apps Script에서 [배포 > 배포 관리 > 수정 > 새 버전]으로 다시 배포해주세요.");
  }
  return info;
}

async function fillLegacyOrderNumbers() {
  const btn = document.getElementById("fillLegacyOrderNumbersButton");
  if (!confirm("빈 주문번호와 LEGACY-/OLD- 주문번호를 YYMMDD-0001 형식으로 통일할까요?\n\n이미 표준 형식인 주문번호는 변경하지 않습니다.")) return;
  if (btn) btn.disabled = true;
  showLoading("기존 주문번호를 표준 형식으로 확인하고 있습니다.");
  try {
    await ensureBackendV414();
    const result = await apiPost({ action: "fillLegacyOrderNumbers" });
    let message = result.message || "기존 주문번호 자동생성이 완료되었습니다.";
    if (result.bySheet) {
      message += "\n\n고객주문: " + (result.bySheet["고객주문"] || 0) + "건" +
                 "\n3PL출고: " + (result.bySheet["3PL출고"] || 0) + "건" +
                 "\n전체주문이력: " + (result.bySheet["전체주문이력"] || 0) + "건";
    }
    alert(message);
    try { await searchAdminOrders(); } catch (e) {}
  } catch (error) {
    alert("기존 주문번호 자동생성 오류: " + (error.message || error));
  } finally {
    hideLoading();
    if (btn) btn.disabled = false;
  }
}

async function archiveCurrentOrders() {
  const btn = document.getElementById("archiveHistoryButton");
  if (btn) btn.disabled = true;
  showLoading("전체주문이력에 저장 중입니다. 잠시만 기다려주세요.");
  try {
    const result = await apiPost({ action: "archiveCurrentOrders" });
    hideLoading();
    alert(result.message || "전체주문이력 저장이 완료되었습니다.");
  } catch (error) {
    hideLoading();
    alert("전체주문이력 저장 중 오류: " + (error.message || error));
  } finally {
    if (btn) btn.disabled = false;
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
let bankPaidAuditResult = { ok: [], review: [], error: [] };
let bankMatchInitialized = false;
// V4.00: 현재 화면에서 이미 입금완료 처리에 사용한 은행 거래를 다시 쓰지 않도록 기억합니다.
let bankConsumedTransactionKeys = new Set();

function bankTransactionKey(tx) {
  tx = tx || {};
  return [
    tx.bank || "", tx.fileName || "", tx.sourceRow || "", tx.time || "",
    normalizeBankName(tx.depositor || ""), Number(tx.amount || 0)
  ].join("|");
}

function markBankTransactionsConsumed(indexes) {
  (indexes || []).forEach(function(i){
    const tx = bankMatchTransactions[Number(i)];
    if (tx) bankConsumedTransactionKeys.add(bankTransactionKey(tx));
  });
}


function initBankMatchPage() {
  if (bankMatchInitialized) return;
  const input = document.getElementById("bankFileInput");
  const pick = document.getElementById("bankFileButton");
  const start = document.getElementById("bankMatchStartButton");
  const reset = document.getElementById("bankMatchResetButton");
  const bulk = document.getElementById("bankBulkPaidButton");
  const reviewBulk = document.getElementById("bankReviewBulkPaidButton");
  const reviewSelectAll = document.getElementById("bankReviewSelectAll");
  const paidAudit = document.getElementById("bankPaidAuditButton");
  if (!input || !pick || !start || !reset || !bulk) return;

  bankMatchInitialized = true;
  pick.addEventListener("click", function(){ input.click(); });
  input.addEventListener("change", function(){
    bankMatchFiles = Array.from(input.files || []);
    renderBankSelectedFiles();
    start.disabled = bankMatchFiles.length === 0;
    if (paidAudit) paidAudit.disabled = bankMatchFiles.length === 0;
  });
  start.addEventListener("click", startBankReconciliation);
  reset.addEventListener("click", resetBankReconciliation);
  bulk.addEventListener("click", bulkCompleteBankMatches);
  if (paidAudit) paidAudit.addEventListener("click", startPaidOrderAudit);
  if (reviewBulk) reviewBulk.addEventListener("click", bulkCompleteSelectedBankReviews);
  if (reviewSelectAll) reviewSelectAll.addEventListener("change", function(){
    document.querySelectorAll(".bank-review-check").forEach(function(cb){ cb.checked = reviewSelectAll.checked; });
    updateBankReviewBulkButton();
  });
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
  bankConsumedTransactionKeys.clear();
  bankMatchResult = { matched: [], review: [], unpaid: [], orphan: [] };
  bankPaidAuditResult = { ok: [], review: [], error: [] };
  renderBankSelectedFiles();
  document.getElementById("bankMatchStartButton").disabled = true;
  const paidAuditButton = document.getElementById("bankPaidAuditButton");
  if (paidAuditButton) paidAuditButton.disabled = true;
  renderBankMatchResults();
  renderPaidAuditResults();
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

/* V3.25
   토스뱅크 + 하나은행 통합 거래내역 파서
   - 토스뱅크: C열(index 2)=입금자명, D열=거래유형, G열(index 6)=거래금액
   - 하나은행: B열(index 1)=적요(우선 이름), C열(index 2)=의뢰인/수취인(보조 이름),
                D열(index 3)=입금액, E열(index 4)=출금액
   - 파일 상단 제목/계좌정보/조회기간/빈 행은 자동 제외합니다.
*/
function detectBankFromRows(rows, fileName) {
  const flat=(rows||[]).slice(0,25).flat().map(function(v){return String(v||"")}).join(" ");
  const source=flat+" "+String(fileName||"");
  if(/토스뱅크|toss/i.test(source)) return "토스뱅크";
  if(/하나은행|hana|예금주명|의뢰인\/수취인|거래후잔액/i.test(source)) return "하나은행";
  return "은행";
}

function validBankPersonName(value){
  const raw=String(value==null?"":value).trim();
  if(!raw)return false;
  const n=normalizeBankName(raw);
  if(!n)return false;
  const blocked=[
    "적요","수령인","입금자명","입금자","의뢰인수취인","성명","계좌번호","조회기간",
    "거래일시","거래유형","거래기관","거래금액","거래후잔액","입금액","출금액","구분","거래점"
  ];
  return blocked.indexOf(n)<0;
}

function uniqueBankNames(values){
  const out=[];
  (values||[]).forEach(function(v){
    String(v==null?"":v).split(/[|]/).forEach(function(piece){
      const raw=piece.trim();
      if(!validBankPersonName(raw))return;
      bankNameVariants(raw).forEach(function(n){
        if(n && out.indexOf(n)<0)out.push(n);
      });
      const normalized=normalizeBankName(raw);
      if(normalized && out.indexOf(normalized)<0)out.push(normalized);
    });
  });
  return out;
}

function findHeaderIndex(headers, candidates){
  const normalized=(headers||[]).map(normalizeHeader);
  for(const name of candidates){
    const idx=normalized.indexOf(normalizeHeader(name));
    if(idx>=0)return idx;
  }
  return -1;
}

function findTossHeaderRow(rows){
  for(let i=0;i<Math.min((rows||[]).length,50);i++){
    const h=(rows[i]||[]).map(normalizeHeader);
    if(h.includes("거래일시") && h.includes("적요") && h.includes("거래유형") && h.includes("거래금액")){
      return {row:i, headers:rows[i]||[]};
    }
  }
  return null;
}

function parseTossTransactions(rows,fileName){
  const txs=[];
  const found=findTossHeaderRow(rows);

  // 토스 엑셀은 실제 워크시트 사용범위가 B열부터 시작할 수 있습니다.
  // SheetJS는 이 경우 B열을 배열 index 0으로 반환하므로 C/G 고정 index를 쓰면 한 칸씩 어긋납니다.
  // 따라서 제목행의 이름으로 실제 열 위치를 찾아 읽습니다.
  if(found){
    const depositorIdx=findHeaderIndex(found.headers,["적요","입금자명","입금자"]);
    const typeIdx=findHeaderIndex(found.headers,["거래 유형","거래유형","구분"]);
    const amountIdx=findHeaderIndex(found.headers,["거래 금액","거래금액","입금액"]);
    const timeIdx=findHeaderIndex(found.headers,["거래 일시","거래일시","거래일자"]);

    for(let r=found.row+1;r<(rows||[]).length;r++){
      const row=rows[r]||[];
      const depositor=String(depositorIdx>=0 && row[depositorIdx]!=null?row[depositorIdx]:"").trim();
      const typeText=String(typeIdx>=0 && row[typeIdx]!=null?row[typeIdx]:"").replace(/\s+/g,"").trim();
      const amount=parseBankAmount(amountIdx>=0?row[amountIdx]:"");
      const time=String(timeIdx>=0 && row[timeIdx]!=null?row[timeIdx]:"").trim();
      if(!validBankPersonName(depositor)||amount<=0)continue;
      if(typeText && !/입금/.test(typeText))continue;
      txs.push({bank:"토스뱅크",time:time,depositor:depositor,secondaryDepositor:"",names:uniqueBankNames([depositor]),amount:amount,fileName:fileName,sourceRow:r+1});
    }
    return txs;
  }

  // 구형/변형 파일 fallback: 시작열 차이를 고려해 두 패턴 모두 시험합니다.
  const patterns=[{name:2,type:3,amount:6,time:1},{name:1,type:2,amount:5,time:0}];
  patterns.forEach(function(pat){
    (rows||[]).forEach(function(row,r){
      row=row||[];
      const depositor=String(row[pat.name]==null?"":row[pat.name]).trim();
      const typeText=String(row[pat.type]==null?"":row[pat.type]).replace(/\s+/g,"").trim();
      const amount=parseBankAmount(row[pat.amount]);
      const time=String(row[pat.time]||"").trim();
      if(!validBankPersonName(depositor)||amount<=0)return;
      if(typeText && !/입금/.test(typeText))return;
      const key=[time,depositor,amount].join("|");
      if(txs.some(function(x){return [x.time,x.depositor,x.amount].join("|")===key;}))return;
      txs.push({bank:"토스뱅크",time:time,depositor:depositor,secondaryDepositor:"",names:uniqueBankNames([depositor]),amount:amount,fileName:fileName,sourceRow:r+1});
    });
  });
  return txs;
}

function parseHanaTransactions(rows,fileName){
  const txs=[];
  (rows||[]).forEach(function(row,r){
    row=row||[];
    const memo=String(row[1]==null?"":row[1]).trim();       // B 적요
    const counterparty=String(row[2]==null?"":row[2]).trim(); // C 의뢰인/수취인
    const deposit=parseBankAmount(row[3]); // D 입금액
    const withdrawal=parseBankAmount(row[4]); // E 출금액
    const time=String(row[0]||"").trim(); // A

    if(deposit<=0)return;
    if(withdrawal>0 && deposit<=0)return;

    const primary=validBankPersonName(memo)?memo:(validBankPersonName(counterparty)?counterparty:"");
    const names=uniqueBankNames([memo,counterparty]);
    if(!primary || !names.length)return;

    txs.push({
      bank:"하나은행",
      time:time,
      depositor:primary,
      secondaryDepositor:counterparty,
      names:names,
      amount:deposit,
      fileName:fileName,
      sourceRow:r+1
    });
  });
  return txs;
}

function parseBankTransactions(rows,fileName){
  const bank=detectBankFromRows(rows,fileName);
  if(bank==="토스뱅크")return parseTossTransactions(rows,fileName);
  if(bank==="하나은행")return parseHanaTransactions(rows,fileName);

  // 은행명이 파일에서 판별되지 않는 경우 양쪽 형식을 모두 시험하고,
  // 더 많은 유효 입금행을 읽는 형식을 선택합니다.
  const toss=parseTossTransactions(rows,fileName);
  const hana=parseHanaTransactions(rows,fileName);
  if(toss.length>=hana.length && toss.length)return toss;
  if(hana.length)return hana;
  return [];
}

function findBankHeader(rows) {
  for (let i = 0; i < Math.min((rows || []).length, 40); i++) {
    const h = (rows[i] || []).map(normalizeHeader);
    if(h.includes("거래일시") || h.includes("거래일시") || h.includes("적요")){
      return { bank:detectBankFromRows(rows,""), row:i, headers:h };
    }
  }
  return { bank:detectBankFromRows(rows,""), row:-1, headers:[] };
}

function parseBankSheetRows(rows, fileName) {
  const txs=parseBankTransactions(rows,fileName);
  if(!txs.length){
    throw new Error(
      fileName+
      ": 입금 거래를 찾지 못했습니다. 토스뱅크 또는 하나은행 거래내역의 제목행과 입금내역을 확인해주세요."
    );
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
  let best=[];
  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: false, defval: "" });
    const txs = parseBankTransactions(rows, file.name);
    if(txs.length>best.length)best=txs;
  }
  if(best.length)return best;
  throw new Error(
    file.name+
    ": 입금 거래를 찾지 못했습니다. 토스뱅크 또는 하나은행 원본 거래내역 양식을 확인해주세요."
  );
}

function buildOutstandingGroups(orders) {
  const groups = new Map();
  (orders || []).forEach(function(order){
    if (String(order.paymentStatus || "") !== "미입금") return;
    const phone = String(order.phone || "").replace(/[^0-9]/g, "");
    // V3.30: 수령인 + 닉네임을 모두 은행 입금자명과 비교합니다.
    // 같은 고객 묶음은 기존처럼 수령인+전화번호 기준으로 유지합니다.
    const receiver = String(order.receiverName || "").trim();
    const nickname = String(order.nickname || "").trim();
    const receiverNormalized = normalizeBankName(receiver);
    const nicknameNormalized = normalizeBankName(nickname);
    if (!receiverNormalized || !phone) return;
    const key = receiverNormalized + "|" + phone;
    if (!groups.has(key)) {
      groups.set(key, {
        key: key,
        receiverName: receiver,
        receiverNormalized: receiverNormalized,
        nickname: nickname,
        nicknameNormalized: nicknameNormalized,
        nicknameVariants: nicknameNormalized ? [nicknameNormalized] : [],
        phone: order.phone || "",
        amount: 0,
        rows: [],
        orderNumbers: [],
        orderCount: 0
      });
    }
    const g = groups.get(key);
    if (nicknameNormalized && g.nicknameVariants.indexOf(nicknameNormalized) < 0) g.nicknameVariants.push(nicknameNormalized);
    g.amount += Number(order.paymentAmount || 0);
    g.rows.push(Number(order.rowNumber));
    g.orderNumbers.push(String(order.orderNumber || ""));
    g.orderCount += 1;
  });
  return Array.from(groups.values()).filter(function(g){ return g.amount > 0 && g.rows.length; });
}


function buildPaidGroups(orders) {
  const groups = new Map();
  (orders || []).forEach(function(order){
    if (String(order.paymentStatus || "") !== "입금완료") return;
    const phone = String(order.phone || "").replace(/[^0-9]/g, "");
    const receiver = String(order.receiverName || "").trim();
    const nickname = String(order.nickname || "").trim();
    const receiverNormalized = normalizeBankName(receiver);
    const nicknameNormalized = normalizeBankName(nickname);
    if (!receiverNormalized || !phone) return;
    const key = receiverNormalized + "|" + phone;
    if (!groups.has(key)) {
      groups.set(key, {
        key: key,
        receiverName: receiver,
        receiverNormalized: receiverNormalized,
        nickname: nickname,
        nicknameNormalized: nicknameNormalized,
        nicknameVariants: nicknameNormalized ? [nicknameNormalized] : [],
        phone: order.phone || "",
        amount: 0,
        rows: [],
        orderNumbers: [],
        orderCount: 0
      });
    }
    const g = groups.get(key);
    if (nicknameNormalized && g.nicknameVariants.indexOf(nicknameNormalized) < 0) g.nicknameVariants.push(nicknameNormalized);
    g.amount += Number(order.paymentAmount || 0);
    g.rows.push(Number(order.rowNumber));
    g.orderNumbers.push(String(order.orderNumber || ""));
    g.orderCount += 1;
  });
  return Array.from(groups.values()).filter(function(g){ return g.amount > 0 && g.rows.length; });
}

function bankMatchSource(group, tx) {
  const txNames = (tx.names || []).slice();
  const depositorNormalized = normalizeBankName(tx.depositor || "");
  if (depositorNormalized) txNames.push(depositorNormalized);

  const receiver = group.receiverNormalized || "";
  if (receiver && txNames.some(function(n){ return n === receiver; })) return "receiver";

  const nicknames = (group.nicknameVariants || []).slice();
  if (!nicknames.length && group.nicknameNormalized) nicknames.push(group.nicknameNormalized);
  if (nicknames.some(function(nick){ return nick && txNames.some(function(n){ return n === nick; }); })) return "nickname";

  return "";
}

function namesIntersect(group, tx) {
  // V3.30: 수령인 또는 닉네임이 은행 입금자명과 정확히 같으면 이름 일치로 봅니다.
  return !!bankMatchSource(group, tx);
}

function hangulOnlyBankName(value) {
  return String(value == null ? "" : value).replace(/[^가-힣]/g, "");
}

function normalizedNameRelated(targetNormalized, targetRaw, candidateNormalized) {
  if (!targetNormalized || !candidateNormalized) return false;
  if (candidateNormalized === targetNormalized) return true;

  // 포함 비교는 2글자 이상일 때만 허용합니다.
  if (targetNormalized.length >= 2 && candidateNormalized.indexOf(targetNormalized) >= 0) return true;
  if (candidateNormalized.length >= 2 && targetNormalized.indexOf(candidateNormalized) >= 0) return true;

  const targetHangul = hangulOnlyBankName(targetRaw || targetNormalized);
  const candidateHangul = hangulOnlyBankName(candidateNormalized);
  if (targetHangul.length >= 2 && candidateHangul.indexOf(targetHangul) >= 0) return true;
  if (candidateHangul.length >= 2 && targetHangul.indexOf(candidateHangul) >= 0) return true;
  return false;
}

function bankNameRelatedSource(group, tx) {
  const candidates = (tx.names || []).slice();
  candidates.push(normalizeBankName(tx.depositor || ""));

  const receiver = group.receiverNormalized || "";
  if (receiver && candidates.some(function(n){ return normalizedNameRelated(receiver, group.receiverName || receiver, n); })) {
    return "receiver";
  }

  const nicknameRaw = String(group.nickname || "").trim();
  const nicknames = (group.nicknameVariants || []).slice();
  if (!nicknames.length && group.nicknameNormalized) nicknames.push(group.nicknameNormalized);
  if (nicknames.some(function(nick){
    return candidates.some(function(n){ return normalizedNameRelated(nick, nicknameRaw || nick, n); });
  })) return "nickname";

  return "";
}

function bankNameRelated(group, tx) {
  return !!bankNameRelatedSource(group, tx);
}

function findExactBankCombination(candidates, targetAmount, maxItems) {
  const items = (candidates || []).filter(function(x){ return Number(x.tx && x.tx.amount || 0) > 0; });
  const limit = Math.min(items.length, Number(maxItems || 10));
  if (!limit || targetAmount <= 0) return null;

  // 입금 건수가 많아도 최근 후보 위주로 최대 10건까지만 조합 검사합니다.
  const pool = items.slice(0, limit);
  let best = null;

  function dfs(pos, sum, picked) {
    if (sum === targetAmount) {
      if (!best || picked.length < best.length) best = picked.slice();
      return;
    }
    if (sum > targetAmount || pos >= pool.length) return;
    if (best && picked.length >= best.length) return;

    // 현재 거래 포함
    picked.push(pool[pos]);
    dfs(pos + 1, sum + Number(pool[pos].tx.amount || 0), picked);
    picked.pop();

    // 현재 거래 제외
    dfs(pos + 1, sum, picked);
  }

  dfs(0, 0, []);
  return best;
}

function combineBankTransactions(items) {
  const txs = (items || []).map(function(x){ return x.tx || x; });
  const total = txs.reduce(function(sum, tx){ return sum + Number(tx.amount || 0); }, 0);
  const depositors = Array.from(new Set(txs.map(function(tx){ return tx.depositor; }).filter(Boolean)));
  return {
    bank: Array.from(new Set(txs.map(function(tx){ return tx.bank; }).filter(Boolean))).join(" + "),
    time: txs.map(function(tx){ return tx.time; }).filter(Boolean).join(" / "),
    depositor: depositors.join(" + "),
    names: Array.from(new Set([].concat.apply([], txs.map(function(tx){ return tx.names || []; })))),
    amount: total,
    fileName: Array.from(new Set(txs.map(function(tx){ return tx.fileName; }).filter(Boolean))).join(" / "),
    sourceRow: txs.map(function(tx){ return tx.sourceRow; }).filter(Boolean).join(",")
  };
}

function groupCanUseTransaction(group, tx) {
  return namesIntersect(group, tx) || bankNameRelated(group, tx);
}

function transactionHasCompetingGroup(groups, matchedGroup, currentGi, tx, targetAmount) {
  return groups.some(function(other, oi){
    if (oi === currentGi || matchedGroup.has(oi)) return false;
    if (Number(other.amount || 0) !== Number(targetAmount || 0)) return false;
    return groupCanUseTransaction(other, tx);
  });
}

function reconcileBankData(groups, transactions) {
  const usedTx = new Set();
  const referencedTx = new Set();
  const matchedGroup = new Set();
  const matched = [];
  const review = [];

  /* V4.00 핵심 규칙
     1) 수령인 + 닉네임을 모두 조회합니다.
     2) 입금자명에 수령인/닉네임이 포함되고 금액까지 정확하면 자동일치합니다.
     3) 같은 고객이 여러 번 나눠 입금한 경우, 관련 입금 조합의 합계가 주문금액과 같으면 자동일치합니다.
     4) 은행 입금 한 건은 한 고객에게만 사용할 수 있습니다.
     5) 같은 입금이 여러 고객에게 걸릴 수 있으면 자동처리하지 않고 확인필요로 보냅니다.
     6) 금액이 다르면 부족/초과 금액을 확인필요에 표시합니다.
  */

  groups.forEach(function(group, gi){
    const available = transactions.map(function(tx, ti){ return {tx:tx, ti:ti}; })
      .filter(function(x){ return !usedTx.has(x.ti) && !bankConsumedTransactionKeys.has(bankTransactionKey(x.tx)); });

    const exactName = available.filter(function(x){ return namesIntersect(group, x.tx); });
    const relatedName = available.filter(function(x){ return bankNameRelated(group, x.tx); });

    // A. 정확한 이름 또는 포함 이름 + 금액 정확히 일치하는 단일 입금
    const namedExactAmount = relatedName.filter(function(x){ return Number(x.tx.amount || 0) === Number(group.amount || 0); });
    if (namedExactAmount.length) {
      const safeCandidates = namedExactAmount.filter(function(candidate){
        return !transactionHasCompetingGroup(groups, matchedGroup, gi, candidate.tx, group.amount);
      });
      if (safeCandidates.length === 1) {
        const candidate = safeCandidates[0];
        const source = bankMatchSource(group, candidate.tx) || bankNameRelatedSource(group, candidate.tx);
        matched.push({
          group: group,
          tx: candidate.tx,
          txIndexes: [candidate.ti],
          reason: (source === "nickname" ? "닉네임" : "수령인") + " 포함/일치 · 금액 일치"
        });
        usedTx.add(candidate.ti);
        referencedTx.add(candidate.ti);
        matchedGroup.add(gi);
        return;
      }
      if (!safeCandidates.length || namedExactAmount.length > 1) {
        const candidate = namedExactAmount[0];
        referencedTx.add(candidate.ti);
        review.push({
          group: group,
          tx: candidate.tx,
          txIndexes: [candidate.ti],
          reason: "중복 후보 · 같은 금액/이름의 입금이 여러 주문에 걸릴 수 있음",
          danger: true
        });
        return;
      }
    }

    // B. 여러 번 나눠 입금: 수령인/닉네임과 관련된 거래의 일부 조합 합계가 주문금액과 정확히 맞는지 검사
    // 정확히 같은 이름 거래를 우선하고, 없으면 포함 이름까지 넓혀 검사합니다.
    const comboSources = exactName.length >= 2 ? exactName : relatedName;
    if (comboSources.length >= 2) {
      const combo = findExactBankCombination(comboSources, Number(group.amount || 0), 10);
      if (combo && combo.length >= 2) {
        const hasCompetition = combo.some(function(item){
          return transactionHasCompetingGroup(groups, matchedGroup, gi, item.tx, item.tx.amount);
        });
        if (!hasCompetition) {
          const combinedTx = combineBankTransactions(combo);
          matched.push({
            group: group,
            tx: combinedTx,
            txIndexes: combo.map(function(x){ return x.ti; }),
            reason: "분할입금 " + combo.length + "건 합계 일치"
          });
          combo.forEach(function(x){ usedTx.add(x.ti); referencedTx.add(x.ti); });
          matchedGroup.add(gi);
          return;
        }
        const combinedTx = combineBankTransactions(combo);
        combo.forEach(function(x){ referencedTx.add(x.ti); });
        review.push({
          group: group,
          tx: combinedTx,
          txIndexes: combo.map(function(x){ return x.ti; }),
          reason: "분할입금 합계는 일치하지만 중복 후보 확인 필요",
          danger: true
        });
        return;
      }
    }

    // C. 이름은 찾았지만 금액이 다른 경우 가장 가까운 후보 표시
    if (relatedName.length) {
      relatedName.sort(function(a,b){
        const aExact = namesIntersect(group, a.tx) ? 0 : 1;
        const bExact = namesIntersect(group, b.tx) ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
        return Math.abs(group.amount-a.tx.amount)-Math.abs(group.amount-b.tx.amount);
      });
      const candidate = relatedName[0];
      referencedTx.add(candidate.ti);
      const source = bankMatchSource(group, candidate.tx) || bankNameRelatedSource(group, candidate.tx);
      const label = source === "nickname" ? "닉네임" : "수령인";
      const diff = Number(candidate.tx.amount || 0) - Number(group.amount || 0);
      review.push({
        group: group,
        tx: candidate.tx,
        txIndexes: [candidate.ti],
        reason: "입금자명에 " + label + " 포함 · " + (diff < 0 ? "부족 " + money(Math.abs(diff)) : "초과 " + money(diff)) + " 확인"
      });
      return;
    }

    // D. 이름은 전혀 없지만 금액만 같은 경우
    const sameAmount = available.filter(function(x){ return Number(x.tx.amount || 0) === Number(group.amount || 0); });
    if (sameAmount.length) {
      const candidate = sameAmount[0];
      referencedTx.add(candidate.ti);
      review.push({ group: group, tx: candidate.tx, txIndexes:[candidate.ti], reason: "금액 일치 · 입금자명 다름" });
      return;
    }
  });

  const unpaid = groups.filter(function(group, gi){
    if (matchedGroup.has(gi)) return false;
    return !review.some(function(x){ return x.group.key === group.key; });
  });

  const orphan = transactions.map(function(tx,ti){ return {tx:tx,ti:ti}; }).filter(function(x){
    if (usedTx.has(x.ti) || referencedTx.has(x.ti) || bankConsumedTransactionKeys.has(bankTransactionKey(x.tx))) return false;
    return groups.some(function(group){ return bankNameRelated(group,x.tx) || Number(x.tx.amount || 0) === Number(group.amount || 0); });
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
    await loadBankMatchOrders(); // V3.24: 자동대조를 누를 때마다 현재 고객주문을 새로 불러옵니다.
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
    const sample = groups.slice(0, 8).map(function(g){
      return g.receiverName + " " + money(g.amount);
    }).join(" / ");
    notice.textContent = banks + " 입금 " + all.length + "건과 현재 미입금 고객 " + groups.length + "명을 비교했습니다. "
      + "비교중: " + (sample || "미입금 고객 없음")
      + (groups.length > 8 ? " 외 " + (groups.length - 8) + "명" : "")
      + " · 수령인과 닉네임을 함께 찾고, 이름은 맞지만 금액이 다르면 확인필요로 표시합니다.";
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
    return `<tr><td>${escapeHtml(x.group.nickname)}</td><td>${escapeHtml(x.group.receiverName)}</td><td>${x.group.orderCount}건</td><td>${money(x.group.amount)}</td><td>${escapeHtml(x.tx.depositor)}</td><td>${money(x.tx.amount)}</td><td>${escapeHtml(x.tx.bank)}</td><td>${escapeHtml(x.tx.time)}${x.reason ? `<div class="match-reason">${escapeHtml(x.reason)}</div>` : ""}</td><td><button type="button" class="btn btn-primary bank-confirm-btn" onclick="confirmSingleBankMatch('matched', ${i})">입금확인</button></td></tr>`;
  }).join("") : '<tr><td colspan="9" class="empty-cell">자동일치 결과가 없습니다.</td></tr>';

  const review = document.getElementById("bankReviewList");
  review.innerHTML = r.review.length ? r.review.map(function(x, i){
    const diff = x.tx.amount - x.group.amount;
    return `<tr${x.danger ? ` style="background:#fff4f4"` : ""}><td><input type="checkbox" class="bank-review-check" data-review-index="${i}" aria-label="${escapeHtml(x.group.nickname)} 선택" ${x.danger ? "disabled title=\"중복 후보는 개별 확인만 가능합니다.\"" : ""} onchange="updateBankReviewBulkButton()"></td><td>${escapeHtml(x.group.nickname)}</td><td>${escapeHtml(x.group.receiverName)}</td><td>${money(x.group.amount)}</td><td>${escapeHtml(x.tx.depositor)}</td><td>${money(x.tx.amount)}</td><td>${diff === 0 ? "0원" : (diff > 0 ? "+" : "") + money(diff)}</td><td>${x.danger ? "🔴 " : "🟡 "}${escapeHtml(x.reason)}<div class="match-reason">${escapeHtml(x.tx.bank)} ${escapeHtml(x.tx.time)}</div></td><td><button type="button" class="btn btn-outline bank-confirm-btn" onclick="confirmSingleBankMatch('review', ${i})">직접 입금확인</button></td></tr>`;
  }).join("") : '<tr><td colspan="9" class="empty-cell">확인필요 결과가 없습니다.</td></tr>';
  const reviewSelectAll = document.getElementById("bankReviewSelectAll");
  const paidAudit = document.getElementById("bankPaidAuditButton");
  if (reviewSelectAll) {
    reviewSelectAll.checked = false;
    reviewSelectAll.disabled = r.review.length === 0;
  }
  updateBankReviewBulkButton();

  const unpaid = document.getElementById("bankUnpaidList");
  unpaid.innerHTML = r.unpaid.length ? r.unpaid.map(function(g, i){
    return `<tr><td>${escapeHtml(g.nickname)}</td><td>${escapeHtml(g.receiverName)}</td><td>${escapeHtml(g.phone)}</td><td>${g.orderCount}건</td><td>${money(g.amount)}</td><td><button type="button" class="btn btn-danger bank-cancel-btn" onclick="cancelUnpaidBankGroup(${i})">주문취소</button></td></tr>`;
  }).join("") : '<tr><td colspan="6" class="empty-cell">미입금 결과가 없습니다.</td></tr>';

  const orphan = document.getElementById("bankOrphanList");
  orphan.innerHTML = r.orphan.length ? r.orphan.map(function(tx){
    return `<tr><td>${escapeHtml(tx.bank)}</td><td>${escapeHtml(tx.time)}</td><td>${escapeHtml(tx.depositor)}</td><td>${money(tx.amount)}</td></tr>`;
  }).join("") : '<tr><td colspan="4" class="empty-cell">미매칭 은행 입금이 없습니다.</td></tr>';
}


function reconcilePaidAudit(groups, transactions) {
  const usedTx = new Set();
  const ok = [];
  const review = [];
  const error = [];

  groups.forEach(function(group){
    const indexed = transactions.map(function(tx, ti){ return {tx:tx, ti:ti}; });
    const exactNameAll = indexed.filter(function(x){ return namesIntersect(group, x.tx); });
    const exactAmountAll = exactNameAll.filter(function(x){ return x.tx.amount === group.amount; });
    const exactUnused = exactAmountAll.filter(function(x){ return !usedTx.has(x.ti); });

    if (exactUnused.length) {
      const candidate = exactUnused[0];
      usedTx.add(candidate.ti);
      ok.push({group:group, tx:candidate.tx, reason:"수령인 이름 + 입금액 일치"});
      return;
    }

    // 같은 수령인의 여러 입금건 합계가 주문금액과 정확히 맞는 경우
    const exactNameUnused = exactNameAll.filter(function(x){ return !usedTx.has(x.ti); });
    if (exactNameUnused.length > 1) {
      const total = exactNameUnused.reduce(function(sum,x){ return sum + Number(x.tx.amount||0); },0);
      if (total === group.amount) {
        exactNameUnused.forEach(function(x){ usedTx.add(x.ti); });
        ok.push({
          group:group,
          tx:{
            depositor:exactNameUnused[0].tx.depositor,
            amount:total,
            bank:Array.from(new Set(exactNameUnused.map(function(x){return x.tx.bank;}))).join(" + "),
            time:exactNameUnused.map(function(x){return x.tx.time;}).filter(Boolean).join(" / ")
          },
          reason:"같은 이름 여러 입금 합계 일치"
        });
        return;
      }
    }

    // 정확한 거래가 존재하지만 이미 다른 입금완료 그룹이 사용했다면 중복처리 의심
    if (exactAmountAll.length && !exactUnused.length) {
      review.push({group:group, tx:exactAmountAll[0].tx, reason:"중복매칭 의심 · 같은 은행 입금 1건이 이미 다른 입금완료 주문에 사용됨"});
      return;
    }

    if (exactNameAll.length) {
      exactNameAll.sort(function(a,b){return Math.abs(group.amount-a.tx.amount)-Math.abs(group.amount-b.tx.amount);});
      const candidate=exactNameAll[0];
      review.push({group:group,tx:candidate.tx,reason:"수령인 이름은 일치하지만 입금금액이 다름"});
      return;
    }

    const related = indexed.filter(function(x){return bankNameRelated(group,x.tx);});
    if (related.length) {
      related.sort(function(a,b){
        const ae=a.tx.amount===group.amount?0:1, be=b.tx.amount===group.amount?0:1;
        if(ae!==be)return ae-be;
        return Math.abs(group.amount-a.tx.amount)-Math.abs(group.amount-b.tx.amount);
      });
      review.push({group:group,tx:related[0].tx,reason:related[0].tx.amount===group.amount?"입금자명에 수령인 포함 · 금액 일치":"입금자명 유사 · 금액 확인 필요"});
      return;
    }

    const sameAmount = indexed.filter(function(x){return x.tx.amount===group.amount;});
    if (sameAmount.length) {
      review.push({group:group,tx:sameAmount[0].tx,reason:"금액은 같지만 입금자명이 다름"});
      return;
    }

    error.push({group:group, reason:"은행 거래내역에서 해당 수령인/금액의 입금 기록을 찾지 못함"});
  });

  return {ok:ok, review:review, error:error};
}

async function startPaidOrderAudit() {
  if (!bankMatchFiles.length) {
    alert("먼저 재검사에 사용할 토스뱅크 또는 하나은행 엑셀 파일을 선택해주세요.");
    return;
  }
  showLoading("입금완료 주문을 은행 거래내역과 다시 검사하는 중입니다.");
  try {
    await loadBankMatchOrders();
    const all=[];
    for (const file of bankMatchFiles) {
      const txs=await readBankFile(file);
      all.push.apply(all,txs);
    }
    bankMatchTransactions=all;
    const groups=buildPaidGroups(bankMatchOrders);
    bankPaidAuditResult=reconcilePaidAudit(groups,all);
    renderPaidAuditResults();
    const panel=document.getElementById("bankPaidAuditPanel");
    if(panel)panel.scrollIntoView({behavior:"smooth",block:"start"});
    const notice=document.getElementById("paidAuditNotice");
    if(notice){
      notice.className="bankmatch-notice success";
      notice.textContent="입금완료 고객 "+groups.length+"명을 은행 입금 "+all.length+"건과 다시 검사했습니다. 상태는 자동 변경하지 않습니다.";
    }
  } catch(error) {
    const notice=document.getElementById("paidAuditNotice");
    if(notice){notice.className="bankmatch-notice warning";notice.textContent=error.message;}
    alert(error.message);
  } finally { hideLoading(); }
}

function renderPaidAuditResults() {
  const r=bankPaidAuditResult||{ok:[],review:[],error:[]};
  const total=r.ok.length+r.review.length+r.error.length;
  const setText=function(id,value){const el=document.getElementById(id);if(el)el.textContent=value;};
  setText("paidAuditOkCount",r.ok.length);
  setText("paidAuditReviewCount",r.review.length);
  setText("paidAuditErrorCount",r.error.length);
  setText("paidAuditTotalCount",total);

  const okList=document.getElementById("paidAuditOkList");
  if(okList) okList.innerHTML=r.ok.length?r.ok.map(function(x){
    return `<tr><td>${escapeHtml(x.group.nickname)}</td><td>${escapeHtml(x.group.receiverName)}</td><td>${x.group.orderCount}건</td><td>${money(x.group.amount)}</td><td>${escapeHtml(x.tx.depositor)}</td><td>${money(x.tx.amount)}</td><td>${escapeHtml(x.tx.bank)}</td><td>${escapeHtml(x.tx.time)}</td></tr>`;
  }).join(""):'<tr><td colspan="8" class="empty-cell">정상으로 확인된 입금완료 주문이 없습니다.</td></tr>';

  const reviewList=document.getElementById("paidAuditReviewList");
  if(reviewList) reviewList.innerHTML=r.review.length?r.review.map(function(x){
    const diff=Number(x.tx.amount||0)-Number(x.group.amount||0);
    return `<tr><td>${escapeHtml(x.group.nickname)}</td><td>${escapeHtml(x.group.receiverName)}</td><td>${money(x.group.amount)}</td><td>${escapeHtml(x.tx.depositor)}</td><td>${money(x.tx.amount)}</td><td>${diff===0?"0원":(diff>0?"+":"")+money(diff)}</td><td>${escapeHtml(x.reason)}<div class="match-reason">${escapeHtml(x.tx.bank||"")} ${escapeHtml(x.tx.time||"")}</div></td></tr>`;
  }).join(""):'<tr><td colspan="7" class="empty-cell">확인필요 항목이 없습니다.</td></tr>';

  const errorList=document.getElementById("paidAuditErrorList");
  if(errorList) errorList.innerHTML=r.error.length?r.error.map(function(x){
    return `<tr><td>${escapeHtml(x.group.nickname)}</td><td>${escapeHtml(x.group.receiverName)}</td><td>${escapeHtml(x.group.phone)}</td><td>${x.group.orderCount}건</td><td>${money(x.group.amount)}</td><td>${escapeHtml(x.reason)}</td></tr>`;
  }).join(""):'<tr><td colspan="6" class="empty-cell">오류의심 항목이 없습니다.</td></tr>';
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
    markBankTransactionsConsumed(item.txIndexes || []);
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


function updateBankReviewBulkButton() {
  const button = document.getElementById("bankReviewBulkPaidButton");
  if (!button) return;
  const checked = Array.from(document.querySelectorAll(".bank-review-check:checked"));
  button.disabled = checked.length === 0;
  button.textContent = checked.length ? "선택 " + checked.length + "명 입금완료" : "선택 입금완료";

  const all = Array.from(document.querySelectorAll(".bank-review-check"));
  const selectAll = document.getElementById("bankReviewSelectAll");
  if (selectAll && all.length) {
    selectAll.checked = checked.length === all.length;
    selectAll.indeterminate = checked.length > 0 && checked.length < all.length;
  }
}

async function bulkCompleteSelectedBankReviews() {
  const checked = Array.from(document.querySelectorAll(".bank-review-check:checked"));
  if (!checked.length) {
    alert("입금완료로 변경할 확인필요 항목을 체크해주세요.");
    return;
  }

  const review = bankMatchResult.review || [];
  const selectedItems = checked.map(function(cb){
    return review[Number(cb.dataset.reviewIndex)];
  }).filter(Boolean);
  if (!selectedItems.length) return;

  const rows = [];
  const orderNumbers = [];
  selectedItems.forEach(function(item){
    const g = item.group || {};
    (g.rows || []).forEach(function(row){ if (Number(row) >= 2) rows.push(Number(row)); });
    (g.orderNumbers || []).forEach(function(no){ if (no) orderNumbers.push(no); });
  });
  const uniqueRows = Array.from(new Set(rows));
  const uniqueOrderNumbers = Array.from(new Set(orderNumbers));

  if (!uniqueRows.length && !uniqueOrderNumbers.length) {
    alert("처리할 주문을 찾지 못했습니다.");
    return;
  }

  const names = selectedItems.map(function(item){
    const g = item.group || {};
    return g.nickname || g.receiverName || "고객";
  });
  const preview = names.slice(0, 8).join(", ") + (names.length > 8 ? " 외 " + (names.length - 8) + "명" : "");
  if (!confirm(
    "확인필요에서 선택한 " + selectedItems.length + "명의 주문을 입금완료로 변경할까요?\n\n" +
    preview + "\n\n" +
    "⚠ 확인필요 건은 이름 또는 금액이 정확히 일치하지 않을 수 있습니다. 은행내역을 직접 확인한 항목만 체크해주세요."
  )) return;

  showLoading("선택한 확인필요 주문을 입금완료 처리하는 중입니다.");
  try {
    const result = await apiPost({
      action: "bulkUpdatePaymentStatus",
      rowNumbers: uniqueRows,
      orderNumbers: uniqueOrderNumbers,
      paymentStatus: "입금완료"
    });
    alert((result && result.message) || (selectedItems.length + "명의 주문을 입금완료 처리했습니다."));
    selectedItems.forEach(function(item){ markBankTransactionsConsumed(item.txIndexes || []); });
    await loadBankMatchOrders();
    const groups = buildOutstandingGroups(bankMatchOrders);
    bankMatchResult = reconcileBankData(groups, bankMatchTransactions);
    renderBankMatchResults();
    const notice = document.getElementById("bankMatchNotice");
    if (notice) {
      notice.className = "bankmatch-notice success";
      notice.textContent = "확인필요에서 선택한 " + selectedItems.length + "명의 입금완료 처리가 끝났습니다.";
    }
  } catch (error) {
    alert(error.message);
  } finally {
    hideLoading();
  }
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
    matched.forEach(function(item){ markBankTransactionsConsumed(item.txIndexes || []); });
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


/* =========================================================
   V4.15 롯데택배 ALPS 48열 전용 엔진 / 송장 1장 = 엑셀 1행
   - 기본정보 7열
   - 상품1~상품10: 상품코드/상품명/상품상세/내품수량 (40열)
   - 마지막 AV열: 수량(A타입)=1
   - 상품 최대 10개를 한 행에 담고 11번째부터 -02, -03으로 새 행 생성
   - 실제 ALPS 5장 출력 테스트에서 정상 동작한 구조와 동일
========================================================= */
function chunkArrayV401(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function lotteExportHeadersV412() {
  const headers = ["주문번호","주문자","받는사람","주소","전화번호1","고객메시지","우편번호"];
  for (let i = 1; i <= 10; i++) {
    headers.push("상품코드" + i, "상품명" + i, "상품상세" + i, "내품수량" + i);
  }
  headers.push("수량(A타입)");
  return headers;
}

function validateLotteRowsV412(rows, headers) {
  if (!Array.isArray(rows) || !rows.length) throw new Error("롯데택배로 내보낼 주문이 없습니다.");
  if (rows.length > 10000) throw new Error("롯데 ALPS 업로드 한도 10,000행을 초과했습니다. 현재 " + rows.length + "행입니다.");
  if (!Array.isArray(headers) || headers.length !== 48) {
    throw new Error("롯데 ALPS 형식은 48열이어야 합니다. 현재 " + (headers ? headers.length : 0) + "열입니다.");
  }
  rows.forEach(function(row, idx){
    const rowNo = idx + 2;
    const orderNo = String(row["주문번호"] || "").trim();
    if (!orderNo) throw new Error(rowNo + "행 주문번호가 비어 있습니다.");
    if (orderNo.length > 50) throw new Error(rowNo + "행 주문번호가 50자를 초과합니다: " + orderNo);
    if (!String(row["받는사람"] || "").trim()) throw new Error(rowNo + "행 받는사람이 비어 있습니다.");
    if (!String(row["주소"] || "").trim()) throw new Error(rowNo + "행 주소가 비어 있습니다.");
    if (!String(row["전화번호1"] || "").trim()) throw new Error(rowNo + "행 전화번호1이 비어 있습니다.");
    const boxQty = row["수량(A타입)"];
    if (!Number.isInteger(Number(boxQty)) || Number(boxQty) !== 1) {
      throw new Error(rowNo + "행 수량(A타입)은 숫자 1이어야 합니다.");
    }
    let productCount = 0;
    for (let i = 1; i <= 10; i++) {
      const code = String(row["상품코드" + i] || "").trim();
      const name = String(row["상품명" + i] || "").trim();
      const detail = String(row["상품상세" + i] || "").trim();
      const qty = row["내품수량" + i];
      if (code || name || detail || qty !== "") {
        if (!code && !name) continue;
        const n = Number(qty);
        if (!Number.isInteger(n) || n < 1) throw new Error(rowNo + "행 내품수량" + i + " 값이 올바르지 않습니다: " + qty);
        productCount++;
      }
    }
    if (productCount < 1) throw new Error(rowNo + "행에 상품이 없습니다.");
    if (productCount > 10) throw new Error(rowNo + "행 상품 수가 10개를 초과했습니다.");
  });
}

function getRepresentativeOrderNumberV409(orderNumber) {
  const raw = String(orderNumber || "").trim().replace(/\s+/g, "");
  if (!raw) return "";
  const parts = raw.split("+").map(function(v){ return String(v || "").trim(); }).filter(Boolean);
  const first = parts[0] || "";
  if (!/^\d{6}-\d{4}$/.test(first)) {
    throw new Error("롯데택배용 주문번호를 만들 수 없습니다: " + raw + "\n주문번호는 YYMMDD-0001 형식이거나, 합배송 시 YYMMDD-0001+YYMMDD-0002 형식이어야 합니다.");
  }
  return first;
}

function buildLotteOrderNumberV410(baseOrderNumber, groupIndex) {
  const base = getRepresentativeOrderNumberV409(baseOrderNumber);
  const result = base + "-" + String(groupIndex + 1).padStart(2,"0");
  if (result.length > 50) throw new Error("롯데택배 주문번호 50자 제한을 초과했습니다: " + result);
  return result;
}

function buildLotte48RowV412(order, items, groupIndex) {
  const row = {
    "주문번호": buildLotteOrderNumberV410(order.orderNumber, groupIndex),
    "주문자": order.nickname || "",
    "받는사람": order.receiverName || "",
    "주소": order.address || "",
    "전화번호1": order.phone || "",
    "고객메시지": order.shippingMemo || "",
    "우편번호": order.zipcode || ""
  };
  for (let i = 1; i <= 10; i++) {
    const item = items[i - 1];
    row["상품코드" + i] = item ? (item.productNo || "") : "";
    row["상품명" + i] = item ? (item.productName || "") : "";
    row["상품상세" + i] = item ? [item.color || "", item.size || ""].filter(Boolean).join("/") : "";
    row["내품수량" + i] = item ? (Number(item.quantity || 0) || 1) : "";
  }
  row["수량(A타입)"] = 1;
  return row;
}

async function downloadLotteExcelV415() {
  console.log("[SSINNEU] LOTTE EXPORT V4.15 / 48COL ONLY");
  if (typeof XLSX === "undefined") {
    alert("엑셀 기능을 불러오지 못했습니다. 인터넷 연결 후 다시 시도해주세요.");
    return;
  }
  const btn = document.getElementById("lotteExcelButtonV415");
  if (btn) btn.disabled = true;
  showLoading("롯데택배 ALPS 48열 엑셀을 만드는 중입니다.");
  try {
    await ensureBackendV414();
    const data = await apiGet({action:"lotteOrders", _ts:Date.now()});
    const orders = Array.isArray(data.orders) ? data.orders : [];
    if (!orders.length) {
      const meta = data && data.meta ? data.meta : {};
      throw new Error("3PL출고에서 롯데택배로 변환 가능한 주문을 찾지 못했습니다.\n" +
        "3PL 시트 마지막행: " + (meta.lastRow || 0) + " / 마지막열: " + (meta.lastCol || 0) + "\n" +
        "시트에 주문이 보이는데 0건이면 Code.gs를 V4.15로 새 버전 배포했는지 확인해주세요.");
    }

    const rows = [];
    let sourceCustomers = 0;
    let totalProducts = 0;
    orders.forEach(function(order){
      const items = Array.isArray(order.items) ? order.items : [];
      if (!items.length) return;
      sourceCustomers++;
      totalProducts += items.length;
      const groups = chunkArrayV401(items, 10);
      groups.forEach(function(group, groupIndex){
        rows.push(buildLotte48RowV412(order, group, groupIndex));
      });
    });

    const headers = lotteExportHeadersV412();
    validateLotteRowsV412(rows, headers);

    // json_to_sheet 사용 시 반드시 지정한 48개 헤더 순서 그대로 생성합니다.
    const ws = XLSX.utils.json_to_sheet(rows, {header:headers, skipHeader:false});
    const ref = ws["!ref"] || "";
    const decoded = XLSX.utils.decode_range(ref);
    const actualCols = decoded.e.c - decoded.s.c + 1;
    if (actualCols !== 48 || XLSX.utils.encode_col(decoded.e.c) !== "AV") {
      throw new Error("V4.15 48열 생성 검증 실패: 실제 " + actualCols + "열 / 마지막열 " + XLSX.utils.encode_col(decoded.e.c));
    }
    ws["!cols"] = headers.map(function(h){
      if (h === "주소") return {wch:42};
      if (h === "고객메시지") return {wch:24};
      if (/^상품명\d+$/.test(h)) return {wch:24};
      if (/^상품상세\d+$/.test(h)) return {wch:20};
      return {wch:14};
    });
    const wb = XLSX.utils.book_new();
    wb.Props = { Title: "SSINNEU V4.15 LOTTE 48COL ONLY", Subject: "48 columns / 10 products / 1 invoice row", Comments: "V4.15-48COL-ONLY" };
    XLSX.utils.book_append_sheet(wb, ws, "sheet1");
    const date = todayString().replace(/-/g, "");
    XLSX.writeFile(wb, "씬느샵_V4.15_롯데택배_ALPS_48열_" + date + ".xlsx");

    alert(
      "V4.15 롯데택배 48열 전용 파일을 만들었습니다.\n\n" +
      "3PL 주문: " + sourceCustomers + "건\n" +
      "상품 종류: " + totalProducts + "개\n" +
      "예상 송장: " + rows.length + "장\n\n" +
      "중요: 다운로드한 엑셀의 데이터 행 수도 " + rows.length + "행이어야 합니다.\n" +
      "ALPS에서는 상품1~10 + AV 수량(A타입) 형식으로 등록한 48열 신규형식을 선택해주세요.\n" +
      "이 파일은 테스트에서 정상 출력된 '송장 1장 = 엑셀 1행' 구조와 동일합니다."
    );
  } catch (error) {
    alert("롯데택배 엑셀 생성 오류: " + (error.message || error));
  } finally {
    hideLoading();
    if (btn) btn.disabled = false;
  }
}

function normalizeHeaderV401(value) {
  return String(value == null ? "" : value).replace(/\s+/g, "").toLowerCase();
}

function findHeaderIndexV401(headers, candidates) {
  const normalized = headers.map(normalizeHeaderV401);
  for (const candidate of candidates) {
    const target = normalizeHeaderV401(candidate);
    const idx = normalized.indexOf(target);
    if (idx >= 0) return idx;
  }
  return -1;
}

function stripLottePartSuffixV401(orderNumber) {
  return String(orderNumber || "").trim().replace(/-\d{2}$/i, "");
}

async function uploadLotteTrackingResult(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (typeof XLSX === "undefined") {
    alert("엑셀 기능을 불러오지 못했습니다.");
    return;
  }
  showLoading("롯데 송장결과 엑셀에서 주문번호와 송장번호를 찾는 중입니다.");
  try {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, {type:"array"});
    const ws = wb.Sheets[wb.SheetNames[0]];
    const matrix = XLSX.utils.sheet_to_json(ws, {header:1, defval:""});
    if (!matrix.length) throw new Error("엑셀 파일에 데이터가 없습니다.");

    let headerRow = -1, orderCol = -1, trackingCol = -1;
    for (let r = 0; r < Math.min(matrix.length, 30); r++) {
      const headers = matrix[r];
      const oc = findHeaderIndexV401(headers, ["주문번호","주문번호1","고객주문번호","접수번호"]);
      const tc = findHeaderIndexV401(headers, ["운송장번호","송장번호","운송장번호1","운송장"]);
      if (oc >= 0 && tc >= 0) { headerRow = r; orderCol = oc; trackingCol = tc; break; }
    }
    if (headerRow < 0) throw new Error("주문번호와 운송장번호 열을 찾지 못했습니다. 롯데에서 다운로드한 원본 결과 엑셀을 그대로 올려주세요.");

    const mappings = [];
    for (let r = headerRow + 1; r < matrix.length; r++) {
      const orderNumber = String(matrix[r][orderCol] || "").trim();
      const trackingNumber = String(matrix[r][trackingCol] || "").trim().replace(/\.0$/, "");
      if (!orderNumber || !trackingNumber) continue;
      mappings.push({orderNumber:orderNumber, baseOrderNumber:stripLottePartSuffixV401(orderNumber), trackingNumber:trackingNumber});
    }
    if (!mappings.length) throw new Error("연결할 주문번호/운송장번호 데이터를 찾지 못했습니다.");

    const result = await apiPost({action:"applyLotteTracking", mappings:mappings});
    let message = result.message || "송장번호 자동연결이 완료되었습니다.";
    if (Array.isArray(result.unmatched) && result.unmatched.length) {
      message += "\n\n일치하지 않은 주문번호:\n" + result.unmatched.slice(0,10).join("\n");
    }
    alert(message);
  } catch (error) {
    alert("롯데 송장결과 업로드 오류: " + (error.message || error));
  } finally {
    hideLoading();
    event.target.value = "";
  }
}
