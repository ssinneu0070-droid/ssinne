// V4.52.0 - 클린 통합 · 라이브임시주문 · 쇼핑몰형 PC/모바일 관리자
// V4.00 - 수령인+닉네임 포함 자동일치 / 분할입금 조합합산 / 부족·초과 / 중복입금 방지
// V3.30 - 입금 자동대조 시 수령인 + 닉네임 함께 조회
// V3.29 - 단일 script.js 운영 + 토스뱅크/하나은행 통합 입금대조 + 입금완료 2차 재검사
// V3.24 - 현재 주문 새로고침 / 한글이름 포함대조 / 대조기준 표시
/*
  씬느샵 공통 설정
  아래 3개 주소만 실제 주소로 바꾸세요.
*/
const CONFIG = {
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxN43scBgIqtFnSftRLoIL9kZDxKtVTyT7WpyMsW0ec6I7TUpLx1zWqbSyoKnQ42oAqRw/exec",
  BAND_URL: "https://www.band.us/band/102398891/post",
  CHANNEL_URL: "https://pf.kakao.com/_YVncn"
};

const CUSTOMER_STORAGE_KEY = "ssinne_customer_info_v2";
const ADMIN_SESSION_STORAGE_KEY = "ssinne_admin_session_v427";
let adminTokenV427 = "";
let adminRoleV435 = "";
let adminCsDataV435 = null;
let adminCsPaymentFilterV440 = "all";
let adminCsCardPaymentsV4405 = [];
let adminCsCardListFilterV4405 = "all";
let adminCsActiveStatusV4403 = "";
let adminCsCurrentOnlyV441 = false;

// V4.39.2: 관리자 첫 화면에서는 무거운 XLSX 라이브러리를 받지 않습니다.
// 은행 엑셀/롯데 엑셀/발주 엑셀 기능을 실제로 누를 때 한 번만 동적으로 로드합니다.
let xlsxLoadPromiseV4392 = null;
function ensureXlsxLibraryLoadedV4392() {
  if (window.XLSX) return Promise.resolve(window.XLSX);
  if (xlsxLoadPromiseV4392) return xlsxLoadPromiseV4392;
  xlsxLoadPromiseV4392 = new Promise(function(resolve, reject) {
    const existing = document.querySelector('script[data-ssinne-xlsx="1"]');
    if (existing) {
      existing.addEventListener("load", function(){ window.XLSX ? resolve(window.XLSX) : reject(new Error("엑셀 라이브러리를 불러오지 못했습니다.")); }, {once:true});
      existing.addEventListener("error", function(){ reject(new Error("엑셀 라이브러리를 불러오지 못했습니다.")); }, {once:true});
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    script.async = true;
    script.dataset.ssinneXlsx = "1";
    script.onload = function(){
      if (window.XLSX) resolve(window.XLSX);
      else reject(new Error("엑셀 라이브러리를 불러오지 못했습니다."));
    };
    script.onerror = function(){ try{script.remove();}catch(e){} reject(new Error("엑셀 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해주세요.")); };
    document.head.appendChild(script);
  }).catch(function(error){
    xlsxLoadPromiseV4392 = null;
    throw error;
  });
  return xlsxLoadPromiseV4392;
}


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

  if (page === "order") initOrderPage();
  if (page === "admin") initAdminProtectedPageV427();
  if (page === "customer") initCustomerPage();
});

function validScriptUrl() {
  return CONFIG.SCRIPT_URL.startsWith("https://script.google.com/macros/s/") &&
         CONFIG.SCRIPT_URL.endsWith("/exec");
}

async function apiGet(params) {
  params = Object.assign({}, params || {});
  if (document.body && document.body.dataset.page === "admin" && adminTokenV427 && params.action !== "adminLogin") {
    params.adminToken = adminTokenV427;
  }
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
  payload = Object.assign({}, payload || {});
  if (document.body && document.body.dataset.page === "admin" && adminTokenV427 && payload.action !== "adminLogin") {
    payload.adminToken = adminTokenV427;
  }
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
   고객 주문서 V4.34
   - 라이브 주문 불러오기 + 기존 직접작성 선택
   - 라이브 주문은 서버 임시주문을 그대로 확정하고 상품을 고객이 임의 수정하지 못하게 합니다.
========================= */
let orderProducts=[];
let orderCart=[];
let selectedOrderProduct=null;
let orderSubmitting=false;
let orderPreviewTimer=null;
let orderProductsPromise=null;
let orderProductsPromiseKey="";
let orderProductsNicknameKey="";
let paymentPreviewCache=new Map();
let paymentPreviewSeq=0;
let lastPaymentPreview={existingProductAmount:0,currentProductAmount:0,cumulativeProductAmount:0,shippingFee:0,cumulativeFinalAmount:0,alreadyPaidAmount:0,amountDueNow:0,additionalOrder:false,remote:false};
let orderMode=""; // manual | live
let liveOrderToken="";
let liveOrderConfirmed=false;
let currentLiveLookup=null;
let liveLookupPhoneVerified=false;
let liveLookupExistingCustomer=false;
let liveLookupPhoneValue="";
let useExistingFullAddress=false;
const SSINNE_ACCOUNT_NUMBER="100257908378";
const SUBMISSION_STORAGE_KEY="ssinne_pending_submission_v434";
let lastCompletedAmountDue=0;

function byId(id){return document.getElementById(id)}
function getSubmissionIdV432(){let id=sessionStorage.getItem(SUBMISSION_STORAGE_KEY)||"";if(!id){id="SUB-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,10);sessionStorage.setItem(SUBMISSION_STORAGE_KEY,id)}return id}
function rotateSubmissionIdV432(){sessionStorage.removeItem(SUBMISSION_STORAGE_KEY);return getSubmissionIdV432()}
async function copyTextSafeV432(text,button,status,defaultLabel){let ok=false;try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(String(text));ok=true}else{const ta=document.createElement("textarea");ta.value=String(text);ta.setAttribute("readonly","");ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();ok=document.execCommand("copy");ta.remove()}}catch(e){ok=false}if(ok){if(button){button.textContent="✓ 복사되었습니다";button.classList.add("copied");setTimeout(()=>{button.textContent=defaultLabel;button.classList.remove("copied")},1800)}if(status)status.textContent="복사되었습니다."}else if(status)status.textContent="복사가 안 되면 숫자를 길게 눌러 복사해주세요.";return ok}
function updatePaymentMethodUIV432(){
  updateCardVatNotice();
  const value=byId("paymentMethod").value;
  const bankBtn=byId("bankPaymentChoice"),cardBtn=byId("cardPaymentChoice");
  if(bankBtn){const active=value==="무통장입금";bankBtn.classList.toggle("active",active);bankBtn.setAttribute("aria-pressed",active?"true":"false");const dot=bankBtn.querySelector(".payment-radio-dot");if(dot)dot.textContent=active?"●":"○";}
  if(cardBtn){const active=value==="카드결제";cardBtn.classList.toggle("active",active);cardBtn.setAttribute("aria-pressed",active?"true":"false");const dot=cardBtn.querySelector(".payment-radio-dot");if(dot)dot.textContent=active?"●":"○";}
}

async function initOrderPage(){
  byId("bandLink").href=CONFIG.BAND_URL;
  byId("channelLink").href=CONFIG.CHANNEL_URL;
  byId("phone").addEventListener("input",function(e){formatPhoneInput(e);schedulePaymentPreview();useExistingFullAddress=false;byId("detailAddress").required=true;});
  byId("receiverName").addEventListener("input",schedulePaymentPreview);
  byId("addressSearchButton").addEventListener("click",openAddressSearch);
  const addressCloseButton=byId("addressSearchCloseButton");if(addressCloseButton)addressCloseButton.addEventListener("click",closeAddressSearch);
  byId("shippingRegion").addEventListener("change",schedulePaymentPreview);
  byId("paymentMethod").addEventListener("change",updatePaymentMethodUIV432);
  ["bankPaymentChoice","cardPaymentChoice"].forEach(function(id){const btn=byId(id);if(btn)btn.addEventListener("click",function(){byId("paymentMethod").value=btn.dataset.payment||"무통장입금";byId("paymentMethod").dispatchEvent(new Event("change",{bubbles:true}));});});
  const copyAccount=byId("copyPaymentAccountButton");if(copyAccount)copyAccount.addEventListener("click",()=>copyTextSafeV432(SSINNE_ACCOUNT_NUMBER,copyAccount,byId("copyPaymentStatus"),"📋 계좌번호 복사"));
  const copyAmount=byId("copyPaymentAmountButton");if(copyAmount)copyAmount.addEventListener("click",()=>copyTextSafeV432(String(Math.max(0,Number(lastPaymentPreview.amountDueNow||0))),copyAmount,byId("copyPaymentStatus"),"💰 지금 입금할 금액 복사"));
  const completeAccount=byId("completeCopyAccountButton");if(completeAccount)completeAccount.addEventListener("click",()=>copyTextSafeV432(SSINNE_ACCOUNT_NUMBER,completeAccount,byId("completeCopyStatus"),"📋 계좌번호 복사"));
  const completeAmount=byId("completeCopyAmountButton");if(completeAmount)completeAmount.addEventListener("click",()=>copyTextSafeV432(String(Math.max(0,lastCompletedAmountDue)),completeAmount,byId("completeCopyStatus"),"💰 입금금액 복사"));
  getSubmissionIdV432();
  byId("singleProductNo").addEventListener("input",function(e){e.target.value=e.target.value.replace(/[^0-9]/g,"").slice(0,4);resetSingleProductSelection()});
  byId("singleProductNo").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();searchSingleProduct()}});
  byId("singleProductSearchButton").addEventListener("click",searchSingleProduct);
  byId("singleProductColor").addEventListener("change",updateSingleSizes);
  byId("singleMinusButton").addEventListener("click",function(){changeSingleQuantity(-1)});
  byId("singlePlusButton").addEventListener("click",function(){changeSingleQuantity(1)});
  byId("addToCartButton").addEventListener("click",addSelectedProductToCart);
  byId("focusProductButton").addEventListener("click",function(){byId("singleProductNo").focus();byId("manualProductEntryCard").scrollIntoView({behavior:"smooth",block:"start"})});
  byId("clearCustomerButton").addEventListener("click",clearSavedCustomer);
  byId("finishOrderButton").addEventListener("click",finishOrder);
  byId("orderForm").addEventListener("submit",submitOrder);
  byId("liveModeButton").addEventListener("click",function(){selectOrderMode("live")});
  byId("manualModeButton").addEventListener("click",function(){selectOrderMode("manual")});
  byId("backToModeButton").addEventListener("click",resetOrderModeSelection);
  byId("changeOrderModeButton").addEventListener("click",resetOrderModeSelection);
  byId("livePhoneNextButton").addEventListener("click",checkLiveCustomerPhoneV434);
  byId("liveLookupPhone").addEventListener("input",function(e){formatPhoneInput(e);liveLookupPhoneVerified=false;byId("liveLookupStatus").textContent="전화번호 확인 후 다음 단계로 이동합니다.";});
  byId("liveLookupPhone").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();checkLiveCustomerPhoneV434()}});
  byId("liveLookupButton").addEventListener("click",lookupLiveOrder);
  byId("liveLookupIdentity").addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();lookupLiveOrder()}});
  byId("livePhoneChangeButton").addEventListener("click",resetLivePhoneStepV434);
  byId("liveOrderConfirmButton").addEventListener("click",confirmLiveOrder);
  byId("liveOrderMismatchButton").addEventListener("click",function(){byId("liveOrderIssueBox").style.display="block";byId("liveOrderIssueText").focus()});
  byId("liveOrderIssueSubmitButton").addEventListener("click",submitLiveOrderIssue);
  byId("liveOrderNotMineButton").addEventListener("click",reportNotMineLiveOrder);
  byId("loadPreviousCustomerButton").addEventListener("click",loadPreviousCustomerInfo);

  loadSavedCustomer();
  const savedPhone=(byId("phone").value||"").trim();
  if(savedPhone)byId("liveLookupPhone").value=savedPhone;
  renderOrderCart();
  updatePaymentMethodUIV432();
  // V4.42.3: 직접입력 화면 진입 시 전체 상품목록을 미리 받지 않습니다. 상품번호 검색 시 해당 상품만 조회합니다.
}

function selectOrderMode(mode){
  orderMode=mode;
  liveOrderToken="";liveOrderConfirmed=false;currentLiveLookup=null;orderCart=[];renderOrderCart();
  byId("orderModeChooser").style.display="none";
  byId("completeScreen").classList.remove("show");
  if(mode==="live"){
    byId("liveLookupPanel").style.display="block";
    byId("orderForm").style.display="none";
    byId("orderModeToolbar").style.display="none";
    resetLiveEntryV434(false);
    const savedPhone=(byId("phone").value||"").trim();if(savedPhone&&!byId("liveLookupPhone").value)byId("liveLookupPhone").value=savedPhone;
    setTimeout(()=>byId("liveLookupPhone").focus(),50);
  }else{
    byId("liveLookupPanel").style.display="none";
    showOrderFormForMode();
  }
}

function showOrderFormForMode(){
  const manual=orderMode==="manual";
  byId("orderForm").style.display="grid";
  byId("orderModeToolbar").style.display="flex";
  byId("selectedModeText").textContent=manual?"✏️ 직접 주문서 작성":"✨ 라이브 주문 불러오기";
  byId("manualProductEntryCard").style.display=manual?"block":"none";
  byId("focusProductButton").style.display=manual?"block":"none";
  byId("nickname").readOnly=!manual;
  if(manual)byId("nickname").removeAttribute("aria-readonly");else byId("nickname").setAttribute("aria-readonly","true");
  renderOrderCart();
  schedulePaymentPreview();
  setTimeout(()=>{(manual?byId("singleProductNo"):byId("phone")).focus()},60);
}

function resetOrderModeSelection(){
  if(orderSubmitting)return;
  if(orderCart.length&&!confirm("현재 선택한 주문내용을 지우고 주문방법을 다시 선택할까요?"))return;
  orderMode="";liveOrderToken="";liveOrderConfirmed=false;currentLiveLookup=null;orderCart=[];
  liveLookupPhoneVerified=false;liveLookupExistingCustomer=false;liveLookupPhoneValue="";
  byId("nickname").readOnly=false;
  byId("liveLookupPanel").style.display="none";byId("orderForm").style.display="none";byId("orderModeToolbar").style.display="none";
  byId("orderModeChooser").style.display="block";renderOrderCart();window.scrollTo({top:0,behavior:"smooth"});
}

function setLiveEntryStepV434(step){
  const phoneStep=byId("livePhoneStep"),identityStep=byId("liveIdentityStep"),result=byId("liveOrderResult");
  if(phoneStep)phoneStep.style.display=step===1?"block":"none";
  if(identityStep)identityStep.style.display=step===2?"block":"none";
  if(result&&step<3)result.style.display="none";
  [1,2,3].forEach(function(n){const b=byId("liveStepBadge"+n);if(b)b.classList.toggle("active",n<=step);});
}
function resetLiveEntryV434(clearPhone){
  currentLiveLookup=null;liveOrderToken="";liveOrderConfirmed=false;liveLookupPhoneVerified=false;liveLookupExistingCustomer=false;liveLookupPhoneValue="";
  if(clearPhone&&byId("liveLookupPhone"))byId("liveLookupPhone").value="";
  if(byId("liveLookupIdentity"))byId("liveLookupIdentity").value="";
  if(byId("liveCustomerCheckMessage"))byId("liveCustomerCheckMessage").textContent="";
  if(byId("liveOrderResult"))byId("liveOrderResult").style.display="none";
  if(byId("liveOrderIssueBox"))byId("liveOrderIssueBox").style.display="none";
  if(byId("liveLookupStatus"))byId("liveLookupStatus").textContent="먼저 전화번호를 입력해주세요.";
  setLiveEntryStepV434(1);
}
function resetLivePhoneStepV434(){resetLiveEntryV434(false);byId("liveLookupPhone").focus();}
function formatPhoneValueV434(value){let n=String(value||"").replace(/[^0-9]/g,"").slice(0,11);return n.length<=3?n:n.length<=7?n.slice(0,3)+"-"+n.slice(3):n.slice(0,3)+"-"+n.slice(3,7)+"-"+n.slice(7)}

async function checkLiveCustomerPhoneV434(){
  const phone=(byId("liveLookupPhone").value||"").replace(/[^0-9]/g,"");
  if(phone.length<10){alert("전화번호 전체를 입력해주세요.");byId("liveLookupPhone").focus();return}
  // V4.50.2: 라이브 주문 불러오기 전에는 고객주문/전체주문이력을 조회하지 않습니다.
  // 전화번호는 형식만 확인하고, 다음 단계에서 임시주문만 조회합니다.
  liveLookupPhoneVerified=true;liveLookupExistingCustomer=false;liveLookupPhoneValue=phone;
  byId("liveCustomerCheckMessage").textContent="전화번호 확인이 끝났습니다. 현재 방송에서 사용한 유튜브 닉네임을 입력해주세요.";
  byId("liveLookupIdentityLabel").textContent="유튜브 닉네임";
  byId("liveLookupIdentity").placeholder="예: 씬느-08s";
  byId("liveLookupIdentityHelp").textContent="닉네임 앞의 @는 입력해도 되고 빼도 됩니다. 현재 방송의 라이브임시주문에서만 빠르게 찾습니다.";
  byId("liveLookupStatus").textContent="전화번호 확인이 끝났습니다. 닉네임을 입력해주세요.";
  setLiveEntryStepV434(2);setTimeout(()=>byId("liveLookupIdentity").focus(),50);
}

async function lookupLiveOrder(){
  const identity=(byId("liveLookupIdentity").value||"").trim();
  const phone=(byId("liveLookupPhone").value||"").replace(/[^0-9]/g,"");
  if(!identity){alert("유튜브 닉네임을 입력해주세요.");return}
  if(phone.length<10){alert("연락처 전체번호를 입력해주세요.");return}
  try{
    showLoading("현재 방송 예약내역을 불러오는 중입니다.");
    const r=await apiGet({action:"liveOrderLookup",identity:identity,phone:phone});
    currentLiveLookup=r;liveLookupPhoneValue=phone;liveOrderToken=r.liveOrderToken||"";liveOrderConfirmed=false;
    const status=byId("liveLookupStatus"),result=byId("liveOrderResult"),confirmBtn=byId("liveOrderConfirmButton"),issueBox=byId("liveOrderIssueBox");
    const list=byId("liveOrderList"),waitingBox=byId("liveWaitingBox"),waitingList=byId("liveWaitingList"),warning=byId("liveResultWarning");
    if(!r.found){if(status)status.textContent=r.message||"현재 방송 예약내역을 찾지 못했습니다.";if(result)result.style.display="none";if(issueBox)issueBox.style.display="none";return;}
    if(status)status.textContent=r.message||"예약내역을 불러왔습니다.";
    if(byId("liveResultNickname"))byId("liveResultNickname").textContent=(r.nickname||identity)+" 님";
    const rows=Array.isArray(r.rows)?r.rows:[];
    const active=rows.filter(x=>x.status==="예약"),waiting=rows.filter(x=>x.status==="대기");
    function card(x){return `<div class="live-order-item live-order-item-v450"><div><b>${escapeHtml(x.productNo)}번 ${escapeHtml(x.productName||"")}</b><span>${escapeHtml(x.color||"")} / ${escapeHtml(x.size||"")} / ${Number(x.quantity||1)}개</span></div><div class="live-order-item-side"><strong>${money(x.lineTotal||0)}</strong><button type="button" class="live-reservation-delete-v450" data-row="${Number(x.rowNumber||0)}" data-token="${escapeHtml(x.cancelToken||"")}">삭제</button></div></div>`}
    if(list)list.innerHTML=active.length?active.map(card).join(''):'<div class="live-result-empty">현재 예약 확정 상품이 없습니다.</div>';
    if(waitingList)waitingList.innerHTML=waiting.map(card).join('');
    if(waitingBox)waitingBox.style.display=waiting.length?'block':'none';
    if(byId("liveTotalQuantity"))byId("liveTotalQuantity").textContent=Number(r.totalQuantity||0)+"개";
    if(byId("liveTotalAmount"))byId("liveTotalAmount").textContent=money(r.totalAmount||0);
    if(warning){warning.style.display=Number(r.needsReviewCount||0)>0?'block':'none';warning.textContent=Number(r.needsReviewCount||0)>0?'⚠ 확인이 필요한 주문이 있습니다. 관리자 확인 후 다시 불러와주세요.':'';}
    if(result)result.querySelectorAll('.live-reservation-delete-v450').forEach(btn=>btn.addEventListener('click',()=>cancelLiveReservationV450(Number(btn.dataset.row),btn.dataset.token)));
    if(confirmBtn)confirmBtn.disabled=!r.canConfirm;
    if(issueBox)issueBox.style.display="none";
    if(byId("liveOrderIssueText"))byId("liveOrderIssueText").value="";
    if(byId("liveOrderIssueSubmitButton"))byId("liveOrderIssueSubmitButton").disabled=false;
    if(result)result.style.display="block";
    setLiveEntryStepV434(3);
  }catch(err){alert(err.message)}finally{hideLoading()}
}

function applyPreviousCustomerFromLiveV434(customer){
  if(!customer)return false;
  byId("receiverName").value=customer.receiverName||"";
  byId("phone").value=formatPhoneValueV434(customer.phone||liveLookupPhoneValue);
  byId("zipcode").value=customer.zipcode||"";
  byId("address").value=customer.address||"";
  byId("shippingMemo").value=customer.shippingMemo||"";
  byId("detailAddress").value="";byId("detailAddress").required=false;byId("detailAddress").placeholder="이전 주소 전체가 위 주소칸에 저장되어 있습니다. 변경 없으면 비워두세요.";
  byId("shippingRegion").value=customer.remote?"remote":"normal";useExistingFullAddress=true;
  byId("previousCustomerStatus").textContent="💗 이전 배송정보를 자동으로 불러왔습니다. 주소가 맞는지만 확인해주세요.";
  byId("savedNotice").textContent="기존 고객의 이전 배송정보를 자동으로 불러왔습니다. 주소가 맞는지 확인해주세요.";byId("savedNotice").classList.add("show");
  return true;
}

function confirmLiveOrder(){
  const r=currentLiveLookup;
  if(!r||!r.found||!r.canConfirm||!liveOrderToken){alert("확정할 수 있는 라이브 주문이 없습니다. 다시 불러와주세요.");return}
  orderMode="live";liveOrderConfirmed=true;
  orderCart=(r.items||[]).map(x=>({productNo:String(x.productNo),productName:x.productName||"",color:x.color||"",size:x.size||"",quantity:Number(x.quantity||1),price:Number(x.price||0)}));
  byId("nickname").value=r.nickname||byId("liveLookupIdentity").value.trim();
  byId("phone").value=formatPhoneValueV434(liveLookupPhoneValue||r.phone||"");
  byId("nickname").readOnly=true;
  renderOrderCart();showOrderFormForMode();
  byId("liveLookupPanel").style.display="none";
  const filled=applyPreviousCustomerFromLiveV434(r.previousCustomer||null);
  if(!filled){byId("savedNotice").textContent="라이브 주문을 불러왔습니다. 배송정보를 확인하거나 입력해주세요.";byId("savedNotice").classList.add("show");byId("previousCustomerStatus").textContent=liveLookupExistingCustomer?"이전 배송지가 자동 연결되지 않았습니다. 수령인 이름을 입력한 뒤 '기존 고객 배송정보 불러오기'를 눌러주세요.":"처음 주문이라면 배송지를 한 번만 입력해주세요.";useExistingFullAddress=false;byId("detailAddress").required=true;}
  schedulePaymentPreview();
  byId("orderForm").scrollIntoView({behavior:"smooth",block:"start"});
}

async function submitLiveOrderIssue(){
  if(!liveOrderToken){alert("먼저 주문을 불러와주세요.");return}
  const message=(byId("liveOrderIssueText").value||"").trim();if(!message){alert("다른 내용을 간단히 적어주세요.");return}
  try{
    showLoading("확인 요청을 접수하고 있습니다.");
    const r=await apiPost({action:"liveOrderIssue",liveOrderToken:liveOrderToken,issueType:"일부내용다름",message:message,phone:liveLookupPhoneValue||byId("liveLookupPhone").value});
    alert(r.message||"확인 요청이 접수되었습니다.");
    byId("liveLookupStatus").textContent="⚠ 주문 확인요청이 접수되었습니다. 관리자 확인 전에는 결제하지 말아주세요.";
    byId("liveOrderIssueSubmitButton").disabled=true;byId("liveOrderConfirmButton").disabled=true;
  }catch(err){alert(err.message)}finally{hideLoading()}
}

async function reportNotMineLiveOrder(){
  if(!liveOrderToken){resetLiveLookupOnly();return}
  if(!confirm("불러온 주문이 본인 주문이 아닌가요? 관리자에게 확인요청을 보낼게요."))return;
  try{showLoading("잘못 연결된 주문을 신고하고 있습니다.");await apiPost({action:"liveOrderIssue",liveOrderToken:liveOrderToken,issueType:"내주문아님",message:"고객이 '제 주문이 아니에요'를 선택함",phone:liveLookupPhoneValue||byId("liveLookupPhone").value});alert("확인요청을 보냈습니다. 닉네임을 다시 확인하거나 관리자에게 문의해주세요.");resetLiveLookupOnly()}catch(err){alert(err.message)}finally{hideLoading()}
}
function resetLiveLookupOnly(){currentLiveLookup=null;liveOrderToken="";liveOrderConfirmed=false;byId("liveOrderResult").style.display="none";byId("liveOrderIssueBox").style.display="none";byId("liveLookupStatus").textContent="닉네임 또는 이름을 다시 확인해주세요.";setLiveEntryStepV434(2);byId("liveLookupIdentity").focus()}

async function loadPreviousCustomerInfo(){
  const nick=(byId("nickname").value||"").trim(), receiver=(byId("receiverName").value||"").trim(), phoneValue=(byId("phone").value||"").replace(/[^0-9]/g,"");
  const status=byId("previousCustomerStatus");
  if(phoneValue.length<10||(!nick&&!receiver)){status.textContent="연락처 전체번호와 닉네임 또는 수령인 이름을 먼저 입력해주세요.";return}
  try{
    status.textContent="이전 배송정보를 찾는 중입니다...";
    const r=await apiGet({action:"previousCustomerInfo",nickname:nick,receiverName:receiver,phone:phoneValue});
    if(!r.found){status.textContent=r.message||"이전 배송정보가 없습니다.";return}
    const c=r.customer||{};
    byId("receiverName").value=c.receiverName||"";byId("zipcode").value=c.zipcode||"";byId("address").value=c.address||"";byId("shippingMemo").value=c.shippingMemo||"";
    byId("detailAddress").value="";byId("detailAddress").required=false;byId("detailAddress").placeholder="이전 주소 전체가 위 주소칸에 저장되어 있습니다. 변경 없으면 비워두세요.";
    byId("shippingRegion").value=c.remote?"remote":"normal";useExistingFullAddress=true;schedulePaymentPreview();
    status.textContent="💗 이전 배송정보를 불러왔습니다. 주소가 맞는지 꼭 확인해주세요.";
  }catch(err){status.textContent=err.message}
}

function currentOrderProductsNicknameKeyV4414(){const el=byId("nickname"),v=el?(el.value||""):"";return String(v).trim().replace(/^@+/,"").replace(/\s+/g,"").toLowerCase()}
async function loadOrderProducts(show){const nickname=byId("nickname")?(byId("nickname").value||"").trim():"";const key=currentOrderProductsNicknameKeyV4414();const d=await apiGet({action:"products",nickname:nickname});orderProducts=Array.isArray(d.products)?d.products:[];orderProductsNicknameKey=key;if(!orderProducts.length)throw new Error("상품정보 시트에 등록된 상품이 없습니다.");if(show)alert("상품정보와 본인 댓글예약 수량을 새로 불러왔습니다.");return orderProducts}
function ensureOrderProductsLoaded(){const key=currentOrderProductsNicknameKeyV4414();if(orderProducts.length&&key===orderProductsNicknameKey)return Promise.resolve(orderProducts);if(orderProductsPromise){if(orderProductsPromiseKey===key)return orderProductsPromise;return orderProductsPromise.then(function(){return ensureOrderProductsLoaded()},function(){return ensureOrderProductsLoaded()})}orderProductsPromiseKey=key;orderProductsPromise=loadOrderProducts(false).finally(function(){orderProductsPromise=null;orderProductsPromiseKey=""});return orderProductsPromise}
function resetSingleProductSelection(){selectedOrderProduct=null;byId("singleProductName").value="";byId("singleProductColor").innerHTML='<option value="">칼라를 선택하세요</option>';byId("singleProductSize").innerHTML='<option value="">사이즈를 선택하세요</option>';byId("singleProductColor").disabled=true;byId("singleProductSize").disabled=true;byId("singleProductMessage").className="product-message";byId("singleProductMessage").textContent="상품번호 입력 후 검색을 눌러주세요."}
async function searchSingleProduct(){
  const no=byId("singleProductNo").value.trim();
  const nickname=(byId("nickname").value||"").trim();
  if(!nickname){byId("singleProductMessage").className="product-message error";byId("singleProductMessage").textContent="닉네임을 먼저 입력해주세요. 댓글 예약 고객은 닉네임으로 본인 예약수량을 확인합니다.";byId("nickname").focus();return}
  if(!no){byId("singleProductMessage").className="product-message error";byId("singleProductMessage").textContent="상품번호를 입력해주세요.";return}
  if(!/^\d{1,4}$/.test(no)||Number(no)<1||Number(no)>9999){byId("singleProductMessage").className="product-message error";byId("singleProductMessage").textContent="상품번호는 1~9999 사이로 입력해주세요.";return}
  byId("singleProductMessage").className="product-message";byId("singleProductMessage").textContent="상품정보와 댓글 예약수량을 확인하는 중입니다...";
  let p=null;
  try{const d=await apiGet({action:"productLookup",productNo:no,nickname:nickname});p=d.product||null;}catch(e){byId("singleProductMessage").className="product-message error";byId("singleProductMessage").textContent=e.message;return}
  if(!p){resetSingleProductSelection();byId("singleProductMessage").className="product-message error";byId("singleProductMessage").textContent="등록되지 않은 상품번호입니다.";return}
  selectedOrderProduct=p;byId("singleProductName").value=p.productName||"";byId("singleProductColor").innerHTML='<option value="">칼라를 선택하세요</option>';
  Object.keys(p.colors||{}).forEach(c=>{const o=document.createElement("option");o.value=c;o.textContent=c;byId("singleProductColor").appendChild(o)});
  byId("singleProductColor").disabled=false;byId("singleProductMessage").className="product-message success";byId("singleProductMessage").textContent="상품이 확인되었습니다. 댓글 예약이 있으면 본인 예약수량까지 포함해 주문가능 수량을 표시합니다."
}

function updateSingleSizes(){const c=byId("singleProductColor").value;byId("singleProductSize").innerHTML='<option value="">사이즈를 선택하세요</option>';if(!selectedOrderProduct||!c||!selectedOrderProduct.colors[c]){byId("singleProductSize").disabled=true;return}selectedOrderProduct.colors[c].forEach(s=>{const o=document.createElement("option");const stock=selectedOrderProduct.stocks&&selectedOrderProduct.stocks[c]?selectedOrderProduct.stocks[c][s]:null;o.value=s;o.textContent=s+(stock===0?" (주문가능 0개)":(stock!==null&&stock!==undefined?" · 주문가능 "+stock+"개":""));if(stock===0)o.disabled=true;byId("singleProductSize").appendChild(o)});byId("singleProductSize").disabled=false}
function changeSingleQuantity(n){byId("singleProductQuantity").value=Math.min(99,Math.max(1,Number(byId("singleProductQuantity").value||1)+n))}
function addSelectedProductToCart(){if(orderMode!=="manual"){alert("라이브 주문은 상품을 직접 수정할 수 없습니다.");return}const no=byId("singleProductNo").value.trim(),c=byId("singleProductColor").value,s=byId("singleProductSize").value,q=Math.min(99,Math.max(1,Number(byId("singleProductQuantity").value||1)));if(!selectedOrderProduct||String(selectedOrderProduct.productNo)!==no){alert("상품번호를 검색해주세요.");return}if(!c){alert("칼라를 선택해주세요.");return}if(!s){alert("사이즈를 선택해주세요.");return}const stock=selectedOrderProduct.stocks&&selectedOrderProduct.stocks[c]?selectedOrderProduct.stocks[c][s]:null;const already=orderCart.filter(x=>String(x.productNo)===no&&x.color===c&&x.size===s).reduce((sum,x)=>sum+Number(x.quantity||0),0);if(stock!==null&&stock!==undefined&&already+q>Number(stock)){alert("현재 남은 재고는 "+stock+"개입니다.");return}orderCart.push({productNo:no,productName:selectedOrderProduct.productName||"",color:c,size:s,quantity:q,price:Number(selectedOrderProduct.price||0)});renderOrderCart();byId("singleProductNo").value="";byId("singleProductQuantity").value="1";resetSingleProductSelection();byId("singleProductNo").focus()}
function removeCartItem(i){if(orderMode!=="manual")return;orderCart.splice(i,1);renderOrderCart()}
function getCurrentCartProductAmount(){return orderCart.reduce((a,x)=>a+Number(x.price||0)*Number(x.quantity||0),0)}
function renderOrderCart(){const cartList=byId("cartList"),purchaseSummary=byId("purchaseSummary");if(!orderCart.length){cartList.innerHTML='<div class="cart-empty">담긴 상품이 없습니다.</div>';purchaseSummary.textContent="상품을 담으면 구매내역이 자동으로 표시됩니다."}else{cartList.innerHTML=orderCart.map((x,i)=>`<div class="cart-item"><div class="cart-number">${i+1}</div><div class="cart-info"><strong>${escapeHtml(x.productNo)}번 ${escapeHtml(x.productName)}</strong><span>${escapeHtml(x.color)} / ${escapeHtml(x.size)} / ${x.quantity}개</span></div><div class="cart-side"><span class="cart-price">${money(x.price*x.quantity)}</span>${orderMode==="manual"?`<button type="button" class="cart-delete" data-index="${i}">🗑 삭제</button>`:"<span class=\"live-locked-label\">🔒 라이브 주문</span>"}</div></div>`).join("");cartList.querySelectorAll(".cart-delete").forEach(b=>b.addEventListener("click",()=>removeCartItem(Number(b.dataset.index))));purchaseSummary.textContent=orderCart.map(x=>`${x.productNo}번 ${x.productName} / ${x.color} / ${x.size} / ${x.quantity}개 / ${money(x.price*x.quantity)}`).join("\n")}const count=orderCart.reduce((a,x)=>a+Number(x.quantity||0),0),total=getCurrentCartProductAmount();byId("totalItemCount").textContent=count+"개";byId("grandTotal").textContent=money(total);schedulePaymentPreview()}
function updateCardVatNotice(){const isCard=byId("paymentMethod").value==="카드결제",notice=byId("cardVatNotice");if(notice)notice.classList.toggle("show",isCard);renderPaymentPreview(lastPaymentPreview||{});}
function schedulePaymentPreview(){clearTimeout(orderPreviewTimer);orderPreviewTimer=setTimeout(refreshPaymentPreview,550)}
async function refreshPaymentPreview(){
  const seq=++paymentPreviewSeq,current=getCurrentCartProductAmount(),receiver=byId("receiverName").value||"",phoneValue=byId("phone").value||"",remote=byId("shippingRegion").value==="remote";
  const fee=current?((current>=200000)?0:(remote?7000:4000)):0;
  let preview={existingProductAmount:0,currentProductAmount:current,cumulativeProductAmount:current,shippingFee:fee,cumulativeFinalAmount:current+fee,alreadyPaidAmount:0,amountDueNow:current+fee,additionalOrder:false,remote:remote};
  if(current>0&&receiver.trim()&&phoneValue.replace(/[^0-9]/g,"").length>=10){const key=[receiver.trim(),phoneValue.replace(/[^0-9]/g,""),current,remote?1:0].join("|");if(paymentPreviewCache.has(key))preview=paymentPreviewCache.get(key);else{try{const d=await apiGet({action:"paymentPreview",receiverName:receiver.trim(),phone:phoneValue,currentProductAmount:String(current),remote:remote?"1":"0"});if(d&&d.preview){preview=d.preview;paymentPreviewCache.set(key,preview);if(paymentPreviewCache.size>30)paymentPreviewCache.delete(paymentPreviewCache.keys().next().value)}}catch(e){console.warn("배송비 미리보기:",e.message)}}}
  if(seq!==paymentPreviewSeq)return;lastPaymentPreview=preview;renderPaymentPreview(preview)
}
function renderPaymentPreview(p){
  const current=Number(p.currentProductAmount||0),existing=Number(p.existingProductAmount||0),cumulative=Number(p.cumulativeProductAmount||0),fee=Number(p.shippingFee||0),finalAmount=Number(p.cumulativeFinalAmount||0),paid=Number(p.alreadyPaidAmount||0),due=Number(p.amountDueNow!==undefined?p.amountDueNow:Math.max(0,finalAmount-paid));
  const isCard=byId("paymentMethod")&&byId("paymentMethod").value==="카드결제",cardExtra=isCard?Math.round(due*0.10):0,displayDue=due+cardExtra;
  const set=(id,val)=>{const el=byId(id);if(el)el.textContent=money(val)};set("currentProductAmount",current);set("existingProductAmount",existing);set("cumulativeProductAmount",cumulative);set("calculatedShippingFee",fee);set("alreadyPaidAmount",paid);set("cumulativeFinalAmount",finalAmount);set("cardExtraAmount",cardExtra);set("amountDueNow",displayDue);
  const cardRow=byId("cardExtraAmountRow");if(cardRow)cardRow.classList.toggle("show",isCard&&due>0);const dueLabel=byId("amountDueNowLabel");if(dueLabel)dueLabel.textContent=isCard?"카드 최종 결제금액":"결제 예정 금액";
  const existingRow=byId("existingOrderAmountRow");if(existingRow)existingRow.classList.toggle("show",existing>0);const paidRow=byId("alreadyPaidAmountRow");if(paidRow)paidRow.classList.toggle("show",paid>0);
  const msg=byId("shippingMessage");if(msg){if(!current)msg.textContent="상품을 담으면 배송비와 결제 예정 금액이 자동으로 계산됩니다.";else if(paid>0)msg.innerHTML="✅ 이미 결제완료된 <strong>"+money(paid)+"</strong>을 제외한 금액만 입금하시면 됩니다.";else if(cumulative>=200000)msg.innerHTML="🎁 누적 상품금액이 20만원 이상이라 <strong>무료배송</strong>입니다.";else if(existing>0)msg.innerHTML="⭐ 추가 주문입니다. 기존 미결제 주문까지 합친 <strong>현재 미결제 금액</strong>입니다.";else msg.innerHTML=(p.remote?"🚚 제주·도서산간 배송비 7,000원이 적용됩니다.":"🚚 기본 배송비 4,000원이 적용됩니다.")}
  const hidden=byId("displayPaymentAmount");if(hidden)hidden.value=money(displayDue);const cb=byId("paymentConfirmCheckbox");if(cb)cb.checked=false
}

async function submitOrder(e){
  e.preventDefault();if(orderSubmitting)return;
  try{
    if(!orderMode)throw new Error("주문방법을 먼저 선택해주세요.");if(orderMode==="live"&&!liveOrderConfirmed)throw new Error("라이브 주문내용이 맞는지 먼저 확인해주세요.");if(!orderCart.length)throw new Error("주문 상품이 없습니다.");
    const data={action:"saveOrder",submissionId:getSubmissionIdV432(),orderMode:orderMode,liveOrderToken:liveOrderToken,liveOrderConfirmed:liveOrderConfirmed,nickname:byId("nickname").value.trim(),receiverName:byId("receiverName").value.trim(),phone:byId("phone").value.trim(),zipcode:byId("zipcode").value.trim(),address:byId("address").value.trim(),detailAddress:byId("detailAddress").value.trim(),useExistingFullAddress:useExistingFullAddress,shippingMemo:byId("shippingMemo").value.trim(),paymentMethod:byId("paymentMethod").value,isRemoteShipping:byId("shippingRegion").value==="remote",products:orderCart.map(x=>({productNo:x.productNo,color:x.color,size:x.size,quantity:x.quantity}))};
    if(!data.nickname||!data.receiverName)throw new Error("닉네임과 수령인 성함을 입력해주세요.");if(data.phone.replace(/[^0-9]/g,"").length<10)throw new Error("연락처를 정확하게 입력해주세요.");if(!data.zipcode||!data.address||(!data.useExistingFullAddress&&!data.detailAddress))throw new Error("주소와 상세주소를 확인해주세요.");
    // V4.42.3: 직접 주문 제출 전 별도 라이브 조회를 하지 않습니다. 서버가 한 번의 제출 요청에서 예약/재고를 최종 확인합니다.
    orderSubmitting=true;showLoading("주문서를 저장하고 있습니다.");byId("submitButton").disabled=true;
    const r=await apiPost(data);sessionStorage.removeItem(SUBMISSION_STORAGE_KEY);paymentPreviewCache.clear();saveCustomerInfo();byId("orderForm").style.display="none";byId("orderModeToolbar").style.display="none";
    const isCardComplete=byId("paymentMethod").value==="카드결제";lastCompletedAmountDue=Number(isCardComplete?(r.cardPaymentAmount!==undefined?r.cardPaymentAmount:Math.round(Number(r.amountDueNow||0)*1.10)):(r.amountDueNow!==undefined?r.amountDueNow:(r.cumulativeFinalAmount||r.paymentAmount||0)));
    byId("completePaymentAmount").textContent=money(lastCompletedAmountDue);
    const isCard=byId("paymentMethod").value==="카드결제",completeBank=byId("completeBankBox");if(completeBank)completeBank.style.display=isCard?"none":"block";
    const orderNo=byId("completeOrderNumber");if(orderNo)orderNo.textContent=r.orderNumber||"-";
    const itemCount=byId("completeItemCount");if(itemCount)itemCount.textContent=orderCart.reduce((sum,x)=>sum+Number(x.quantity||0),0)+"개";
    const paymentStatus=byId("completePaymentStatus");if(paymentStatus)paymentStatus.textContent=isCard?"카드결제대기":"미입금";
    const paymentMethodText=byId("completePaymentMethod");if(paymentMethodText)paymentMethodText.textContent=isCard?"카드결제":"무통장입금";
    const paymentLabel=byId("completePaymentLabel");if(paymentLabel)paymentLabel.textContent=isCard?"카드 결제 예정 금액":"지금 입금할 금액";
    const waitingWarn=byId("completeWaitingWarning");if(waitingWarn)waitingWarn.style.display=(orderMode==="live"&&currentLiveLookup&&Number(currentLiveLookup.waitingCount||0)>0)?"block":"none";
    const note=byId("completeShippingNote");if(note){note.textContent=isCard?"카드결제 링크 안내 후 결제해주세요":(Number(r.alreadyPaidAmount||0)>0?"이미 결제한 금액을 제외한 추가 입금액입니다":(r.cumulativeProductAmount>=200000?"20만원 이상 무료배송 적용":(r.additionalOrder?"기존 미결제 주문과 합산된 금액입니다":"배송비 포함 금액")))}
    byId("completeScreen").classList.add("show");window.scrollTo({top:0,behavior:"smooth"});
  }catch(err){alert(err.message)}finally{orderSubmitting=false;hideLoading();byId("submitButton").disabled=false}
}

function saveCustomerInfo(){localStorage.setItem(CUSTOMER_STORAGE_KEY,JSON.stringify({nickname:byId("nickname").value.trim(),receiverName:byId("receiverName").value.trim(),phone:byId("phone").value.trim(),zipcode:byId("zipcode").value.trim(),address:byId("address").value.trim(),detailAddress:useExistingFullAddress?"":byId("detailAddress").value.trim(),shippingMemo:byId("shippingMemo").value.trim(),shippingRegion:byId("shippingRegion").value}))}
function loadSavedCustomer(){try{const raw=localStorage.getItem(CUSTOMER_STORAGE_KEY);if(!raw)return;const info=JSON.parse(raw);Object.keys(info).forEach(k=>{const e=byId(k);if(e)e.value=info[k]||""});if(info.nickname||info.phone)byId("savedNotice").classList.add("show");schedulePaymentPreview()}catch(e){console.error(e)}}
function clearSavedCustomer(){if(!confirm("이 브라우저에 저장된 고객정보를 지울까요?"))return;localStorage.removeItem(CUSTOMER_STORAGE_KEY);["nickname","receiverName","phone","zipcode","address","detailAddress","shippingMemo"].forEach(id=>byId(id).value="");byId("shippingRegion").value="normal";byId("savedNotice").classList.remove("show");byId("previousCustomerStatus").textContent="";useExistingFullAddress=false;byId("detailAddress").required=true;byId("detailAddress").placeholder="상세주소를 입력해주세요";schedulePaymentPreview()}
function finishOrder(){byId("completeScreen").classList.remove("show");orderCart=[];orderMode="";liveOrderToken="";liveOrderConfirmed=false;currentLiveLookup=null;liveLookupPhoneVerified=false;liveLookupExistingCustomer=false;liveLookupPhoneValue="";lastCompletedAmountDue=0;rotateSubmissionIdV432();renderOrderCart();loadSavedCustomer();byId("nickname").readOnly=false;byId("orderModeChooser").style.display="block";byId("liveLookupPanel").style.display="none";byId("orderForm").style.display="none";byId("orderModeToolbar").style.display="none";window.scrollTo({top:0,behavior:"smooth"})}
function formatPhoneInput(e){let n=e.target.value.replace(/[^0-9]/g,"").slice(0,11);e.target.value=n.length<=3?n:n.length<=7?n.slice(0,3)+"-"+n.slice(3):n.slice(0,3)+"-"+n.slice(3,7)+"-"+n.slice(7)}
let postcodeScriptPromise=null;let postcodeEmbedded=false;
function loadPostcodeScript(){if(window.daum&&window.daum.Postcode)return Promise.resolve();if(postcodeScriptPromise)return postcodeScriptPromise;postcodeScriptPromise=new Promise((resolve,reject)=>{const sc=document.createElement("script");sc.src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";sc.async=true;sc.onload=()=>window.daum&&window.daum.Postcode?resolve():reject(new Error("주소검색 모듈을 초기화하지 못했습니다."));sc.onerror=()=>reject(new Error("주소검색 서비스를 불러오지 못했습니다."));document.head.appendChild(sc)});return postcodeScriptPromise}
function setAddressSearchStatus(message,isError){const el=byId("addressSearchStatus");if(!el)return;el.textContent=message;el.classList.toggle("address-manual-help",!!isError)}
function enableManualAddressFallback(){const zip=byId("zipcode"),addr=byId("address");if(zip){zip.readOnly=false;zip.placeholder="우편번호 직접 입력"}if(addr){addr.readOnly=false;addr.placeholder="주소를 직접 입력해주세요"}setAddressSearchStatus("주소검색이 차단된 환경입니다. 우편번호와 주소를 직접 입력할 수 있게 전환했습니다.",true);useExistingFullAddress=false;byId("detailAddress").required=true}
async function openAddressSearch(){const panel=byId("addressSearchPanel"),embed=byId("postcodeEmbed");if(!panel||!embed)return;panel.classList.add("show");panel.setAttribute("aria-hidden","false");setAddressSearchStatus("주소검색을 불러오는 중입니다...",false);try{await loadPostcodeScript();setAddressSearchStatus("도로명, 건물명 또는 지번으로 검색해주세요.",false);if(!postcodeEmbedded){new window.daum.Postcode({width:"100%",height:"100%",oncomplete:d=>{byId("zipcode").value=d.zonecode||"";byId("address").value=d.userSelectedType==="R"?(d.roadAddress||""):(d.jibunAddress||"");byId("detailAddress").value="";byId("detailAddress").required=true;byId("detailAddress").placeholder="상세주소를 입력해주세요";useExistingFullAddress=false;byId("shippingRegion").value=String(byId("address").value).indexOf("제주")!==-1?"remote":"normal";schedulePaymentPreview();closeAddressSearch();setTimeout(()=>byId("detailAddress").focus(),50)}}).embed(embed);postcodeEmbedded=true}panel.scrollIntoView({behavior:"smooth",block:"center"})}catch(err){console.error(err);enableManualAddressFallback()}}
function closeAddressSearch(){const panel=byId("addressSearchPanel");if(panel){panel.classList.remove("show");panel.setAttribute("aria-hidden","true")}}


/* =========================
   관리자
========================= */
let adminOrders = [];
let adminProducts = [];
let adminOrderSource = "current";
let adminHasSearched = false;
let adminPaymentFilter = "all";

function initAdminProtectedPageV427() {
  const gate = document.getElementById("adminLoginGate");
  const app = document.getElementById("adminApp");
  const input = document.getElementById("adminPasswordInput");
  const loginButton = document.getElementById("adminLoginButton");
  const errorBox = document.getElementById("adminLoginError");

  function setError(message) {
    if (errorBox) errorBox.textContent = message || "";
  }

  async function revealAdmin() {
    if (gate) gate.style.display = "none";
    if (app) app.style.display = "";
    initAdminPage();
  }

  async function login() {
    const password = input ? input.value : "";
    if (!password) { setError("비밀번호를 입력해주세요."); return; }
    if (loginButton) loginButton.disabled = true;
    setError("");
    try {
      const result = await apiPost({action:"adminLogin", password:password});
      adminTokenV427 = String(result && result.token || "");
      adminRoleV435 = String(result && result.role || "admin");
      if (!adminTokenV427) throw new Error("로그인 토큰을 받지 못했습니다.");
      sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, adminTokenV427);
      sessionStorage.setItem("ssinne_admin_role_v435", adminRoleV435);
      if (input) input.value = "";
      await revealAdmin();
    } catch (error) {
      adminTokenV427 = "";
      sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
      setError(error.message || "관리자 로그인에 실패했습니다.");
      if (input) { input.focus(); input.select(); }
    } finally {
      if (loginButton) loginButton.disabled = false;
    }
  }

  if (loginButton) loginButton.addEventListener("click", login);
  if (input) input.addEventListener("keydown", function(event){
    if (event.key === "Enter") { event.preventDefault(); login(); }
  });

  adminTokenV427 = sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY) || "";
  if (adminTokenV427) {
    apiGet({action:"adminSessionCheck"}).then(function(result){
      if (result && result.valid) { adminRoleV435=String(result.role||sessionStorage.getItem("ssinne_admin_role_v435")||"admin"); sessionStorage.setItem("ssinne_admin_role_v435",adminRoleV435); revealAdmin(); }
      else {
        adminTokenV427 = "";
        sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
        if (input) input.focus();
      }
    }).catch(function(){
      adminTokenV427 = "";
      sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
      if (input) input.focus();
    });
  } else if (input) {
    setTimeout(function(){ input.focus(); }, 50);
  }
}

async function logoutAdminV427() {
  const token = adminTokenV427;
  try {
    if (token) await apiPost({action:"adminLogout", adminToken:token});
  } catch (error) {}
  adminTokenV427 = "";
  adminRoleV435 = "";
  sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  sessionStorage.removeItem("ssinne_admin_role_v435");
  location.reload();
}

function initAdminPage() {
  initAdminV450Page();
}

const adminTabLoadedAtV442={};
function adminTabNeedsLoadV442(key,maxAgeMs){const now=Date.now(),last=Number(adminTabLoadedAtV442[key]||0);if(now-last<maxAgeMs)return false;adminTabLoadedAtV442[key]=now;return true;}

function showAdminTab(tabName) {
  if(adminRoleV435==="cs" && ["orders","live","bankmatch","products"].includes(tabName)) tabName="cs";
  document.querySelectorAll(".side-link[data-tab]").forEach(function(button){button.classList.toggle("active",button.dataset.tab===tabName);});
  document.querySelectorAll(".tab-section").forEach(function(section){section.classList.toggle("active",section.id===tabName+"Tab");});
  document.querySelectorAll("[data-mobile-tab]").forEach(function(button){button.classList.toggle("active",button.dataset.mobileTab===tabName);});
  document.body.dataset.adminTab=tabName;
  const homeTopbarV4406=byId("adminHomeTopbarV4406");
  if(homeTopbarV4406) homeTopbarV4406.hidden=(tabName!=="home");
  document.body.classList.remove("mobile-sidebar-open","mobile-more-open-v4406","mobile-settings-open-v4406");
  const moreSheetV4406=byId("mobileMoreSheetV4406"); if(moreSheetV4406) moreSheetV4406.setAttribute("aria-hidden","true");
  if(tabName==="products"&&adminTabNeedsLoadV442("products",30000))loadAdminProducts();
  if(tabName==="bankmatch"&&adminTabNeedsLoadV442("bankmatch",30000))loadBankMatchOrders();
  if(tabName==="live"){startAdminLiveAutoV432();if(adminTabNeedsLoadV442("live",15000))loadAdminLiveDashboardV432();if(adminTabNeedsLoadV442("broadcast",30000))loadBroadcastStatusV435();}else stopAdminLiveAutoV432();
  if(tabName==="cs"&&adminTabNeedsLoadV442("cs",20000))loadCsDashboardV435();
  if(tabName==="home"&&adminTabNeedsLoadV442("home",20000))loadAdminHomeV435();
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
  setOrderSummaryActiveV4404("");

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
          ["입금완료","카드결제완료","카드결제"].includes(order.paymentStatus)
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
  setOrderSummaryActiveV4404("");

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

function setOrderSummaryActiveV4404(which){
  ["summaryAllCardV4404","summaryPaidCardV4404","summaryUnpaidCard"].forEach(function(id){const el=document.getElementById(id);if(el)el.classList.toggle("active-filter",id===which);});
}
function showAllOrdersV4404(){
  if(!adminHasSearched){alert("먼저 조회하기, 오늘 주문 또는 전체 보기를 눌러 주문을 조회해주세요.");return;}
  adminPaymentFilter="all";setOrderSummaryActiveV4404("summaryAllCardV4404");renderAdminOrders();showOrderListView();
}
function showPaidOrdersV4404(){
  if(!adminHasSearched){alert("먼저 조회하기, 오늘 주문 또는 전체 보기를 눌러 주문을 조회해주세요.");return;}
  adminPaymentFilter="paid";setOrderSummaryActiveV4404("summaryPaidCardV4404");renderAdminOrders();showOrderListView();
}

function showUnpaidAndCardOrders() {
  if (!adminHasSearched) {
    alert("먼저 조회하기, 오늘 주문 또는 전체 보기를 눌러 주문을 조회해주세요.");
    return;
  }

  adminPaymentFilter = "unpaid-card";
  setOrderSummaryActiveV4404("summaryUnpaidCard");
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
      return ["입금완료","카드결제완료","카드결제"].includes(order.paymentStatus);
    }).length;

  const unpaidSummary = document.getElementById("summaryUnpaidCount");
  if (unpaidSummary) {
    unpaidSummary.textContent = adminOrders.filter(function (order) {
      return ["미입금","카드결제대기","카드링크발송"].includes(order.paymentStatus);
    }).length;
  }

  const total = adminOrders.reduce(function (sum, order) {
    return sum + Number(order.paymentAmount || 0);
  }, 0);

  document.getElementById("summaryPaymentTotal").textContent = money(total);

  const displayOrders = adminPaymentFilter === "unpaid-card"
    ? adminOrders.filter(function(order) {
        return ["미입금","카드결제대기","카드링크발송"].includes(order.paymentStatus);
      })
    : adminPaymentFilter === "paid"
      ? adminOrders.filter(function(order){return ["입금완료","카드결제완료","카드결제"].includes(order.paymentStatus);})
      : adminOrders;

  if (!displayOrders.length) {
    tbody.innerHTML = '<tr><td colspan="14" class="empty-cell">' +
      (adminPaymentFilter === "unpaid-card"
        ? '미입금 또는 카드결제 주문이 없습니다.'
        : adminPaymentFilter === "paid"
          ? '입금완료된 주문이 없습니다.'
          : '조회된 주문이 없습니다.') +
      '</td></tr>';
    return;
  }

  tbody.innerHTML = displayOrders.map(function (order) {
    const isHistory = adminOrderSource === "history";
    const trackingNumber = order.trackingNumber || "";
    const courier = order.courier || (isHistory ? "롯데택배" : "");

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
            <option value="카드결제대기" ${order.paymentStatus === "카드결제대기" ? "selected" : ""}>카드결제대기</option>
            <option value="카드링크발송" ${order.paymentStatus === "카드링크발송" ? "selected" : ""}>카드링크발송</option>
            <option value="카드결제완료" ${order.paymentStatus === "카드결제완료" ? "selected" : ""}>카드결제완료</option>
            <option value="카드결제" ${order.paymentStatus === "카드결제" ? "selected" : ""}>카드결제(기존)</option>
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
            <span class="shipping-badge">${escapeHtml(courier || "롯데택배")}</span>
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
                 href="https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=${encodeURIComponent(String(trackingNumber).replace(/[^0-9]/g, ""))}">
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
  if (["입금완료","카드결제완료"].includes(select.value)) select.classList.add("status-paid");
  if (["카드결제대기","카드링크발송","카드결제"].includes(select.value)) select.classList.add("status-card");
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
      courier: "롯데택배",
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
  if (version.indexOf("V4.52.0") !== 0) {
    throw new Error("Apps Script 서버 버전을 확인해주세요.\n현재 서버: " + (version || "확인불가") + "\n\nV4.52.0 기능을 사용하려면 V4.52.0 Code.gs를 새 버전으로 배포해야 합니다.");
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
  showLoading("전체주문이력을 저장/갱신 중입니다. 잠시만 기다려주세요.");
  try {
    const result = await apiPost({ action: "archiveCurrentOrders" });
    hideLoading();
    alert(result.message || "전체주문이력 저장/갱신이 완료되었습니다.");
  } catch (error) {
    hideLoading();
    alert("전체주문이력 저장/갱신 중 오류: " + (error.message || error));
  } finally {
    if (btn) btn.disabled = false;
  }
}

function excelDateLabelV423(startDate, endDate) {
  const a = String(startDate || "").replace(/-/g, "");
  const b = String(endDate || "").replace(/-/g, "");
  if (!a && !b) return todayString().replace(/-/g, "");
  if (!b || a === b) return a || b;
  return a + "-" + b;
}

async function downloadSupplierOrderExcelV423() {
  try { await ensureXlsxLibraryLoadedV4392(); }
  catch (error) { alert(error.message || "엑셀 기능을 불러오지 못했습니다."); return; }
  const btn = document.getElementById("rebuildButton");
  if (btn) btn.disabled = true;
  showLoading("거래처발주 엑셀을 만드는 중입니다.");
  try {
    await ensureBackendV414();
    const response = await apiGet({action:"supplierOrderExport", _ts:Date.now()});
    const data = response && response.data ? response.data : {};
    const rows = Array.isArray(data.rows) ? data.rows : [];
    if (!rows.length) throw new Error("거래처에 발주할 주문이 없습니다.");

    const aoa = [["상품번호","상품명","칼라","사이즈","총수량","입금가","총금액","주문자(닉네임,수량)"]];
    rows.forEach(function(row){
      aoa.push([
        row.productNo || "", row.productName || "", row.color || "", row.size || "",
        Number(row.totalQuantity || 0), Number(row.depositPrice || 0), Number(row.totalAmount || 0), row.customers || ""
      ]);
    });
    aoa.push(["합계","","","",Number(data.totalQuantity || 0),"",Number(data.totalAmount || 0),""]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{wch:12},{wch:26},{wch:14},{wch:14},{wch:11},{wch:14},{wch:16},{wch:34}];
    for (let r = 1; r < aoa.length; r++) {
      const e = ws[XLSX.utils.encode_cell({r:r,c:4})]; if (e) e.z = "#,##0";
      const f = ws[XLSX.utils.encode_cell({r:r,c:5})]; if (f) f.z = "#,##0";
      const g = ws[XLSX.utils.encode_cell({r:r,c:6})]; if (g) g.z = "#,##0";
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "거래처발주");
    const date = todayString().replace(/-/g, "");
    XLSX.writeFile(wb, "씬느샵_거래처발주_" + date + ".xlsx");
    alert("거래처발주 엑셀을 만들었습니다.\n\n총수량: " + Number(data.totalQuantity || 0).toLocaleString("ko-KR") + "개\n총금액: " + Number(data.totalAmount || 0).toLocaleString("ko-KR") + "원\n\n마지막 행에 총수량과 총금액이 자동으로 들어갑니다.");
  } catch(error) {
    alert("거래처발주 다운로드 오류: " + (error.message || error));
  } finally {
    hideLoading();
    if (btn) btn.disabled = false;
  }
}

function openCombinedShippingModalV423() {
  const modal = document.getElementById("combinedShippingModal");
  const start = document.getElementById("combinedStartDate");
  const end = document.getElementById("combinedEndDate");
  const adminStart = document.getElementById("startDate");
  const adminEnd = document.getElementById("endDate");
  const today = todayString();
  const startValue = (adminStart && adminStart.value) || today;
  const endValue = (adminEnd && adminEnd.value) || startValue;
  if (start) start.value = startValue;
  if (end) end.value = endValue;
  if (modal) { modal.classList.add("show"); modal.setAttribute("aria-hidden","false"); }
}

function closeCombinedShippingModalV423() {
  const modal = document.getElementById("combinedShippingModal");
  if (modal) { modal.classList.remove("show"); modal.setAttribute("aria-hidden","true"); }
}

async function downloadCombinedShippingExcelV423() {
  try { await ensureXlsxLibraryLoadedV4392(); }
  catch (error) { alert(error.message || "엑셀 기능을 불러오지 못했습니다."); return; }
  const btn = document.getElementById("combinedShippingButton");
  const startDate = (document.getElementById("combinedStartDate") || {}).value || "";
  const endDate = (document.getElementById("combinedEndDate") || {}).value || "";
  if (!startDate || !endDate) { alert("합배송 고객을 확인할 시작일과 종료일을 선택해주세요."); return; }
  if (startDate > endDate) { alert("시작일이 종료일보다 늦습니다."); return; }
  closeCombinedShippingModalV423();
  if (btn) btn.disabled = true;
  showLoading(startDate + " ~ " + endDate + " 합배송 가능 고객을 찾는 중입니다.");
  try {
    await ensureBackendV414();
    const response = await apiGet({action:"combinedShippingCandidates", startDate:startDate, endDate:endDate, _ts:Date.now()});
    const data = response && response.data ? response.data : {};
    const customers = Array.isArray(data.customers) ? data.customers : [];
    if (!customers.length) {
      alert("선택한 기간에는 합배송 가능한 고객이 없습니다.");
      return;
    }
    const aoa = [["수령인","닉네임"]];
    customers.forEach(function(item){ aoa.push([item.receiverName || "", item.nickname || ""]); });
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!cols"] = [{wch:18},{wch:32}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "합배송가능고객");
    const date = excelDateLabelV423(startDate,endDate);
    XLSX.writeFile(wb, "씬느샵_합배송가능고객_" + date + ".xlsx");
    alert("합배송 가능 고객 " + customers.length + "명을 엑셀로 저장했습니다.\n\n기준: 전체주문이력의 선택 기간 안에서 수령인 + 연락처가 같은 주문 2건 이상\n저장 항목: 수령인 / 닉네임");
  } catch(error) {
    alert("합배송 고객 다운로드 오류: " + (error.message || error));
  } finally {
    hideLoading();
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

function renderAdminProductsV434Legacy_() {
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
    tbody.innerHTML = '<tr><td colspan="11" class="empty-cell">표시할 상품정보가 없습니다.</td></tr>';
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
        <td data-label="현재재고">${product.stockManaged ? Number(product.currentStock).toLocaleString("ko-KR") + "개" : "미설정"}</td>
        <td data-label="라이브예약">${product.stockManaged ? Number(product.reservedStock||0).toLocaleString("ko-KR") + "개" : "-"}</td>
        <td data-label="추가주문가능"><strong>${product.stockManaged ? Number(product.availableStock||0).toLocaleString("ko-KR") + "개" : "미설정"}</strong></td>
        <td data-label="상태"><span class="stock-status ${["품절","예약품절"].includes(product.status) ? "soldout" : ""}">${escapeHtml(product.status || "재고미설정")}</span></td>
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

function editAdminProductV434Legacy_(rowNumber) {
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
  document.getElementById("adminCurrentStock").value = product.stockManaged ? product.currentStock : "";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetAdminProductFormV434Legacy_() {
  document.getElementById("productFormTitle").textContent = "상품정보 추가";
  document.getElementById("productRowNumber").value = "";
  document.getElementById("adminProductNo").value = "";
  document.getElementById("adminProductName").value = "";
  document.getElementById("adminProductColor").value = "";
  document.getElementById("adminProductSize").value = "";
  document.getElementById("adminSalePrice").value = "";
  document.getElementById("adminDepositPrice").value = "";
  document.getElementById("adminCurrentStock").value = "";
}

async function saveAdminProductV434Legacy_() {
  const payload = {
    action: "saveProduct",
    rowNumber: Number(document.getElementById("productRowNumber").value || 0),
    productNo: document.getElementById("adminProductNo").value.trim(),
    productName: document.getElementById("adminProductName").value.trim(),
    color: document.getElementById("adminProductColor").value.trim(),
    size: document.getElementById("adminProductSize").value.trim(),
    salePrice: Number(document.getElementById("adminSalePrice").value || 0),
    depositPrice: Number(document.getElementById("adminDepositPrice").value || 0),
    currentStock: document.getElementById("adminCurrentStock").value.trim()
  };

  if (!payload.productNo || !payload.productName || !payload.color || !payload.size) {
    alert("상품번호, 상품명, 칼라, 사이즈를 모두 입력해주세요.");
    return;
  }

  if (!/^\d{1,4}$/.test(payload.productNo) || Number(payload.productNo) < 1 || Number(payload.productNo) > 9999) {
    alert("상품번호는 1~9999 사이의 숫자로 입력해주세요.");
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
  if(!orders.length){c.innerHTML='<div class="customer-empty-new"><span>♡</span><strong>일치하는 주문이 없습니다</strong><p>수령인 성함과 연락처 뒤 4자리를<br>다시 확인해주세요.</p></div>';return;}
  c.innerHTML=orders.map(function(o){const tr=o.trackingNumber||"",numeric=String(tr).replace(/[^0-9]/g,""),courier=o.courier||"롯데택배",trackingUrl=courier.indexOf("롯데")>=0?("https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo="+encodeURIComponent(numeric)):("https://trace.cjlogistics.com/next/tracking.html?wblNo="+encodeURIComponent(numeric));return `<article class="order-result-card v2-order-card">
    <div class="v2-card-head"><div><span>${escapeHtml(o.orderDate||"보관 주문")}</span><h3>주문번호 ${escapeHtml(o.orderNumber||"-")}</h3></div><b class="status-pill ${o.paymentStatus==='미입금'?'unpaid':(o.paymentStatus==='카드결제'?'card-paid':'paid')}">${escapeHtml(o.paymentStatus)}</b></div>
    <div class="order-result-items">${escapeHtml(o.orderItems)}</div><div class="v2-total"><span>총 주문금액</span><strong>${money(o.paymentAmount)}</strong></div>
    ${tr&&['입금완료','카드결제완료','카드결제'].includes(o.paymentStatus)?`<div class="customer-delivery-box"><div><span>${escapeHtml(courier)}</span><strong>${escapeHtml(tr)}</strong></div><a class="delivery-button" target="_blank" rel="noopener" href="${trackingUrl}">배송조회</a></div>`:''}
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
    "삭제한 주문은 복구할 수 없습니다. 다시 주문하려면 주문서를 새로 작성해주세요."
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
  const productNo = editAddProductNo.value.replace(/[^0-9]/g, "").slice(0, 4);
  editAddProductNo.value = productNo;
  if (!/^\d{1,4}$/.test(productNo) || Number(productNo) < 1 || Number(productNo) > 9999) {
    resetEditAddProduct();
    editAddProductNo.value = productNo;
    editAddMessage.textContent = "상품번호는 1~9999 사이로 입력해주세요.";
    editAddMessage.className = "edit-product-message error";
    return;
  }
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
    const modal=document.getElementById("customerEditModal"),closeBtn=document.getElementById("closeCustomerEdit"),saveBtn=document.getElementById("saveCustomerEdit"),addNo=document.getElementById("editAddProductNo"),searchBtn=document.getElementById("editAddSearchButton"),colorSel=document.getElementById("editAddColor"),addBtn=document.getElementById("editAddProductButton");
    if(closeBtn&&modal)closeBtn.addEventListener("click",()=>modal.classList.remove("show"));
    if(saveBtn)saveBtn.addEventListener("click",saveCustomerEditV2);
    if(modal)modal.addEventListener("click",event=>{if(event.target===modal)modal.classList.remove("show")});
    if(addNo){
      addNo.addEventListener("input",function(event){event.target.value=event.target.value.replace(/[^0-9]/g,"").slice(0,4);resetEditAddProduct();addNo.value=event.target.value;});
      addNo.addEventListener("keydown",function(event){if(event.key==="Enter"){event.preventDefault();searchEditAddProduct();}});
    }
    if(searchBtn)searchBtn.addEventListener("click",searchEditAddProduct);
    if(colorSel)colorSel.addEventListener("change",updateEditAddSizes);
    if(addBtn)addBtn.addEventListener("click",addEditOrderProduct);
  }
});



let adminLiveTimerV432=null;
let adminLiveDataV4404=null;
let adminLiveStatusFilterV4404="all";
let adminLiveSelectedRowsV4411=new Set();
function initAdminLiveV432(){
  const reload=byId("liveReloadButton"),collect=byId("liveCollectNowButton"),setBtn=byId("liveSetSaleButton"),clearBtn=byId("liveClearSaleButton");
  document.querySelectorAll("[data-live-summary-status]").forEach(function(card){card.onclick=function(){setLiveSummaryFilterV4404(card.dataset.liveSummaryStatus);};});
  if(reload)reload.onclick=loadAdminLiveDashboardV432;
  if(collect)collect.onclick=async()=>{try{showLoading("라이브 채팅을 수집하고 있습니다.");const r=await apiPost({action:"adminLiveCollect"});await loadAdminLiveDashboardV432();if(r&&r.skipped)console.log("YouTube 권장 수집간격 대기",r.nextPollMs)}catch(e){alert(e.message)}finally{hideLoading()}};
  if(setBtn)setBtn.onclick=async()=>{try{await apiPost({action:"adminLiveSetSale",productNo:(byId("liveSaleProductNo").value||"").trim(),color:(byId("liveSaleColor").value||"").trim(),size:(byId("liveSaleSize").value||"").trim()});await loadAdminLiveDashboardV432()}catch(e){alert(e.message)}};
  if(clearBtn)clearBtn.onclick=async()=>{if(!confirm("현재 판매상품 설정을 지울까요?"))return;try{await apiPost({action:"adminLiveSetSale",productNo:"",color:"",size:""});await loadAdminLiveDashboardV432()}catch(e){alert(e.message)}};
  const selectAll=byId("liveSelectAllV4411"), bulkApply=byId("liveBulkApplyV4411");
  if(selectAll)selectAll.onchange=()=>toggleLiveSelectAllV4411(selectAll.checked);
  if(bulkApply)bulkApply.onclick=applyLiveBulkStatusV4411;
}
function startAdminLiveAutoV432(){stopAdminLiveAutoV432();adminLiveTimerV432=setInterval(async()=>{if(!byId("liveTab")||!byId("liveTab").classList.contains("active")||document.hidden)return;try{await loadAdminLiveDashboardV432(true)}catch(e){console.warn("라이브 자동갱신",e.message)}},30000)}
function stopAdminLiveAutoV432(){if(adminLiveTimerV432){clearInterval(adminLiveTimerV432);adminLiveTimerV432=null}}
async function loadAdminLiveDashboardV432(silent){try{if(!silent)showLoading("라이브 주문을 불러오는 중입니다.");const d=await apiGet({action:"adminLiveDashboard"});renderAdminLiveDashboardV432(d)}catch(e){if(!silent)alert(e.message)}finally{if(!silent)hideLoading()}}
function renderAdminLiveDashboardV432(d){
  adminLiveDataV4404=d||{};
  const c=d.counts||{},sale=d.currentSale||{};[ ["liveReservedCount",c.reserved],["liveReviewCount",c.review],["liveWaitingCount",c.waiting],["liveCancelledCount",c.cancelled] ].forEach(x=>{const el=byId(x[0]);if(el)el.textContent=Number(x[1]||0)});const badge=byId("liveNavBadge");if(badge)badge.textContent=Number(c.review||0)+Number(c.waiting||0);
  const conn=byId("liveConnectionStatus");if(conn)conn.innerHTML=(d.youtube&&d.youtube.connected?"🟢 YouTube 방송 연결됨":"⚪ YouTube 방송 미연결")+(sale.broadcastId?" · 방송ID "+escapeHtml(sale.broadcastId):"");
  const cur=byId("liveCurrentSale");if(cur)cur.innerHTML=sale.productNo?`현재 판매: <strong>${escapeHtml(sale.productNo)}번</strong> ${sale.color?" · "+escapeHtml(sale.color):""} ${sale.size?" · "+escapeHtml(sale.size):""}`:"현재 판매상품 없음";
  if(sale.productNo){byId("liveSaleProductNo").value=sale.productNo;byId("liveSaleColor").value=sale.color||"";byId("liveSaleSize").value=sale.size||""}
  renderLiveOrdersV4404(d.orders||[]);
  const issueBox=byId("liveIssueList"),issues=d.issues||[];if(issueBox)issueBox.innerHTML=issues.length?issues.map(x=>`<article class="live-issue-card"><div><b>${escapeHtml(x.nickname||"")} · ${escapeHtml(x.type||"확인필요")}</b><span>${escapeHtml(x.status||"접수")}</span></div><p>${escapeHtml(x.message||"")}</p>${x.items?`<pre>${escapeHtml(x.items)}</pre>`:""}<button class="btn btn-primary live-issue-done" data-row="${x.rowNumber}">확인완료</button></article>`).join(""):'<div class="empty-state">확인필요 항목이 없습니다.</div>';
  if(issueBox)issueBox.querySelectorAll(".live-issue-done").forEach(b=>b.onclick=()=>handleAdminLiveIssueV432(Number(b.dataset.row)));
  renderBroadcastStatusV435(d.broadcast||{},d.youtube||{});
}
function setLiveSummaryFilterV4404(status){
  adminLiveStatusFilterV4404=(adminLiveStatusFilterV4404===status)?"all":status;
  adminLiveSelectedRowsV4411.clear();
  document.querySelectorAll("[data-live-summary-status]").forEach(function(card){card.classList.toggle("active-summary-v4404",adminLiveStatusFilterV4404!=="all"&&card.dataset.liveSummaryStatus===adminLiveStatusFilterV4404);});
  renderLiveOrdersV4404((adminLiveDataV4404&&adminLiveDataV4404.orders)||[]);
  const table=byId("liveAdminOrderList");if(table&&table.closest(".table-wrap"))table.closest(".table-wrap").scrollIntoView({behavior:"smooth",block:"start"});
}
function renderLiveOrdersV4404(orders){
  const body=byId("liveAdminOrderList");if(!body)return;
  const allOrders=orders||[];
  const validRows=new Set(allOrders.map(o=>Number(o.rowNumber)).filter(Boolean));
  Array.from(adminLiveSelectedRowsV4411).forEach(r=>{if(!validRows.has(Number(r)))adminLiveSelectedRowsV4411.delete(Number(r));});
  const list=allOrders.filter(function(o){return adminLiveStatusFilterV4404==="all"||String(o.status||"")===adminLiveStatusFilterV4404;});
  body.innerHTML=list.length?list.map(o=>{const row=Number(o.rowNumber||0),disabled=o.status==="주문서완료";return `<tr><td class="live-check-col-v4411"><input type="checkbox" class="live-row-check-v4411" data-row="${row}" ${adminLiveSelectedRowsV4411.has(row)?"checked":""} ${disabled?"disabled title=\"주문서완료 건은 고객주문에서 관리합니다\"":""}></td><td>${escapeHtml(o.time||"")}</td><td><strong>${escapeHtml(o.nickname||"")}</strong></td><td class="live-msg-cell">${escapeHtml(o.message||"")}</td><td>${escapeHtml(o.productNo||"")} ${escapeHtml(o.color||"")} ${escapeHtml(o.size||"")}</td><td>${Number(o.quantity||0)}</td><td><span class="live-status-pill ${liveStatusClassV432(o.status)}">${escapeHtml(o.status||"")}</span>${o.customerConfirm&&o.customerConfirm!=="확인완료"?`<small class="live-customer-flag">${escapeHtml(o.customerConfirm)}</small>`:""}</td><td>${liveActionButtonsV432(o)}</td></tr>`;}).join(""):`<tr><td colspan="8" class="empty-cell">${adminLiveStatusFilterV4404==="all"?"현재 방송 주문이 없습니다.":escapeHtml(adminLiveStatusFilterV4404)+" 주문이 없습니다."}</td></tr>`;
  body.querySelectorAll("[data-live-action]").forEach(btn=>btn.onclick=()=>handleAdminLiveOrderActionV432(btn));
  body.querySelectorAll(".live-row-check-v4411").forEach(cb=>cb.onchange=()=>{const row=Number(cb.dataset.row);if(cb.checked)adminLiveSelectedRowsV4411.add(row);else adminLiveSelectedRowsV4411.delete(row);updateLiveBulkUiV4411();});
  updateLiveBulkUiV4411();
}
function visibleLiveSelectableRowsV4411(){return Array.from(document.querySelectorAll("#liveAdminOrderList .live-row-check-v4411:not(:disabled)")).map(cb=>Number(cb.dataset.row)).filter(Boolean);}
function toggleLiveSelectAllV4411(checked){visibleLiveSelectableRowsV4411().forEach(row=>{if(checked)adminLiveSelectedRowsV4411.add(row);else adminLiveSelectedRowsV4411.delete(row);});document.querySelectorAll("#liveAdminOrderList .live-row-check-v4411:not(:disabled)").forEach(cb=>cb.checked=checked);updateLiveBulkUiV4411();}
function updateLiveBulkUiV4411(){const count=byId("liveBulkSelectedCountV4411"),all=byId("liveSelectAllV4411");if(count)count.textContent=adminLiveSelectedRowsV4411.size+"건 선택";if(all){const visible=visibleLiveSelectableRowsV4411();const selected=visible.filter(r=>adminLiveSelectedRowsV4411.has(r)).length;all.checked=visible.length>0&&selected===visible.length;all.indeterminate=selected>0&&selected<visible.length;}}
async function applyLiveBulkStatusV4411(){const rows=Array.from(adminLiveSelectedRowsV4411),status=(byId("liveBulkStatusV4411")||{}).value||"";if(!rows.length){alert("상태를 변경할 주문을 선택해주세요.");return;}if(!status){alert("변경할 상태를 선택해주세요.");return;}if(!confirm(rows.length+"건을 '"+status+"' 상태로 변경할까요?"))return;try{showLoading("라이브 주문 상태를 일괄 변경하고 있습니다.");const r=await apiPost({action:"adminLiveBulkStatus",rowNumbers:rows,status:status});adminLiveSelectedRowsV4411.clear();const sel=byId("liveBulkStatusV4411");if(sel)sel.value="";await loadAdminLiveDashboardV432(true);alert((r&&r.message)||"상태를 변경했습니다.");}catch(e){alert(e.message)}finally{hideLoading();}}

function liveStatusClassV432(s){return s==="예약"?"reserved":s==="대기"?"waiting":s==="확인필요"?"review":s==="취소"?"cancelled":s==="주문서완료"?"submitted":""}
function liveActionButtonsV432(o){if(o.status==="주문서완료")return '<span class="muted">고객주문에서 관리</span>';let html=`<button class="mini-action" data-live-action="change" data-row="${o.rowNumber}">변경</button>`;if(o.status!=="취소")html+=`<button class="mini-action danger" data-live-action="cancel" data-row="${o.rowNumber}">취소</button>`;if(o.status==="대기"||o.status==="취소"||o.status==="확인필요")html+=`<button class="mini-action good" data-live-action="reserve" data-row="${o.rowNumber}">예약</button>`;return html}
async function handleAdminLiveOrderActionV432(btn){const row=Number(btn.dataset.row),action=btn.dataset.liveAction;let payload={action:"adminLiveOrderAction",rowNumber:row,actionType:action};if(action==="change"){const no=prompt("변경할 상품번호를 입력하세요.");if(no===null)return;const color=prompt("변경할 칼라를 입력하세요.");if(color===null)return;const size=prompt("변경할 사이즈를 입력하세요.");if(size===null)return;const qty=prompt("수량을 입력하세요.","1");if(qty===null)return;Object.assign(payload,{productNo:no,color:color,size:size,quantity:Number(qty||1)})}else if(action==="cancel"&&!confirm("이 임시주문을 취소할까요?"))return;try{showLoading("라이브 주문 처리 중입니다.");await apiPost(payload);await loadAdminLiveDashboardV432(true)}catch(e){alert(e.message)}finally{hideLoading()}}
async function handleAdminLiveIssueV432(row){if(!confirm("이 확인필요 항목을 완료 처리할까요? 주문내용 수정이 필요하면 먼저 위 임시주문에서 변경해주세요."))return;try{await apiPost({action:"adminLiveIssueAction",rowNumber:row,status:"완료",note:"관리자 페이지 확인완료"});await loadAdminLiveDashboardV432(true)}catch(e){alert(e.message)}}

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
  document.querySelectorAll("[data-bank-result-target]").forEach(function(card){card.addEventListener("click",function(){scrollBankResultV4404(card.dataset.bankResultTarget,card);});});
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
  await ensureXlsxLibraryLoadedV4392();
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

function scrollBankResultV4404(targetId,card){
  const target=document.getElementById(targetId);if(!target)return;
  document.querySelectorAll("[data-bank-result-target]").forEach(function(x){x.classList.toggle("active-summary-v4404",x===card);});
  ["bankMatchedSectionV4404","bankReviewSectionV4404","bankUnpaidSectionV4404","bankOrphanSectionV4404"].forEach(function(id){const el=document.getElementById(id);if(el)el.hidden=(id!==targetId);});
  target.classList.remove("flash-v4404");void target.offsetWidth;target.classList.add("flash-v4404");
  target.scrollIntoView({behavior:"smooth",block:"start"});
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
  const firstTarget=r.matched.length?"bankMatchedSectionV4404":(r.review.length?"bankReviewSectionV4404":(r.unpaid.length?"bankUnpaidSectionV4404":"bankOrphanSectionV4404"));
  ["bankMatchedSectionV4404","bankReviewSectionV4404","bankUnpaidSectionV4404","bankOrphanSectionV4404"].forEach(function(id){const el=document.getElementById(id);if(el)el.hidden=(id!==firstTarget);});
  document.querySelectorAll("[data-bank-result-target]").forEach(function(x){x.classList.toggle("active-summary-v4404",x.dataset.bankResultTarget===firstTarget);});
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
    "이 미입금 주문을 영구 삭제할까요?\n" +
    "삭제 후 복구할 수 없으며 재고는 복구됩니다.\n" +
    "거래처발주와 3PL출고도 남은 주문 기준으로 다시 계산됩니다.";
  if (!confirm(detail)) return;

  const reasonInput = prompt("취소 사유를 입력해주세요.", "미입금취소");
  if (reasonInput === null) return;
  const reason = String(reasonInput || "미입금취소").trim() || "미입금취소";
  const rows = Array.from(new Set((g.rows || []).filter(function(row){ return Number(row) >= 2; })));
  const orderNumbers = Array.from(new Set((g.orderNumbers || []).filter(Boolean)));

  showLoading("미입금 주문을 영구 삭제하는 중입니다.");
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
      notice.textContent = (g.nickname || g.receiverName) + " 고객의 미입금 주문을 영구 삭제했습니다.";
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
   V4.25 롯데택배 ALPS 48열 · 금액 완전 제외 · 송장 가독성 정리 · 내품수량↓ + 상품번호↓
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



/* V4.25: 송장에 가격/금액이 섞여 보이지 않도록 상품 텍스트를 정리합니다.
   - 상품명 끝/중간에 명시적으로 붙은 39,000원 / ₩39,000 / 판매가: 39,000원 같은 가격 표기만 제거
   - 상품번호에 들어가는 숫자는 건드리지 않음
   - 상품명 자체는 임의로 잘라내지 않아 전 상품명을 보존
*/
function sanitizeLotteLabelTextV425(value) {
  return String(value == null ? "" : value)
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function removeLottePriceTokensV425(value) {
  let text = sanitizeLotteLabelTextV425(value);
  // '판매가/입금가/가격/금액/결제금액 : 39,000원' 형태 제거
  text = text.replace(/(?:판매가|입금가|가격|금액|결제금액|상품금액)\s*[:：]?\s*(?:₩|￦)?\s*\d{1,3}(?:,\d{3})+(?:\s*원)?/gi, " ");
  text = text.replace(/(?:판매가|입금가|가격|금액|결제금액|상품금액)\s*[:：]?\s*(?:₩|￦)?\s*\d{4,8}(?:\s*원)/gi, " ");
  // 괄호 또는 독립 토큰으로 붙은 명확한 원화 가격만 제거. 상품명의 일반 숫자는 유지합니다.
  text = text.replace(/[（(\[]\s*(?:₩|￦)?\s*\d{1,3}(?:,\d{3})+\s*원?\s*[）)\]]/g, " ");
  text = text.replace(/(?:₩|￦)\s*\d{1,3}(?:,\d{3})+/g, " ");
  text = text.replace(/\d{1,3}(?:,\d{3})+\s*원(?=\s|$|[)\]】,./])/g, " ");
  return text.replace(/\s{2,}/g, " ").trim();
}

function lotteProductNameForLabelV425(value) {
  return removeLottePriceTokensV425(value);
}

function lotteProductDetailForLabelV425(color, size) {
  const cleanPart = function(value){
    return sanitizeLotteLabelTextV425(value)
      .replace(/^(?:색상|컬러|color)\s*[:：-]?\s*/i, "")
      .replace(/^(?:사이즈|size)\s*[:：-]?\s*/i, "")
      .trim();
  };
  return [cleanPart(color), cleanPart(size)].filter(Boolean).join("/");
}

function validateLotteRowsV412(rows, headers) {
  if (!Array.isArray(rows) || !rows.length) throw new Error("롯데택배로 내보낼 주문이 없습니다.");
  if (rows.length > 10000) throw new Error("롯데 ALPS 업로드 한도 10,000행을 초과했습니다. 현재 " + rows.length + "행입니다.");
  if (!Array.isArray(headers) || headers.length !== 48) {
    throw new Error("롯데 ALPS 형식은 48열이어야 합니다. 현재 " + (headers ? headers.length : 0) + "열입니다.");
  }
  const moneyHeaders = headers.filter(function(h){ return /(금액|판매가|입금가|결제금액|가격)/.test(String(h || "")); });
  if (moneyHeaders.length) {
    throw new Error("V4.25 롯데 양식에는 금액 관련 열을 넣을 수 없습니다: " + moneyHeaders.join(", "));
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
    "고객메시지": sanitizeLotteLabelTextV425(order.shippingMemo || ""),
    "우편번호": sanitizeLotteLabelTextV425(order.zipcode || "")
  };
  for (let i = 1; i <= 10; i++) {
    const item = items[i - 1];
    row["상품코드" + i] = item ? sanitizeLotteLabelTextV425(item.productNo || "") : "";
    row["상품명" + i] = item ? lotteProductNameForLabelV425(item.productName || "") : "";
    row["상품상세" + i] = item ? lotteProductDetailForLabelV425(item.color || "", item.size || "") : "";
    row["내품수량" + i] = item ? (Number(item.quantity || 0) || 1) : "";
  }
  row["수량(A타입)"] = 1;
  return row;
}

function lotteBuyerTotalQuantityV418(order) {
  const items = Array.isArray(order && order.items) ? order.items : [];
  return items.reduce(function(sum, item){
    const qty = Number(item && item.quantity || 0);
    return sum + (Number.isFinite(qty) && qty > 0 ? qty : 0);
  }, 0);
}

function lotteProductNoPartsV420(value) {
  const raw = String(value == null ? "" : value).trim();
  const match = raw.match(/\d+/);
  return {
    raw: raw,
    hasNumber: !!match,
    number: match ? Number(match[0]) : -Infinity
  };
}

function compareLotteProductNoDescV420(a, b) {
  const aa = lotteProductNoPartsV420(a && a.productNo);
  const bb = lotteProductNoPartsV420(b && b.productNo);
  if (aa.hasNumber && bb.hasNumber && aa.number !== bb.number) return bb.number - aa.number;
  if (aa.hasNumber !== bb.hasNumber) return aa.hasNumber ? -1 : 1;
  return bb.raw.localeCompare(aa.raw, "ko", {numeric:true, sensitivity:"base"});
}

function sortLotteItemsByProductNoV420(items) {
  return (Array.isArray(items) ? items : []).map(function(item, index){
    return {item:item, index:index};
  }).sort(function(a,b){
    const byNo = compareLotteProductNoDescV420(a.item, b.item);
    return byNo || (a.index - b.index);
  }).map(function(entry){ return entry.item; });
}

function lotteProductNoSequenceV420(order) {
  return sortLotteItemsByProductNoV420(order && order.items).map(function(item){
    return lotteProductNoPartsV420(item && item.productNo);
  });
}

function compareLotteProductSequencesDescV420(aSeq, bSeq) {
  const maxLen = Math.max(aSeq.length, bSeq.length);
  for (let i = 0; i < maxLen; i++) {
    const a = aSeq[i];
    const b = bSeq[i];
    if (!a && b) return 1;
    if (a && !b) return -1;
    if (!a && !b) break;
    if (a.hasNumber && b.hasNumber && a.number !== b.number) return b.number - a.number;
    if (a.hasNumber !== b.hasNumber) return a.hasNumber ? -1 : 1;
    const byText = b.raw.localeCompare(a.raw, "ko", {numeric:true, sensitivity:"base"});
    if (byText) return byText;
  }
  return 0;
}

function sortLotteOrdersV420(orders) {
  return (Array.isArray(orders) ? orders : []).map(function(order, index){
    return {
      order: order,
      index: index,
      totalQuantity: lotteBuyerTotalQuantityV418(order),
      productSequence: lotteProductNoSequenceV420(order)
    };
  }).sort(function(a,b){
    // 1순위: 구매자별 총 내품수량 많은 순
    if (b.totalQuantity !== a.totalQuantity) return b.totalQuantity - a.totalQuantity;
    // 2순위: 내품수량이 같으면 구매내역의 상품번호 큰 순
    const byProductNo = compareLotteProductSequencesDescV420(a.productSequence, b.productSequence);
    if (byProductNo) return byProductNo;
    // 완전히 같으면 전체주문이력 원래 순서를 유지합니다.
    return a.index - b.index;
  }).map(function(entry){ return entry.order; });
}

function openLotteDownloadModalV421() {
  const modal = document.getElementById("lotteDownloadModal");
  const lotteStart = document.getElementById("lotteStartDate");
  const lotteEnd = document.getElementById("lotteEndDate");
  const adminStart = document.getElementById("startDate");
  const adminEnd = document.getElementById("endDate");
  const today = todayString();
  const startValue = (adminStart && adminStart.value) || today;
  const endValue = (adminEnd && adminEnd.value) || startValue;
  if (lotteStart) lotteStart.value = startValue;
  if (lotteEnd) lotteEnd.value = endValue;
  if (modal) {
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
  }
}

function closeLotteDownloadModalV421() {
  const modal = document.getElementById("lotteDownloadModal");
  if (modal) {
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  }
}

function lotteDateFileLabelV421(startDate, endDate) {
  const a = String(startDate || "").replace(/-/g, "");
  const b = String(endDate || "").replace(/-/g, "");
  if (!a && !b) return todayString().replace(/-/g, "");
  if (!b || a === b) return a || b;
  return a + "-" + b;
}

async function downloadLotteExcelV418() {
  console.log("[SSINNEU] LOTTE EXPORT V4.26 / HISTORY SOURCE / NO MONEY / LABEL CLEAN / DATE RANGE / 48COL / QTY DESC / PRODUCT NO DESC");
  try { await ensureXlsxLibraryLoadedV4392(); }
  catch (error) { alert(error.message || "엑셀 기능을 불러오지 못했습니다."); return; }
  const btn = document.getElementById("lotteExcelButtonV418");
  const startDate = (document.getElementById("lotteStartDate") || {}).value || "";
  const endDate = (document.getElementById("lotteEndDate") || {}).value || "";
  if (!startDate || !endDate) {
    alert("롯데택배 양식을 다운로드할 시작일과 종료일을 선택해주세요.");
    return;
  }
  if (startDate > endDate) {
    alert("시작일이 종료일보다 늦습니다. 날짜를 다시 선택해주세요.");
    return;
  }
  closeLotteDownloadModalV421();
  if (btn) btn.disabled = true;
  showLoading(startDate + " ~ " + endDate + " 롯데택배 양식을 만드는 중입니다.");
  try {
    await ensureBackendV414();
    const data = await apiGet({action:"lotteOrders", startDate:startDate, endDate:endDate, _ts:Date.now()});
    const orders = Array.isArray(data.orders) ? data.orders : [];
    if (!orders.length) {
      const meta = data && data.meta ? data.meta : {};
      throw new Error("전체주문이력에서 롯데택배로 변환 가능한 주문을 찾지 못했습니다.\n" +
        "전체주문이력 시트 마지막행: " + (meta.lastRow || 0) + " / 마지막열: " + (meta.lastCol || 0) + "\n" +
        "선택 기간: " + startDate + " ~ " + endDate + "\n" +
        "시트에 주문이 보이는데 0건이면 전체주문이력의 주문날짜를 확인하고 Code.gs가 V4.52.0인지 확인해주세요.");
    }

    const sortedOrders = sortLotteOrdersV420(orders);
    const rows = [];
    let sourceCustomers = 0;
    let totalProducts = 0;
    let totalUnits = 0;
    sortedOrders.forEach(function(order){
      // 고객 한 명의 구매내역도 상품번호 큰 순으로 정렬한 뒤 상품1~10 칸에 넣습니다.
      // 정렬만 바꾸며 상품은 삭제하지 않으므로 모든 상품명이 유지됩니다.
      const items = sortLotteItemsByProductNoV420(order.items);
      if (!items.length) return;
      sourceCustomers++;
      totalProducts += items.length;
      totalUnits += lotteBuyerTotalQuantityV418(order);
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
      throw new Error("V4.26 48열 생성 검증 실패: 실제 " + actualCols + "열 / 마지막열 " + XLSX.utils.encode_col(decoded.e.c));
    }
    ws["!cols"] = headers.map(function(h){
      if (h === "주소") return {wch:42};
      if (h === "고객메시지") return {wch:24};
      if (/^상품명\d+$/.test(h)) return {wch:24};
      if (/^상품상세\d+$/.test(h)) return {wch:20};
      return {wch:14};
    });
    const wb = XLSX.utils.book_new();
    wb.Props = { Title: "SSINNEU V4.26 LOTTE HISTORY SOURCE NO MONEY LABEL CLEAN 48COL QTY+PRODUCT DESC", Subject: "date range / 48 columns / 10 products / 1 invoice row", Comments: "V4.26-HISTORY-SOURCE-NO-MONEY-LABEL-CLEAN-48COL-QTY-PRODUCT-DESC" };
    XLSX.utils.book_append_sheet(wb, ws, "sheet1");
    const date = lotteDateFileLabelV421(startDate, endDate);
    XLSX.writeFile(wb, "씬느샵_V4.26_롯데택배_전체주문이력기준_ALPS_48열_금액미포함_" + date + "_수량상품번호내림차순.xlsx");

    alert(
      "V4.26 롯데택배 48열 파일을 만들었습니다.\n\n" +
      "선택 기간: " + startDate + " ~ " + endDate + "\n" +
      "전체주문이력 주문: " + sourceCustomers + "건\n" +
      "상품 종류: " + totalProducts + "개\n" +
      "총 내품수량: " + totalUnits + "개\n" +
      "예상 송장: " + rows.length + "장\n" +
      "금액 관련 열: 0개 (판매가/입금가/결제금액 미포함)\n" +
      "상품 텍스트: 명시적인 원화 가격표기 자동 제거\n" +
      "정렬 1: 구매자 총 내품수량 많은 순(내림차순)\n" +
      "정렬 2: 같은 내품수량끼리는 구매내역 상품번호 큰 순(내림차순)\n" +
      "상품표시: 각 구매자의 상품도 상품번호 큰 순으로 배치되며 전 상품이 유지됩니다.\n\n" +
      "중요: 다운로드한 엑셀의 데이터 행 수도 " + rows.length + "행이어야 합니다.\n" +
      "ALPS에서는 상품1~10 + AV 수량(A타입) 형식으로 등록한 48열 신규형식을 선택해주세요.\n" +
      "출력설정 권장: 상품글씨 8PT / 상품출력수량 10 / 금액·판매가 관련 출력은 체크 해제.\n" +
      "상품명·상품코드·색상·사이즈·내품수량만 보이게 설정하면 송장 상품칸이 가장 깔끔합니다."
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
  try { await ensureXlsxLibraryLoadedV4392(); }
  catch (error) { alert(error.message || "엑셀 기능을 불러오지 못했습니다."); return; }
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

    // V4.18: Apps Script POST가 404로 막히는 환경을 피하기 위해
    // 이미 정상 동작하는 /exec GET 경로로 작은 묶음씩 자동 매칭합니다.
    // PIDPIC 결과파일의 주문번호(J열) + 운송장번호(G열)도 헤더명으로 자동 인식합니다.
    const deduped = [];
    const seen = new Set();
    mappings.forEach(function(item){
      const key = String(item.baseOrderNumber || "") + "|" + String(item.trackingNumber || "");
      if (!seen.has(key)) { seen.add(key); deduped.push(item); }
    });

    const batchSize = 20;
    let updatedRows = 0;
    let trackingCount = 0;
    const unmatchedSet = new Set();
    for (let start = 0; start < deduped.length; start += batchSize) {
      const batch = deduped.slice(start, start + batchSize);
      showLoading("롯데 송장번호 자동매칭 중... " + Math.min(start + batch.length, deduped.length) + "/" + deduped.length);
      const part = await apiGet({
        action:"applyLotteTrackingGet",
        mappings:JSON.stringify(batch),
        _ts:Date.now()
      });
      updatedRows += Number(part.updatedRows || 0);
      trackingCount += Number(part.trackingCount || 0);
      (Array.isArray(part.unmatched) ? part.unmatched : []).forEach(function(v){ unmatchedSet.add(v); });
    }

    const unmatched = Array.from(unmatchedSet);
    let message =
      "롯데 송장번호 자동매칭이 완료되었습니다.\n\n" +
      "결과파일 행: " + mappings.length + "건\n" +
      "중복제거 후 매칭: " + deduped.length + "건\n" +
      "전체주문이력 반영: " + updatedRows + "행\n" +
      "처리 송장번호: " + trackingCount + "개";
    if (unmatched.length) {
      message += "\n\n일치하지 않은 주문번호 " + unmatched.length + "개:\n" + unmatched.slice(0,10).join("\n");
    }
    try { await searchAdminOrders(); } catch(refreshError) {}
    alert(message);
  } catch (error) {
    alert("롯데 송장결과 업로드 오류: " + (error.message || error));
  } finally {
    hideLoading();
    event.target.value = "";
  }
}

/* =========================================================
   V4.50.2 통합관리자 · 빠른 주문접수 · 지연로딩 · 공통 주문수정 · 라이브예약
========================================================= */
function applyAdminRoleV435(){
  const role=adminRoleV435||sessionStorage.getItem("ssinne_admin_role_v435")||"admin";
  adminRoleV435=role;
  document.body.classList.toggle("role-cs",role==="cs");
  document.body.classList.toggle("role-admin",role!=="cs");
  document.querySelectorAll(".admin-only").forEach(el=>{el.hidden=role==="cs";});
  const badge=byId("adminRoleBadge"); if(badge) badge.textContent=role==="cs"?"CS 직원":"대표 관리자";
  if(role==="cs"){
    const title=byId("homeWelcomeTitle"), text=byId("homeWelcomeText");
    if(title) title.textContent="CS 업무를 한 화면에서 처리하세요 💗";
    if(text) text.textContent="고객검색 · 전체주문이력 · 결제방법 · 배송정보 · CS기록을 시트 없이 처리합니다.";
  }
}

function initAdminV435(){
  applyAdminRoleV435();
  document.querySelectorAll("[data-go-tab],[data-home-tab]").forEach(b=>{b.onclick=()=>showAdminTab(b.dataset.goTab||b.dataset.homeTab);});
  const homeToday=byId("homeTodayOrdersCardV4404");if(homeToday)homeToday.onclick=async()=>{showAdminTab("orders");await loadTodayAdminOrders();};
  const homeUnpaid=byId("homeUnpaidCardV4404");if(homeUnpaid)homeUnpaid.onclick=async()=>{showAdminTab("orders");const today=todayString();byId("startDate").value=today;byId("endDate").value=today;byId("orderKeyword").value="";await searchAdminOrders();showUnpaidAndCardOrders();};
  const homeCs=byId("homeCsCardV4404");if(homeCs)homeCs.onclick=async()=>{showAdminTab("cs");await loadCsCasesByStatusV4403("received");};
  const homeLive=byId("homeLiveCardV4404");if(homeLive)homeLive.onclick=async()=>{showAdminTab("live");await loadAdminLiveDashboardV432();setLiveSummaryFilterV4404("확인필요");};
  document.querySelectorAll("[data-mobile-tab]").forEach(b=>{b.onclick=()=>showAdminTab(b.dataset.mobileTab);});
  const closeMobileMoreV4406=()=>{document.body.classList.remove("mobile-more-open-v4406");const sh=byId("mobileMoreSheetV4406");if(sh)sh.setAttribute("aria-hidden","true");};
  const more=byId("mobileMoreButton"); if(more) more.onclick=()=>{document.body.classList.remove("mobile-settings-open-v4406");document.body.classList.toggle("mobile-more-open-v4406");const sh=byId("mobileMoreSheetV4406");if(sh)sh.setAttribute("aria-hidden",document.body.classList.contains("mobile-more-open-v4406")?"false":"true");};
  const moreClose=byId("mobileMoreCloseV4406"), moreOverlay=byId("mobileMoreOverlayV4406");
  if(moreClose) moreClose.onclick=closeMobileMoreV4406; if(moreOverlay) moreOverlay.onclick=closeMobileMoreV4406;
  document.querySelectorAll("[data-more-tab]").forEach(b=>{b.onclick=()=>{const t=b.dataset.moreTab;closeMobileMoreV4406();showAdminTab(t);};});
  const mobileSettings=byId("mobileSettingsButtonV4406"); if(mobileSettings) mobileSettings.onclick=()=>{closeMobileMoreV4406();showAdminTab("home");document.body.classList.add("mobile-settings-open-v4406");};
  const mobileSettingsClose=byId("mobileSettingsCloseV4406"); if(mobileSettingsClose) mobileSettingsClose.onclick=()=>document.body.classList.remove("mobile-settings-open-v4406");
  const mobileLogout=byId("mobileLogoutButtonV4406"); if(mobileLogout) mobileLogout.onclick=()=>{closeMobileMoreV4406();const b=byId("adminLogoutButton");if(b)b.click();};
  const quick=byId("homeQuickSearch"), quickBtn=byId("homeQuickSearchButton");
  if(quickBtn) quickBtn.onclick=()=>{const q=(quick&&quick.value||"").trim(); showAdminTab("cs"); if(q){byId("csSearchKeyword").value=q; searchCsV435();}};
  if(quick) quick.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();quickBtn.click();}});
  const csBtn=byId("csSearchButton"), csInput=byId("csSearchKeyword");
  if(csBtn) csBtn.onclick=searchCsV435;
  if(csInput) csInput.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();searchCsV435();}});
  document.querySelectorAll("[data-cs-result]").forEach(b=>{b.onclick=()=>showCsResultV435(b.dataset.csResult);});
  document.querySelectorAll("[data-cs-pay-filter]").forEach(b=>{b.onclick=()=>setCsPaymentFilterV440(b.dataset.csPayFilter);});
  document.querySelectorAll("[data-cs-case-status]").forEach(b=>{b.onclick=()=>loadCsCasesByStatusV4403(b.dataset.csCaseStatus);});
  if(byId("csCardPaymentCardV4405")) byId("csCardPaymentCardV4405").onclick=loadCsCardPaymentsV4405;
  document.querySelectorAll("[data-cs-card-list-filter]").forEach(b=>{b.onclick=()=>setCsCardListFilterV4405(b.dataset.csCardListFilter);});
  if(byId("csCardPaymentsCloseV4405")) byId("csCardPaymentsCloseV4405").onclick=closeCsCardPaymentsV4405;
  if(byId("csDoneResetButtonV4403")) byId("csDoneResetButtonV4403").onclick=resetCsDoneViewV4403;
  if(byId("csStatusCasesCloseV4403")) byId("csStatusCasesCloseV4403").onclick=()=>{adminCsActiveStatusV4403="";const p=byId("csStatusCasesPanelV4403");if(p)p.hidden=true;document.querySelectorAll("[data-cs-case-status]").forEach(b=>b.classList.remove("active"));};
  if(byId("broadcastValidateButtonV436")) byId("broadcastValidateButtonV436").onclick=validateBroadcastProductsV436;
  if(byId("broadcastStartButton")) byId("broadcastStartButton").onclick=startBroadcastV435;
  if(byId("broadcastEndButton")) byId("broadcastEndButton").onclick=endBroadcastV435;
  if(byId("broadcastRefreshButton")) byId("broadcastRefreshButton").onclick=loadBroadcastStatusV435;
  if(byId("youtubeApiKeySaveButton")) byId("youtubeApiKeySaveButton").onclick=saveYoutubeApiKeyV435;
  if(byId("securitySaveButtonV436")) byId("securitySaveButtonV436").onclick=saveSecurityV436;
  if(byId("cardPaymentLinkSaveButtonV436")) byId("cardPaymentLinkSaveButtonV436").onclick=saveCardPaymentLinkV436;
  if(byId("payAppConfigSaveButtonV438")) byId("payAppConfigSaveButtonV438").onclick=savePayAppConfigV438;
  if(byId("tossConfigSaveButtonV440")) byId("tossConfigSaveButtonV440").onclick=saveTossConfigV440;
  if(byId("clearTodayProductsButton")) byId("clearTodayProductsButton").onclick=clearTodayProductsV435;
  document.querySelectorAll("[data-sheet-mode]").forEach(b=>{b.onclick=()=>changeSheetModeV435(b.dataset.sheetMode);});
  showAdminTab(adminRoleV435==="cs"?"cs":"home");
}

async function loadAdminHomeV435(){
  try{
    const d=await apiGet({action:"adminHomeSummary"});
    renderCsCountsV435(d.cs||{});
    if(adminRoleV435==="cs") return;
    if(byId("homeOrderCount")) byId("homeOrderCount").textContent=Number(d.orderCount||0);
    if(byId("homeUnpaidCount")) byId("homeUnpaidCount").textContent=Number(d.unpaidCount||0);
    if(byId("homeLiveReviewCount")) byId("homeLiveReviewCount").textContent=Number(d.liveReviewCount||0);
  }catch(e){console.warn("홈 현황",e.message);}
}

function csStatusLabelV4403(key){return {received:"접수",progress:"진행",done:"오늘 완료",hold:"보류"}[String(key||"")]||"CS";}
async function loadCsCasesByStatusV4403(status,opts){closeCsCardPaymentsV4405(true);adminCsActiveStatusV4403=status||"";document.querySelectorAll("[data-cs-case-status]").forEach(b=>b.classList.toggle("active",b.dataset.csCaseStatus===adminCsActiveStatusV4403));const panel=byId("csStatusCasesPanelV4403"),list=byId("csStatusCasesListV4403"),title=byId("csStatusCasesTitleV4403"),sub=byId("csStatusCasesSubV4403");if(panel)panel.hidden=false;if(title)title.textContent=csStatusLabelV4403(status)+" CS";if(sub)sub.textContent=status==="done"?"오늘 완료 처리된 CS입니다. 초기화는 표시만 비우고 기록은 남깁니다.":"현재 "+csStatusLabelV4403(status)+" 상태인 CS입니다.";if(list)list.innerHTML='<div class="empty-state">불러오는 중입니다.</div>';try{const d=await apiGet({action:"adminCsCases",status:status});const cases=d.cases||[];if(list)list.innerHTML=cases.length?cases.map(renderCsNoteV435).join(""):'<div class="empty-state">해당 상태의 CS가 없습니다.</div>';bindCsActionsV435();if(!(opts&&opts.noScroll)&&panel)panel.scrollIntoView({behavior:"smooth",block:"start"});}catch(e){if(list)list.innerHTML='<div class="empty-state">'+escapeHtml(e.message)+'</div>';}}
async function resetCsDoneViewV4403(){if(!confirm("오늘 완료 표시를 0건으로 초기화할까요?\n\nCS 기록은 삭제되지 않고, 초기화 이후 새로 완료 처리한 건부터 다시 표시됩니다."))return;try{showLoading("오늘 완료 표시를 초기화하는 중입니다.");const r=await apiPost({action:"adminCsResetDoneView"});await loadCsDashboardV435();if(adminCsActiveStatusV4403==="done")await loadCsCasesByStatusV4403("done",{noScroll:true});alert(r.message||"오늘 완료 표시를 초기화했습니다.");}catch(e){alert(e.message);}finally{hideLoading();}}
function renderCsCountsV435(c){
  [["csReceivedCount",c.received],["csProgressCount",c.progress],["csDoneCount",c.done],["csHoldCount",c.hold],["csCardPaymentCountV4405",c.cardCustomers],["homeCsReceived",c.received],["homeCsProgress",c.progress],["homeCsDone",c.done],["homeCsHold",c.hold],["homeCsCount",Number(c.received||0)+Number(c.progress||0)+Number(c.hold||0)]].forEach(x=>{const el=byId(x[0]);if(el)el.textContent=Number(x[1]||0);});
  const badge=byId("csNavBadge"); if(badge) badge.textContent=Number(c.received||0)+Number(c.progress||0);
}
async function loadCsDashboardV435(){try{const d=await apiGet({action:"adminCsDashboard"});renderCsCountsV435(d.counts||{});}catch(e){console.warn(e.message);}}

function closeCsCardPaymentsV4405(silent){
  const panel=byId("csCardPaymentsPanelV4405");if(panel)panel.hidden=true;
  const card=byId("csCardPaymentCardV4405");if(card)card.classList.remove("active");
  if(!silent)adminCsCardListFilterV4405="all";
}
function cardListStatusMatchV4405(o,filterName){
  const s=String(o&&o.paymentStatus||"");
  if(filterName==="waiting")return s==="카드결제대기";
  if(filterName==="sent")return s==="카드링크발송";
  if(filterName==="done")return s==="카드결제완료"||s==="카드결제";
  return s.indexOf("카드")===0;
}
function cardCustomerKeyV4405(o){
  const phone=String(o&&o.phone||"").replace(/[^0-9]/g,"");
  return phone?"P:"+phone:"N:"+[o&&o.nickname||"",o&&o.receiverName||""].join("|");
}
function groupCardCustomersV4405(orders){
  const map=new Map();
  (orders||[]).forEach(o=>{const k=cardCustomerKeyV4405(o);if(!map.has(k))map.set(k,{key:k,nickname:o.nickname||"",receiverName:o.receiverName||"",phone:o.phone||"",orders:[],total:0});const g=map.get(k);g.orders.push(o);g.total+=Number(o.paymentAmount||0);});
  return Array.from(map.values()).sort((a,b)=>{const ad=(a.orders[0]&&a.orders[0].orderDate)||"",bd=(b.orders[0]&&b.orders[0].orderDate)||"";return String(bd).localeCompare(String(ad));});
}
function renderCsCardPaymentsV4405(){
  const list=byId("csCardPaymentsListV4405"),summary=byId("csCardPaymentsSummaryV4405");if(!list)return;
  const filtered=(adminCsCardPaymentsV4405||[]).filter(o=>cardListStatusMatchV4405(o,adminCsCardListFilterV4405));
  const groups=groupCardCustomersV4405(filtered);
  document.querySelectorAll("[data-cs-card-list-filter]").forEach(b=>b.classList.toggle("active",b.dataset.csCardListFilter===adminCsCardListFilterV4405));
  if(summary)summary.innerHTML=`<b>${groups.length}명</b><span>카드 주문 ${filtered.length}건 · 주문금액 ${money(filtered.reduce((a,o)=>a+Number(o.paymentAmount||0),0))}</span>`;
  if(!groups.length){list.innerHTML='<div class="empty-state">해당 카드결제 고객이 없습니다.</div>';return;}
  list.innerHTML=groups.map(g=>{
    const statuses={};g.orders.forEach(o=>{const s=o.paymentStatus||"카드결제";statuses[s]=(statuses[s]||0)+1;});
    const statusHtml=Object.keys(statuses).map(s=>`<span class="payment-badge-v435 ${paymentBadgeClassV435(s)}">${escapeHtml(s)} ${statuses[s]}건</span>`).join("");
    const orderHtml=g.orders.map(o=>{
      const open=["카드결제대기","카드링크발송"].includes(o.paymentStatus),paid=["카드결제완료","카드결제"].includes(o.paymentStatus);
      return `<div class="cs-card-payment-order-v4416"><div class="cs-card-payment-order-top-v4416"><span>${escapeHtml(o.orderDate||"")} · ${escapeHtml(o.orderNumber||"-")}</span><b>${money(o.paymentAmount||0)}</b></div><div class="cs-card-items-v4416">${escapeHtml(o.orderItems||"주문상품 없음").replace(/\n/g,"<br>")}</div><div class="cs-card-direct-actions-v4416">${open?`<button class="btn btn-dark cs-card-payapp-link-v4416" data-row="${o.rowNumber}">💳 링크 만들기·복사</button><button class="btn btn-primary cs-card-payapp-sms-v4416" data-row="${o.rowNumber}">📱 페이앱 문자 바로 보내기</button>`:""}<button class="btn btn-subtle cs-card-edit-items-v4416" data-row="${o.rowNumber}" data-items="${escapeHtml(o.orderItems||"")}">주문상품 수정</button><button class="btn btn-subtle cs-card-shipping-v4416" data-search="${escapeHtml(g.phone||g.nickname||g.receiverName||"")}">배송정보 수정</button>${!paid?`<button class="btn btn-danger cs-card-delete-v4416" data-row="${o.rowNumber}">주문 삭제</button>`:""}</div></div>`;
    }).join("");
    return `<article class="cs-card-payment-customer-v4405"><div class="cs-card-payment-customer-head-v4405"><div><h3>${escapeHtml(g.nickname||"고객")}${g.receiverName?` · ${escapeHtml(g.receiverName)}`:""}</h3><p>${escapeHtml(g.phone||"연락처 없음")}</p></div><strong>${g.orders.length}건 · ${money(g.total)}</strong></div><div class="cs-card-payment-statuses-v4405">${statusHtml}</div><div class="cs-card-payment-orders-v4405">${orderHtml}</div></article>`;
  }).join("");
  bindCsCardDirectActionsV4416();
}
function parseEditableOrderItemsV4416(text){
  return String(text||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(line=>{const p=line.split("/").map(x=>x.trim());return {productNo:(p[0]||"").replace(/번/g,"").trim(),color:p[2]||"",size:p[3]||"",quantity:Number(String(p[4]||"1").replace(/[^0-9]/g,"")||1)};}).filter(x=>x.productNo&&x.color&&x.size&&x.quantity>0);
}
function bindCsCardDirectActionsV4416(){
  document.querySelectorAll(".cs-card-payapp-link-v4416").forEach(b=>b.onclick=()=>createPayAppFromCardV4416(Number(b.dataset.row),false));
  document.querySelectorAll(".cs-card-payapp-sms-v4416").forEach(b=>b.onclick=()=>createPayAppFromCardV4416(Number(b.dataset.row),true));
  document.querySelectorAll(".cs-card-shipping-v4416").forEach(b=>b.onclick=async()=>{const q=b.dataset.search||"";if(!q)return;byId("csSearchKeyword").value=q;setCsPaymentFilterV440("card");await searchCsCurrentOnlyV441(q);const p=byId("csCustomerPanel");if(p)p.scrollIntoView({behavior:"smooth",block:"start"});});
  document.querySelectorAll(".cs-card-edit-items-v4416").forEach(b=>b.onclick=()=>editCardOrderItemsV4416(Number(b.dataset.row),b.dataset.items||""));
  document.querySelectorAll(".cs-card-delete-v4416").forEach(b=>b.onclick=()=>deleteCardOrderV4416(Number(b.dataset.row)));
}
async function createPayAppFromCardV4416(row,sendSms){
  try{const g=await apiPost({action:"adminCsPaymentGroupPreview",rowNumber:row,purpose:"cardLink"});if(!g.count){alert("카드결제대기 주문이 없습니다.");return;}const text=`현재 미결제 주문 ${g.count}건\n기본금액 ${money(g.baseTotal||g.total||0)}\n카드결제 추가 10% ${money(g.cardExtraAmount||0)}\n최종 결제요청 ${money(g.cardPaymentAmount||0)}\n\n${sendSms?"고객 성함으로 페이앱 결제요청 문자를 바로 보낼까요?":"페이앱 결제링크를 만들고 복사할까요?"}`;if(!confirm(text))return;showLoading(sendSms?"페이앱 문자를 보내는 중입니다.":"결제링크를 만드는 중입니다.");const r=await apiPost({action:"adminCsCreatePayAppLink",rowNumber:row,sendSms:Boolean(sendSms)});if(sendSms)alert((r.message||"문자 발송을 요청했습니다.")+`\n최종금액 ${money(r.cardPaymentAmount||0)}`);else if(r.link){try{await navigator.clipboard.writeText(r.link);alert("페이앱 결제링크를 복사했습니다.");}catch(e){prompt("아래 링크를 복사해주세요.",r.link);}}await loadCsCardPaymentsV4405();await loadCsDashboardV435();}catch(e){alert(e.message);}finally{hideLoading();}
}
async function editCardOrderItemsV4416(row,current){
  const sample="예: 900 / 레이스나시 / 블랙 / M / 1개 / 15,000원";const text=prompt("주문상품을 수정하세요.\n한 상품당 한 줄로 입력합니다.\n"+sample,current||"");if(text===null)return;const products=parseEditableOrderItemsV4416(text);if(!products.length){alert("상품 형식을 확인해주세요.");return;}if(!confirm("이 주문상품을 수정하고 재고도 자동 조정할까요?"))return;try{showLoading("주문상품을 수정하는 중입니다.");const r=await apiPost({action:"adminCsEditOrderItems",rowNumber:row,products});alert(r.message||"수정했습니다.");await loadCsCardPaymentsV4405();}catch(e){alert(e.message);}finally{hideLoading();}
}
async function deleteCardOrderV4416(row){if(!confirm("정말 삭제할까요?\n삭제하면 복구할 수 없으며 재고만 복구됩니다."))return;try{showLoading("주문을 삭제하는 중입니다.");const r=await apiPost({action:"adminCsDeleteOrder",rowNumber:row});alert(r.message||"삭제했습니다.");await loadCsCardPaymentsV4405();await loadCsDashboardV435();}catch(e){alert(e.message);}finally{hideLoading();}}

function setCsCardListFilterV4405(name){adminCsCardListFilterV4405=name||"all";renderCsCardPaymentsV4405();}
async function loadCsCardPaymentsV4405(){
  adminCsActiveStatusV4403="";document.querySelectorAll("[data-cs-case-status]").forEach(b=>b.classList.remove("active"));const statusPanel=byId("csStatusCasesPanelV4403");if(statusPanel)statusPanel.hidden=true;
  const panel=byId("csCardPaymentsPanelV4405"),list=byId("csCardPaymentsListV4405"),card=byId("csCardPaymentCardV4405");if(panel)panel.hidden=false;if(card)card.classList.add("active");if(list)list.innerHTML='<div class="empty-state">카드결제 고객을 불러오는 중입니다.</div>';
  try{const d=await apiGet({action:"adminCsCardPayments",_ts:Date.now()});adminCsCardPaymentsV4405=d.orders||[];renderCsCardPaymentsV4405();if(panel)panel.scrollIntoView({behavior:"smooth",block:"start"});}catch(e){if(list)list.innerHTML=`<div class="empty-state">${escapeHtml(e.message)}</div>`;}
}

async function searchCsCurrentOnlyV441(q){adminCsCurrentOnlyV441=true;
  q=(q||(byId("csSearchKeyword")&&byId("csSearchKeyword").value)||"").trim();
  if(!q)return;
  showLoading("오늘 카드 주문만 빠르게 불러오는 중입니다.");
  try{const d=await apiGet({action:"adminCsCurrentSearch",search:q,_ts:Date.now()});adminCsDataV435=d;renderCsSearchV435(d,q);await loadCsDashboardV435();}
  catch(e){alert(e.message);}finally{hideLoading();}
}
async function searchCsV435(){adminCsCurrentOnlyV441=false;
  const q=(byId("csSearchKeyword").value||"").trim();
  if(!q){alert("닉네임, 수령인, 전화번호 또는 주문번호를 입력해주세요.");return;}
  showLoading("고객의 현재 주문과 전체주문이력을 찾는 중입니다.");
  try{
    const d=await apiGet({action:"adminCsSearch",search:q}); adminCsDataV435=d; renderCsSearchV435(d,q); await loadCsDashboardV435();
  }catch(e){alert(e.message);}finally{hideLoading();}
}
function firstCsIdentityV435(d,q){
  const all=[...(d.current||[]),...(d.history||[])],o=all[0]||{};
  return {nickname:o.nickname||q,receiverName:o.receiverName||"",phone:o.phone||"",orderNumber:o.orderNumber||""};
}
function isCardStatusV440(status){return String(status||"").indexOf("카드")===0;}
function matchCsPaymentFilterV440(order,filterName){
  const s=String(order&&order.paymentStatus||"");
  switch(String(filterName||"all")){
    case "bank": return s && !isCardStatusV440(s);
    case "card": return isCardStatusV440(s);
    case "cardWaiting": return s==="카드결제대기";
    case "cardSent": return s==="카드링크발송";
    case "cardDone": return ["카드결제완료","카드결제"].includes(s);
    default: return true;
  }
}
function getCsPaymentFilterLabelV440(filterName){
  const map={all:"전체",bank:"무통장",card:"카드결제",cardWaiting:"카드결제대기",cardSent:"카드링크발송",cardDone:"카드결제완료"};
  return map[String(filterName||"all")]||"전체";
}
function setCsPaymentFilterV440(name){
  adminCsPaymentFilterV440=name||"all";
  document.querySelectorAll("[data-cs-pay-filter]").forEach(b=>b.classList.toggle("active",b.dataset.csPayFilter===adminCsPaymentFilterV440));
  if(adminCsDataV435) renderCsSearchV435(adminCsDataV435,(byId("csSearchKeyword")&&byId("csSearchKeyword").value||"").trim());
}

function renderCsSearchV435(d,q){
  const current=d.current||[],history=d.history||[],notes=d.notes||[],ident=firstCsIdentityV435(d,q);
  byId("csEmptyState").hidden=true; byId("csCustomerPanel").hidden=false;
  byId("csCustomerTitle").textContent=(ident.nickname||"고객")+(ident.receiverName?" · "+ident.receiverName:"");
  byId("csCustomerSub").textContent=ident.phone||"";
  [["csCurrentCount",current.length],["csHistoryCount",history.length],["csNotesCount",notes.length]].forEach(x=>{const el=byId(x[0]);if(el)el.textContent=x[1]});
  const filterName=adminCsPaymentFilterV440||"all";
  const filterLabel=getCsPaymentFilterLabelV440(filterName);
  const filteredCurrent=current.filter(o=>matchCsPaymentFilterV440(o,filterName));
  const filteredHistory=history.filter(o=>matchCsPaymentFilterV440(o,filterName));
  byId("csCurrentResults").innerHTML=filteredCurrent.length?filteredCurrent.map(renderCsCurrentCardV435).join(""):`<div class="empty-state">${escapeHtml(filterLabel)} 주문이 없습니다.</div>`;
  byId("csHistoryResults").innerHTML=filteredHistory.length?filteredHistory.map(o=>renderCsOrderCardV435(o,false)).join(""):`<div class="empty-state">${escapeHtml(filterLabel)} 주문이 없습니다.</div>`;
  byId("csNotesResults").innerHTML=(notes.length?notes.map(renderCsNoteV435).join(""):'<div class="empty-state">저장된 CS 기록이 없습니다.</div>')+renderCsComposerV435(ident);
  bindCsActionsV435(); showCsResultV435("current");
}
function paymentBadgeClassV435(s){return ["입금완료","카드결제완료","카드결제"].includes(s)?"paid":s==="미입금"?"unpaid":"card";}
function renderCsOrderCardV435(o,editable,label){
  const tr=o.trackingNumber||"",trackingUrl=tr?"https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo="+encodeURIComponent(String(tr).replace(/[^0-9]/g,"")):"";
  return `<article class="cs-order-card ${editable?'editable':''}">
    <div class="cs-order-card-head"><div><b>${escapeHtml(o.orderDate||"")}${label?" · "+escapeHtml(label):""}</b><span>주문번호 ${escapeHtml(o.orderNumber||"-")}</span></div><span class="payment-badge-v435 ${paymentBadgeClassV435(o.paymentStatus)}">${escapeHtml(o.paymentStatus||"미입금")}</span></div>
    <div class="cs-items-v435">${escapeHtml(o.orderItems||"주문상품 없음").replace(/\n/g,"<br>")}</div>
    <div class="cs-order-meta"><span>💰 ${money(o.paymentAmount||0)}</span><span>📦 ${Number(o.itemQuantity||0)}개</span>${tr?`<a target="_blank" rel="noopener" href="${trackingUrl}">🚚 배송조회</a>`:""}</div>
    <div class="cs-address-view"><b>${escapeHtml(o.receiverName||"")}</b> · ${escapeHtml(o.phone||"")}<br>${escapeHtml((o.zipcode?"["+o.zipcode+"] ":"")+(o.address||""))}${o.shippingMemo?`<br><small>메모: ${escapeHtml(o.shippingMemo)}</small>`:""}</div>
  </article>`;
}
function renderCsCurrentCardV435(o){
  const base=renderCsOrderCardV435(o,true);
  const canPayApp=Boolean(adminCsDataV435&&adminCsDataV435.payAppConfigured);
  const canToss=Boolean(adminCsDataV435&&adminCsDataV435.tossConfigured);
  let pgButtons="";
  if(["카드결제대기","카드링크발송"].includes(o.paymentStatus)){
    if(canPayApp) pgButtons+=`<button class="btn btn-dark cs-payapp-link" data-row="${o.rowNumber}">💳 페이앱 링크 만들기 · 복사</button><button class="btn btn-subtle cs-payapp-sms" data-row="${o.rowNumber}">📱 페이앱 문자로 바로 보내기</button>`;
    if(canToss) pgButtons+=`<button class="btn btn-primary cs-toss-link" data-row="${o.rowNumber}">🔵 토스 결제링크 만들기 · 복사</button>`;
    if(!canPayApp&&!canToss) pgButtons+=`<span class="payment-badge-v435 warning">카드 PG 미연결</span>`;
  }
  const actions=`<div class="cs-edit-actions">
    <button class="btn btn-subtle cs-toggle-edit" data-row="${o.rowNumber}">배송정보 수정</button>
    ${!["입금완료","카드결제완료","카드결제"].includes(o.paymentStatus)?`<button class="btn btn-primary cs-card-change" data-row="${o.rowNumber}" data-method="카드결제">카드결제로 변경</button><button class="btn btn-subtle cs-bank-change" data-row="${o.rowNumber}" data-method="무통장입금">무통장으로 변경</button>`:""}
    ${pgButtons}
  </div>
  <div class="cs-shipping-edit" data-edit-row="${o.rowNumber}" hidden>
    <div class="form-grid two"><div class="field"><label>수령인</label><input data-f="receiverName" value="${escapeHtml(o.receiverName||"")}"></div><div class="field"><label>연락처</label><input data-f="phone" value="${escapeHtml(o.phone||"")}"></div><div class="field"><label>우편번호</label><input data-f="zipcode" value="${escapeHtml(o.zipcode||"")}"></div><div class="field"><label>배송메모</label><input data-f="shippingMemo" value="${escapeHtml(o.shippingMemo||"")}"></div><div class="field full"><label>주소</label><input data-f="address" value="${escapeHtml(o.address||"")}"></div></div>
    <button class="btn btn-primary cs-save-shipping" data-row="${o.rowNumber}">배송정보 저장</button>
  </div>`;
  return base.replace('</article>',actions+'</article>');
}
function renderCsNoteV435(n){const opts=["접수","진행","완료","보류"].map(v=>`<option ${v===n.status?"selected":""}>${v}</option>`).join("");return `<article class="cs-note-card"><div><b>${escapeHtml(n.type||"CS")} · ${escapeHtml(n.csId||"")}</b><span>${escapeHtml(n.updated||n.created||"")} · ${escapeHtml(n.actor||"")}</span></div><p>${escapeHtml(n.message||"").replace(/\n/g,"<br>")}</p>${n.note?`<small>${escapeHtml(n.note).replace(/\n/g,"<br>")}</small>`:""}<div class="cs-case-update-v436"><select class="cs-case-status-v436" data-csid="${escapeHtml(n.csId||"")}">${opts}</select><button class="btn btn-subtle cs-case-update-button-v436" type="button" data-csid="${escapeHtml(n.csId||"")}">상태 저장</button></div></article>`;}
function renderCsComposerV435(i){return `<div class="cs-composer-v435"><h3>새 CS 기록</h3><div class="form-grid two"><div class="field"><label>문의유형</label><select id="csNewType"><option>배송문의</option><option>결제문의</option><option>상품문의</option><option>주소변경</option><option>주문변경</option><option>기타</option></select></div><div class="field"><label>상태</label><select id="csNewStatus"><option>접수</option><option>진행</option><option>완료</option><option>보류</option></select></div><div class="field full"><label>내용</label><textarea id="csNewMessage" rows="4" placeholder="고객 요청사항과 처리내용을 입력하세요."></textarea></div></div><button class="btn btn-primary" id="csSaveNoteButton" data-nick="${escapeHtml(i.nickname||"")}" data-name="${escapeHtml(i.receiverName||"")}" data-phone="${escapeHtml(i.phone||"")}" data-order="${escapeHtml(i.orderNumber||"")}">CS 저장</button></div>`;}
function showCsResultV435(name){
  document.querySelectorAll("[data-cs-result]").forEach(b=>b.classList.toggle("active",b.dataset.csResult===name));
  const map={current:"csCurrentResults",history:"csHistoryResults",notes:"csNotesResults"};
  document.querySelectorAll(".cs-result-panel").forEach(p=>p.classList.toggle("active",p.id===map[name]));
}
function bindCsActionsV435(){
  document.querySelectorAll(".cs-toggle-edit").forEach(b=>b.onclick=()=>{const box=document.querySelector(`[data-edit-row="${b.dataset.row}"]`);if(box)box.hidden=!box.hidden;});
  document.querySelectorAll(".cs-save-shipping").forEach(b=>b.onclick=()=>saveCsShippingV435(Number(b.dataset.row)));
  document.querySelectorAll(".cs-card-change,.cs-bank-change").forEach(b=>b.onclick=()=>changeCsPaymentV435(Number(b.dataset.row),b.dataset.method));
  document.querySelectorAll(".cs-payapp-link").forEach(b=>b.onclick=()=>createPayAppLinkV438(Number(b.dataset.row),false));
  document.querySelectorAll(".cs-payapp-sms").forEach(b=>b.onclick=()=>createPayAppLinkV438(Number(b.dataset.row),true));
  document.querySelectorAll(".cs-toss-link").forEach(b=>b.onclick=()=>createTossLinkV440(Number(b.dataset.row)));
  document.querySelectorAll(".cs-case-update-button-v436").forEach(b=>b.onclick=()=>updateCsCaseV436(b.dataset.csid));
  if(byId("csSaveNoteButton")) byId("csSaveNoteButton").onclick=saveCsNoteV435;
}
async function saveCsShippingV435(row){
  const box=document.querySelector(`[data-edit-row="${row}"]`); if(!box)return;
  const val=f=>{const e=box.querySelector(`[data-f="${f}"]`);return e?e.value.trim():"";};
  try{showLoading("배송정보를 저장하는 중입니다.");await apiPost({action:"adminCsUpdateShipping",rowNumber:row,receiverName:val("receiverName"),phone:val("phone"),zipcode:val("zipcode"),address:val("address"),shippingMemo:val("shippingMemo")});await searchCsV435();}catch(e){alert(e.message);}finally{hideLoading();}
}
function phoneDigitsV436(v){return String(v||"").replace(/[^0-9]/g,"");}
function csPaymentGroupPreviewV436(row){const list=(adminCsDataV435&&adminCsDataV435.current)||[],t=list.find(o=>Number(o.rowNumber)===Number(row));if(!t)return {count:1,total:0};const p=phoneDigitsV436(t.phone),open=["미입금","카드결제대기","카드링크발송"];const g=list.filter(o=>open.includes(o.paymentStatus)&&(p?phoneDigitsV436(o.phone)===p:(o.receiverName===t.receiverName&&o.nickname===t.nickname)));const base=g.reduce((a,o)=>a+Number(o.paymentAmount||0),0),extra=Math.round(base*0.10);return {count:g.length||1,total:base,baseTotal:base,cardExtraAmount:extra,cardPaymentAmount:base+extra};}
async function refreshCsAfterPaymentV441(){
  const q=(byId("csSearchKeyword")&&byId("csSearchKeyword").value||"").trim();
  if(adminCsCurrentOnlyV441 && q)return searchCsCurrentOnlyV441(q);
  return searchCsV435();
}
async function changeCsPaymentV435(row,method){try{const g=await apiPost({action:"adminCsPaymentGroupPreview",rowNumber:row,purpose:"change"});if(!g.count){alert("변경할 미결제 주문이 없습니다.");return;}const msg=`${g.receiverName||"고객"}의 현재 미결제 주문 ${g.count}건 (${money(g.total||0)})을\n${method}으로 변경할까요?${method==="카드결제"?`\n\n카드결제 추가 10% ${money(g.cardExtraAmount||0)}\n최종 ${money(g.cardPaymentAmount||0)}`:""}`;if(!confirm(msg))return;showLoading("결제방법을 변경하는 중입니다.");const r=await apiPost({action:"adminCsChangePaymentMethod",rowNumber:row,method});alert(r.message||"결제방법을 변경했습니다.");await refreshCsAfterPaymentV441();}catch(e){alert(e.message);}finally{hideLoading();}}
async function createPayAppLinkV438(row,sendSms){
  try{const g=await apiPost({action:"adminCsPaymentGroupPreview",rowNumber:row,purpose:"cardLink"});if(!g.count){alert("카드결제대기 주문이 없습니다.");return;}const text=`현재 미결제 주문 ${g.count}건\n기본금액 ${money(g.baseTotal||g.total||0)}\n카드결제 추가 10% ${money(g.cardExtraAmount||0)}\n최종 결제요청 ${money(g.cardPaymentAmount||0)}\n\n${sendSms?"페이앱에서 고객 휴대폰으로 결제요청 문자를 바로 보낼까요?":"페이앱 결제링크를 만들고 복사할까요?"}`;if(!confirm(text))return;showLoading(sendSms?"페이앱 결제요청 문자를 보내는 중입니다.":"페이앱 결제링크를 만드는 중입니다.");const r=await apiPost({action:"adminCsCreatePayAppLink",rowNumber:row,sendSms:Boolean(sendSms)});if(sendSms){alert((r.message||"문자 발송을 요청했습니다.")+`\n최종금액 ${money(r.cardPaymentAmount||0)}`);}else if(r.link){try{await navigator.clipboard.writeText(r.link);alert(`페이앱 결제링크를 복사했습니다.\n최종금액 ${money(r.cardPaymentAmount||0)}\n채널톡·카톡 등에 붙여넣어 보내주세요.`);}catch(e){prompt("아래 페이앱 링크를 복사해서 고객에게 보내주세요.",r.link);}}await refreshCsAfterPaymentV441();}catch(e){alert(e.message);}finally{hideLoading();}
}
async function createTossLinkV440(row){
  try{
    const g=await apiPost({action:"adminCsPaymentGroupPreview",rowNumber:row,purpose:"cardLink"});
    if(!g.count){alert("카드결제대기 주문이 없습니다.");return;}
    const text=`현재 미결제 주문 ${g.count}건\n기본금액 ${money(g.baseTotal||g.total||0)}\n카드결제 추가 10% ${money(g.cardExtraAmount||0)}\n최종 결제요청 ${money(g.cardPaymentAmount||0)}\n\n토스페이먼츠 결제링크를 만들고 복사할까요?`;
    if(!confirm(text))return;
    showLoading("토스페이먼츠 결제링크를 만드는 중입니다.");
    const r=await apiPost({action:"adminCsCreateTossLink",rowNumber:row});
    if(r.link){try{await navigator.clipboard.writeText(r.link);alert(`토스페이먼츠 결제링크를 복사했습니다.\n최종금액 ${money(r.cardPaymentAmount||0)}\n채널톡·카톡·문자에 붙여넣어 보내주세요.`);}catch(e){prompt("아래 토스페이먼츠 링크를 복사해서 고객에게 보내주세요.",r.link);}}
    await refreshCsAfterPaymentV441();
  }catch(e){alert(e.message);}finally{hideLoading();}
}
async function markCardLinkSentV435(row){
  try{const g=await apiPost({action:"adminCsPaymentGroupPreview",rowNumber:row,purpose:"cardLink"});if(!g.count){alert("카드결제대기 주문이 없습니다.");return;}if(!confirm(`카드결제대기 ${g.count}건 (${money(g.total||0)})의 결제링크를 복사하고\n링크발송 상태로 변경할까요?`))return;const r=await apiPost({action:"adminCsMarkCardLinkSent",rowNumber:row});if(r.link){const detail=`${Number(r.count||1)}건 · ${money(r.total||0)}`;try{await navigator.clipboard.writeText(r.link);alert("카드결제 링크를 복사했습니다.\n"+detail+"을 링크발송 상태로 변경했습니다.\n고객에게 링크를 붙여넣어 보내주세요.");}catch(e){prompt("아래 카드결제 링크를 복사해서 고객에게 보내주세요. ("+detail+")",r.link);}}await refreshCsAfterPaymentV441();}catch(e){alert(e.message);}
}
async function updateCsCaseV436(csId){const sel=document.querySelector(`.cs-case-status-v436[data-csid="${CSS.escape(csId)}"]`);if(!sel)return;const memo=prompt("상태 변경과 함께 남길 처리내용이 있으면 입력하세요.\n내용 없이 상태만 변경해도 됩니다.","");if(memo===null)return;try{await apiPost({action:"adminCsUpdateCase",csId,status:sel.value,message:memo,note:""});await loadCsDashboardV435();if(adminCsActiveStatusV4403)await loadCsCasesByStatusV4403(adminCsActiveStatusV4403,{noScroll:true});const q=(byId("csSearchKeyword")&&byId("csSearchKeyword").value||"").trim();if(q&&adminCsDataV435)await searchCsV435();}catch(e){alert(e.message);}}
async function saveCsNoteV435(){const b=byId("csSaveNoteButton"),message=(byId("csNewMessage").value||"").trim();if(!message){alert("CS 내용을 입력해주세요.");return;}try{await apiPost({action:"adminCsSaveNote",nickname:b.dataset.nick,receiverName:b.dataset.name,phone:b.dataset.phone,orderNumber:b.dataset.order,type:byId("csNewType").value,status:byId("csNewStatus").value,message,note:"관리자페이지 CS"});await searchCsV435();}catch(e){alert(e.message);}}

function renderBroadcastPrecheckV436(r){const el=byId("broadcastPrecheckV436");if(!el)return;r=r||{};const errors=r.errors||[],warnings=r.warnings||[];el.classList.toggle("ok",Boolean(r.success));el.classList.toggle("error",!r.success);el.innerHTML=r.success?`<strong>✓ 상품정보 정상 · ${Number(r.productCount||0)}개</strong>${warnings.length?`<small>확인 권장: ${warnings.map(escapeHtml).join(" · ")}</small>`:"<small>중복 · 판매가 · 재고 필수값 검사를 통과했습니다.</small>"}`:`<strong>⚠ 방송 시작 전 수정 필요</strong><small>${errors.slice(0,8).map(escapeHtml).join("<br>")}</small>`;}
async function validateBroadcastProductsV436(){try{showLoading("방송 상품정보를 검사하는 중입니다.");const r=await apiPost({action:"adminValidateBroadcastProducts"});renderBroadcastPrecheckV436(r);if(r.success)alert(`상품정보 검사 완료\n${Number(r.productCount||0)}개 상품이 방송 시작 가능한 상태입니다.${(r.warnings||[]).length?`\n\n확인 권장 ${r.warnings.length}건이 있습니다.`:""}`);else alert("수정이 필요한 상품정보가 있습니다. 화면의 검사결과를 확인해주세요.");return r;}catch(e){alert(e.message);return {success:false,errors:[e.message]};}finally{hideLoading();}}
async function saveSecurityV436(){const ap=(byId("newAdminPasswordV436")?.value||"").trim(),cp=(byId("newCsPasswordV436")?.value||"").trim();if(!ap&&!cp){alert("변경할 대표 또는 CS 비밀번호를 입력해주세요.");return;}if(!confirm("입력한 비밀번호로 변경할까요?\n다음 로그인부터 새 비밀번호를 사용합니다."))return;try{const r=await apiPost({action:"adminSaveSecurity",adminPassword:ap,csPassword:cp});byId("newAdminPasswordV436").value="";byId("newCsPasswordV436").value="";alert(r.message||"저장했습니다.");await loadBroadcastStatusV435();}catch(e){alert(e.message);}}
async function savePayAppConfigV438(){const userid=(byId("payAppUserIdV438")?.value||"").trim(),linkkey=(byId("payAppLinkKeyV438")?.value||"").trim(),linkval=(byId("payAppLinkValV438")?.value||"").trim();if(!userid||!linkkey||!linkval){alert("페이앱 판매자 아이디, 연동 KEY, 연동 VALUE를 모두 입력해주세요.");return;}if(!confirm("페이앱 연결정보를 저장할까요?\n저장 후 KEY/VALUE는 화면에 다시 표시하지 않습니다."))return;try{showLoading("페이앱 연결정보를 저장하는 중입니다.");const r=await apiPost({action:"adminSavePayAppConfig",userid,linkkey,linkval});byId("payAppUserIdV438").value="";byId("payAppLinkKeyV438").value="";byId("payAppLinkValV438").value="";alert(r.message||"저장했습니다.");await loadBroadcastStatusV435();}catch(e){alert(e.message);}finally{hideLoading();}}
async function saveTossConfigV440(){
  const clientKey=(byId("tossClientKeyV440")?.value||"").trim(),secretKey=(byId("tossSecretKeyV440")?.value||"").trim(),payPageUrl=(byId("tossPayPageUrlV440")?.value||"").trim();
  if(!clientKey||!secretKey){alert("토스페이먼츠 가입 후 개발자센터에서 클라이언트 키와 시크릿 키를 확인해 입력해주세요.\n아직 가입 전이면 이 설정은 비워두셔도 페이앱은 정상 작동합니다.");return;}
  if(!confirm("토스페이먼츠 연결정보를 저장할까요?\n처음에는 테스트 키(test_gck/test_gsk)로 확인하는 것을 권장합니다."))return;
  try{showLoading("토스페이먼츠 연결정보를 저장하는 중입니다.");const r=await apiPost({action:"adminSaveTossConfig",clientKey,secretKey,payPageUrl});byId("tossClientKeyV440").value="";byId("tossSecretKeyV440").value="";alert(r.message||"저장했습니다.");await loadBroadcastStatusV435();}catch(e){alert(e.message);}finally{hideLoading();}
}
async function saveCardPaymentLinkV436(){const link=(byId("cardPaymentLinkInputV436")?.value||"").trim();const text=link?"카드결제 링크를 저장할까요?":"카드결제 링크 설정을 지울까요?";if(!confirm(text))return;try{const r=await apiPost({action:"adminSaveCardPaymentLink",link});alert(r.message||"저장했습니다.");if(byId("cardPaymentLinkInputV436"))byId("cardPaymentLinkInputV436").value="";await loadBroadcastStatusV435();}catch(e){alert(e.message);}}
async function saveYoutubeApiKeyV435(){const key=(byId("youtubeApiKeyInput").value||"").trim();if(!key){alert("YouTube API 키를 입력해주세요.");return;}try{showLoading("API 키를 저장하는 중입니다.");const r=await apiPost({action:"adminSaveYouTubeApiKey",apiKey:key});byId("youtubeApiKeyInput").value="";alert(r.message||"저장했습니다.");await loadBroadcastStatusV435();}catch(e){alert(e.message);}finally{hideLoading();}}
async function startBroadcastV435(){
  return (async function(){
    const url=(byId("broadcastYoutubeUrl").value||"").trim();if(!url){alert("YouTube 라이브 URL을 입력해주세요.");return;}
    if(!confirm("상품정보 사전 저장 없이 바로 방송을 시작하고 YouTube에 연결할까요?\n\n방송 중 상품정보는 그대로 추가·수정할 수 있습니다."))return;
    try{showLoading("YouTube 방송에 연결하는 중입니다.");const r=await apiPost({action:"adminStartBroadcast",youtubeUrl:url,broadcastName:(byId("broadcastName").value||"").trim()});alert(r.message||"방송을 시작했습니다.");await loadAdminLiveDashboardV432(true);await loadBroadcastStatusV435();}catch(e){alert(e.message);}finally{hideLoading();}
  })();
}
async function endBroadcastV435(){if(!confirm("방송을 종료할까요?\n\n※ 주문서를 아직 작성하지 않은 댓글 예약은 그대로 유지됩니다.\n※ 실제 재고는 고객이 주문서를 제출할 때만 차감됩니다."))return;try{showLoading("방송을 종료하는 중입니다.");const r=await apiPost({action:"adminEndBroadcast"});alert(r.message||"방송을 종료했습니다.");await loadBroadcastStatusV435();}catch(e){alert(e.message);}finally{hideLoading();}}
async function loadBroadcastStatusV435(){try{const d=await apiGet({action:"adminBroadcastStatus"});renderBroadcastStatusV435(d,{});}catch(e){console.warn(e.message);}}
function renderBroadcastStatusV435(b,y){
  b=b||{};y=y||{}; const active=Boolean(b.active||b.broadcastId), session=b.session||{};
  const badge=byId("broadcastStateBadge"),mini=byId("adminBroadcastMini");
  if(badge){badge.textContent=active?"● 방송 진행중":"방송 대기";badge.classList.toggle("active",active);}
  if(mini) mini.textContent=active?(b.broadcastId||session.broadcastId||"방송중"):"방송 대기";
  const text=active?`<strong>${escapeHtml(b.broadcastId||session.broadcastId||"")}</strong><span>${escapeHtml(session.name||"")}</span><small>YouTube ${b.videoId||session.videoId?"연결 설정됨":"미연결"} · 상품정보 사전저장 없음</small>`:`<strong>진행 중인 방송 없음</strong><span>URL을 입력하고 ‘새 방송 시작 · 연결’을 눌러주세요.</span><small>API 키 ${b.apiKeyConfigured?"설정됨":"미설정"}</small>`;
  if(byId("broadcastStatusCard")) byId("broadcastStatusCard").innerHTML=text;
  if(byId("homeBroadcastCard")) byId("homeBroadcastCard").innerHTML=text;
  const sec=byId("securityStatusV436");if(sec){const providers=[];if(b.payAppConfigured)providers.push("페이앱 연결");if(b.tossConfigured)providers.push("토스 연결");if(!providers.length&&b.cardPaymentLinkConfigured)providers.push("고정 카드링크");if(!providers.length)providers.push("카드 PG 미연결");sec.textContent=(b.securityConfigured?"비밀번호 설정됨":"초기 비밀번호 사용중")+" · "+providers.join(" · ");sec.classList.toggle("ready",Boolean(b.securityConfigured));}
}
async function clearTodayProductsV435(){if(!confirm("오늘상품만 모두 비울까요?\n상시상품은 그대로 유지됩니다."))return;try{showLoading("오늘상품을 정리하는 중입니다.");const r=await apiPost({action:"adminClearTodayProducts"});alert(r.message||"정리했습니다.");await loadAdminProducts();}catch(e){alert(e.message);}finally{hideLoading();}}
async function changeSheetModeV435(mode){try{showLoading("시트 화면을 정리하는 중입니다.");const r=await apiPost({action:"adminSheetMode",mode});alert(r.message||"시트를 정리했습니다.");}catch(e){alert(e.message);}finally{hideLoading();}}

// V4.39.2 상품관리: 판매구분은 기존 열을 밀지 않고 맨 뒤 열에 저장합니다.
function renderAdminProducts(){
  const tbody=byId("adminProductList"),keyword=(byId("productKeyword").value||"").trim().toLowerCase();
  const filtered=adminProducts.filter(p=>[p.saleType,p.productNo,p.productName,p.color,p.size].join(" ").toLowerCase().includes(keyword));
  if(!filtered.length){tbody.innerHTML='<tr><td colspan="12" class="empty-cell">표시할 상품정보가 없습니다.</td></tr>';return;}
  tbody.innerHTML=filtered.map(p=>`<tr><td data-label="구분"><span class="sale-type-badge ${p.saleType==="상시"?"permanent":"today"}">${escapeHtml(p.saleType||"오늘")}</span></td><td data-label="상품번호">${escapeHtml(p.productNo)}</td><td data-label="상품명">${escapeHtml(p.productName)}</td><td data-label="칼라">${escapeHtml(p.color)}</td><td data-label="사이즈">${escapeHtml(p.size)}</td><td data-label="판매가">${money(p.salePrice)}</td><td data-label="입금가">${money(p.depositPrice)}</td><td data-label="현재재고">${p.stockManaged?Number(p.currentStock).toLocaleString("ko-KR")+"개":"미설정"}</td><td data-label="라이브예약">${p.stockManaged?Number(p.reservedStock||0).toLocaleString("ko-KR")+"개":"-"}</td><td data-label="추가주문가능"><strong>${p.stockManaged?Number(p.availableStock||0).toLocaleString("ko-KR")+"개":"미설정"}</strong></td><td data-label="상태"><span class="stock-status ${["품절","예약품절"].includes(p.status)?"soldout":""}">${escapeHtml(p.status||"재고미설정")}</span></td><td data-label="관리"><button type="button" class="button dark small edit-product" data-row="${p.rowNumber}">수정</button> <button type="button" class="button danger small delete-product" data-row="${p.rowNumber}">삭제</button></td></tr>`).join("");
  tbody.querySelectorAll(".edit-product").forEach(b=>b.onclick=()=>editAdminProduct(Number(b.dataset.row)));
  tbody.querySelectorAll(".delete-product").forEach(b=>b.onclick=()=>deleteAdminProduct(Number(b.dataset.row)));
}
function editAdminProduct(rowNumber){const p=adminProducts.find(x=>Number(x.rowNumber)===rowNumber);if(!p)return;byId("productFormTitle").textContent="상품정보 수정";byId("productRowNumber").value=rowNumber;byId("adminProductNo").value=p.productNo||"";byId("adminProductName").value=p.productName||"";byId("adminProductColor").value=p.color||"";byId("adminProductSize").value=p.size||"";byId("adminSalePrice").value=p.salePrice||"";byId("adminDepositPrice").value=p.depositPrice||"";byId("adminCurrentStock").value=p.stockManaged?p.currentStock:"";if(byId("adminSaleType"))byId("adminSaleType").value=p.saleType||"오늘";window.scrollTo({top:0,behavior:"smooth"});}
function resetAdminProductForm(){byId("productFormTitle").textContent="상품정보 추가";["productRowNumber","adminProductNo","adminProductName","adminProductColor","adminProductSize","adminSalePrice","adminDepositPrice","adminCurrentStock"].forEach(id=>{if(byId(id))byId(id).value="";});if(byId("adminSaleType"))byId("adminSaleType").value="오늘";}
async function saveAdminProduct(){
  const payload={action:"saveProduct",rowNumber:Number(byId("productRowNumber").value||0),productNo:byId("adminProductNo").value.trim(),productName:byId("adminProductName").value.trim(),color:byId("adminProductColor").value.trim(),size:byId("adminProductSize").value.trim(),salePrice:Number(byId("adminSalePrice").value||0),depositPrice:Number(byId("adminDepositPrice").value||0),currentStock:byId("adminCurrentStock").value.trim(),saleType:(byId("adminSaleType")||{}).value||"오늘"};
  if(!payload.productNo||!payload.productName||!payload.color||!payload.size){alert("상품번호, 상품명, 칼라, 사이즈를 모두 입력해주세요.");return;}
  if(!/^\d{1,4}$/.test(payload.productNo)||Number(payload.productNo)<1||Number(payload.productNo)>9999){alert("상품번호는 1~9999 사이의 숫자로 입력해주세요.");return;}
  try{showLoading("상품정보를 저장하는 중입니다.");await apiPost(payload);resetAdminProductForm();await loadAdminProducts();}catch(e){alert(e.message);}finally{hideLoading();}
}


/* =========================================================
   V4.50.2 통합관리자 · 지연로딩 · 공통 주문수정
========================================================= */
const admin450={tab:'home',ordersMode:'today',orderFilter:'all',orders:[],lookupMode:'customer',liveType:'',csFilter:'',productsLoaded:false,tabLoaded:{},selectedOrder:null};
let adminV451Initialized=false;
function v450(id){return document.getElementById(id)}
function v450On(id,event,fn){const el=v450(id);if(el)el.addEventListener(event,fn);return el}
function v450OpenModal(id){const el=v450(id);if(el){el.classList.add('show');el.setAttribute('aria-hidden','false')}}
function v450CloseModal(id){const el=v450(id);if(el){el.classList.remove('show');el.setAttribute('aria-hidden','true')}}
function v450StatusClass(s){s=String(s||'');if(s==='카드결제대기')return 'st-card-wait';if(s==='카드링크발송')return 'st-card-sent';if(s==='카드결제완료'||s==='입금완료'||s==='카드결제')return 'st-paid';if(s==='미입금')return 'st-unpaid';return ''}
function v450DateTime(v){if(!v)return '';const d=new Date(v);return isNaN(d.getTime())?String(v):d.toLocaleString('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}
function v450Text(v){return String(v==null?'':v)}
function v450OrderCard(o,extra){return `<button type="button" class="v450-order-card ${v450StatusClass(o.paymentStatus)}" data-order-no="${escapeHtml(o.orderNumber||'')}"><div class="v450-order-card-top"><b>${escapeHtml(o.nickname||o.receiverName||'주문')}</b><span>${escapeHtml(o.orderDate||'')}</span></div><div>${escapeHtml(o.receiverName||'')} · ${escapeHtml(o.phone||'')}</div><div class="v450-order-items-preview">${escapeHtml((o.orderItems||'').replace(/\n/g,' · '))}</div><div class="v450-order-card-foot"><span class="v450-status ${v450StatusClass(o.paymentStatus)}">${escapeHtml(o.paymentStatus||'')}</span><strong>${money(o.paymentAmount||0)}</strong></div>${extra||''}</button>`}
function v450BindOrderCards(root,orders){if(!root)return;root.querySelectorAll('[data-order-no]').forEach(el=>el.addEventListener('click',()=>{const no=el.dataset.orderNo;const o=(orders||[]).find(x=>String(x.orderNumber)===String(no));if(o)openOrderModalV450(o)}))}

async function initAdminV450Page(){
  if(adminV451Initialized)return;
  adminV451Initialized=true;
  v450On('adminLogoutButton','click',logoutAdminV427);
  const role=adminRoleV435||'admin';const badge=v450('adminRoleBadge');if(badge)badge.textContent=role==='cs'?'CS 관리자':'대표 관리자';
  document.querySelectorAll('.admin-only').forEach(el=>{if(role==='cs')el.hidden=true});
  document.querySelectorAll('[data-v450-tab]').forEach(btn=>btn.addEventListener('click',()=>showAdminTabV450(btn.dataset.v450Tab)));
  bindAdminHomeV450();bindOrdersV450();bindLookupV450();bindLiveV450();bindCsV450();bindProductsV450();bindPaymentsV450();bindCommonModalsV450();
  if(role==='admin')bindBankV450();
  showAdminTabV450(role==='cs'?'cs':'home');
}
function showAdminTabV450(name){
  if(adminRoleV435==='cs'&&!['home','cs'].includes(name))name='cs';admin450.tab=name;
  document.querySelectorAll('[data-v450-tab]').forEach(b=>b.classList.toggle('active',b.dataset.v450Tab===name));
  document.querySelectorAll('.v450-tab').forEach(s=>s.classList.toggle('active',s.id==='v450Tab-'+name));
  if(name==='home')loadAdminHomeV450();
  if(name==='orders')loadOrdersV450();
  if(name==='live')loadLiveSummaryV450();
  if(name==='cs')loadCsSummaryV450();
  if(name==='bankmatch'){initBankMatchPage();loadBankMatchOrders();}
  if(name==='products')loadProductsV450();
  if(name==='payments')loadPaymentsV450();
}

function bindAdminHomeV450(){
  document.querySelectorAll('[data-home-filter]').forEach(b=>b.addEventListener('click',()=>loadHomeFilteredV450(b.dataset.homeFilter,b.querySelector('span')?.textContent||'상세목록')));
  v450On('homeFilteredClose','click',()=>{v450('homeFilteredPanel').hidden=true});
  v450On('rebuildButton','click',async()=>{if(!confirm('거래처발주와 3PL출고를 현재 주문 기준으로 갱신할까요?'))return;try{showLoading('거래처발주와 3PL출고를 정리하는 중입니다.');const r=await apiPost({action:'rebuildAll'});alert(r.message||'갱신했습니다.');await loadAdminHomeV450(true)}catch(e){alert(e.message)}finally{hideLoading()}});
  v450On('archiveHistoryButton','click',async()=>{if(!confirm('3PL출고 기준으로 전체주문이력을 저장/갱신할까요?'))return;try{showLoading('전체주문이력을 저장/갱신하는 중입니다.');const r=await apiPost({action:'archiveCurrentOrders'});alert(r.message||'저장/갱신했습니다.')}catch(e){alert(e.message)}finally{hideLoading()}});
  v450On('combinedShippingButton','click',()=>{v450('combinedStartDate').value=todayString();v450('combinedEndDate').value=todayString();v450OpenModal('combinedShippingModal')});
  v450On('combinedShippingConfirmButton','click',loadCombinedShippingV450);v450On('combinedCopyV450','click',async()=>{const text=v450('combinedResultV450').textContent||'';try{await navigator.clipboard.writeText(text);alert('합배송 가능 고객 목록을 복사했습니다.')}catch(e){prompt('아래 내용을 복사해주세요.',text)}});
  ['combinedShippingModalClose','combinedShippingCancelButton'].forEach(id=>v450On(id,'click',()=>v450CloseModal('combinedShippingModal')));
  v450On('lotteExcelButtonV418','click',()=>{v450('lotteStartDate').value=todayString();v450('lotteEndDate').value=todayString();v450OpenModal('lotteDownloadModal')});
  ['lotteDownloadModalClose','lotteDownloadCancelButton'].forEach(id=>v450On(id,'click',()=>v450CloseModal('lotteDownloadModal')));v450On('lotteDownloadConfirmButton','click',downloadLotteExcelV450);
  v450On('lotteTrackingButton','click',()=>v450('lotteTrackingFile')?.click());v450On('lotteTrackingFile','change',uploadLotteTrackingV450);
}
async function loadAdminHomeV450(force){if(!force&&Date.now()-(admin450.tabLoaded.home||0)<12000)return;try{const d=await apiGet({action:'adminHomeV450'}),c=d.counts||{};admin450.tabLoaded.home=Date.now();[['hTodayOrders',c.todayOrders],['hShipping',c.shipping],['hPaid',c.paid],['hUnpaid',c.unpaid],['hCardWaiting',c.cardWaiting],['hCardSent',c.cardSent],['hCardDone',c.cardDone]].forEach(x=>{if(v450(x[0]))v450(x[0]).textContent=Number(x[1]||0).toLocaleString()});if(v450('hSales'))v450('hSales').textContent=money(c.totalSales);if(v450('hMargin'))v450('hMargin').textContent=money(c.margin)}catch(e){console.warn(e)}}
async function loadHomeFilteredV450(filter,title){try{showLoading(title+'을 불러오는 중입니다.');const d=await apiGet({action:'adminOrdersV450',mode:'today',filter:filter==='all'?'':filter});const box=v450('homeFilteredList');v450('homeFilteredTitle').textContent=title;v450('homeFilteredPanel').hidden=false;const rows=d.orders||[];box.innerHTML=rows.length?rows.map(o=>v450OrderCard(o)).join(''):'<div class="empty-state">해당 주문이 없습니다.</div>';v450BindOrderCards(box,rows);v450('homeFilteredPanel').scrollIntoView({behavior:'smooth',block:'start'})}catch(e){alert(e.message)}finally{hideLoading()}}
async function loadCombinedShippingV450(){const s=v450('combinedStartDate').value,e=v450('combinedEndDate').value;if(!s||!e){alert('조회 날짜를 선택해주세요.');return}try{showLoading('합배송 가능 고객을 찾는 중입니다.');const r=await apiGet({action:'combinedShippingCandidates',startDate:s,endDate:e}),rows=Array.isArray(r.data)?r.data:(r.data&&r.data.rows)||[];const text=rows.length?rows.map((x,i)=>`${i+1}. ${x.nickname||''} / ${x.receiverName||''}\n   ${x.phone||''}\n   주문 ${x.orderCount||0}건 / 내품 ${x.itemQuantity||0}개\n   ${(x.orders||[]).map(o=>`${o.orderDate} ${o.paymentStatus||''}`).join(' / ')}`).join('\n\n'):'합배송 가능한 고객이 없습니다.';v450('combinedResultV450').textContent=text}catch(e){alert(e.message)}finally{hideLoading()}}

function bindOrdersV450(){document.querySelectorAll('[data-orders-mode]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-orders-mode]').forEach(x=>x.classList.toggle('active',x===b));admin450.ordersMode=b.dataset.ordersMode;loadOrdersV450(true)}));document.querySelectorAll('[data-order-filter]').forEach(b=>b.addEventListener('click',()=>{admin450.orderFilter=b.dataset.orderFilter;renderOrdersV450()}));v450On('orderSearchBtnV450','click',()=>loadOrdersV450(true));v450On('orderSearchV450','keydown',e=>{if(e.key==='Enter')loadOrdersV450(true)})}
async function loadOrdersV450(force){if(!force&&Date.now()-(admin450.tabLoaded.orders||0)<10000&&admin450.orders.length){renderOrdersV450();return}try{showLoading('주문을 불러오는 중입니다.');const d=await apiGet({action:'adminOrdersV450',mode:admin450.ordersMode,keyword:v450('orderSearchV450')?.value||''});admin450.orders=d.orders||[];admin450.tabLoaded.orders=Date.now();const c=d.counts||{};[['oAll',c.all],['oShipping',c.shipping],['oPaid',c.paid],['oUnpaid',c.unpaid]].forEach(x=>{if(v450(x[0]))v450(x[0]).textContent=Number(x[1]||0).toLocaleString()});if(v450('oSales'))v450('oSales').textContent=money(c.totalSales);if(v450('oMargin'))v450('oMargin').textContent=money(c.margin);renderOrdersV450()}catch(e){alert(e.message)}finally{hideLoading()}}
function filterOrdersV450(rows,filter){if(filter==='paid')return rows.filter(o=>['입금완료','카드결제완료','카드결제'].includes(o.paymentStatus));if(filter==='shipping')return rows.filter(o=>['입금완료','카드결제완료','카드결제'].includes(o.paymentStatus));if(filter==='unpaid')return rows.filter(o=>o.paymentStatus==='미입금');return rows}
function renderOrdersV450(){const rows=filterOrdersV450(admin450.orders,admin450.orderFilter),body=v450('ordersBodyV450');if(!body)return;if(!rows.length){body.innerHTML='<tr><td colspan="10" class="empty-cell">주문이 없습니다.</td></tr>';return}body.innerHTML=rows.map(o=>`<tr data-order-no="${escapeHtml(o.orderNumber)}"><td data-label="주문일">${escapeHtml(o.orderDate)}</td><td data-label="입금금액">${money(o.paymentAmount)}</td><td data-label="입금상태"><span class="v450-status ${v450StatusClass(o.paymentStatus)}">${escapeHtml(o.paymentStatus)}</span></td><td data-label="닉네임">${escapeHtml(o.nickname)}</td><td data-label="수령인">${escapeHtml(o.receiverName)}</td><td data-label="주소">${escapeHtml(o.address)}</td><td data-label="연락처">${escapeHtml(o.phone)}</td><td data-label="구매내역" class="items-cell">${escapeHtml(o.orderItems).replace(/\n/g,'<br>')}</td><td data-label="내품수량">${Number(o.itemQuantity||0)}</td><td data-label="송장번호">${escapeHtml(o.trackingNumber||'').replace(/\n/g,'<br>')}</td></tr>`).join('');body.querySelectorAll('tr[data-order-no]').forEach(tr=>tr.addEventListener('click',()=>{const o=rows.find(x=>String(x.orderNumber)===tr.dataset.orderNo);if(o)openOrderModalV450(o)}))}

function bindLookupV450(){document.querySelectorAll('[data-lookup-mode]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-lookup-mode]').forEach(x=>x.classList.toggle('active',x===b));admin450.lookupMode=b.dataset.lookupMode;v450('lookupCustomerControls').hidden=admin450.lookupMode!=='customer';v450('lookupDateControls').hidden=admin450.lookupMode!=='date';v450('lookupLiveControls').hidden=admin450.lookupMode!=='live'}));v450On('lookupSearchV450','click',()=>loadLookupV450('customer'));v450On('lookupDateSearchV450','click',()=>loadLookupV450('date'));v450On('lookupLiveSearchV450','click',()=>loadLookupV450('live'));if(v450('lookupDateV450'))v450('lookupDateV450').value=todayString()}
async function loadLookupV450(type){const keyword=type==='customer'?(v450('lookupKeywordV450').value||''):(type==='live'?(v450('lookupLiveKeywordV450').value||''):'');const date=type==='date'?(v450('lookupDateV450').value||''):'';if(type==='customer'&&!keyword.trim()){alert('닉네임, 이름 또는 전화번호 뒷자리를 입력해주세요.');return}if(type==='date'&&!date){alert('날짜를 선택해주세요.');return}try{showLoading('주문을 조회하는 중입니다.');const d=await apiGet({action:'adminOrderLookupV450',type:type,keyword:keyword,date:date});const rows=d.orders||[],box=v450('lookupResultsV450');box.innerHTML=rows.length?rows.map(o=>v450OrderCard(o,`<small>${o.isCurrent?'LIVE':'전체이력'}</small>`)).join(''):'<div class="empty-state">조회된 주문이 없습니다.</div>';v450BindOrderCards(box,rows)}catch(e){alert(e.message)}finally{hideLoading()}}

function bindLiveV450(){v450On('youtubeApiKeySaveButton','click',saveYoutubeApiV450);v450On('broadcastStartButton','click',startBroadcastV450);v450On('broadcastEndButton','click',endBroadcastV450);document.querySelectorAll('[data-live-list]').forEach(b=>b.addEventListener('click',()=>loadLiveListV450(b.dataset.liveList,b.querySelector('span')?.textContent||'임시주문')));v450On('liveSelectAllV450','change',()=>document.querySelectorAll('.live-row-check-v450').forEach(x=>x.checked=v450('liveSelectAllV450').checked));v450On('liveBulkApplyV450','click',applyLiveBulkV450);v450On('liveDeleteSelectedV450','click',deleteLiveRowsV450)}
async function loadLiveSummaryV450(){try{const d=await apiGet({action:'adminLiveSummaryV450'}),c=d.counts||{},b=d.broadcast||{};[['lReserved',c.reserved],['lSubmitted',c.submitted],['lUnsubmitted',c.unsubmitted],['lReview',c.review]].forEach(x=>{if(v450(x[0]))v450(x[0]).textContent=Number(x[1]||0)});if(v450('broadcastStateBadge')){v450('broadcastStateBadge').textContent=b.active?'방송 중':'방송 대기';v450('broadcastStateBadge').classList.toggle('active',!!b.active)}if(v450('broadcastYoutubeUrl')&&b.videoId&&!v450('broadcastYoutubeUrl').value)v450('broadcastYoutubeUrl').value='https://www.youtube.com/watch?v='+b.videoId;if(v450('youtubeApiSetupV450'))v450('youtubeApiSetupV450').hidden=!!b.apiKeyConfigured}catch(e){alert(e.message)}}
async function saveYoutubeApiV450(){const key=(v450('youtubeApiKeyInput').value||'').trim();if(!key){alert('YouTube API 키를 입력해주세요.');return}try{const r=await apiPost({action:'adminSaveYouTubeApiKey',apiKey:key});v450('youtubeApiKeyInput').value='';alert(r.message||'저장했습니다.');loadLiveSummaryV450()}catch(e){alert(e.message)}}
async function startBroadcastV450(){const url=(v450('broadcastYoutubeUrl').value||'').trim();if(!url){alert('YouTube 라이브 URL을 입력해주세요.');return}if(!confirm('새 방송을 시작하면 이전 방송의 임시예약·대기·메시지ID가 초기화됩니다. 시작할까요?'))return;try{showLoading('라이브를 시작하는 중입니다.');const r=await apiPost({action:'adminStartBroadcast',youtubeUrl:url});alert(r.message||'라이브를 시작했습니다.');await loadLiveSummaryV450()}catch(e){alert(e.message)}finally{hideLoading()}}
async function endBroadcastV450(){if(!confirm('라이브를 종료할까요?'))return;try{showLoading('라이브를 종료하는 중입니다.');const r=await apiPost({action:'adminEndBroadcast'});alert(r.message||'종료했습니다.');await loadLiveSummaryV450()}catch(e){alert(e.message)}finally{hideLoading()}}
async function loadLiveListV450(type,title){admin450.liveType=type;try{showLoading(title+' 목록을 불러오는 중입니다.');const d=await apiGet({action:'adminLiveListV450',type:type}),rows=d.rows||[],body=v450('liveListBodyV450');v450('liveListTitleV450').textContent=title;v450('liveListPanelV450').hidden=false;body.innerHTML=rows.length?rows.map(r=>`<tr><td data-label="선택"><input type="checkbox" class="live-row-check-v450" value="${Number(r.rowNumber)}"></td><td data-label="시간">${escapeHtml(v450DateTime(r.time))}</td><td data-label="닉네임">${escapeHtml(r.nickname)}</td><td data-label="상품번호">${escapeHtml(r.productNo)}</td><td data-label="상품명">${escapeHtml(r.productName)}</td><td data-label="칼라">${escapeHtml(r.color)}</td><td data-label="사이즈">${escapeHtml(r.size)}</td><td data-label="수량">${Number(r.quantity||0)}</td><td data-label="상태">${escapeHtml(r.status)}</td></tr>`).join(''):'<tr><td colspan="9" class="empty-cell">해당 주문이 없습니다.</td></tr>'}catch(e){alert(e.message)}finally{hideLoading()}}
function selectedLiveRowsV450(){return Array.from(document.querySelectorAll('.live-row-check-v450:checked')).map(x=>Number(x.value)).filter(x=>x>=2)}
async function applyLiveBulkV450(){const rows=selectedLiveRowsV450(),status=v450('liveBulkStatusV450').value;if(!rows.length||!status){alert('변경할 주문과 상태를 선택해주세요.');return}if(!confirm(rows.length+'건을 '+status+' 상태로 변경할까요?'))return;try{showLoading('상태를 변경하는 중입니다.');const r=await apiPost({action:'adminLiveBulkStatus',rowNumbers:rows,status:status});alert(r.message||'변경했습니다.');await loadLiveListV450(admin450.liveType,'라이브임시주문');await loadLiveSummaryV450()}catch(e){alert(e.message)}finally{hideLoading()}}
async function deleteLiveRowsV450(){const rows=selectedLiveRowsV450();if(!rows.length){alert('삭제할 주문을 선택해주세요.');return}if(!confirm(rows.length+'건을 라이브임시주문에서 영구 삭제할까요?'))return;try{showLoading('삭제하는 중입니다.');const r=await apiPost({action:'adminLiveDeleteRowsV450',rowNumbers:rows});alert(r.message||'삭제했습니다.');await loadLiveListV450(admin450.liveType,'라이브임시주문');await loadLiveSummaryV450()}catch(e){alert(e.message)}finally{hideLoading()}}

function bindCsV450(){document.querySelectorAll('[data-cs-filter]').forEach(b=>b.addEventListener('click',()=>loadCsListV450(b.dataset.csFilter,b.querySelector('span')?.textContent||'CS 주문')))}
async function loadCsSummaryV450(){try{const d=await apiGet({action:'adminOrdersV450',mode:'all'}),rows=d.orders||[];const paid=rows.filter(o=>['입금완료','카드결제완료','카드결제'].includes(o.paymentStatus)).length,unpaid=rows.filter(o=>o.paymentStatus==='미입금').length,card=rows.filter(o=>['카드결제대기','카드링크발송','카드결제완료','카드결제'].includes(o.paymentStatus)).length;[['cAll',rows.length],['cPaid',paid],['cUnpaid',unpaid],['cCard',card]].forEach(x=>{if(v450(x[0]))v450(x[0]).textContent=x[1]})}catch(e){console.warn(e)}}
async function loadCsListV450(filter,title){try{showLoading(title+'을 불러오는 중입니다.');const d=await apiGet({action:'adminOrdersV450',mode:'all',filter:filter==='all'?'':filter}),rows=d.orders||[],box=v450('csResultsV450');box.innerHTML=rows.length?rows.map(o=>{let actions='';if(o.paymentStatus==='미입금')actions='<div class="v450-inline-actions"><button data-quick-paid="'+escapeHtml(o.orderNumber)+'">입금완료</button><button data-quick-card="'+escapeHtml(o.orderNumber)+'">카드결제</button></div>';if(['카드결제대기','카드링크발송'].includes(o.paymentStatus))actions='<div class="v450-inline-actions"><button data-payapp-sms="'+escapeHtml(o.orderNumber)+'">결제링크 문자발송</button><button data-quick-paid="'+escapeHtml(o.orderNumber)+'">입금완료</button></div>';return v450OrderCard(o,actions)}).join(''):'<div class="empty-state">해당 주문이 없습니다.</div>';v450BindOrderCards(box,rows);box.querySelectorAll('[data-quick-paid]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();quickSetOrderStatusV450(b.dataset.quickPaid,'입금완료',()=>loadCsListV450(filter,title))}));box.querySelectorAll('[data-quick-card]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();quickSetOrderStatusV450(b.dataset.quickCard,'카드결제대기',()=>loadCsListV450(filter,title))}));box.querySelectorAll('[data-payapp-sms]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();sendPayAppSmsV450(b.dataset.payappSms,()=>loadCsListV450(filter,title))}))}catch(e){alert(e.message)}finally{hideLoading()}}
async function quickSetOrderStatusV450(no,status,after){if(!confirm(status+' 상태로 변경할까요?'))return;try{const r=await apiPost({action:'adminSetOrderStatusV450',orderNumber:no,status:status});alert(r.message||'변경했습니다.');if(after)after();loadAdminHomeV450(true);loadCsSummaryV450()}catch(e){alert(e.message)}}
async function sendPayAppSmsV450(no,after){try{const d=await apiGet({action:'adminOrdersV450',mode:'all',keyword:no}),o=(d.orders||[]).find(x=>x.orderNumber===no);if(!o)throw new Error('주문을 찾지 못했습니다.');if(!confirm(`${o.receiverName||o.nickname} 고객에게 페이앱 카드결제 문자를 발송할까요?\n${money(o.paymentAmount)}`))return;showLoading('페이앱 문자를 발송하는 중입니다.');const r=await apiPost({action:'adminCsCreatePayAppLink',rowNumber:o.rowNumber,sendSms:true});alert(r.message||'문자 발송을 요청했습니다.');if(after)after();loadCsSummaryV450();loadAdminHomeV450(true)}catch(e){alert(e.message)}finally{hideLoading()}}

function bindProductsV450(){v450On('addProductOptionV450','click',()=>addProductOptionRowV450());v450On('saveProductV450','click',saveProductV450);v450On('reloadProductsV450','click',()=>loadProductsV450(true));v450On('saveProductArchiveV450','click',saveProductArchiveAdminV450);v450On('viewArchiveV450','click',viewArchiveV450);const saveDate=v450('archiveSaveDateV451');if(saveDate&&!saveDate.value)saveDate.value=todayString();if(v450('productOptionsV450')&&!v450('productOptionsV450').children.length)addProductOptionRowV450()}
function addProductOptionRowV450(values){const box=v450('productOptionsV450'),row=document.createElement('div');row.className='v450-option-row';row.innerHTML=`<input class="v450-opt-color" placeholder="칼라" value="${escapeHtml(values?.color||'')}"><input class="v450-opt-size" placeholder="사이즈" value="${escapeHtml(values?.size||'')}"><input class="v450-opt-stock" type="number" min="0" placeholder="현재재고" value="${values?.currentStock??''}"><button type="button" class="btn btn-danger-soft">삭제</button>`;row.querySelector('button').addEventListener('click',()=>{if(box.children.length>1)row.remove();else{row.querySelectorAll('input').forEach(x=>x.value='')}});box.appendChild(row)}
async function saveProductV450(){const product={productNo:(v450('pNoV450').value||'').trim(),productName:(v450('pNameV450').value||'').trim(),saleType:v450('pTypeV450').value,salePrice:Number(v450('pSaleV450').value||0),depositPrice:Number(v450('pDepositV450').value||0)},options=Array.from(document.querySelectorAll('.v450-option-row')).map(r=>({color:r.querySelector('.v450-opt-color').value.trim(),size:r.querySelector('.v450-opt-size').value.trim(),currentStock:Number(r.querySelector('.v450-opt-stock').value)}));try{showLoading('상품을 저장하는 중입니다.');const r=await apiPost({action:'adminBatchProductSaveV450',product:product,options:options});alert(r.message||'저장했습니다.');admin450.productsLoaded=false;await loadProductsV450(true)}catch(e){alert(e.message)}finally{hideLoading()}}
async function loadProductsV450(force){if(!force&&admin450.productsLoaded)return;try{showLoading('상품정보를 불러오는 중입니다.');const d=await apiGet({action:'adminProducts'}),rows=d.products||[],body=v450('productsBodyV450');body.innerHTML=rows.length?rows.map(p=>`<tr><td data-label="번호">${escapeHtml(p.productNo)}</td><td data-label="상품명">${escapeHtml(p.productName)}</td><td data-label="칼라">${escapeHtml(p.color)}</td><td data-label="사이즈">${escapeHtml(p.size)}</td><td data-label="판매가">${money(p.salePrice)}</td><td data-label="입금가">${money(p.depositPrice)}</td><td data-label="현재재고">${p.currentStock==null?'미설정':Number(p.currentStock)}</td><td data-label="예약">${Number(p.reservedStock||0)}<small>${escapeHtml(p.reservedNames||'')}</small></td><td data-label="주문서접수">${Number(p.submittedStock||0)}</td><td data-label="대기">${escapeHtml(p.waitingNames||'')}</td><td data-label="추가가능"><strong>${p.availableStock==null?'-':Number(p.availableStock)}</strong></td></tr>`).join(''):'<tr><td colspan="11" class="empty-cell">등록된 상품이 없습니다.</td></tr>';admin450.productsLoaded=true;await loadProductArchiveDatesV450()}catch(e){alert(e.message)}finally{hideLoading()}}
async function saveProductArchiveAdminV450(){const date=(v450('archiveSaveDateV451')?.value||todayString()).trim();if(!date){alert('저장 날짜를 선택해주세요.');return}if(!confirm(date+' 날짜로 현재 상품정보 전체를 저장할까요?\n같은 날짜의 저장본이 있으면 갱신됩니다.'))return;try{showLoading(date+' 상품정보를 저장하는 중입니다.');const r=await apiPost({action:'adminSaveProductArchiveV450',date:date});alert(r.message||'저장했습니다.');await loadProductArchiveDatesV450();if(v450('archiveDateV450'))v450('archiveDateV450').value=date}catch(e){alert(e.message)}finally{hideLoading()}}
async function loadProductArchiveDatesV450(){try{const d=await apiGet({action:'adminProductArchiveDatesV450'}),sel=v450('archiveDateV450');if(!sel)return;const keep=sel.value;sel.innerHTML='<option value="">날짜별 상품정보 선택</option>'+((d.dates||[]).map(x=>`<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join(''));if((d.dates||[]).includes(keep))sel.value=keep}catch(e){console.warn(e)}}
async function viewArchiveV450(){const date=v450('archiveDateV450').value;if(!date){alert('조회할 날짜를 선택해주세요.');return}try{const d=await apiGet({action:'adminProductArchiveV450',date:date}),rows=d.rows||[],box=v450('archiveResultV450');box.innerHTML=rows.length?`<div class="table-wrap"><table class="data-table"><thead><tr><th>번호</th><th>상품명</th><th>칼라</th><th>사이즈</th><th>판매가</th><th>입금가</th><th>당시재고</th></tr></thead><tbody>${rows.map(p=>`<tr><td>${escapeHtml(p.productNo)}</td><td>${escapeHtml(p.productName)}</td><td>${escapeHtml(p.color)}</td><td>${escapeHtml(p.size)}</td><td>${money(p.salePrice)}</td><td>${money(p.depositPrice)}</td><td>${p.currentStock==null?'-':Number(p.currentStock)}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty-state">저장된 상품이 없습니다.</div>'}catch(e){alert(e.message)}}

function bindPaymentsV450(){v450On('payAppSaveV450','click',savePayAppV450);v450On('tossSaveV450','click',saveTossV450);v450On('securitySaveV450','click',saveSecurity450)}
async function loadPaymentsV450(){try{const d=await apiGet({action:'adminPaymentConfigV450'});document.querySelectorAll('#v450Tab-payments h3').forEach(()=>{});if(d.payAppConfigured)v450('payAppSaveV450').textContent='페이앱 연결정보 변경';if(d.tossConfigured)v450('tossSaveV450').textContent='토스 연결정보 변경'}catch(e){console.warn(e)}}
async function savePayAppV450(){const userid=v450('payAppUserIdV438').value.trim(),linkkey=v450('payAppLinkKeyV438').value.trim(),linkval=v450('payAppLinkValV438').value.trim();if(!userid||!linkkey||!linkval){alert('페이앱 정보를 모두 입력해주세요.');return}try{const r=await apiPost({action:'adminSavePayAppConfig',userid,linkkey,linkval});v450('payAppLinkKeyV438').value='';v450('payAppLinkValV438').value='';alert(r.message||'저장했습니다.');loadPaymentsV450()}catch(e){alert(e.message)}}
async function saveTossV450(){const clientKey=v450('tossClientKeyV440').value.trim(),secretKey=v450('tossSecretKeyV440').value.trim(),payPageUrl=v450('tossPayPageUrlV440').value.trim();if(!clientKey||!secretKey){alert('토스 키를 입력해주세요.');return}try{const r=await apiPost({action:'adminSaveTossConfig',clientKey,secretKey,payPageUrl});v450('tossSecretKeyV440').value='';alert(r.message||'저장했습니다.');loadPaymentsV450()}catch(e){alert(e.message)}}
async function saveSecurity450(){const adminPassword=v450('newAdminPasswordV436').value.trim(),csPassword=v450('newCsPasswordV436').value.trim();if(!adminPassword&&!csPassword){alert('변경할 비밀번호를 입력해주세요.');return}try{const r=await apiPost({action:'adminSaveSecurity',adminPassword,csPassword});v450('newAdminPasswordV436').value='';v450('newCsPasswordV436').value='';alert(r.message||'저장했습니다.')}catch(e){alert(e.message)}}

function bindBankV450(){/* 실제 로딩은 입금관리 탭 진입 때 기존 안정화 대조기를 지연 초기화합니다. */}
function bindCommonModalsV450(){v450On('orderModalCloseV450','click',()=>v450CloseModal('orderModalV450'));v450On('orderModalV450','click',e=>{if(e.target===v450('orderModalV450'))v450CloseModal('orderModalV450')});['combinedShippingModal','lotteDownloadModal'].forEach(id=>v450On(id,'click',e=>{if(e.target===v450(id))v450CloseModal(id)}))}
function openOrderModalV450(o){admin450.selectedOrder=o;const editable=o.isCurrent!==false,body=v450('orderModalBodyV450');const statuses=['미입금','입금완료','카드결제대기','카드링크발송','카드결제완료'];body.innerHTML=`<div class="v450-order-meta"><div><label>주문번호</label><b>${escapeHtml(o.orderNumber||'')}</b></div><div><label>주문일</label><b>${escapeHtml(o.orderDate||'')}</b></div><div><label>송장번호</label><b>${escapeHtml(o.trackingNumber||'-')}</b></div></div><div class="form-grid two"><div class="field"><label>닉네임</label><input id="mNickV450" value="${escapeHtml(o.nickname||'')}" ${editable?'':'disabled'}></div><div class="field"><label>수령인</label><input id="mReceiverV450" value="${escapeHtml(o.receiverName||'')}" ${editable?'':'disabled'}></div><div class="field"><label>연락처</label><input id="mPhoneV450" value="${escapeHtml(o.phone||'')}" ${editable?'':'disabled'}></div><div class="field"><label>입금상태</label><select id="mStatusV450" ${editable?'':'disabled'}>${statuses.map(s=>`<option ${s===o.paymentStatus?'selected':''}>${s}</option>`).join('')}</select></div><div class="field full"><label>주소</label><input id="mAddressV450" value="${escapeHtml(o.address||'')}" ${editable?'':'disabled'}></div><div class="field"><label>우편번호</label><input id="mZipV450" value="${escapeHtml(o.zipcode||'')}" ${editable?'':'disabled'}></div><div class="field"><label>배송메모</label><input id="mShippingMemoV450" value="${escapeHtml(o.shippingMemo||'')}" ${editable?'':'disabled'}></div><div class="field full"><label>구매내역</label><textarea id="mItemsV450" rows="8" ${editable?'':'disabled'}>${escapeHtml(o.orderItems||'')}</textarea></div></div><div class="v450-modal-summary"><span>입금금액 <b>${money(o.paymentAmount||0)}</b></span><span>내품수량 <b>${Number(o.itemQuantity||0)}개</b></span></div>${editable?'<div class="button-row"><button class="btn btn-primary" id="mSaveV450">주문수정 저장</button><button class="btn btn-danger-soft" id="mDeleteV450">영구삭제</button></div>':'<p class="v450-readonly-note">전체주문이력의 과거 주문은 조회만 가능합니다.</p>'}`;if(editable){v450On('mSaveV450','click',saveOrderModalV450);v450On('mDeleteV450','click',deleteOrderModalV450)}v450OpenModal('orderModalV450')}
async function saveOrderModalV450(){const o=admin450.selectedOrder;if(!o)return;try{showLoading('주문을 수정하는 중입니다.');const r=await apiPost({action:'adminOrderUpdateV450',orderNumber:o.orderNumber,nickname:v450('mNickV450').value,receiverName:v450('mReceiverV450').value,phone:v450('mPhoneV450').value,address:v450('mAddressV450').value,zipcode:v450('mZipV450').value,shippingMemo:v450('mShippingMemoV450').value,paymentStatus:v450('mStatusV450').value,orderItems:v450('mItemsV450').value});alert(r.message||'수정했습니다.');v450CloseModal('orderModalV450');admin450.tabLoaded.orders=0;await loadAdminHomeV450(true);if(admin450.tab==='orders')await loadOrdersV450(true);if(admin450.tab==='cs')await loadCsSummaryV450()}catch(e){alert(e.message)}finally{hideLoading()}}
async function deleteOrderModalV450(){const o=admin450.selectedOrder;if(!o)return;if(!confirm('이 주문을 영구 삭제하면 복구할 수 없습니다. 재고는 복구됩니다. 정말 삭제할까요?'))return;try{showLoading('주문을 영구 삭제하는 중입니다.');const r=await apiPost({action:'adminOrderDeleteV450',orderNumber:o.orderNumber});alert(r.message||'삭제했습니다.');v450CloseModal('orderModalV450');admin450.tabLoaded.orders=0;await loadAdminHomeV450(true);if(admin450.tab==='orders')await loadOrdersV450(true);if(admin450.tab==='cs')await loadCsSummaryV450()}catch(e){alert(e.message)}finally{hideLoading()}}

async function downloadLotteExcelV450(){const start=v450('lotteStartDate').value,end=v450('lotteEndDate').value;if(!start||!end){alert('날짜를 선택해주세요.');return}try{showLoading('롯데택배 엑셀을 만드는 중입니다.');await ensureXlsxLibraryLoadedV4392();const d=await apiGet({action:'lotteOrders',startDate:start,endDate:end}),orders=d.orders||[];if(!orders.length)throw new Error('해당 기간 롯데택배 주문이 없습니다.');const headers=lotteExportHeadersV412(),rows=[];orders.forEach(o=>{const items=(o.items||[]).slice().sort((a,b)=>(Number(String(a.productNo).match(/\d+/)?.[0]||999999)-Number(String(b.productNo).match(/\d+/)?.[0]||999999)));chunkArrayV401(items,10).forEach((chunk,i)=>rows.push(buildLotte48RowV412(o,chunk,i)))});validateLotteRowsV412(rows,headers);const ws=XLSX.utils.json_to_sheet(rows,{header:headers}),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'롯데택배업로드');XLSX.writeFile(wb,`씬느샵_롯데택배_${lotteDateFileLabelV421(start,end)}.xlsx`);v450CloseModal('lotteDownloadModal')}catch(e){alert(e.message)}finally{hideLoading()}}
async function uploadLotteTrackingV450(event){const file=event.target.files&&event.target.files[0];if(!file)return;try{showLoading('송장결과 파일을 확인하는 중입니다.');await ensureXlsxLibraryLoadedV4392();const data=await file.arrayBuffer(),wb=XLSX.read(data,{type:'array'}),ws=wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_json(ws,{defval:'',raw:false});if(!rows.length)throw new Error('송장결과 데이터가 없습니다.');const headers=Object.keys(rows[0]||{});function key(cands){return headers.find(h=>cands.some(c=>String(h).replace(/\s/g,'').toLowerCase().includes(c)))||''}const kOrder=key(['주문번호','order']),kTrack=key(['송장번호','운송장','invoice','tracking']),kRecv=key(['받는사람','수령인','수취인']),kPhone=key(['전화번호1','전화번호','연락처','휴대폰']);if(!kTrack)throw new Error('송장번호 열을 찾지 못했습니다.');const mappings=rows.map(r=>({orderNumber:kOrder?r[kOrder]:'',trackingNumber:r[kTrack],receiverName:kRecv?r[kRecv]:'',phone:kPhone?r[kPhone]:''})).filter(x=>String(x.trackingNumber||'').trim());if(!mappings.length)throw new Error('송장번호가 있는 행이 없습니다.');let updated=0,unmatched=[],ambiguous=[];for(const chunk of chunkArrayV401(mappings,80)){const r=await apiGet({action:'applyLotteTrackingGet',mappings:JSON.stringify(chunk)});updated+=Number(r.updatedRows||0);unmatched=unmatched.concat(r.unmatched||[]);ambiguous=ambiguous.concat(r.ambiguous||[])}alert(`송장번호 연결 ${updated}건\n미일치 ${unmatched.length}건\n확인필요 ${ambiguous.length}건`+(unmatched.length||ambiguous.length?'\n\n미일치/복수매칭은 자동으로 붙이지 않았습니다.':''));await loadAdminHomeV450(true)}catch(e){alert(e.message)}finally{event.target.value='';hideLoading()}}

async function cancelLiveReservationV450(rowNumber,cancelToken){if(!rowNumber||!cancelToken)return;if(!confirm('이 예약상품을 삭제하면 즉시 예약이 취소되고 대기자가 승급할 수 있습니다. 삭제할까요?'))return;try{showLoading('예약상품을 취소하는 중입니다.');const r=await apiPost({action:'liveCancelReservationItem',rowNumber:rowNumber,cancelToken:cancelToken});alert(r.message||'예약상품을 취소했습니다.');await lookupLiveOrder()}catch(e){alert(e.message)}finally{hideLoading()}}
