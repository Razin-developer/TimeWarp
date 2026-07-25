// Time Warp Dashboard Controller

let bookmarks = [];
let history = [];
let monitors = [];
let importData = null;

// Elements
const navBookmarks = document.getElementById('nav-bookmarks');
const navHistory = document.getElementById('nav-history');
const navMonitors = document.getElementById('nav-monitors');
const navStats = document.getElementById('nav-stats');
const navBackup = document.getElementById('nav-backup');

const sectionBookmarks = document.getElementById('section-bookmarks');
const sectionHistory = document.getElementById('section-history');
const sectionMonitors = document.getElementById('section-monitors');
const sectionStats = document.getElementById('section-stats');
const sectionBackup = document.getElementById('section-backup');

const bookmarksGrid = document.getElementById('bookmarks-grid');
const bookmarksEmpty = document.getElementById('bookmarks-empty');
const bookmarkSearch = document.getElementById('bookmark-search');

const historyRows = document.getElementById('history-rows');
const historyEmpty = document.getElementById('history-empty');
const historySearch = document.getElementById('history-search');
const clearHistoryBtn = document.getElementById('clear-history-btn');

// Monitors Elements
const addMonitorForm = document.getElementById('add-monitor-form');
const monitorUrlInput = document.getElementById('monitor-url-input');
const monitorFreqSelect = document.getElementById('monitor-freq-select');
const monitorRows = document.getElementById('monitor-rows');
const monitorsEmpty = document.getElementById('monitors-empty');

// Stats Elements
const statTotalWarps = document.getElementById('stat-total-warps');
const statUniqueDomains = document.getElementById('stat-unique-domains');
const statTotalBookmarks = document.getElementById('stat-total-bookmarks');
const statOldestSnapshot = document.getElementById('stat-oldest-snapshot');
const topDomainsList = document.getElementById('top-domains-list');
const svgChartContainer = document.getElementById('svg-chart-container');

// Backup Elements
const exportDataBtn = document.getElementById('export-data-btn');
const importFileInput = document.getElementById('import-file-input');
const importStatusText = document.getElementById('import-status-text');
const importDataBtn = document.getElementById('import-data-btn');
const resetAllBtn = document.getElementById('reset-all-btn');

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupEventListeners();
  await refreshAllData();
});

// Setup navigation between dashboard panels
function setupNavigation() {
  const navItems = [
    { btn: navBookmarks, section: sectionBookmarks },
    { btn: navHistory, section: sectionHistory },
    { btn: navMonitors, section: sectionMonitors },
    { btn: navStats, section: sectionStats },
    { btn: navBackup, section: sectionBackup }
  ];

  navItems.forEach(item => {
    item.btn.addEventListener('click', () => {
      // Deactivate all
      navItems.forEach(x => {
        x.btn.classList.remove('active');
        x.section.classList.add('hidden');
      });
      // Activate selected
      item.btn.classList.add('active');
      item.section.classList.remove('hidden');
    });
  });
}

// Setup event listeners for filtering, exporting, and importing
function setupEventListeners() {
  // Search filtering
  bookmarkSearch.addEventListener('input', filterBookmarks);
  historySearch.addEventListener('input', filterHistory);

  // Clear history
  clearHistoryBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to clear your browsing history? Bookmarks will be preserved.')) {
      await chrome.storage.local.set({ recents: [] });
      await refreshAllData();
    }
  });

  // Add Monitor Form
  addMonitorForm.addEventListener('submit', handleAddMonitor);

  // Export Data
  exportDataBtn.addEventListener('click', exportData);
  
  const exportCsvBtn = document.getElementById('export-csv-btn');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', exportCsv);
  }

  // File Upload parsing
  importFileInput.addEventListener('change', handleImportFileSelect);

  // Import Data action
  importDataBtn.addEventListener('click', importDataAction);

  // Hard reset
  resetAllBtn.addEventListener('click', async () => {
    if (confirm('DANGER! This will permanently delete ALL bookmarks, browsing history, change monitors, and cached snapshots. Are you absolutely sure?')) {
      await chrome.storage.local.clear();
      // Clear IndexedDB monitors
      try {
        const db = await WaybackVault.init();
        const tx = db.transaction(['monitors', 'offlineSnapshots'], 'readwrite');
        tx.objectStore('monitors').clear();
        tx.objectStore('offlineSnapshots').clear();
      } catch (err) {
        console.error('IndexedDB clear error:', err);
      }
      
      await refreshAllData();
      alert('Extension data reset successfully.');
      window.location.reload();
    }
  });

  // Feature 12: Clear only the offline snapshots cache
  const clearCacheBtn = document.getElementById('clear-cache-btn');
  if (clearCacheBtn) {
    clearCacheBtn.addEventListener('click', async () => {
      if (confirm('Clear all cached raw HTML offline snapshots? Bookmarked list and history will be saved.')) {
        try {
          const db = await WaybackVault.init();
          const tx = db.transaction(['offlineSnapshots'], 'readwrite');
          tx.objectStore('offlineSnapshots').clear();
          alert('Local snapshot cache cleared successfully.');
          await refreshAllData();
        } catch (err) {
          alert('Error clearing cache: ' + err.message);
        }
      }
    });
  }
}

// Pull fresh data from cache and IndexedDB vault
async function refreshAllData() {
  bookmarks = await WaybackCache.getBookmarks();
  history = await WaybackCache.getRecents();
  
  try {
    monitors = await WaybackVault.getMonitors();
  } catch (err) {
    console.error('IndexedDB load monitors error:', err);
    monitors = [];
  }
  
  renderBookmarks();
  renderHistory();
  renderMonitors();
  renderStats();
}

// ----------------------------------------
// Bookmarks Section
// ----------------------------------------
function renderBookmarks() {
  bookmarksGrid.innerHTML = '';
  
  const query = bookmarkSearch.value.toLowerCase().trim();
  const isTagSearch = query.startsWith('#');
  
  const filtered = bookmarks.filter(b => {
    if (isTagSearch) {
      const tagQuery = query.slice(1);
      return (b.tag || '').toLowerCase().includes(tagQuery);
    }
    return b.domain.toLowerCase().includes(query) || 
           b.title.toLowerCase().includes(query) ||
           b.url.toLowerCase().includes(query);
  });

  if (filtered.length === 0) {
    bookmarksEmpty.classList.remove('hidden');
    return;
  }
  bookmarksEmpty.classList.add('hidden');

  filtered.forEach(b => {
    const card = document.createElement('div');
    card.className = 'bookmark-card';
    
    const formattedDate = WaybackAPI.formatTimestamp(b.timestamp);
    const waybackUrl = WaybackAPI.getArchiveUrl(b.url, b.timestamp);

    card.innerHTML = `
      <div class="card-header-row">
        <div>
          <span class="card-domain" title="${b.domain}">${b.domain}</span>
          <span class="card-tag" style="background-color: var(--accent-light); color: var(--accent-color); font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-left: 6px; text-transform: uppercase; vertical-align: middle;">${b.tag || 'Research'}</span>
        </div>
        <button class="delete-card-btn" title="Delete Bookmark">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
      <div class="card-date-badge">
        SNAPSHOT DATE
        <span class="card-timestamp">${formattedDate}</span>
      </div>
      <div class="card-actions-row">
        <button class="launch-btn" title="Inspect snapshot in sidebar">Warp Sidebar</button>
        <a href="${waybackUrl}" target="_blank" class="open-tab-btn" title="Open snapshot page in new tab">Open Tab</a>
        <button class="open-tab-btn diff-inspector-btn" title="Launch Visual Difference Engine">Diff Inspector</button>
        <button class="open-tab-btn multi-grid-btn" title="Launch Synchronized scrolling grid">Multi-Grid</button>
      </div>
    `;

    // Hook buttons
    card.querySelector('.launch-btn').addEventListener('click', () => {
      launchInSidebar(b.url, b.timestamp);
    });

    card.querySelector('.diff-inspector-btn').addEventListener('click', () => {
      launchDiffInspector(b.url, b.timestamp);
    });

    card.querySelector('.multi-grid-btn').addEventListener('click', () => {
      launchMultiGrid(b.url, b.timestamp);
    });

    card.querySelector('.delete-card-btn').addEventListener('click', async () => {
      if (confirm(`Remove bookmark for ${b.domain} @ ${formattedDate}?`)) {
        await WaybackCache.removeBookmark(b.url, b.timestamp);
        await refreshAllData();
      }
    });

    bookmarksGrid.appendChild(card);
  });
}

function filterBookmarks() {
  renderBookmarks();
}

// ----------------------------------------
// History Section
// ----------------------------------------
function renderHistory() {
  historyRows.innerHTML = '';
  
  const query = historySearch.value.toLowerCase().trim();
  const filtered = history.filter(h => 
    h.domain.toLowerCase().includes(query) || 
    h.url.toLowerCase().includes(query)
  );

  if (filtered.length === 0) {
    document.querySelector('#section-history .table-container').classList.add('hidden');
    historyEmpty.classList.remove('hidden');
    clearHistoryBtn.disabled = true;
    return;
  }
  
  document.querySelector('#section-history .table-container').classList.remove('hidden');
  historyEmpty.classList.add('hidden');
  clearHistoryBtn.disabled = false;

  filtered.forEach(h => {
    const tr = document.createElement('tr');
    
    const formattedSnapshotDate = WaybackAPI.formatTimestamp(h.timestamp);
    const formattedViewedDate = new Date(h.viewedAt || Date.now()).toLocaleDateString();
    
    tr.innerHTML = `
      <td>
        <div class="history-domain-cell">
          <span>${h.domain}</span>
          <span class="history-url-subtext" title="${h.url}">${h.url}</span>
        </div>
      </td>
      <td>
        <div class="history-date-cell">
          ${formattedSnapshotDate}
        </div>
      </td>
      <td>
        <div class="history-viewed-cell">
          ${formattedViewedDate}
        </div>
      </td>
      <td style="text-align: right;">
        <button class="warp-link-btn">WARP</button>
      </td>
    `;

    tr.querySelector('.warp-link-btn').addEventListener('click', () => {
      launchInSidebar(h.url, h.timestamp);
    });

    historyRows.appendChild(tr);
  });
}

function filterHistory() {
  renderHistory();
}

// ----------------------------------------
// Warp Monitors Tab
// ----------------------------------------
async function handleAddMonitor(e) {
  e.preventDefault();
  const url = monitorUrlInput.value.trim();
  const freq = parseInt(monitorFreqSelect.value, 10);
  
  if (!url) return;
  
  try {
    await WaybackVault.addMonitor(url, freq);
    monitorUrlInput.value = '';
    alert('Website added to Wayback Monitor watchlist!');
    await refreshAllData();
  } catch (err) {
    console.error('Error adding monitor:', err);
    alert('Failed to save monitor details.');
  }
}

function renderMonitors() {
  monitorRows.innerHTML = '';
  
  if (monitors.length === 0) {
    document.querySelector('#section-monitors .table-container').classList.add('hidden');
    monitorsEmpty.classList.remove('hidden');
    return;
  }
  
  document.querySelector('#section-monitors .table-container').classList.remove('hidden');
  monitorsEmpty.classList.add('hidden');

  monitors.forEach(m => {
    const tr = document.createElement('tr');
    const domain = WaybackAPI.getDomain(m.url) || m.url;
    
    // Frequency text
    let freqText = 'Daily';
    if (m.frequency === 60) freqText = 'Hourly';
    if (m.frequency === 240) freqText = 'Every 4 Hours';
    if (m.frequency === 1440) freqText = 'Daily';
    if (m.frequency === 10080) freqText = 'Weekly';
    
    // Last checked
    const checkedText = m.lastChecked > 0 ? new Date(m.lastChecked).toLocaleString() : 'Pending check';
    
    // Status text
    let statusMarkup = '<span class="monitor-status checking">Active</span>';
    if (m.lastChecked > 0) {
      statusMarkup = '<span class="monitor-status synced">Synced</span>';
    }

    tr.innerHTML = `
      <td>
        <div class="history-domain-cell">
          <span>${domain}</span>
          <span class="history-url-subtext" title="${m.url}">${m.url}</span>
        </div>
      </td>
      <td>
        <span style="font-weight: 500;">${freqText}</span>
      </td>
      <td>
        <span style="font-size:12px; color:var(--text-secondary);">${checkedText}</span>
      </td>
      <td style="text-align: right;">
        <div style="display:flex; gap:6px; justify-content:flex-end;">
          <button class="warp-link-btn force-check-btn" title="Force monitor run now">Check</button>
          <button class="warp-link-btn delete-monitor-btn" style="color:var(--danger-color); border-color:rgba(255,59,48,0.2);">Delete</button>
        </div>
      </td>
    `;

    // Force Check button
    tr.querySelector('.force-check-btn').addEventListener('click', async (e) => {
      const btn = e.target;
      btn.textContent = 'Running...';
      btn.disabled = true;
      
      const cleanUrl = WaybackAPI.normalizeUrl(m.url);
      const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(cleanUrl)}&output=json&fl=timestamp,digest&collapse=timestamp:8&limit=-1`;
      
      try {
        const response = await fetch(cdxUrl);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 1) {
            const digest = data[1][1];
            await WaybackVault.updateMonitorCheck(m.url, digest);
            alert(`Check completed! Site is synced. (Content digest: ${digest})`);
          } else {
            alert('Wayback reports no captures available.');
          }
        } else {
          alert('Wayback API returned server error status ' + response.status);
        }
      } catch (err) {
        alert('Check failed: ' + err.message);
      }
      
      await refreshAllData();
    });

    // Delete monitor
    tr.querySelector('.delete-monitor-btn').addEventListener('click', async () => {
      if (confirm(`Remove monitor for ${domain}?`)) {
        await WaybackVault.removeMonitor(m.url);
        await refreshAllData();
      }
    });

    monitorRows.appendChild(tr);
  });
}

// ----------------------------------------
// Stats Section & SVG Chart
// ----------------------------------------
function renderStats() {
  statTotalWarps.textContent = history.length;
  statTotalBookmarks.textContent = bookmarks.length;

  const uniqueDomains = new Set([
    ...bookmarks.map(b => b.domain),
    ...history.map(h => h.domain)
  ]);
  statUniqueDomains.textContent = uniqueDomains.size;

  let oldestTimestamp = null;
  const allEntries = [...bookmarks, ...history];
  
  allEntries.forEach(entry => {
    if (entry.timestamp && entry.timestamp.length === 14) {
      if (!oldestTimestamp || entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
      }
    }
  });

  if (oldestTimestamp) {
    statOldestSnapshot.textContent = WaybackAPI.formatTimestamp(oldestTimestamp);
  } else {
    statOldestSnapshot.textContent = '----';
  }

  // Calculate top domains
  const domainCounts = {};
  history.forEach(h => {
    if (h.domain) domainCounts[h.domain] = (domainCounts[h.domain] || 0) + 1;
  });

  const sortedDomains = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  topDomainsList.innerHTML = '';
  if (sortedDomains.length === 0) {
    topDomainsList.innerHTML = '<li class="empty-list-text">Browse pages through Time Warp sidebar to compile stats.</li>';
  } else {
    sortedDomains.forEach(([domain, count]) => {
      const li = document.createElement('li');
      li.className = 'stat-list-item';
      li.innerHTML = `
        <span class="stat-list-domain">${domain}</span>
        <span class="stat-list-count">${count} warps</span>
      `;
      topDomainsList.appendChild(li);
    });
  }

  // Render SVG timeline density chart
  renderTimelineDensityChart();
}

function renderTimelineDensityChart() {
  svgChartContainer.innerHTML = '';
  
  // Group snapshots by year from 2008 to 2026
  const startYear = 2008;
  const endYear = 2026;
  const yearsRange = [];
  const yearCounts = {};
  
  for (let y = startYear; y <= endYear; y++) {
    yearsRange.push(y);
    yearCounts[y] = 0;
  }

  // Aggregate counts
  const allEntries = [...bookmarks, ...history];
  allEntries.forEach(entry => {
    if (entry.timestamp && entry.timestamp.length === 14) {
      const year = parseInt(entry.timestamp.slice(0, 4), 10);
      if (yearCounts[year] !== undefined) {
        yearCounts[year]++;
      }
    }
  });

  const maxCount = Math.max(...Object.values(yearCounts), 1); // Avoid division by zero
  
  // Create SVG element
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  
  // Dimensions
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 30;
  const paddingBottom = 30;
  
  const width = svgChartContainer.clientWidth || 900;
  const height = 180;
  
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  
  const barWidth = Math.floor(chartWidth / yearsRange.length) - 8;
  const xInterval = chartWidth / (yearsRange.length - 1);
  
  // Draw base line
  const baseLine = document.createElementNS(svgNS, "line");
  baseLine.setAttribute("x1", paddingLeft);
  baseLine.setAttribute("y1", height - paddingBottom);
  baseLine.setAttribute("x2", width - paddingRight);
  baseLine.setAttribute("y2", height - paddingBottom);
  baseLine.setAttribute("stroke", "var(--border-dark)");
  baseLine.setAttribute("stroke-width", "1");
  svg.appendChild(baseLine);

  // Draw chart bars
  yearsRange.forEach((year, idx) => {
    const count = yearCounts[year];
    const barHeight = count > 0 ? (count / maxCount) * chartHeight : 2; // Minimally 2px for visual reference
    
    const x = paddingLeft + (idx * xInterval) - (barWidth / 2);
    const y = height - paddingBottom - barHeight;
    
    // Group for bar and hover tooltip
    const g = document.createElementNS(svgNS, "g");
    g.setAttribute("class", "chart-bar-group");
    
    // Bar Rect
    const rect = document.createElementNS(svgNS, "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", barWidth);
    rect.setAttribute("height", barHeight);
    rect.setAttribute("class", count > 0 ? "chart-bar active" : "chart-bar");
    g.appendChild(rect);
    
    // Year label (bottom)
    // Draw text only every 2 years or 3 years if space is tight
    if (idx % 2 === 0 || yearsRange.length < 10) {
      const label = document.createElementNS(svgNS, "text");
      label.setAttribute("x", x + (barWidth / 2));
      label.setAttribute("y", height - paddingBottom + 18);
      label.setAttribute("class", "chart-label");
      label.textContent = year;
      g.appendChild(label);
    }
    
    // Value tooltip label (top, shown on hover in CSS)
    if (count > 0) {
      const valLabel = document.createElementNS(svgNS, "text");
      valLabel.setAttribute("x", x + (barWidth / 2));
      valLabel.setAttribute("y", y - 6);
      valLabel.setAttribute("class", "chart-value-label");
      valLabel.textContent = `${count} captures`;
      g.appendChild(valLabel);
    }
    
    svg.appendChild(g);
  });
  
  svgChartContainer.appendChild(svg);
}

// ----------------------------------------
// Backup & Data Section
// ----------------------------------------
async function exportData() {
  const localData = await chrome.storage.local.get(null);
  
  // Package bookmarks, history, and monitors from IndexedDB
  let exportMonitors = [];
  try {
    exportMonitors = await WaybackVault.getMonitors();
  } catch (err) {
    console.error('Backup load monitors failed:', err);
  }

  const exportPayload = {
    app: 'Time Warp',
    version: '1.1.0',
    exportedAt: Date.now(),
    bookmarks: localData.bookmarks || [],
    recents: localData.recents || [],
    monitors: exportMonitors
  };

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `time_warp_backup_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(a);
  a.click();
  
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Feature 8: Export bookmarks and history logs to CSV format
async function exportCsv() {
  const localData = await chrome.storage.local.get(null);
  const userBookmarks = localData.bookmarks || [];
  const userRecents = localData.recents || [];
  
  let csvContent = "Type,Domain,URL,Archive Timestamp,Date Logged\r\n";
  
  userBookmarks.forEach(b => {
    const row = [
      "Bookmark",
      b.domain.replace(/"/g, '""'),
      b.url.replace(/"/g, '""'),
      b.timestamp,
      new Date(b.savedAt || Date.now()).toLocaleString()
    ];
    csvContent += row.map(v => `"${v}"`).join(",") + "\r\n";
  });
  
  userRecents.forEach(r => {
    const row = [
      "History",
      r.domain.replace(/"/g, '""'),
      r.url.replace(/"/g, '""'),
      r.timestamp,
      new Date(r.viewedAt || Date.now()).toLocaleString()
    ];
    csvContent += row.map(v => `"${v}"`).join(",") + "\r\n";
  });
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const downloadUrl = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `time_warp_backup_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}

function handleImportFileSelect(e) {
  const file = e.target.files[0];
  if (!file) {
    importStatusText.textContent = 'No file chosen';
    importDataBtn.disabled = true;
    importData = null;
    return;
  }

  importStatusText.textContent = `${file.name} (${Math.round(file.size / 1024)} KB)`;
  
  const reader = new FileReader();
  reader.onload = function(evt) {
    try {
      const parsed = JSON.parse(evt.target.result);
      if (parsed.app === 'Time Warp' || (Array.isArray(parsed.bookmarks) && Array.isArray(parsed.recents))) {
        importData = parsed;
        importDataBtn.disabled = false;
        importStatusText.textContent = `${file.name} (Valid backup file)`;
      } else {
        throw new Error('Missing Bookmarks or History structure');
      }
    } catch (err) {
      importStatusText.textContent = 'Invalid file format';
      importDataBtn.disabled = true;
      importData = null;
      alert('Error parsing backup file. Make sure it is a valid Time Warp JSON file.');
    }
  };
  reader.readAsText(file);
}

async function importDataAction() {
  if (!importData) return;

  try {
    // 1. Merge Local Storage (Bookmarks and History)
    const currentBookmarks = await WaybackCache.getBookmarks();
    const currentRecents = await WaybackCache.getRecents();

    const mergedBookmarks = [...currentBookmarks];
    (importData.bookmarks || []).forEach(b => {
      const exists = mergedBookmarks.some(x => x.url === b.url && x.timestamp === b.timestamp);
      if (!exists) mergedBookmarks.push(b);
    });

    const mergedRecents = [...currentRecents];
    (importData.recents || []).forEach(r => {
      const exists = mergedRecents.some(x => x.url === r.url && x.timestamp === r.timestamp);
      if (!exists) mergedRecents.push(r);
    });

    const finalRecents = mergedRecents.sort((a,b) => (b.viewedAt || 0) - (a.viewedAt || 0)).slice(0, 10);

    await chrome.storage.local.set({
      bookmarks: mergedBookmarks,
      recents: finalRecents
    });

    // 2. Merge IndexedDB Monitors
    if (Array.isArray(importData.monitors)) {
      for (const m of importData.monitors) {
        await WaybackVault.addMonitor(m.url, m.frequency);
      }
    }

    alert('Import completed successfully!');
    importFileInput.value = '';
    importStatusText.textContent = 'No file chosen';
    importDataBtn.disabled = true;
    importData = null;

    await refreshAllData();
  } catch (error) {
    console.error('Import error:', error);
    alert('Failed to import data: ' + error.message);
  }
}

// Launcher redirect helpers
async function launchInSidebar(url, timestamp) {
  await chrome.storage.local.set({ activeSession: { url, timestamp } });
  chrome.runtime.sendMessage({ action: 'openSidePanel' }, (response) => {
    if (chrome.runtime.lastError || !response || !response.success) {
      alert('Open a standard tab page in Chrome, then select launch again.');
    }
  });
}

async function launchDiffInspector(url, timestamp) {
  await chrome.storage.local.set({ activeSession: { url, timestamp } });
  chrome.tabs.create({ url: 'content/diffview.html' });
}

async function launchMultiGrid(url, timestamp) {
  await chrome.storage.local.set({ activeSession: { url, timestamp } });
  chrome.tabs.create({ url: 'content/multiwarp.html' });
}
