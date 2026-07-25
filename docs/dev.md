# local dev setup for timewarp

whats up if u wanna test timewarp on your PC or edit the code here is how to do it. i tried to make it as simple as possible.

check out the demo clip first:
![explain-video.mp4](../explain-video.mp4)
<video src="../explain-video.mp4" controls width="100%"></video>

also live site link: https://timewarp-nine.vercel.app

### requirements
- google chrome or brave (dont use edge lol)
- vs code
- git

### steps
1. clone the repo or download the zip:
```bash
git clone https://github.com/Razin-developer/TimeWarp.git
```
2. open chrome and go to `chrome://extensions`
3. toggle on **Developer mode** at the top right
4. click **Load unpacked** and pick the folder where `manifest.json` is located

now the extension icon should show up in your extension list! if u change any javascript files make sure u click the little reload icon on the extension card so chrome loads the new code.
