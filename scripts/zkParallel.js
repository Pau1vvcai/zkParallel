// scripts/zkParallel.js
import { groth16 } from "snarkjs";
import fs from "fs/promises";
import path from "path";

/**
 * 
 * @param {string} inputPath 
 * @param {string} wasmPath 
 * @param {string} zkeyPath 
 * @param {string} outputDir 
 */
export async function generateProof(inputPath, wasmPath, zkeyPath, outputDir) {
  console.log("🚀 Starting proof generation...");
  await fs.mkdir(outputDir, { recursive: true });

  const input = JSON.parse(await fs.readFile(inputPath, "utf-8"));
  const { proof, publicSignals } = await groth16.fullProve(input, wasmPath, zkeyPath);

  await fs.writeFile(path.join(outputDir, "proof.json"), JSON.stringify(proof, null, 2));
  await fs.writeFile(path.join(outputDir, "public.json"), JSON.stringify(publicSignals, null, 2));

  console.log("✅ Proof generated successfully!");
  console.log(`📁 Output directory: ${outputDir}`);
  return { proof, publicSignals };
}

/**
 * verifyProof
 * @param {string} vkeyPath - vkeyPath
 * @param {string} publicPath - public.json
 * @param {string} proofPath - proof.json
 */
export async function verifyProof(vkeyPath, publicPath, proofPath) {
  console.log("🚀 Starting verification...");

  const vkey = JSON.parse(await fs.readFile(vkeyPath, "utf-8"));
  const publicSignals = JSON.parse(await fs.readFile(publicPath, "utf-8"));
  const proof = JSON.parse(await fs.readFile(proofPath, "utf-8"));

  const res = await groth16.verify(vkey, publicSignals, proof);
  if (res === true) {
    console.log("✅ Verification successful! Proof is valid.");
  } else {
    console.log("❌ Verification failed. Invalid proof.");
  }
  return res;
}
