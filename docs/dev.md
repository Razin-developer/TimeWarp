# how to run this on ur computer (local dev guide) 💻⚡

sup guys! so u wanna edit my code or test this extension locally? cool! here is how u set it up step by step. its super easy i swear.

## 🎥 VIDEO DEMO FIRST (explain-video.mp4)
watch the extension demo video before u start tinkering with the code:

![Time Warp Demo](../explain-video.mp4)

<video src="../explain-video.mp4" controls width="100%"></video>

---

## 🛠️ what u need:
- a real web browser (google chrome or brave! dont use internet explorer or edge lol)
- VS Code (dark theme mandatory or u aren't a real dev)
- git installed on ur PC

---

## 🚀 step 1: clone the repo
open ur terminal / cmd and paste this:
```bash
git clone https://github.com/your-username/time-warp.git
```
or just click the green "Code" button and download ZIP if u don't like command line.

---

## 🧩 step 2: load unpacked extension in chrome
cuz Chrome Web Store costs $5 and my mom wouldn't let me use her credit card, we load it as an "unpacked extension":
1. open chrome.
2. type `chrome://extensions` in the URL bar and hit Enter.
3. turn on **Developer mode** toggle in the top right corner! (DONT FORGET THIS!)
4. click **Load unpacked** in the top left.
5. select the root folder of this project (where `manifest.json` is).

BOOM! Time Warp is now live in ur browser! 💥

---

## ⚡ step 3: editing stuff
- sidepanel stuff is in `content/sidepanel.html` and `content/sidepanel.js`.
- if u edit `.js` files, click the tiny reload arrow icon on the Time Warp extension card in `chrome://extensions`.
- if stuff breaks, right click the icon -> Inspect to open developer console!
