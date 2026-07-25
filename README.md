# timewarp

yo so basically i got super bored last week during summer break and decided to code a chrome extension called timewarp. it lets u inspect old versions of any website using the wayback machine API directly inside a sidepanel instead of opening 50 tabs and freezing your laptop. 

i also deployed the official site on vercel: https://timewarp-nine.vercel.app

here is a video of me clicking around testing the features:

![explain-video.mp4](explain-video.mp4)
<video src="explain-video.mp4" controls width="100%"></video>

(if github breaks the video embed just click explain-video.mp4 up in the repo files)

### cool stuff it can do
- timeline slider at the bottom so u can scrub back to like 2009 YouTube or old Roblox layout
- month by month autoplay so u can just watch site designs evolve like a movie
- side-by-side diff viewer with a minimap so u can see exact line changes in the HTML code (red for deleted green for added)
- bookmarking dates with tags like #nostalgia
- generates QR codes if u wanna open the wayback page on your phone
- cached everything with indexeddb + gzip so stuff loads pretty much instantly without lagging

### documentation i wrote
if u wanna try running it or look at the code i wrote a few markdown files in the docs folder:
- [docs/dev.md](docs/dev.md) - guide for setting it up in developer mode on chrome
- [docs/usage.md](docs/usage.md) - breakdown of what the UI buttons do 
- [docs/arch.md](docs/arch.md) - how the background script and database talk to each other
- [apps/web/README.md](apps/web/README.md) - next.js site info

my mom said i spent too much time on this instead of going outside lol. feel free to fork it or use the code just dont steal the whole thing without crediting me!
