# architecture notes

internal layout of background scripts and state handling.

demo video:
![demo video](../explain-video.mp4)
<video src="../explain-video.mp4" controls width="100%"></video>

app link: https://timewarp-ruddy.vercel.app

### components

* **background.js**: handles requests to wayback machine CDX API, strips `X-Frame-Options` response headers to allow embedding inside the sidepanel iframe, and pre-fetches key snapshot dates.
* **lib/vault.js**: stores downloaded pages in indexedDB with gzip compression to avoid browser storage limits.
* **lib/diff.js**: computes HTML diffs. pre-filters identical prefix and suffix lines before running diff matching to keep execution times under ~2ms.
