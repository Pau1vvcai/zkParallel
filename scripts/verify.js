//verift proof and print yes or no
//输入：verification_key.json, proof.json, public.json
//调用：snarkjs.groth16.verify()
//输出：✅ 或 ❌

// prove.js
import { verifyProof } from "./zkParallel.js";

const [vkeyPath, publicPath, proofPath] = process.argv.slice(2);

if (!vkeyPath || !publicPath || !proofPath) {
  console.error("Usage: node verify.js <vkeyPath> <publicPath> <proofPath>");
  process.exit(1);
}

verifyProof(vkeyPath, publicPath, proofPath)
  .then((res) => console.log(res ? "✅ Valid proof" : "❌ Invalid proof"))//ternary operator(res? ture:false)
  .catch((err) => {
    console.error("❌ Verification failed. Invalid proof:", err);
    process.exit(1);

  });
