# how to run this on your computer (local dev)

sup so you wanna change my code or run it locally? cool. here is how you do it step by step. its realy easy i promise.

## what you need
- a web browser (like google chrome or brave, dont use edge lol)
- a text editor (i use vs code because the dark mode looks cool)
- git installed (or you can just download the zip file from github if you dont know git)

## step 1: get the code
open your terminal or cmd and run this command:
```bash
git clone https://github.com/your-username/time-warp.git
```
or just click the green "Code" button on github and select "Download ZIP" then extract it.

## step 2: load it into chrome
since we dont have a chrome web store license (cuz it costs $5 and my mom wont give me her credit card), we have to load it as an "unpacked extension".
1. open google chrome.
2. type `chrome://extensions` in the address bar and press enter.
3. turn on the **Developer mode** toggle in the top right corner! (very important!)
4. click the **Load unpacked** button in the top left.
5. select the folder where the code is (the folder containing `manifest.json`).

BOOM. now you should see the "Time Warp" icon in your extensions list!

## step 3: editing the code
if you wanna change how things look:
- the sidepanel stuff is in `content/sidepanel.html` and `content/sidepanel.js`.
- if you change javascript files, you MUST click the little reload arrow icon on the Time Warp card inside `chrome://extensions` so chrome updates it.
- if you change css, sometimes it updates automatically but just click reload anyway to be safe.

if the extension breaks and nothing works, right click the icon, click "Inspect" or open the background page console to see the errors.
