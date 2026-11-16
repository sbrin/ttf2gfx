import {GFXGlyph, toCppVariableName, writeGFXHeader} from './createGFXFont';

/** Adafruit_GFX draws characters by an 8-bit code, so a GFX font holds code points up to 0xFF. */
export const GFX_MAX_CODE_POINT = 0xff;
/** `GFXglyph.bitmapOffset` is a 16-bit number. */
const GFX_MAX_BITMAP_BYTES = 0xffff;

/** A BDF glyph in standard BDF coordinates: the BBX offset is the lower-left corner, y up. */
type BdfGlyph = {
    code: number;
    advance: number;
    width: number;
    height: number;
    offsetX: number;
    offsetY: number;
    /** One entry per pixel, row by row from the top: 1 when the pixel is set. */
    pixels: Uint8Array;
};

type BdfFont = {
    family: string;
    ascent: number;
    descent: number;
    glyphs: BdfGlyph[];
};

export type BdfToGfxResult = {
    /** The C name of the font: `display.setFont(&name)`. */
    name: string;
    /** The header file text. */
    content: string;
    /** Glyphs in the font (code points up to 0xFF). */
    glyphCount: number;
    /** Bytes of the bitmap and glyph tables on the device. */
    byteSize: number;
};

function toInt(value: string | undefined, fallback = 0): number {
    const parsed = parseInt(value ?? '', 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function readFamily(line: string): string {
    const name = line.slice('FONT'.length).trim();
    // An XLFD name (-Foundry-Family-Weight-…) is reduced to its family.
    return (name.startsWith('-') && name.split('-')[2]) || name;
}

function readBdf(source: string): BdfFont {
    const lines = source.split(/\r?\n/);
    if (!lines.some((line) => line.startsWith('STARTFONT'))) {
        throw new Error('The file is not a BDF font.');
    }
    let family = 'font';
    let ascent: number | null = null;
    let descent: number | null = null;
    let boxHeight = 0;
    let boxOffsetY = 0;
    const glyphs = new Map<number, BdfGlyph>();
    let glyph: BdfGlyph | null = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const parts = line.split(/\s+/);
        switch (parts[0]) {
            case 'FONT':
                family = readFamily(line) || family;
                break;
            case 'FONTBOUNDINGBOX':
                boxHeight = toInt(parts[2]);
                boxOffsetY = toInt(parts[4]);
                break;
            case 'FONT_ASCENT':
                ascent = toInt(parts[1]);
                break;
            case 'FONT_DESCENT':
                descent = toInt(parts[1]);
                break;
            case 'STARTCHAR':
                glyph = {code: -1, advance: 0, width: 0, height: 0, offsetX: 0, offsetY: 0, pixels: new Uint8Array(0)};
                break;
            case 'ENCODING':
                if (glyph) glyph.code = toInt(parts[1], -1);
                break;
            case 'DWIDTH':
                if (glyph) glyph.advance = toInt(parts[1]);
                break;
            case 'BBX':
                if (glyph) {
                    glyph.width = Math.max(0, toInt(parts[1]));
                    glyph.height = Math.max(0, toInt(parts[2]));
                    glyph.offsetX = toInt(parts[3]);
                    glyph.offsetY = toInt(parts[4]);
                }
                break;
            case 'BITMAP':
                if (glyph) {
                    glyph.pixels = new Uint8Array(glyph.width * glyph.height);
                    for (let row = 0; row < glyph.height; row++) {
                        const hex = lines[i + 1 + row]?.trim() ?? '';
                        for (let x = 0; x < glyph.width; x++) {
                            const nibble = parseInt(hex[x >> 2] ?? '0', 16) || 0;
                            glyph.pixels[row * glyph.width + x] = (nibble >> (3 - (x & 3))) & 1;
                        }
                    }
                    i += glyph.height;
                }
                break;
            case 'ENDCHAR':
                if (glyph && glyph.code >= 0) glyphs.set(glyph.code, glyph);
                glyph = null;
                break;
        }
    }

    return {
        family,
        ascent: ascent ?? boxHeight + boxOffsetY,
        descent: descent ?? Math.max(0, -boxOffsetY),
        glyphs: [...glyphs.values()].sort((a, b) => a.code - b.code),
    };
}

/** The glyph cropped to its set pixels, offsets moved so it draws in the same place. */
function trimGlyph(glyph: BdfGlyph): BdfGlyph {
    const {width, height, pixels} = glyph;
    let top = height;
    let bottom = -1;
    let left = width;
    let right = -1;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (!pixels[y * width + x]) continue;
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
            left = Math.min(left, x);
            right = Math.max(right, x);
        }
    }
    if (bottom < 0) {
        return {...glyph, width: 0, height: 0, offsetX: 0, offsetY: 0, pixels: new Uint8Array(0)};
    }
    const trimmedWidth = right - left + 1;
    const trimmedHeight = bottom - top + 1;
    const trimmed = new Uint8Array(trimmedWidth * trimmedHeight);
    for (let y = 0; y < trimmedHeight; y++) {
        trimmed.set(pixels.subarray((top + y) * width + left, (top + y) * width + right + 1), y * trimmedWidth);
    }
    return {
        ...glyph,
        width: trimmedWidth,
        height: trimmedHeight,
        offsetX: glyph.offsetX + left,
        offsetY: glyph.offsetY + (height - 1 - bottom),
        pixels: trimmed,
    };
}

/** Adafruit_GFX bitmaps: the pixels of a glyph one after another, MSB first, no row padding. */
function packBits(pixels: Uint8Array): number[] {
    const bytes: number[] = [];
    for (let i = 0; i < pixels.length; i += 8) {
        let byte = 0;
        for (let bit = 0; bit < 8; bit++) byte = (byte << 1) | (pixels[i + bit] ? 1 : 0);
        bytes.push(byte);
    }
    return bytes;
}

function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Converts a BDF font to an Adafruit_GFX font header.
 *
 * The header holds the glyphs with code points up to 0xFF, one entry for every code from the
 * first glyph to the last; codes without a glyph get an empty entry. Glyphs keep their BDF
 * position: `xOffset` is the BBX x offset and `yOffset` is the top of the glyph box, measured
 * from the baseline downwards. The line height (`yAdvance`) is FONT_ASCENT + FONT_DESCENT.
 *
 * @param bdfText - The text of the BDF file.
 * @param name - The C name of the font. Defaults to the family in the FONT line.
 */
export function bdfToGfx(bdfText: string, name?: string): BdfToGfxResult {
    const font = readBdf(bdfText);
    const usable = font.glyphs.filter((glyph) => glyph.code <= GFX_MAX_CODE_POINT);
    if (!usable.length) {
        throw new Error('The BDF font has no glyphs an Adafruit GFX font can hold (code points up to 0xFF).');
    }
    const byCode = new Map(usable.map((glyph) => [glyph.code, glyph]));
    const first = usable[0].code;
    const last = usable[usable.length - 1].code;
    const bitmaps: number[] = [];
    const glyphs: GFXGlyph[] = [];

    for (let code = first; code <= last; code++) {
        const source = byCode.get(code);
        if (!source) {
            glyphs.push({bitmapOffset: bitmaps.length, width: 0, height: 0, xAdvance: 0, xOffset: 0, yOffset: 0});
            continue;
        }
        const glyph = trimGlyph(source);
        glyphs.push({
            bitmapOffset: bitmaps.length,
            width: glyph.width,
            height: glyph.height,
            xAdvance: clamp(source.advance, 0, 255),
            xOffset: clamp(glyph.offsetX, -128, 127),
            yOffset: glyph.height ? clamp(-(glyph.offsetY + glyph.height), -128, 127) : 0,
        });
        bitmaps.push(...packBits(glyph.pixels));
    }
    if (bitmaps.length > GFX_MAX_BITMAP_BYTES) {
        throw new Error(
            `The glyph bitmaps take ${bitmaps.length} bytes; an Adafruit GFX font holds up to ${GFX_MAX_BITMAP_BYTES}. Use fewer glyphs or a smaller font.`,
        );
    }

    const gfxName = toCppVariableName(name?.trim() || font.family);
    const content = writeGFXHeader({
        name: gfxName,
        bitmaps,
        glyphs,
        first,
        last,
        yAdvance: Math.max(1, font.ascent + font.descent),
    });
    // GFXglyph is 7 bytes on AVR (16-bit offset and five single bytes); GFXfont adds pointers and the range.
    return {
        name: gfxName,
        content,
        glyphCount: usable.length,
        byteSize: Math.max(1, bitmaps.length) + glyphs.length * 7 + 10,
    };
}
