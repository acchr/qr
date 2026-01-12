# CodeCraft128

A lightweight static web page that generates Code128 barcodes from text input with PNG download functionality.

## Features

- ✅ Generate Code128 barcodes from text input
- ✅ Support for single line or multiple lines input
- ✅ Display one barcode per row
- ✅ Download barcodes in PNG format
- ✅ Download all barcodes as a ZIP file
- ✅ Modern, responsive UI
- ✅ No server required - works entirely in the browser

## Usage

1. Open `index.html` in a web browser
2. Enter the text you want to encode as a Code128 barcode
3. Click "Generate Barcode"
4. Each barcode will appear in its own row
5. Click "Download PNG" on any barcode to download it
6. Use "Download All as ZIP" to download all generated barcodes at once

## Supported Barcode Type

- **CODE128** - Code-128 barcode format

## Technologies Used

- **JsBarcode** - JavaScript barcode generation library (for Code128 barcodes)
- **JSZip** - ZIP file creation library
- Pure HTML, CSS, and JavaScript (no build process required)

## Offline Support

The application includes local copies of all required JavaScript libraries for offline use:
- `JsBarcode.all.min.js` - Barcode generation library
- `jszip.min.js` - ZIP file creation library

If local files fail to load, the application will automatically fallback to CDN sources (requires internet connection).

## Browser Compatibility

Works in all modern browsers that support:
- Canvas API
- ES6 JavaScript
- Blob API

## Notes

- The page works entirely client-side - no server or internet connection required after initial load (with local files)
- Barcodes are downloaded as PNG format (high quality, fast conversion)
- You can generate multiple barcodes and download each one individually
- Use the "Clear All" button to remove all generated barcodes
- All barcodes can be downloaded at once as a ZIP file

## Advanced Features

- **Barcode Rotation**: Rotate barcodes 0°, 90°, 180°, or 270°
- **Image Overlay**: Add custom images to barcodes (left, right, above, or below)
- **Download Scale**: Adjust image resolution from 0.5x to 3.0x
- **PWA Support**: Install as a Progressive Web App for offline use