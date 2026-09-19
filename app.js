const API_URL=(window.SSINNE_CONFIG||{}).API_URL||'';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const state={catalog:[],cart:[],reservations:[],originalReservations:[],selectedNickname:'',liveSuggestions:[],directNickname:'',directSuggestions:[],config:{},pickedProduct:null,pickQty:1,submitToken:'',catalogRefreshing:false,lastOrderNo:''};
const money=n=>Number(n||0).toLocaleString('ko-KR')+'원';
const esc=s=>String(s==null?'':s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

async function api(action,p={}){
  if(!/^https:\/\/script\.google\.com\/macros\/s\//.test(API_URL)) throw new Error('config.js에 Apps Script /exec 주소를 먼저 입력해주세요.');
  let r;
  try{
    r=await fetch(API_URL+'?v='+Date.now(),{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action,...p})});
  }catch(err){
    console.error('API network error',err);
    throw new Error('서버 연결이 원활하지 않습니다. 잠시 후 상품정보 새로고침을 눌러 다시 시도해주세요.');
  }
  if(!r.ok) throw new Error('서버 연결 오류가 발생했습니다. ('+r.status+')');
  let j;
  try{j=JSON.parse(await r.text())}catch(err){throw new Error('서버 응답을 확인할 수 없습니다. 잠시 후 다시 시도해주세요.')}
  if(!j.success) throw new Error(j.error||'처리 중 오류가 발생했습니다.');
  return j;
}

function toast(m){const t=$('#toast');t.textContent=m;t.classList.remove('hidden');clearTimeout(toast._t);toast._t=setTimeout(()=>t.classList.add('hidden'),3000)}
function busy(on,m='처리 중입니다...'){$('#busy').classList.toggle('show',on);$('#busyText').textContent=m}
function show(id){
  $$('.screen').forEach(x=>x.classList.add('hidden'));
  $('#'+id).classList.remove('hidden');
  const homeLike=id==='homeScreen'||id==='completeScreen';
  $('#backBtn').classList.toggle('hidden',homeLike);
  $('#homeMenuBtn').classList.toggle('hidden',!homeLike);
  window.scrollTo({top:0,behavior:'smooth'});
}
function debounce(fn,ms){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}}

async function init(){
  $('#goLive').onclick=()=>show('liveScreen');
  $('#goDirect').onclick=async()=>{show('directScreen');try{await ensureCatalog()}catch(e){}restoreLocalShipping()};
  $('#backBtn').onclick=()=>show('homeScreen');
  $('#homeMenuBtn').onclick=()=>{if($('#completeScreen').classList.contains('hidden'))toast('주문조회는 오른쪽 주문조회 버튼을 이용해주세요.');else show('homeScreen')};
  $('#liveNick').addEventListener('input',debounce(searchLiveNick,220));
  $('#liveLoad').onclick=loadLiveOrder;
  $('#directNick').addEventListener('input',debounce(searchDirectNick,220));
  $('#directSearch').addEventListener('input',e=>{e.target.value=e.target.value.replace(/\D/g,'')});
  $('#directSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();searchDirectProduct()}});
  $('#directSearchBtn').onclick=searchDirectProduct;
  $('#directCatalogRefresh').onclick=()=>refreshCatalog('direct');
  $('#liveCatalogRefresh').onclick=()=>refreshCatalog('live');
  $('#directMinus').onclick=()=>{state.pickQty=Math.max(1,state.pickQty-1);$('#directQtyPick').textContent=state.pickQty};
  $('#directPlus').onclick=()=>{if(state.pickedProduct)state.pickQty=Math.min(Math.max(1,state.pickedProduct.available),state.pickQty+1);$('#directQtyPick').textContent=state.pickQty};
  $('#directAdd').onclick=addPickedProduct;
  $('#directColor').onchange=refreshDirectSizes;
  $('#directSize').onchange=refreshPickedProduct;
  $$('.simple-choice[data-pay-target]').forEach(b=>b.onclick=()=>selectPayment(b.dataset.payTarget,b.dataset.pay));
  $$('.simple-choice[data-ship-target]').forEach(b=>b.onclick=()=>selectShipping(b.dataset.shipTarget,b.dataset.ship));
  $('#directSubmit').onclick=()=>submitCheckout('direct');
  $('#liveSubmit').onclick=()=>submitCheckout('live');
  $('#completeCopy').onclick=copyOrderNo;
  ['directNick','directReceiver','directPhone','directAddress','directDetail','directMemo'].forEach(id=>$('#'+id).addEventListener('input',saveLocalShipping));
  await loadConfig();
}

async function loadConfig(){
  try{
    state.config=await api('public_config');
    ['directBankAccount','liveBankAccount'].forEach(id=>$('#'+id).textContent=state.config.bankAccount||'1002-5790-8378');
    ['directBankText','liveBankText'].forEach(id=>$('#'+id).textContent=(state.config.bankName||'토스뱅크')+' - '+(state.config.bankOwner||'신성은'));
  }catch(e){console.warn(e)}
}

async function fetchCatalogOnce(){const r=await api('catalog',{cacheBust:Date.now()});state.catalog=r.products||[];return state.catalog}
async function refreshCatalog(mode='',silent=false){
  if(state.catalogRefreshing)return state.catalog;
  state.catalogRefreshing=true;
  const buttons=['directCatalogRefresh','liveCatalogRefresh'].map(id=>$('#'+id)).filter(Boolean);
  buttons.forEach(b=>b.disabled=true);
  if(!silent)busy(true,'최신 상품정보를 불러오는 중입니다...');
  try{
    await fetchCatalogOnce();
    if(!silent)toast('최신 상품정보로 새로고침했습니다.');
    if(mode==='direct'&&$('#directSearch').value.trim())await searchDirectProduct(true);
    if(mode==='live'&&!$('#liveLoaded').classList.contains('hidden')){renderLiveItems();updateTotals('live')}
    return state.catalog;
  }catch(e){
    toast('상품정보를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.');
    throw e;
  }finally{
    state.catalogRefreshing=false;buttons.forEach(b=>b.disabled=false);if(!silent)busy(false);
  }
}
async function ensureCatalog(){
  if(state.catalog.length)return state.catalog;
  busy(true,'상품정보를 불러오는 중입니다...');
  try{
    try{return await fetchCatalogOnce()}catch(first){await new Promise(r=>setTimeout(r,350));return await fetchCatalogOnce()}
  }catch(e){toast('상품정보를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.');throw e}
  finally{busy(false)}
}

async function searchLiveNick(){
  const q=$('#liveNick').value.trim(),box=$('#nickSuggestions');box.innerHTML='';state.selectedNickname='';state.liveSuggestions=[];if(!q)return;
  try{const r=await api('nickname_suggestions',{nickname:q});state.liveSuggestions=r.suggestions||[];const exact=state.liveSuggestions.find(n=>n.toLowerCase()===q.toLowerCase());if(exact)state.selectedNickname=exact;state.liveSuggestions.forEach(n=>{const b=document.createElement('button');b.className='suggestion';b.type='button';b.textContent=n;b.onclick=()=>{state.selectedNickname=n;$('#liveNick').value=n;box.innerHTML=''};box.appendChild(b)})}catch(e){}
}
async function searchDirectNick(){
  const q=$('#directNick').value.trim(),box=$('#directNickSuggestions');box.innerHTML='';state.directNickname='';state.directSuggestions=[];if(!q)return;
  try{const r=await api('nickname_suggestions',{nickname:q});state.directSuggestions=r.suggestions||[];const exact=state.directSuggestions.find(n=>n.toLowerCase()===q.toLowerCase());if(exact)state.directNickname=exact;state.directSuggestions.forEach(n=>{const b=document.createElement('button');b.className='suggestion';b.type='button';b.textContent=n;b.onclick=()=>{state.directNickname=n;$('#directNick').value=n;box.innerHTML=''};box.appendChild(b)})}catch(e){}
}

async function loadLiveOrder(){
  const nickname=state.selectedNickname||$('#liveNick').value.trim(),phone=$('#livePhone').value.trim();
  if(!nickname||phone.replace(/\D/g,'').length<10)return toast('닉네임과 전체 연락처를 입력해주세요.');
  try{
    busy(true,'라이브 주문을 불러오고 있습니다...');
    const r=await api('live_lookup',{nickname,phone});
    state.selectedNickname=nickname;state.reservations=(r.reservations||[]).map(x=>({...x}));state.originalReservations=(r.reservations||[]).map(x=>({...x}));
    await ensureCatalog();
    $('#liveLoaded').classList.remove('hidden');$('#liveNick2').value=nickname;$('#livePhone2').value=phone;
    if(r.savedCustomer){$('#liveReceiver').value=r.savedCustomer.receiver||'';$('#liveZip').value=r.savedCustomer.zip||'';$('#liveAddress').value=r.savedCustomer.address||''}
    else{const local=getLocalShipping();if(local){$('#liveReceiver').value=local.receiver||'';$('#liveAddress').value=local.address||'';$('#liveDetail').value=local.detail||'';$('#liveMemo').value=local.memo||''}}
    renderLiveItems();updateTotals('live');
  }catch(e){toast(e.message)}finally{busy(false)}
}
function getLiveCart(){return state.reservations.map(r=>{const p=state.catalog.find(x=>String(x.no)===String(r.productNo)&&x.color===r.color&&x.size===r.size);return {...r,name:p?.name||'',price:p?.price||0}})}
function renderLiveItems(){
  $('#liveItems').innerHTML=state.reservations.map((x,i)=>{const p=state.catalog.find(p=>String(p.no)===String(x.productNo)&&p.color===x.color&&p.size===x.size);return `<div class="customer-item-line"><div class="item-main"><small>상품번호 ${esc(x.productNo)}</small><b>${esc(p?.name||x.productNo+'번 상품')}</b><span>칼라: ${esc(x.color)}　|　사이즈: ${esc(x.size)}　|　수량: ${x.qty}</span></div><strong>${money((p?.price||0)*x.qty)}</strong><button class="item-delete" type="button" onclick="removeLive(${i})">삭제</button></div>`}).join('')||'<div class="empty-list">불러온 예약상품이 없습니다.</div>';
}
window.removeLive=i=>{state.reservations.splice(i,1);renderLiveItems();updateTotals('live')};

async function searchDirectProduct(skipRetry=false){
  try{await ensureCatalog()}catch(e){return}
  const no=$('#directSearch').value.trim();if(!no)return toast('상품번호를 입력해주세요.');
  let opts=state.catalog.filter(p=>String(p.no)===no);
  if(!opts.length&&!skipRetry){try{await refreshCatalog('',true);opts=state.catalog.filter(p=>String(p.no)===no)}catch(e){}}
  if(!opts.length){$('#directProductBox').classList.add('hidden');return toast('상품정보를 찾지 못했습니다. 상품정보 새로고침 후 다시 시도해주세요.')}
  $('#directProductBox').classList.remove('hidden');$('#directProductName').value=opts[0].name;
  $('#directColor').innerHTML=[...new Set(opts.map(x=>x.color))].map(x=>`<option>${esc(x)}</option>`).join('');
  refreshDirectSizes();state.pickQty=1;$('#directQtyPick').textContent='1';
}
function refreshDirectSizes(){const no=$('#directSearch').value.trim(),color=$('#directColor').value,opts=state.catalog.filter(p=>String(p.no)===no&&p.color===color);$('#directSize').innerHTML=[...new Set(opts.map(x=>x.size))].map(x=>`<option>${esc(x)}</option>`).join('');refreshPickedProduct()}
function refreshPickedProduct(){const no=$('#directSearch').value.trim(),color=$('#directColor').value,size=$('#directSize').value;state.pickedProduct=state.catalog.find(p=>String(p.no)===no&&p.color===color&&p.size===size)||null;if(state.pickedProduct&&state.pickedProduct.available<=0)toast('현재 품절된 옵션입니다.')}
function addPickedProduct(){
  const p=state.pickedProduct;if(!p)return toast('상품을 먼저 검색해주세요.');if(p.available<=0)return toast('품절된 상품입니다.');
  let x=state.cart.find(x=>String(x.productNo)===String(p.no)&&x.color===p.color&&x.size===p.size);
  if(x){if(x.qty+state.pickQty>p.available)return toast('주문 가능한 재고를 초과했습니다.');x.qty+=state.pickQty}
  else state.cart.push({productNo:p.no,name:p.name,color:p.color,size:p.size,qty:state.pickQty,price:p.price,available:p.available});
  renderDirectCart();updateTotals('direct');toast('상품을 담았습니다.');
}
function renderDirectCart(){
  $('#directCart').innerHTML=state.cart.map((x,i)=>`<div class="customer-item-line"><div class="item-main"><small>상품번호 ${esc(x.productNo)}</small><b>${esc(x.name)}</b><span>칼라: ${esc(x.color)}　|　사이즈: ${esc(x.size)}　|　수량: ${x.qty}</span></div><strong>${money(x.price*x.qty)}</strong><button class="item-delete" type="button" onclick="removeDirect(${i})">⌫</button></div>`).join('')||'<div class="empty-list">상품을 검색해서 담아주세요.</div>';
}
window.removeDirect=i=>{state.cart.splice(i,1);renderDirectCart();updateTotals('direct')};

function selectPayment(mode,val){$('#'+mode+'Payment').value=val;$$(`[data-pay-target="${mode}"]`).forEach(b=>b.classList.toggle('active',b.dataset.pay===val));$$(`[data-pay-target="${mode}"]`).forEach(b=>{const s=b.querySelector('span');if(s)s.textContent=b.classList.contains('active')?'◉':'○'});updateTotals(mode)}
function selectShipping(mode,val){$('#'+mode+'ShippingType').value=val;$$(`[data-ship-target="${mode}"]`).forEach(b=>b.classList.toggle('active',b.dataset.ship===val));$$(`[data-ship-target="${mode}"]`).forEach(b=>{const s=b.querySelector('span');if(s)s.textContent=b.classList.contains('active')?'◉':'○'});updateTotals(mode)}
function getItems(mode){return mode==='live'?getLiveCart():state.cart}
function updateTotals(mode){const items=getItems(mode),subtotal=items.reduce((s,x)=>s+Number(x.price||0)*Number(x.qty||0),0),shipType=$('#'+mode+'ShippingType').value,shipping=subtotal>=200000?0:(shipType==='island'?7000:4000),payment=$('#'+mode+'Payment').value,base=subtotal+shipping,total=payment==='card'?Math.round(base*1.10):base;$('#'+mode+'Subtotal').textContent=money(subtotal);$('#'+mode+'Shipping').textContent=shipping===0?'무료배송':money(shipping);$('#'+mode+'Total').textContent=money(total)}

function valuesFor(mode){
  if(mode==='direct')return{nickname:state.directNickname||$('#directNick').value.trim(),receiver:$('#directReceiver').value.trim(),phone:$('#directPhone').value.trim(),zip:$('#directZip').value,address:$('#directAddress').value.trim(),detailAddress:$('#directDetail').value.trim(),memo:$('#directMemo').value.trim(),paymentMethod:$('#directPayment').value,shippingType:$('#directShippingType').value,items:state.cart};
  const choices=state.originalReservations.map(o=>{const c=state.reservations.find(x=>x.messageId===o.messageId);return{messageId:o.messageId,qty:c?c.qty:0}});
  return{nickname:state.selectedNickname||$('#liveNick').value.trim(),receiver:$('#liveReceiver').value.trim(),phone:$('#livePhone2').value.trim(),zip:$('#liveZip').value,address:$('#liveAddress').value.trim(),detailAddress:$('#liveDetail').value.trim(),memo:$('#liveMemo').value.trim(),paymentMethod:$('#livePayment').value,shippingType:$('#liveShippingType').value,items:state.reservations,reservationChoices:choices};
}
async function kickDeferredSync(r){
  if(!r?.deferredSync||!r?.orderNo||!r?.syncToken)return;
  // 주문완료 화면을 먼저 보여준 뒤 3PL/거래처발주/상품요약을 조용히 후속 처리합니다.
  // 이 요청이 실패해도 Apps Script 1분 트리거가 남은 작업을 자동 처리합니다.
  setTimeout(()=>api('post_submit_sync',{orderNo:r.orderNo,syncToken:r.syncToken}).catch(e=>console.warn('post submit sync pending',e)),80);
}
async function submitCheckout(mode){
  const d=valuesFor(mode);if(!d.nickname||!d.receiver||d.phone.replace(/\D/g,'').length<10||!d.address)return toast('배송지 정보를 모두 입력해주세요.');if(!d.items.length)return toast('주문상품이 없습니다.');
  saveLocalShipping(mode);if(!state.submitToken)state.submitToken=(crypto?.randomUUID?.()||Date.now()+'-'+Math.random());d.clientRequestId=state.submitToken;
  try{
    busy(true,'주문을 저장하고 있습니다… 잠시만 기다려주세요.');
    let r;
    try{r=await api('submit_order',d)}catch(first){
      const msg=String(first?.message||first);
      if(/주문이 몰리고|서버 연결이 원활하지|서버 연결 오류/.test(msg)){
        await new Promise(resolve=>setTimeout(resolve,650));
        r=await api('submit_order',d);
      }else throw first;
    }
    state.submitToken='';renderComplete(r);kickDeferredSync(r);
  }catch(e){toast(e.message)}finally{busy(false)}
}

function renderComplete(r){
  state.lastOrderNo=r.orderNo||'';show('completeScreen');
  $('#completeNo').textContent=r.orderNo||'';
  $('#completeCount').textContent=(r.items||[]).length;
  const info=[['▣','주문일시',r.orderDate],['●','주문자 닉네임',r.nickname],['●','수령인',r.receiver],['☎','연락처',r.phone],['⌖','배송지',r.address],['▤','배송메시지',r.memo||'-']];
  $('#completeInfo').innerHTML=info.map(x=>`<div class="complete-info-row"><span class="info-icon">${x[0]}</span><b>${x[1]}</b><em>${esc(x[2])}</em></div>`).join('');
  $('#completeItems').innerHTML=(r.items||[]).map(x=>`<div class="complete-item-line"><span>${esc(x)}</span></div>`).join('')||'<div class="empty-list">주문상품 정보가 없습니다.</div>';
  $('#completeTotal').textContent=money(r.total);
  $('#bandBtn').href=r.bandUrl||state.config.bandUrl||'https://www.band.us/band/102398891/post';
  $('#channelBtn').href=r.channelUrl||state.config.channelUrl||'http://pf.kakao.com/_YVncn';
}
async function copyOrderNo(){const no=state.lastOrderNo||$('#completeNo').textContent.trim();if(!no)return;try{await navigator.clipboard.writeText(no);toast('주문번호를 복사했습니다.')}catch(e){toast(no)}}
window.copyBank=async()=>{const a=state.config.bankAccount||'1002-5790-8378';try{await navigator.clipboard.writeText(a);toast('계좌번호를 복사했습니다.')}catch(e){toast(a)}};
window.openPostcode=mode=>{if(!window.daum?.Postcode)return toast('주소검색을 불러오지 못했습니다.');new daum.Postcode({oncomplete:data=>{const addr=data.roadAddress||data.jibunAddress;$('#'+mode+'Zip').value=data.zonecode;$('#'+mode+'Address').value=addr;$('#'+mode+'Detail').focus();saveLocalShipping(mode);updateTotals(mode)}}).open()};

function saveLocalShipping(mode='direct'){
  const pre=mode==='live'?'live':'direct';
  const v={nickname:$('#'+pre+'Nick'+(pre==='live'?'2':''))?.value||$('#liveNick')?.value||'',receiver:$('#'+pre+'Receiver')?.value||'',phone:$('#'+pre+'Phone'+(pre==='live'?'2':''))?.value||'',address:$('#'+pre+'Address')?.value||'',detail:$('#'+pre+'Detail')?.value||'',zip:$('#'+pre+'Zip')?.value||'',memo:$('#'+pre+'Memo')?.value||''};
  localStorage.setItem('ssinne_shipping',JSON.stringify(v));
}
function getLocalShipping(){try{return JSON.parse(localStorage.getItem('ssinne_shipping')||'null')}catch(e){return null}}
function restoreLocalShipping(){const v=getLocalShipping();if(!v)return;$('#directNick').value=v.nickname||'';$('#directReceiver').value=v.receiver||'';$('#directPhone').value=v.phone||'';$('#directAddress').value=v.address||'';$('#directDetail').value=v.detail||'';$('#directZip').value=v.zip||'';$('#directMemo').value=v.memo||''}

document.addEventListener('DOMContentLoaded',init);
