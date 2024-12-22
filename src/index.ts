import {loadFont, extractGlyphs, FontPack, debugCanvas} from './core/glyphRasterizer';
import {DEFAULT_PIXEL_HEIGHT} from './const';
import {createFontPack} from './adapters/lopakaFont';
import {createGFXFont} from './adapters/GFXFont';

/**
 * Converts a font File into an Adafruit_GFX-compatible font File.
 *
 * @param inputFile - The input font File (TTF, OTF, WOFF).
 * @param pixelHeight - Desired font height in pixels. Defaults to 12.
 * @param format - Output format: 'file' for File object, 'string' for raw content, or undefined for FontPack object.
 * @returns A Promise that resolves to the output in the specified format (FontPack, File, or string).
 */
export async function truetype2gfx(
    inputFile: File,
    pixelHeight: number = DEFAULT_PIXEL_HEIGHT,
    format?: 'file' | 'string'
): Promise<FontPack | File | string> {
    try {
        // Load and parse the font
        const font = await loadFont(inputFile);

        // Extract relevant glyphs
        const glyphs = extractGlyphs(font);
        const fontPack = createFontPack(font, glyphs, pixelHeight);

        switch (format) {
            case 'string':
                return createGFXFont(fontPack).content;
            case 'file':
                const gfxFont = createGFXFont(fontPack);
                return new File([gfxFont.content], gfxFont.name + '.h', {type: 'text/plain'});
            default:
                return fontPack;
        }
    } catch (error: any) {
        throw new Error(`Font conversion failed: ${error.message}`);
    }
}

export {createGFXFont, debugCanvas};
