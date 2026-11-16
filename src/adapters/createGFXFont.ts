import {ASCII_END, ASCII_START} from '../const';
import {FontPack} from '../core/glyphRasterizer';

export type GFXGlyph = {
    bitmapOffset: number;
    width: number;
    height: number;
    xAdvance: number;
    xOffset: number;
    yOffset: number;
};

/** A font in Adafruit_GFX terms: one glyph entry for every code from `first` to `last`. */
export type GFXFont = {
    name: string;
    bitmaps: number[];
    glyphs: GFXGlyph[];
    first: number;
    last: number;
    yAdvance: number;
};

function readBit(byte: number, bit: number) {
    return (byte & (1 << bit)) >> bit;
}

function writeBit(byte: number, bit: number, value: number) {
    return byte | (value << bit);
}

function encodeBitmap(bdfBytes: number[], width: number): number[] {
    const gfxBytes: number[] = [];
    let byte = 0;
    let bitPos = 0;
    const bytesPerRow = Math.ceil(width / 8);

    for (let row = 0; row < bdfBytes.length; row += bytesPerRow) {
        for (let byteIndex = 0; byteIndex < bytesPerRow; byteIndex++) {
            const currentByte = bdfBytes[row + byteIndex] || 0; // Handle missing bytes gracefully
            for (let bitIndex = 0; bitIndex < 8; bitIndex++) {
                const col = byteIndex * 8 + bitIndex;
                if (col >= width) break; // Avoid exceeding the glyph width

                const bdfBit = readBit(currentByte, 7 - bitIndex);
                byte = writeBit(byte, 7 - bitPos, bdfBit);
                bitPos++;

                if (bitPos === 8) {
                    gfxBytes.push(byte);
                    byte = 0;
                    bitPos = 0;
                }
            }
        }
    }

    if (bitPos > 0) {
        gfxBytes.push(byte);
    }

    return gfxBytes;
}

function encodeGFX(font: FontPack): GFXFont {
    const bitmaps = [];
    const glyphs = [];
    let bitmapOffset = 0;
    for (let code = ASCII_START; code <= ASCII_END; code++) {
        const glyph = font.glyphs.get(code);
        if (!glyph) {
            // Adafruit_GFX finds a glyph at `code - first`: a missing glyph keeps an empty entry.
            glyphs.push({bitmapOffset, width: 0, height: 0, xAdvance: 0, xOffset: 0, yOffset: 0});
            continue;
        }
        const bitmap = encodeBitmap(glyph.bytes, glyph.deviceSize[0]);
        bitmaps.push(...bitmap);
        glyphs.push({
            bitmapOffset,
            width: glyph.bounds[2],
            height: glyph.bounds[3],
            xAdvance: glyph.xAdvance,
            xOffset: glyph.bounds[0],
            yOffset: -glyph.bounds[1],
        });
        bitmapOffset += bitmap.length;
    }
    const name = toCppVariableName(font.meta.name + '_' + font.meta.size.points);
    return {
        name,
        bitmaps,
        glyphs,
        first: ASCII_START,
        last: ASCII_END,
        yAdvance: font.meta.size.points + Math.floor(font.meta.size.points / 10),
    };
}

export function toCppVariableName(str: string) {
    const cppKeywords = [
        'auto',
        'double',
        'int',
        'struct',
        'break',
        'else',
        'long',
        'switch',
        'case',
        'enum',
        'register',
        'typedef',
        'char',
        'extern',
        'return',
        'union',
        'const',
        'float',
        'short',
        'unsigned',
        'continue',
        'for',
        'signed',
        'void',
        'default',
        'goto',
        'sizeof',
        'volatile',
        'do',
        'if',
        'static',
        'while',
    ];

    // Replace non-alphanumeric characters with underscores
    let variableName = str.replace(/[^a-z0-9]/gi, '_');

    // Prepend an underscore if the first character is a digit
    if (/[0-9]/.test(variableName[0])) {
        variableName = '_' + variableName;
    }

    // If name is a C++ keyword, append an underscore
    if (cppKeywords.includes(variableName)) {
        variableName += '_';
    }

    return variableName;
}

function hexByte(value: number): string {
    return '0x' + value.toString(16).padStart(2, '0').toUpperCase();
}

/** Writes a font as the C header that Adafruit_GFX reads (`display.setFont(&name)`). */
export function writeGFXHeader(gfxFont: GFXFont): string {
    const {name} = gfxFont;
    // A C array needs at least one element.
    const bitmaps = gfxFont.bitmaps.length ? gfxFont.bitmaps : [0];
    const bitmapLines: string[] = [];
    for (let i = 0; i < bitmaps.length; i += 16) {
        bitmapLines.push(bitmaps.slice(i, i + 16).map(hexByte).join(', '));
    }
    return `
const uint8_t ${name}Bitmaps[] PROGMEM = {
${bitmapLines.join(',\n')}
};
const GFXglyph ${name}Glyphs[] PROGMEM = {
${gfxFont.glyphs.map((glyph) => `\t{\t${glyph.bitmapOffset},\t${glyph.width},\t${glyph.height},\t${glyph.xAdvance},\t${glyph.xOffset},\t${glyph.yOffset}}`).join(',\n')}
};
const GFXfont ${name} PROGMEM = {
    (uint8_t *)${name}Bitmaps,
    (GFXglyph *)${name}Glyphs,
    ${hexByte(gfxFont.first)}, ${hexByte(gfxFont.last)}, ${gfxFont.yAdvance}};
`;
}

export function createGFXFont(fontData: FontPack): {name: string; content: string} {
    const gfxFont = encodeGFX(fontData);
    return {name: gfxFont.name, content: writeGFXHeader(gfxFont)};
}
