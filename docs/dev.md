# developer setup

instructions for running timewarp locally as an unpacked extension.

demo video:
![demo video](../explain-video.mp4)
<video src="../explain-video.mp4" controls width="100%"></video>

app link: https://timewarp-ruddy.vercel.app

### requirements
you just need google chrome (or another chromium browser like brave) and git.

### loading into chrome

1. clone the repository:
```bash
git clone https://github.com/Razin-developer/TimeWarp.git
```
2. open `chrome://extensions` in your address bar.
3. flip the **Developer mode** switch in the top-right corner.
4. click **Load unpacked** and select the folder containing `manifest.json`.

if you edit `background.js` or scripts inside `lib/`, click the refresh icon on the extension card in `chrome://extensions` to reload the background page.
