// Time Warp - Content Script
// This script runs in the context of the webpage.
// It can handle custom page-level integration or message passing.

console.log('[Time Warp] Content script initialized.');

// Listen for messages from the extension popup or side panel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ping') {
    sendResponse({ status: 'active', url: window.location.href });
  }
  return true;
});
