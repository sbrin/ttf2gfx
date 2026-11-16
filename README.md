# truetype2gfx

`truetype2gfx` is a versatile TypeScript library that converts standard font files (TTF, OTF, WOFF) into formats
compatible with Adafruit_GFX. This package is ideal for developers integrating custom fonts into embedded systems using
the Adafruit_GFX or TFT_eSPI library.

Works with [opentype.js](https://github.com/opentypejs/opentype.js)

## Features

- **Font Parsing**: Supports TrueType Fonts (TTF), OpenType Fonts (OTF), and Web Open Font Format (WOFF).
- **Glyph Selection**: Automatically extracts basic ASCII glyphs (character codes 32 to 126).
- **Font Conversion**: Rasterizes vector glyphs into monochrome bitmaps suitable for Adafruit_GFX.
- **Customization**: Allows specification of desired pixel height for font scaling.
- **Output Formats**: Generates output as a `FontPack`, C/C++ header file (`.h`), or as a string.
- **BDF Conversion**: Converts a BDF bitmap font to an Adafruit_GFX header (`bdfToGfx`).
- **Browser Compatibility**: Designed for use as an ES5 module in browsers.

## Installation

Install the package using npm:

```bash
npm install truetype2gfx
```

## Usage

```
// Import the truetype2gfx module
import { truetype2gfx } from 'truetype2gfx';

async function convertFont(file, pixelHeight) {
  try {
    const output = await truetype2gfx(file, pixelHeight, 'string');
    console.log('Conversion successful:', output);
  } catch (error) {
    console.error('Conversion failed:', error);
  }
}
```

## API

### `truetype2gfx(inputFile, pixelHeight?, format?)`

Converts a font file into an Adafruit GFX-compatible font format.

#### Parameters

- `inputFile` (File): The input font file (TTF, OTF, or WOFF format)
- `pixelHeight` (number, optional): Desired font height in pixels. Defaults to 12.
- `format` ('file' | 'string' | undefined, optional): Output format
    - `'file'`: Returns a File object containing the header file
    - `'string'`: Returns the raw header file content as a string
    - `undefined`: Returns a FontPack object (default)

#### Returns

Promise that resolves to one of:

- `FontPack`: Internal font representation (when format is undefined)
- `string`: Header file content (when format is 'string')
- `File`: Header file object (when format is 'file')

### `bdfToGfx(bdfText, name?)`

Converts a BDF bitmap font to an Adafruit_GFX header.

```js
import {bdfToGfx} from 'truetype2gfx';

const {name, content} = bdfToGfx(bdfText, 'clock_font');
// content: the text of clock_font.h. Use it with display.setFont(&clock_font);
```

#### Parameters

- `bdfText` (string): The text of the BDF file.
- `name` (string, optional): The C name of the font. The default is the family name in the `FONT` line.

#### Returns

An object with these fields:

- `name` (string): The C name of the font.
- `content` (string): The text of the header file.
- `glyphCount` (number): The number of glyphs in the header.
- `byteSize` (number): The bytes of the bitmap and glyph tables on the device.

#### Rules

- The header keeps the glyphs with code points from 0 to 0xFF. Adafruit_GFX uses 8-bit character codes.
- The header has one glyph entry for each code from the first glyph to the last glyph. A code without a glyph gets an
  empty entry.
- Each glyph keeps its BDF position. `xOffset` is the BBX x offset. `yOffset` is the top of the glyph box, measured
  down from the baseline.
- The line height (`yAdvance`) is `FONT_ASCENT` + `FONT_DESCENT`.
- The function throws an error if the text is not a BDF font, if no glyph has a code point up to 0xFF, or if the
  bitmap is larger than 65535 bytes.

## Debug Tools

The library includes a debug canvas renderer for visualizing the converted font:

```
import { debugCanvas } from 'truetype2gfx';
// Render font preview to a canvas element
debugCanvas(fontPack);
```

## Supported Font Formats

Only fixed width fonts (no proper variable fonts support yet).

- TrueType (.ttf)
- OpenType (.otf)
- WOFF (.woff)

## Compatibility

The generated font files are compatible with:

- AdafruitGFX
- TFT_eSPI
- many others libs

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
