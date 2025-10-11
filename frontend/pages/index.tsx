import dynamic from "next/dynamic";
import { useState } from "react";


const loadSnarkjs = async () => {
  return await import("snarkjs");
};


export default function Home() {
  
  const [balanceBefore, setBalanceBefore] = useState("100");
  const [amount, setAmount] = useState("30");
  const [status, setStatus] = useState<
    "idle" | "proving" | "verified" | "failed"
  >("idle");
  const [result, setResult] = useState<any>(null);

  
  const handleProve = async () => {
    try {
      setStatus("proving");

    
      const snarkjs = await loadSnarkjs();

    
      const input = {
        balance_before: balanceBefore,
        amount,
      };

    
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-md space-y-4">
        <h1 className="text-xl font-semibold">zkParallel – Execution Checker</h1>

        <div>
          <label className="text-sm text-gray-600">Balance Before</label>
          <input
            type="number"
            value={balanceBefore}
            onChange={(e) => setBalanceBefore(e.target.value)}
            className="mt-1 w-full border rounded-md p-2"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full border rounded-md p-2"
          />
        </div>

        <button
          onClick={handleProve}
          disabled={status === "proving"}
          className="w-full bg-blue-600 text-white rounded-md py-2 hover:bg-blue-700"
        >
          {status === "proving" ? "Generating proof..." : "Generate Proof"}
        </button>

        
        {status === "verified" && (
          <div className="border border-green-400 bg-green-50 p-3 rounded-md text-sm">
            ✅ zk verified<br />
            Execution successful<br />
            <pre className="mt-2 text-xs">{JSON.stringify(result, null, 2)}</pre>

            <button
              onClick={handleSubmitProof}
              className="mt-3 px-3 py-1 text-xs bg-green-600 text-white rounded-md"
            >
              Submit Proof (mock)
            </button>
          </div>
        )}

        {status === "failed" && (
          <div className="border border-red-400 bg-red-50 p-3 rounded-md text-sm text-red-700">
            ❌ Verification failed
          </div>
        )}
      </div>
    </div>
  );
}
