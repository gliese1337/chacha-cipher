import wabt from 'wabt';
import fs from 'fs';

async function compile() {
  const WABT = await wabt();
  const mod = WABT.parseWat('wasm.wat', fs.readFileSync('./src/wasm.wat'));
  fs.writeFileSync(
    './src/wasm.ts',
    'export default "'
    + Buffer.from(mod.toBinary({}).buffer).toString("hex")
    + '";'
  );
}

compile();