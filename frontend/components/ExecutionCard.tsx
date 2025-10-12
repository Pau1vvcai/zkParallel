"use client";
import { useState } from "react";

const loadSnarkjs = async () => await import("snarkjs");

export default function ExecutionCard() {
  const [balanceBefore, setBalanceBefore] = useState("100");
  const [amount, setAmount] = useState("30");
  const [status, setStatus] =
    useState<"idle" | "proving" | "verified" | "failed">("idle");
  const [result, setResult] = useState<any>(null);

  const handleProve = async () => {
    try {
      setStatus("proving");
      const snarkjs = await loadSnarkjs();

      const input = { balance_before: balanceBefore, amount };
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        "/zk/execution.wasm",
        "/zk/execution_0001.zkey"
      );

      const vkey = await (await fetch("/zk/verification_key.json")).json();
      const verified = await snarkjs.groth16.verify(vkey, publicSignals, proof);

      if (!verified) throw new Error("Invalid proof");
      setResult(publicSignals);
      setStatus("verified");
    } catch (err) {
      console.error(err);
      setStatus("failed");
    }
  };

  const handleSubmitProof = async () => {
    const res = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proof: result }),
    });
    const json = await res.json();
    alert("Mock submitted: txId = " + json.txId);
  };

  return (
    <section
      className="
        bg-white/95 backdrop-blur-xl
        border border-slate-300 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.06)]
        px-8 py-7
      "
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-800">Execution Checker</h2>
        <span className="text-xs text-slate-500">Groth16 · Circom</span>
      </div>

      <div className="h-px bg-slate-200 my-6" />

      <div className="grid grid-cols-1 gap-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Balance Before
          </label>
          <input
            type="number"
            value={balanceBefore}
            onChange={(e) => setBalanceBefore(e.target.value)}
            className="
              w-full rounded-md border border-slate-300
              px-3 py-2
              text-slate-800
              focus:ring-2 focus:ring-blue-100 focus:border-blue-500
              outline-none transition
            "
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Amount
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="
              w-full rounded-md border border-slate-300
              px-3 py-2
              text-slate-800
              focus:ring-2 focus:ring-blue-100 focus:border-blue-500
              outline-none transition
            "
          />
        </div>
      </div>

      <div className="h-px bg-slate-200 my-6" />

      <div className="flex justify-center">
        {status === "proving" ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="w-12 h-12 border-8 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-600">Generating proof…</p>
          </div>
        ) : (
          <button
            onClick={handleProve}
            disabled={status === "proving"}
            className="
              w-48
              bg-slate-900 hover:bg-slate-800
              text-white
              py-2 rounded-md
              font-medium
              shadow
              transition
            "
          >
            🚀 Generate Proof
          </button>
        )}
      </div>

      <div className="mt-6">
        {status === "verified" && (
          <div className="rounded-md border border-green-500 bg-green-50 p-4">
            <p className="font-semibold text-green-700">✅ Proof verified successfully</p>
            <p className="text-sm text-green-700 mt-1">Execution valid</p>
            <pre className="mt-3 bg-white border border-slate-200 rounded p-2 text-xs overflow-x-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
            <button
              onClick={handleSubmitProof}
              className="mt-3 px-3 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700"
            >
              Submit Proof (mock)
            </button>
          </div>
        )}

        {status === "failed" && (
          <div className="rounded-md border border-red-400 bg-red-50 p-4 text-sm text-red-700">
            ❌ Verification failed — invalid proof.
          </div>
        )}

        {status === "idle" && (
          <p className="text-center text-xs text-slate-500">
            Fill inputs and click “Generate Proof” to start.
          </p>
        )}
      </div>
    </section>
  );
}
