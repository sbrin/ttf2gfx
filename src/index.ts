import {loadFont, extractGlyphs, normalizePixelHeight, FontPack, debugCanvas} from './core/glyphRasterizer';
import {DEFAULT_PIXEL_HEIGHT} from './const';
import {createFontPack} from './adapters/createFontPack';
import {createGFXFont, toCppVariableName} from './adapters/createGFXFont';
import {bdfToGfx} from './adapters/bdfToGfx';

/**
 * Converts a font File into an Adafruit_GFX-compatible font File.
 *
 * @param inputFile - The input font File (TTF, OTF, WOFF).
 * @param pixelHeight - Desired font height in pixels. Values below 1 pixel, or values
 * that are not a finite number, fall back to a usable height. Defaults to 10.
 * @param format - Output format: 'file' for File object, 'string' for raw content, or undefined for FontPack object.
 * @returns A Promise that resolves to the output in the specified format (FontPack, File, or string).
 */
export async function truetype2gfx(
    inputFile: File,
    pixelHeight: number = DEFAULT_PIXEL_HEIGHT,
    format?: 'file' | 'string',
): Promise<FontPack | File | string> {
    try {
        const height = normalizePixelHeight(pixelHeight);

        // Load and parse the font
        const font = await loadFont(inputFile);

        // Extract relevant glyphs
        const glyphs = extractGlyphs(font);
        const fontPack = createFontPack(font, glyphs, height);

        // Space and friends are legitimately blank, but a font where nothing at all
        // rasterized would silently yield a header that draws nothing on the device.
        if (![...fontPack.glyphs.values()].some((glyph) => glyph.bytes.some((byte) => byte !== 0))) {
            throw new Error(`Font conversion produced no visible glyphs at ${height}px.`);
        }

        switch (format) {
            case 'string':
                return createGFXFont(fontPack).content;
            case 'file': {
                const gfxFont = createGFXFont(fontPack);
                return new File([gfxFont.content], gfxFont.name + '.h', {type: 'text/plain'});
            }
            default:
                return fontPack;
        }
    } catch (error: any) {
        throw new Error(`Font conversion failed: ${error.message}`, {cause: error});
    }
}

export {createGFXFont, bdfToGfx, toCppVariableName, debugCanvas};
export type {BdfToGfxResult} from './adapters/bdfToGfx';
export type {FontPack};
