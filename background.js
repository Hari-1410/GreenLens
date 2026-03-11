// background.js – GreenCart v4
// Sustainability is detected directly from Amazon's Climate Pledge Friendly
// DOM elements in content.js — no API calls needed for badge detection.

// ─── ALTERNATIVES (mock DB — replace with Supabase/Firebase) ─────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.type === "GET_ALTERNATIVES") {
    getAlternativeProducts(message.price)
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // keep message channel open for async response
  }

});

async function getAlternativeProducts(currentPrice) {
  const min = currentPrice * 0.8;
  const max = currentPrice * 1.2;

  // Mock CPF-verified alternatives — replace with real DB query, e.g.:
  // SELECT * FROM products WHERE cpf = true AND price BETWEEN min AND max
  const mockDB = [
    { name: "Organic India Tulsi Green Tea",  price: 299,  certifications: ["USDA Organic", "Fair Trade"],         score: 92, url: "https://amazon.in/s?k=organic+india+tulsi+green+tea",   image: "🍵" },
    { name: "Bamboo Toothbrush Set (4 pack)", price: 349,  certifications: ["FSC Certified", "Plastic Free"],       score: 88, url: "https://amazon.in/s?k=bamboo+toothbrush+eco",           image: "🪥" },
    { name: "Khadi Natural Herbal Shampoo",   price: 245,  certifications: ["Climate Pledge Friendly"],             score: 85, url: "https://amazon.in/s?k=khadi+natural+shampoo",           image: "🌿" },
    { name: "Recycled Cotton Tote Bag",       price: 199,  certifications: ["Rainforest Alliance"],                 score: 84, url: "https://amazon.in/s?k=recycled+cotton+tote",            image: "♻️" },
    { name: "Solar LED Garden Lights",        price: 599,  certifications: ["ENERGY STAR"],                         score: 89, url: "https://amazon.in/s?k=solar+led+garden+lights",         image: "☀️" },
    { name: "Compostable Garbage Bags",       price: 279,  certifications: ["Certified Compostable"],               score: 87, url: "https://amazon.in/s?k=compostable+garbage+bags",        image: "🌱" },
    { name: "Beeswax Food Wraps",             price: 449,  certifications: ["B Corp Certified"],                    score: 90, url: "https://amazon.in/s?k=beeswax+food+wrap",               image: "🍯" },
    { name: "Stainless Steel Water Bottle",   price: 399,  certifications: ["Climate Pledge Friendly"],             score: 86, url: "https://amazon.in/s?k=stainless+steel+water+bottle+eco",image: "💧" },
    { name: "Organic Cotton Bedsheet",        price: 1299, certifications: ["GOTS Certified", "OEKO-TEX"],          score: 91, url: "https://amazon.in/s?k=organic+cotton+bedsheet",         image: "🛏️" },
    { name: "Neem Wood Comb",                 price: 149,  certifications: ["Climate Pledge Friendly"],             score: 80, url: "https://amazon.in/s?k=neem+wood+comb",                  image: "🪮" },
  ];

  return mockDB
    .filter(p => p.price >= min && p.price <= max)
    .sort((a, b) => a.price - b.price)
    .slice(0, 5);
}