<p align="center">
  <img src="public/pindrop-logo.png" alt="PinDrop logo" width="180">
</p>

<h1 align="center">PinDrop</h1>

<p align="center">
  A private, local-first Chrome extension for leaving comments directly on webpages.
</p>

<p align="center">
  <strong>Annotate. Review. Return with context.</strong>
</p>

PinDrop helps designers, developers, writers, and reviewers leave precise visual
feedback without switching tools or sharing page content with a third-party
service. Select an element, add a comment, and come back later to find the
annotation anchored to the page again.

## Highlights

- **Element-level comments** — place numbered pins on headings, images,
  paragraphs, buttons, and other webpage elements.
- **Persistent local storage** — annotations stay private in the browser profile
  using `chrome.storage.local`.
- **Visual comment previews** — saved comments appear beside their pins in
  compact, glass-style preview cards.
- **Resilient recovery** — annotations store multiple target signals instead of
  relying only on a fragile CSS selector.
- **Review workflow** — edit, delete, resolve, reopen, search, and filter
  current-page annotations.
- **Viewport-aware positioning** — pins follow their targets while scrolling,
  resizing, and during supported dynamic page updates.
- **No account required** — the current implementation is fully local and does
  not require a backend, cloud service, or paid API.

## Privacy

Personal annotations are private to the installed browser profile by default.
The extension currently sends no annotation data to a server. Cloud
collaboration, accounts, and sharing are intentionally not included in this
version.

PinDrop requests only these Chrome extension permissions:

- `activeTab` — access the active webpage after the user starts annotating.
- `scripting` — load the annotation interface into the active webpage.
- `storage` — save annotations locally.

## Technology

- React
- TypeScript
- Vite
- Chrome Extension Manifest V3
- Native browser APIs and Shadow DOM isolation

## Development

### Requirements

- Node.js 18 or newer
- npm
- Google Chrome or another Chromium-based browser

### Install and verify

```bash
npm install
npm run build
npm run lint
node --check public/content.js
```

The production extension is generated in `dist/`. The build includes the
Manifest V3 file, popup assets, content script, and public resources.

## Load the extension locally

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose the project's `dist` folder.
6. Open a normal webpage and refresh it.
7. Open the PinDrop popup and select **Start annotating**.
8. Click a webpage element, write a comment, and save it.

After rebuilding, return to `chrome://extensions`, click PinDrop's **Reload**
button, and refresh any webpage where the extension was already active.

## Project structure

```text
public/
  content.js       Page annotation engine and local persistence
  manifest.json    Chrome Manifest V3 configuration
src/
  App.tsx          Extension popup
  App.css          Popup styling
  main.tsx         React entry point
```

## Current scope

PinDrop is intentionally focused on a reliable local annotation workflow.
Export/import, cloud collaboration, authentication, and shared review links
are planned for future phases and are not represented as working features.

## License

No license has been selected yet. Add a license before distributing PinDrop
outside this repository.
