"use client";

import { useState } from "react";
import ExecutionCard from "../components/ExecutionCard";
import ParallelVerifier from "../components/ParallelVerifier";

export default function Page() {
  const [mode, setMode] = useState<"single" | "parallel">("single");

  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-100 to-white flex flex-col items-center py-16 space-y-10 transition-all duration-300">
      {/* Mode Switcher */}
      <div className="flex justify-center gap-2 bg-neutral-200 rounded-full p-1 shadow-inner">
        <button
          onClick={() => setMode("single")}
          className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
            mode === "single"
              ? "bg-black text-white shadow-md"
              : "text-neutral-600 hover:text-black"
          }`}
        >
          Single-Circuit
        </button>
        <button
          onClick={() => setMode("parallel")}
          className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
            mode === "parallel"
              ? "bg-black text-white shadow-md"
              : "text-neutral-600 hover:text-black"
          }`}
        >
          Parallel Mode
        </button>
      </div>

      {/* Main Title */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-neutral-900">
          zkParallel Framework
        </h1>
        <p className="text-sm text-neutral-500">
          Unified ZK Execution • Modular Proofs • Scalable Parallelization
        </p>
      </div>

      {/* Mode Display */}
      <div className="w-full flex justify-center transition-all duration-300">
        <div
          key={mode}
          className="animate-fadeIn w-full flex justify-center"
        >
          {mode === "single" && <ExecutionCard />}
          {mode === "parallel" && <ParallelVerifier />}
        </div>
      </div>
    </main>
  );
}
