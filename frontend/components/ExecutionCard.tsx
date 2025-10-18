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

  // 🔍 Scanning
  useEffect(() => {
    (async () => {
      appendLog("🔍 Scanning circuits...");
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

  // 📥 loadInputFile
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

  // 💾 saveInputFile
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

  // 🚀 handleProve
  const handleProve = async () => {
    try {
      setStatus("proving");
      appendLog(`🚀 Proving ${selectedCircuit}...`);
      const snarkjs = await loadSnarkjs();
      const input = inputData || {};
      appendLog("🧾 Input: " + JSON.stringify(input));

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        `/zk/${selectedCircuit}/${selectedCircuit}.wasm`,
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

  // 🧩 testGraph
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

  // 🧱 UI
  return (
    <section className="bg-white/95 backdrop-blur-xl border border-slate-300 rounded-xl shadow px-8 py-7 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-800">zkParallel Circuit Verifier</h2>
        <span className="text-xs text-slate-500">v1.0.4-Lite · Stable Single-Circuit Mode</span>
      </div>

      {/* selectedCircuit */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">Select Circuit</label>
        <select
          value={selectedCircuit}
          onChange={(e) => {
            setSelectedCircuit(e.target.value);
            setInputData(null);
            setLog("");
            setStatus("idle");
          }}
          className="border border-slate-300 rounded px-3 py-2 text-sm w-full"
        >
          {circuits.length === 0 && <option>Loading circuits...</option>}
          {circuits.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* button */}
      <div className="flex flex-wrap gap-3 mb-4">
        <button onClick={loadInputFile} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm">📥 Load Input</button>
        <button onClick={saveInputFile} className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm">💾 Save Input</button>
        <button onClick={handleProve} disabled={status === "proving"} className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1 rounded text-sm">🚀 Generate Proof</button>
        <button onClick={testGraph} className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm">🧩 Test Circuit Graph</button>
      </div>

      {/* inputData */}
      <textarea
        value={JSON.stringify(inputData || {}, null, 2)}
        onChange={(e) => {
          try {
            const json = JSON.parse(e.target.value);
            setInputData(json);
          } catch {}
        }}
        className="w-full h-48 font-mono text-xs p-3 border border-slate-200 rounded bg-slate-50 focus:ring-2 focus:ring-blue-100 text-slate-700"
      />

      {/* Status */}
      <p className="mt-3 text-sm text-slate-600">Status: <b>{status}</b></p>
      <pre className="mt-3 text-xs bg-slate-900 text-slate-100 p-3 rounded max-h-64 overflow-y-auto whitespace-pre-wrap">
        {log || "No logs yet."}
      </pre>
    </section>
  );
}
