/// <reference types="node" />
import { inflateSync } from "node:zlib";

export interface DecodedPng {
  width: number;
  height: number;
  // RGBA, 8 bits per channel, row-major.
  pixels: Uint8Array;
}

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

// Minimal decoder for the sprites this repo produces: 8-bit RGBA, non-interlaced
// (ImageMagick `PNG32:` output). Anything else is rejected with a clear error.
export function decodePng(data: Uint8Array): DecodedPng {
  if (!SIGNATURE.every((byte, i) => data[i] === byte)) throw new Error("not a PNG file");
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let width = 0;
  let height = 0;
  const idat: Uint8Array[] = [];

  for (let pos = 8; pos < data.length; ) {
    const length = view.getUint32(pos);
    const type = String.fromCharCode(...data.subarray(pos + 4, pos + 8));
    const body = data.subarray(pos + 8, pos + 8 + length);
    if (type === "IHDR") {
      width = view.getUint32(pos + 8);
      height = view.getUint32(pos + 12);
      const [bitDepth, colorType, , , interlace] = body.subarray(8, 13);
      if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
        throw new Error(`unsupported PNG (bit depth ${bitDepth}, colour type ${colorType}, interlace ${interlace}); export as PNG32`);
      }
    } else if (type === "IDAT") {
      idat.push(body);
    } else if (type === "IEND") {
      break;
    }
    pos += 12 + length;
  }

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  if (raw.length !== (stride + 1) * height) {
    throw new Error(`truncated PNG data: expected ${(stride + 1) * height} bytes, got ${raw.length}`);
  }
  const pixels = new Uint8Array(stride * height);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = pixels.subarray(y * stride, (y + 1) * stride);
    const prev = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : new Uint8Array(stride);
    for (let i = 0; i < stride; i += 1) {
      const a = i >= 4 ? out[i - 4]! : 0;
      const b = prev[i]!;
      const c = i >= 4 ? prev[i - 4]! : 0;
      const x = line[i]!;
      switch (filter) {
        case 0: out[i] = x; break;
        case 1: out[i] = x + a; break;
        case 2: out[i] = x + b; break;
        case 3: out[i] = x + ((a + b) >> 1); break;
        case 4: out[i] = x + paeth(a, b, c); break;
        default: throw new Error(`bad PNG filter ${filter} on row ${y}`);
      }
    }
  }
  return { width, height, pixels };
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}
