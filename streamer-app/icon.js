const zlib = require('zlib');

function crc32(data) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function pngChunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

function makePNG(size, pixelFn) {
  const raw = Buffer.alloc(size * (1 + size * 4));
  let off = 0;
  for (let y = 0; y < size; y++) {
    raw[off++] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixelFn(x, y, size);
      raw[off++] = r; raw[off++] = g; raw[off++] = b; raw[off++] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function wrapICO(png, size) {
  const hdr = Buffer.from([0,0, 1,0, 1,0]);
  const dir = Buffer.alloc(16);
  dir[0] = size === 256 ? 0 : size; dir[1] = size === 256 ? 0 : size;
  dir.writeUInt16LE(1, 4); dir.writeUInt16LE(32, 6);
  dir.writeUInt32LE(png.length, 8); dir.writeUInt32LE(22, 12);
  return Buffer.concat([hdr, dir, png]);
}

function triangleSign(px, py, ax, ay, bx, by) {
  return (px - bx) * (ay - by) - (ax - bx) * (py - by);
}

function inTriangle(px, py, x1, y1, x2, y2, x3, y3) {
  const d1 = triangleSign(px,py,x1,y1,x2,y2);
  const d2 = triangleSign(px,py,x2,y2,x3,y3);
  const d3 = triangleSign(px,py,x3,y3,x1,y1);
  return !((d1<0||d2<0||d3<0) && (d1>0||d2>0||d3>0));
}

function generateICO() {
  // Dark bg #0f0e1a, gold play button #c8922a
  const png = makePNG(32, (x, y, s) => {
    const pad = 3;
    const cx = s / 2, cy = s / 2, r = s / 2 - 1;
    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

    // Rounded background circle
    if (dist > r) return [0, 0, 0, 0]; // transparent corners

    // Play triangle vertices
    const tx1 = Math.round(s * 0.28), ty1 = Math.round(s * 0.22);
    const tx2 = Math.round(s * 0.28), ty2 = Math.round(s * 0.78);
    const tx3 = Math.round(s * 0.78), ty3 = Math.round(s * 0.50);

    if (inTriangle(x, y, tx1, ty1, tx2, ty2, tx3, ty3)) {
      return [200, 146, 42, 255]; // gold
    }
    return [15, 14, 26, 255]; // dark bg
  });

  return wrapICO(png, 32);
}

module.exports = { generateICO };
