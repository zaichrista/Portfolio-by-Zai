# Zaira Christa — Portfolio

A static portfolio site: plain HTML and CSS with a little JavaScript, no build step.

## Pages

- `dist/index.html` — the whole home experience in one scroll: logo and C zoom → work list (blue) → about (blush) → CV (orange) → hire me footer (green). Styles in `dist/home.css`.
- `dist/work/<project>/index.html` — one page per project (`the-reach-riverside`, `the-reach-catering`, `mandaloun`, `zc-studios`). Styles in `dist/project.css`, preview scaling and the turning ZC mark in `dist/project.js`. Each has a strip of all four projects at the bottom with previous/next arrows.
- `dist/transition.js` — page transitions: the C grows from the click point between projects (links marked `data-iris`), and the project strip drops away when leaving for the main page.

## Filling in the project pages

Each project page embeds a sandboxed live preview (an iframe of the GitHub Pages build) while "View full website" goes to the official domain. Year is not shown until it's supplied. The bottom strip's tiles show the project names until you swap in each logo (look for the comment above the tiles).
