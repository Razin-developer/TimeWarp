# how this extension works (the brain stuff)

ok so i drew a picture of how the code works but i lost it so im just gonna write it here. basically there are 3 main parts that talk to each other and its kinda complicated but not really.

## 1. the background script (background.js)
this is like the main guy who is always running in the background. he has no UI (user interface) but he does all the hard work:
- when you load a tab, he quickly grabs the snapshots list from wayback machine.
- he also does "pre-warming" which means he fetches 5 cool dates (the oldest, newest, middle, and 1/4 and 3/4) BEFORE you even open the sidepanel so they load instantly. LITERALLY 0ms delay lol.
- he strips the X-Frame-Options headers so chrome lets us put the wayback pages inside an iframe. without this, chrome blocks it and says NO WAY.

## 2. the database (lib/vault.js)
we store the downloaded pages inside indexedDB because chrome has a tiny storage limit for normal storage.
- html code is huge so i added gzip compression! basicly it shrinks the page size by 80% so we don't run out of space on your computr.
- we also normalize the urls because trailing slashes were breaking the keys and making it reload. now it just works.

## 3. the diff engine (lib/diff.js)
when you compare two pages, this script finds all the changes.
- usually this takes forever (like 500ms which is way too slow) but i optimized it!
- basicly, it chops off the headers and footers that are exactly the same (prefix and suffix slicing) and only runs the math on the middle part. now it takes like 2ms, which is like 250x faster.

## how they talk (messaging)
the sidepanel talks to the background script using `chrome.runtime.sendMessage`.
for example when you press screenshot, the background opens a hidden tab, takes a screenshot, and closes it. its kinda hacky but it works!
