let domains = new Set();
let storageData = {};

// Load domains and their storage data
async function loadData() {
  // Load enabled domains
  const result = await browser.storage.sync.get("enabledDomains");
  if (result.enabledDomains) {
    domains = new Set(result.enabledDomains);

    // Load storage data for each domain
    for (const domain of domains) {
      const key = `localStorage_${domain}`;
      const data = await browser.storage.sync.get(key);
      if (data[key]) {
        storageData[domain] = data[key];
      }
    }

    renderDomains();
  }
}

// Render domain list
function renderDomains() {
  const list = document.getElementById("domainList");
  list.innerHTML = "";

  if (domains.size === 0) {
    const message = document.createElement("p");
    message.textContent = "No domains are currently being synced.";
    list.appendChild(message);
    return;
  }

  for (const domain of domains) {
    const item = document.createElement("div");
    item.className = "domain-item";

    const header = document.createElement("div");
    header.className = "domain-header";

    const text = document.createElement("strong");
    text.textContent = domain;

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.onclick = () => removeDomain(domain);

    header.appendChild(text);
    header.appendChild(removeBtn);
    item.appendChild(header);

    // Add storage keys information
    const keys = storageData[domain] ? Object.keys(storageData[domain]) : [];
    if (keys.length > 0) {
      const keyCount = document.createElement("div");
      keyCount.className = "key-count";
      keyCount.textContent = `${keys.length} synced keys:`;
      item.appendChild(keyCount);

      const keyList = document.createElement("div");
      keyList.className = "storage-keys";
      keyList.textContent = keys.join(", ");
      item.appendChild(keyList);
    } else {
      const noKeys = document.createElement("div");
      noKeys.className = "key-count";
      noKeys.textContent = "No data synced yet";
      item.appendChild(noKeys);
    }

    list.appendChild(item);
  }
}

// Add new domain
async function addDomain(domain) {
  domains.add(domain);
  await saveDomains();
  await loadData(); // Reload all data to update the view
}

// Remove domain
async function removeDomain(domain) {
  domains.delete(domain);
  // Also remove the domain's storage data
  const key = `localStorage_${domain}`;
  await browser.storage.sync.remove(key);
  delete storageData[domain];
  await saveDomains();
  renderDomains();
}

// Save domains to sync storage
async function saveDomains() {
  await browser.storage.sync.set({
    enabledDomains: Array.from(domains),
  });
}

// Event listeners
document.getElementById("addDomain").addEventListener("click", () => {
  const input = document.getElementById("newDomain");
  const domain = input.value.trim();

  if (domain) {
    addDomain(domain);
    input.value = "";
  }
});

// Initialize
document.addEventListener("DOMContentLoaded", loadData);
