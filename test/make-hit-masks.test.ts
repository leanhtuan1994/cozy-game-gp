/// <reference types="node" />
import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";

import { buildMask } from "../scripts/lib/build-mask";
import { decodePng } from "../scripts/lib/png";

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

// Encodes RGBA pixels as a PNG; row y uses filter type `filterFor(y)` (0–4).
function encodePng(width: number, height: number, pixels: Uint8Array, filterFor: (y: number) => number = () => 1): Uint8Array {
  const stride = width * 4;
  const raw = new Uint8Array((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const filter = filterFor(y);
    raw[y * (stride + 1)] = filter;
    for (let i = 0; i < stride; i += 1) {
      const x = pixels[y * stride + i]!;
      const a = i >= 4 ? pixels[y * stride + i - 4]! : 0;
      const b = y > 0 ? pixels[(y - 1) * stride + i]! : 0;
      const c = i >= 4 && y > 0 ? pixels[(y - 1) * stride + i - 4]! : 0;
      const predictor = [0, a, b, (a + b) >> 1, paeth(a, b, c)][filter]!;
      raw[y * (stride + 1) + 1 + i] = (x - predictor) & 0xff;
    }
  }
  const chunk = (type: string, body: Uint8Array) => {
    const out = new Uint8Array(12 + body.length);
    const view = new DataView(out.buffer);
    view.setUint32(0, body.length);
    out.set([...type].map((c) => c.charCodeAt(0)), 4);
    out.set(body, 8);
    return out; // CRC is not checked by the decoder.
  };
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", new Uint8Array()),
  ]);
}

describe("decodePng + buildMask", () => {
  it("finds the opaque bounds and fills the grid inside them", () => {
    const width = 64;
    const height = 64;
    const pixels = new Uint8Array(width * height * 4);
    // Opaque block from (16,8) to (47,39); a faint pixel elsewhere stays below the threshold.
    for (let y = 8; y < 40; y += 1) for (let x = 16; x < 48; x += 1) pixels[(y * width + x) * 4 + 3] = 255;
    pixels[(60 * width + 60) * 4 + 3] = 40;

    const png = decodePng(encodePng(width, height, pixels));
    expect(png.width).toBe(64);
    expect(png.pixels[(8 * width + 16) * 4 + 3]).toBe(255);

    const mask = buildMask(png);
    expect(mask.bounds).toEqual({ x: 16, y: 8, width: 32, height: 32 });
    expect(mask.rows.every((row) => row === 0xffffffff)).toBe(true);
  });

  it("decodes every row filter type", () => {
    const width = 9;
    const height = 10;
    const pixels = new Uint8Array(width * height * 4).map((_, i) => (i * 37 + (i >> 3) * 11) & 0xff);
    const png = decodePng(encodePng(width, height, pixels, (y) => y % 5));
    expect(Array.from(png.pixels)).toEqual(Array.from(pixels));
  });

  it("rejects PNGs it cannot decode", () => {
    expect(() => decodePng(new Uint8Array([1, 2, 3]))).toThrow("not a PNG");
    // Image data for 2 rows under a header that claims 4.
    const short = encodePng(4, 2, new Uint8Array(4 * 2 * 4));
    new DataView(short.buffer, short.byteOffset).setUint32(20, 4);
    expect(() => decodePng(short)).toThrow("truncated");
  });

  it("rejects mask sizes that do not fit a 32-bit row", () => {
    const pixels = new Uint8Array(4 * 4 * 4).fill(255);
    expect(() => buildMask(decodePng(encodePng(4, 4, pixels)), 33)).toThrow("1–32");
  });
});
