const SCRIPT_URL =
"https://script.google.com/macros/s/AKfycbz7tGx6lQ8rqHutyE16cRdbU1VbjfTnzESf7tUDqz-mYyhGYYTnFHsSVf9GaHUSqoGb2w/exec";

function searchAddress(){
  new daum.Postcode({
    oncomplete:function(data){
      document.getElementById('zipcode').value = data.zonecode;
      document.getElementById('address').value = data.address;
      document.getElementById('detailAddress').focus();
    }
  }).open();
}

document.getElementById('phone').addEventListener('input', function(e){
  let number = e.target.value.replace(/[^0-9]/g,'').slice(0,11);

  if(number.length < 4){
    e.target.value = number;
  }else if(number.length < 8){
    e.target.value = number.slice(0,3) + '-' + number.slice(3);
  }else{
    e.target.value =
      number.slice(0,3) + '-' +
      number.slice(3,7) + '-' +
      number.slice(7,11);
  }
});

const form = document.getElementById('shippingForm');
const submitBtn = document.querySelector('.submit-btn');
let isSubmitting = false;

form.addEventListener('submit', async function(e){

  e.preventDefault();

  if(isSubmitting) return;

  if(!document.getElementById('agree').checked){
    alert('안내사항 동의 체크 후 진행해주세요 💖');
    return;
  }

  const data = {
    nickname: document.getElementById('nickname').value.trim(),
    name: document.getElementById('name').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    zipcode: document.getElementById('zipcode').value.trim(),
    address: document.getElementById('address').value.trim(),
    detailAddress: document.getElementById('detailAddress').value.trim(),
    memo: document.getElementById('memo').value.trim(),
    orderItems: document.getElementById('orderItems').value.trim()
  };

  if(!data.nickname){ alert('닉네임을 입력해주세요'); return; }
  if(!data.name){ alert('수령인 성함을 입력해주세요'); return; }
  if(!/^010-[0-9]{4}-[0-9]{4}$/.test(data.phone)){
    alert('연락처를 정확히 입력해주세요');
    return;
  }
  if(!data.zipcode || !data.address){
    alert('주소 검색을 해주세요');
    return;
  }

  isSubmitting = true;
  submitBtn.disabled = true;
  submitBtn.innerText = '주문 접수중...';

  await fetch(SCRIPT_URL,{
    method:'POST',
    mode:'no-cors',
    body:JSON.stringify(data)
  });

  form.reset();
  document.getElementById('completePage').style.display = 'flex';

  isSubmitting = false;
  submitBtn.disabled = false;
  submitBtn.innerText = '제출하기';
});

document.getElementById('restartBtn').addEventListener('click', function(){
  location.reload();
});