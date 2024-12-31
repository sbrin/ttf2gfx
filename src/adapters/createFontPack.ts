import {ASCII_START} from '../const';
import {FontGlyph, FontMeta, FontPack, rasterizeGlyph} from '../core/glyphRasterizer';

export function createFontPack(font: opentype.Font, glyphs: opentype.Glyph[], pixelHeight: number): FontPack {
    const meta: FontMeta = {
        name: font.names.fontFamily.en || 'Unknown Font',
        version: font.names.version?.en,
        size: {
            points: pixelHeight,
            resolutionX: 72,
            resolutionY: 72,
        },
        properties: {
            fontAscent: Math.round((font.ascender * pixelHeight) / font.unitsPerEm),
            fontDescent: Math.round((font.descender * pixelHeight) / font.unitsPerEm),
            defaultChar: 0x20,
        },
        totalChars: glyphs.length,
    };

    const glyphsMap = new Map<number, FontGlyph>();

    glyphs.forEach((glyph, index) => {
        const charCode = ASCII_START + index;
        const rasterized = rasterizeGlyph(glyph, font, pixelHeight);

        const fontGlyph: FontGlyph = {
            code: charCode,
            char: String.fromCharCode(charCode),
            name: glyph.name ?? undefined,
            bytes: rasterized.bitmap,
            // [xOffset, -yOffset, xAdvance, height],
            bounds: [rasterized.xOffset, rasterized.yOffset, rasterized.width, rasterized.height],
            deviceSize: [rasterized.width, rasterized.height],
            scalableSize: [rasterized.width, rasterized.height],
            xAdvance: rasterized.xAdvance,
        };

        glyphsMap.set(charCode, fontGlyph);
    });

    return {
        meta,
        glyphs: glyphsMap,
    };
}
