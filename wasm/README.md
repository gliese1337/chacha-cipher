# chacha-ts
 A WebAssembly-and-TypeScript Implementation of the ChaCha stream cipher.

## API
This module exports a class named ChaCha. There is no public constructor, as creating a new ChaCha stream object requires awaiting the asymchronous construction of a WebAssembly module. To create a new stream cipher instance, use the static method

```ts
ChaCha.init(key: Uint8Array, rounds?: 8 | 12 | 20, iv?: Uint8Array, ctr?: number): Promise<ChaCha>
```

The `key` must be either 128 or 256 bits (16 or 32 bytes). The `rounds` parameter defaults to 20 (the slowest but most secure option). The optional initialization vector (`iv`) should be 8 bytes; if the provided Uint8Array is less than 8 bytes long, it will be implicitly padded with zeros at the end; if it is longer, only the first 8 bytes will be read. The optional `ctr` parameter allows altering the initial counter value (which defaults to 0).

Once you have a `ChaCha` object, you can call the following instance methods:

```ts
class ChaCha {
  reset(key: Uint8Array, rounds?: 8 | 12 | 20, iv?: Uint8Array, ctr?: number): this;
  next_bytes(output?: Uint8Array): Uint8Array;
  blocks(): Generator<Uint8Array>;
  [Symbol.iterator](): Generator<number>;
}
```

* `reset(key: Uint8Array, rounds?: 8 | 12 | 20, iv?: Uint8Array, ctr?: number): this` Reinitializes the stream state, reusing the WebAssembly module and memory that were already allocated to avoid asynchronously constructing a new instance.
* `next_bytes(output?: Uint8Array): Uint8Array` Returns a block of 64 bytes. If a pre-allocated output buffer is provided, the bytes will be written into that buffer. The returned buffer is a direct reference to internal state, which is re-used to avoid copying and allocation. This is perfectly safe as long as you only use it for reads. NEVER write to this buffer! If you need to mutate the output buffer for any reason, you must pass in your own.
* `blocks(): Generator<Uint8Array>` An infinite stream of 64-byte blocks. This generator repeatedly yields the same internal buffer with new values to avoid copying and allocation costs. NEVER write to this buffer!
* `[Symbol.iterator](): Generator<number>` Implements the Iterable protocol for use in `for-of` loops. This generator yields individual bytes.
