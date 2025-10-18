"use client";

import { useState } from "react";
import { groth16 } from "snarkjs";
import { ethers } from "ethers";
import VerifierArtifact from "../../artifacts/contracts/ExecutionVerifier.sol/ExecutionVerifier.json";

export default function OnChainVerifier() {
  const [status, setStatus] = useState<"idle" | "proving" | "verifying" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleVerify = async () => {
    try {
      setStatus("proving");
      setMessage("⏳ Generating proof...");

      // 1️⃣ 生成 proof
      const input = await (await fetch("/inputs/execution.json")).json();
      const { proof, publicSignals } = await groth16.fullProve(
        input,
        "/zk/execution/execution.wasm",
        "/zk/execution/execution_0001.zkey"
      );

      const calldata = await groth16.exportSolidityCallData(proof, publicSignals);
      const argv = JSON.parse("[" + calldata + "]");

      // 2️⃣ 连接本地 Hardhat 节点
      setStatus("verifying");
      setMessage("🔗 Connecting to local Hardhat RPC...");
      const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      const signer = await provider.getSigner(0);

      // 3️⃣ 调用链上 verifyProof()
      const verifierAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // 本地部署地址
      const verifier = new ethers.Contract(verifierAddress, VerifierArtifact.abi, signer);

      setMessage("🔍 Verifying proof on-chain...");
      const verified = await verifier.verifyProof(...argv);

      // 4️⃣ 输出结果
      setStatus("done");
      setMessage(verified ? "✅ On-chain verification successful!" : "❌ Verification failed.");
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setMessage("❌ Error: " + err.message);
    }
  };

  return (
    <div className="p-6 border rounded-2xl shadow bg-gray-900 text-gray-100">
      <h2 className="text-xl font-bold mb-4">⚙️ On-Chain Proof Verification</h2>
      <p className="mb-3 text-sm opacity-80">{message}</p>
      <button
        onClick={handleVerify}
        disabled={status === "proving" || status === "verifying"}
        className={`px-4 py-2 rounded-lg font-medium ${
          status === "done"
            ? "bg-green-600"
            : status === "error"
            ? "bg-red-600"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {status === "idle" && "Verify on-chain"}
        {status === "proving" && "Generating proof..."}
        {status === "verifying" && "Verifying on-chain..."}
        {status === "done" && "✅ Verified"}
        {status === "error" && "❌ Error"}
      </button>
    </div>
  );
}
