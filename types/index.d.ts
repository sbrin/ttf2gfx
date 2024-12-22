import { FontPack, debugCanvas } from './core/glyphRasterizer';
import { createGFXFont } from './adapters/GFXFont';
/**
 * Converts a font File into an Adafruit_GFX-compatible font File.
 *
 * @param inputFile - The input font File (TTF, OTF, WOFF).
 * @param pixelHeight - Desired font height in pixels. Defaults to 12.
 * @returns A Promise that resolves to the output File containing the Adafruit_GFX font.
 */
export declare function truetype2gfx(inputFile: File, pixelHeight?: number, format?: 'file' | 'string'): Promise<FontPack | File | string>;
export { createGFXFont, debugCanvas };
