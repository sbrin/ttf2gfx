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
