let enabledDomains = new Set();
let syncingTabs = new Set();

// Load enabled domains from sync storage
async function initializeExtension() {
  const result = await browser.storage.sync.get("enabledDomains");
  if (result.enabledDomains) {
    enabledDomains = new Set(result.enabledDomains);
  }

  // Update icons for all tabs
  const tabs = await browser.tabs.query({});
  tabs.forEach(updateIcon);
}

// Initialize on extension load
initializeExtension();

// Toggle sync for current domain
browser.browserAction.onClicked.addListener(async (tab) => {
  const url = new URL(tab.url);
  const domain = url.hostname;

  if (enabledDomains.has(domain)) {
    enabledDomains.delete(domain);
  } else {
    enabledDomains.add(domain);
    // Immediately inject content script for newly enabled domains
    await injectContentScript(tab);
  }

  await browser.storage.sync.set({
    enabledDomains: Array.from(enabledDomains),
  });

  updateIcon(tab);
});

// Update toolbar icon based on sync status
async function updateIcon(tab) {
  try {
    const url = new URL(tab.url);
    const domain = url.hostname;

    let icon;
    if (syncingTabs.has(tab.id)) {
      icon = "icons/icon-32-syncing.png";
    } else if (enabledDomains.has(domain)) {
      icon = "icons/icon-32-enabled.png";
    } else {
      icon = "icons/icon-32.png";
    }

    await browser.browserAction.setIcon({
      path: icon,
      tabId: tab.id,
    });
  } catch (error) {
    console.error("Error updating icon:", error);
  }
}

// Inject content script and load synced data
async function injectContentScript(tab) {
  try {
    const url = new URL(tab.url);
    const domain = url.hostname;

    if (enabledDomains.has(domain)) {
      syncingTabs.add(tab.id);
      updateIcon(tab);

      // Inject content script
      await browser.tabs.executeScript(tab.id, {
        file: "content.js",
      });

      // Load synced data
      const key = `localStorage_${domain}`;
      const result = await browser.storage.sync.get(key);

      if (result[key]) {
        await browser.tabs.sendMessage(tab.id, {
          type: "LOAD_STORAGE",
          data: result[key],
        });
      }

      syncingTabs.delete(tab.id);
      updateIcon(tab);
    }
  } catch (error) {
    console.error("Error injecting content script:", error);
    syncingTabs.delete(tab.id);
    updateIcon(tab);
  }
}

// Handle tab updates
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    await injectContentScript(tab);
  }
});

// Track tab removal to clean up syncingTabs
browser.tabs.onRemoved.addListener((tabId) => {
  syncingTabs.delete(tabId);
});

// Listen for sync events from content script
browser.runtime.onMessage.addListener((message, sender) => {
  if (message.type === "SYNC_STARTED") {
    syncingTabs.add(sender.tab.id);
    updateIcon(sender.tab);
  } else if (message.type === "SYNC_COMPLETED") {
    syncingTabs.delete(sender.tab.id);
    updateIcon(sender.tab);
  }
});
