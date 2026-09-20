const API_URL=(window.SSINNE_CONFIG||{}).API_URL||'';
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const state={catalog:[],cart:[],reservations:[],selectedNickname:'',liveSuggestions:[],config:{},pickedProduct:null,pickQty:1,livePicked:null,livePickQty:1,submitToken:'',catalogRefreshing:false,lastOrderNo:''};
const money=n=>Number(n||0).toLocaleString('ko-KR')+'원';
const esc=s=>String(s==null?'':s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const cleanNick=s=>String(s||'').replace(/@/g,'').trim();

async function api(action,p={}){
  if(!/^https:\/\/script\.google\.com\/macros\/s\//.test(API_URL))
    throw new Error('config.js에 Apps Script /exec 주소를 먼저 입력해주세요.');
  let r;
  try{
    r=await fetch(API_URL+'?v='+Date.now(),{
      method:'POST',
      headers:{'Content-Type':'text/plain'},
      body:JSON.stringify({action,...p})
    })
  }catch(e){
    throw new Error('서버 연결이 원활하지 않습니다. 잠시 후 상품정보 새로고침을 눌러 다시 시도해주세요.')
  }
  if(!r.ok)throw new Error('서버 연결 오류 ('+r.status+')');
  let j;
  try{j=JSON.parse(await r.text())}
  catch(e){throw new Error('서버 응답을 확인할 수 없습니다.')}
  if(!j.success)throw new Error(j.error||'처리 중 오류가 발생했습니다.');
  return j
}

function toast(m){
  const t=$('#toast');
  t.textContent=m;
  t.classList.remove('hidden');
  clearTimeout(toast.t);
  toast.t=setTimeout(()=>t.classList.add('hidden'),3000)
}

function busy(on,m='처리 중입니다...'){
  $('#busy').classList.toggle('show',on);
  $('#busyText').textContent=m
}

function show(id){
  $$('.screen').forEach(x=>x.classList.add('hidden'));
  $('#'+id).classList.remove('hidden');
  const home=id==='homeScreen'||id==='completeScreen';
  $('#backBtn').classList.toggle('hidden',home);
  $('#homeMenuBtn').classList.toggle('hidden',!home);
  scrollTo({top:0,behavior:'smooth'})
}

function debounce(fn,ms){
  let t;
  return(...a)=>{
    clearTimeout(t);
    t=setTimeout(()=>fn(...a),ms)
  }
}

async function loadConfig(){
  try{
    state.config=await api('public_config');
    ['directBankAccount','liveBankAccount'].forEach(id=>
      $('#'+id).textContent=state.config.bankAccount||'1002-5790-8378'
    );
    ['directBankText','liveBankText'].forEach(id=>
      $('#'+id).textContent=(state.config.bankName||'토스뱅크')+' - '+(state.config.bankOwner||'신성은')
    )
  }catch(e){}
}

async function fetchCatalog(){
  const r=await api('catalog',{cacheBust:Date.now()});
  state.catalog=r.products||[];
  return state.catalog
}

async function ensureCatalog(){
  if(state.catalog.length)return state.catalog;
  busy(true,'상품정보를 불러오는 중입니다...');
  try{
    try{
      return await fetchCatalog()
    }catch(e){
      await new Promise(r=>setTimeout(r,300));
      return await fetchCatalog()
    }
  }finally{
    busy(false)
  }
}

async function refreshCatalog(mode){
  if(state.catalogRefreshing)return;
  state.catalogRefreshing=true;

  ['directCatalogRefresh','liveCatalogRefresh','liveCatalogRefresh2'].forEach(id=>{
    if($('#'+id))$('#'+id).disabled=true
  });

  try{
    busy(true,'최신 상품정보를 불러오는 중입니다...');
    await fetchCatalog();
    toast('상품정보를 새로고침했습니다.');

    if(mode==='direct'&&$('#directSearch').value)
      searchDirectProduct(true);

    if(mode==='live'&&$('#liveManualSearch').value)
      searchLiveManualProduct(true)

  }catch(e){
    toast(e.message)
  }finally{
    busy(false);
    state.catalogRefreshing=false;

    ['directCatalogRefresh','liveCatalogRefresh','liveCatalogRefresh2'].forEach(id=>{
      if($('#'+id))$('#'+id).disabled=false
    })
  }
}

function sanitizeNickInput(el){
  const v=cleanNick(el.value);
  if(el.value!==v)el.value=v;
  return v
}

async function searchLiveNick(){
  const q=sanitizeNickInput($('#liveNick')),
        box=$('#nickSuggestions');

  box.innerHTML='';
  state.selectedNickname='';

  if(!q)return;

  try{
    const r=await api('nickname_suggestions',{nickname:q});
    state.liveSuggestions=r.suggestions||[];

    const exact=state.liveSuggestions.filter(
      n=>n.toLowerCase()===q.toLowerCase()
    );

    if(exact.length===1)state.selectedNickname=exact[0];

    state.liveSuggestions.forEach(n=>{
      const b=document.createElement('button');
      b.type='button';
      b.className='suggestion';
      b.textContent=n;

      b.onclick=()=>{
        state.selectedNickname=n;
        $('#liveNick').value=n;
        box.innerHTML=''
      };

      box.appendChild(b)
    })

  }catch(e){}
}

async function loadLiveOrder(){
  const nickname=state.selectedNickname||sanitizeNickInput($('#liveNick'));

  if(!nickname)return toast('닉네임을 입력해주세요.');

  try{
    busy(true,'댓글 주문을 불러오는 중입니다...');
    await ensureCatalog();

    const r=await api('live_lookup',{nickname});

    state.selectedNickname=nickname;
    state.reservations=(r.reservations||[]).map(x=>({...x}));

    $('#liveLoaded').classList.remove('hidden');
    $('#liveNick2').value=nickname;

    const local=getLocalShipping();

    if(local){
      $('#liveReceiver').value=local.receiver||'';
      $('#livePhone2').value=local.phone||'';
      $('#liveAddress').value=local.address||'';
      $('#liveDetail').value=local.detail||'';
      $('#liveZip').value=local.zip||'';
      $('#liveMemo').value=local.memo||''
    }

    renderLiveItems();
    updateTotals('live')

  }catch(e){
    toast(e.message)
  }finally{
    busy(false)
  }
}

function catalogItem(it){
  return state.catalog.find(
    p=>String(p.no)===String(it.productNo)&&
    p.color===it.color&&
    p.size===it.size
  )
}

function getLiveCart(){
  return state.reservations.map(r=>{
    const p=catalogItem(r);
    return{
      ...r,
      name:p?.name||'',
      price:p?.price||0
    }
  })
}

function renderLiveItems(){
  $('#liveItems').innerHTML=state.reservations.map((x,i)=>{
    const p=catalogItem(x);

    return `<div class="customer-item-line">
      <div class="item-main">
        <small>상품번호 ${esc(x.productNo)}</small>
        <b>${esc(p?.name||x.productNo+'번 상품')}</b>
        <span>칼라: ${esc(x.color)}　|　사이즈: ${esc(x.size)}　|　수량: ${x.qty}</span>
      </div>
      <strong>${money((p?.price||0)*x.qty)}</strong>
      <button class="item-delete" type="button" onclick="removeLive(${i})">삭제</button>
    </div>`
  }).join('')||
  '<div class="empty-list">불러온 댓글 주문이 없습니다. 아래에서 상품을 직접 추가할 수 있어요.</div>'
}

window.removeLive=i=>{
  state.reservations.splice(i,1);
  renderLiveItems();
  updateTotals('live')
};

function optionsForNo(no){
  return state.catalog.filter(p=>String(p.no)===String(no))
}

function fillProductPicker(prefix,no){
  const opts=optionsForNo(no);
  if(!opts.length)return false;

  const nameId=prefix==='direct'?'directProductName':'liveManualName',
        colorId=prefix==='direct'?'directColor':'liveManualColor';

  $('#'+nameId).value=opts[0].name;

  $('#'+colorId).innerHTML=[
    ...new Set(opts.map(x=>x.color))
  ].map(x=>`<option>${esc(x)}</option>`).join('');

  refreshPickerSizes(prefix,no);

  return true
}

/* ================================
   사이즈 선택 수정 부분
================================ */

function refreshPickerSizes(prefix,no){
  const colorId=prefix==='direct'?'directColor':'liveManualColor';
  const sizeId=prefix==='direct'?'directSize':'liveManualSize';

  const color=$('#'+colorId).value;
  const sizeEl=$('#'+sizeId);

  const previousSize=sizeEl.value;

  const opts=state.catalog.filter(
    p=>String(p.no)===String(no)&&p.color===color
  );

  const sizes=[...new Set(opts.map(x=>x.size))];

  sizeEl.innerHTML=sizes
    .map(x=>`<option>${esc(x)}</option>`)
    .join('');

  if(sizes.includes(previousSize)){
    sizeEl.value=previousSize;
  }

  updatePickedProduct(prefix,no);
}

function updatePickedProduct(prefix,no){
  const colorId=prefix==='direct'?'directColor':'liveManualColor';
  const sizeId=prefix==='direct'?'directSize':'liveManualSize';

  const color=$('#'+colorId).value;
  const size=$('#'+sizeId).value;

  const p=state.catalog.find(x=>
    String(x.no)===String(no)&&
    x.color===color&&
    x.size===size
  )||null;

  if(prefix==='direct'){
    state.pickedProduct=p;
  }else{
    state.livePicked=p;
  }
}

/* ================================ */

async function searchDirectProduct(skip){
  try{
    await ensureCatalog()
  }catch(e){
    return
  }

  const no=$('#directSearch').value.replace(/\D/g,'');

  $('#directSearch').value=no;

  if(!no)return toast('상품번호를 입력해주세요.');

  let ok=fillProductPicker('direct',no);

  if(!ok&&!skip){
    await refreshCatalog('');
    ok=fillProductPicker('direct',no)
  }

  if(!ok){
    $('#directProductBox').classList.add('hidden');
    return toast('상품정보를 찾지 못했습니다.')
  }

  $('#directProductBox').classList.remove('hidden');

  state.pickQty=1;
  $('#directQtyPick').textContent='1'
}

async function searchLiveManualProduct(skip){
  try{
    await ensureCatalog()
  }catch(e){
    return
  }

  const no=$('#liveManualSearch').value.replace(/\D/g,'');

  $('#liveManualSearch').value=no;

  if(!no)return toast('상품번호를 입력해주세요.');

  let ok=fillProductPicker('liveManual',no);

  if(!ok&&!skip){
    await refreshCatalog('');
    ok=fillProductPicker('liveManual',no)
  }

  if(!ok){
    $('#liveManualBox').classList.add('hidden');
    return toast('상품정보를 찾지 못했습니다.')
  }

  $('#liveManualBox').classList.remove('hidden');

  state.livePickQty=1;
  $('#liveManualQty').textContent='1'
}

function addPickedProduct(){
  const p=state.pickedProduct;

  if(!p)return toast('상품을 먼저 검색해주세요.');

  let x=state.cart.find(x=>
    String(x.productNo)===String(p.no)&&
    x.color===p.color&&
    x.size===p.size
  );

  if(x){
    x.qty+=state.pickQty
  }else{
    state.cart.push({
      productNo:p.no,
      name:p.name,
      color:p.color,
      size:p.size,
      qty:state.pickQty,
      price:p.price
    })
  }

  renderDirectCart();
  updateTotals('direct');
  toast('상품을 담았습니다.')
}

function addLivePicked(){
  const p=state.livePicked;

  if(!p)return toast('상품을 먼저 검색해주세요.');

  let x=state.reservations.find(x=>
    String(x.productNo)===String(p.no)&&
    x.color===p.color&&
    x.size===p.size
  );

  if(x){
    x.qty+=state.livePickQty
  }else{
    state.reservations.push({
      productNo:p.no,
      color:p.color,
      size:p.size,
      qty:state.livePickQty,
      messageId:''
    })
  }

  renderLiveItems();
  updateTotals('live');
  toast('주문에 추가했습니다.')
}

function renderDirectCart(){
  $('#directCart').innerHTML=state.cart.map((x,i)=>
    `<div class="customer-item-line">
      <div class="item-main">
        <small>상품번호 ${esc(x.productNo)}</small>
        <b>${esc(x.name)}</b>
        <span>칼라: ${esc(x.color)}　|　사이즈: ${esc(x.size)}　|　수량: ${x.qty}</span>
      </div>
      <strong>${money(x.price*x.qty)}</strong>
      <button class="item-delete" onclick="removeDirect(${i})">⌫</button>
    </div>`
  ).join('')||
  '<div class="empty-list">상품을 검색해서 담아주세요.</div>'
}

window.removeDirect=i=>{
  state.cart.splice(i,1);
  renderDirectCart();
  updateTotals('direct')
};

function selectPayment(mode,val){
  $('#'+mode+'Payment').value=val;

  $$(`[data-pay-target="${mode}"]`).forEach(b=>{
    b.classList.toggle('active',b.dataset.pay===val);

    const s=b.querySelector('span');

    if(s)
      s.textContent=b.classList.contains('active')?'◉':'○'
  });

  updateTotals(mode)
}

function selectShipping(mode,val){
  $('#'+mode+'ShippingType').value=val;

  $$(`[data-ship-target="${mode}"]`).forEach(b=>{
    b.classList.toggle('active',b.dataset.ship===val);

    const s=b.querySelector('span');

    if(s)
      s.textContent=b.classList.contains('active')?'◉':'○'
  });

  updateTotals(mode)
}

function getItems(mode){
  return mode==='live'?getLiveCart():state.cart
}

function updateTotals(mode){
  const subtotal=getItems(mode).reduce(
    (s,x)=>s+Number(x.price||0)*Number(x.qty||0),0
  );

  const ship=subtotal>=200000
    ?0
    :($('#'+mode+'ShippingType').value==='island'?7000:4000);

  const base=subtotal+ship;

  const total=$('#'+mode+'Payment').value==='card'
    ?Math.round(base*1.1)
    :base;

  $('#'+mode+'Subtotal').textContent=money(subtotal);
  $('#'+mode+'Shipping').textContent=ship?money(ship):'무료배송';
  $('#'+mode+'Total').textContent=money(total)
}

function valuesFor(mode){
  if(mode==='direct')
    return{
      orderSource:'직접입력',
      nickname:sanitizeNickInput($('#directNick')),
      receiver:$('#directReceiver').value.trim(),
      phone:$('#directPhone').value.trim(),
      zip:$('#directZip').value,
      address:$('#directAddress').value.trim(),
      detailAddress:$('#directDetail').value.trim(),
      memo:$('#directMemo').value.trim(),
      paymentMethod:$('#directPayment').value,
      shippingType:$('#directShippingType').value,
      items:state.cart
    };

  return{
    orderSource:'불러오기',
    nickname:cleanNick(state.selectedNickname||$('#liveNick').value),
    receiver:$('#liveReceiver').value.trim(),
    phone:$('#livePhone2').value.trim(),
    zip:$('#liveZip').value,
    address:$('#liveAddress').value.trim(),
    detailAddress:$('#liveDetail').value.trim(),
    memo:$('#liveMemo').value.trim(),
    paymentMethod:$('#livePayment').value,
    shippingType:$('#liveShippingType').value,
    items:state.reservations
  }
}

async function submitCheckout(mode){
  const d=valuesFor(mode);

  if(
    !d.nickname||
    !d.receiver||
    d.phone.replace(/\D/g,'').length<10||
    !d.address
  )
    return toast('배송지 정보를 모두 입력해주세요.');

  if(!d.items.length)
    return toast('주문상품이 없습니다.');

  saveLocalShipping(mode);

  if(!state.submitToken)
    state.submitToken=(
      crypto?.randomUUID?.()||
      Date.now()+'-'+Math.random()
    );

  d.clientRequestId=state.submitToken;

  try{
    busy(true,'주문을 저장하고 있습니다…');

    const r=await api('submit_order',d);

    state.submitToken='';

    renderComplete(r);

    setTimeout(
      ()=>api('post_submit_sync',{orderNo:r.orderNo}).catch(()=>{}),
      50
    )

  }catch(e){
    toast(e.message)
  }finally{
    busy(false)
  }
}

function renderComplete(r){
  state.lastOrderNo=r.orderNo||'';

  show('completeScreen');

  $('#completeNo').textContent=r.orderNo||'';
  $('#completeCount').textContent=(r.items||[]).length;

  const info=[
    ['▣','주문일시',r.orderDate],
    ['●','주문자 닉네임',r.nickname],
    ['●','수령인',r.receiver],
    ['☎','연락처',r.phone],
    ['⌖','배송지',r.address],
    ['▤','배송메시지',r.memo||'-']
  ];

  $('#completeInfo').innerHTML=info.map(x=>
    `<div class="complete-info-row">
      <span class="info-icon">${x[0]}</span>
      <b>${x[1]}</b>
      <em>${esc(x[2])}</em>
    </div>`
  ).join('');

  $('#completeItems').innerHTML=(r.items||[]).map(x=>
    `<div class="complete-item-line">
      <span>${esc(x)}</span>
    </div>`
  ).join('');

  $('#completeTotal').textContent=money(r.total);

  $('#bandBtn').href=r.bandUrl||state.config.bandUrl;
  $('#channelBtn').href=r.channelUrl||state.config.channelUrl
}

async function copyOrderNo(){
  const no=state.lastOrderNo||$('#completeNo').textContent.trim();

  try{
    await navigator.clipboard.writeText(no);
    toast('주문번호를 복사했습니다.')
  }catch(e){}
}

window.copyBank=async()=>{
  const a=state.config.bankAccount||'1002-5790-8378';

  try{
    await navigator.clipboard.writeText(a);
    toast('계좌번호를 복사했습니다.')
  }catch(e){
    toast(a)
  }
};

window.openPostcode=mode=>{
  if(!window.daum?.Postcode)
    return toast('주소검색을 불러오지 못했습니다.');

  new daum.Postcode({
    oncomplete:data=>{
      const addr=data.roadAddress||data.jibunAddress;

      $('#'+mode+'Zip').value=data.zonecode;
      $('#'+mode+'Address').value=addr;
      $('#'+mode+'Detail').focus();

      saveLocalShipping(mode)
    }
  }).open()
};

function saveLocalShipping(mode='direct'){
  const p=mode==='live'?'live':'direct';

  const v={
    nickname:p==='live'
      ?cleanNick($('#liveNick2').value)
      :sanitizeNickInput($('#directNick')),

    receiver:$('#'+p+'Receiver').value||'',

    phone:$('#'+p+'Phone'+(p==='live'?'2':'')).value||'',

    address:$('#'+p+'Address').value||'',

    detail:$('#'+p+'Detail').value||'',

    zip:$('#'+p+'Zip').value||'',

    memo:$('#'+p+'Memo').value||''
  };

  localStorage.setItem(
    'ssinne_shipping',
    JSON.stringify(v)
  )
}

function getLocalShipping(){
  try{
    return JSON.parse(
      localStorage.getItem('ssinne_shipping')||'null'
    )
  }catch(e){
    return null
  }
}

function restoreLocalShipping(){
  const v=getLocalShipping();

  if(!v)return;

  $('#directNick').value=cleanNick(v.nickname);
  $('#directReceiver').value=v.receiver||'';
  $('#directPhone').value=v.phone||'';
  $('#directAddress').value=v.address||'';
  $('#directDetail').value=v.detail||'';
  $('#directZip').value=v.zip||'';
  $('#directMemo').value=v.memo||''
}

async function init(){

  $('#goLive').onclick=async()=>{
    show('liveScreen');
    try{
      await ensureCatalog()
    }catch(e){}
  };

  $('#goDirect').onclick=async()=>{
    show('directScreen');
    try{
      await ensureCatalog()
    }catch(e){}
    restoreLocalShipping()
  };

  $('#backBtn').onclick=()=>show('homeScreen');

  $('#liveNick').addEventListener(
    'input',
    debounce(searchLiveNick,220)
  );

  $('#liveNick').addEventListener(
    'paste',
    ()=>setTimeout(()=>sanitizeNickInput($('#liveNick')),0)
  );

  $('#liveLoad').onclick=loadLiveOrder;

  $('#directNick').addEventListener(
    'input',
    e=>sanitizeNickInput(e.target)
  );

  $('#directNick').addEventListener(
    'paste',
    ()=>setTimeout(()=>sanitizeNickInput($('#directNick')),0)
  );

  $('#directSearch').addEventListener(
    'input',
    e=>e.target.value=e.target.value.replace(/\D/g,'')
  );

  $('#directSearchBtn').onclick=
    ()=>searchDirectProduct(false);

  $('#directSearch').addEventListener(
    'keydown',
    e=>{
      if(e.key==='Enter'){
        e.preventDefault();
        searchDirectProduct(false)
      }
    }
  );

  $('#directCatalogRefresh').onclick=
    ()=>refreshCatalog('direct');

  $('#liveCatalogRefresh').onclick=
    ()=>refreshCatalog('live');

  $('#liveCatalogRefresh2').onclick=
    ()=>refreshCatalog('live');

  /* 직접 주문 - 색상 변경 */
  $('#directColor').onchange=()=>
    refreshPickerSizes(
      'direct',
      $('#directSearch').value
    );

  /* 직접 주문 - 사이즈 변경 */
  $('#directSize').onchange=()=>
    updatePickedProduct(
      'direct',
      $('#directSearch').value
    );

  $('#directMinus').onclick=()=>{
    state.pickQty=Math.max(1,state.pickQty-1);
    $('#directQtyPick').textContent=state.pickQty
  };

  $('#directPlus').onclick=()=>{
    state.pickQty++;
    $('#directQtyPick').textContent=state.pickQty
  };

  $('#directAdd').onclick=addPickedProduct;

  $('#liveManualSearch').addEventListener(
    'input',
    e=>e.target.value=e.target.value.replace(/\D/g,'')
  );

  $('#liveManualSearchBtn').onclick=
    ()=>searchLiveManualProduct(false);

  /* 라이브 주문 - 색상 변경 */
  $('#liveManualColor').onchange=()=>
    refreshPickerSizes(
      'liveManual',
      $('#liveManualSearch').value
    );

  /* 라이브 주문 - 사이즈 변경 */
  $('#liveManualSize').onchange=()=>
    updatePickedProduct(
      'liveManual',
      $('#liveManualSearch').value
    );

  $('#liveManualMinus').onclick=()=>{
    state.livePickQty=Math.max(1,state.livePickQty-1);
    $('#liveManualQty').textContent=state.livePickQty
  };

  $('#liveManualPlus').onclick=()=>{
    state.livePickQty++;
    $('#liveManualQty').textContent=state.livePickQty
  };

  $('#liveManualAdd').onclick=addLivePicked;

  $$('.simple-choice[data-pay-target]').forEach(
    b=>b.onclick=()=>
      selectPayment(
        b.dataset.payTarget,
        b.dataset.pay
      )
  );

  $$('.simple-choice[data-ship-target]').forEach(
    b=>b.onclick=()=>
      selectShipping(
        b.dataset.shipTarget,
        b.dataset.ship
      )
  );

  $('#directSubmit').onclick=
    ()=>submitCheckout('direct');

  $('#liveSubmit').onclick=
    ()=>submitCheckout('live');

  $('#completeCopy').onclick=copyOrderNo;

  await loadConfig()
}

document.addEventListener('DOMContentLoaded',init);
