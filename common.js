async function api(action, payload = {}) {
  if (!API_URL || API_URL.includes("여기에_")) {
    throw new Error("config.js에 Apps Script 웹 앱 URL을 입력해 주세요.");
  }

  const body = new URLSearchParams();
  body.set("action", action);
  body.set("payload", JSON.stringify(payload));

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
    body
  });

  const data = await response.json();
  if (!data.success) throw new Error(data.message || "처리 중 오류가 발생했습니다.");
  return data;
}

function money(value) {
  return Number(value || 0).toLocaleString("ko-KR") + "원";
}

function phoneFormat(value) {
  const n = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (n.length <= 3) return n;
  if (n.length <= 7) return n.replace(/(\d{3})(\d+)/, "$1-$2");
  return n.replace(/(\d{3})(\d{4})(\d+)/, "$1-$2-$3");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toast(message, type = "success") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add("show"), 10);
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 250);
  }, 2600);
}
