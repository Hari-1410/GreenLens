// Carbon footprint database (kg CO2 per unit)
// Format: keyword → { co2, label, ecoAlternative }

const CARBON_DB = {
  // Detergents
  "surf excel": { co2: 4.2, label: "Regular Detergent", category: "cleaning" },
  "ariel": { co2: 4.0, label: "Regular Detergent", category: "cleaning" },
  "rin": { co2: 3.8, label: "Regular Detergent", category: "cleaning" },
  "ezee": { co2: 1.9, label: "Eco Detergent", category: "cleaning", isEco: true },
  "plant-based detergent": { co2: 1.6, label: "Eco Detergent", category: "cleaning", isEco: true },
  "bio enzyme": { co2: 1.4, label: "Eco Detergent", category: "cleaning", isEco: true },

  // Shampoo
  "head shoulders": { co2: 2.8, label: "Regular Shampoo", category: "personal_care" },
  "pantene": { co2: 2.6, label: "Regular Shampoo", category: "personal_care" },
  "dove shampoo": { co2: 2.5, label: "Regular Shampoo", category: "personal_care" },
  "biotique": { co2: 1.1, label: "Herbal Shampoo", category: "personal_care", isEco: true },
  "khadi shampoo": { co2: 0.9, label: "Natural Shampoo", category: "personal_care", isEco: true },
  "mamaearth shampoo": { co2: 1.2, label: "Eco Shampoo", category: "personal_care", isEco: true },

  // Plastic bottles
  "plastic bottle": { co2: 3.1, label: "Plastic Bottle", category: "beverage" },
  "pet bottle": { co2: 2.9, label: "Plastic Bottle", category: "beverage" },
  "steel bottle": { co2: 1.2, label: "Steel Bottle", category: "beverage", isEco: true },
  "copper bottle": { co2: 1.0, label: "Copper Bottle", category: "beverage", isEco: true },

  // Food
  "basmati rice": { co2: 2.7, label: "Regular Rice", category: "food" },
  "organic rice": { co2: 1.4, label: "Organic Rice", category: "food", isEco: true },
  "jaivik basmati": { co2: 1.3, label: "Certified Organic Rice", category: "food", isEco: true, certified: true },

  // Paper
  "normal notebook": { co2: 1.8, label: "Regular Notebook", category: "stationery" },
  "recycled notebook": { co2: 0.7, label: "Recycled Notebook", category: "stationery", isEco: true },
  "bamboo notebook": { co2: 0.5, label: "Bamboo Notebook", category: "stationery", isEco: true },

  // Bags
  "plastic bag": { co2: 1.6, label: "Plastic Bag", category: "packaging" },
  "cloth bag": { co2: 0.3, label: "Cloth Bag", category: "packaging", isEco: true },
  "jute bag": { co2: 0.2, label: "Jute Bag", category: "packaging", isEco: true },
};

// Eco alternatives mapping: category → greener swap suggestion
const ECO_ALTERNATIVES = {
  cleaning: { name: "Bio Enzyme Cleaner", co2: 1.4, credits: 12, certified: true },
  personal_care: { name: "Mamaearth / Khadi Natural", co2: 1.0, credits: 8, certified: false },
  beverage: { name: "Stainless Steel Bottle", co2: 1.2, credits: 10, certified: false },
  food: { name: "Jaivik Bharat Organic", co2: 1.3, credits: 7, certified: true },
  stationery: { name: "Recycled Paper Notebook", co2: 0.7, credits: 6, certified: false },
  packaging: { name: "Jute / Cloth Bag", co2: 0.2, credits: 9, certified: false },
};

// Trusted certifications (for greenwashing detection)
const TRUSTED_CERTS = [
  "jaivik bharat",
  "fssai organic",
  "india organic",
  "ecomark",
  "green seal",
  "usda organic",
  "rainforest alliance"
];
