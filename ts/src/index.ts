/*
const digits = ['0','1','2','3','4','5','6','7','8','9','a','b','c','d','e','f'];
function toHex(b: Uint8Array) {
  const a: string[] = [];
  for (const n of b) {
    a.push(digits[n >>> 4], digits[n & 0xf]);
  }
  return a.join('');
}*/

function QUARTERROUND(x: Uint32Array, a: number, b: number, c: number, d: number) {
  let t: number;
  let xa: number;
  let xb: number;
  let xc: number;
  let xd: number;

  xb = x[b];

  t = x[d] ^ (xa = x[a] + xb);
  xd = t << 16 | t >>> 16;

  t = xb ^ (xc = x[c] + xd);
  xb = t << 12 | t >>> 20;
  
  t = xd ^ (xa += xb);
  xd = t << 8 | t >>> 24;
  
  t = xb ^ (xc += xd);
  x[b] = t << 7 | t >>> 25;

  x[a] = xa;
  x[c] = xc;
  x[d] = xd;
}

const x = new Uint32Array(16);
function shuffle(output: Uint8Array /*[64]*/, ctx: Uint32Array /*[16]*/, rounds: 8 | 12 | 20) {
  x.set(ctx);

  for (let i = rounds; i > 0; i -= 4) {
    QUARTERROUND(x, 0, 4,  8, 12);
    QUARTERROUND(x, 1, 5,  9, 13);
    QUARTERROUND(x, 2, 6, 10, 14);
    QUARTERROUND(x, 3, 7, 11, 15);
    
    QUARTERROUND(x, 0, 5, 10, 15);
    QUARTERROUND(x, 1, 6, 11, 12);
    QUARTERROUND(x, 2, 7,  8, 13);
    QUARTERROUND(x, 3, 4,  9, 14);

    QUARTERROUND(x, 0, 4,  8, 12);
    QUARTERROUND(x, 1, 5,  9, 13);
    QUARTERROUND(x, 2, 6, 10, 14);
    QUARTERROUND(x, 3, 7, 11, 15);
    
    QUARTERROUND(x, 0, 5, 10, 15);
    QUARTERROUND(x, 1, 6, 11, 12);
    QUARTERROUND(x, 2, 7,  8, 13);
    QUARTERROUND(x, 3, 4,  9, 14);
  }

  for (let i = 0, j = 0; i < 16; ++i) {
    const t = x[i] + ctx[i];
    output[j++] = t;
    output[j++] = t >>> 8;
    output[j++] = t >>> 16;
    output[j++] = t >>> 24;
  }
}

const sigma = new Uint8Array(Array.from("expand 32-byte k", c => c.charCodeAt(0)));
const tau = new Uint8Array(Array.from("expand 16-byte k", c => c.charCodeAt(0)));

const max32bit = 2 ** 32;

export class ChaCha {
  private ctx: Uint32Array;

  constructor(key: Uint8Array, private rounds: 8 | 12 | 20 = 20, iv?: Uint8Array) {
    let k: number;
    let c: Uint8Array;
    const kbits = key.length * 8;
    switch (kbits) {
      case 256:
        k = 16;
        c = sigma;
        break;
      case 128:
        k = 0;
        c = tau;
        break;
      default:
        throw new Error("Unsupported Key Size");
    }

    const ctx = new Uint32Array(16);
    ctx[0] = c[0]  | c[1]  << 8 | c[2]  << 16 | c[3]  << 24;
    ctx[1] = c[4]  | c[5]  << 8 | c[6]  << 16 | c[7]  << 24;
    ctx[2] = c[8]  | c[9]  << 8 | c[10] << 16 | c[11] << 24;
    ctx[3] = c[12] | c[13] << 8 | c[14] << 16 | c[15] << 24;

    ctx[4] = key[0]  | key[1]  << 8 | key[2]  << 16 | key[3]  << 24;
    ctx[5] = key[4]  | key[5]  << 8 | key[6]  << 16 | key[7]  << 24;
    ctx[6] = key[8]  | key[9]  << 8 | key[10] << 16 | key[11] << 24;
    ctx[7] = key[12] | key[13] << 8 | key[14] << 16 | key[15] << 24;
    
    ctx[8] =  key[k + 0]  | key[k + 1]  << 8 | key[k + 2]  << 16 | key[k + 3]  << 24;
    ctx[9] =  key[k + 4]  | key[k + 5]  << 8 | key[k + 6]  << 16 | key[k + 7]  << 24;
    ctx[10] = key[k + 8]  | key[k + 9]  << 8 | key[k + 10] << 16 | key[k + 11] << 24;
    ctx[11] = key[k + 12] | key[k + 13] << 8 | key[k + 14] << 16 | key[k + 15] << 24;
    
    this.ctx = ctx;
    
    if (iv) this.set_iv(iv);
  }

  set_iv(iv: Uint8Array, ctr = 0) {
    const { ctx } = this;
    ctx[12] = ctr;
    ctx[13] = ctr > max32bit ? ctr / max32bit | 0 : 0;
    ctx[14] =  iv[0] | iv[1] << 8 | iv[2] << 16 | iv[3] << 24;
    ctx[15] =  iv[4] | iv[5] << 8 | iv[6] << 16 | iv[7] << 24;
  }

  next_bytes(output?: Uint8Array /*[64]*/) {
    if (!output) output = new Uint8Array(64);
    const { ctx } = this;
    shuffle(output, ctx, this.rounds);
    ctx[12] += 1;
    if (ctx[12] === 0) ctx[13] += 1;
    return output;
  }

  * blocks() {
    const block = new Uint8Array(64);
    const { rounds, ctx } = this;
    for (;;) {
      shuffle(block, ctx, rounds);
      yield block;
    }
  }

  * [Symbol.iterator]() {
    const bytes = new Uint8Array(64);
    const { rounds, ctx } = this;
    for (;;) {
      shuffle(bytes, ctx, rounds);
      yield * bytes;
    }
  }
}