// Time Warp - Diff Inspector Controller

let currentUrl = '';
let snapshots = [];
let liveHtml = '';
let archiveHtml = '';
let diffResult = [];

// Elements
const targetDomainEl = document.getElementById('target-domain');
const compareSnapshotSelect = document.getElementById('compare-snapshot-select');
const archivePaneTitle = document.getElementById('archive-pane-title');

const btnSplit = document.getElementById('btn-split');
const btnUnified = document.getElementById('btn-unified');
const viewSplit = document.getElementById('view-split');
const viewUnified = document.getElementById('view-unified');

const splitLeftLines = document.getElementById('split-left-lines');
const splitRightLines = document.getElementById('split-right-lines');
const unifiedLines = document.getElementById('unified-lines');

const statDeletions = document.getElementById('stat-deletions');
const statAdditions = document.getElementById('stat-additions');
const statChanges = document.getElementById('stat-changes');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupViewToggles();
  setupSyncScrolling();
  setupSearchFilter();
  setupDarkMode();
  setupLineNumbersToggle();
  loadInitialSession();
});

// Setup sidebar layout view toggles (split vs unified layout)
function setupViewToggles() {
  btnSplit.addEventListener('click', () => {
    btnSplit.classList.add('active');
    btnUnified.classList.remove('active');
    viewSplit.classList.remove('hidden');
    viewUnified.classList.add('hidden');
  });

  btnUnified.addEventListener('click', () => {
    btnUnified.classList.add('active');
    btnSplit.classList.remove('active');
    viewUnified.classList.remove('hidden');
    viewSplit.classList.add('hidden');
  });

  compareSnapshotSelect.addEventListener('change', (e) => {
    const ts = e.target.value;
    if (ts) {
      loadArchiveAndDiff(ts);
    }
  });
}

// Setup synchronized scroll bindings between left and right code columns
function setupSyncScrolling() {
  let isSyncingLeft = false;
  let isSyncingRight = false;

  splitLeftLines.addEventListener('scroll', () => {
    if (!isSyncingLeft) {
      isSyncingRight = true;
      splitRightLines.scrollTop = splitLeftLines.scrollTop;
      splitRightLines.scrollLeft = splitLeftLines.scrollLeft;
    }
    isSyncingLeft = false;
  });

  splitRightLines.addEventListener('scroll', () => {
    if (!isSyncingRight) {
      isSyncingLeft = true;
      splitLeftLines.scrollTop = splitRightLines.scrollTop;
      splitLeftLines.scrollLeft = splitRightLines.scrollLeft;
    }
    isSyncingRight = false;
  });
}

// Feature 2: Text Search Filter
function setupSearchFilter() {
  const searchInput = document.getElementById('diff-search');
  searchInput.addEventListener('input', () => {
    const keyword = searchInput.value.toLowerCase().trim();
    const rows = document.querySelectorAll('.diff-line-row');
    
    rows.forEach(row => {
      if (row.classList.contains('empty-row')) {
        row.classList.remove('filtered-out');
        return;
      }
      
      const contentText = row.querySelector('.line-content').textContent.toLowerCase();
      if (contentText.includes(keyword)) {
        row.classList.remove('filtered-out');
      } else {
        row.classList.add('filtered-out');
      }
    });
  });
}

// Feature 5: Dark Mode Toggle
function setupDarkMode() {
  const darkModeBtn = document.getElementById('dark-mode-btn');
  darkModeBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    darkModeBtn.classList.toggle('active');
  });
}

// Feature 15: Toggle Line Numbers
function setupLineNumbersToggle() {
  const toggleBtn = document.getElementById('btn-toggle-nums');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      splitLeftLines.classList.toggle('hide-line-numbers');
      splitRightLines.classList.toggle('hide-line-numbers');
      unifiedLines.classList.toggle('hide-line-numbers');
      toggleBtn.classList.toggle('active');
    });
  }
}

// Fetch session parameters
async function loadInitialSession() {
  const result = await chrome.storage.local.get('activeSession');
  const session = result.activeSession;
  
  if (session && session.url) {
    currentUrl = session.url;
    initializeDiff(currentUrl, session.timestamp);
  } else {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].url) {
        currentUrl = tabs[0].url;
        initializeDiff(currentUrl);
      } else {
        targetDomainEl.textContent = 'Select a tab page first';
        showLoading(false);
      }
    });
  }
}

// Fetch live page and CDX snapshots
function initializeDiff(url, targetTimestamp = null) {
  const domain = WaybackAPI.getDomain(url);
  targetDomainEl.textContent = domain || url;
  
  showLoading(true, 'Fetching live page copy...');

  // 1. Fetch live page HTML in background
  chrome.runtime.sendMessage({
    action: 'fetchRawHtml',
    url: url
  }, (liveResponse) => {
    if (chrome.runtime.lastError || !liveResponse || !liveResponse.success) {
      targetDomainEl.textContent = 'Failed to load live webpage content';
      showLoading(false);
      return;
    }

    liveHtml = liveResponse.html || '';

    // 2. Fetch snapshot history
    showLoading(true, 'Loading snapshot history...');
    chrome.runtime.sendMessage({
      action: 'fetchSnapshots',
      url: url,
      bypassCache: false,
      useDomainFallback: true
    }, (historyResponse) => {
      showLoading(false);
      
      if (chrome.runtime.lastError || !historyResponse || !historyResponse.success) {
        return;
      }

      snapshots = historyResponse.snapshots || [];
      if (snapshots.length === 0) {
        return;
      }

      // Populate snapshot dropdown list
      compareSnapshotSelect.innerHTML = '<option value="">Compare with Year</option>';
      
      // Filter to unique years
      const seenYears = new Set();
      const uniqueYearSnapshots = [];
      
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
        compareSnapshotSelect.appendChild(option);
      });

      // Default load target or oldest snapshot
      let defaultTimestamp = targetTimestamp || (snapshots.length > 0 ? snapshots[0] : null);
      if (defaultTimestamp) {
        if (!snapshots.includes(defaultTimestamp)) {
          const nearestIndex = findNearestTimestampIndex(defaultTimestamp);
          defaultTimestamp = snapshots[nearestIndex];
        }
        
        compareSnapshotSelect.value = defaultTimestamp;
        loadArchiveAndDiff(defaultTimestamp);
      }
    });
  });
}

// Fetch historical archive and perform diff comparison
function loadArchiveAndDiff(timestamp) {
  showLoading(true, `Fetching Wayback archive for ${timestamp.slice(0, 4)}...`);
  
  const waybackUrl = WaybackAPI.getArchiveUrl(currentUrl, timestamp);
  archivePaneTitle.innerHTML = `<span>Archived Wayback (${timestamp.slice(0,4)})</span><span class="block-indicator" id="right-block-indicator">Loading...</span>`;

  chrome.runtime.sendMessage({
    action: 'fetchRawHtml',
    url: waybackUrl
  }, (response) => {
    showLoading(false);
    
    if (chrome.runtime.lastError || !response || !response.success) {
      alert('Failed to retrieve Wayback page content.');
      return;
    }

    archiveHtml = response.html || '';
    const cached = response.cached;

    // Feature 4: Diagnostics Log
    const liveSize = (liveHtml.length / 1024).toFixed(1);
    const archiveSize = (archiveHtml.length / 1024).toFixed(1);
    document.getElementById('diagnostics-log').textContent = 
      `Live Weight: ${liveSize} KB | Archive: ${archiveSize} KB | DB Cache: ${cached ? 'HIT (0ms)' : 'MISS (Downloaded)'}`;
    
    // Compare HTML text blocks
    showLoading(true, 'Diffing copy text blocks...');
    
    setTimeout(() => {
      diffResult = WaybackDiff.compareHtml(liveHtml, archiveHtml);
      renderDiff();
      updateBloatMetrics(liveHtml, archiveHtml);
      showLoading(false);
    }, 50);
  });
}

// Render split and unified code views
function renderDiff() {
  splitLeftLines.innerHTML = '';
  splitRightLines.innerHTML = '';
  unifiedLines.innerHTML = '';

  let additionsCount = 0;
  let deletionsCount = 0;
  
  let leftLineNum = 1;
  let rightLineNum = 1;

  diffResult.forEach(item => {
    // 1. Render Unified view row
    const unifiedRow = createDiffRow(item.type, item.value, item.type === 'added' ? rightLineNum : leftLineNum);
    unifiedLines.appendChild(unifiedRow);

    // 2. Render Split view rows
    if (item.type === 'unchanged') {
      const leftRow = createDiffRow('unchanged', item.value, leftLineNum);
      const rightRow = createDiffRow('unchanged', item.value, rightLineNum);
      
      splitLeftLines.appendChild(leftRow);
      splitRightLines.appendChild(rightRow);
      
      leftLineNum++;
      rightLineNum++;
    } else if (item.type === 'deleted') {
      const leftRow = createDiffRow('deletion', item.value, leftLineNum);
      const rightRow = createDiffRow('empty', '', '');
      
      splitLeftLines.appendChild(leftRow);
      splitRightLines.appendChild(rightRow);
      
      deletionsCount++;
      leftLineNum++;
    } else if (item.type === 'added') {
      const leftRow = createDiffRow('empty', '', '');
      const rightRow = createDiffRow('addition', item.value, rightLineNum);
      
      splitLeftLines.appendChild(leftRow);
      splitRightLines.appendChild(rightRow);
      
      additionsCount++;
      rightLineNum++;
    }
  });

  // Update statistics badges
  statDeletions.textContent = deletionsCount;
  statAdditions.textContent = additionsCount;
  statChanges.textContent = deletionsCount + additionsCount;

  // Feature 3: Block Line Indicators
  document.getElementById('left-block-indicator').textContent = `${leftLineNum - 1} lines`;
  const rightIndicator = document.getElementById('right-block-indicator');
  if (rightIndicator) {
    rightIndicator.textContent = `${rightLineNum - 1} lines`;
  }

  // Feature 1: Render Interactive Minimap
  renderMinimap();
}

// Feature 1: DOM Structure Diff Minimap Renderer
function renderMinimap() {
  const track = document.getElementById('diff-minimap-track');
  track.innerHTML = '';
  
  if (diffResult.length === 0) return;
  
  // Calculate display ratio
  const maxBars = 120; // Bound bars to viewport height
  const step = Math.max(1, Math.ceil(diffResult.length / maxBars));
  
  for (let idx = 0; idx < diffResult.length; idx += step) {
    const item = diffResult[idx];
    const bar = document.createElement('div');
    bar.className = `minimap-line-bar ${item.type}`;
    bar.title = `Line ${idx + 1} [${item.type}]: ${item.value.slice(0, 30)}...`;
    
    // Smooth scrolling on bar click
    bar.addEventListener('click', () => {
      const leftRows = splitLeftLines.querySelectorAll('.diff-line-row');
      if (leftRows[idx]) {
        leftRows[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const rightRows = splitRightLines.querySelectorAll('.diff-line-row');
      if (rightRows[idx]) {
        rightRows[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      const unifiedRows = unifiedLines.querySelectorAll('.diff-line-row');
      if (unifiedRows[idx]) {
        unifiedRows[idx].scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
    
    track.appendChild(bar);
  }
}

// Helper to create line elements for code blocks
function createDiffRow(type, text, lineNum) {
  const row = document.createElement('div');
  row.className = `diff-line-row ${type === 'empty' ? 'empty-row' : type}`;
  
  const numSpan = document.createElement('span');
  numSpan.className = 'line-num';
  numSpan.textContent = lineNum;
  
  const contentSpan = document.createElement('span');
  contentSpan.className = 'line-content';
  
  let prefix = ' ';
  if (type === 'addition') prefix = '+ ';
  if (type === 'deletion') prefix = '- ';
  if (type === 'empty') prefix = '';

  contentSpan.textContent = prefix + text;
  
  row.appendChild(numSpan);
  row.appendChild(contentSpan);
  return row;
}

// Toggle loading overlays
function showLoading(show, text = '') {
  if (show) {
    loadingOverlay.classList.remove('hidden');
    loadingText.textContent = text;
  } else {
    loadingOverlay.classList.add('hidden');
  }
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

// Calculate and render DOM structure bloat analysis
function updateBloatMetrics(live, past) {
  const liveMetrics = WaybackDiff.getPageMetrics(live);
  const pastMetrics = WaybackDiff.getPageMetrics(past);

  // Update text
  document.getElementById('metric-nodes-live').textContent = liveMetrics.nodes;
  document.getElementById('metric-nodes-past').textContent = pastMetrics.nodes;

  document.getElementById('metric-scripts-live').textContent = liveMetrics.scripts;
  document.getElementById('metric-scripts-past').textContent = pastMetrics.scripts;

  document.getElementById('metric-styles-live').textContent = liveMetrics.stylesheets;
  document.getElementById('metric-styles-past').textContent = pastMetrics.stylesheets;

  document.getElementById('metric-images-live').textContent = liveMetrics.images;
  document.getElementById('metric-images-past').textContent = pastMetrics.images;

  // Set deltas
  setMetricDelta(liveMetrics.nodes, pastMetrics.nodes, 'delta-nodes');
  setMetricDelta(liveMetrics.scripts, pastMetrics.scripts, 'delta-scripts');
  setMetricDelta(liveMetrics.stylesheets, pastMetrics.stylesheets, 'delta-styles');
  setMetricDelta(liveMetrics.images, pastMetrics.images, 'delta-images');
}

function setMetricDelta(liveVal, pastVal, elementId) {
  const el = document.getElementById(elementId);
  el.className = 'delta-pct';

  if (pastVal === 0) {
    el.textContent = '--';
    el.classList.add('bloat-same');
    return;
  }

  const diff = liveVal - pastVal;
  const pct = Math.round((diff / pastVal) * 100);

  if (pct > 0) {
    el.textContent = `+${pct}%`;
    el.classList.add('bloat-up');
  } else if (pct < 0) {
    el.textContent = `${pct}%`;
    el.classList.add('bloat-down');
  } else {
    el.textContent = '0%';
    el.classList.add('bloat-same');
  }
}
