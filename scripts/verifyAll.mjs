// node /scripts/verifyAll.mjs
import fs from "node:fs/promises";
import path from "node:path";
import * as url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// 动态导入 snarkjs（ESM）
const snarkjs = await import("snarkjs");

const CIRCUITS = [
  {
    id: "execution",
    wasm: "public/zk/execution.wasm",
    zkey: "public/zk/execution_0001.zkey",
    vkey: "public/zk/verification_key.json",
    input: "inputs/execution.json",
  },
  {
    id: "transferVerify",
    wasm: "public/zk/transferVerify.wasm",
    zkey: "public/zk/transferVerify_0001.zkey",
    vkey: "public/zk/transferVerify_verification_key.json",
    input: "inputs/transferVerify.json",
  },
  {
    id: "merkleUpdate",
    wasm: "public/zk/merkleUpdate.wasm",
    zkey: "public/zk/merkleUpdate_0001.zkey",
    vkey: "public/zk/merkleUpdate_verification_key.json",
    input: "inputs/merkleUpdate.json",
  },
  // … 继续补全其它电路
];

async function readJson(p) {
  const abs = path.join(root, p);
  const buf = await fs.readFile(abs, "utf-8");
  return JSON.parse(buf);
}

async function verifyOne(c) {
  const t0 = Date.now();
  try {
    const input = await readJson(c.input);
    const vkey = await readJson(c.vkey);

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      path.join(root, c.wasm),
      path.join(root, c.zkey)
    );

    const ok = await snarkjs.groth16.verify(vkey, publicSignals, proof);
    const dt = Date.now() - t0;
    console.log(`${ok ? "✅" : "❌"} ${c.id} — ${dt}ms`);
    return ok;
  } catch (e) {
    console.error(`❌ ${c.id} — error:`, e.message || e);
    return false;
  }
}

const results = await Promise.all(CIRCUITS.map(verifyOne));
const ok = results.filter(Boolean).length;
console.log(`\nSummary: ${ok}/${results.length} circuits verified.`);
process.exit(ok === results.length ? 0 : 1);
