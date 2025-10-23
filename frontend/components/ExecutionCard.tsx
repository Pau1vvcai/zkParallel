"use client";

import { useState, useEffect } from "react";
import { describeGraph, getExecutionOrder, CIRCUIT_GRAPH } from "../lib/circuitGraph";

const loadSnarkjs = async () => await import("snarkjs");

export default function ExecutionCard() {
  const [circuits, setCircuits] = useState<string[]>([]);
  const [selectedCircuit, setSelectedCircuit] = useState<string>("");
  const [inputData, setInputData] = useState<any>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "proving" | "verified" | "failed">("idle");
  const [log, setLog] = useState<string>("");

  const appendLog = (msg: string) => setLog((prev) => prev + msg + "\n");

  // 🔍 Circuit Scan
  useEffect(() => {
    (async () => {
      appendLog("🔍 Scanning available circuits...");
      try {
        const res = await fetch("/api/circuits");
        const data = await res.json();
        setCircuits(data.map((d: any) => d.id));
        if (data.length > 0) {
          setSelectedCircuit(data[0].id);
          appendLog(`✅ Found ${data.length} circuit(s). Default: ${data[0].id}`);
        }
      } catch {
        appendLog("❌ Failed to load circuit list.");
      }
    })();
  }, []);

  // 📥 Load Input
  const loadInputFile = async () => {
    try {
      setStatus("loading");
      const res = await fetch(`/api/inputs/${selectedCircuit}`);
      const data = await res.json();
      setInputData(data);
      appendLog(`📥 Loaded ${selectedCircuit}.json`);
      setStatus("idle");
    } catch {
      appendLog("❌ Failed to load input file.");
      setStatus("failed");
    }
  };

  // 💾 Save Input
  const saveInputFile = async () => {
    try {
      const res = await fetch(`/api/inputs/${selectedCircuit}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputData, null, 2),
      });
      const json = await res.json();
      appendLog(`💾 ${json.message}`);
    } catch {
      appendLog("❌ Failed to save input file.");
    }
  };

  // 🚀 Generate Proof
  const handleProve = async () => {
    try {
      setStatus("proving");
      appendLog(`🚀 Generating proof for ${selectedCircuit}...`);
      const snarkjs = await loadSnarkjs();
      const input = inputData || {};
      appendLog("🧾 Input: " + JSON.stringify(input));

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        `/zk/${selectedCircuit}/${selectedCircuit}_js/${selectedCircuit}.wasm`,
        `/zk/${selectedCircuit}/${selectedCircuit}_0001.zkey`
      );

      const vkey = await (await fetch(`/zk/${selectedCircuit}/verification_key.json`)).json();
      const verified = await snarkjs.groth16.verify(vkey, publicSignals, proof);
      appendLog("🔍 Verification result: " + verified);

      if (!verified) throw new Error("Invalid proof");
      appendLog(`🎉 ${selectedCircuit} verified successfully!`);
      setStatus("verified");
    } catch (err: any) {
      appendLog(`❌ ${selectedCircuit} failed: ${err.message}`);
      setStatus("failed");
    }
  };

  // 🧩 Test Graph
  const testGraph = () => {
    const order = getExecutionOrder();
    console.log("✅ Execution Order:", order);
    console.log(describeGraph());
    let mockOutput = [42];
    for (const id of order) {
      const node = CIRCUIT_GRAPH[id];
      const nextInput = node.mapOutput ? node.mapOutput(mockOutput) : {};
      console.log(`🔁 ${id}: deps=${node.deps.join(",") || "none"}`);
      console.log(`   mapOutput(${JSON.stringify(mockOutput)}) → ${JSON.stringify(nextInput)}`);
      mockOutput = [Math.floor(Math.random() * 100)];
    }
  };

  return (
    <section className="mx-auto max-w-4xl space-y-6 rounded-3xl bg-gradient-to-b from-white to-neutral-50 p-8 shadow-xl border border-neutral-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-3xl font-semibold text-neutral-900 tracking-tight">
            zkParallel Circuit Executor
          </h2>
          <p className="text-sm text-neutral-500">Single-Circuit Execution Environment</p>
        </div>
        <span
          className={`text-xs font-medium rounded-full px-3 py-1 ${
            status === "verified"
              ? "bg-emerald-100 text-emerald-700"
              : status === "failed"
              ? "bg-red-100 text-red-700"
              : status === "proving"
              ? "bg-yellow-100 text-yellow-700 animate-pulse"
              : "bg-neutral-100 text-neutral-500"
          }`}
        >
          {status.toUpperCase()}
        </span>
      </div>

      {/* Circuit Selection */}
      <div>
        <h3 className="text-base font-semibold text-neutral-800 mb-1">Select Circuit</h3>
        <select
          value={selectedCircuit}
          onChange={(e) => {
            setSelectedCircuit(e.target.value);
            setInputData(null);
            setLog("");
            setStatus("idle");
          }}
          className="w-full border border-neutral-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition"
        >
          {circuits.length === 0 && <option>Loading circuits...</option>}
          {circuits.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={loadInputFile}
          className="rounded-xl bg-white border border-neutral-300 px-5 py-2 text-sm hover:bg-neutral-100 transition"
        >
          📥 Load Input
        </button>
        <button
          onClick={saveInputFile}
          className="rounded-xl bg-white border border-neutral-300 px-5 py-2 text-sm hover:bg-neutral-100 transition"
        >
          💾 Save Input
        </button>
        <button
          onClick={handleProve}
          disabled={status === "proving"}
          className="rounded-xl bg-gradient-to-r from-black to-neutral-800 text-white px-6 py-2 text-sm hover:opacity-90 transition"
        >
          🚀 Generate Proof
        </button>
        <button
          onClick={testGraph}
          className="rounded-xl bg-white border border-neutral-300 px-5 py-2 text-sm hover:bg-neutral-100 transition"
        >
          🧩 Test Circuit Graph
        </button>
      </div>

      {/* Input JSON */}
      <div>
        <h3 className="text-base font-semibold text-neutral-800 mb-1">Input JSON</h3>
        <textarea
          value={JSON.stringify(inputData || {}, null, 2)}
          onChange={(e) => {
            try {
              const json = JSON.parse(e.target.value);
              setInputData(json);
            } catch {}
          }}
          className="w-full h-56 font-mono text-xs p-4 border border-neutral-300 rounded-2xl bg-neutral-50 focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 text-neutral-800 shadow-inner transition"
        />
      </div>

      {/* Logs */}
      <div>
        <h3 className="text-base font-semibold text-neutral-800 mb-1">Execution Logs</h3>
        <pre className="w-full h-64 overflow-y-auto bg-neutral-900 text-green-200 rounded-2xl p-4 text-xs font-mono shadow-inner whitespace-pre-wrap">
          {log || "No logs yet."}
        </pre>
      </div>
    </section>
  );
}
