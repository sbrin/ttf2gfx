import {describe, expect, it} from 'vitest';
import {createGFXFont} from './createGFXFont';
import type {FontGlyph, FontPack} from '../core/glyphRasterizer';

function glyph(code: number): FontGlyph {
    return {code, bytes: [0x80], bounds: [0, 1, 1, 1], xAdvance: 2, deviceSize: [1, 1]};
}

describe('createGFXFont', () => {
    it('keeps an empty entry for an ASCII code without a glyph', () => {
        const glyphs = new Map<number, FontGlyph>();
        for (let code = 0x20; code <= 0x7e; code++) if (code !== 0x21) glyphs.set(code, glyph(code));
        const pack: FontPack = {meta: {name: 'Tiny', size: {points: 10, resolutionX: 72, resolutionY: 72}}, glyphs};

        const entries = [...createGFXFont(pack).content.matchAll(/\{\t([^}]*)\}/g)].map((match) => match[1]);
        // Adafruit_GFX reads the glyph of a code at `code - 0x20`.
        expect(entries).toHaveLength(0x7e - 0x20 + 1);
        expect(entries[1].split(',').map((value) => value.trim())).toEqual(['1', '0', '0', '0', '0', '0']);
        expect(entries[2].split(',').map((value) => value.trim())).toEqual(['1', '1', '1', '2', '0', '-1']);
    });
});
