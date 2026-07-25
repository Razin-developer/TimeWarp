# timewarp

a chrome extension for scrubbing through internet history straight from your browser sidepanel. 

web app: https://timewarp-ruddy.vercel.app

![demo video](explain-video.mp4)
<video src="explain-video.mp4" controls width="100%"></video>

i got annoyed with opening wayback machine in 50 separate browser tabs, so i put together timewarp. it hooks directly into wayback's CDX API and renders past snapshots in an iframe right beside whatever page you're currently browsing.

### features

* timeline slider at the bottom of the panel for dragging back to older captures (2008, 2012, etc)
* autoplay mode that steps month-by-month through website history like a video
* diff inspector tab showing side-by-side HTML comparisons (added/deleted tags) alongside a visual minimap
* bookmarking system with custom tag filtering (#retro, #layout)
* QR code popup so you can send archived pages to your phone
* local indexeddb storage + gzip compression to keep cached HTML sizes tiny

### docs

* [installation & dev mode](docs/dev.md)
* [how to use the UI](docs/usage.md)
* [architecture & cache design](docs/arch.md)
* [landing page web app](apps/web/README.md)

licensed under MIT / free to use or modify.
