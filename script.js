/*
  씬느샵 공통 설정
  아래 3개 주소만 실제 주소로 바꾸세요.
*/
const CONFIG = {
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbyLgTXCFDuCkDSS_bv-Jx0f2wa0CD0Y4la7qUw12IoE4V0-lZoliTbmxNw1vxRynytiHg/exec",
  BAND_URL: "https://www.band.us/band/102398891/post",
  CHANNEL_URL: "https://pf.kakao.com/_YVncn"
};

const CUSTOMER_STORAGE_KEY = "ssinne_customer_info_v2";

document.addEventListener("DOMContentLoaded", function () {
  const page = document.body.dataset.page;

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

  const response = await fetch(CONFIG.SCRIPT_URL + "?" + query.toString(), {
    method: "GET",
    cache: "no-store",
    redirect: "follow"
  });

  if (!response.ok) {
    throw new Error("서버 요청 실패: " + response.status);
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

  const response = await fetch(CONFIG.SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify(payload),
    redirect: "follow"
  });

  if (!response.ok) {
    throw new Error("서버 요청 실패: " + response.status);
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
let orderProducts = [];
let orderProductCardCount = 0;
let orderSubmitting = false;

async function initOrderPage() {
  document.getElementById("bandLink").href = CONFIG.BAND_URL;
  document.getElementById("channelLink").href = CONFIG.CHANNEL_URL;

  document.getElementById("phone").addEventListener("input", formatPhoneInput);
  document.getElementById("addressSearchButton").addEventListener("click", openAddressSearch);
  document.getElementById("addProductButton").addEventListener("click", addOrderProductCard);
  document.getElementById("refreshProductButton").addEventListener("click", function () {
    loadOrderProducts(true);
  });
  document.getElementById("clearCustomerButton").addEventListener("click", clearSavedCustomer);
  document.getElementById("finishOrderButton").addEventListener("click", finishOrder);
  document.getElementById("orderForm").addEventListener("submit", submitOrder);

  loadSavedCustomer();
  addOrderProductCard();

  try {
    await loadOrderProducts(false);
  } catch (error) {
    alert(error.message);
  }
}

async function loadOrderProducts(showMessage) {
  const data = await apiGet({ action: "products" });
  orderProducts = Array.isArray(data.products) ? data.products : [];

  if (!orderProducts.length) {
    throw new Error("상품정보 시트에 등록된 상품이 없습니다.");
  }

  if (showMessage) alert("상품정보를 새로 불러왔습니다.");
}

function addOrderProductCard() {
  orderProductCardCount += 1;

  const cardId = orderProductCardCount;
  const card = document.createElement("div");

  card.className = "product-card";
  card.dataset.cardId = String(cardId);
  card.dataset.price = "0";
  card.dataset.total = "0";
  card.dataset.checked = "false";

  card.innerHTML = `
    <div class="product-card-title">상품 ${cardId}</div>
    <div class="product-grid">
      <div class="field full">
        <label>상품번호 <span class="required">*</span></label>
        <div class="product-number-row">
          <input class="product-no" type="text" inputmode="numeric"
                 maxlength="3" placeholder="예: 12" required>
          <button type="button" class="button primary product-check-button">상품 확인</button>
        </div>
        <div class="product-message">상품번호 입력 후 상품 확인을 눌러주세요.</div>
      </div>

      <div class="field">
        <label>칼라 <span class="required">*</span></label>
        <select class="product-color" disabled required>
          <option value="">상품 확인 후 선택</option>
        </select>
      </div>

      <div class="field">
        <label>사이즈 <span class="required">*</span></label>
        <select class="product-size" disabled required>
          <option value="">칼라 선택 후 선택</option>
        </select>
      </div>

      <div class="field">
        <label>수량 <span class="required">*</span></label>
        <div class="quantity-control">
          <button type="button" class="minus-button">−</button>
          <input class="product-quantity" type="number" value="1" min="1" max="99" required>
          <button type="button" class="plus-button">＋</button>
        </div>
      </div>

      <div class="field">
        <label>금액</label>
        <div class="price-box">
          <div class="price-row">
            <span>판매가</span>
            <strong class="unit-price">0원</strong>
          </div>
          <div class="price-row">
            <span>상품 합계</span>
            <strong class="item-total">0원</strong>
          </div>
        </div>
      </div>
    </div>

    ${cardId > 1 ? '<button type="button" class="remove-button">이 상품 삭제</button>' : ""}
  `;

  document.getElementById("productList").appendChild(card);

  const numberInput = card.querySelector(".product-no");

  numberInput.addEventListener("input", function () {
    numberInput.value = numberInput.value.replace(/[^0-9]/g, "");
    resetOrderProductCard(card);
  });

  numberInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      checkOrderProduct(card);
    }
  });

  card.querySelector(".product-check-button").addEventListener("click", function () {
    checkOrderProduct(card);
  });

  card.querySelector(".product-color").addEventListener("change", function () {
    changeOrderColor(card);
  });

  card.querySelector(".product-size").addEventListener("change", function () {
    calculateOrderProduct(card);
  });

  card.querySelector(".product-quantity").addEventListener("input", function () {
    calculateOrderProduct(card);
  });

  card.querySelector(".minus-button").addEventListener("click", function () {
    changeOrderQuantity(card, -1);
  });

  card.querySelector(".plus-button").addEventListener("click", function () {
    changeOrderQuantity(card, 1);
  });

  const removeButton = card.querySelector(".remove-button");

  if (removeButton) {
    removeButton.addEventListener("click", function () {
      card.remove();
      calculateOrderGrandTotal();
    });
  }
}

function resetOrderProductCard(card) {
  card.dataset.checked = "false";
  card.dataset.price = "0";
  card.dataset.total = "0";

  const color = card.querySelector(".product-color");
  const size = card.querySelector(".product-size");
  const message = card.querySelector(".product-message");

  color.disabled = true;
  size.disabled = true;
  color.innerHTML = '<option value="">상품 확인 후 선택</option>';
  size.innerHTML = '<option value="">칼라 선택 후 선택</option>';

  card.querySelector(".unit-price").textContent = "0원";
  card.querySelector(".item-total").textContent = "0원";

  message.className = "product-message";
  message.textContent = "상품번호 입력 후 상품 확인을 눌러주세요.";

  calculateOrderGrandTotal();
}

function checkOrderProduct(card) {
  const productNo = card.querySelector(".product-no").value.trim();
  const message = card.querySelector(".product-message");
  const colorSelect = card.querySelector(".product-color");
  const sizeSelect = card.querySelector(".product-size");

  if (!productNo) {
    message.className = "product-message error";
    message.textContent = "상품번호를 입력해주세요.";
    return;
  }

  const product = orderProducts.find(function (item) {
    return String(item.productNo) === productNo;
  });

  if (!product) {
    resetOrderProductCard(card);
    message.className = "product-message error";
    message.textContent = "등록되지 않은 상품번호입니다.";
    return;
  }

  card.dataset.checked = "true";
  card.dataset.price = String(Number(product.price || 0));

  colorSelect.disabled = false;
  colorSelect.innerHTML = '<option value="">칼라를 선택하세요</option>';

  Object.keys(product.colors || {}).forEach(function (color) {
    const option = document.createElement("option");
    option.value = color;
    option.textContent = color;
    colorSelect.appendChild(option);
  });

  sizeSelect.disabled = true;
  sizeSelect.innerHTML = '<option value="">칼라 선택 후 선택</option>';

  message.className = "product-message success";
  message.textContent = "상품이 확인되었습니다.";

  calculateOrderProduct(card);
}

function changeOrderColor(card) {
  const productNo = card.querySelector(".product-no").value.trim();
  const color = card.querySelector(".product-color").value;
  const sizeSelect = card.querySelector(".product-size");

  const product = orderProducts.find(function (item) {
    return String(item.productNo) === productNo;
  });

  sizeSelect.innerHTML = '<option value="">사이즈를 선택하세요</option>';

  if (!product || !color || !product.colors[color]) {
    sizeSelect.disabled = true;
    return;
  }

  product.colors[color].forEach(function (size) {
    const option = document.createElement("option");
    option.value = size;
    option.textContent = size;
    sizeSelect.appendChild(option);
  });

  sizeSelect.disabled = false;
}

function changeOrderQuantity(card, amount) {
  const input = card.querySelector(".product-quantity");
  let quantity = Number(input.value || 1) + amount;

  quantity = Math.min(99, Math.max(1, quantity));
  input.value = quantity;

  calculateOrderProduct(card);
}

function calculateOrderProduct(card) {
  const price = Number(card.dataset.price || 0);
  let quantity = Number(card.querySelector(".product-quantity").value || 1);

  quantity = Math.min(99, Math.max(1, quantity));

  card.querySelector(".product-quantity").value = quantity;
  card.dataset.total = String(price * quantity);

  card.querySelector(".unit-price").textContent = money(price);
  card.querySelector(".item-total").textContent = money(price * quantity);

  calculateOrderGrandTotal();
}

function calculateOrderGrandTotal() {
  let total = 0;

  document.querySelectorAll(".product-card").forEach(function (card) {
    total += Number(card.dataset.total || 0);
  });

  document.getElementById("grandTotal").textContent = money(total);
}

function collectOrderProducts() {
  const products = [];

  document.querySelectorAll(".product-card").forEach(function (card) {
    const productNo = card.querySelector(".product-no").value.trim();
    const color = card.querySelector(".product-color").value;
    const size = card.querySelector(".product-size").value;
    const quantity = Number(card.querySelector(".product-quantity").value || 1);

    if (!productNo) throw new Error("상품번호를 입력해주세요.");
    if (card.dataset.checked !== "true") {
      throw new Error(productNo + "번 상품의 상품 확인을 눌러주세요.");
    }
    if (!color) throw new Error(productNo + "번 상품의 칼라를 선택해주세요.");
    if (!size) throw new Error(productNo + "번 상품의 사이즈를 선택해주세요.");

    products.push({
      productNo: productNo,
      color: color,
      size: size,
      quantity: quantity
    });
  });

  return products;
}

async function submitOrder(event) {
  event.preventDefault();

  if (orderSubmitting) return;

  try {
    const payload = {
      action: "saveOrder",
      nickname: document.getElementById("nickname").value.trim(),
      receiverName: document.getElementById("receiverName").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      zipcode: document.getElementById("zipcode").value.trim(),
      address: document.getElementById("address").value.trim(),
      detailAddress: document.getElementById("detailAddress").value.trim(),
      shippingMemo: document.getElementById("shippingMemo").value.trim(),
      products: collectOrderProducts()
    };

    if (!payload.nickname || !payload.receiverName) {
      throw new Error("닉네임과 수령인 성함을 입력해주세요.");
    }

    if (payload.phone.replace(/[^0-9]/g, "").length < 10) {
      throw new Error("연락처를 정확하게 입력해주세요.");
    }

    if (!payload.zipcode || !payload.address || !payload.detailAddress) {
      throw new Error("주소와 상세주소를 입력해주세요.");
    }

    orderSubmitting = true;
    showLoading("주문서를 저장하고 있습니다.");
    document.getElementById("submitButton").disabled = true;

    const result = await apiPost(payload);

    saveCustomerInfo();

    document.getElementById("orderForm").style.display = "none";
    document.getElementById("completePaymentAmount").textContent =
      money(result.paymentAmount || 0);
    document.getElementById("completeScreen").classList.add("show");

    window.scrollTo({ top: 0, behavior: "smooth" });

  } catch (error) {
    alert(error.message);

  } finally {
    orderSubmitting = false;
    hideLoading();
    document.getElementById("submitButton").disabled = false;
  }
}

function saveCustomerInfo() {
  const info = {
    nickname: document.getElementById("nickname").value.trim(),
    receiverName: document.getElementById("receiverName").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    zipcode: document.getElementById("zipcode").value.trim(),
    address: document.getElementById("address").value.trim(),
    detailAddress: document.getElementById("detailAddress").value.trim(),
    shippingMemo: document.getElementById("shippingMemo").value.trim()
  };

  localStorage.setItem(CUSTOMER_STORAGE_KEY, JSON.stringify(info));
}

function loadSavedCustomer() {
  try {
    const raw = localStorage.getItem(CUSTOMER_STORAGE_KEY);
    if (!raw) return;

    const info = JSON.parse(raw);

    Object.keys(info).forEach(function (key) {
      const element = document.getElementById(key);
      if (element) element.value = info[key] || "";
    });

    if (info.nickname || info.phone) {
      document.getElementById("savedNotice").classList.add("show");
    }
  } catch (error) {
    console.error(error);
  }
}

function clearSavedCustomer() {
  if (!confirm("저장된 고객정보를 지울까요?")) return;

  localStorage.removeItem(CUSTOMER_STORAGE_KEY);

  ["nickname","receiverName","phone","zipcode","address","detailAddress","shippingMemo"]
    .forEach(function (id) {
      document.getElementById(id).value = "";
    });

  document.getElementById("savedNotice").classList.remove("show");
}

function finishOrder() {
  document.getElementById("completeScreen").classList.remove("show");
  document.getElementById("orderForm").style.display = "block";
  document.getElementById("productList").innerHTML = "";

  orderProductCardCount = 0;
  addOrderProductCard();
  calculateOrderGrandTotal();
  loadSavedCustomer();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function formatPhoneInput(event) {
  let number = event.target.value.replace(/[^0-9]/g, "").slice(0, 11);

  if (number.length <= 3) {
    event.target.value = number;
  } else if (number.length <= 7) {
    event.target.value = number.slice(0, 3) + "-" + number.slice(3);
  } else {
    event.target.value =
      number.slice(0, 3) + "-" +
      number.slice(3, 7) + "-" +
      number.slice(7);
  }
}

function openAddressSearch() {
  if (!window.daum || !window.daum.Postcode) {
    alert("주소검색 프로그램을 불러오지 못했습니다.");
    return;
  }

  new window.daum.Postcode({
    oncomplete: function (data) {
      document.getElementById("zipcode").value = data.zonecode || "";
      document.getElementById("address").value =
        data.userSelectedType === "R"
          ? (data.roadAddress || "")
          : (data.jibunAddress || "");

      document.getElementById("detailAddress").value = "";
      document.getElementById("detailAddress").focus();
    }
  }).open();
}

/* =========================
   관리자
========================= */
let adminOrders = [];
let adminProducts = [];

function initAdminPage() {
  document.querySelectorAll(".tab-button[data-tab]").forEach(function (button) {
    button.addEventListener("click", function () {
      showAdminTab(button.dataset.tab);
    });
  });

  document.getElementById("searchOrdersButton").addEventListener("click", searchAdminOrders);
  document.getElementById("todayOrdersButton").addEventListener("click", loadTodayAdminOrders);
  document.getElementById("allOrdersButton").addEventListener("click", loadAllAdminOrders);
  document.getElementById("rebuildButton").addEventListener("click", rebuildDerivedSheets);

  document.getElementById("adminProductNo").addEventListener("input", function (event) {
    event.target.value = event.target.value.replace(/[^0-9]/g, "");
  });

  document.getElementById("saveProductButton").addEventListener("click", saveAdminProduct);
  document.getElementById("resetProductButton").addEventListener("click", resetAdminProductForm);
  document.getElementById("reloadProductsButton").addEventListener("click", loadAdminProducts);
  document.getElementById("productKeyword").addEventListener("input", renderAdminProducts);

  loadTodayAdminOrders();
}

function showAdminTab(tabName) {
  document.querySelectorAll(".tab-button[data-tab]").forEach(function (button) {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });

  document.getElementById("ordersTab").classList.toggle("active", tabName === "orders");
  document.getElementById("productsTab").classList.toggle("active", tabName === "products");

  if (tabName === "products" && adminProducts.length === 0) {
    loadAdminProducts();
  }
}

async function searchAdminOrders() {
  const params = {
    action: "adminOrders",
    startDate: document.getElementById("startDate").value,
    endDate: document.getElementById("endDate").value,
    search: document.getElementById("orderKeyword").value.trim()
  };

  showLoading("주문을 불러오는 중입니다.");

  try {
    const data = await apiGet(params);
    adminOrders = Array.isArray(data.orders) ? data.orders : [];
    renderAdminOrders();
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

  document.getElementById("summaryOrderCount").textContent = adminOrders.length;
  document.getElementById("summaryPaidCount").textContent =
    adminOrders.filter(function (order) {
      return order.paymentStatus === "입금완료";
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
    return `
      <tr>
        <td data-label="주문일">${escapeHtml(order.orderDate)}</td>
        <td data-label="입금금액">${money(order.paymentAmount)}</td>
        <td data-label="입금상태">
          <select class="status-select" data-row="${order.rowNumber}">
            <option value="미입금" ${order.paymentStatus === "미입금" ? "selected" : ""}>미입금</option>
            <option value="입금완료" ${order.paymentStatus === "입금완료" ? "selected" : ""}>입금완료</option>
            <option value="환불" ${order.paymentStatus === "환불" ? "selected" : ""}>환불</option>
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
      </tr>
    `;
  }).join("");

  tbody.querySelectorAll(".status-select").forEach(function (select) {
    select.addEventListener("change", function () {
      updateAdminPaymentStatus(Number(select.dataset.row), select.value);
    });
  });
}

async function updateAdminPaymentStatus(rowNumber, paymentStatus) {
  showLoading("입금상태를 변경하는 중입니다.");

  try {
    await apiPost({
      action: "updatePaymentStatus",
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
  showLoading("상품정보를 불러오는 중입니다.");

  try {
    const data = await apiGet({ action: "adminProducts" });
    adminProducts = Array.isArray(data.products) ? data.products : [];
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
    return `
      <article class="order-result-card">
        <h3>${escapeHtml(order.orderDate)} 주문</h3>

        <div class="order-result-meta">
          <div><strong>입금금액</strong><br>${money(order.paymentAmount)}</div>
          <div><strong>입금상태</strong><br>${escapeHtml(order.paymentStatus)}</div>
          <div><strong>닉네임</strong><br>${escapeHtml(order.nickname)}</div>
          <div><strong>내품수량</strong><br>${escapeHtml(order.itemQuantity)}개</div>
        </div>

        <div class="order-result-items">${escapeHtml(order.orderItems)}</div>
      </article>
    `;
  }).join("");
}
