# Birthday Greeting

Static site (HTML + CSS + JS). 3D is Three.js r128, loaded from the cdnjs CDN in index.html (internet needed). No build step.

## Customize
- `js/config.js`: name, sender, message lines, balloon wishes, balloon colors
- `css/style.css`: colors (CSS variables at the top), animation timings
- `js/script.js`: 3D models (gift, cake, balloons) and animations

## Run locally
Open `index.html` in a browser, or use the VS Code "Live Server" extension.

## Deploy
Push to GitHub, then import the repo in Vercel or Netlify (framework: "Other", no build command, output directory: root), or enable GitHub Pages on the main branch.

## Extra features
- **Unlock date:** `unlockAt` in `js/config.js` (viewer's local time). Before then the gift is locked and shows a countdown. Open `index.html?preview` to bypass while testing. It is a client-side lock, so it keeps a surprise, not a secret.
- **Mic blowing:** needs https (or localhost) and the user's permission. Over plain http on a LAN address it is hidden and tapping works. Tune sensitivity with `BLOW_MIN` in `js/script.js`.
- **Reply button:** set `reply.url` in `js/config.js`.
