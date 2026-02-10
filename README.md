# Baritone. Dominic Lim — static portfolio site

This is a lightweight static rebuild of https://www.baritone-dominic-lim.com/ (navigation + pages).

## Run locally
Because this is plain HTML/CSS/JS, use any static server.

### Option A: Python
```bash
cd dominic-site
python -m http.server 8000
```
Open http://localhost:8000

### Option B: VS Code Live Server
Open the folder and start Live Server.

## Deploy
Upload the folder contents to any static host (Netlify, Vercel static, Cloudflare Pages, GitHub Pages).

## Notes
- Images are referenced from Squarespace's CDN URLs.
- Video items link out to the existing Squarespace video detail pages.
- Stage gallery currently includes the first sets that were accessible via the public page parser.
