import 'mocha';
import { expect } from 'chai';

import { tests } from '../../vectors';
import { ChaCha } from '../src';

describe("Run Standard Test Vectors", () => {
  const out = new Uint8Array(64);
  for(const { tc, key, iv, rounds } of tests) {
    for (const r in rounds) {
      const cc = new ChaCha(new Uint8Array(key), +r as any);
      const blocks = rounds[r as unknown as keyof typeof rounds];
      it(`${tc} ${r} rounds`, () => { 
        cc.set_iv(new Uint8Array(iv));
        for (let i = 0; i < blocks.length; i++) {
          cc.next_bytes(out);
          expect(out).eql(new Uint8Array(blocks[i]));
        }
      });
    }
  }
});