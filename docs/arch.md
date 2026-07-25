# how time warp works under the hood (architecture brain doc) 🧠⚙️

yo! i was gonna draw a diagram in paint but i lost the file so im writing it out here. here is how the code architecture works (its kinda crazy lowkey).

## 📹 SYSTEM DEMO VIDEO (explain-video.mp4)
watch the extension running all these background processes in real time:

![Time Warp Demo](../explain-video.mp4)

<video src="../explain-video.mp4" controls width="100%"></video>

---

## 🏗️ THE 3 MAIN PARTS:

### 1. background script (`background.js`)
this script runs 24/7 in the background without UI:
- fetches snapshot indexes from Wayback Machine API.
- **Pre-warms 5 cool dates** (oldest, newest, middle, 25%, 75%) before u even open sidepanel! LITERALLY 0ms delay lol!
- strips `X-Frame-Options` headers so Chrome lets us iframe Wayback pages without getting blocked.

### 2. database vault (`lib/vault.js`)
stores HTML pages in `indexedDB` because chrome `storage.local` is tiny:
- uses **gzip compression** to shrink HTML by 80% so we don't destroy ur hard drive space.
- normalizes URLs so trailing slashes don't cause cache misses.

### 3. diff engine (`lib/diff.js`)
calculates differences between two web pages:
- slices off identical headers & footers (prefix/suffix slicing) so algorithm only runs on modified middle parts.
- sped up comparison time from 500ms down to 2ms (250x speedup fr fr).
