"use client";
import { useMemo, useReducer, useRef, useEffect, useState } from "react";
import { CIRCUIT_LIST, CircuitId, getCircuitPaths } from "../lib/circuits";
import { verifyManyCircuits } from "../lib/parallel";
import { ethers } from "ethers";
import { groth16 } from "snarkjs";
import { ABIS } from "../lib/abis"; // ✅ 这里导入所有 ABI

import deploymentInfo from "../public/deployments.json";

// ✅ 根据 deploymentInfo 中的键名，映射每个电路对应的部署地址
const VERIFIER_MAP: Record<string, string> = {
  execution: deploymentInfo.ExecutionVerifier,
  transferVerify: deploymentInfo.transferVerifyVerifier,
  merkleUpdate: deploymentInfo.merkleUpdateVerifier,
  rootVerifier: deploymentInfo.rootVerifierVerifier,
  signatureCheck: deploymentInfo.signatureCheckVerifier,
  transactionHash: deploymentInfo.transactionHashVerifier,
};



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

export default function ParallelVerifier() {
  const [state, dispatch] = useReducer(reducer, undefined, initState);
  const [summary, setSummary] = useState<{ ok: number; total: number; ms: number } | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [useWorker, setUseWorker] = useState(true);
  const [useOnChain, setUseOnChain] = useState(false);
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

  // ✅ 核心运行逻辑
  const run = async () => {
    setLogs([]);
    setSummary(null);
    setProgress(0);
    setRunning(true);
    dispatch({ type: "start", ids: selected });
    const t0 = performance.now();

    let results: { circuit: CircuitId; ok: boolean; elapsedMs: number }[] = [];

    try {
      if (useOnChain) {
        appendLog("🌐 On-chain mode activated. Using deployed Verifier contracts...");
        const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
        const signer = await provider.getSigner(0);

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
      } else {
        appendLog("🧮 Local parallel verification started...");
        const items = selected.map((id) => ({ id, paths: getCircuitPaths(id) }));
        results = await verifyManyCircuits(items, {
          log: appendLog,
          onProgress: (d, t) => setProgress(Math.round((d / t) * 100)),
          concurrency: 3,
          useWorker,
        });
      }
    } catch (err: any) {
      appendLog(`❌ Global error: ${err.message}`);
    }

    // ✅ 更新 UI 状态
    for (const r of results)
      dispatch({ type: "done", id: r.circuit, ok: r.ok, elapsed: r.elapsedMs });

    setSummary({
      ok: results.filter((r) => r.ok).length,
      total: results.length,
      ms: Math.round(performance.now() - t0),
    });
    setRunning(false);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5 rounded-3xl bg-gradient-to-b from-white to-neutral-50 p-8 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-neutral-900">zkParallel Circuit Verifier</h2>
        <span className="text-sm text-neutral-500">
          v1.3.1 • Parallel + On-Chain Mode
        </span>
      </div>

      {/* Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(Object.keys(state) as CircuitId[]).map((id) => {
          const s = state[id];
          const color =
            s.status === "verified"
              ? "border-green-400 bg-green-50"
              : s.status === "failed"
              ? "border-red-400 bg-red-50"
              : s.status === "running"
              ? "border-amber-400 bg-amber-50 animate-pulse"
              : "border-neutral-200 hover:border-neutral-400";
          return (
            <label
              key={id}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 transition ${color}`}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={s.selected}
                  disabled={running}
                  onChange={() => dispatch({ type: "toggle", id })}
                />
                <span className="font-medium text-neutral-800">{id}</span>
              </div>
              {s.status !== "idle" && (
                <span
                  className={`text-xs rounded-full px-2 py-1 ${
                    s.status === "verified"
                      ? "bg-green-100 text-green-700"
                      : s.status === "failed"
                      ? "bg-red-100 text-red-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {s.status}
                  {s.elapsed ? ` • ${s.elapsed}ms` : ""}
                </span>
              )}
            </label>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={useWorker}
            onChange={(e) => setUseWorker(e.target.checked)}
            disabled={useOnChain}
          />
          Use Web Worker
        </label>

        <label className="flex items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={useOnChain}
            onChange={(e) => setUseOnChain(e.target.checked)}
            disabled={running}
          />
          Use On-Chain
        </label>

        <button
          onClick={run}
          disabled={running || selected.length === 0}
          className="rounded-xl bg-black px-5 py-2 text-white hover:bg-neutral-800 transition"
        >
          {running
            ? "Verifying…"
            : `Verify ${selected.length} circuit${selected.length > 1 ? "s" : ""}`}
        </button>

        <button
          onClick={() => setLogs([])}
          disabled={running}
          className="rounded-xl border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100"
        >
          Clear Log
        </button>

        <button
          onClick={() => dispatch({ type: "reset" })}
          disabled={running}
          className="rounded-xl border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100"
        >
          Reset
        </button>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
          <div
            className="h-2 bg-black transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        {summary && (
          <div className="text-sm text-neutral-700">
            Result: <b>{summary.ok}/{summary.total}</b> verified • Elapsed{" "}
            <b>{summary.ms} ms</b>
          </div>
        )}
      </div>

      {/* Log */}
      <div
        ref={logRef}
        className="h-64 overflow-auto rounded-2xl bg-black p-4 font-mono text-sm text-white shadow-inner"
      >
        {logs.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}
