import {describe, it, expect, vi, beforeAll} from 'vitest';
import {readFileSync} from 'fs';
import {join, dirname} from 'path';
import {fileURLToPath} from 'url';

import {truetype2gfx} from './index';
import {normalizePixelHeight, rasterizeGlyph} from './core/glyphRasterizer';
import type {FontPack} from './core/glyphRasterizer';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Records every canvas size the rasterizer asks for, and mirrors the browser rule
// that a zero-sized source is a hard IndexSizeError rather than empty pixel data.
const requestedSizes: Array<{width: number; height: number}> = [];

const mockCtx = {
    clearRect: vi.fn(),
    get fillStyle() {
        return '';
    },
    set fillStyle(_: string) {},
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    rect: vi.fn(),
    strokeRect: vi.fn(),
    // Opaque by default, so glyphs rasterize to a solid block. Individual tests
    // swap `coverage` to model a font whose outlines never land on the canvas.
    coverage: 255,
    getImageData(_x: number, _y: number, w: number, h: number) {
        requestedSizes.push({width: w, height: h});
        if (w <= 0 || h <= 0) {
            throw new Error(
                `Failed to execute 'getImageData' on 'CanvasRenderingContext2D': The source ${
                    h <= 0 ? 'height' : 'width'
                } is 0.`,
            );
        }
        return {data: new Uint8ClampedArray(w * h * 4).fill(this.coverage)};
    },
};

beforeAll(() => {
    // jsdom 26 does not implement Blob.prototype.arrayBuffer; polyfill via FileReader
    if (!Blob.prototype.arrayBuffer) {
        Blob.prototype.arrayBuffer = function (this: Blob): Promise<ArrayBuffer> {
            return new Promise<ArrayBuffer>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as ArrayBuffer);
                reader.onerror = () => reject(reader.error);
                reader.readAsArrayBuffer(this);
            });
        };
    }

    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        value: (type: string) => (type === '2d' ? mockCtx : null),
        writable: true,
        configurable: true,
    });
});

function makeRobotoFile(): File {
    const buf = readFileSync(join(__dirname, 'fixtures/Roboto.ttf'));
    return new File([buf], 'Roboto.ttf', {type: 'font/ttf'});
}

describe('truetype2gfx with Roboto.ttf', () => {
    it('returns a FontPack with meta and glyphs by default', async () => {
        const result = (await truetype2gfx(makeRobotoFile(), 16)) as FontPack;
        expect(result.meta.name).toMatch(/Roboto/i);
        expect(result.glyphs.size).toBeGreaterThan(0);
    });

    it('returns a File with .h extension via "file" format', async () => {
        const result = (await truetype2gfx(makeRobotoFile(), 16, 'file')) as File;
        expect(result).toBeInstanceOf(File);
        expect(result.name).toMatch(/\.h$/);
    });
});

describe('pixelHeight normalization (LOPAKA-APP-17A)', () => {
    // Clearing the wizard's number input reaches the converter as '', which scaled
    // every glyph onto a zero-height canvas and made getImageData throw.
    const unusable: unknown[] = ['', null, undefined, NaN, 0, -5];

    for (const value of unusable) {
        it(`converts without throwing for ${JSON.stringify(value)}`, async () => {
            requestedSizes.length = 0;
            const result = (await truetype2gfx(makeRobotoFile(), value as number)) as FontPack;

            expect(result.glyphs.size).toBeGreaterThan(0);
            expect(requestedSizes.length).toBeGreaterThan(0);
            for (const size of requestedSizes) {
                expect(size.height).toBeGreaterThan(0);
                expect(size.width).toBeGreaterThan(0);
            }
        });
    }

    it('floors fractional heights and clamps sub-pixel heights to one pixel', () => {
        expect(normalizePixelHeight(16.7)).toBe(16);
        expect(normalizePixelHeight(0.4)).toBe(1);
        expect(normalizePixelHeight(16)).toBe(16);
    });

    it('never rasterizes a glyph onto a zero-height canvas', () => {
        // A degenerate face whose ascender does not exceed its descender.
        const degenerateFont = {
            unitsPerEm: 1000,
            ascender: 0,
            descender: 0,
        } as any;
        const glyph = {
            advanceWidth: 500,
            getPath: () => ({draw: () => undefined}),
        } as any;

        requestedSizes.length = 0;
        expect(() => rasterizeGlyph(glyph, degenerateFont, 16)).not.toThrow();
        expect(requestedSizes.every((size) => size.height > 0 && size.width > 0)).toBe(true);
    });
});

describe('blank rasterization', () => {
    it('throws instead of returning a font that draws nothing', async () => {
        mockCtx.coverage = 0; // every pixel transparent: no outline landed
        try {
            await expect(truetype2gfx(makeRobotoFile(), 16)).rejects.toThrow(/no visible glyphs/i);
        } finally {
            mockCtx.coverage = 255;
        }
    });

    it('still converts a font that rasterizes normally', async () => {
        const result = (await truetype2gfx(makeRobotoFile(), 16)) as FontPack;
        expect([...result.glyphs.values()].some((glyph) => glyph.bytes.some((byte) => byte !== 0))).toBe(true);
    });
});
