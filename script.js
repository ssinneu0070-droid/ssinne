const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbycRpihssGhbRJR_1BNdB1fkDgovehoDrE9SPRPiRjmMmhI9Ut3wLA_zllFiymEXpQa/exec";

function searchAddress(){
  new daum.Postcode({
    oncomplete:function(data){
      document.getElementById('zipcode').value=data.zonecode;
      document.getElementById('address').value=data.address;
      document.getElementById('detailAddress').focus();
    }
  }).open();
}

window.addEventListener('DOMContentLoaded',function(){
  const saved=JSON.parse(localStorage.getItem('ssinne_customer')||'{}');
  if(saved.nickname){
    ['nickname','name','phone','zipcode','address','detailAddress'].forEach(id=>{if(document.getElementById(id))document.getElementById(id).value=saved[id]||'';});
  }
  applyProductFromUrl();
});

function applyProductFromUrl(){
  const p=new URLSearchParams(location.search);
  if(!p.get('productNo'))return;
  document.querySelector('.product-number').value=p.get('productNo')||'';
  document.querySelector('.product-color').value=p.get('color')||'';
  document.querySelector('.product-size').value=p.get('size')||'';
  const price=String(p.get('price')||'').replace(/[^0-9]/g,'');
  if(price)document.getElementById('payment').value=price;
}

document.getElementById('phone').addEventListener('input',function(e){
  let number=e.target.value.replace(/[^0-9]/g,'').slice(0,11);
  if(number.length<4)e.target.value=number;
  else if(number.length<8)e.target.value=number.slice(0,3)+'-'+number.slice(3);
  else e.target.value=number.slice(0,3)+'-'+number.slice(3,7)+'-'+number.slice(7,11);
});

function addProduct(){
  const div=document.createElement('div');
  div.className='product-item';
  div.innerHTML=`<input type="text" class="product-number" placeholder="상품번호 예 : 20"><input type="text" class="product-color" placeholder="색상 예 : 화이트"><input type="text" class="product-size" placeholder="사이즈 예 : 55 / FREE"><input type="number" class="product-qty" placeholder="수량" value="1" min="1"><button type="button" class="remove-product-btn" onclick="this.parentElement.remove()">삭제</button>`;
  document.getElementById('productList').appendChild(div);
}

function makeOrderItemsText(){
  const items=document.querySelectorAll('.product-item');
  const result=[];
  for(const item of items){
    const number=item.querySelector('.product-number').value.trim();
    const color=item.querySelector('.product-color').value.trim();
    const size=item.querySelector('.product-size').value.trim();
    const qty=item.querySelector('.product-qty').value.trim();
    if(!number){alert('상품번호를 입력해주세요');return false;}
    if(!color){alert('색상을 입력해주세요');return false;}
    if(!qty||Number(qty)<1){alert('수량을 입력해주세요');return false;}
    result.push(`${number}번 ${color} ${size} ${qty}개`);
  }
  document.getElementById('orderItems').value=result.join('\n');
  return true;
}

const form=document.getElementById('shippingForm');const submitBtn=document.querySelector('.submit-btn');let isSubmitting=false;
form.addEventListener('submit',async function(e){
  e.preventDefault();if(isSubmitting)return;
  try{
    if(!makeOrderItemsText())return;
    const data={nickname:val('nickname'),name:val('name'),phone:val('phone'),zipcode:val('zipcode'),address:val('address'),detailAddress:val('detailAddress'),memo:val('memo'),orderItems:val('orderItems'),payment:val('payment')};
    if(!data.nickname){alert('닉네임을 입력해주세요');return;}if(!data.name){alert('수령인 성함을 입력해주세요');return;}
    if(!/^010-[0-9]{4}-[0-9]{4}$/.test(data.phone)){alert('연락처를 정확히 입력해주세요');return;}
    if(!data.zipcode||!data.address){alert('주소 검색을 해주세요');return;}if(!data.orderItems){alert('구매내역을 입력해주세요');return;}if(!data.payment){alert('입금금액을 입력해주세요');return;}
    isSubmitting=true;submitBtn.disabled=true;submitBtn.innerText='주문 접수중...';
    localStorage.setItem('ssinne_customer',JSON.stringify({nickname:data.nickname,name:data.name,phone:data.phone,zipcode:data.zipcode,address:data.address,detailAddress:data.detailAddress}));
    const res=await fetch(SCRIPT_URL,{method:'POST',body:JSON.stringify(data)});
    const result=await res.json();
    if(!result.success)throw new Error(result.message||'저장 실패');
    form.style.display='none';document.getElementById('completePage').style.display='flex';window.scrollTo({top:0,behavior:'smooth'});
  }catch(error){console.error(error);alert('주문 접수 중 오류가 발생했습니다. Apps Script 배포를 확인해주세요.');}
  finally{isSubmitting=false;submitBtn.disabled=false;submitBtn.innerText='제출하기';}
});
function val(id){return document.getElementById(id).value.trim();}
