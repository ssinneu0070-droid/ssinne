<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>씬느샵 CS 관리</title>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
}

body {
  background: #f5f7fb;
  color: #111827;
  padding: 16px;
}

.header {
  margin-bottom: 20px;
}

.header h1 {
  font-size: 26px;
  margin-bottom: 6px;
}

.header p {
  color: #6b7280;
  font-size: 14px;
}

.cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 18px;
}

.card {
  background: white;
  border-radius: 14px;
  padding: 18px;
  box-shadow: 0 3px 10px rgba(0,0,0,0.06);
}

.card-title {
  font-size: 14px;
  font-weight: bold;
  margin-bottom: 8px;
}

.card-number {
  font-size: 28px;
  font-weight: bold;
}

.blue { color: #2563eb; }
.orange { color: #f59e0b; }
.green { color: #16a34a; }
.purple { color: #7c3aed; }

.search-box {
  background: white;
  border-radius: 14px;
  padding: 14px;
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 10px;
  margin-bottom: 18px;
}

input, select, textarea {
  width: 100%;
  padding: 13px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  font-size: 14px;
}

textarea {
  height: 110px;
  resize: vertical;
}

.layout {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 18px;
}

.box {
  background: white;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 3px 10px rgba(0,0,0,0.06);
}

.form-box h2 {
  margin-bottom: 16px;
  font-size: 20px;
}

.form-row {
  margin-bottom: 12px;
}

.form-row label {
  display: block;
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 6px;
}

button {
  cursor: pointer;
}

.save-btn {
  width: 100%;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 10px;
  padding: 15px;
  font-size: 16px;
  font-weight: bold;
}

.reset-btn {
  width: 100%;
  background: #f3f4f6;
  color: #111827;
  border: none;
  border-radius: 10px;
  padding: 14px;
  font-size: 15px;
  margin-top: 10px;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 820px;
}

th, td {
  border-bottom: 1px solid #e5e7eb;
  padding: 12px 8px;
  text-align: left;
  font-size: 14px;
}

th {
  background: #f9fafb;
}

.badge {
  display: inline-block;
  padding: 5px 9px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: bold;
}

.type-exchange {
  background: #fef3c7;
  color: #b45309;
}

.type-refund {
  background: #fee2e2;
  color: #dc2626;
}

.type-delivery {
  background: #dbeafe;
  color: #2563eb;
}

.type-product {
  background: #ede9fe;
  color: #7c3aed;
}

.type-etc {
  background: #e5e7eb;
  color: #374151;
}

.status-wait {
  background: #dbeafe;
  color: #2563eb;
}

.status-work {
  background: #fef3c7;
  color: #d97706;
}

.status-done {
  background: #dcfce7;
  color: #16a34a;
}

.status-hold {
  background: #e5e7eb;
  color: #4b5563;
}

.action-btn {
  border: none;
  border-radius: 8px;
  padding: 7px 9px;
  font-size: 12px;
}

.edit-btn {
  background: #eff6ff;
  color: #2563eb;
}

.delete-btn {
  background: #fee2e2;
  color: #dc2626;
}

.mobile-list {
  display: none;
}

.mobile-card {
  background: white;
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 3px 10px rgba(0,0,0,0.06);
}

.mobile-top {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.mobile-name {
  font-weight: bold;
  font-size: 17px;
  margin-bottom: 6px;
}

.mobile-info {
  color: #4b5563;
  font-size: 14px;
  margin-bottom: 6px;
}

.mobile-memo {
  margin: 10px 0;
  font-size: 14px;
}

.mobile-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

@media (max-width: 900px) {
  .cards {
    grid-template-columns: 1fr 1fr;
  }

  .search-box {
    grid-template-columns: 1fr;
  }

  .layout {
    grid-template-columns: 1fr;
  }

  .table-box {
    display: none;
  }

  .mobile-list {
    display: block;
  }
}
</style>
</head>

<body>

<div class="header">
  <h1>🎧 씬느샵 CS 관리</h1>
  <p>채널톡 문의 / 교환 / 환불 / 배송문의 관리</p>
</div>

<div class="cards">
  <div class="card">
    <div class="card-title blue">전체 문의</div>
    <div class="card-number" id="countTotal">0</div>
  </div>

  <div class="card">
    <div class="card-title orange">접수</div>
    <div class="card-number" id="countWait">0</div>
  </div>

  <div class="card">
    <div class="card-title green">진행중</div>
    <div class="card-number" id="countWork">0</div>
  </div>

  <div class="card">
    <div class="card-title purple">완료</div>
    <div class="card-number" id="countDone">0</div>
  </div>
</div>

<div class="search-box">
  <input id="searchInput" placeholder="고객명 / 닉네임 / 채널톡아이디 검색" oninput="renderList()">

  <select id="typeFilter" onchange="renderList()">
    <option value="">유형 전체</option>
    <option value="교환">교환</option>
    <option value="환불">환불</option>
    <option value="배송문의">배송문의</option>
    <option value="상품문의">상품문의</option>
    <option value="기타">기타</option>
  </select>

  <select id="statusFilter" onchange="renderList()">
    <option value="">상태 전체</option>
    <option value="접수">접수</option>
    <option value="진행중">진행중</option>
    <option value="완료">완료</option>
    <option value="보류">보류</option>
  </select>
</div>

<div class="layout">

  <div class="box table-box">
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>번호</th>
            <th>접수일</th>
            <th>채널톡아이디</th>
            <th>닉네임</th>
            <th>고객명</th>
            <th>내용메모</th>
            <th>유형</th>
            <th>상태</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody id="tableBody">
          <tr>
            <td colspan="9">불러오는 중...</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="mobile-list" id="mobileList"></div>

  <div class="box form-box" id="formBox">
    <h2 id="formTitle">CS 접수 등록</h2>

    <input type="hidden" id="editRowNumber">

    <div class="form-row">
      <label>채널톡아이디</label>
      <input id="channelId" placeholder="예: channel123">
    </div>

    <div class="form-row">
      <label>닉네임</label>
      <input id="nickname" placeholder="예: 씬느고객">
    </div>

    <div class="form-row">
      <label>고객명</label>
      <input id="customerName" placeholder="예: 김OO">
    </div>

    <div class="form-row">
      <label>내용 메모</label>
      <textarea id="memo" placeholder="예: 블랙 M → 베이지 M 교환 요청"></textarea>
    </div>

    <div class="form-row">
      <label>유형</label>
      <select id="type">
        <option value="교환">교환</option>
        <option value="환불">환불</option>
        <option value="배송문의">배송문의</option>
        <option value="상품문의">상품문의</option>
        <option value="기타">기타</option>
      </select>
    </div>

    <div class="form-row">
      <label>상태</label>
      <select id="status">
        <option value="접수">접수</option>
        <option value="진행중">진행중</option>
        <option value="완료">완료</option>
        <option value="보류">보류</option>
      </select>
    </div>

    <button class="save-btn" onclick="submitCS()">저장하기</button>
    <button class="reset-btn" onclick="clearForm()">입력 초기화</button>
  </div>

</div>

<script>
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz8x3VE4prXpWyOv1cgeQ1q5JfQC6KOLDuH3KhMvLhGKw0CNMUIR3Iat2vDmsgq1sqC/exec";

let csData = [];

window.onload = function() {
  loadCSList();
};

function loadCSList() {
  fetch(SCRIPT_URL + "?mode=list")
    .then(res => res.json())
    .then(data => {
      csData = data || [];
      renderList();
      updateCounts();
    })
    .catch(err => {
      alert("CS 데이터를 불러오지 못했습니다.");
      console.error(err);
    });
}

function submitCS() {
  const rowNumber = document.getElementById("editRowNumber").value;

  const data = {
    mode: rowNumber ? "update" : "save",
    rowNumber: rowNumber,
    channelId: document.getElementById("channelId").value.trim(),
    nickname: document.getElementById("nickname").value.trim(),
    customerName: document.getElementById("customerName").value.trim(),
    memo: document.getElementById("memo").value.trim(),
    type: document.getElementById("type").value,
    status: document.getElementById("status").value
  };

  if (!data.channelId && !data.nickname && !data.customerName) {
    alert("채널톡아이디, 닉네임, 고객명 중 하나는 입력해주세요.");
    return;
  }

  if (!data.memo) {
    alert("내용 메모를 입력해주세요.");
    return;
  }

  fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify(data)
  })
  .then(res => res.json())
  .then(result => {
    alert(result.message || "저장 완료");
    clearForm();
    loadCSList();
  })
  .catch(err => {
    alert("저장 중 오류가 발생했습니다.");
    console.error(err);
  });
}

function renderList() {
  const keyword = document.getElementById("searchInput").value.trim().toLowerCase();
  const typeFilter = document.getElementById("typeFilter").value;
  const statusFilter = document.getElementById("statusFilter").value;

  const filtered = csData.filter(item => {
    const text = [
      item.channelId,
      item.nickname,
      item.customerName,
      item.memo
    ].join(" ").toLowerCase();

    return (!keyword || text.includes(keyword)) &&
           (!typeFilter || item.type === typeFilter) &&
           (!statusFilter || item.status === statusFilter);
  });

  renderTable(filtered);
  renderMobile(filtered);
}

function renderTable(list) {
  const tbody = document.getElementById("tableBody");

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9">CS 내역이 없습니다.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(item => `
    <tr>
      <td>${safe(item.no)}</td>
      <td>${safe(item.date)}</td>
      <td>${safe(item.channelId)}</td>
      <td>${safe(item.nickname)}</td>
      <td>${safe(item.customerName)}</td>
      <td>${safe(item.memo)}</td>
      <td>${typeBadge(item.type)}</td>
      <td>${statusBadge(item.status)}</td>
      <td>
        <button class="action-btn edit-btn" onclick='editItem(${JSON.stringify(item)})'>수정</button>
        <button class="action-btn delete-btn" onclick="deleteItem(${item.rowNumber})">삭제</button>
      </td>
    </tr>
  `).join("");
}

function renderMobile(list) {
  const mobileList = document.getElementById("mobileList");

  if (list.length === 0) {
    mobileList.innerHTML = `<div class="mobile-card">CS 내역이 없습니다.</div>`;
    return;
  }

  mobileList.innerHTML = list.map(item => `
    <div class="mobile-card">
      <div class="mobile-top">
        <strong>No. ${safe(item.no)}</strong>
        ${statusBadge(item.status)}
      </div>

      <div class="mobile-name">${safe(item.channelId)} / ${safe(item.nickname)}</div>
      <div class="mobile-info">고객명: ${safe(item.customerName)}</div>
      <div class="mobile-info">접수일: ${safe(item.date)}</div>
      <div>${typeBadge(item.type)}</div>
      <div class="mobile-memo">${safe(item.memo)}</div>

      <div class="mobile-actions">
        <button class="action-btn edit-btn" onclick='editItem(${JSON.stringify(item)})'>수정</button>
        <button class="action-btn delete-btn" onclick="deleteItem(${item.rowNumber})">삭제</button>
      </div>
    </div>
  `).join("");
}

function editItem(item) {
  document.getElementById("formTitle").innerText = "CS 수정";
  document.getElementById("editRowNumber").value = item.rowNumber;
  document.getElementById("channelId").value = item.channelId;
  document.getElementById("nickname").value = item.nickname;
  document.getElementById("customerName").value = item.customerName;
  document.getElementById("memo").value = item.memo;
  document.getElementById("type").value = item.type;
  document.getElementById("status").value = item.status;

  document.getElementById("formBox").scrollIntoView({ behavior: "smooth" });
}

function deleteItem(rowNumber) {
  if (!confirm("정말 삭제하시겠습니까?")) return;

  fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({
      mode: "delete",
      rowNumber: rowNumber
    })
  })
  .then(res => res.json())
  .then(result => {
    alert(result.message || "삭제 완료");
    loadCSList();
  });
}

function clearForm() {
  document.getElementById("formTitle").innerText = "CS 접수 등록";
  document.getElementById("editRowNumber").value = "";
  document.getElementById("channelId").value = "";
  document.getElementById("nickname").value = "";
  document.getElementById("customerName").value = "";
  document.getElementById("memo").value = "";
  document.getElementById("type").value = "교환";
  document.getElementById("status").value = "접수";
}

function updateCounts() {
  document.getElementById("countTotal").innerText = csData.length;
  document.getElementById("countWait").innerText = csData.filter(x => x.status === "접수").length;
  document.getElementById("countWork").innerText = csData.filter(x => x.status === "진행중").length;
  document.getElementById("countDone").innerText = csData.filter(x => x.status === "완료").length;
}

function typeBadge(type) {
  let cls = "type-etc";
  if (type === "교환") cls = "type-exchange";
  if (type === "환불") cls = "type-refund";
  if (type === "배송문의") cls = "type-delivery";
  if (type === "상품문의") cls = "type-product";
  return `<span class="badge ${cls}">${safe(type)}</span>`;
}

function statusBadge(status) {
  let cls = "status-hold";
  if (status === "접수") cls = "status-wait";
  if (status === "진행중") cls = "status-work";
  if (status === "완료") cls = "status-done";
  if (status === "보류") cls = "status-hold";
  return `<span class="badge ${cls}">${safe(status)}</span>`;
}

function safe(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
</script>

</body>
</html>