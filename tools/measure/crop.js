// Crop a region of a prototype JPEG, upscale it and write a lossless PNG.
// The eye is the first instrument: zoom in before trusting any number.
//
// Usage: node crop.js <jpg> <out.png> <x> <y> <w> <h> [scale]
'use strict';
const fs = require('fs');
const zlib = require('zlib');
const jpeg = require('jpeg-js');

function crcTable() {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
}
const CRC = crcTable();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function writePNG(path, w, h, rgb) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(path, png);
}

const [file, out, xs, ys, ws, hs, ss] = process.argv.slice(2);
const X = +xs,
  Y = +ys,
  CW = +ws,
  CH = +hs,
  S = +(ss || 1);
const raw = jpeg.decode(fs.readFileSync(file), { useTArray: true });
const { width: W, height: H, data } = raw;
const ow = Math.min(CW, W - X) * S,
  oh = Math.min(CH, H - Y) * S;
const rgb = Buffer.alloc(ow * oh * 3);
for (let y = 0; y < oh; y++) {
  for (let x = 0; x < ow; x++) {
    const sx = X + Math.floor(x / S),
      sy = Y + Math.floor(y / S);
    const si = (sy * W + sx) * 4,
      di = (y * ow + x) * 3;
    rgb[di] = data[si];
    rgb[di + 1] = data[si + 1];
    rgb[di + 2] = data[si + 2];
  }
}
writePNG(out, ow, oh, rgb);
console.log(`${out} ${ow}x${oh}`);
