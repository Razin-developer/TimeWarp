// Side Panel Controller Logic for Time Warp (Apple Minimalist Aesthetic)

let currentUrl = '';
let snapshots = [];
let selectedIndex = 0;
let debounceTimer = null;
let isViewingLive = false;

// Elements
const targetDomainEl = document.getElementById('target-domain');
const selectedDateEl = document.getElementById('selected-date');
const timelineSlider = document.getElementById('timeline-slider');
const sliderMinYearEl = document.getElementById('slider-min-year');
const sliderMaxYearEl = document.getElementById('slider-max-year');
const snapshotStatusEl = document.getElementById('snapshot-status-text');

const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const bookmarkBtn = document.getElementById('bookmark-btn');
const bookmarkStarIcon = document.getElementById('bookmark-star-icon');
const monitorWatchBtn = document.getElementById('monitor-watch-btn');
const monitorBellIcon = document.getElementById('monitor-bell-icon');
const autoplayBtn = document.getElementById('autoplay-btn');
const autoplayIcon = document.getElementById('autoplay-icon');
const sliderTooltip = document.getElementById('slider-tooltip');
const shareBtn = document.getElementById('share-btn');
const refreshSnapshotsBtn = document.getElementById('refresh-snapshots-btn');
let autoplayInterval = null;
let hoverPreloadTimer = null;
let hoverAbortController = null;

// Toolbar buttons
const toggleSearchBtn = document.getElementById('toggle-search-btn');
const screenshotBtn = document.getElementById('screenshot-btn');
const openTabBtn = document.getElementById('open-tab-btn');
const openDiffBtn = document.getElementById('open-diff-btn');
const openGridBtn = document.getElementById('open-grid-btn');
const openDashboardBtn = document.getElementById('open-dashboard-btn');
const liveSwapBtn = document.getElementById('live-swap-btn');

const searchBarContainer = document.getElementById('search-bar-container');
const urlSearchForm = document.getElementById('url-search-form');
const urlSearchInput = document.getElementById('url-search-input');

const archiveFrame = document.getElementById('archive-frame');

// Overlays
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');
const emptyOverlay = document.getElementById('empty-overlay');
const errorOverlay = document.getElementById('error-overlay');
const introOverlay = document.getElementById('intro-overlay');

const searchDomainFallbackBtn = document.getElementById('search-domain-fallback-btn');
const openActiveSearchBtn = document.getElementById('open-active-search-btn');
const retryScanBtn = document.getElementById('retry-scan-btn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  setupMessageListeners();
  setupIframeLoader();
  loadInitialState();
});

// Setup event listeners for control elements
function setupEventListeners() {
  // Navigation Arrows
  prevBtn.addEventListener('click', () => {
    if (!isViewingLive && selectedIndex > 0) {
      loadIframeSnapshotDebounced(selectedIndex - 1);
    }
  });

  nextBtn.addEventListener('click', () => {
    if (!isViewingLive && selectedIndex < snapshots.length - 1) {
      loadIframeSnapshotDebounced(selectedIndex + 1);
    }
  });

  // Slider Scrubbing
  timelineSlider.addEventListener('input', (e) => {
    if (!isViewingLive) {
      const index = parseInt(e.target.value, 10);
      loadIframeSnapshotDebounced(index);
    }
  });

  // Slider Hover Tooltips
  timelineSlider.addEventListener('mousemove', handleSliderHover);
  timelineSlider.addEventListener('mouseleave', handleSliderHoverLeave);

  // Autoplay Slideshow
  autoplayBtn.addEventListener('click', toggleAutoplay);

  // Bookmark Star
  bookmarkBtn.addEventListener('click', toggleBookmark);

  // Share QR Code (Feature 6)
  shareBtn.addEventListener('click', () => {
    let targetUrl = currentUrl;
    if (!isViewingLive && snapshots.length > 0 && selectedIndex < snapshots.length) {
      const ts = snapshots[selectedIndex];
      targetUrl = WaybackAPI.getArchiveUrl(currentUrl, ts);
    }
    if (!targetUrl) return;
    const qrUrl = `https://chart.googleapis.com/chart?chs=250x250&cht=qr&chl=${encodeURIComponent(targetUrl)}`;
    chrome.tabs.create({ url: qrUrl });
  });

  // Monitor watch
  monitorWatchBtn.addEventListener('click', toggleMonitorWatch);

  // Live vs Archive Swap
  liveSwapBtn.addEventListener('click', toggleLiveSwap);

  // Screenshot Capture
  screenshotBtn.addEventListener('click', captureScreenshot);

  // Open in new tab
  openTabBtn.addEventListener('click', openArchiveInNewTab);

  // Open diff view comparison
  openDiffBtn.addEventListener('click', () => {
    if (snapshots.length === 0 || selectedIndex >= snapshots.length) return;
    const timestamp = snapshots[selectedIndex];
    chrome.storage.local.set({ activeSession: { url: currentUrl, timestamp } }, () => {
      chrome.tabs.create({ url: 'content/diffview.html' });
    });
  });

  // Open multi warp grid view
  openGridBtn.addEventListener('click', () => {
    if (snapshots.length === 0) return;
    const timestamp = snapshots[selectedIndex];
    chrome.storage.local.set({ activeSession: { url: currentUrl, timestamp } }, () => {
      chrome.tabs.create({ url: 'content/multiwarp.html' });
    });
  });

  // Open Dashboard page
  openDashboardBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'content/dashboard.html' });
  });

  // Re-fetch snapshots
  refreshSnapshotsBtn.addEventListener('click', () => {
    if (currentUrl) {
      loadUrl(currentUrl, { bypassCache: true });
    }
  });

  // Search Bar toggles
  toggleSearchBtn.addEventListener('click', () => {
    searchBarContainer.classList.toggle('hidden');
    toggleSearchBtn.classList.toggle('active');
    if (!searchBarContainer.classList.contains('hidden')) {
      urlSearchInput.focus();
    }
  });

  // Search URL form submission
  urlSearchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let url = urlSearchInput.value.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    searchBarContainer.classList.add('hidden');
    toggleSearchBtn.classList.remove('active');
    loadUrl(url);
  });

  // Keyboard Navigation
  document.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
      return;
    }

    if (e.key === 'ArrowLeft') {
      prevBtn.click();
    } else if (e.key === 'ArrowRight') {
      nextBtn.click();
    }
  });

  // Overlay Action buttons
  searchDomainFallbackBtn.addEventListener('click', () => {
    const domain = WaybackAPI.getDomain(currentUrl);
    if (domain) {
      loadUrl(`https://${domain}`, { useDomainFallback: false });
    }
  });

  openActiveSearchBtn.addEventListener('click', () => {
    searchBarContainer.classList.remove('hidden');
    toggleSearchBtn.classList.add('active');
    urlSearchInput.focus();
  });

  retryScanBtn.addEventListener('click', () => {
    if (currentUrl) {
      loadUrl(currentUrl);
    }
  });
}

// Listen for tab changes
function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'tabChanged') {
      loadUrl(message.url);
    }
  });
}

// Iframe completion hook
function setupIframeLoader() {
  archiveFrame.addEventListener('load', () => {
    showLoadingOverlay(false);
  });
}

// Load initial state on open
async function loadInitialState() {
  // Check if a session was stored by dashboard or previous launch
  const result = await chrome.storage.local.get('activeSession');
  const session = result.activeSession;
  
  if (session && session.url) {
    // Clear active session to prevent loading stale URL next time
    await chrome.storage.local.remove('activeSession');
    loadUrl(session.url, { targetTimestamp: session.timestamp });
  } else {
    // Query active tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        const url = tabs[0].url;
        if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) {
          showIntro();
        } else {
          loadUrl(url);
        }
      } else {
        showIntro();
      }
    });
  }
}

// Load URL snapshots and setup timeline
async function loadUrl(url, options = {}) {
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('about:')) {
    return;
  }

  stopAutoplay();
  currentUrl = url;
  const domain = WaybackAPI.getDomain(url);
  targetDomainEl.textContent = domain || url;
  
  hideAllOverlays();
  showLoadingOverlay(true, 'Scanning history...');
  
  isViewingLive = false;
  liveSwapBtn.classList.remove('active-live');
  selectedDateEl.classList.remove('live-mode');
  
  // Close search bar
  searchBarContainer.classList.add('hidden');
  toggleSearchBtn.classList.remove('active');

  chrome.runtime.sendMessage({
    action: 'fetchSnapshots',
    url: url,
    bypassCache: options.bypassCache || false,
    useDomainFallback: options.useDomainFallback !== undefined ? options.useDomainFallback : true
  }, async (response) => {
    if (chrome.runtime.lastError || !response || !response.success) {
      showError(response ? response.error : 'Wayback Machine is unreachable.');
      return;
    }

    snapshots = response.snapshots || [];
    if (snapshots.length === 0) {
      showEmpty();
      return;
    }

    // Set timeline properties
    timelineSlider.disabled = false;
    timelineSlider.min = 0;
    timelineSlider.max = snapshots.length - 1;

    // Get years
    const firstYear = snapshots[0].slice(0, 4);
    const lastYear = snapshots[snapshots.length - 1].slice(0, 4);
    sliderMinYearEl.textContent = firstYear;
    sliderMaxYearEl.textContent = lastYear;
    snapshotStatusEl.textContent = `${snapshots.length} captures`;

    // Determine target index
    let targetIndex = snapshots.length - 1; // Default latest
    if (options.targetTimestamp) {
      const matchIndex = snapshots.indexOf(options.targetTimestamp);
      if (matchIndex !== -1) {
        targetIndex = matchIndex;
      } else {
        targetIndex = findNearestTimestampIndex(options.targetTimestamp);
      }
    }

    // Load selected archive
    selectedIndex = targetIndex;
    timelineSlider.value = selectedIndex;
    
    if (debounceTimer) clearTimeout(debounceTimer);
    
    const timestamp = snapshots[selectedIndex];
    const archiveUrl = WaybackAPI.getArchiveUrl(currentUrl, timestamp);
    
    updateTimelineDisplay();
    showLoadingOverlay(true, `Warping to ${WaybackAPI.formatTimestamp(timestamp)}...`);
    
    loadIframeContent(currentUrl, timestamp);
    
    // Add to history
    await WaybackCache.addRecent(currentUrl, timestamp);
  });
}

// Debounced scrubbing loading
function loadIframeSnapshotDebounced(index) {
  if (isViewingLive) return;

  selectedIndex = index;
  timelineSlider.value = selectedIndex;
  
  const timestamp = snapshots[selectedIndex];
  updateTimelineDisplay();
  
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  
  showLoadingOverlay(true, `Preparing warp to ${WaybackAPI.formatTimestamp(timestamp)}...`);
  
  debounceTimer = setTimeout(async () => {
    showLoadingOverlay(true, `Warping to ${WaybackAPI.formatTimestamp(timestamp)}...`);
    loadIframeContent(currentUrl, timestamp);
    
    await WaybackCache.addRecent(currentUrl, timestamp);
  }, 350);
}

// Update the controls and labels on UI
async function updateTimelineDisplay() {
  if (snapshots.length === 0 || selectedIndex < 0 || selectedIndex >= snapshots.length) {
    return;
  }
  
  if (isViewingLive) {
    selectedDateEl.textContent = 'LIVE VIEW';
    selectedDateEl.classList.add('live-mode');
    prevBtn.disabled = true;
    nextBtn.disabled = true;
    timelineSlider.disabled = true;
    bookmarkBtn.style.display = 'none';
  } else {
    selectedDateEl.classList.remove('live-mode');
    bookmarkBtn.style.display = 'block';
    
    const timestamp = snapshots[selectedIndex];
    selectedDateEl.textContent = WaybackAPI.formatTimestamp(timestamp);
    
    // Navigation states
    prevBtn.disabled = selectedIndex === 0;
    nextBtn.disabled = selectedIndex === snapshots.length - 1;
    timelineSlider.disabled = false;
    
    // Check bookmark status
    const bookmarked = await WaybackCache.isBookmarked(currentUrl, timestamp);
    if (bookmarked) {
      bookmarkBtn.classList.add('favorited');
      bookmarkStarIcon.setAttribute('fill', 'var(--warn-color)');
    } else {
      bookmarkBtn.classList.remove('favorited');
      bookmarkStarIcon.setAttribute('fill', 'none');
    }
  }

  // Check monitor status
  try {
    const monitoredList = await WaybackVault.getMonitors();
    const isMonitored = monitoredList.some(m => m.url === currentUrl);
    if (isMonitored) {
      monitorWatchBtn.classList.add('watching');
      monitorBellIcon.setAttribute('fill', 'var(--accent-color)');
    } else {
      monitorWatchBtn.classList.remove('watching');
      monitorBellIcon.setAttribute('fill', 'none');
    }
  } catch (err) {
    console.error('Error loading monitors in sidepanel:', err);
  }
}

// Toggle bookmark
async function toggleBookmark() {
  if (isViewingLive || snapshots.length === 0 || selectedIndex >= snapshots.length) return;
  
  const timestamp = snapshots[selectedIndex];
  const isCurrentlyBookmarked = await WaybackCache.isBookmarked(currentUrl, timestamp);
  
  if (isCurrentlyBookmarked) {
    await WaybackCache.removeBookmark(currentUrl, timestamp);
  } else {
    const domain = WaybackAPI.getDomain(currentUrl);
    const tag = prompt("Enter a category tag (e.g. Design, News, Research) or leave blank:", "Research") || "Research";
    const title = `${domain} (${WaybackCache.formatDateString(timestamp)})`;
    await WaybackCache.addBookmark(currentUrl, timestamp, title, tag);
  }
  
  updateTimelineDisplay();
}

// Toggle Wayback Monitor for current URL
async function toggleMonitorWatch() {
  if (!currentUrl) return;
  try {
    const monitoredList = await WaybackVault.getMonitors();
    const isMonitored = monitoredList.some(m => m.url === currentUrl);
    
    if (isMonitored) {
      await WaybackVault.removeMonitor(currentUrl);
      alert('Stopped monitoring this page.');
    } else {
      await WaybackVault.addMonitor(currentUrl, 1440); // Default to daily monitoring (1440 minutes)
      alert('Warp Monitor activated! Watching this page daily for changes.');
    }
    updateTimelineDisplay();
  } catch (err) {
    console.error('Error toggling monitor:', err);
  }
}

// Toggle Live vs Archive Swap view
function toggleLiveSwap() {
  if (snapshots.length === 0) return;

  stopAutoplay();
  isViewingLive = !isViewingLive;
  
  if (isViewingLive) {
    liveSwapBtn.classList.add('active-live');
    updateTimelineDisplay();
    showLoadingOverlay(true, 'Loading live webpage...');
    archiveFrame.src = currentUrl;
  } else {
    liveSwapBtn.classList.remove('active-live');
    updateTimelineDisplay();
    
    const timestamp = snapshots[selectedIndex];
    showLoadingOverlay(true, `Restoring warp to ${WaybackAPI.formatTimestamp(timestamp)}...`);
    archiveFrame.src = WaybackAPI.getArchiveUrl(currentUrl, timestamp);
  }
}

// Capture current frame screenshot
function captureScreenshot() {
  showLoadingOverlay(true, 'Capturing view...');
  
  if (isViewingLive || snapshots.length === 0) {
    // Capture Live view directly
    chrome.runtime.sendMessage({ action: 'captureActiveTab' }, handleScreenshotResponse);
  } else {
    // Capture Archived view via background tab opening
    const timestamp = snapshots[selectedIndex];
    const archiveUrl = WaybackAPI.getArchiveUrl(currentUrl, timestamp);
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.runtime.sendMessage({
          action: 'captureArchivedTab',
          url: archiveUrl,
          originalTabId: tabs[0].id
        }, handleScreenshotResponse);
      } else {
        showLoadingOverlay(false);
        alert('Could not capture screenshot: Active tab query failed.');
      }
    });
  }
}

function handleScreenshotResponse(response) {
  showLoadingOverlay(false);
  
  if (chrome.runtime.lastError || !response || !response.success) {
    alert('Could not capture screenshot: ' + (chrome.runtime.lastError ? chrome.runtime.lastError.message : (response ? response.error : 'unknown error')));
    return;
  }

  // Trigger download of base64 PNG
  const a = document.createElement('a');
  a.href = response.dataUrl;
  
  const domain = WaybackAPI.getDomain(currentUrl) || 'page';
  const context = isViewingLive ? 'live' : snapshots[selectedIndex];
  
  a.download = `timewarp_${domain}_${context}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Hover event handlers for timeline slider tooltip
function handleSliderHover(e) {
  if (snapshots.length === 0) return;

  const rect = timelineSlider.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  const index = Math.min(snapshots.length - 1, Math.max(0, Math.round(pct * (snapshots.length - 1))));
  
  const ts = snapshots[index];
  const formattedDate = WaybackAPI.formatTimestamp(ts);
  const parts = formattedDate.split(' ');
  const cleanDateText = `${parts[0]} ${parts[1]} ${parts[2]}`;

  sliderTooltip.textContent = cleanDateText;
  sliderTooltip.style.left = (pct * 100) + '%';
  sliderTooltip.classList.remove('hidden');

  // Cancel previous pre-warming tasks
  if (hoverPreloadTimer) clearTimeout(hoverPreloadTimer);
  if (hoverAbortController) {
    hoverAbortController.abort();
    hoverAbortController = null;
  }

  // Speculative download pre-warming (150ms hover delay threshold)
  hoverPreloadTimer = setTimeout(async () => {
    hoverAbortController = new AbortController();
    await preWarmSnapshotHtml(currentUrl, ts, hoverAbortController.signal);
  }, 150);
}

function handleSliderHoverLeave() {
  if (hoverPreloadTimer) clearTimeout(hoverPreloadTimer);
  if (hoverAbortController) {
    hoverAbortController.abort();
    hoverAbortController = null;
  }
  sliderTooltip.classList.add('hidden');
}

// Autoplay Slideshow Player
function toggleAutoplay() {
  if (snapshots.length === 0 || isViewingLive) return;

  if (autoplayInterval) {
    stopAutoplay();
  } else {
    startAutoplay();
  }
}

function startAutoplay() {
  autoplayIcon.innerHTML = `
    <line x1="18" y1="4" x2="18" y2="20"></line>
    <line x1="6" y1="4" x2="6" y2="20"></line>
  `;
  autoplayBtn.title = "Pause Slideshow";
  autoplayBtn.classList.add('active');

  autoplayInterval = setInterval(() => {
    const nextIndex = getNextMonthlyIndex(selectedIndex);
    loadIframeSnapshotDebounced(nextIndex);
  }, 3000); // Step every 3 seconds
}

function stopAutoplay() {
  if (autoplayInterval) {
    clearInterval(autoplayInterval);
    autoplayInterval = null;
  }
  
  autoplayIcon.innerHTML = `<polygon points="5 3 19 12 5 21 5 3"></polygon>`;
  autoplayBtn.title = "Play slideshow (Autoplay)";
  autoplayBtn.classList.remove('active');
}

// Helper: Find next snapshot representing a new month
function getNextMonthlyIndex(currentIndex) {
  if (snapshots.length === 0) return 0;
  
  const currentTs = snapshots[currentIndex];
  const currentKey = currentTs.slice(0, 6); // YYYYMM format
  
  for (let idx = currentIndex + 1; idx < snapshots.length; idx++) {
    if (snapshots[idx].slice(0, 6) !== currentKey) {
      return idx;
    }
  }
  
  return 0; // Wrap back to oldest
}

// Speculatively downloads and caches a snapshot HTML, cancelable via AbortSignal
async function preWarmSnapshotHtml(url, timestamp, signal) {
  try {
    const cached = await WaybackVault.getOfflineSnapshot(url, timestamp);
    if (cached) return;
    
    const archiveUrl = WaybackAPI.getArchiveUrl(url, timestamp);
    const response = await fetch(archiveUrl, { signal });
    if (response.ok) {
      const html = await response.text();
      await WaybackVault.saveOfflineSnapshot(url, timestamp, html);
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      // Intentionally aborted during slider scrubbing
      return;
    }
    console.warn('Preloading snapshot failed:', err.message);
  }
}


// Open Wayback URL in standard new tab
function openArchiveInNewTab() {
  if (snapshots.length === 0 || selectedIndex >= snapshots.length) return;
  
  let targetUrl = currentUrl;
  if (!isViewingLive) {
    const timestamp = snapshots[selectedIndex];
    targetUrl = WaybackAPI.getArchiveUrl(currentUrl, timestamp);
  }
  
  chrome.tabs.create({ url: targetUrl });
}

// Helper: find nearest timestamp index
function findNearestTimestampIndex(targetTimestamp) {
  if (snapshots.length === 0) return 0;
  
  const targetNum = parseInt(targetTimestamp, 10);
  let minDiff = Infinity;
  let nearestIndex = 0;
  
  for (let i = 0; i < snapshots.length; i++) {
    const currentNum = parseInt(snapshots[i], 10);
    const diff = Math.abs(currentNum - targetNum);
    if (diff < minDiff) {
      minDiff = diff;
      nearestIndex = i;
    }
  }
  return nearestIndex;
}

// Overlays display control
function hideAllOverlays() {
  loadingOverlay.classList.add('hidden');
  emptyOverlay.classList.add('hidden');
  errorOverlay.classList.add('hidden');
  introOverlay.classList.add('hidden');
}

function showLoadingOverlay(show, text = 'Loading...') {
  if (show) {
    loadingText.textContent = text;
    loadingOverlay.classList.remove('hidden');
  } else {
    loadingOverlay.classList.add('hidden');
  }
}

function showEmpty() {
  hideAllOverlays();
  emptyOverlay.classList.remove('hidden');
  
  timelineSlider.disabled = true;
  timelineSlider.value = 0;
  selectedDateEl.textContent = 'No captures';
  prevBtn.disabled = true;
  nextBtn.disabled = true;
}

function showError(msg) {
  hideAllOverlays();
  errorOverlay.classList.remove('hidden');
  document.getElementById('error-message').textContent = msg || 'Could not fetch snapshots.';
}

function showIntro() {
  hideAllOverlays();
  introOverlay.classList.remove('hidden');
  timelineSlider.disabled = true;
  selectedDateEl.textContent = 'Time Warp Off';
}

// Load archived snapshot HTML content using IndexedDB cache and absolute-ified Blobs
function loadIframeContent(url, timestamp) {
  const archiveUrl = WaybackAPI.getArchiveUrl(url, timestamp);

  chrome.runtime.sendMessage({
    action: 'fetchRawHtml',
    url: archiveUrl
  }, (response) => {
    if (chrome.runtime.lastError || !response || !response.success) {
      // Fallback to direct src URL on error
      archiveFrame.src = archiveUrl;
      return;
    }

    let html = response.html || '';

    // Rewrite relative references to Wayback absolute assets
    const prefix = `https://web.archive.org/web/${timestamp}/`;
    html = html.replace(/(href|src|action)=\"\/(?!\/)/gi, `$1="${prefix}`);
    html = html.replace(/(href|src|action)=\'\/(?!\/)/gi, `$1='${prefix}`);
    
    html = html.replace(/(href|src|action)=\"\/web\//gi, `$1="https://web.archive.org/web/`);
    html = html.replace(/(href|src|action)=\'\/web\//gi, `$1='https://web.archive.org/web/`);

    try {
      const blob = new Blob([html], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      archiveFrame.src = blobUrl;
    } catch (err) {
      console.error('Error creating Blob URL for iframe:', err);
      archiveFrame.src = archiveUrl;
    }
  });
}
