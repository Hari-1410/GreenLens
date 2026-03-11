// popup.js — GreenLens Credit v3.0

// ── Simulated bank accounts ──────────────────────────────────
const BANK_ACCOUNTS = [
  { id: "sbi",  name: "SBI Savings",  last4: "4821", linked: true,  loanType: "Home Loan",     baseRate: 8.5 },
  { id: "hdfc", name: "HDFC Bank",    last4: "2247", linked: false, loanType: "Personal Loan", baseRate: 11.5 },
  { id: "axis", name: "Axis Bank",    last4: "9103", linked: false, loanType: "Credit Card",   baseRate: 14.0 },
];

// ── Loan discount logic ─────────────────────────────────────
function getDiscount(score) {
  if (score >= 80) return 0.7;
  if (score >= 60) return 0.4;
  if (score >= 40) return 0.2;
  return 0;
}

function getDiscountedRate(baseRate, discount) {
  return (baseRate - discount).toFixed(1) + "%";
}

function getLoanRateBand(score) {
  if (score >= 80) return { label: "PLATINUM", color: "#7c3aed" };
  if (score >= 60) return { label: "GOLD",     color: "#d97706" };
  if (score >= 40) return { label: "SILVER",   color: "#64748b" };
  return                  { label: "STANDARD", color: "#6b7280" };
}

// ── Animate ring ─────────────────────────────────────────────
function animateRing(score) {
  const arc = document.getElementById("score-arc");
  if (!arc) return;
  const offset = 283 - (score / 100) * 283;
  setTimeout(() => {
    arc.style.strokeDashoffset = offset;
    arc.style.stroke = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";
  }, 80);
}

// ── Animate counter ──────────────────────────────────────────
function animateCount(el, target, decimals = 0) {
  if (!el) return;
  const duration = 900;
  const start    = performance.now();
  const from     = parseFloat(el.textContent) || 0;
  function step(now) {
    const p = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = (from + (target - from) * ease).toFixed(decimals);
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ── Render bank accounts ─────────────────────────────────────
function renderBanks(score) {
  const discount = getDiscount(score);
  const container = document.getElementById("bank-list");
  if (!container) return;

  container.innerHTML = BANK_ACCOUNTS.map(bank => {
    const discountedRate = getDiscountedRate(bank.baseRate, discount);
    const isLinked = bank.linked;
    return `
      <div class="bank-card ${isLinked ? 'linked' : ''}">
        <div class="bank-left">
          <div class="bank-icon">${isLinked ? '🏦' : '➕'}</div>
          <div>
            <div class="bank-name">${bank.name} ••••${bank.last4}</div>
            <div class="bank-type">${bank.loanType}</div>
          </div>
        </div>
        <div class="bank-right">
          ${isLinked
            ? `<div class="rate-stack">
                <span class="rate-old">${bank.baseRate}%</span>
                <span class="rate-new">${discountedRate}</span>
               </div>`
            : `<button class="link-btn" data-bank="${bank.id}">Link</button>`
          }
        </div>
      </div>
    `;
  }).join("");

  // Link button handlers (simulation)
  container.querySelectorAll(".link-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const bankId = btn.getAttribute("data-bank");
      const bank   = BANK_ACCOUNTS.find(b => b.id === bankId);
      if (!bank) return;
      btn.textContent = "Linking...";
      btn.disabled = true;
      setTimeout(() => {
        bank.linked = true;
        renderBanks(score);
      }, 1200);
    });
  });
}

// ── Render activity feed ─────────────────────────────────────
function renderActivity(transactions) {
  const list = document.getElementById("activity-list");
  if (!list) return;

  if (!transactions || transactions.length === 0) {
    list.innerHTML = `<div class="empty-state">No switches yet.<br/>Start shopping to earn credits!</div>`;
    return;
  }

  list.innerHTML = transactions.slice(0, 5).map(tx => `
    <div class="activity-item">
      <span style="font-size:14px;">🌿</span>
      <div class="activity-text">
        <strong>${tx.product}</strong>
        <span>${tx.co2Avoided}kg CO₂ saved</span>
      </div>
      <div class="activity-credits">+${tx.credits}</div>
    </div>
  `).join("");
}

// ── Main load ────────────────────────────────────────────────
function loadData() {
  chrome.storage.local.get(["totalCredits", "greenScore", "transactions"], (data) => {
    const credits      = data.totalCredits  || 0;
    const score        = data.greenScore    || 0;
    const transactions = data.transactions  || [];

    const co2Total = transactions.reduce((s, tx) => s + parseFloat(tx.co2Avoided || 0), 0);
    const switches = transactions.length;

    // Score ring & number
    animateRing(score);
    animateCount(document.getElementById("score-display"), score);

    // Stats
    animateCount(document.getElementById("credits-display"), credits);
    animateCount(document.getElementById("co2-display"), co2Total, 1);
    animateCount(document.getElementById("switches-display"), switches);

    // Band label
    const band = getLoanRateBand(score);
    const bandEl = document.getElementById("score-band");
    if (bandEl) {
      bandEl.textContent    = band.label;
      bandEl.style.color    = band.color;
      bandEl.style.borderColor = band.color;
    }

    // Render banks with updated rates
    renderBanks(score);
    renderActivity(transactions);
  });
}

// ── Reset ────────────────────────────────────────────────────
document.getElementById("reset-btn")?.addEventListener("click", () => {
  if (confirm("Reset all GreenCredits? This cannot be undone.")) {
    chrome.storage.local.clear(() => loadData());
  }
});

// ── Tab switching ────────────────────────────────────────────
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = btn.getAttribute("data-tab");
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("tab-" + target)?.classList.add("active");
  });
});

// ── Live update from content.js ──────────────────────────────
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "CREDIT_ADDED") loadData();
});

loadData();
