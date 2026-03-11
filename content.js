// content.js – GreenCart v4: Climate Pledge Friendly detection from Amazon's own DOM

const processedAsins = new Set();
let pageProducts = [];
let currentPageSort = "eco-first";

// ─── ALL AMAZON CLIMATE PLEDGE FRIENDLY CERTIFICATIONS ───────────────────────
// Source: amazon.com/climatepleadgefriendly & amazon.in CPF program
const CPF_CERTIFICATIONS = {
  // Amazon's own labels
  "climate-pledge-friendly":        { label: "Climate Pledge Friendly", score: 90 },
  "compact-by-design":              { label: "Compact by Design",        score: 80 },
  "amazon-renewed":                 { label: "Amazon Renewed",           score: 75 },

  // Third-party certs Amazon recognises
  "usda-organic":                   { label: "USDA Organic",             score: 88 },
  "usda-biobased":                  { label: "USDA Certified Biobased",  score: 82 },
  "rainforest-alliance":            { label: "Rainforest Alliance",      score: 87 },
  "fair-trade":                     { label: "Fair Trade Certified",      score: 85 },
  "fairtrade-america":              { label: "Fair Trade America",        score: 85 },
  "fsc":                            { label: "FSC Certified",            score: 86 },
  "bluesign":                       { label: "bluesign",                 score: 83 },
  "oeko-tex":                       { label: "OEKO-TEX",                 score: 84 },
  "gots":                           { label: "GOTS Certified",           score: 86 },
  "responsible-wool":               { label: "Responsible Wool Standard",score: 80 },
  "responsible-down":               { label: "Responsible Down Standard",score: 80 },
  "b-corp":                         { label: "B Corp Certified",         score: 88 },
  "1-percent-for-the-planet":       { label: "1% for the Planet",        score: 78 },
  "green-seal":                     { label: "Green Seal",               score: 84 },
  "ecologo":                        { label: "ECOLOGO",                  score: 83 },
  "energy-star":                    { label: "ENERGY STAR",              score: 85 },
  "epeat":                          { label: "EPEAT",                    score: 84 },
  "ul-ecologo":                     { label: "UL ECOLOGO",               score: 83 },
  "cradle-to-cradle":               { label: "Cradle to Cradle",         score: 88 },
  "leaping-bunny":                  { label: "Leaping Bunny",            score: 80 },
  "certified-vegan":                { label: "Certified Vegan",          score: 78 },
  "made-safe":                      { label: "MADE SAFE",                score: 86 },
  "epa-safer-choice":               { label: "EPA Safer Choice",         score: 87 },
  "nordic-swan":                    { label: "Nordic Swan Ecolabel",     score: 85 },
  "eu-ecolabel":                    { label: "EU Ecolabel",              score: 85 },
  "carbon-neutral":                 { label: "Carbon Neutral Certified", score: 88 },
  "plastic-free":                   { label: "Plastic Free",             score: 82 },
  "compostable":                    { label: "Certified Compostable",    score: 84 },
};

// DOM selectors Amazon uses to render CPF badges (search + detail pages)
const CPF_DOM_SELECTORS = [
  // Main CPF badge container on search cards
  '[data-component-type="s-climate-pledge-badge"]',
  '.s-climate-pledge-badge',
  '[class*="climate-pledge"]',
  '[class*="climatePledge"]',

  // CPF on product detail pages
  '#climatePledgeFriendlyBadge',
  '[id*="climate-pledge"]',
  '[id*="climatePledge"]',
  '.cpf-badge',

  // Sustainability label section on detail pages
  '#sustainabilityFeatureBullets',
  '[data-feature-name="sustainabilityInitiatives"]',
  '[data-feature-name="cpfBadge"]',

  // Alt class Amazon uses for the leaf icon area
  '.a-icon-climate-pledge-friendly',
  '[class*="sustainability"]',
  'img[src*="climate-pledge"]',
  'img[src*="climatePledge"]',
  'img[alt*="Climate Pledge"]',
  'img[alt*="climate pledge"]',
];

// Text patterns Amazon uses in CPF labels
const CPF_TEXT_PATTERNS = [
  /climate\s*pledge\s*friendly/i,
  /compact\s*by\s*design/i,
  /carbon\s*neutral/i,
  /rainforest\s*alliance/i,
  /usda\s*organic/i,
  /fair\s*trade/i,
  /fsc\s*certif/i,
  /energy\s*star/i,
  /b\s*corp/i,
  /epa\s*safer/i,
  /oeko.?tex/i,
  /bluesign/i,
  /cradle\s*to\s*cradle/i,
  /leaping\s*bunny/i,
  /made\s*safe/i,
  /epeat/i,
  /1%?\s*for\s*the\s*planet/i,
];

// ─── DETECT CPF FROM A PRODUCT CARD / CONTAINER ──────────────────────────────
function detectCPFFromDOM(container) {
  const found = [];

  // 1. Check for Amazon's CPF badge elements
  for (const selector of CPF_DOM_SELECTORS) {
    const el = container.querySelector(selector);
    if (el) {
      // Try to extract which specific cert it is from alt text, aria-label, or text
      const text = (el.alt || el.getAttribute("aria-label") || el.textContent || "").trim();
      const certKey = matchCertText(text);
      if (certKey) {
        found.push(certKey);
      } else {
        // Generic CPF badge found even if we can't identify specific cert
        found.push("climate-pledge-friendly");
      }
    }
  }

  // 2. Scan all img alt texts for cert names
  container.querySelectorAll("img[alt]").forEach(img => {
    const alt = img.alt || "";
    const certKey = matchCertText(alt);
    if (certKey && !found.includes(certKey)) found.push(certKey);
  });

  // 3. Scan aria-labels
  container.querySelectorAll("[aria-label]").forEach(el => {
    const label = el.getAttribute("aria-label") || "";
    const certKey = matchCertText(label);
    if (certKey && !found.includes(certKey)) found.push(certKey);
  });

  // 4. Check text content of small label/span elements (CPF cert names)
  container.querySelectorAll("span, .a-badge-text, .a-badge-label").forEach(el => {
    // Only look at short text nodes (cert names are short)
    const text = (el.textContent || "").trim();
    if (text.length > 0 && text.length < 80) {
      const certKey = matchCertText(text);
      if (certKey && !found.includes(certKey)) found.push(certKey);
    }
  });

  return [...new Set(found)]; // dedupe
}

function matchCertText(text) {
  if (!text) return null;
  const lower = text.toLowerCase();

  // Direct key match
  for (const key of Object.keys(CPF_CERTIFICATIONS)) {
    if (lower.includes(key.replace(/-/g, " ")) || lower.includes(key)) {
      return key;
    }
  }

  // Pattern match
  for (const pattern of CPF_TEXT_PATTERNS) {
    if (pattern.test(text)) {
      // Map back to a key
      if (/climate\s*pledge/i.test(text)) return "climate-pledge-friendly";
      if (/compact\s*by\s*design/i.test(text)) return "compact-by-design";
      if (/carbon\s*neutral/i.test(text)) return "carbon-neutral";
      if (/rainforest/i.test(text)) return "rainforest-alliance";
      if (/usda/i.test(text)) return "usda-organic";
      if (/fair\s*trade/i.test(text)) return "fair-trade";
      if (/fsc/i.test(text)) return "fsc";
      if (/energy\s*star/i.test(text)) return "energy-star";
      if (/b\s*corp/i.test(text)) return "b-corp";
      if (/epa\s*safer/i.test(text)) return "epa-safer-choice";
      if (/oeko/i.test(text)) return "oeko-tex";
      if (/bluesign/i.test(text)) return "bluesign";
      if (/cradle/i.test(text)) return "cradle-to-cradle";
      if (/leaping/i.test(text)) return "leaping-bunny";
      if (/made\s*safe/i.test(text)) return "made-safe";
      if (/epeat/i.test(text)) return "epeat";
      if (/1%|one percent/i.test(text)) return "1-percent-for-the-planet";
    }
  }

  return null;
}

// Calculate eco score from certs found
function calcScore(certKeys) {
  if (certKeys.length === 0) return 0;
  const scores = certKeys.map(k => CPF_CERTIFICATIONS[k]?.score || 75);
  const max = Math.max(...scores);
  const bonus = Math.min(10, (certKeys.length - 1) * 3); // multi-cert bonus
  return Math.min(100, max + bonus);
}

// ─── PAGE TYPE ────────────────────────────────────────────────────────────────
function getPageType() {
  if (document.querySelector('[data-component-type="s-search-result"]')) return "search";
  if (document.querySelector("#dp") || document.querySelector("#ppd")) return "product";
  return "unknown";
}

// ─── PRICE PARSER ─────────────────────────────────────────────────────────────
function parsePrice(el) {
  if (!el) return null;
  const text = el.innerText || el.textContent || "";
  const cleaned = text.replace(/[^\d.]/g, "");
  const match = cleaned.match(/\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : null;
}

// ─── BADGE INJECTION ──────────────────────────────────────────────────────────
function injectBadge(container, score, certKeys) {
  if (!container || container.querySelector(".gc-badge")) return;

  const primaryCert = certKeys.length > 0
    ? (CPF_CERTIFICATIONS[certKeys[0]]?.label || certKeys[0])
    : "Climate Pledge Friendly";

  const badge = document.createElement("div");
  badge.className = "gc-badge";
  badge.title = certKeys.map(k => CPF_CERTIFICATIONS[k]?.label || k).join(", ");
  badge.innerHTML = `
    <span class="gc-badge-icon">🌿</span>
    <span class="gc-badge-label">Eco ${score}%</span>
    <span class="gc-badge-cert">${primaryCert}</span>
  `;

  const imageWrapper =
    container.querySelector(".s-image-container") ||
    container.querySelector(".imgTagWrapper") ||
    container.querySelector("img")?.closest("div") ||
    container;

  imageWrapper.style.position = "relative";
  imageWrapper.appendChild(badge);
}

// ─── SORT TOOLBAR ─────────────────────────────────────────────────────────────
function injectSortToolbar() {
  if (document.querySelector(".gc-sort-toolbar")) return;
  const toolbar = document.createElement("div");
  toolbar.className = "gc-sort-toolbar";
  toolbar.innerHTML = `
    <div class="gc-sort-inner">
      <span class="gc-sort-label">🌿 GreenCart Sort:</span>
      <div class="gc-sort-buttons">
        <button class="gc-sort-btn active" data-sort="eco-first">🌿 Eco First</button>
        <button class="gc-sort-btn" data-sort="price-low">💰 Price Low→High</button>
        <button class="gc-sort-btn" data-sort="price-high">💰 Price High→Low</button>
        <button class="gc-sort-btn" data-sort="original">↩ Original Order</button>
      </div>
      <span class="gc-sort-status" id="gcSortStatus">Scanning…</span>
    </div>
  `;
  const resultsGrid =
    document.querySelector(".s-search-results") ||
    document.querySelector('[data-component-type="s-search-results"]') ||
    document.querySelector(".s-result-list");
  if (resultsGrid) {
    resultsGrid.parentElement.insertBefore(toolbar, resultsGrid);
  }
  toolbar.querySelectorAll(".gc-sort-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      toolbar.querySelectorAll(".gc-sort-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentPageSort = btn.dataset.sort;
      sortCardsOnPage(currentPageSort);
    });
  });
}

// ─── SORT CARDS ON PAGE ───────────────────────────────────────────────────────
function sortCardsOnPage(sortType) {
  const allCards = Array.from(
    document.querySelectorAll('[data-component-type="s-search-result"], .s-result-item[data-asin]')
  );
  if (allCards.length === 0) return;

  const dataMap = new Map(pageProducts.map(p => [p.asin, p]));
  allCards.forEach((card, i) => {
    if (!card.getAttribute("data-gc-original-order")) {
      card.setAttribute("data-gc-original-order", i);
    }
  });

  let sorted;
  if (sortType === "original") {
    sorted = allCards.slice().sort((a, b) =>
      parseInt(a.getAttribute("data-gc-original-order")) - parseInt(b.getAttribute("data-gc-original-order"))
    );
  } else if (sortType === "eco-first") {
    sorted = allCards.slice().sort((a, b) => {
      const aD = dataMap.get(a.getAttribute("data-asin"));
      const bD = dataMap.get(b.getAttribute("data-asin"));
      const diff = (bD?.isSustainable ? 1 : 0) - (aD?.isSustainable ? 1 : 0);
      if (diff !== 0) return diff;
      return (bD?.score || 0) - (aD?.score || 0);
    });
  } else if (sortType === "price-low") {
    sorted = allCards.slice().sort((a, b) => {
      const aD = dataMap.get(a.getAttribute("data-asin"));
      const bD = dataMap.get(b.getAttribute("data-asin"));
      const diff = (bD?.isSustainable ? 1 : 0) - (aD?.isSustainable ? 1 : 0);
      if (diff !== 0) return diff;
      return (aD?.price || 9999) - (bD?.price || 9999);
    });
  } else if (sortType === "price-high") {
    sorted = allCards.slice().sort((a, b) => {
      const aD = dataMap.get(a.getAttribute("data-asin"));
      const bD = dataMap.get(b.getAttribute("data-asin"));
      const diff = (bD?.isSustainable ? 1 : 0) - (aD?.isSustainable ? 1 : 0);
      if (diff !== 0) return diff;
      return (bD?.price || 0) - (aD?.price || 0);
    });
  }

  sorted.forEach(card => card.parentElement?.appendChild(card));
}

// ─── STORAGE ──────────────────────────────────────────────────────────────────
function saveProductsToStorage(products) {
  chrome.storage.local.set({ gcPageProducts: products, gcTimestamp: Date.now() });
}

// ─── PROCESS SEARCH RESULTS ───────────────────────────────────────────────────
function processSearchResults() {
  injectSortToolbar();

  const cards = document.querySelectorAll(
    '[data-component-type="s-search-result"], .s-result-item[data-asin]'
  );

  let newCount = 0;

  for (const card of cards) {
    const asin = card.getAttribute("data-asin");
    if (!asin || processedAsins.has(asin)) continue;
    processedAsins.add(asin);
    newCount++;

    // ── Core data extraction ──
    const titleEl =
      card.querySelector("h2 .a-text-normal") ||
      card.querySelector("h2 span") ||
      card.querySelector(".a-size-medium.a-color-base.a-text-normal") ||
      card.querySelector(".a-size-base-plus") ||
      card.querySelector("h2");

    const priceEl =
      card.querySelector(".a-price .a-offscreen") ||
      card.querySelector(".a-price-whole") ||
      card.querySelector(".a-price");

    const imageEl = card.querySelector(".s-image, img.s-image");
    const linkEl  = card.querySelector("a.a-link-normal[href*='/dp/']") || card.querySelector("h2 a");

    const productName = titleEl?.innerText?.trim() || titleEl?.textContent?.trim() || "";
    const price       = parsePrice(priceEl);
    if (!productName || productName.length < 3) continue;

    // ── CPF Detection: read Amazon's own DOM ──
    const certKeys     = detectCPFFromDOM(card);
    const isSustainable = certKeys.length > 0;
    const score        = calcScore(certKeys);
    const certLabels   = certKeys.map(k => CPF_CERTIFICATIONS[k]?.label || k);

    const productData = {
      asin, name: productName, price, score, isSustainable,
      certifications: certLabels,
      certKeys,
      image: imageEl?.src || "",
      url: linkEl?.href || `https://amazon.in/dp/${asin}`
    };

    pageProducts.push(productData);

    if (isSustainable) {
      injectBadge(card, score, certKeys);
      card.setAttribute("data-gc-sustainable", "true");
    }
  }

  if (newCount > 0 || pageProducts.length > 0) {
    saveProductsToStorage(pageProducts);
    const ecoCount = pageProducts.filter(p => p.isSustainable).length;
    const statusEl = document.getElementById("gcSortStatus");
    if (statusEl) statusEl.textContent = `${ecoCount} CPF products found`;
    sortCardsOnPage(currentPageSort);
  }
}

// ─── PROCESS PRODUCT DETAIL PAGE ─────────────────────────────────────────────
function processProductPage() {
  const asin =
    document.querySelector("#ASIN")?.value ||
    window.location.pathname.match(/\/dp\/([A-Z0-9]+)/i)?.[1];

  const titleEl = document.querySelector("#productTitle, #title span");
  const priceEl =
    document.querySelector(".a-price .a-offscreen") ||
    document.querySelector("#priceblock_ourprice") ||
    document.querySelector("#priceblock_dealprice") ||
    document.querySelector(".a-price-whole");

  const productName = titleEl?.innerText?.trim() || "";
  const price       = parsePrice(priceEl);
  if (!productName) return;

  // Scan the whole page for CPF badges (detail pages show them in multiple places)
  const scanRoot = document.querySelector("#ppd, #dp, body");
  const certKeys = detectCPFFromDOM(scanRoot || document.body);
  const isSustainable = certKeys.length > 0;
  const score = calcScore(certKeys);
  const certLabels = certKeys.map(k => CPF_CERTIFICATIONS[k]?.label || k);

  saveProductsToStorage([{
    asin, name: productName, price, score, isSustainable,
    certifications: certLabels, certKeys, url: window.location.href
  }]);

  if (isSustainable) {
    // Badge on image
    const imageContainer = document.querySelector("#imgTagWrapperId, #imageBlock, #img-canvas");
    if (imageContainer) {
      imageContainer.style.position = "relative";
      injectBadge(imageContainer, score, certKeys);
    }

    // Info banner below title
    const titleContainer = document.querySelector("#titleSection, #title");
    if (titleContainer && !document.querySelector(".gc-detail-banner")) {
      const banner = document.createElement("div");
      banner.className = "gc-detail-banner";
      banner.innerHTML = `
        <div class="gc-banner-left">
          <span class="gc-banner-icon">🌿</span>
          <div>
            <div class="gc-banner-title">Climate Pledge Friendly</div>
            <div class="gc-banner-certs">${certLabels.map(c => `<span class="gc-cert-chip">${c}</span>`).join("")}</div>
          </div>
        </div>
        <div class="gc-banner-score">${score}<span>/ 100</span></div>
      `;
      titleContainer.insertAdjacentElement("afterend", banner);
    }
  }
}

// ─── MUTATION OBSERVER ────────────────────────────────────────────────────────
let debounceTimer;
const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (getPageType() === "search") processSearchResults();
  }, 700);
});
observer.observe(document.body, { childList: true, subtree: true });

// ─── INIT ─────────────────────────────────────────────────────────────────────
(function init() {
  chrome.storage.local.remove(["gcPageProducts", "gcTimestamp"]);
  const pageType = getPageType();
  if (pageType === "search") setTimeout(processSearchResults, 1000);
  else if (pageType === "product") setTimeout(processProductPage, 800);
})();
