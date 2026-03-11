// ============================================================
// GreenLens Credit — content.js  v3.0
// Author: GreenLens Dev
// Features:
//   • Real Amazon product links for eco alternatives
//   • Green/Red badges on every search result card
//   • Certification verification (Jaivik Bharat, Ecomark etc.)
//   • Fraud detection
//   • Simulated GPay checkout modal
// ============================================================

// ─────────────────────────────────────────────────────────────
// 1. DATABASE — eco alternatives with REAL Amazon search URLs
// ─────────────────────────────────────────────────────────────
const CARBON_DB = {
  // Detergents
  "surf excel":         { co2: 4.2, label: "Surf Excel",         category: "cleaning" },
  "ariel":              { co2: 4.0, label: "Ariel Detergent",    category: "cleaning" },
  "rin":                { co2: 3.8, label: "Rin Detergent",      category: "cleaning" },
  "tide":               { co2: 3.9, label: "Tide Detergent",     category: "cleaning" },
  "ezee":               { co2: 1.9, label: "Ezee Liquid",        category: "cleaning", isEco: true, cert: "FSSAI" },
  "bio enzyme":         { co2: 1.4, label: "Bio Enzyme",         category: "cleaning", isEco: true, cert: "Ecomark" },
  // Shampoo
  "head and shoulders": { co2: 2.8, label: "Head & Shoulders",  category: "personal_care" },
  "head shoulders":     { co2: 2.8, label: "Head & Shoulders",  category: "personal_care" },
  "pantene":            { co2: 2.6, label: "Pantene",            category: "personal_care" },
  "dove shampoo":       { co2: 2.4, label: "Dove Shampoo",       category: "personal_care" },
  "biotique":           { co2: 1.1, label: "Biotique",           category: "personal_care", isEco: true, cert: "Ayush" },
  "mamaearth":          { co2: 1.2, label: "Mamaearth",          category: "personal_care", isEco: true, cert: "MadeSafe" },
  "khadi":              { co2: 0.9, label: "Khadi Natural",      category: "personal_care", isEco: true, cert: "KVIC" },
  // Bottles
  "plastic bottle":     { co2: 3.1, label: "Plastic Bottle",    category: "beverage" },
  "pet bottle":         { co2: 2.9, label: "PET Bottle",        category: "beverage" },
  "steel bottle":       { co2: 1.2, label: "Steel Bottle",      category: "beverage", isEco: true, cert: "ISI" },
  "copper bottle":      { co2: 1.0, label: "Copper Bottle",     category: "beverage", isEco: true, cert: "AYUSH" },
  // Food
  "basmati rice":       { co2: 2.7, label: "Basmati Rice",      category: "food" },
  "rice":               { co2: 2.7, label: "Regular Rice",      category: "food" },
  "organic rice":       { co2: 1.4, label: "Organic Rice",      category: "food", isEco: true, cert: "India Organic" },
  "jaivik":             { co2: 1.3, label: "Jaivik Organic",    category: "food", isEco: true, cert: "Jaivik Bharat" },
  // Stationery
  "notebook":           { co2: 1.8, label: "Regular Notebook",  category: "stationery" },
  "recycled notebook":  { co2: 0.7, label: "Recycled Notebook", category: "stationery", isEco: true, cert: "FSC" },
  "bamboo":             { co2: 0.5, label: "Bamboo Product",    category: "stationery", isEco: true, cert: "FSC" },
  // Generic fallbacks
  "detergent":          { co2: 4.0, label: "Detergent",         category: "cleaning" },
  "shampoo":            { co2: 2.6, label: "Shampoo",           category: "personal_care" },
  "face wash":          { co2: 1.8, label: "Face Wash",         category: "personal_care" },
  "soap":               { co2: 1.5, label: "Soap",              category: "personal_care" },
};

// Real eco alternatives with ACTUAL Amazon.in search URLs
// These link to real products that exist on Amazon India
const ECO_ALTERNATIVES = {
  cleaning: {
    name:        "Bio Enzyme Liquid Detergent",
    brand:       "Herbal Strategi / Puracy",
    co2:         1.4,
    credits:     12,
    cert:        "Ecomark",
    certColor:   "#16a34a",
    amazonUrl:   "https://www.amazon.in/s?k=bio+enzyme+liquid+detergent+eco+friendly",
    description: "Plant-based, biodegradable, no harsh chemicals",
    co2Label:    "1.4kg CO₂/use",
  },
  personal_care: {
    name:        "Mamaearth Onion Shampoo",
    brand:       "Mamaearth",
    co2:         1.2,
    credits:     8,
    cert:        "MadeSafe Certified",
    certColor:   "#16a34a",
    amazonUrl:   "https://www.amazon.in/s?k=mamaearth+onion+shampoo+natural",
    description: "Toxin-free, dermatologist tested, plant-based",
    co2Label:    "1.2kg CO₂/use",
  },
  beverage: {
    name:        "Stainless Steel Water Bottle",
    brand:       "Milton / Cello",
    co2:         1.2,
    credits:     10,
    cert:        "ISI Certified",
    certColor:   "#2563eb",
    amazonUrl:   "https://www.amazon.in/s?k=stainless+steel+water+bottle+BPA+free",
    description: "Reusable, BPA-free, lasts 10+ years",
    co2Label:    "1.2kg CO₂ total",
  },
  food: {
    name:        "Jaivik Bharat Organic Basmati Rice",
    brand:       "24 Mantra / Pro Nature",
    co2:         1.3,
    credits:     7,
    cert:        "Jaivik Bharat Certified",
    certColor:   "#16a34a",
    amazonUrl:   "https://www.amazon.in/s?k=jaivik+bharat+organic+basmati+rice",
    description: "Govt. certified organic, no pesticides",
    co2Label:    "1.3kg CO₂/kg",
  },
  stationery: {
    name:        "Recycled Paper Notebook",
    brand:       "Classmate Recycled / Navneet",
    co2:         0.7,
    credits:     6,
    cert:        "FSC Certified",
    certColor:   "#16a34a",
    amazonUrl:   "https://www.amazon.in/s?k=recycled+paper+notebook+eco+friendly",
    description: "100% recycled paper, FSC certified",
    co2Label:    "0.7kg CO₂/unit",
  },
  packaging: {
    name:        "Jute Shopping Bag",
    brand:       "Indha / Eco Bags India",
    co2:         0.2,
    credits:     9,
    cert:        "Handloom Mark",
    certColor:   "#d97706",
    amazonUrl:   "https://www.amazon.in/s?k=jute+bag+reusable+shopping+eco+friendly",
    description: "Biodegradable, reusable, handcrafted",
    co2Label:    "0.2kg CO₂/unit",
  },
};

// Certification trust list — used for badge verification
const TRUSTED_CERTS = [
  "jaivik bharat", "india organic", "ecomark", "fssai organic",
  "made safe", "madesafe", "usda organic", "rainforest alliance",
  "fsc certified", "kvic", "ayush", "isi mark",
];

// Keywords that claim eco but need cert verification
const ECO_CLAIM_KEYWORDS = ["eco", "green", "organic", "natural", "bio", "herbal", "sustainable"];

// ─────────────────────────────────────────────────────────────
// 2. STATE
// ─────────────────────────────────────────────────────────────
let bannerInjected     = false;
let lastProductTitle   = "";
let badgesInjected     = false;
let switchCount        = 0;
let lastSwitchTime     = 0;
let badgeObserver      = null;

// ─────────────────────────────────────────────────────────────
// 3. UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────
function matchProduct(title) {
  const lower = title.toLowerCase();
  // Longer keywords first to avoid "rice" matching before "organic rice"
  const sorted = Object.entries(CARBON_DB).sort((a, b) => b[0].length - a[0].length);
  for (const [keyword, data] of sorted) {
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

function getProductTitle() {
  // Amazon product detail page
  const amzTitle = document.querySelector("#productTitle, #title");
  if (amzTitle?.innerText?.trim()) return amzTitle.innerText.trim();

  // Amazon search results URL param
  const urlParams  = new URLSearchParams(window.location.search);
  const searchQuery = urlParams.get("k") || urlParams.get("field-keywords");
  if (searchQuery?.trim()) return searchQuery.trim();

  // Amazon search box
  const searchBox = document.querySelector("#twotabsearchtextbox");
  if (searchBox?.value?.trim()) return searchBox.value.trim();

  // Flipkart
  const fkTitle = document.querySelector("h1.B_NuCI, span.B_NuCI");
  if (fkTitle?.innerText?.trim()) return fkTitle.innerText.trim();

  const fkSearch = document.querySelector("input.Pke_EE");
  if (fkSearch?.value?.trim()) return fkSearch.value.trim();

  return null;
}

function isSearchPage() {
  return window.location.pathname === "/s" || window.location.search.includes("?k=");
}

// ─────────────────────────────────────────────────────────────
// 4. CREDIT STORAGE
// ─────────────────────────────────────────────────────────────
async function addCredits(credits, co2Avoided, productName) {
  return new Promise((resolve) => {
    chrome.storage.local.get(["totalCredits", "greenScore", "transactions"], (data) => {
      const prevCredits  = data.totalCredits  || 0;
      const newCredits   = prevCredits + credits;
      const newScore     = Math.min(100, Math.floor(newCredits / 10));
      const transactions = data.transactions  || [];

      transactions.unshift({
        product:    productName,
        co2Avoided: parseFloat(co2Avoided).toFixed(2),
        credits,
        timestamp:  new Date().toLocaleString("en-IN"),
      });

      chrome.storage.local.set({
        totalCredits: newCredits,
        greenScore:   newScore,
        transactions: transactions.slice(0, 20),
      }, () => resolve({ newCredits, newScore }));
    });
  });
}

// ─────────────────────────────────────────────────────────────
// 5. SEARCH PAGE — PRODUCT CARD BADGES
// ─────────────────────────────────────────────────────────────
function classifyProductCard(titleText) {
  const lower = titleText.toLowerCase();
  const matchedData = matchProduct(lower);

  if (!matchedData) return null; // not a tracked product

  const claimsEco = ECO_CLAIM_KEYWORDS.some(k => lower.includes(k));
  const hasCert   = TRUSTED_CERTS.some(c => lower.includes(c));

  if (matchedData.isEco && hasCert) {
    return { type: "verified_eco", label: "✅ Verified Eco", color: "#16a34a", bg: "#dcfce7", cert: matchedData.cert || "Certified" };
  }
  if (matchedData.isEco) {
    return { type: "eco", label: "🌿 Eco Product", color: "#15803d", bg: "#f0fdf4", cert: null };
  }
  if (claimsEco && !hasCert) {
    return { type: "greenwash", label: "⚠️ Unverified Claim", color: "#b45309", bg: "#fef9c3", cert: null };
  }
  // Regular product — show CO2 footprint badge
  return { type: "regular", label: `🏭 ${matchedData.co2}kg CO₂`, color: "#dc2626", bg: "#fee2e2", cert: null };
}

function injectSearchBadges() {
  if (badgesInjected) return;

  // Amazon search result cards — each product container
  const cards = document.querySelectorAll(
    '[data-component-type="s-search-result"], .s-result-item[data-asin]'
  );

  if (cards.length === 0) return;
  badgesInjected = true;

  cards.forEach((card) => {
    // Skip sponsored/ad cards with no ASIN
    const asin = card.getAttribute("data-asin");
    if (!asin || asin.length < 5) return;

    // Get the title of this specific card
    const titleEl = card.querySelector("h2 a span, h2 span, .a-size-medium, .a-size-base-plus");
    if (!titleEl) return;

    const titleText  = titleEl.innerText || titleEl.textContent || "";
    const badgeInfo  = classifyProductCard(titleText);
    if (!badgeInfo) return;

    // Don't inject twice on the same card
    if (card.querySelector(".gl-product-badge")) return;

    // Find image container to inject badge above it
    const imageContainer = card.querySelector(".s-image-square-aspect, .s-product-image-container, img.s-image");
    const injectTarget   = imageContainer?.parentElement || card.querySelector("h2") || card;

    const badge = document.createElement("div");
    badge.className = "gl-product-badge";
    badge.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: ${badgeInfo.bg};
      color: ${badgeInfo.color};
      border: 1px solid ${badgeInfo.color}33;
      border-radius: 4px;
      padding: 3px 7px;
      font-size: 11px;
      font-weight: 700;
      font-family: 'Segoe UI', sans-serif;
      margin: 4px 0;
      width: fit-content;
      cursor: default;
      position: relative;
      z-index: 10;
      white-space: nowrap;
    `;
    badge.textContent = badgeInfo.label;

    if (badgeInfo.cert) {
      const certTag = document.createElement("span");
      certTag.style.cssText = `
        background: ${badgeInfo.color};
        color: white;
        border-radius: 3px;
        padding: 1px 5px;
        font-size: 9px;
        font-weight: 800;
        letter-spacing: 0.04em;
        margin-left: 4px;
      `;
      certTag.textContent = badgeInfo.cert;
      badge.appendChild(certTag);
    }

    // Inject at top of image area
    if (imageContainer) {
      imageContainer.style.position = "relative";
      const wrapper = document.createElement("div");
      wrapper.style.cssText = "position: absolute; top: 6px; left: 6px; z-index: 20;";
      wrapper.appendChild(badge);
      imageContainer.appendChild(wrapper);
    } else {
      injectTarget.insertBefore(badge, injectTarget.firstChild);
    }
  });
}

// ─────────────────────────────────────────────────────────────
// 6. GPAY SIMULATION MODAL
// ─────────────────────────────────────────────────────────────
function showGPayModal(ecoAlt, co2Avoided, creditsEarned, newScore, newCredits) {
  // Remove any existing modal
  document.getElementById("gl-gpay-modal")?.remove();

  const modal = document.createElement("div");
  modal.id = "gl-gpay-modal";
  modal.style.cssText = `
    position: fixed; inset: 0; z-index: 2147483647;
    display: flex; align-items: center; justify-content: center;
    background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
    font-family: 'Segoe UI', sans-serif;
  `;

  modal.innerHTML = `
    <div style="
      background: white; border-radius: 16px; width: 340px;
      box-shadow: 0 25px 60px rgba(0,0,0,0.3); overflow: hidden;
    ">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #064e3b, #047857); padding: 18px 20px; color: white;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:24px;">🌿</span>
          <div>
            <div style="font-weight:800; font-size:15px;">Proceed with Green Purchase</div>
            <div style="font-size:11px; opacity:0.8; margin-top:2px;">${ecoAlt.name}</div>
          </div>
        </div>
      </div>

      <!-- Product info -->
      <div style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb;">
        <div style="font-size:12px; color:#6b7280; margin-bottom:8px;">SWITCHING TO</div>
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <div style="font-weight:700; font-size:14px; color:#111;">${ecoAlt.name}</div>
            <div style="font-size:12px; color:#6b7280;">by ${ecoAlt.brand}</div>
            <div style="margin-top:6px;">
              <span style="
                background:#dcfce7; color:#16a34a;
                border-radius:4px; padding:2px 8px;
                font-size:11px; font-weight:700;
              ">✅ ${ecoAlt.cert}</span>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:12px; color:#6b7280;">CO₂ Saved</div>
            <div style="font-size:20px; font-weight:900; color:#16a34a;">${co2Avoided}kg</div>
          </div>
        </div>
        <a href="${ecoAlt.amazonUrl}" target="_blank" style="
          display:block; margin-top:10px;
          background:#f0fdf4; border:1px solid #16a34a;
          color:#16a34a; text-align:center;
          padding:6px; border-radius:6px;
          font-size:12px; font-weight:600;
          text-decoration:none;
        ">🛒 View Product on Amazon →</a>
      </div>

      <!-- Credits earned -->
      <div style="
        padding: 12px 20px; background:#f0fdf4;
        display:flex; justify-content:space-between;
        border-bottom: 1px solid #e5e7eb;
      ">
        <div>
          <div style="font-size:11px; color:#6b7280;">GREENCREDITS EARNED</div>
          <div style="font-size:22px; font-weight:900; color:#16a34a;">+${creditsEarned} 🍃</div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11px; color:#6b7280;">NEW GREEN SCORE</div>
          <div style="font-size:22px; font-weight:900; color:#064e3b;">${newScore}<span style="font-size:12px; color:#6b7280;">/100</span></div>
        </div>
      </div>

      <!-- GPay simulation -->
      <div style="padding: 16px 20px; border-bottom: 1px solid #e5e7eb;">
        <div style="font-size:12px; color:#6b7280; margin-bottom:10px;">PAY VIA (SIMULATION)</div>
        <div id="gl-gpay-btn" style="
          display:flex; align-items:center; justify-content:center; gap:10px;
          background:#1a73e8; color:white; border-radius:8px;
          padding:12px; cursor:pointer; font-weight:700; font-size:14px;
          transition: background 0.2s;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248l-1.97 9.3c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L6.26 14.4l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.556 2.186z"/>
          </svg>
          Pay with GPay
        </div>
        <div style="
          display:flex; align-items:center; gap:6px; margin-top:8px;
          background:#f9fafb; border-radius:6px; padding:8px 10px;
        ">
          <span style="font-size:18px;">🏦</span>
          <div style="flex:1;">
            <div style="font-size:11px; font-weight:700; color:#111;">Linked Bank Account</div>
            <div style="font-size:11px; color:#6b7280;">SBI ••••4821 — Green Loan Rate: <span id="gl-modal-rate" style="color:#16a34a; font-weight:700;">8.1%</span></div>
          </div>
        </div>
      </div>

      <!-- Loan discount callout -->
      <div id="gl-loan-callout" style="
        padding: 10px 20px; background:#eff6ff;
        border-bottom: 1px solid #e5e7eb; display:none;
      ">
        <div style="font-size:12px; color:#1d4ed8; font-weight:600;">
          💳 Your Green Score qualifies you for a <strong>0.7% loan rate reduction</strong> on your next purchase!
        </div>
      </div>

      <!-- Buttons -->
      <div style="padding:14px 20px; display:flex; gap:8px;">
        <button id="gl-modal-cancel" style="
          flex:1; background:white; border:1px solid #d1d5db; color:#374151;
          border-radius:8px; padding:10px; font-size:13px; font-weight:600; cursor:pointer;
        ">Cancel</button>
        <button id="gl-modal-confirm" style="
          flex:2; background:#16a34a; color:white; border:none;
          border-radius:8px; padding:10px; font-size:13px; font-weight:700; cursor:pointer;
        ">✅ Confirm & Go to Amazon</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Update loan rate based on score
  const rate = newScore >= 80 ? "7.8%" : newScore >= 60 ? "8.1%" : newScore >= 40 ? "8.3%" : "8.5%";
  document.getElementById("gl-modal-rate").textContent = rate;

  // Show loan callout if score unlocked a benefit
  if (newScore >= 40) {
    document.getElementById("gl-loan-callout").style.display = "block";
  }

  // GPay button — simulate payment flow
  document.getElementById("gl-gpay-btn").addEventListener("click", () => {
    const btn = document.getElementById("gl-gpay-btn");
    btn.textContent = "⏳ Processing payment...";
    btn.style.background = "#fbbc04";
    btn.style.color = "#000";
    setTimeout(() => {
      btn.textContent = "✅ Payment Successful!";
      btn.style.background = "#16a34a";
      btn.style.color = "white";
    }, 1800);
  });

  // Confirm button → open Amazon product
  document.getElementById("gl-modal-confirm").addEventListener("click", () => {
    window.open(ecoAlt.amazonUrl, "_blank");
    modal.remove();
  });

  // Cancel
  document.getElementById("gl-modal-cancel").addEventListener("click", () => modal.remove());

  // Click outside to close
  modal.addEventListener("click", (e) => { if (e.target === modal) modal.remove(); });
}

// ─────────────────────────────────────────────────────────────
// 7. TOP BANNER (product & search pages)
// ─────────────────────────────────────────────────────────────
function removeBanner() {
  document.getElementById("greenlens-banner")?.remove();
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
            Switch to 
            <a href="${ecoAlt.amazonUrl}" target="_blank" class="gl-link">${ecoAlt.name}</a>
            · save <span class="gl-co2">${co2Avoided}kg CO₂</span>
            · earn <span class="gl-credits">+${creditsEarned} credits</span>
            <span class="gl-cert-tag">✅ ${ecoAlt.cert}</span>
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

    showToast(`+${creditsEarned} GreenCredits! Score: ${newScore}/100 | Total: ${newCredits}`);
    btn.textContent = "✅ Earned!";
    btn.style.background = "#22c55e";

    chrome.runtime.sendMessage({
      type: "CREDIT_ADDED",
      payload: { credits: creditsEarned, co2Avoided, product: ecoAlt.name, score: newScore },
    });

    // Show GPay modal after short delay
    setTimeout(() => {
      showGPayModal(ecoAlt, co2Avoided, creditsEarned, newScore, newCredits);
    }, 600);
  });

  document.getElementById("gl-close-btn").addEventListener("click", removeBanner);
}

function injectGreenwashAlert(productLabel) {
  if (bannerInjected) return;
  bannerInjected = true;

  const banner = document.createElement("div");
  banner.id = "greenlens-banner";
  banner.innerHTML = `
    <div class="gl-banner gl-warn">
      <div class="gl-left">
        <span class="gl-leaf">⚠️</span>
        <div class="gl-text">
          <div class="gl-title">GreenLens Greenwashing Alert</div>
          <div class="gl-sub">
            <strong>${productLabel}</strong> makes eco claims but has 
            <strong>no verifiable certification</strong>. No GreenCredits awarded.
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
  msg.textContent        = message;
  toast.style.display    = "flex";
  toast.style.background = isError ? "#ef4444" : "#15803d";
  setTimeout(() => { toast.style.display = "none"; }, 5000);
}

// ─────────────────────────────────────────────────────────────
// 8. MAIN DETECTION
// ─────────────────────────────────────────────────────────────
function analyzeProduct() {
  const title = getProductTitle();
  if (!title || title === lastProductTitle) return;
  lastProductTitle = title;
  removeBanner();

  const matched = matchProduct(title);
  if (!matched) return;
  if (matched.isEco) return; // already eco, no suggestion needed

  const ecoAlt = ECO_ALTERNATIVES[matched.category];
  if (!ecoAlt) return;

  const lower    = title.toLowerCase();
  const claimsEco = ECO_CLAIM_KEYWORDS.some(k => lower.includes(k));
  const hasCert   = TRUSTED_CERTS.some(c => lower.includes(c));

  if (claimsEco && !hasCert) {
    injectGreenwashAlert(matched.label);
  } else {
    injectBanner(matched, ecoAlt);
  }
}

function runAll() {
  analyzeProduct();
  if (isSearchPage()) {
    injectSearchBadges();
  }
}

// ─────────────────────────────────────────────────────────────
// 9. OBSERVERS & INIT
// ─────────────────────────────────────────────────────────────

// Re-run badges when new search result cards load (lazy loading)
badgeObserver = new MutationObserver(() => {
  if (isSearchPage() && !badgesInjected) injectSearchBadges();
  analyzeProduct();
});
badgeObserver.observe(document.body, { childList: true, subtree: true });

// URL change watcher for SPA navigation (Amazon changes URL without reload)
let lastUrl = location.href;
setInterval(() => {
  if (location.href !== lastUrl) {
    lastUrl          = location.href;
    lastProductTitle = "";
    badgesInjected   = false;
    removeBanner();
    setTimeout(runAll, 900);
  }
}, 500);

// Initial execution at multiple delays to handle slow-loading pages
runAll();
setTimeout(runAll, 800);
setTimeout(runAll, 2500);
