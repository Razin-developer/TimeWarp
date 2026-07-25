# timewarp architecture notes

here is a breakdown of how the background scripts work.

video demo:
![explain-video.mp4](../explain-video.mp4)
<video src="../explain-video.mp4" controls width="100%"></video>

live site: https://timewarp-nine.vercel.app

### how it works
1. **background.js**: fetches snapshots from wayback machine API and strips X-Frame-Options headers so wayback pages can load inside the iframe without getting blocked by chrome. it also pre-loads 5 dates in advance so switching feels instant.
2. **lib/vault.js**: uses indexedDB to store cached pages. added gzip compression so the pages don't take up all your disk space.
3. **lib/diff.js**: compares HTML code. trims matching prefixes and suffixes first so it only processes lines that actually changed, which cut the diff calculation time from 500ms to ~2ms.
