# Notara

A Chrome extension that lets you create floating sticky notes on any website, with screenshot capture. Features a dark & sleek UI with neon cyan accents.

## Features

- Floating, draggable, resizable sticky notes on any webpage
- 5 color options (yellow, pink, blue, green, purple)
- Auto-saving notes with Chrome Storage sync
- Screenshot capture and thumbnail attachment
- Popup overview of all notes grouped by domain
- Context menu integration
- Badge count per tab
- Dark theme with developer-tool aesthetic

## Development

```bash
npm install
npm run dev
```

Load the extension in Chrome:
1. Go to `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `dist/` directory

## Build

```bash
npm run build
```

## Testing

```bash
npm run test:run
```

## Tech Stack

- React 19 + TypeScript
- Vite + @crxjs/vite-plugin
- Tailwind CSS v4
- Chrome Manifest V3
- html2canvas
- Vitest
