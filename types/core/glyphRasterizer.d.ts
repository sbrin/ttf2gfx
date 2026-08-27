import * as opentype from 'opentype.js';
export declare type FontGlyph = {
    code?: number;
    char?: string;
    name?: string;
    bytes: number[];
    bounds: number[];
    scalableSize?: number[];
    xAdvance: number;
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
    bitmap: number[];
    width: number;
    height: number;
    xAdvance: number;
    xOffset: number;
    yOffset: number;
}
export declare function loadFont(file: File): Promise<opentype.Font>;
/**
 * Coerces a caller-supplied pixel height into a usable integer.
 *
 * Callers routinely pass values straight from a number input, where clearing the
 * field yields `''` and Vue's `v-model.number` leaves it as a string. Anything
 * that is not a finite number becomes the default, and valid numbers are floored
 * to at least one pixel so the rasterizer never builds a zero-sized canvas.
 */
export declare function normalizePixelHeight(pixelHeight: unknown): number;
export declare function extractGlyphs(font: opentype.Font): opentype.Glyph[];
/**
 * Rasterizes a glyph into a monochrome bitmap.
 *
 * @param glyph - The glyph to rasterize.
 * @param font - The font object containing the glyph.
 * @param pixelHeight - The desired height of the glyph in pixels.
 * @returns The rasterized glyph as a GlyphBitmap object.
 */
export declare function rasterizeGlyph(glyph: opentype.Glyph, font: opentype.Font, pixelHeight: number): GlyphBitmap;
export declare function debugCanvas(fontPack: FontPack): void;
