"use client";

import { useState } from "react";

const loadSnarkjs = async () => await import("snarkjs");

export default function ExecutionCard() {
  const [inputData, setInputData] = useState<any>(null);
  const [status, setStatus] =
    useState<"idle" | "loading" | "proving" | "verified" | "failed">("idle");
  const [log, setLog] = useState<string>("");

  const appendLog = (msg: string) => setLog((prev) => prev + msg + "\n");

  // --- load input ---
  const loadInputFile = async (filename: string) => {
    try {
      setStatus("loading");
      const res = await fetch(`/api/inputs/${filename}`);
      const data = await res.json();
      setInputData(data);
      appendLog(`📥 Loaded ${filename}.json`);
      setStatus("idle");
    } catch (err) {
      console.error(err);
      appendLog("❌ Failed to load input file.");
      setStatus("failed");
    }
  };

  // --- save input ---
  const saveInputFile = async (filename: string) => {
    try {
      const res = await fetch(`/api/inputs/${filename}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputData, null, 2),
      });
      const json = await res.json();
      appendLog(`💾 ${json.message}`);
    } catch (err) {
      console.error(err);
      appendLog("❌ Failed to save input file.");
    }
  };

  // --- Generate and prove proof ---
  const handleProve = async () => {
    try {
      setStatus("proving");
      appendLog("🚀 Starting proof generation...");
      const snarkjs = await loadSnarkjs();

      const input = inputData || { balance_before: 100, amount: 10 };
      appendLog("🧾 Input: " + JSON.stringify(input));

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        "/zk/execution.wasm",
        "/zk/execution_0001.zkey"
      );

      appendLog("✅ Proof generated.");

      const vkey = await (await fetch("/zk/verification_key.json")).json();
      const verified = await snarkjs.groth16.verify(vkey, publicSignals, proof);

      appendLog("🔍 Verification result: " + verified);
      if (!verified) throw new Error("Invalid proof");

      setStatus("verified");
      appendLog("🎉 Proof verified successfully!");
    } catch (err: any) {
      console.error("Proof generation failed:", err);
      setStatus("failed");
      appendLog("❌ Error: " + err.message);
    }
  };

  return (
    <section
      className="
        bg-white/95 backdrop-blur-xl
        border border-slate-300 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.06)]
        px-8 py-7 mt-6
      "
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-800">
          Execution Checker
        </h2>
        <span className="text-xs text-slate-500">Groth16 · Circom</span>
      </div>

      {/* button */}
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={() => loadInputFile("execution")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
        >
          📥 Load Input (execution.json)
        </button>
        <button
          onClick={() => saveInputFile("execution")}
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
        >
          💾 Save Input
        </button>
        <button
          onClick={handleProve}
          disabled={status === "proving"}
          className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1 rounded text-sm"
        >
          🚀 Generate Proof
        </button>
      </div>

      {/* Edit */}
      <textarea
        value={JSON.stringify(inputData || {}, null, 2)}
        onChange={(e) => {
          try {
            const json = JSON.parse(e.target.value);
            setInputData(json);
          } catch {
            // Temp no error
          }
        }}
        className="
          w-full h-48 font-mono text-xs p-3 border border-slate-200
          rounded bg-slate-50 focus:ring-2 focus:ring-blue-100
          text-slate-700
        "
      />

      {/* Status */}
      <p className="mt-3 text-sm text-slate-600">
        Status: <b>{status}</b>
      </p>

      {/* Output */}
      <pre
        className="
          mt-3 text-xs bg-slate-900 text-slate-100 p-3 rounded
          max-h-48 overflow-y-auto whitespace-pre-wrap
        "
      >
        {log || "No logs yet."}
      </pre>
    </section>
  );
}
