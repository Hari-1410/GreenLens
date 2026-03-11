// background.js — GreenLens Credit service worker

// Listen for messages from content.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CREDIT_ADDED") {
    const { credits, co2Avoided, product, score } = message.payload;

    // Show a Chrome notification
    chrome.notifications?.create({
      type: "basic",
      iconUrl: "icons/icon48.png",
      title: `🌿 +${credits} GreenCredits Earned!`,
      message: `You saved ${co2Avoided}kg CO₂ by choosing ${product}. Score: ${score}/100`,
      priority: 1,
    });

    // ── Future: send to your backend API ──
    // fetch("https://your-api.com/api/credits/add", {
    //   method: "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify(message.payload)
    // });

    sendResponse({ success: true });
  }
});

// On install: initialize storage defaults
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["totalCredits"], (data) => {
    if (data.totalCredits === undefined) {
      chrome.storage.local.set({
        totalCredits:  0,
        greenScore:    0,
        transactions:  [],
      });
    }
  });

  console.log("GreenLens Credit extension installed ✅");
});
