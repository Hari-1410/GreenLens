// popup.js – GreenCart v3

let allProducts = [];
let currentSort = "eco-first";
let showOnlyEco = true;

// ─── TABS ─────────────────────────────────────────────────────────────────────
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`panel-${tab.dataset.tab}`).classList.add("active");
  });
});

// ─── SORT BUTTONS ─────────────────────────────────────────────────────────────
document.querySelectorAll(".sort-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".sort-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentSort = btn.dataset.sort;
    renderProducts();
  });
});

// ─── ECO TOGGLE ───────────────────────────────────────────────────────────────
document.getElementById("ecoToggle").addEventListener("change", (e) => {
  showOnlyEco = e.target.checked;
  renderProducts();
});

// ─── LOAD PRODUCTS FROM STORAGE ──────────────────────────────────────────────
function loadProducts() {
  chrome.storage.local.get(["gcPageProducts", "gcTimestamp"], (result) => {
    const products = result.gcPageProducts || [];
    const ts = result.gcTimestamp || 0;
    const ageSeconds = (Date.now() - ts) / 1000;

    if (products.length > 0 && ageSeconds < 90) {
      allProducts = products;
      updateStats();
      renderProducts();
    } else {
      document.getElementById("productList").innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🌐</div>
          <div class="empty-title">No products scanned yet</div>
          <div class="empty-desc">Go to <strong>amazon.in</strong> or <strong>amazon.com</strong>, search for a product, wait 2 seconds, then reopen this popup.</div>
        </div>`;
      document.getElementById("statusPill").textContent = "Waiting…";
    }
  });
}

// ─── STATS ────────────────────────────────────────────────────────────────────
function updateStats() {
  const ecoProducts = allProducts.filter(p => p.isSustainable);
  const avgScore = ecoProducts.length
    ? Math.round(ecoProducts.reduce((s, p) => s + p.score, 0) / ecoProducts.length)
    : 0;

  document.getElementById("totalCount").textContent = allProducts.length;
  document.getElementById("ecoCount").textContent = ecoProducts.length;
  document.getElementById("avgScore").textContent = avgScore || "–";

  const pill = document.getElementById("statusPill");
  pill.textContent = ecoProducts.length > 0 ? `${ecoProducts.length} Eco Found` : "None Found";
  pill.style.background = ecoProducts.length > 0
    ? "rgba(47, 199, 106, 0.2)" : "rgba(255, 100, 100, 0.2)";
}

// ─── RENDER PRODUCTS ──────────────────────────────────────────────────────────
function renderProducts() {
  const list = document.getElementById("productList");
  let products = showOnlyEco ? allProducts.filter(p => p.isSustainable) : allProducts;

  if (products.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🍃</div>
        <div class="empty-title">${showOnlyEco ? "No eco products found" : "No products found"}</div>
        <div class="empty-desc">${showOnlyEco ? 'Try toggling "Eco only" off, or search for "organic", "bamboo", "recycled" on Amazon.' : "No products scanned yet."}</div>
      </div>`;
    return;
  }

  const sorted = [...products].sort((a, b) => {
    if (currentSort === "eco-first") {
      // Eco first, then by score
      if (b.isSustainable !== a.isSustainable) return b.isSustainable ? 1 : -1;
      return (b.score || 0) - (a.score || 0);
    }
    if (currentSort === "price-low") {
      // Eco first, then price low→high within each group
      if (b.isSustainable !== a.isSustainable) return b.isSustainable ? 1 : -1;
      return (a.price || 9999) - (b.price || 9999);
    }
    if (currentSort === "price-high") {
      if (b.isSustainable !== a.isSustainable) return b.isSustainable ? 1 : -1;
      return (b.price || 0) - (a.price || 0);
    }
    if (currentSort === "score") return (b.score || 0) - (a.score || 0);
    return 0;
  });

  // Detect currency symbol from prices (₹ for .in, $ default)
  const currency = detectCurrency();

  list.innerHTML = sorted.map(p => `
    <a class="product-card ${p.isSustainable ? "eco" : "non-eco"}" href="${p.url}" target="_blank">
      <div class="product-thumb">
        ${p.image
          ? `<img src="${p.image}" style="width:100%;height:100%;object-fit:cover;border-radius:7px;" onerror="this.parentElement.innerHTML='🌿'">`
          : (p.isSustainable ? "🌿" : "📦")}
      </div>
      <div class="product-info">
        <div class="product-name">${escapeHtml(p.name)}</div>
        <div class="product-meta">
          <div class="product-price">${p.price ? `${currency}${formatPrice(p.price)}` : "N/A"}</div>
          ${p.isSustainable
            ? `<div class="eco-score">🌿 ${p.score}%</div>`
            : `<div class="non-eco-tag">Not Eco</div>`}
        </div>
        ${p.certifications?.length ? `
          <div class="cert-tags">
            ${p.certifications.map(c => `<span class="cert-tag">${escapeHtml(c)}</span>`).join("")}
          </div>` : ""}
      </div>
    </a>
  `).join("");
}

// ─── ALTERNATIVES ─────────────────────────────────────────────────────────────
document.getElementById("findAltBtn").addEventListener("click", async () => {
  const price = parseFloat(document.getElementById("altPrice").value);
  if (!price || price <= 0) {
    document.getElementById("altList").innerHTML = `
      <div class="empty-state"><div class="empty-icon">💰</div>
      <div class="empty-title">Enter a valid price</div></div>`;
    return;
  }

  document.getElementById("altList").innerHTML = `<div class="loading"><div class="spinner"></div>Finding alternatives…</div>`;

  try {
    const response = await chrome.runtime.sendMessage({ type: "GET_ALTERNATIVES", category: "general", price });
    const currency = detectCurrency();

    if (response?.success && response.data?.length > 0) {
      document.getElementById("altList").innerHTML = `
        <div class="section-title">Sustainable picks near ${currency}${price.toFixed(0)}</div>
        ${response.data.map(p => `
          <a class="product-card eco" href="${p.url}" target="_blank">
            <div class="product-thumb">${p.image}</div>
            <div class="product-info">
              <div class="product-name">${escapeHtml(p.name)}</div>
              <div class="product-meta">
                <div class="product-price">${currency}${p.price.toFixed(2)}</div>
                <div class="eco-score">🌿 ${p.score}%</div>
              </div>
              ${p.certifications?.length ? `<div class="cert-tags">${p.certifications.map(c => `<span class="cert-tag">${escapeHtml(c)}</span>`).join("")}</div>` : ""}
            </div>
          </a>`).join("")}`;
    } else {
      document.getElementById("altList").innerHTML = `
        <div class="empty-state"><div class="empty-icon">😔</div>
        <div class="empty-title">No alternatives found</div>
        <div class="empty-desc">Try a different price range.</div></div>`;
    }
  } catch (e) {
    document.getElementById("altList").innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><div class="empty-title">Error</div></div>`;
  }
});

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}

function detectCurrency() {
  // Read from storage or detect from tab URL
  return "₹"; // Default to ₹ for amazon.in; swap to "$" for amazon.com
}

function formatPrice(price) {
  return price >= 100 ? Math.round(price).toLocaleString("en-IN") : price.toFixed(2);
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
loadProducts();
