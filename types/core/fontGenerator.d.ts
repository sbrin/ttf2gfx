import { FontPack } from './glyphRasterizer';
declare type GFXFont = {
    name: string;
    bitmaps: number[];
    glyphs: GFXGlyph[];
    first: number;
    last: number;
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
export declare function encodeBitmap(bdfBytes: number[], width: number): number[];
export declare function encodeGFX(font: FontPack): GFXFont;
/**
 * Generates a C/C++ header file content for Adafruit_GFX-compatible font.
 *
 * @param glyphs - Array of GlyphBitmap objects representing each glyph.
 * @param fontName - The name of the font to be used in the generated header.
 * @returns A string containing the content of the .h file.
 */
export declare function generateAdafruitGfxFont(fontData: FontPack): string;
export {};
