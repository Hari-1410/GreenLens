// popup.js — GreenLens Credit popup wallet

// ── Loan rate logic based on score ──────────────────────────
function getLoanRates(score) {
  if (score >= 80) return { hdfc: "10.2%", sbi: "7.8%" };
  if (score >= 60) return { hdfc: "10.8%", sbi: "8.1%" };
  if (score >= 40) return { hdfc: "11.0%", sbi: "8.3%" };
  return           { hdfc: "11.5%", sbi: "8.5%" };
}

// ── Animate score ring ───────────────────────────────────────
function animateRing(score) {
  const circumference = 283; // 2 * π * r (r=45)
  const arc = document.getElementById("score-arc");
  const offset = circumference - (score / 100) * circumference;

  // Trigger after small delay so transition fires
  setTimeout(() => {
    arc.style.strokeDashoffset = offset;
    // Color shift: red → yellow → green
    if (score >= 70)      arc.style.stroke = "#10b981";
    else if (score >= 40) arc.style.stroke = "#f59e0b";
    else                  arc.style.stroke = "#ef4444";
  }, 80);
}

// ── Animate number counting up ───────────────────────────────
function animateCount(el, target, suffix = "") {
  const duration = 800;
  const start    = performance.now();
  const from     = parseInt(el.textContent) || 0;

  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    el.textContent = Math.round(from + (target - from) * ease) + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

// ── Render activity feed ─────────────────────────────────────
function renderActivity(transactions) {
  const list = document.getElementById("activity-list");

  if (!transactions || transactions.length === 0) {
    list.innerHTML = `<div class="empty-state">No switches yet.<br/>Start shopping to earn credits!</div>`;
    return;
  }

  list.innerHTML = transactions.slice(0, 5).map(tx => `
    <div class="activity-item">
      <span class="activity-icon">🌿</span>
      <div class="activity-text">
        <strong>${tx.product}</strong><br/>
        ${tx.co2Avoided}kg CO₂ saved · ${tx.timestamp}
      </div>
      <div class="activity-credits">+${tx.credits}</div>
    </div>
  `).join("");
}

// ── Load data from chrome.storage ───────────────────────────
function loadData() {
  chrome.storage.local.get(["totalCredits", "greenScore", "transactions"], (data) => {
    const credits      = data.totalCredits  || 0;
    const score        = data.greenScore    || 0;
    const transactions = data.transactions  || [];

    // Estimate CO2 saved and switches from transactions
    const co2Total  = transactions.reduce((sum, tx) => sum + parseFloat(tx.co2Avoided || 0), 0);
    const switches  = transactions.length;

    // Update UI
    animateCount(document.getElementById("score-display"),   score);
    animateCount(document.getElementById("credits-display"), credits);
    animateCount(document.getElementById("switches-display"), switches);

    const co2El = document.getElementById("co2-display");
    co2El.textContent = co2Total.toFixed(1) + " kg";

    animateRing(score);

    // Loan rates
    const rates = getLoanRates(score);
    document.getElementById("hdfc-rate").textContent = rates.hdfc;
    document.getElementById("sbi-rate").textContent  = rates.sbi;

    // Color the rates
    const isDiscounted = score >= 40;
    ["hdfc-rate", "sbi-rate"].forEach(id => {
      document.getElementById(id).style.color = isDiscounted ? "#34d399" : "#9ca3af";
    });

    renderActivity(transactions);
  });
}

// ── Reset button ─────────────────────────────────────────────
document.getElementById("reset-btn").addEventListener("click", () => {
  if (confirm("Reset all GreenCredits? This cannot be undone.")) {
    chrome.storage.local.clear(() => loadData());
  }
});

// ── Init ─────────────────────────────────────────────────────
loadData();

// Listen for updates from content.js while popup is open
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "CREDIT_ADDED") loadData();
});
