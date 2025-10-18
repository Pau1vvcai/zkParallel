"use client";
import { useState } from "react";
import ExecutionCard from "../components/ExecutionCard";
import ParallelVerifier from "../components/ParallelVerifier";
import OnChainVerifier from "../components/OnChainVerifier";

export default function Page() {
  const [mode, setMode] = useState<"single" | "parallel" |"OnChain">("single");

  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-100 to-white flex flex-col items-center py-12 space-y-8">
      <div className="flex gap-3">
        <button
          onClick={() => setMode("single")}
          className={`rounded-xl px-4 py-2 text-sm ${
            mode === "single" ? "bg-black text-white" : "border border-neutral-400"
          }`}
        >
          Single-Circuit
        </button>
        <button
          onClick={() => setMode("parallel")}
          className={`rounded-xl px-4 py-2 text-sm ${
            mode === "parallel" ? "bg-black text-white" : "border border-neutral-400"
          }`}
        >
          Parallel Mode
        </button>
        <button
          onClick={() => setMode("onchain")}
          className={`rounded-xl px-4 py-2 text-sm ${
            mode === "onchain" ? "bg-black text-white" : "border border-neutral-400"
          }`}
        >
          On-Chain Verify
        </button>
      </div>


      {mode === "single" && <ExecutionCard />}
      {mode === "parallel" && <ParallelVerifier />}
      {mode === "onchain" && <OnChainVerifier />}
    </main>
  );
}
