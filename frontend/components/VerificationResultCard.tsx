// components/VerificationResultCard.tsx
"use client";
import React from "react";

interface VerificationResultCardProps {
  circuit: string;
  ok: boolean;
  elapsed: number;
  mode: "local" | "on-chain";
  gasUsed?: string;
  verifierAddress?: string;
  txHash?: string;
  timestamp?: string;
}

export default function VerificationResultCard({
  circuit,
  ok,
  elapsed,
  mode,
  gasUsed,
  verifierAddress,
  txHash,
  timestamp,
}: VerificationResultCardProps) {
  const statusColor = ok ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50";

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm p-4 mb-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold text-neutral-900">{circuit}</div>
        <div
          className={`text-sm font-medium px-3 py-1 rounded-full ${statusColor}`}
        >
          {ok ? "✅ Verified" : "❌ Failed"}
        </div>
      </div>

      {/* Details */}
      <div className="mt-3 text-sm text-neutral-700 space-y-1">
        <div>
          <b>Mode:</b> {mode === "on-chain" ? "🌐 On-Chain" : "🧮 Local"}
        </div>
        <div>
          <b>Elapsed:</b> {elapsed} ms
        </div>
        {gasUsed && (
          <div>
            <b>Gas Used:</b> {gasUsed}
          </div>
        )}
        {verifierAddress && (
          <div className="break-all">
            <b>Verifier:</b>{" "}
            <span className="text-blue-600">{verifierAddress}</span>
          </div>
        )}
        {txHash && (
          <div className="break-all">
            <b>Tx:</b>{" "}
            <span className="text-blue-600">
              {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </span>
          </div>
        )}
        {timestamp && (
          <div>
            <b>Time:</b> {timestamp}
          </div>
        )}
      </div>
    </div>
  );
}
