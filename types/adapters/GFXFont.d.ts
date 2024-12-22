import { FontPack } from '../core/glyphRasterizer';
export declare function encodeBitmap(bdfBytes: number[], width: number): number[];
export declare function toCppVariableName(str: string): string;
/**
 * Generates a C/C++ header file content for Adafruit_GFX-compatible font.
 *
 * @param glyphs - Array of GlyphBitmap objects representing each glyph.
 * @param fontName - The name of the font to be used in the generated header.
 * @returns A string containing the content of the .h file.
 */
export declare function createGFXFont(fontData: FontPack): {
    name: string;
    content: string;
};
