// content.js – GreenCart v4: Climate Pledge Friendly detection + Token Preview

const processedAsins = new Set();
let pageProducts = [];
let currentPageSort = "eco-first";
let orderPageProcessing = false;

const GREENLENS_BASE = "https://greenlens-platform.vercel.app";

// ─── TOKEN CALCULATION (mirrors lib/tokens.ts exactly) ───────────────────────
function calcTokensFromScore(score) {
  if (score >= 80) return 20;
  if (score >= 60) return 12;
  if (score >= 40) return 5;
  return 0;
}
function tokensToRupees(tokens) {
  return (tokens * 0.1).toFixed(2);
}

// ─── CERTIFICATIONS ───────────────────────────────────────────────────────────
const CPF_CERTIFICATIONS = {
  "climate-pledge-friendly":   { label: "Climate Pledge Friendly", score: 90 },
  "compact-by-design":         { label: "Compact by Design",        score: 80 },
  "amazon-renewed":            { label: "Amazon Renewed",           score: 75 },
  "usda-organic":              { label: "USDA Organic",             score: 88 },
  "usda-biobased":             { label: "USDA Certified Biobased",  score: 82 },
  "rainforest-alliance":       { label: "Rainforest Alliance",      score: 87 },
  "fair-trade":                { label: "Fair Trade Certified",      score: 85 },
  "fairtrade-america":         { label: "Fair Trade America",        score: 85 },
  "fsc":                       { label: "FSC Certified",            score: 86 },
  "bluesign":                  { label: "bluesign",                 score: 83 },
  "oeko-tex":                  { label: "OEKO-TEX",                 score: 84 },
  "gots":                      { label: "GOTS Certified",           score: 86 },
  "responsible-wool":          { label: "Responsible Wool Standard",score: 80 },
  "responsible-down":          { label: "Responsible Down Standard",score: 80 },
  "b-corp":                    { label: "B Corp Certified",         score: 88 },
  "1-percent-for-the-planet":  { label: "1% for the Planet",        score: 78 },
  "green-seal":                { label: "Green Seal",               score: 84 },
  "ecologo":                   { label: "ECOLOGO",                  score: 83 },
  "energy-star":               { label: "ENERGY STAR",              score: 85 },
  "epeat":                     { label: "EPEAT",                    score: 84 },
  "ul-ecologo":                { label: "UL ECOLOGO",               score: 83 },
  "cradle-to-cradle":          { label: "Cradle to Cradle",         score: 88 },
  "leaping-bunny":             { label: "Leaping Bunny",            score: 80 },
  "certified-vegan":           { label: "Certified Vegan",          score: 78 },
  "made-safe":                 { label: "MADE SAFE",                score: 86 },
  "epa-safer-choice":          { label: "EPA Safer Choice",         score: 87 },
  "nordic-swan":               { label: "Nordic Swan Ecolabel",     score: 85 },
  "eu-ecolabel":               { label: "EU Ecolabel",              score: 85 },
  "carbon-neutral":            { label: "Carbon Neutral Certified", score: 88 },
  "plastic-free":              { label: "Plastic Free",             score: 82 },
  "compostable":               { label: "Certified Compostable",    score: 84 },
};

const CPF_DOM_SELECTORS = [
  '[data-component-type="s-climate-pledge-badge"]', '.s-climate-pledge-badge',
  '[class*="climate-pledge"]', '[class*="climatePledge"]',
  '#climatePledgeFriendlyBadge', '[id*="climate-pledge"]', '[id*="climatePledge"]',
  '.cpf-badge', '#sustainabilityFeatureBullets',
  '[data-feature-name="sustainabilityInitiatives"]', '[data-feature-name="cpfBadge"]',
  '.a-icon-climate-pledge-friendly', '[class*="sustainability"]',
  'img[src*="climate-pledge"]', 'img[src*="climatePledge"]',
  'img[alt*="Climate Pledge"]', 'img[alt*="climate pledge"]',
];

const CPF_TEXT_PATTERNS = [
  /climate\s*pledge\s*friendly/i, /compact\s*by\s*design/i, /carbon\s*neutral/i,
  /rainforest\s*alliance/i, /usda\s*organic/i, /fair\s*trade/i, /fsc\s*certif/i,
  /energy\s*star/i, /b\s*corp/i, /epa\s*safer/i, /oeko.?tex/i, /bluesign/i,
  /cradle\s*to\s*cradle/i, /leaping\s*bunny/i, /made\s*safe/i, /epeat/i,
  /1%?\s*for\s*the\s*planet/i,
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
async function fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function detectCPFFromDOM(container) {
  const found = [];
  for (const selector of CPF_DOM_SELECTORS) {
    const el = container.querySelector(selector);
    if (el) {
      const text = (el.alt || el.getAttribute("aria-label") || el.textContent || "").trim();
      const certKey = matchCertText(text);
      found.push(certKey || "climate-pledge-friendly");
    }
  }
  container.querySelectorAll("img[alt]").forEach(img => {
    const k = matchCertText(img.alt || "");
    if (k && !found.includes(k)) found.push(k);
  });
  container.querySelectorAll("[aria-label]").forEach(el => {
    const k = matchCertText(el.getAttribute("aria-label") || "");
    if (k && !found.includes(k)) found.push(k);
  });
  container.querySelectorAll("span, .a-badge-text, .a-badge-label").forEach(el => {
    const text = (el.textContent || "").trim();
    if (text.length > 0 && text.length < 80) {
      const k = matchCertText(text);
      if (k && !found.includes(k)) found.push(k);
    }
  });
  return [...new Set(found)];
}

function matchCertText(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const key of Object.keys(CPF_CERTIFICATIONS)) {
    if (lower.includes(key.replace(/-/g, " ")) || lower.includes(key)) return key;
  }
  for (const pattern of CPF_TEXT_PATTERNS) {
    if (pattern.test(text)) {
      if (/climate\s*pledge/i.test(text))      return "climate-pledge-friendly";
      if (/compact\s*by\s*design/i.test(text)) return "compact-by-design";
      if (/carbon\s*neutral/i.test(text))      return "carbon-neutral";
      if (/rainforest/i.test(text))            return "rainforest-alliance";
      if (/usda/i.test(text))                  return "usda-organic";
      if (/fair\s*trade/i.test(text))          return "fair-trade";
      if (/fsc/i.test(text))                   return "fsc";
      if (/energy\s*star/i.test(text))         return "energy-star";
      if (/b\s*corp/i.test(text))              return "b-corp";
      if (/epa\s*safer/i.test(text))           return "epa-safer-choice";
      if (/oeko/i.test(text))                  return "oeko-tex";
      if (/bluesign/i.test(text))              return "bluesign";
      if (/cradle/i.test(text))                return "cradle-to-cradle";
      if (/leaping/i.test(text))               return "leaping-bunny";
      if (/made\s*safe/i.test(text))           return "made-safe";
      if (/epeat/i.test(text))                 return "epeat";
      if (/1%|one percent/i.test(text))        return "1-percent-for-the-planet";
    }
  }
  return null;
}

function calcScore(certKeys) {
  if (certKeys.length === 0) return 0;
  const scores = certKeys.map(k => CPF_CERTIFICATIONS[k]?.score || 75);
  const max = Math.max(...scores);
  const bonus = Math.min(10, (certKeys.length - 1) * 3);
  return Math.min(100, max + bonus);
}

function getPageType() {
  if (document.querySelector('[data-component-type="s-search-result"]')) return "search";
  if (document.querySelector("#dp") || document.querySelector("#ppd")) return "product";
  if (
    window.location.href.includes("/orderconfirm") ||
    window.location.href.includes("/order-confirm") ||
    window.location.href.includes("thankyou") ||
    window.location.href.includes("/gp/buy/thankyou") ||
    window.location.href.includes("/gp/checkout/confirm") ||
    document.querySelector("#thankyou-page") ||
    document.querySelector(".a-fixed-right-grid #orderDetails") ||
    document.title.toLowerCase().includes("order confirmed") ||
    document.title.toLowerCase().includes("thank you")
  ) return "order";
  if (
    window.location.href.includes("/cart") ||
    window.location.href.includes("/gp/cart") ||
    document.querySelector("#sc-active-cart") ||
    document.querySelector(".sc-list-body")
  ) return "cart";
  return "unknown";
}

function parsePrice(el) {
  if (!el) return null;
  const match = (el.innerText || el.textContent || "").replace(/[^\d.]/g, "").match(/\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : null;
}

function saveProductsToStorage(products) {
  chrome.storage.local.set({
    gcPageProducts: products,
    gcTimestamp: Date.now(),
    gcPageHost: window.location.hostname,
  });
}

// ─── SEARCH CARD BADGE — shows eco score + token preview ─────────────────────
function injectTokenPreviewBadge(container, score, certKeys) {
  if (!container || container.querySelector(".gc-badge")) return;
  const tokens = calcTokensFromScore(score);
  const rupees = tokensToRupees(tokens);
  const primaryCert = certKeys.length > 0
    ? (CPF_CERTIFICATIONS[certKeys[0]]?.label || certKeys[0])
    : "Climate Pledge Friendly";

  const badge = document.createElement("div");
  badge.className = "gc-badge";
  badge.title = certKeys.map(k => CPF_CERTIFICATIONS[k]?.label || k).join(", ");
  badge.innerHTML = `
    <span class="gc-badge-icon">🌿</span>
    <span class="gc-badge-label">Eco ${score}%</span>
    <span class="gc-badge-sep">·</span>
    <span class="gc-badge-tokens">+${tokens} tokens</span>
    <span class="gc-badge-sep">·</span>
    <span class="gc-badge-rupees">₹${rupees}</span>
  `;
  const imageWrapper =
    container.querySelector(".s-image-container") ||
    container.querySelector(".imgTagWrapper") ||
    container.querySelector("img")?.closest("div") ||
    container;
  imageWrapper.style.position = "relative";
  imageWrapper.appendChild(badge);
}

// ─── PRODUCT DETAIL BANNER — shows score + token reward preview ───────────────
function injectProductDetailTokenBanner(score, certKeys) {
  if (document.querySelector(".gc-detail-banner")) return;
  const tokens  = calcTokensFromScore(score);
  const rupees  = tokensToRupees(tokens);
  const certLabels = certKeys.map(k => CPF_CERTIFICATIONS[k]?.label || k);
  const titleContainer = document.querySelector("#titleSection, #title");
  if (!titleContainer) return;

  const banner = document.createElement("div");
  banner.className = "gc-detail-banner";
  banner.innerHTML = `
    <div class="gc-banner-left">
      <span class="gc-banner-icon">🌿</span>
      <div>
        <div class="gc-banner-title">Climate Pledge Friendly</div>
        <div class="gc-banner-certs">
          ${certLabels.map(c => `<span class="gc-cert-chip">${c}</span>`).join("")}
        </div>
      </div>
    </div>
    <div class="gc-banner-right">
      <div class="gc-banner-score">${score}<span>/ 100</span></div>
      <div class="gc-token-preview">
        <span class="gc-token-num">+${tokens}</span>
        <span class="gc-token-label">tokens if you buy</span>
        <span class="gc-token-rupees">= ₹${rupees}</span>
      </div>
    </div>
  `;
  titleContainer.insertAdjacentElement("afterend", banner);
}

// ─── CART SUMMARY BANNER — cumulative tokens across all eco items in cart ─────
function injectCartTokenSummary() {
  if (document.querySelector(".gc-cart-summary")) return;

  const cartItems = document.querySelectorAll(
    ".sc-list-item[data-asin], [data-asin].sc-item-content, .sc-item-content"
  );

  let totalTokens = 0;
  let ecoItemCount = 0;
  const ecoItems = [];

  cartItems.forEach(item => {
    const asin = item.getAttribute("data-asin") ||
      item.closest("[data-asin]")?.getAttribute("data-asin");

    // Try matching against already-scanned products first
    const knownProduct = pageProducts.find(p => p.asin === asin);
    if (knownProduct?.isSustainable) {
      const tokens = calcTokensFromScore(knownProduct.score);
      totalTokens += tokens;
      ecoItemCount++;
      ecoItems.push({ name: knownProduct.name, tokens, score: knownProduct.score });
      return;
    }

    // Fallback: scan the cart item DOM directly for CPF markers
    const certKeys = detectCPFFromDOM(item);
    if (certKeys.length > 0) {
      const score  = calcScore(certKeys);
      const tokens = calcTokensFromScore(score);
      totalTokens += tokens;
      ecoItemCount++;
      const nameEl = item.querySelector(".sc-product-title, .a-truncate-full, a[href*='/dp/']");
      const name   = nameEl?.innerText?.trim() || "Eco Product";
      ecoItems.push({ name, tokens, score });
    }
  });

  if (totalTokens === 0) return;

  const totalRupees = tokensToRupees(totalTokens);

  // Save pending cart tokens so popup can show them
  chrome.storage.local.set({
    gcCartPendingTokens: totalTokens,
    gcCartEcoItems: ecoItemCount,
    gcCartRupees: totalRupees,
  });

  const cartContainer =
    document.querySelector("#sc-active-cart") ||
    document.querySelector(".sc-list-body") ||
    document.querySelector("#activeCartViewForm");
  if (!cartContainer) return;

  const summary = document.createElement("div");
  summary.className = "gc-cart-summary";
  summary.innerHTML = `
    <div class="gc-cart-summary-inner">
      <div class="gc-cart-summary-left">
        <span class="gc-cart-icon">🌿</span>
        <div class="gc-cart-summary-text">
          <span class="gc-cart-title">Green Tokens on this order</span>
          <span class="gc-cart-sub">
            ${ecoItemCount} eco-certified item${ecoItemCount > 1 ? "s" : ""} in your cart
          </span>
        </div>
      </div>
      <div class="gc-cart-summary-right">
        <span class="gc-cart-tokens">+${totalTokens}</span>
        <span class="gc-cart-tokens-label">tokens</span>
        <span class="gc-cart-rupees">= ₹${totalRupees}</span>
      </div>
    </div>
    ${ecoItems.length > 1 ? `
      <div class="gc-cart-breakdown">
        ${ecoItems.map(item => `
          <div class="gc-cart-breakdown-row">
            <span class="gc-cart-breakdown-name">
              ${item.name.slice(0, 55)}${item.name.length > 55 ? "…" : ""}
            </span>
            <span class="gc-cart-breakdown-tokens">+${item.tokens} tokens</span>
          </div>
        `).join("")}
      </div>
    ` : ""}
  `;

  cartContainer.insertBefore(summary, cartContainer.firstChild);
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
  if (resultsGrid) resultsGrid.parentElement.insertBefore(toolbar, resultsGrid);

  toolbar.querySelectorAll(".gc-sort-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      toolbar.querySelectorAll(".gc-sort-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentPageSort = btn.dataset.sort;
      sortCardsOnPage(currentPageSort);
    });
  });
}

function sortCardsOnPage(sortType) {
  const allCards = Array.from(
    document.querySelectorAll('[data-component-type="s-search-result"], .s-result-item[data-asin]')
  );
  if (allCards.length === 0) return;

  const dataMap = new Map(pageProducts.map(p => [p.asin, p]));
  allCards.forEach((card, i) => {
    if (!card.getAttribute("data-gc-original-order"))
      card.setAttribute("data-gc-original-order", i);
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
      return diff !== 0 ? diff : (bD?.score || 0) - (aD?.score || 0);
    });
  } else if (sortType === "price-low") {
    sorted = allCards.slice().sort((a, b) => {
      const aD = dataMap.get(a.getAttribute("data-asin"));
      const bD = dataMap.get(b.getAttribute("data-asin"));
      const diff = (bD?.isSustainable ? 1 : 0) - (aD?.isSustainable ? 1 : 0);
      return diff !== 0 ? diff : (aD?.price || 9999) - (bD?.price || 9999);
    });
  } else if (sortType === "price-high") {
    sorted = allCards.slice().sort((a, b) => {
      const aD = dataMap.get(a.getAttribute("data-asin"));
      const bD = dataMap.get(b.getAttribute("data-asin"));
      const diff = (bD?.isSustainable ? 1 : 0) - (aD?.isSustainable ? 1 : 0);
      return diff !== 0 ? diff : (bD?.price || 0) - (aD?.price || 0);
    });
  }

  if (!sorted) return;
  sorted.forEach(card => card.parentElement?.appendChild(card));
}

// ─── PAGE PROCESSORS ──────────────────────────────────────────────────────────
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

    const titleEl =
      card.querySelector("h2 .a-text-normal") || card.querySelector("h2 span") ||
      card.querySelector(".a-size-medium.a-color-base.a-text-normal") ||
      card.querySelector(".a-size-base-plus") || card.querySelector("h2");
    const priceEl =
      card.querySelector(".a-price .a-offscreen") ||
      card.querySelector(".a-price-whole") || card.querySelector(".a-price");
    const imageEl = card.querySelector(".s-image, img.s-image");
    const linkEl  = card.querySelector("a.a-link-normal[href*='/dp/']") || card.querySelector("h2 a");

    const productName = titleEl?.innerText?.trim() || titleEl?.textContent?.trim() || "";
    const price       = parsePrice(priceEl);
    if (!productName || productName.length < 3) continue;

    const certKeys      = detectCPFFromDOM(card);
    const isSustainable = certKeys.length > 0;
    const score         = calcScore(certKeys);
    const certLabels    = certKeys.map(k => CPF_CERTIFICATIONS[k]?.label || k);
    const tokens        = isSustainable ? calcTokensFromScore(score) : 0;

    const productData = {
      asin, name: productName, price, score, isSustainable,
      certifications: certLabels, certKeys,
      image: imageEl?.src || "",
      url: linkEl?.href || `https://amazon.in/dp/${asin}`,
      tokens,
      tokenRupees: tokensToRupees(tokens),
    };
    pageProducts.push(productData);

    if (isSustainable) {
      injectTokenPreviewBadge(card, score, certKeys);
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

  const scanRoot      = document.querySelector("#ppd, #dp, body");
  const certKeys      = detectCPFFromDOM(scanRoot || document.body);
  const isSustainable = certKeys.length > 0;
  const score         = calcScore(certKeys);
  const certLabels    = certKeys.map(k => CPF_CERTIFICATIONS[k]?.label || k);
  const tokens        = isSustainable ? calcTokensFromScore(score) : 0;

  saveProductsToStorage([{
    asin, name: productName, price, score, isSustainable,
    certifications: certLabels, certKeys,
    url: window.location.href,
    tokens, tokenRupees: tokensToRupees(tokens),
  }]);

  if (isSustainable) {
    const imageContainer = document.querySelector("#imgTagWrapperId, #imageBlock, #img-canvas");
    if (imageContainer) {
      imageContainer.style.position = "relative";
      injectTokenPreviewBadge(imageContainer, score, certKeys);
    }
    injectProductDetailTokenBanner(score, certKeys);
  }
}

function processCartPage() {
  chrome.storage.local.get(["gcPageProducts"], result => {
    if (result.gcPageProducts?.length > 0) pageProducts = result.gcPageProducts;
    injectCartTokenSummary();
  });
}

// ─── ORDER CONFIRMATION ───────────────────────────────────────────────────────
async function getGreenLensUserId() {
  try {
    const res = await fetchWithTimeout(`${GREENLENS_BASE}/api/user`, { credentials: "include" }, 5000);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.id || null;
  } catch (e) { return null; }
}

function extractOrderProducts() {
  const products = [];
  const rows = document.querySelectorAll(
    ".a-fixed-right-grid, .shipment-info-container .a-box, #orderDetails .a-box"
  );
  rows.forEach(row => {
    const nameEl =
      row.querySelector(".a-truncate-full, .a-text-bold, a[href*='/dp/']") ||
      row.querySelector("span.a-text-bold") || row.querySelector("a[href*='dp']");
    const priceEl =
      row.querySelector(".a-price .a-offscreen") ||
      row.querySelector(".a-price-whole") || row.querySelector("[class*='price']");
    const asinMatch = row.innerHTML?.match(/\/dp\/([A-Z0-9]{10})/);
    const asin  = asinMatch?.[1];
    const name  = nameEl?.innerText?.trim() || nameEl?.textContent?.trim();
    const price = parsePrice(priceEl) || 0;
    if (name && name.length > 3) {
      const certKeys = detectCPFFromDOM(row);
      const score    = certKeys.length > 0 ? calcScore(certKeys) : 0;
      products.push({ asin, name, price, score, certKeys, tokens: calcTokensFromScore(score) });
    }
  });
  if (products.length === 0) {
    document.querySelectorAll("a[href*='/dp/']").forEach(link => {
      const asinMatch = link.href.match(/\/dp\/([A-Z0-9]{10})/);
      const asin = asinMatch?.[1];
      const name = link.innerText?.trim() || link.textContent?.trim();
      if (asin && name && name.length > 3 && !products.find(p => p.asin === asin)) {
        const row      = link.closest("div") || document.body;
        const certKeys = detectCPFFromDOM(row);
        const score    = certKeys.length > 0 ? calcScore(certKeys) : 0;
        products.push({ asin, name, price: 0, score, certKeys, tokens: calcTokensFromScore(score) });
      }
    });
  }
  return products;
}

function stableExternalId(asin) {
  const urlSlug = btoa(window.location.href).replace(/[^A-Za-z0-9]/g, "").slice(0, 12);
  return asin
    ? `${asin}-${urlSlug}`
    : `order-${urlSlug}-${Math.random().toString(36).slice(2, 7)}`;
}

async function processOrderPage() {
  if (orderPageProcessing) return;
  orderPageProcessing = true;
  try {
    const alreadyProcessed = await new Promise(resolve => {
      chrome.storage.local.get(["gcOrderProcessed"], r => {
        resolve(r.gcOrderProcessed === window.location.href);
      });
    });
    if (alreadyProcessed) return;

    chrome.storage.local.set({ gcOrderProcessed: window.location.href });

    const userId = await getGreenLensUserId();
    if (!userId) return;

    const products = extractOrderProducts();
    if (products.length === 0) return;

    let totalTokensEarned = 0;

    for (const product of products) {
      if (product.score === 0) continue;
      try {
        const res = await fetchWithTimeout(
          `${GREENLENS_BASE}/api/purchase`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              userId,
              productName: product.name,
              price: product.price,
              sustainabilityScore: product.score,
              externalId: stableExternalId(product.asin),
            }),
          },
          8000
        );
        if (res.ok) {
          const data = await res.json();
          totalTokensEarned += data.tokensEarned || 0;
        }
      } catch (e) {
        console.error("GreenCart: Failed to post purchase:", e);
      }
    }

    // Clear cart pending state now the order is placed
    chrome.storage.local.remove(["gcCartPendingTokens", "gcCartEcoItems", "gcCartRupees"]);

    if (totalTokensEarned > 0) showTokenToast(totalTokensEarned);
  } finally {
    orderPageProcessing = false;
  }
}

function showTokenToast(tokens) {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes gcSlideIn {
      from { transform: translateX(120%); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }
  `;
  document.head.appendChild(style);
  const toast = document.createElement("div");
  toast.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:99999;
    background:linear-gradient(135deg,#0d5c2e,#1a8a47);
    color:#fff;padding:14px 20px;border-radius:12px;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    font-size:14px;font-weight:600;
    box-shadow:0 4px 24px rgba(13,92,46,0.4);
    display:flex;align-items:center;gap:10px;
    animation:gcSlideIn 0.4s ease;
  `;
  toast.innerHTML = `
    <span style="font-size:24px">🌿</span>
    <div>
      <div style="font-size:15px;font-weight:700">+${tokens} Green Tokens Earned!</div>
      <div style="font-size:11px;opacity:0.8;margin-top:2px">
        ₹${tokensToRupees(tokens)} added to your GreenLens wallet
      </div>
    </div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = "opacity 0.5s ease";
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 500);
  }, 6000);
}

// ─── MUTATION OBSERVER ────────────────────────────────────────────────────────
let debounceTimer;
const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const pageType = getPageType();
    if (pageType === "search")  processSearchResults();
    if (pageType === "cart")    injectCartTokenSummary();
    if (pageType === "order")   processOrderPage();
  }, 700);
});
observer.observe(document.body, { childList: true, subtree: true });

// ─── INIT ─────────────────────────────────────────────────────────────────────
(function init() {
  chrome.storage.local.get(["gcTimestamp"], result => {
    const ageSeconds = (Date.now() - (result.gcTimestamp || 0)) / 1000;
    if (ageSeconds > 90) chrome.storage.local.remove(["gcPageProducts", "gcTimestamp"]);
  });

  const pageType = getPageType();
  if (pageType === "search")       setTimeout(processSearchResults, 1000);
  else if (pageType === "product") setTimeout(processProductPage, 800);
  else if (pageType === "cart")    setTimeout(processCartPage, 1000);
  else if (pageType === "order")   setTimeout(processOrderPage, 1500);
})();