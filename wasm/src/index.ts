import modulep from './wasm';

const sigma = new Uint8Array(Array.from("expand 32-byte k", c => c.charCodeAt(0)));
const tau = new Uint8Array(Array.from("expand 16-byte k", c => c.charCodeAt(0)));

const max32bit = 2 ** 32;

export class ChaCha {
  private rounds = 0;
  private constructor(
    private ctx: Uint32Array,
    public bytes: Uint8Array,
    private shuffle: (rounds: number) => void,
  ) {}

  public static async init(key: Uint8Array, rounds: 8 | 12 | 20 = 20, iv?: Uint8Array, ctr = 0): Promise<ChaCha> {
    const wasm = (await WebAssembly.instantiate(await modulep)).exports;

    const membuf = (wasm.memory as WebAssembly.Memory).buffer;
    const bytes = new Uint8Array(membuf, 64, 64);
    const ctx = new Uint32Array(membuf, 0, 16);

    return (new ChaCha(
      ctx,
      bytes,
      wasm.next_bytes as any
    )).reset(key, rounds, iv, ctr);
  }

  reset(key: Uint8Array, rounds: 8 | 12 | 20 = 20, iv?: Uint8Array, ctr = 0) {
    const { ctx } = this;
    this.rounds = rounds;
    
    let k: number;
    let c: Uint8Array;

    switch (key.length) {
      case 32:
        k = 16;
        c = sigma;
        break;
      case 16:
        k = 0;
        c = tau;
        break;
      default:
        throw new Error("Unsupported Key Size");
    }

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
    
    if (iv) {
      ctx[12] = ctr;
      ctx[13] = ctr > max32bit ? ctr / max32bit | 0 : 0;
      ctx[14] = iv[0] | iv[1] << 8 | iv[2] << 16 | iv[3] << 24;
      ctx[15] = iv[4] | iv[5] << 8 | iv[6] << 16 | iv[7] << 24;
    }

    return this;
  }
  
  next_bytes(output?: Uint8Array) {
    this.shuffle(this.rounds);
    if (output) output.set(this.bytes);
    return this.bytes;
  }

  * blocks() {
    const { rounds, bytes } = this;
    for (;;) {
      this.shuffle(rounds);
      yield bytes;
    }
  }

  * [Symbol.iterator]() {
    for (const block of this.blocks()) {
      yield * block;
    }
  }
}