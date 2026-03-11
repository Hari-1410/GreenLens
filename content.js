// content.js – GreenCart v5
// KEY FIX: userId is read from chrome.storage (set by background.js after login)
// instead of calling /api/user with credentials:include, which browsers block
// when CORS Allow-Origin is wildcard (*).
// Token crediting fires on Add-to-Cart click (product page), not just order confirm.

const processedAsins = new Set();
let pageProducts     = [];
let currentPageSort  = "eco-first";
let orderPageProcessing      = false;
let addToCartListenerAttached = false;

const GREENLENS_BASE = "https://greenlens-platform.vercel.app";

// ─── DEMO MODE ────────────────────────────────────────────────────────────────
// Set true to make ALL Amazon products eco-detected (score 85, 20 tokens)
// Flip to false for real CPF badge detection only
const DEMO_MODE = true;
const DEMO_SCORE = 85;

// ─── TOKEN CALC (mirrors lib/tokens.ts) ──────────────────────────────────────
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
  "fair-trade":                { label: "Fair Trade Certified",     score: 85 },
  "fairtrade-america":         { label: "Fair Trade America",       score: 85 },
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
  '[data-component-type="s-climate-pledge-badge"]',
  '.s-climate-pledge-badge',
  '[class*="climate-pledge"]',
  '[class*="climatePledge"]',
  '#climatePledgeFriendlyBadge',
  '[id*="climate-pledge"]',
  '[id*="climatePledge"]',
  '.cpf-badge',
  '#sustainabilityFeatureBullets',
  '[data-feature-name="sustainabilityInitiatives"]',
  '[data-feature-name="cpfBadge"]',
  '.a-icon-climate-pledge-friendly',
  '[class*="sustainability"]',
  'img[src*="climate-pledge"]',
  'img[src*="climatePledge"]',
  'img[alt*="Climate Pledge"]',
  'img[alt*="climate pledge"]',
];

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

// ─── HELPERS ──────────────────────────────────────────────────────────────────
async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function detectCPFFromDOM(container) {
  if (!container) return [];
  const found = [];

  for (const selector of CPF_DOM_SELECTORS) {
    try {
      const el = container.querySelector(selector);
      if (el) {
        const text = (el.alt || el.getAttribute("aria-label") || el.textContent || "").trim();
        const key = matchCertText(text) || "climate-pledge-friendly";
        if (!found.includes(key)) found.push(key);
      }
    } catch (_) { /* ignore invalid selectors */ }
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
  if (!certKeys || certKeys.length === 0) return 0;
  const scores = certKeys.map(k => CPF_CERTIFICATIONS[k]?.score || 75);
  const max    = Math.max(...scores);
  const bonus  = Math.min(10, (certKeys.length - 1) * 3);
  return Math.min(100, max + bonus);
}

function getPageType() {
  if (document.querySelector('[data-component-type="s-search-result"]')) return "search";
  if (document.querySelector("#dp") || document.querySelector("#ppd"))   return "product";
  if (
    window.location.href.includes("/orderconfirm") ||
    window.location.href.includes("/order-confirm") ||
    window.location.href.includes("thankyou") ||
    window.location.href.includes("/gp/buy/thankyou") ||
    window.location.href.includes("/gp/checkout/confirm") ||
    document.querySelector("#thankyou-page") ||
    document.title.toLowerCase().includes("order confirmed") ||
    document.title.toLowerCase().includes("thank you")
  ) return "order";
  if (
    window.location.href.includes("/cart") ||
    window.location.href.includes("/gp/cart") ||
    window.location.href.includes("smart-wagon") ||
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
    gcTimestamp:    Date.now(),
    gcPageHost:     window.location.hostname,
  });
}

// ─── GET userId from chrome.storage ──────────────────────────────────────────
// Set by background.js when the user logs in via the popup.
// We avoid credentials:include + wildcard CORS (browsers block that combination).
function getStoredUserId() {
  return new Promise(resolve => {
    chrome.storage.local.get(["gcUserId"], r => resolve(r.gcUserId || null));
  });
}

// ─── CREDIT TOKENS ───────────────────────────────────────────────────────────
async function creditTokensForProduct({ userId, productName, price, sustainabilityScore, externalId }) {
  try {
    const res = await fetchWithTimeout(
      `${GREENLENS_BASE}/api/purchase`,
      {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId, productName, price, sustainabilityScore, externalId }),
      },
      8000
    );

    // Success
    if (res.ok) {
      const data = await res.json();
      return data.tokensEarned || 0;
    }

    // Handled rejections
    const body = await res.json().catch(() => ({}));

    if (res.status === 409) {
      console.log("[GreenCart] Already credited today for this product");
      return 0;
    }

    if (res.status === 422 && body.error === "min_price") {
      showInfoToast("\u{1F33F} Product under \u20b9100 \u2014 not eligible for tokens");
      return 0;
    }

    if (res.status === 429 && body.error === "weekly_cap") {
      showInfoToast(`\u{1F33F} ${body.message || "Weekly token limit reached!"}`);
      return 0;
    }

    console.warn("[GreenCart] /api/purchase returned", res.status, body);
    return 0;
  } catch (e) {
    console.error("[GreenCart] creditTokens failed:", e);
    return 0;
  }
}

// ─── EXTERNAL ID ─────────────────────────────────────────────────────────────
function makeExternalId(asin) {
  const today = new Date().toISOString().split("T")[0].replace(/-/g, "");
  return asin
    ? `${asin}-cart-${today}`
    : `cart-${today}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── ADD TO CART LISTENER ────────────────────────────────────────────────────
function attachAddToCartListener() {
  if (addToCartListenerAttached) return;
  addToCartListenerAttached = true;
  console.log("[GreenCart] 🎯 Attaching Add to Cart listener");

  document.addEventListener("click", async (e) => {
    const btn = e.target.closest(
      '#add-to-cart-button, [name="submit.add-to-cart"], input[name="submit.add-to-cart"], #buy-now-button, [data-feature-name="addToCart"] button, [data-feature-name="instantOrderButton"] button'
    );
    if (!btn) return;

    console.log("[GreenCart] 🛒 Add to Cart clicked — btn:", btn.id || btn.name || btn.className);

    // Read product data saved by processProductPage()
    const stored = await new Promise(resolve => {
      chrome.storage.local.get(["gcPageProducts"], r => resolve(r.gcPageProducts || []));
    });
    let product = stored[0];

    // ── FIX 1: In DEMO_MODE, override isSustainable check ─────────────────
    if (DEMO_MODE) {
      if (!product) {
        // Build a minimal product from current page if nothing was stored
        const asin = document.querySelector("#ASIN")?.value ||
          window.location.pathname.match(/\/dp\/([A-Z0-9]+)/i)?.[1] || "UNKNOWN";
        const title = document.querySelector("#productTitle, #title span")?.innerText?.trim() || "Demo Product";
        const priceEl = document.querySelector(".a-price .a-offscreen, .a-price-whole");
        const price = parsePrice(priceEl) || 500;
        product = { asin, name: title, price, score: DEMO_SCORE, isSustainable: true };
        console.log("[GreenCart] DEMO_MODE: built product on the fly:", product);
      } else {
        // Force isSustainable true and set demo score if score is 0
        product = {
          ...product,
          isSustainable: true,
          score: product.score > 0 ? product.score : DEMO_SCORE,
        };
        console.log("[GreenCart] DEMO_MODE: overriding isSustainable → true, score →", product.score);
      }
    } else {
      // Real mode — bail if not eco
      if (!product || !product.isSustainable || product.score === 0) {
        console.log("[GreenCart] Product not eco-certified — skipping token credit");
        return;
      }
    }

    // ── FIX 2: userId with demo fallback ───────────────────────────────────
    let userId = await getStoredUserId();

    if (!userId && DEMO_MODE) {
      // Try fetching userId fresh (background.js may not have run yet)
      console.warn("[GreenCart] gcUserId not in storage — attempting fresh fetch");
      try {
        const res = await fetchWithTimeout(`${GREENLENS_BASE}/api/user`, {}, 5000);
        if (res.ok) {
          const data = await res.json();
          userId = data.userId || null;
          if (userId) {
            chrome.storage.local.set({ gcUserId: userId });
            console.log("[GreenCart] ✅ Fresh userId fetched and cached:", userId);
          }
        }
      } catch (err) {
        console.warn("[GreenCart] Fresh userId fetch failed:", err.message);
      }
    }

    if (!userId) {
      console.warn("[GreenCart] ❌ No userId found — user must be logged in to GreenLens");
      showInfoToast("Sign in to GreenLens to earn tokens! 🌿");
      return;
    }

    console.log("[GreenCart] ✅ userId:", userId, "| product:", product.name, "| score:", product.score);

    const tokensEarned = await creditTokensForProduct({
      userId,
      productName:         product.name,
      price:               product.price || 500,
      sustainabilityScore: product.score,
      externalId:          makeExternalId(product.asin),
    });

    if (tokensEarned > 0) showTokenToast(tokensEarned);
  }, true); // capture phase — fires before Amazon's own click handlers
}

// ─── BADGE INJECTION ──────────────────────────────────────────────────────────
function injectTokenPreviewBadge(container, score, certKeys) {
  if (!container || container.querySelector(".gc-badge")) return;
  const tokens = calcTokensFromScore(score);
  const rupees = tokensToRupees(tokens);

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

function injectProductDetailTokenBanner(score, certKeys) {
  if (document.querySelector(".gc-detail-banner")) return;
  const tokens     = calcTokensFromScore(score);
  const rupees     = tokensToRupees(tokens);
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
        <span class="gc-token-label">tokens if you add to cart</span>
        <span class="gc-token-rupees">= ₹${rupees}</span>
      </div>
    </div>
  `;
  titleContainer.insertAdjacentElement("afterend", banner);
}

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

    const knownProduct = pageProducts.find(p => p.asin === asin);
    if (knownProduct?.isSustainable) {
      const tokens = calcTokensFromScore(knownProduct.score);
      totalTokens += tokens;
      ecoItemCount++;
      ecoItems.push({ name: knownProduct.name, tokens, score: knownProduct.score });
      return;
    }
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

  chrome.storage.local.set({
    gcCartPendingTokens: totalTokens,
    gcCartEcoItems:      ecoItemCount,
    gcCartRupees:        tokensToRupees(totalTokens),
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
        <span class="gc-cart-rupees">= ₹${tokensToRupees(totalTokens)}</span>
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
      parseInt(a.getAttribute("data-gc-original-order")) -
      parseInt(b.getAttribute("data-gc-original-order"))
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

    // In DEMO_MODE treat every search result as eco
    const certKeys      = DEMO_MODE ? ["climate-pledge-friendly"] : detectCPFFromDOM(card);
    const isSustainable = DEMO_MODE ? true : certKeys.length > 0;
    const score         = DEMO_MODE ? DEMO_SCORE : calcScore(certKeys);
    const certLabels    = certKeys.map(k => CPF_CERTIFICATIONS[k]?.label || k);
    const tokens        = isSustainable ? calcTokensFromScore(score) : 0;

    const productData = {
      asin, name: productName, price, score, isSustainable,
      certifications: certLabels, certKeys,
      image:      imageEl?.src || "",
      url:        linkEl?.href || `https://amazon.in/dp/${asin}`,
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
  if (!productName) {
    console.warn("[GreenCart] No product title found on page");
  }

  const scanRoot = document.querySelector("#ppd, #dp") || document.body;

  // In DEMO_MODE treat every product page as eco
  const certKeys      = DEMO_MODE ? ["climate-pledge-friendly"] : detectCPFFromDOM(scanRoot);
  const isSustainable = DEMO_MODE ? true : certKeys.length > 0;
  const score         = DEMO_MODE ? DEMO_SCORE : calcScore(certKeys);
  const certLabels    = certKeys.map(k => CPF_CERTIFICATIONS[k]?.label || k);
  const tokens        = isSustainable ? calcTokensFromScore(score) : 0;

  console.log("[GreenCart] processProductPage →", { asin, productName, price, score, isSustainable });

  // Always save so Add-to-Cart listener can read current product
  saveProductsToStorage([{
    asin, name: productName || "Amazon Product", price: price || 500,
    score, isSustainable,
    certifications: certLabels, certKeys,
    url: window.location.href,
    tokens,
    tokenRupees: tokensToRupees(tokens),
  }]);

  if (isSustainable) {
    const imageContainer = document.querySelector("#imgTagWrapperId, #imageBlock, #img-canvas");
    if (imageContainer) {
      imageContainer.style.position = "relative";
      injectTokenPreviewBadge(imageContainer, score, certKeys);
    }
    injectProductDetailTokenBanner(score, certKeys);
  }

  // Always attach listener
  attachAddToCartListener();
}

function processCartPage() {
  chrome.storage.local.get(["gcPageProducts"], result => {
    if (result.gcPageProducts?.length > 0) pageProducts = result.gcPageProducts;
    injectCartTokenSummary();
  });
}

// ─── ORDER CONFIRMATION (fallback) ───────────────────────────────────────────
function stableExternalId(asin) {
  const urlSlug = btoa(window.location.href).replace(/[^A-Za-z0-9]/g, "").slice(0, 12);
  return asin
    ? `${asin}-${urlSlug}`
    : `order-${urlSlug}-${Math.random().toString(36).slice(2, 7)}`;
}

function extractOrderProducts() {
  const products = [];
  document.querySelectorAll(
    ".a-fixed-right-grid, .shipment-info-container .a-box, #orderDetails .a-box"
  ).forEach(row => {
    const nameEl  = row.querySelector(".a-truncate-full, .a-text-bold, a[href*='/dp/']");
    const priceEl = row.querySelector(".a-price .a-offscreen, .a-price-whole, [class*='price']");
    const asinMatch = row.innerHTML?.match(/\/dp\/([A-Z0-9]{10})/);
    const asin  = asinMatch?.[1];
    const name  = nameEl?.innerText?.trim() || nameEl?.textContent?.trim();
    const price = parsePrice(priceEl) || 0;
    if (name && name.length > 3) {
      const certKeys = detectCPFFromDOM(row);
      const score    = certKeys.length > 0 ? calcScore(certKeys) : 0;
      products.push({ asin, name, price, score, tokens: calcTokensFromScore(score) });
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
        products.push({ asin, name, price: 0, score, tokens: calcTokensFromScore(score) });
      }
    });
  }
  return products;
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

    const userId = await getStoredUserId();
    if (!userId) return;

    const products = extractOrderProducts();
    if (products.length === 0) return;

    let totalTokensEarned = 0;
    for (const product of products) {
      if (product.score === 0) continue;
      const earned = await creditTokensForProduct({
        userId,
        productName:         product.name,
        price:               product.price,
        sustainabilityScore: product.score,
        externalId:          stableExternalId(product.asin),
      });
      totalTokensEarned += earned;
    }

    chrome.storage.local.remove(["gcCartPendingTokens", "gcCartEcoItems", "gcCartRupees"]);
    if (totalTokensEarned > 0) showTokenToast(totalTokensEarned);
  } finally {
    orderPageProcessing = false;
  }
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function showTokenToast(tokens) {
  document.querySelector(".gc-token-toast")?.remove();

  if (!document.getElementById("gc-toast-style")) {
    const style = document.createElement("style");
    style.id = "gc-toast-style";
    style.textContent = `
      @keyframes gcSlideIn {
        from { transform: translateX(120%); opacity: 0; }
        to   { transform: translateX(0);    opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  const toast = document.createElement("div");
  toast.className = "gc-token-toast";
  toast.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; z-index: 2147483647;
    background: linear-gradient(135deg, #0d5c2e, #1a8a47);
    color: #fff; padding: 14px 20px; border-radius: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px; font-weight: 600;
    box-shadow: 0 4px 24px rgba(13, 92, 46, 0.5);
    display: flex; align-items: center; gap: 10px;
    animation: gcSlideIn 0.4s ease;
    pointer-events: none;
  `;
  toast.innerHTML = `
    <span style="font-size: 24px">🌿</span>
    <div>
      <div style="font-size: 15px; font-weight: 700;">+${tokens} Green Tokens Earned!</div>
      <div style="font-size: 11px; opacity: 0.8; margin-top: 2px;">
        ₹${tokensToRupees(tokens)} added to your GreenLens wallet
      </div>
    </div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = "opacity 0.5s ease";
    toast.style.opacity    = "0";
    setTimeout(() => toast.remove(), 500);
  }, 6000);
}

function showInfoToast(message) {
  document.querySelector(".gc-info-toast")?.remove();
  const toast = document.createElement("div");
  toast.className = "gc-info-toast";
  toast.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; z-index: 2147483647;
    background: linear-gradient(135deg, #1a2e1a, #2d4a2d);
    color: #86efac; padding: 12px 18px; border-radius: 12px;
    border: 1px solid rgba(34,197,94,0.25);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px; font-weight: 500;
    box-shadow: 0 4px 18px rgba(0,0,0,0.3);
    display: flex; align-items: center; gap: 8px;
    animation: gcSlideIn 0.4s ease;
    pointer-events: none; max-width: 320px;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = "opacity 0.5s ease";
    toast.style.opacity    = "0";
    setTimeout(() => toast.remove(), 500);
  }, 5000);
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
    if (pageType === "product") attachAddToCartListener(); // safe — guarded by flag
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
  console.log("[GreenCart] Init — page type:", pageType, "| DEMO_MODE:", DEMO_MODE);

  if      (pageType === "search")  setTimeout(processSearchResults, 1000);
  else if (pageType === "product") setTimeout(processProductPage,   800);
  else if (pageType === "cart")    setTimeout(processCartPage,      1000);
  else if (pageType === "order")   setTimeout(processOrderPage,     1500);
})();