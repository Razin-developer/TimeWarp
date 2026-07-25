// Import library scripts in the service worker context
importScripts('lib/wayback.js', 'lib/cache.js', 'lib/vault.js');

// Set side panel to open on extension icon click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error('Error setting side panel behavior:', error));

// Store the active tab info to track tab switches
let activeTabId = null;

// Handle message passing between popup, side panel, dashboard, and background worker
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fetchSnapshots') {
    const { url, bypassCache, useDomainFallback } = message;
    
    (async () => {
      try {
        if (!bypassCache) {
          const cached = await WaybackCache.getSnapshots(url);
          if (cached) {
            sendResponse({ success: true, snapshots: cached, cached: true });
            return;
          }
        }
        
        const snapshots = await WaybackAPI.fetchSnapshots(url, { useDomainFallback });
        await WaybackCache.setSnapshots(url, snapshots);
        sendResponse({ success: true, snapshots, cached: false });
      } catch (error) {
        console.error('Background fetch snapshots error:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    
    return true; // Keep message channel open for async response
  }
  
  if (message.action === 'openSidePanel') {
    const tabId = message.tabId || (sender.tab ? sender.tab.id : null);
    if (tabId) {
      chrome.sidePanel.open({ tabId })
        .then(() => sendResponse({ success: true }))
        .catch(err => {
          console.error('Error opening side panel:', err);
          sendResponse({ success: false, error: err.message });
        });
      return true;
    } else {
      // Fallback: Query active tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.sidePanel.open({ tabId: tabs[0].id })
            .then(() => sendResponse({ success: true }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        } else {
          sendResponse({ success: false, error: 'No active tab found' });
        }
      });
      return true;
    }
  }

  // Handle capture visible tab screenshot request (For Live View screenshotting)
  if (message.action === 'captureActiveTab') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error('Screenshot capture error:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, dataUrl });
      }
    });
    return true;
  }

  // Handle capture archived tab screenshot request (For past snapshot screenshotting)
  if (message.action === 'captureArchivedTab') {
    const { url, originalTabId } = message;
    
    chrome.tabs.create({ url: url, active: true }, (newTab) => {
      // Watch for loading completion
      const listener = (tabId, changeInfo) => {
        if (tabId === newTab.id && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(listener);
          
          // Wait 800ms for full content painting
          setTimeout(() => {
            chrome.tabs.captureVisibleTab(newTab.windowId, { format: 'png' }, (dataUrl) => {
              // Close the screenshot tab
              chrome.tabs.remove(newTab.id);
              // Focus back to original active tab
              chrome.tabs.update(originalTabId, { active: true }, () => {
                sendResponse({ success: true, dataUrl });
              });
            });
          }, 800);
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
    });
    return true; // Keep channel open
  }

  // Fetch raw HTML from a URL (with automatic IndexedDB caching)
  if (message.action === 'fetchRawHtml') {
    (async () => {
      try {
        const url = message.url;
        
        // 1. Intercept and parse Wayback archive URLs
        const match = url.match(/^https:\/\/web\.archive\.org\/web\/(\d{14})\/(.+)$/);
        if (match) {
          const timestamp = match[1];
          const targetUrl = match[2];
          
          // Query offline snapshots cache
          const cachedHtml = await WaybackVault.getOfflineSnapshot(targetUrl, timestamp);
          if (cachedHtml) {
            sendResponse({ success: true, html: cachedHtml, cached: true });
            return;
          }
          
          // Download if not in database cache
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Failed to load archive: ${response.statusText}`);
          }
          const text = await response.text();
          
          // Write snapshot html to database cache
          await WaybackVault.saveOfflineSnapshot(targetUrl, timestamp, text);
          sendResponse({ success: true, html: text, cached: false });
          return;
        }

        // 2. Normal direct fetch for non-archive URLs
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to load URL: ${response.statusText}`);
        }
        const text = await response.text();
        sendResponse({ success: true, html: text, cached: false });
      } catch (error) {
        console.error('Error fetching raw HTML in background:', error);
        sendResponse({ success: false, error: error.message });
      }
    })();
    return true;
  }
});

// Watch tab activation (switching tabs)
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  activeTabId = activeInfo.tabId;
  try {
    const tab = await chrome.tabs.get(activeTabId);
    notifySidePanelTabChanged(tab);
  } catch (error) {
    console.error('Error in onActivated:', error);
  }
});

// Watch tab updates (URL change on current tab)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    notifySidePanelTabChanged(tab);
  }
  
  // Proactive pre-fetching when page loading completes
  if (changeInfo.status === 'complete' && tab.url) {
    preFetchUrlSnapshots(tab.url);
  }
});

/**
 * Proactively fetches and caches snapshots for a URL in the background.
 * Pre-warms key milestones (oldest, newest, and intermediate snapshots)
 * in parallel for instant, sub-10ms loads when requested.
 */
async function preFetchUrlSnapshots(url) {
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) {
    return;
  }
  try {
    // 1. Get snapshot list
    let snapshots = await WaybackCache.getSnapshots(url);
    if (!snapshots) {
      snapshots = await WaybackAPI.fetchSnapshots(url, { useDomainFallback: true });
      await WaybackCache.setSnapshots(url, snapshots);
    }
    
    if (!snapshots || snapshots.length === 0) return;
    
    // 2. Select milestones to pre-warm (up to 5 snapshots)
    const milestones = [];
    const len = snapshots.length;
    
    milestones.push(snapshots[0]); // Oldest
    if (len > 1) milestones.push(snapshots[len - 1]); // Newest
    if (len > 2) milestones.push(snapshots[Math.floor(len / 2)]); // Midpoint
    if (len > 4) {
      milestones.push(snapshots[Math.floor(len / 4)]);
      milestones.push(snapshots[Math.floor(len * 3 / 4)]);
    }
    
    // De-duplicate milestones
    const uniqueMilestones = [...new Set(milestones)];
    
    // 3. Parallel fetch and store in database cache
    uniqueMilestones.forEach(async (timestamp) => {
      try {
        const cachedHtml = await WaybackVault.getOfflineSnapshot(url, timestamp);
        if (!cachedHtml) {
          const archiveUrl = WaybackAPI.getArchiveUrl(url, timestamp);
          const response = await fetch(archiveUrl);
          if (response.ok) {
            const html = await response.text();
            await WaybackVault.saveOfflineSnapshot(url, timestamp, html);
          }
        }
      } catch (err) {
        // Suppress background errors
      }
    });
  } catch (err) {
    // Suppress background errors
  }
}

// Listen for keyboard command shortcuts
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open_side_panel') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.sidePanel.open({ tabId: tabs[0].id })
          .catch(err => console.error('Error opening side panel via command:', err));
      }
    });
  }
});

// ----------------------------------------------------
// Alarms Daemon - Automated Page History Change Monitor
// ----------------------------------------------------
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'TimeWarpChangeCheck') {
    runMonitorsCheck();
  }
});

// Run monitor checks every 4 hours
chrome.alarms.create('TimeWarpChangeCheck', { periodInMinutes: 240 });

/**
 * Iterates through monitored sites and queries the Wayback API for changes.
 */
async function runMonitorsCheck() {
  try {
    const monitors = await WaybackVault.getMonitors();
    if (monitors.length === 0) return;

    for (const monitor of monitors) {
      const now = Date.now();
      const frequencyMs = monitor.frequency * 60 * 1000;
      if (now - monitor.lastChecked < frequencyMs) {
        continue;
      }

      const cleanUrl = WaybackAPI.normalizeUrl(monitor.url);
      const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(cleanUrl)}&output=json&fl=timestamp,digest&collapse=timestamp:8&limit=-1`;

      try {
        const response = await fetch(cdxUrl);
        if (!response.ok) continue;

        const data = await response.json();
        if (Array.isArray(data) && data.length > 1) {
          const latestRow = data[1];
          const latestTimestamp = latestRow[0];
          const latestDigest = latestRow[1];

          if (monitor.lastHash && monitor.lastHash !== latestDigest) {
            const domain = WaybackAPI.getDomain(monitor.url);
            showSystemNotification(domain, latestTimestamp);
          }

          await WaybackVault.updateMonitorCheck(monitor.url, latestDigest);
        }
      } catch (err) {
        console.error(`Error checking monitor for ${monitor.url}:`, err);
      }
    }
  } catch (error) {
    console.error('Error in runMonitorsCheck:', error);
  }
}

/**
 * Triggers a Chrome System Notification.
 */
function showSystemNotification(domain, timestamp) {
  const formattedDate = WaybackCache.formatDateString(timestamp);
  chrome.notifications.create(null, {
    type: 'basic',
    iconUrl: 'assets/icon48.png',
    title: 'Warp Monitor Triggered',
    message: `A new snapshot change was detected for ${domain}! (Archived on ${formattedDate})`,
    priority: 1
  });
}

/**
 * Notifies the side panel that the active tab's URL has changed.
 * @param {chrome.tabs.Tab} tab 
 */
function notifySidePanelTabChanged(tab) {
  if (!tab || !tab.url) return;
  
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
    return;
  }
  
  chrome.runtime.sendMessage({
    type: 'tabChanged',
    url: tab.url,
    title: tab.title,
    tabId: tab.id
  }).catch(() => {
    // Suppress error - this happens when side panel is closed
  });
}
