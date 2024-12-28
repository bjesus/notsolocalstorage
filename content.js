// Listen for messag// Listen for messages from background script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "LOAD_STORAGE") {
    // Load synced data into localStorage
    Object.entries(message.data).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
  }
});

// Listen for localStorage changes
window.addEventListener(
  "storage",
  async (event) => {
    if (event.storageArea === localStorage) {
      // Notify background script that sync is starting
      await browser.runtime.sendMessage({ type: "SYNC_STARTED" });

      try {
        // Get all localStorage data
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          data[key] = localStorage.getItem(key);
        }

        // Save to sync storage
        const domain = window.location.hostname;
        const storageKey = `localStorage_${domain}`;
        await browser.storage.sync.set({
          [storageKey]: data,
        });
      } finally {
        // Notify background script that sync is complete
        await browser.runtime.sendMessage({ type: "SYNC_COMPLETED" });
      }
    }
  },
  false,
);
