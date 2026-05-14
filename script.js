function searchAddress(){

    new daum.Postcode({

        oncomplete: function(data){

            document.getElementById('zipcode').value =
                data.zonecode;

            document.getElementById('address').value =
                data.address;

            document.getElementById('detailAddress')
                .focus();

        }

    }).open();

}

const SCRIPT_URL ="https://script.google.com/macros/s/AKfycbyHvO3uGfP35r_XrEuJYT7MHAEtURTVKIVzgWi3JII8cqUqMftd4Bxk6l08KrnjiK9VZA/exec";


const phoneInput =
document.getElementById('phone');

phoneInput.addEventListener('input', function(e){

    let number = e.target.value
        .replace(/[^0-9]/g,'');

    if(number.length > 11){

        number = number.slice(0,11);

    }

    if(number.length < 4){

        e.target.value = number;

    }else if(number.length < 8){

        e.target.value =
            number.slice(0,3)
            + '-'
            + number.slice(3);

    }else{

        e.target.value =
            number.slice(0,3)
            + '-'
            + number.slice(3,7)
            + '-'
            + number.slice(7,11);

    }

});

const form =
document.getElementById('shippingForm');

const submitBtn =
document.querySelector('.submit-btn');

let isSubmitting = false;

form.addEventListener('submit', async function(e){

    e.preventDefault();

    if(isSubmitting){

        return;

    }

    const nickname =
        document.getElementById('nickname').value.trim();

    const name =
        document.getElementById('name').value.trim();

    const phone =
        document.getElementById('phone').value.trim();

    const zipcode =
        document.getElementById('zipcode').value.trim();

    const address =
        document.getElementById('address').value.trim();

    const detailAddress =
        document.getElementById('detailAddress').value.trim();

    const memo =
        document.getElementById('memo')?.value || '';

    const orderItems =
        document.getElementById('orderItems')?.value || '';

        const agree =
document.getElementById('agree');

if(!agree.checked){

    alert(
        '안내사항 동의 체크 후 진행해주세요 💖'
    );

    return;

}
    if(!nickname){

        alert('닉네임을 입력해주세요');

        return;

    }

    if(!name){

        alert('수령인 성함을 입력해주세요');

        return;

    }

    const phoneRegex =
        /^010-[0-9]{4}-[0-9]{4}$/;

    if(!phoneRegex.test(phone)){

        alert(
            '연락처를 정확히 입력해주세요'
        );

        return;

    }

    if(!zipcode){

        alert('우편번호를 입력해주세요');

        return;

    }

    if(!address){

        alert('주소를 입력해주세요');

        return;

    }

    isSubmitting = true;

    submitBtn.disabled = true;

    submitBtn.innerText =
        '주문 접수중...';

    const data = {

        nickname,
        name,
        phone,
        zipcode,
        address,
        detailAddress,
        memo,
        orderItems

    };

    try{

        await fetch(SCRIPT_URL, {

            method:'POST',

            body: JSON.stringify(data)

        });

        alert(
            '씬느샵 주문이 접수되었습니다 💖'
        );

        form.reset();

        document.getElementById(
    'completePage'
).style.display = 'flex';

    }catch(error){

        alert('오류가 발생했습니다');

        console.log(error);

    }

    isSubmitting = false;

    submitBtn.disabled = false;

    submitBtn.innerText =
        '제출하기';

});document.getElementById('restartBtn')
.addEventListener('click', function(){

    window.location.href = window.location.pathname;

});document.getElementById('restartBtn').onclick = function(){
    location.reload();
};