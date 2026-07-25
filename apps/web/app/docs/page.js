"use client";
import { useEffect } from "react";
import Link from "next/link";

export default function Docs() {
  useEffect(() => {
    const initMermaid = () => {
      if (window.mermaid) {
        window.mermaid.initialize({ startOnLoad: true, theme: 'dark' });
        window.mermaid.contentLoaded();
      }
    };

    if (window.mermaid) {
      initMermaid();
    } else {
      const interval = setInterval(() => {
        if (window.mermaid) {
          initMermaid();
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  return (
    <div className="container">
      <header>
        <div className="logo-rotate">📚 TIME WARP DOCS 📚</div>
        <p style={{ color: "#ff007f", marginTop: "10px", fontWeight: "bold" }}>
          how to run, use, and modify the time warp extension
        </p>
      </header>

      <nav className="nav-bar">
        <Link href="/" className="nav-link">[home]</Link>
        <Link href="/docs" className="nav-link" style={{ color: "#00ff00" }}>[docs]</Link>
      </nav>

      <div className="docs-layout">
        {/* Sidebar anchor navigation */}
        <aside className="docs-sidebar">
          <h3 style={{ marginTop: 0 }}>Sections</h3>
          <a href="#get-started" className="docs-menu-item">🚩 get started</a>
          <a href="#local-dev" className="docs-menu-item">💻 local dev</a>
          <a href="#usage" className="docs-menu-item">📖 usage guide</a>
          <a href="#architecture" className="docs-menu-item">🧠 architecture</a>
          <a href="#settings" className="docs-menu-item">⚙️ settings info</a>
        </aside>

        {/* Content Viewport */}
        <article className="docs-content">
          
          {/* Section: Get Started */}
          <section id="get-started" className="docs-section">
            <h2>🚩 getting started</h2>
            <p>ok so you wanna travel back in time? awsum. first you need to install the extension. since we dont have a chrome web store account (it costs money lol), you have to download the code and load it manually.</p>
            <p>here is a diagram of what happens when you start loading the app:</p>
            
            <div className="mermaid">
              {`graph TD
                Start[Open Chrome Sidepanel] --> CheckUrl[Check if website has snapshots]
                CheckUrl -->|No history| Fallback[Search domain fallback]
                CheckUrl -->|Has history| LoadList[Load snapshots into slider list]
                LoadList --> Warm[Pre-warm 5 milestone snapshots in cache]`}
            </div>
            
            <p>basicly once it loads, you can use the timeline slider at the bottom of the panel to scroll through years instantly.</p>
          </section>

          {/* Section: Local Dev */}
          <section id="local-dev" className="docs-section">
            <h2>💻 local dev setup</h2>
            <p>wanna hack the code or make it look different? follow these steps:</p>
            <ol>
              <li>clone the repo to your computr:
                <pre style={{ background: "#000", padding: "10px", color: "#00ff00", margin: "10px 0" }}>
                  git clone https://github.com/your-username/time-warp.git
                </pre>
              </li>
              <li>open google chrome (or brave, dont use edge cuz its bad).</li>
              <li>type <code>chrome://extensions</code> and press enter.</li>
              <li>turn on <strong>Developer mode</strong> (the toggle in the top right corner).</li>
              <li>click <strong>Load unpacked</strong> and select the extension folder (the one with the manifest.json).</li>
            </ol>
            <p>now if you edit any JS files in your editor, you have to click the reload icon in chrome://extensions to see changes. css updates without reload sometimes!</p>
          </section>

          {/* Section: Usage Guide */}
          <section id="usage" className="docs-section">
            <h2>📖 how to use the buttons</h2>
            <p>i made a bunch of controls so here is what they do:</p>
            <ul>
              <li><strong>Scrubbing slider:</strong> drag it to change the dates. hover to see dates beforehand.</li>
              <li><strong>Play slideshow:</strong> plays snapshots month-by-month so you don't watch duplicate scrapes.</li>
              <li><strong>Star button:</strong> saves the snapshot to bookmarks. it will ask you for a custom tag category (like "cool layout" or "old tech").</li>
              <li><strong>Bell button:</strong> monitors the site! if it detects changes, it lets you know.</li>
              <li><strong>QR Code button:</strong> shares the current wayback link to your phone immediately.</li>
              <li><strong>Diff Inspector (#):</strong> opens a new tab where you can inspect additions (+) and deletions (-) in raw html code side-by-side!</li>
            </ul>

            <p>here is a diagram showing how cache fetches work when you scroll:</p>
            
            <div className="mermaid">
              {`graph TD
                Hover[Hover over slider tick] --> CheckDB{In IndexedDB Cache?}
                CheckDB -->|Yes| UseCache[Return raw HTML instantly 0ms]
                CheckDB -->|No| FetchNet[Fetch Wayback HTML from net]
                FetchNet --> Gzip[Compress with Gzip stream]
                Gzip --> WriteDB[Save ArrayBuffer to database]
                UseCache --> View[Paint inside same-origin Blob IFrame]
                WriteDB --> View`}
            </div>
          </section>

          {/* Section: Architecture */}
          <section id="architecture" className="docs-section">
            <h2>🧠 architecture (code stuff)</h2>
            <p>basically, there are three main files that handle all the complex operations:</p>
            
            <div className="mermaid">
              {`graph LR
                UI[Side Panel UI / HTML] -->|chrome.runtime.sendMessage| Worker[background.js Worker]
                Worker -->|fetch pages| API[Wayback Machine API]
                Worker -->|compress & store| DB[(IndexedDB Vault)]
                UI -->|LCS slice math| Diff[lib/diff.js Engine]`}
            </div>

            <ul>
              <li><strong>background.js:</strong> handles network fetch messages, does the pre-warming, and removes iframe headers so chrome doesn't block the archives.</li>
              <li><strong>lib/vault.js:</strong> manages the database (indexedDB). it compresses strings using native <code>CompressionStream('gzip')</code> before writing to save space.</li>
              <li><strong>lib/diff.js:</strong> difference calculator. it cuts off matching headers and footers (prefix/suffix slicing) so the math matrix size is super small. makes diff calculations take 2ms instead of 500ms!</li>
            </ul>
          </section>

          {/* Section: Settings */}
          <section id="settings" className="docs-section">
            <h2>⚙️ settings details</h2>
            <p>if you click the settings gear or go to the dashboard, you can tweak these things:</p>
            <ul>
              <li><strong>Monitor Interval:</strong> select how often the extension scans your watch list for changes (every hour, daily, etc).</li>
              <li><strong>Clear Cache:</strong> a button to wipe out all the offline HTML files to save space, but keeps your bookmarks and tag folders.</li>
              <li><strong>Hard Reset:</strong> deletes literally everything and sets the app back to default.</li>
            </ul>
          </section>

        </article>
      </div>

      <footer className="footer-gif">
        <p>designed by a 13 year old. copyright 2026. see ya!</p>
      </footer>
    </div>
  );
}
