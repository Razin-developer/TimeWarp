// Time Warp - Multi-Window Grid Synchronizer

let currentUrl = '';
let snapshots = [];
const cellBlobs = [null, null, null, null];
const iframes = [
  document.getElementById('iframe-0'),
  document.getElementById('iframe-1'),
  document.getElementById('iframe-2'),
  document.getElementById('iframe-3')
];
const selects = [
  document.getElementById('select-0'),
  document.getElementById('select-1'),
  document.getElementById('select-2'),
  document.getElementById('select-3')
];
const overlays = [
  document.getElementById('overlay-0'),
  document.getElementById('overlay-1'),
  document.getElementById('overlay-2'),
  document.getElementById('overlay-3')
];

// Initialize grid
document.addEventListener('DOMContentLoaded', async () => {
  setupMessageListener();
  await loadGridContext();
});

// Setup message listener for cross-frame scroll synchronization messages
function setupMessageListener() {
  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'scroll') {
      const reportingWindowId = e.data.windowId;
      const scrollPct = e.data.scrollPct;

      // Broadcast scroll alignment to all other window frames
      iframes.forEach((iframe, idx) => {
        const iframeId = `iframe-${idx}`;
        if (iframeId !== reportingWindowId && iframe.contentWindow) {
          iframe.contentWindow.postMessage({
            type: 'syncScroll',
            scrollPct: scrollPct,
            windowId: reportingWindowId
          }, '*');
        }
      });
    }
  });
}

// Load active URL context and history
async function loadGridContext() {
  // Check active session first
  const result = await chrome.storage.local.get('activeSession');
  const session = result.activeSession;
  
  if (session && session.url) {
    currentUrl = session.url;
    // Keep target session stored so returning works, but we don't clear it here
    initializeGridForUrl(currentUrl, session.timestamp);
  } else {
    // Query active tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        currentUrl = tabs[0].url;
        initializeGridForUrl(currentUrl);
      } else {
        document.getElementById('target-domain').textContent = 'Error: Select page first';
      }
    });
  }
}

// Fetch snapshots and populate year selectors
function initializeGridForUrl(url, targetTimestamp = null) {
  const domain = WaybackAPI.getDomain(url);
  document.getElementById('target-domain').textContent = domain || url;

  chrome.runtime.sendMessage({
    action: 'fetchSnapshots',
    url: url,
    bypassCache: false,
    useDomainFallback: true
  }, (response) => {
    if (chrome.runtime.lastError || !response || !response.success) {
      alert('Could not fetch snapshots for grid: ' + (chrome.runtime.lastError ? chrome.runtime.lastError.message : 'unreachable'));
      return;
    }

    snapshots = response.snapshots || [];
    if (snapshots.length === 0) {
      alert('No archived history found for this page.');
      return;
    }

    // Populate the dropdown selectors in all cells
    selects.forEach((select, idx) => {
      select.innerHTML = '<option value="">Select Year</option>';
      
      // Filter snapshots to unique years to provide clean historical choices
      const seenYears = new Set();
      const uniqueYearSnapshots = [];
      
      // Start from oldest snapshots
      snapshots.forEach(ts => {
        const year = ts.slice(0, 4);
        if (!seenYears.has(year)) {
          seenYears.add(year);
          uniqueYearSnapshots.push({ year, timestamp: ts });
        }
      });

      uniqueYearSnapshots.forEach(item => {
        const option = document.createElement('option');
        option.value = item.timestamp;
        option.textContent = `${item.year} (${WaybackAPI.formatTimestamp(item.timestamp).slice(0, 6)})`;
        select.appendChild(option);
      });

      // Hook up change listeners
      select.addEventListener('change', (e) => {
        loadCellSnapshot(idx, e.target.value);
      });
    });

    // Auto-load distinct default years if available
    // e.g. load first 4 unique years or spread them out
    const availableOptions = selects[0].options;
    if (availableOptions.length > 1) {
      // Pick up to 4 spread choices
      const count = Math.min(4, availableOptions.length - 1);
      const step = Math.max(1, Math.floor((availableOptions.length - 1) / 4));
      
      for (let i = 0; i < count; i++) {
        const optIndex = 1 + (i * step);
        if (optIndex < availableOptions.length) {
          const val = availableOptions[optIndex].value;
          selects[i].value = val;
          loadCellSnapshot(i, val);
        }
      }
    }
  });
}

// Fetch, rewrite and load Wayback HTML into specified grid cell
function loadCellSnapshot(cellIndex, timestamp) {
  const iframeId = `iframe-${cellIndex}`;
  const overlay = overlays[cellIndex];
  const iframe = iframes[cellIndex];

  // Clean old URL Blob
  if (cellBlobs[cellIndex]) {
    URL.revokeObjectURL(cellBlobs[cellIndex]);
    cellBlobs[cellIndex] = null;
  }

  if (!timestamp) {
    iframe.src = 'about:blank';
    overlay.textContent = 'Select a snapshot to begin';
    overlay.classList.remove('hidden');
    return;
  }

  // Show spinner
  overlay.innerHTML = '<div class="cell-spinner"></div><div>Time Warping...</div>';
  overlay.classList.remove('hidden');

  const waybackUrl = WaybackAPI.getArchiveUrl(currentUrl, timestamp);

  // Request raw HTML text from background worker (bypassing CORS)
  chrome.runtime.sendMessage({
    action: 'fetchRawHtml',
    url: waybackUrl
  }, (response) => {
    if (chrome.runtime.lastError || !response || !response.success) {
      overlay.textContent = 'Failed to fetch snapshot text';
      return;
    }

    let html = response.html || '';

    // Rewrite absolute-relative paths in the fetched Wayback archive to point to web.archive.org domain
    // Replace /web/YYYY... paths
    html = html.replace(/(href|src|action)\s*=\s*"\s*\/web\//gi, '$1="https://web.archive.org/web/');
    // Replace other static assets
    html = html.replace(/(href|src|action)\s*=\s*"\s*\/_static\//gi, '$1="https://web.archive.org/_static/');
    html = html.replace(/(href|src|action)\s*=\s*"\s*\/static\//gi, '$1="https://web.archive.org/static/');
    html = html.replace(/(href|src|action)\s*=\s*"\s*\/images\//gi, '$1="https://web.archive.org/images/');

    // Inject scroll reporting and listener script right before </body>
    const scrollScript = `
      <script>
        (function() {
          let isSyncing = false;
          let syncTimeout = null;

          window.addEventListener('scroll', () => {
            if (isSyncing) return;
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPct = maxScroll > 0 ? window.scrollY / maxScroll : 0;
            
            window.parent.postMessage({
              type: 'scroll',
              scrollPct: scrollPct,
              windowId: '${iframeId}'
            }, '*');
          });

          window.addEventListener('message', (e) => {
            if (e.data && e.data.type === 'syncScroll' && e.data.windowId !== '${iframeId}') {
              isSyncing = true;
              if (syncTimeout) clearTimeout(syncTimeout);
              
              const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
              const targetY = e.data.scrollPct * maxScroll;
              
              window.scrollTo(0, targetY);
              
              syncTimeout = setTimeout(() => {
                isSyncing = false;
              }, 60);
            }
          });
        })();
      </script>
    `;

    const bodyEndIndex = html.toLowerCase().lastIndexOf('</body>');
    if (bodyEndIndex !== -1) {
      html = html.slice(0, bodyEndIndex) + scrollScript + html.slice(bodyEndIndex);
    } else {
      html = html + scrollScript;
    }

    // Convert html to Blob URL
    const blob = new Blob([html], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    cellBlobs[cellIndex] = blobUrl;

    // Load iframe
    iframe.src = blobUrl;
    
    // Hide overlay when loaded
    iframe.onload = () => {
      overlay.classList.add('hidden');
    };
  });
}
