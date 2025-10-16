"use client";

import { useState, useEffect } from "react";

const loadSnarkjs = async () => await import("snarkjs");

export default function ExecutionCard() {
  const [circuits, setCircuits] = useState<any[]>([]);
  const [selectedCircuit, setSelectedCircuit] = useState<string>("");
  const [inputData, setInputData] = useState<any>(null);
  const [status, setStatus] =
    useState<"idle" | "loading" | "proving" | "verified" | "failed">("idle");
  const [log, setLog] = useState<string>("");

  const appendLog = (msg: string) =>
    setLog((prev) => `${prev}${msg}\n`);

  // --- Scanning circuits ---
  useEffect(() => {
    (async () => {
      try {
        appendLog("🔍 Scanning circuits...");
        const res = await fetch("/api/circuits");
        const data = await res.json();
        setCircuits(data);
        if (data.length > 0) {
          setSelectedCircuit(data[0].id);
          appendLog(`✅ Found ${data.length} circuit(s). Default: ${data[0].id}`);
        } else {
          appendLog("⚠️ No circuits found under /public/zk/");
        }
      } catch (err) {
        console.error(err);
        appendLog("❌ Failed to load circuit list.");
      }
    })();
  }, []);

  // --- loadInputFile ---
  const loadInputFile = async () => {
    try {
      setStatus("loading");
      const res = await fetch(`/api/inputs/${selectedCircuit}`);
      const data = await res.json();
      setInputData(data);
      appendLog(`📥 Loaded ${selectedCircuit}.json`);
      setStatus("idle");
    } catch (err) {
      console.error(err);
      appendLog("❌ Failed to load input file.");
      setStatus("failed");
    }
  };

  // --- saveInputFile ---
  const saveInputFile = async () => {
    try {
      const res = await fetch(`/api/inputs/${selectedCircuit}`, {
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

  // --- handleProve ---
  const handleProve = async () => {
    try {
      setStatus("proving");
      appendLog(`🚀 Proving ${selectedCircuit}...`);

      const snarkjs = await loadSnarkjs();
      const circuit = circuits.find((c) => c.id === selectedCircuit);

      if (!circuit) throw new Error("Circuit not found or not loaded.");

      const input = inputData || {};
      appendLog("🧾 Input: " + JSON.stringify(input));

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        circuit.wasm,
        circuit.zkey
      );

      appendLog("✅ Proof generated.");

      const vkey = await (await fetch(circuit.vkey)).json();
      const verified = await snarkjs.groth16.verify(vkey, publicSignals, proof);

      appendLog("🔍 Verification result: " + verified);
      if (!verified) throw new Error("Invalid proof");

      setStatus("verified");
      appendLog(`🎉 ${selectedCircuit} verified successfully!`);
    } catch (err: any) {
      console.error(err);
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
          zkParallel Circuit Verifier
        </h2>
        <span className="text-xs text-slate-500">v1.0.3 · Auto Circuit Scan</span>
      </div>

      {/* Select Circuit */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Select Circuit
        </label>
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
          {circuits.length === 0 && (
            <option>Loading circuits...</option>
          )}
          {circuits.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name || c.id}
            </option>
          ))}
        </select>
      </div>

      {/* button */}
      <div className="flex flex-wrap gap-3 mb-4">
        <button
          onClick={loadInputFile}
          disabled={!selectedCircuit}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
        >
          📥 Load Input
        </button>
        <button
          onClick={saveInputFile}
          disabled={!selectedCircuit}
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
        >
          💾 Save Input
        </button>
        <button
          onClick={handleProve}
          disabled={status === "proving" || !selectedCircuit}
          className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1 rounded text-sm"
        >
          🚀 Generate Proof
        </button>
      </div>

      {/* onChange */}
      <textarea
        value={JSON.stringify(inputData || {}, null, 2)}
        onChange={(e) => {
          try {
            const json = JSON.parse(e.target.value);
            setInputData(json);
          } catch {
            // ignore
          }
        }}
        placeholder="Edit or load your circuit input JSON here..."
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
