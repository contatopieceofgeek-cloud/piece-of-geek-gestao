/* Reduz app/img/logo.png (480x480 RGBA) pros tamanhos de favicon.
   PNG é só zlib + scanlines filtradas, e o zlib já vem no Node — dá pra
   decodificar, reamostrar e reencodar sem instalar dependência nenhuma. */
const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

const SRC = process.argv[2];
const OUTDIR = process.argv[3];
const SIZES = process.argv.slice(4).map(Number);

// ---------- decodificar ----------
function decodePng(buf){
  if(buf.readUInt32BE(0) !== 0x89504e47) throw new Error('não é PNG');
  let off = 8, idat = [], ihdr = null;
  while(off < buf.length){
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off+4, off+8);
    const data = buf.subarray(off+8, off+8+len);
    if(type === 'IHDR') ihdr = { w:data.readUInt32BE(0), h:data.readUInt32BE(4), depth:data[8], color:data[9], interlace:data[12] };
    else if(type === 'IDAT') idat.push(data);
    else if(type === 'IEND') break;
    off += len + 12;
  }
  if(ihdr.depth !== 8) throw new Error('só bit depth 8');
  if(ihdr.interlace !== 0) throw new Error('entrelaçado não suportado');
  const channels = { 0:1, 2:3, 4:2, 6:4 }[ihdr.color];
  if(!channels) throw new Error('color type ' + ihdr.color + ' não suportado');

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const { w, h } = ihdr;
  const stride = w * channels;
  const out = Buffer.alloc(stride * h);

  // Desfaz os filtros por scanline (spec do PNG, seção 9).
  for(let y = 0; y < h; y++){
    const filter = raw[y * (stride+1)];
    const line = raw.subarray(y*(stride+1)+1, y*(stride+1)+1+stride);
    const cur = out.subarray(y*stride, (y+1)*stride);
    const prev = y > 0 ? out.subarray((y-1)*stride, y*stride) : null;
    for(let i = 0; i < stride; i++){
      const a = i >= channels ? cur[i-channels] : 0;
      const b = prev ? prev[i] : 0;
      const c = (prev && i >= channels) ? prev[i-channels] : 0;
      let v = line[i];
      if(filter === 1) v += a;
      else if(filter === 2) v += b;
      else if(filter === 3) v += (a + b) >> 1;
      else if(filter === 4){
        const p = a + b - c, pa = Math.abs(p-a), pb = Math.abs(p-b), pc = Math.abs(p-c);
        v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c);
      }
      cur[i] = v & 0xff;
    }
  }

  // Normaliza tudo pra RGBA, que é o que o resample abaixo espera.
  if(channels === 4) return { w, h, rgba: out };
  const rgba = Buffer.alloc(w*h*4);
  for(let i = 0; i < w*h; i++){
    const s = i*channels;
    if(channels === 3){ rgba[i*4]=out[s]; rgba[i*4+1]=out[s+1]; rgba[i*4+2]=out[s+2]; rgba[i*4+3]=255; }
    else if(channels === 1){ rgba.fill(out[s], i*4, i*4+3); rgba[i*4+3]=255; }
    else { rgba.fill(out[s], i*4, i*4+3); rgba[i*4+3]=out[s+1]; }
  }
  return { w, h, rgba };
}

// ---------- reamostrar ----------
/* Média de área (box filter) com alpha PRÉ-MULTIPLICADO. Sem pré-multiplicar,
   pixel transparente contribui a cor dele pra média e a borda do logo ganha
   uma auréola clara — é justamente o que faz um ícone reduzido parecer sujo. */
function resizeBox(src, sw, sh, tw, th){
  const dst = Buffer.alloc(tw*th*4);
  const xr = sw/tw, yr = sh/th;
  for(let y = 0; y < th; y++){
    const y0 = Math.floor(y*yr), y1 = Math.max(y0+1, Math.floor((y+1)*yr));
    for(let x = 0; x < tw; x++){
      const x0 = Math.floor(x*xr), x1 = Math.max(x0+1, Math.floor((x+1)*xr));
      let r=0,g=0,b=0,a=0,n=0;
      for(let sy = y0; sy < y1; sy++){
        for(let sx = x0; sx < x1; sx++){
          const i = (sy*sw+sx)*4, al = src[i+3]/255;
          r += src[i]*al; g += src[i+1]*al; b += src[i+2]*al; a += src[i+3];
          n++;
        }
      }
      const j = (y*tw+x)*4, am = a/n;
      // Volta de pré-multiplicado pra direto: a soma r já traz o peso do
      // alpha embutido, então dividir pela soma do alpha (e reescalar por
      // 255) devolve a cor média. O `n` some nos dois lados.
      const un = a > 0 ? 255/a : 0;
      dst[j]   = Math.round(Math.min(255, r*un));
      dst[j+1] = Math.round(Math.min(255, g*un));
      dst[j+2] = Math.round(Math.min(255, b*un));
      dst[j+3] = Math.round(am);
    }
  }
  return dst;
}

// ---------- encodar ----------
function crc32(buf){
  let c, table = crc32.table;
  if(!table){
    table = crc32.table = new Int32Array(256);
    for(let n = 0; n < 256; n++){
      c = n;
      for(let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for(let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}
function chunk(type, data){
  const out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8+data.length)), 8+data.length);
  return out;
}
function encodePng(rgba, w, h){
  const raw = Buffer.alloc(h*(w*4+1));
  for(let y = 0; y < h; y++){
    raw[y*(w*4+1)] = 0; // filtro "none": imagem pequena, não vale otimizar
    rgba.copy(raw, y*(w*4+1)+1, y*w*4, (y+1)*w*4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- rodar ----------
const src = decodePng(fs.readFileSync(SRC));
console.log(`origem ${src.w}x${src.h}`);
for(const size of SIZES){
  // Reduz pela metade repetidamente e só no fim vai pro alvo: um salto único
  // de 480→16 descarta 99,9% dos pixels e serrilha.
  let cur = src.rgba, cw = src.w, ch = src.h;
  while(cw > size*2){
    const nw = Math.max(size, cw >> 1);
    cur = resizeBox(cur, cw, ch, nw, nw); cw = ch = nw;
  }
  if(cw !== size){ cur = resizeBox(cur, cw, ch, size, size); cw = ch = size; }
  const out = encodePng(cur, size, size);
  const file = path.join(OUTDIR, `favicon-${size}.png`);
  fs.writeFileSync(file, out);
  console.log(`${file}  ${size}x${size}  ${out.length} bytes`);
}
