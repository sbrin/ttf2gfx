import { FontPack, debugCanvas } from './core/glyphRasterizer';
import { createGFXFont } from './adapters/createGFXFont';
/**
 * Converts a font File into an Adafruit_GFX-compatible font File.
 *
 * @param inputFile - The input font File (TTF, OTF, WOFF).
 * @param pixelHeight - Desired font height in pixels. Defaults to 12.
 * @param format - Output format: 'file' for File object, 'string' for raw content, or undefined for FontPack object.
 * @returns A Promise that resolves to the output in the specified format (FontPack, File, or string).
 */
export declare function truetype2gfx(inputFile: File, pixelHeight?: number, format?: 'file' | 'string'): Promise<FontPack | File | string>;
export { createGFXFont, debugCanvas };
