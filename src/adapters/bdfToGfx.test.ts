import {describe, expect, it} from 'vitest';
import {bdfToGfx} from './bdfToGfx';

type Glyph = {code: number; dwidth: number; bbx: [number, number, number, number]; rows: string[]};

function bdf(glyphs: Glyph[], {ascent = 8, descent = 2, font = 'Tiny'} = {}): string {
    const chars = glyphs.flatMap(({code, dwidth, bbx, rows}) => [
        `STARTCHAR U+${code.toString(16)}`,
        `ENCODING ${code}`,
        `DWIDTH ${dwidth} 0`,
        `BBX ${bbx.join(' ')}`,
        'BITMAP',
        ...rows,
        'ENDCHAR',
    ]);
    return [
        'STARTFONT 2.1',
        `FONT ${font}`,
        'SIZE 10 72 72',
        `FONTBOUNDINGBOX 8 ${ascent + descent} 0 ${-descent}`,
        'STARTPROPERTIES 2',
        `FONT_ASCENT ${ascent}`,
        `FONT_DESCENT ${descent}`,
        'ENDPROPERTIES',
        `CHARS ${glyphs.length}`,
        ...chars,
        'ENDFONT',
        '',
    ].join('\n');
}

/** Reads the three tables of a header written by `bdfToGfx`. */
function readHeader(content: string) {
    const numbers = (text: string) => text.match(/-?(0x[0-9A-F]+|\d+)/gi)!.map(Number);
    const bitmaps = numbers(/Bitmaps\[\] PROGMEM = \{([^}]*)\}/.exec(content)![1]);
    const glyphs = [...content.matchAll(/\{\t([^}]*)\}/g)].map((match) => numbers(match[1]));
    const [first, last, yAdvance] = numbers(/\(GFXglyph \*\)\w+,([^}]*)\}/.exec(content)![1]);
    return {bitmaps, glyphs, first, last, yAdvance};
}

const A: Glyph = {code: 0x41, dwidth: 6, bbx: [3, 4, 1, -2], rows: ['E0', 'A0', 'E0', '80']};

describe('bdfToGfx', () => {
    it('keeps the position of every glyph from its BDF box', () => {
        const {glyphs, bitmaps, first, last} = readHeader(bdfToGfx(bdf([A])).content);
        expect([first, last]).toEqual([0x41, 0x41]);
        // Box 3×4 with its bottom 2 pixels below the baseline: the top is 2 pixels above it.
        expect(glyphs).toEqual([[0, 3, 4, 6, 1, -2]]);
        // 111 101 111 100 → 11110111 1100…
        expect(bitmaps).toEqual([0xf7, 0xc0]);
    });

    it('crops empty rows and columns and moves the glyph so it draws in the same place', () => {
        const padded: Glyph = {code: 0x41, dwidth: 6, bbx: [5, 6, 0, -3], rows: ['00', '70', '50', '70', '40', '00']};
        expect(readHeader(bdfToGfx(bdf([padded])).content).glyphs).toEqual(
            readHeader(bdfToGfx(bdf([A])).content).glyphs,
        );
    });

    it('keeps an empty entry for every code without a glyph', () => {
        const C: Glyph = {...A, code: 0x43};
        const {glyphs, first, last} = readHeader(bdfToGfx(bdf([A, C])).content);
        expect([first, last]).toEqual([0x41, 0x43]);
        expect(glyphs).toEqual([
            [0, 3, 4, 6, 1, -2],
            [2, 0, 0, 0, 0, 0],
            [2, 3, 4, 6, 1, -2],
        ]);
    });

    it('keeps a blank glyph with its advance', () => {
        const space: Glyph = {code: 0x20, dwidth: 4, bbx: [0, 0, 0, 0], rows: []};
        expect(readHeader(bdfToGfx(bdf([space])).content).glyphs).toEqual([[0, 0, 0, 4, 0, 0]]);
    });

    it('sets the line height to the ascent and the descent of the font', () => {
        expect(readHeader(bdfToGfx(bdf([A], {ascent: 11, descent: 3})).content).yAdvance).toBe(14);
    });

    it('drops glyphs above 0xFF and counts the glyphs it keeps', () => {
        const result = bdfToGfx(bdf([A, {...A, code: 0x416}]));
        expect(readHeader(result.content).last).toBe(0x41);
        expect(result.glyphCount).toBe(1);
        expect(result.byteSize).toBe(2 + 7 + 10);
        expect(() => bdfToGfx(bdf([{...A, code: 0x416}]))).toThrow(/0xFF/);
    });

    it('names the font after its family or the given name', () => {
        const xlfd = '-Adobe-New Century Schoolbook-Medium-R-Normal--34-240-100-100-P-181-ISO10646-1';
        const result = bdfToGfx(bdf([A], {font: xlfd}));
        expect(result.name).toBe('New_Century_Schoolbook');
        expect(result.content).toContain('const GFXfont New_Century_Schoolbook PROGMEM');
        expect(bdfToGfx(bdf([A]), '12px clock').name).toBe('_12px_clock');
    });

    it('rejects text that is not a BDF font', () => {
        expect(() => bdfToGfx('const GFXfont x = {};')).toThrow(/not a BDF font/);
    });
});
