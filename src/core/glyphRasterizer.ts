import * as opentype from 'opentype.js';
import {ASCII_START, ASCII_END} from '../const';

export declare type FontGlyph = {
    code?: number;
    char?: string;
    name?: string;
    bytes: number[];
    bounds: number[];
    scalableSize?: number[];
    deviceSize: number[];
};

export declare type FontMeta = {
    version?: string;
    name: string;
    size: {
        points: number;
        resolutionX: number;
        resolutionY: number;
    };
    bounds?: [number, number, number, number];
    properties?: {
        fontDescent?: number;
        fontAscent?: number;
        defaultChar?: number;
    };
    totalChars?: number;
};

export declare type FontPack = {
    meta: FontMeta;
    glyphs: Map<number, FontGlyph>;
};

export interface GlyphBitmap {
    bitmap: number[]; // Array representing the bitmap rows
    width: number;
    height: number;
    xAdvance: number;
    xOffset: number;
    yOffset: number;
}

export async function loadFont(file: File): Promise<opentype.Font> {
    const arrayBuffer = await file.arrayBuffer();
    return new Promise<opentype.Font>((resolve, reject) => {
        try {
            const font = opentype.parse(arrayBuffer);
            resolve(font);
        } catch (err) {
            reject(err);
        }
    });
}

export function extractGlyphs(font: opentype.Font): opentype.Glyph[] {
    const glyphs: opentype.Glyph[] = [];
    for (let i = ASCII_START; i <= ASCII_END; i++) {
        const glyph = font.charToGlyph(String.fromCharCode(i));
        glyphs.push(glyph);
    }
    return glyphs;
}

/**
 * Rasterizes a glyph into a monochrome bitmap.
 *
 * @param glyph - The glyph to rasterize.
 * @param font - The font object containing the glyph.
 * @param pixelHeight - The desired height of the glyph in pixels.
 * @returns The rasterized glyph as a GlyphBitmap object.
 */
export function rasterizeGlyph(glyph: opentype.Glyph, font: opentype.Font, pixelHeight: number): GlyphBitmap {
    const scale = pixelHeight / font.unitsPerEm;
    const width = Math.ceil((glyph.advanceWidth ?? 0) * scale);
    const fontAscender = font.ascender;
    const fontDescender = font.descender;
    const totalFontHeight = fontAscender - fontDescender;
    const height = Math.ceil(totalFontHeight * scale);

    const tempBitmap: number[] = new Array(width * height).fill(0);
    const baselineY = Math.round(fontAscender * scale);
    const path = glyph.getPath(0, baselineY, pixelHeight);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'black';
    path.draw(ctx);

    const imageData = ctx.getImageData(0, 0, width, height);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            tempBitmap[y * width + x] = imageData.data[idx + 3] > 127 ? 1 : 0;
        }
    }

    // Find bounds of the actual glyph content
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (tempBitmap[y * width + x]) {
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
            }
        }
    }

    // Handle empty glyphs (space, etc.)
    if (minX > maxX || minY > maxY) {
        minX = 0;
        minY = 0;
        maxX = 0;
        maxY = 0;
    }

    // Calculate new dimensions
    const trimmedHeight = maxY - minY + 1;

    // Create new trimmed bitmap
    const bytesPerRow = Math.ceil(width / 8);
    const bitmap: number[] = new Array(bytesPerRow * trimmedHeight).fill(0);

    // Copy only the content within bounds
    for (let y = 0; y < trimmedHeight; y++) {
        for (let x = 0; x < width; x++) {
            const srcX = x + minX;
            const srcY = y + minY;
            const byteIndex = y * bytesPerRow + Math.floor(x / 8);
            const bitPosition = 7 - (x % 8);
            if (tempBitmap[srcY * width + srcX]) {
                bitmap[byteIndex] |= 1 << bitPosition;
            }
        }
    }

    const xAdvance = Math.round((glyph.advanceWidth ?? 0) * scale);
    // Add removed left padding to xOffset
    const xOffset = minX;
    // Add removed top padding to yOffset
    const yOffset = baselineY - minY - 1;

    return {
        bitmap,
        width: width,
        height: trimmedHeight,
        xAdvance,
        xOffset,
        yOffset,
    };
}

export function debugCanvas(fontPack: FontPack) {
    const pixelHeight = fontPack.meta.size.points;
    const glyphs = Array.from(fontPack.glyphs.values());

    const canvas = document.createElement('canvas');
    const padding = 10;
    const glyphsPerRow = 16;
    const rows = Math.ceil(glyphs.length / glyphsPerRow);

    canvas.width = (pixelHeight + padding) * glyphsPerRow;
    canvas.height = (pixelHeight + padding) * rows;

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    glyphs.forEach((glyph, index) => {
        const row = Math.floor(index / glyphsPerRow);
        const col = index % glyphsPerRow;
        const x = col * (pixelHeight + padding) + 5;
        const y = row * (pixelHeight + padding) + 5;

        const {bounds, bytes} = glyph;
        const bytesPerRow = bytes.length / bounds[3];

        ctx.strokeStyle = '#c09';
        ctx.strokeRect(x - 0.5, y - 0.5, bounds[2] + 1, bounds[3] + 1);

        ctx.fillStyle = '#000';
        ctx.beginPath();

        for (let j = 0; j < bounds[3]; j++) {
            for (let k = 0; k < bytesPerRow; k++) {
                const byte = bytes[j * bytesPerRow + k];
                for (let l = 0; l < 8; l++) {
                    if (byte & (1 << (7 - l))) {
                        ctx.rect(x + (k * 8 + l + bounds[0]), y + j, 1, 1);
                    }
                }
            }
        }

        ctx.fill();
    });

    document.body.appendChild(canvas);
}
