# 🌿 GreenLens Credit — Browser Extension

## Folder Structure

```
greenlens-extension/
├── manifest.json       ← Extension config (MV3)
├── content.js          ← Product detection + banner injection
├── styles.css          ← Banner styles (injected into pages)
├── popup.html          ← Mini wallet (click extension icon)
├── popup.js            ← Wallet logic (reads chrome.storage)
├── background.js       ← Service worker (notifications, API)
├── carbonDB.js         ← Reference carbon data (not loaded directly)
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## How to Load in Chrome (Dev Mode)

1. Open Chrome → go to `chrome://extensions`
2. Enable **Developer Mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `greenlens-extension/` folder
5. Extension is live ✅

---

## How to Test

1. Go to **amazon.in** and search for any of these:
   - `surf excel detergent`
   - `head and shoulders shampoo`
   - `pantene shampoo`
   - `basmati rice`
2. GreenLens banner appears at the top of the page
3. Click **Switch & Earn** → credits are added
4. Click the extension icon (🌿) → see your wallet update

### Test Greenwashing Alert
Search for: `eco detergent` (without a trusted certification)
→ Banner shows: **Greenwashing detected, no credits awarded**

### Test Fraud Detection
Click "Switch & Earn" more than 3 times in 1 hour on different tabs
→ Credits suspended with a warning

---

## How Credits Work

| CO₂ Avoided | Formula        | Credits |
|-------------|----------------|---------|
| 2.4 kg      | 2.4 × 5 = 12   | +12 🍃  |
| 1.6 kg      | 1.6 × 5 = 8    | +8 🍃   |
| 1.9 kg      | 1.9 × 5 = 9.5  | +10 🍃  |

**Green Score** = min(100, totalCredits ÷ 10)

---

## Loan Rate Unlock Table

| Score | HDFC Personal Loan | SBI Home Loan |
|-------|--------------------|---------------|
| 0–39  | 11.5%              | 8.5%          |
| 40–59 | 11.0%              | 8.3%          |
| 60–79 | 10.8%              | 8.1%          |
| 80+   | 10.2%              | 7.8%          |

---

## Icons

Create simple placeholder icons (16×16, 48×48, 128×128 px PNG with a green leaf) and place them in the `icons/` folder. You can use any free icon editor or generate them with:
- https://favicon.io
- https://www.canva.com

---

## Next Steps

- [ ] Connect `background.js` to your FastAPI backend
- [ ] Replace `carbonDB.js` hardcoded data with API calls (climatiq.io)
- [ ] Add Flipkart product selectors to `content.js`
- [ ] Add real certification verification via API
