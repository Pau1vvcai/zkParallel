import { generateProof } from "./zkParallel.js";

const [inputPath, wasmPath, zkeyPath, outputDir] = process.argv.slice(2);

if (!inputPath || !wasmPath || !zkeyPath || !outputDir) {
  console.error("Usage: node prove.js <input.json> <circuit.wasm> <circuit_final.zkey> <outputDir>");
  process.exit(1);
}
generateProof(inputPath, wasmPath, zkeyPath, outputDir)
  .then(() => console.log("✅ Proof generated successfully."))
  .catch((err) => {
    console.error("❌ Proof generation failed:", err);
    process.exit(1);
  });