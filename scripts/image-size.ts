/** Reads intrinsic width/height from PNG, JPEG, WebP and AVIF headers (no dependencies). */
export const imageSize = (b: Uint8Array): { width: number; height: number } | null => {
  const u16be = (o: number) => (b[o] << 8) | b[o + 1];
  const u32be = (o: number) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
  const u16le = (o: number) => b[o] | (b[o + 1] << 8);
  const u24le = (o: number) => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16);
  const str = (o: number, n: number) => String.fromCharCode(...b.slice(o, o + n));

  // PNG
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return { width: u32be(16), height: u32be(20) };
  }
  // JPEG — walk segments until a SOFn marker
  if (b[0] === 0xff && b[1] === 0xd8) {
    let o = 2;
    while (o < b.length) {
      if (b[o] !== 0xff) return null;
      const m = b[o + 1];
      const len = u16be(o + 2);
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return { height: u16be(o + 5), width: u16be(o + 7) };
      }
      o += 2 + len;
    }
    return null;
  }
  // WebP
  if (str(0, 4) === "RIFF" && str(8, 4) === "WEBP") {
    const chunk = str(12, 4);
    if (chunk === "VP8 ") return { width: u16le(26) & 0x3fff, height: u16le(28) & 0x3fff };
    if (chunk === "VP8L") {
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === "VP8X") return { width: u24le(24) + 1, height: u24le(27) + 1 };
  }
  // AVIF / HEIF — the first 'ispe' (image spatial extents) box
  if (str(4, 4) === "ftyp") {
    const end = Math.min(b.length - 16, 1 << 16);
    for (let o = 8; o < end; o++) {
      if (b[o] === 0x69 && str(o, 4) === "ispe") return { width: u32be(o + 8), height: u32be(o + 12) };
    }
  }
  return null;
};
