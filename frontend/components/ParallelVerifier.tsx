"use client";
import { useMemo, useReducer, useRef, useEffect, useState } from "react";
import { CIRCUIT_LIST, CircuitId, getCircuitPaths } from "../lib/circuits";
import { verifyManyCircuits } from "../lib/parallel";
import { ethers } from "ethers";
import { groth16 } from "snarkjs";
import { ABIS } from "../lib/abis";
import VerificationResultCard from "../components/VerificationResultCard";

//  Mock Adapters
import { postProofToAvail } from "../lib/availAdapter";
import { runArcologyParallel } from "../lib/arcologyExecutor";

import deploymentInfo from "../lib/config/deployments.json";

const VERIFIER_MAP: Record<string, string> = {
  execution: deploymentInfo.executionVerifier,
  transferVerify: deploymentInfo.transferVerifyVerifier,
  merkleUpdate: deploymentInfo.merkleUpdateVerifier,
  rootVerifier: deploymentInfo.rootVerifierVerifier,
  signatureCheck: deploymentInfo.signatureCheckVerifier,
  transactionHash: deploymentInfo.transactionHashVerifier,
};

// === CircuitState ===
type CircuitState = {
  selected: boolean;
  status: "idle" | "running" | "verified" | "failed";
  elapsed?: number;
};

type State = Record<CircuitId, CircuitState>;
type Action =
  | { type: "toggle"; id: CircuitId }
  | { type: "reset" }
  | { type: "start"; ids: CircuitId[] }
  | { type: "done"; id: CircuitId; ok: boolean; elapsed: number };

const initState = (): State =>
  Object.fromEntries(
    CIRCUIT_LIST.map((id) => [
      id,
      {
        selected: ["execution", "transferVerify", "merkleUpdate"].includes(id),
        status: "idle",
      },
    ])
  ) as State;

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "toggle":
      return {
        ...state,
        [action.id]: { ...state[action.id], selected: !state[action.id].selected },
      };
    case "reset":
      return initState();
    case "start": {
      const next = { ...state };
      for (const id of action.ids)
        next[id] = { ...next[id], status: "running", elapsed: undefined };
      return next;
    }
    case "done":
      return {
        ...state,
        [action.id]: {
          ...state[action.id],
          status: action.ok ? "verified" : "failed",
          elapsed: action.elapsed,
        },
      };
  }
}

// ===  signer （ ethers v6）
async function getDefaultSigner() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  try {
    return await provider.getSigner(0);
  } catch {
    return await provider.getSigner();
  }
}

// === main components ===
export default function ParallelVerifier() {
  const [state, dispatch] = useReducer(reducer, undefined, initState);
  const [summary, setSummary] = useState<{ ok: number; total: number; ms: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [useWorker, setUseWorker] = useState(true);
  const [useOnChain, setUseOnChain] = useState(false);
  const [useBatch, setUseBatch] = useState(false);
  const [useAvail, setUseAvail] = useState(false);
  const [useArcology, setUseArcology] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const selected = useMemo(
    () => (Object.keys(state) as CircuitId[]).filter((id) => state[id].selected),
    [state]
  );

  const appendLog = (msg: string, c?: CircuitId) =>
    setLogs((p) => [...p, `${c ? `[${c}] ` : ""}${msg}`]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [logs]);

  // === run ===
  const run = async () => {
    setLogs([]);
    setSummary(null);
    setProgress(0);
    setRunning(true);
    dispatch({ type: "start", ids: selected });
    const t0 = performance.now();
    let results: { circuit: CircuitId; ok: boolean; elapsedMs: number }[] = [];

    try {
      // === 🧩 模式 1: 自适应 Batch Aggregation 模式 ===
      if (useOnChain && useBatch) {
        appendLog("🧩 Using adaptive BatchVerifier for aggregated on-chain verification...");
        const signer = await getDefaultSigner();
        const batchAddr = deploymentInfo.BatchVerifier;
        const batch = new ethers.Contract(batchAddr, ABIS.batchVerifier.abi, signer);

        const verifiers = selected.map((id) => VERIFIER_MAP[id]);
        const calldatas: string[] = [];

        for (const id of selected) {
          appendLog(`📦 Preparing proof for ${id}...`);
          const circuit = getCircuitPaths(id);
          const input = await (await fetch(circuit.input)).json();
          const { proof, publicSignals } = await groth16.fullProve(
            input,
            circuit.wasm,
            circuit.zkey
          );
          const calldata = await groth16.exportSolidityCallData(proof, publicSignals);
          const argv = JSON.parse("[" + calldata + "]");
          const [a, b, c, inputSignals] = argv;
          const iface = new ethers.Interface(ABIS[id].abi);
          const data = iface.encodeFunctionData("verifyProof", [a, b, c, inputSignals]);
          calldatas.push(data);
        }

        appendLog("🔗 Calling batchVerifyCalldata()...");
        const batchResults: boolean[] = await batch.batchVerifyCalldata(verifiers, calldatas);

        results = selected.map((id, i) => ({
          circuit: id,
          ok: batchResults[i],
          elapsedMs: Math.round(performance.now() - t0),
        }));

        results.forEach((r) =>
          appendLog(`${r.circuit} => ${r.ok ? "✅ verified" : "❌ failed"}`)
        );
      }

      // 🌐 On-Chain
      else if (useOnChain) {
        appendLog("🌐 On-chain mode activated. Using deployed Verifier contracts...");
        const signer = await getDefaultSigner();

        results = await Promise.all(
          selected.map(async (id) => {
            const circuit = getCircuitPaths(id);
            const t1 = performance.now();
            try {
              appendLog("📥 Loading input...", id);
              const input = await (await fetch(circuit.input)).json();
              appendLog("⚙️ Generating proof...", id);
              const { proof, publicSignals } = await groth16.fullProve(
                input,
                circuit.wasm,
                circuit.zkey
              );

              const calldata = await groth16.exportSolidityCallData(proof, publicSignals);
              const argv = JSON.parse("[" + calldata + "]");
              const addr = VERIFIER_MAP[id];
              console.log("🔍 Creating verifier:", { id, addr, abi: ABIS[id]?.abi });
              const verifier = new ethers.Contract(addr, ABIS[id].abi, signer);

              appendLog("🔗 Calling verifyProof()...", id);
              const ok = await verifier.verifyProof(...argv);
              const elapsed = Math.round(performance.now() - t1);
              appendLog(ok ? `✅ On-chain verified (${elapsed}ms)` : "❌ Verification failed", id);
              return { circuit: id, ok, elapsedMs: elapsed };
            } catch (err: any) {
              appendLog(`❌ Error: ${err.message}`, id);
              return { circuit: id, ok: false, elapsedMs: 0 };
            }
          })
        );
      }

      // Local parallel verification
      else {
        appendLog("🧮 Local parallel verification started...");
        const items = selected.map((id) => ({ id, paths: getCircuitPaths(id) }));
        results = await verifyManyCircuits(items, {
          log: appendLog,
          onProgress: (d, t) => setProgress(Math.round((d / t) * 100)),
          concurrency: 3,
          useWorker,
        });
      }

      // === Mock Avail / Arcology  ===
      if (useAvail) {
        for (const r of results.filter((r) => r.ok)) {
          const availResp = await postProofToAvail(r, r.circuit);
          appendLog(`✅ Posted to Avail: ${availResp.availBlockHash}`, r.circuit);
        }
      }

      if (useArcology) {
        appendLog("⚙️ Running Arcology parallel execution...");
        const result = await runArcologyParallel(results);
        appendLog(`⚙️ Arcology parallel run: ${result.elapsed}ms, hash: ${result.resultHash}`);
      }

    } catch (err: any) {
      appendLog(`❌ Global error: ${err.message}`);
    }

    // === Renew status ===
    for (const r of results)
      dispatch({ type: "done", id: r.circuit, ok: r.ok, elapsed: r.elapsedMs });

    setSummary({
      ok: results.filter((r) => r.ok).length,
      total: results.length,
      ms: Math.round(performance.now() - t0),
    });
    setRunning(false);
  };

  // === UI  ===
  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8 bg-gradient-to-b from-white to-neutral-50 rounded-3xl shadow-2xl border border-neutral-200">
  
  {/* Header */}
  <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
    <div>
      <h1 className="text-3xl font-semibold text-neutral-900 tracking-tight">
        zkParallel Circuit Verifier
      </h1>
      <p className="text-sm text-neutral-500 mt-1">
        Parallel + Batch + On-Chain + Avail + Arcology
      </p>
    </div>
    <div className="text-right">
      <span className="text-xs px-3 py-1 bg-neutral-900 text-white rounded-full">
        v1.3.8 Presentation
      </span>
    </div>
  </header>

  {/* Summary Cards */}
  {summary && (
    <div className="grid grid-cols-3 gap-4 text-center">
      <div className="rounded-2xl bg-white shadow-inner py-4 border">
        <div className="text-xl font-bold text-emerald-600">{summary.ok}</div>
        <p className="text-xs text-neutral-600">Verified</p>
      </div>
      <div className="rounded-2xl bg-white shadow-inner py-4 border">
        <div className="text-xl font-bold text-neutral-800">{summary.total}</div>
        <p className="text-xs text-neutral-600">Total Circuits</p>
      </div>
      <div className="rounded-2xl bg-white shadow-inner py-4 border">
        <div className="text-xl font-bold text-blue-600">{summary.ms}ms</div>
        <p className="text-xs text-neutral-600">Elapsed Time</p>
      </div>
    </div>
  )}

  {/* Circuit Selector */}
  <section>
    <h2 className="text-lg font-semibold text-neutral-800 mb-2">Select Circuits</h2>
    <div className="grid sm:grid-cols-3 gap-3">
      {CIRCUIT_LIST.map((id) => {
        const s = state[id];
        const statusColor =
          s.status === "verified"
            ? "border-emerald-400 bg-emerald-50"
            : s.status === "failed"
            ? "border-red-400 bg-red-50"
            : s.status === "running"
            ? "border-amber-400 bg-amber-50 animate-pulse"
            : "border-neutral-200 hover:border-neutral-400";
        return (
          <label
            key={id}
            className={`rounded-2xl border px-4 py-3 cursor-pointer transition ${statusColor}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={s.selected}
                  onChange={() => dispatch({ type: "toggle", id })}
                  disabled={running}
                />
                <span className="font-medium text-neutral-800">{id}</span>
              </div>
              {s.status !== "idle" && (
                <span
                  className={`text-xs rounded-full px-2 py-1 ${
                    s.status === "verified"
                      ? "bg-emerald-100 text-emerald-700"
                      : s.status === "failed"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {s.status}
                </span>
              )}
            </div>
          </label>
        );
      })}
    </div>
  </section>

  {/* Controls */}
  <section className="space-y-4">
    <div className="flex flex-wrap gap-3">
      {[
        ["Use Web Worker", useWorker, setUseWorker],
        ["Use On-Chain", useOnChain, setUseOnChain],
        ["Use Batch Aggregation", useBatch, setUseBatch],
        ["Post to Avail", useAvail, setUseAvail],
        ["Use Arcology", useArcology, setUseArcology],
      ].map(([label, stateVar, setter], i) => (
        <label key={i} className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={stateVar as boolean}
            onChange={(e) => (setter as any)(e.target.checked)}
            disabled={running}
          />
          {label}
        </label>
      ))}
    </div>

    <div className="flex flex-wrap gap-3">
      <button
        onClick={run}
        disabled={running || selected.length === 0}
        className="rounded-xl bg-gradient-to-r from-black to-neutral-800 px-6 py-2 text-white hover:opacity-90 transition-all"
      >
        {running ? "Verifying..." : `Verify ${selected.length} Circuit${selected.length > 1 ? "s" : ""}`}
      </button>
      <button
        onClick={() => setLogs([])}
        disabled={running}
        className="rounded-xl border border-neutral-300 px-5 py-2 text-sm hover:bg-neutral-100"
      >
        Clear Logs
      </button>
      <button
        onClick={() => dispatch({ type: "reset" })}
        disabled={running}
        className="rounded-xl border border-neutral-300 px-5 py-2 text-sm hover:bg-neutral-100"
      >
        Reset
      </button>
    </div>
  </section>

  {/* Progress */}
  <div className="space-y-1">
    <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
      <div
        className="h-2 bg-gradient-to-r from-emerald-400 to-blue-500 transition-all"
        style={{ width: `${progress}%` }}
      />
    </div>
    {summary && (
      <div className="text-sm text-neutral-600">
        ✅ <b>{summary.ok}</b> / {summary.total} circuits verified • ⏱ <b>{summary.ms}ms</b> elapsed
      </div>
    )}
  </div>

  {/* Logs */}
  <section>
    <h2 className="text-lg font-semibold text-neutral-800 mb-2">Execution Logs</h2>
    <div
      ref={logRef}
      className="h-64 bg-neutral-900 text-green-200 font-mono text-xs rounded-2xl p-4 overflow-auto shadow-inner"
    >
      {logs.map((l, i) => (
        <div key={i} className="whitespace-pre-wrap">{l}</div>
      ))}
    </div>
  </section>

  {/* Verification Results */}
  {summary && (
    <section>
      <h2 className="text-lg font-semibold text-neutral-800 mb-3">Verification Results</h2>
      {selected.map((id) => {
        const s = state[id];
        if (s.status === "idle") return null;
        return (
          <VerificationResultCard
            key={id}
            circuit={id}
            ok={s.status === "verified"}
            elapsed={s.elapsed ?? 0}
            mode={useOnChain ? "on-chain" : "local"}
            gasUsed={useOnChain ? "— estimated —" : undefined}
            verifierAddress={useOnChain ? VERIFIER_MAP[id] : undefined}
            timestamp={new Date().toLocaleString()}
          />
        );
      })}
    </section>
  )}
</div>

  );
}
