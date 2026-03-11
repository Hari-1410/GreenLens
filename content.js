// ============================================================
// GreenLens Credit — content.js
// Runs on Amazon / Flipkart product pages AND search pages
// ============================================================

const CARBON_DB = {
  "surf excel":           { co2: 4.2, label: "Regular Detergent",    category: "cleaning" },
  "ariel":                { co2: 4.0, label: "Regular Detergent",    category: "cleaning" },
  "rin":                  { co2: 3.8, label: "Regular Detergent",    category: "cleaning" },
  "tide":                 { co2: 3.9, label: "Regular Detergent",    category: "cleaning" },
  "ezee":                 { co2: 1.9, label: "Eco Detergent",        category: "cleaning", isEco: true },
  "bio enzyme":           { co2: 1.4, label: "Bio Enzyme Cleaner",   category: "cleaning", isEco: true },
  "head shoulders":       { co2: 2.8, label: "Regular Shampoo",      category: "personal_care" },
  "head and shoulders":   { co2: 2.8, label: "Regular Shampoo",      category: "personal_care" },
  "pantene":              { co2: 2.6, label: "Regular Shampoo",      category: "personal_care" },
  "dove":                 { co2: 2.4, label: "Regular Shampoo",      category: "personal_care" },
  "biotique":             { co2: 1.1, label: "Herbal Shampoo",       category: "personal_care", isEco: true },
  "mamaearth":            { co2: 1.2, label: "Eco Shampoo",          category: "personal_care", isEco: true },
  "plastic bottle":       { co2: 3.1, label: "Plastic Bottle",       category: "beverage" },
  "steel bottle":         { co2: 1.2, label: "Steel Bottle",         category: "beverage", isEco: true },
  "copper bottle":        { co2: 1.0, label: "Copper Bottle",        category: "beverage", isEco: true },
  "basmati rice":         { co2: 2.7, label: "Regular Rice",         category: "food" },
  "organic rice":         { co2: 1.4, label: "Organic Rice",         category: "food", isEco: true },
  "jaivik basmati":       { co2: 1.3, label: "Certified Organic",    category: "food", isEco: true, certified: true },
  "normal notebook":      { co2: 1.8, label: "Regular Notebook",     category: "stationery" },
  "recycled notebook":    { co2: 0.7, label: "Recycled Notebook",    category: "stationery", isEco: true },
  "bamboo notebook":      { co2: 0.5, label: "Bamboo Notebook",      category: "stationery", isEco: true },
  "detergent":            { co2: 4.0, label: "Regular Detergent",    category: "cleaning" },
  "shampoo":              { co2: 2.6, label: "Regular Shampoo",      category: "personal_care" },
  "face wash":            { co2: 1.8, label: "Regular Face Wash",    category: "personal_care" },
  "soap":                 { co2: 1.5, label: "Regular Soap",         category: "personal_care" },
  "notebook":             { co2: 1.8, label: "Regular Notebook",     category: "stationery" },
  "rice":                 { co2: 2.7, label: "Regular Rice",         category: "food" },
};

const ECO_ALTERNATIVES = {
  cleaning:      { name: "Bio Enzyme Cleaner",        co2: 1.4, credits: 12 },
  personal_care: { name: "Mamaearth / Khadi Natural", co2: 1.0, credits: 8  },
  beverage:      { name: "Stainless Steel Bottle",    co2: 1.2, credits: 10 },
  food:          { name: "Jaivik Bharat Organic",     co2: 1.3, credits: 7  },
  stationery:    { name: "Recycled Paper Notebook",   co2: 0.7, credits: 6  },
  packaging:     { name: "Jute / Cloth Bag",          co2: 0.2, credits: 9  },
};

// ── State ────────────────────────────────────────────────────
let bannerInjected = false;
let lastProductTitle = "";
let switchCount = 0;
let lastSwitchTime = 0;

// ── Helpers ──────────────────────────────────────────────────
function matchProduct(title) {
  const lower = title.toLowerCase();
  for (const [keyword, data] of Object.entries(CARBON_DB)) {
    if (lower.includes(keyword)) return { keyword, ...data };
  }
  return null;
}

function isFraudulent() {
  const now = Date.now();
  if (now - lastSwitchTime < 3_600_000) {
    switchCount++;
  } else {
    switchCount = 1;
    lastSwitchTime = now;
  }
  return switchCount > 3;
}

// ── Get search/product title from any Amazon or Flipkart page ─
function getProductTitle() {
  // 1. Amazon product detail page
  const amzTitle = document.querySelector("#productTitle, #title");
  if (amzTitle && amzTitle.innerText.trim()) return amzTitle.innerText.trim();

  // 2. Amazon search results — read from URL query param
  const urlParams = new URLSearchParams(window.location.search);
  const searchQuery = urlParams.get("k") || urlParams.get("field-keywords");
  if (searchQuery && searchQuery.trim()) return searchQuery.trim();

  // 3. Amazon search box value
  const searchBox = document.querySelector("#twotabsearchtextbox, input[name='field-keywords']");
  if (searchBox && searchBox.value.trim()) return searchBox.value.trim();

  // 4. Flipkart product page
  const fkTitle = document.querySelector("h1.B_NuCI, span.B_NuCI, ._35KyD6");
  if (fkTitle && fkTitle.innerText.trim()) return fkTitle.innerText.trim();

  // 5. Flipkart search box
  const fkSearch = document.querySelector("input.Pke_EE, input[name='q']");
  if (fkSearch && fkSearch.value.trim()) return fkSearch.value.trim();

  return null;
}

// ── Credit storage ───────────────────────────────────────────
async function addCredits(credits, co2Avoided, productName) {
  return new Promise((resolve) => {
    chrome.storage.local.get(["totalCredits", "greenScore", "transactions"], (data) => {
      const prevCredits  = data.totalCredits  || 0;
      const newCredits   = prevCredits + credits;
      const newScore     = Math.min(100, Math.floor(newCredits / 10));
      const transactions = data.transactions  || [];

      transactions.unshift({
        product: productName,
        co2Avoided: co2Avoided.toFixed(2),
        credits,
        timestamp: new Date().toLocaleString(),
      });

      chrome.storage.local.set({
        totalCredits: newCredits,
        greenScore:   newScore,
        transactions: transactions.slice(0, 20),
      }, () => resolve({ newCredits, newScore }));
    });
  });
}

// ── Banner injection ─────────────────────────────────────────
function removeBanner() {
  const old = document.getElementById("greenlens-banner");
  if (old) old.remove();
  bannerInjected = false;
}

function injectBanner(currentProduct, ecoAlt) {
  if (bannerInjected) return;
  bannerInjected = true;

  const co2Avoided    = parseFloat((currentProduct.co2 - ecoAlt.co2).toFixed(2));
  const creditsEarned = ecoAlt.credits;

  const banner = document.createElement("div");
  banner.id = "greenlens-banner";
  banner.innerHTML = `
    <div class="gl-banner">
      <div class="gl-left">
        <span class="gl-leaf">🌿</span>
        <div class="gl-text">
          <div class="gl-title">GreenLens found a greener option!</div>
          <div class="gl-sub">
            Switch to <strong>${ecoAlt.name}</strong> and save 
            <span class="gl-co2">${co2Avoided}kg CO₂</span>
          </div>
        </div>
      </div>
      <div class="gl-right">
        <button class="gl-btn" id="gl-switch-btn">
          Switch &amp; Earn <span class="gl-badge">+${creditsEarned} 🍃</span>
        </button>
        <button class="gl-close" id="gl-close-btn">✕</button>
      </div>
    </div>
    <div class="gl-toast" id="gl-toast" style="display:none;">
      <span>✅</span>
      <span id="gl-toast-msg"></span>
    </div>
  `;

  document.body.insertBefore(banner, document.body.firstChild);

  document.getElementById("gl-switch-btn").addEventListener("click", async () => {
    if (isFraudulent()) {
      showToast("⚠️ Suspicious activity detected. Credits suspended.", true);
      return;
    }

    const btn = document.getElementById("gl-switch-btn");
    btn.disabled = true;
    btn.textContent = "Processing...";

    const { newCredits, newScore } = await addCredits(creditsEarned, co2Avoided, ecoAlt.name);

    showToast(`+${creditsEarned} GreenCredits added! 🎉 Score: ${newScore} | Total: ${newCredits}`);
    btn.textContent = "✅ Earned!";
    btn.style.background = "#22c55e";

    chrome.runtime.sendMessage({
      type: "CREDIT_ADDED",
      payload: { credits: creditsEarned, co2Avoided, product: ecoAlt.name, score: newScore },
    });
  });

  document.getElementById("gl-close-btn").addEventListener("click", removeBanner);
}

function injectGreenwashAlert(productName) {
  if (bannerInjected) return;
  bannerInjected = true;

  const banner = document.createElement("div");
  banner.id = "greenlens-banner";
  banner.innerHTML = `
    <div class="gl-banner gl-warn">
      <div class="gl-left">
        <span class="gl-leaf">⚠️</span>
        <div class="gl-text">
          <div class="gl-title">GreenLens Alert</div>
          <div class="gl-sub">
            <strong>${productName}</strong> has unverified eco-claims. 
            No GreenCredits awarded. <em>Greenwashing detected.</em>
          </div>
        </div>
      </div>
      <div class="gl-right">
        <button class="gl-close" id="gl-close-btn">✕</button>
      </div>
    </div>
  `;

  document.body.insertBefore(banner, document.body.firstChild);
  document.getElementById("gl-close-btn").addEventListener("click", removeBanner);
}

function showToast(message, isError = false) {
  const toast = document.getElementById("gl-toast");
  const msg   = document.getElementById("gl-toast-msg");
  if (!toast || !msg) return;

  msg.textContent = message;
  toast.style.display = "flex";
  toast.style.background = isError ? "#ef4444" : "#15803d";
  setTimeout(() => { toast.style.display = "none"; }, 4000);
}

// ── Main detection ───────────────────────────────────────────
function analyzeProduct() {
  const title = getProductTitle();
  if (!title) return;
  if (title === lastProductTitle) return;
  lastProductTitle = title;

  removeBanner();

  const matched = matchProduct(title);
  if (!matched) return;
  if (matched.isEco) return;

  const ecoAlt = ECO_ALTERNATIVES[matched.category];
  if (!ecoAlt) return;

  const lowerTitle = title.toLowerCase();
  const claimsEco  = ["eco", "green", "organic", "natural", "bio"].some(k => lowerTitle.includes(k));
  const TRUSTED    = ["jaivik bharat", "india organic", "ecomark", "fssai organic"];
  const hasCert    = TRUSTED.some(c => lowerTitle.includes(c));

  if (claimsEco && !hasCert) {
    injectGreenwashAlert(matched.label);
    return;
  }

  injectBanner(matched, ecoAlt);
}

// ── MutationObserver ─────────────────────────────────────────
const observer = new MutationObserver(() => {
  analyzeProduct();
});
observer.observe(document.body, { childList: true, subtree: true });

// ── URL change watcher (SPA navigation) ─────────────────────
let lastUrl = location.href;
setInterval(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    lastProductTitle = "";
    removeBanner();
    setTimeout(analyzeProduct, 800);
  }
}, 500);

// ── Initial runs ─────────────────────────────────────────────
analyzeProduct();
setTimeout(analyzeProduct, 800);
setTimeout(analyzeProduct, 2000);
