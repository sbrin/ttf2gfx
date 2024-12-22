import * as opentype from 'opentype.js';
export declare function loadFont(file: File): Promise<opentype.Font>;
export declare function extractGlyphs(font: opentype.Font): opentype.Glyph[];
