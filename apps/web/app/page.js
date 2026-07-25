import Link from "next/link";

export default function Home() {
  return (
    <div className="container">
      <header>
        <div className="logo-rotate">⚡ TIME WARP ⚡</div>
        <p style={{ color: "#ff007f", marginTop: "10px", fontWeight: "bold" }}>
          travel back in time in your sidebar (no lag allowed!!!)
        </p>
      </header>

      <nav className="nav-bar">
        <Link href="/" className="nav-link" style={{ color: "#00ff00" }}>[home]</Link>
        <Link href="/docs" className="nav-link">[docs]</Link>
      </nav>

      <main>
        <section className="hero-box">
          <h2>hey there! welcome to my webpage.</h2>
          <p>so basically i got tired of using the official internet archive wayback machine website because it is super slow and opening 50 tabs to compare stuff makes my browser crash lol. so i stayed up all night and wrote this chrome extension called <strong>Time Warp</strong>.</p>
          <p>it puts a slick chronological slider right in your chrome sidepanel so you can scrub through web history like a youtube video progress bar. and its realy fast because i added gzip compression and smart caching stuff so you don't run out of space on your computr!</p>
        </section>

        <h2>epic features i built:</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <h3>📅 monthly autoplay</h3>
            <p>dont wanna scrub the slider yourself? press play and it automatically loops month-by-month, skipping duplicate daily scrapes so its super smooth!</p>
          </div>
          <div className="feature-card">
            <h3>⚡ speculative pre-warming</h3>
            <p>when you hover over the timeline slider, it starts preloading the page in the background! if you move your mouse away, it aborts the fetch immediately so it doesn't waste your internet.</p>
          </div>
          <div className="feature-card">
            <h3>🕵️ diff inspector</h3>
            <p>opens a split-screen view showing exactly what code got added (+) or deleted (-) with a vertical minimap you can click to scroll around!</p>
          </div>
          <div className="feature-card">
            <h3>📱 share qr codes</h3>
            <p>want to see the old version on your phone? click the qr button, scan the screen, and boom you are browsing old pages on your mobile device.</p>
          </div>
        </div>

        <section className="install-box">
          <h2 style={{ marginTop: 0, color: "#ff007f" }}>how to install (its free)</h2>
          <p>since i dont have a google developer license (cuz it costs $5 and my mom wont let me buy it), we have to load it using the "unpacked" method. here is what you do:</p>
          
          <ol>
            <li>clone the repo or download the zip from github:
              <code>git clone https://github.com/your-username/time-warp.git</code>
            </li>
            <li>open google chrome (or brave, brave is cool too).</li>
            <li>type <strong>chrome://extensions</strong> in the address bar and press enter.</li>
            <li>enable the <strong>Developer mode</strong> toggle in the top-right corner.</li>
            <li>click <strong>Load unpacked</strong> in the top-left and select the folder you downloaded!</li>
          </ol>
          <p>thats it! now go to any site, open the sidepanel, and start warping time!</p>
        </section>

        <div style={{ textAlign: "center", margin: "30px 0" }}>
          <p>want to see the code architecture and developer stuff?</p>
          <Link href="/docs" style={{ fontSize: "20px" }}>👉 read the docs here 👈</Link>
        </div>
      </main>

      <footer className="footer-gif">
        <p>🚧 this site is under construction but not really 🚧</p>
        <p>designed by a 13 year old. no ai was harmed in the making of this site. copyright 2026 lol.</p>
      </footer>
    </div>
  );
}
