import 'mocha';
import { expect } from 'chai';

import { tests } from '../../vectors';
import { ChaCha } from '../src';

describe("Run Standard Test Vectors", () => {
  const out = new Uint8Array(64);
  for(const { tc, key, iv, rounds } of tests) {
    for (const r in rounds) {
      it(`${tc} ${r} rounds.`, async() => { 
        const cc = await ChaCha.init(
          new Uint8Array(key),
          +r as any,
          new Uint8Array(iv),
        );
        const blocks = rounds[r as unknown as keyof typeof rounds];
        for (let i = 0; i < blocks.length; i++) {
          cc.next_bytes(out);
          expect(out).eql(new Uint8Array(blocks[i]));
        }
      });
    }
  }
});