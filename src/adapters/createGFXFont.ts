import {ASCII_END, ASCII_START} from '../const';
import {FontPack} from '../core/glyphRasterizer';

declare type GFXFont = {
    name: string;
    bitmaps: number[];
    glyphs: GFXGlyph[];
    yAdvance: number;
};

declare type GFXGlyph = {
    bitmapOffset: number;
    width: number;
    height: number;
    xAdvance: number;
    xOffset: number;
    yOffset: number;
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
        yAdvance: font.meta.size.points,
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

export function createGFXFont(fontData: FontPack): {name: string; content: string} {
    const gfxFont = encodeGFX(fontData);
    const gfxFile = `
const uint8_t ${gfxFont.name}Bitmaps[] PROGMEM = {
${gfxFont.bitmaps.map((byte: number) => '0x' + byte.toString(16).padStart(2, '0').toUpperCase()).join(', ')}
};
const GFXglyph ${gfxFont.name}Glyphs[] PROGMEM = {
${gfxFont.glyphs.map((glyph) => `\t{\t${glyph.bitmapOffset},\t${glyph.width},\t${glyph.height},\t${glyph.xAdvance},\t${glyph.xOffset},\t${glyph.yOffset}}`).join(',\n')}
};
const GFXfont ${gfxFont.name} PROGMEM = {
    (uint8_t *)${gfxFont.name}Bitmaps,
    (GFXglyph *)${gfxFont.name}Glyphs,
    0x${ASCII_START.toString(16).padStart(2, '0').toUpperCase()}, 0x${ASCII_END.toString(16).padStart(2, '0').toUpperCase()}, ${gfxFont.yAdvance + Math.floor(gfxFont.yAdvance / 10)}};
`;
    return {name: gfxFont.name, content: gfxFile};
}
