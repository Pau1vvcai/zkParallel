// Mock Avail Adapter
export async function postProofToAvail(proof: any, circuitName: string) {
  const metadata = {
    circuit: circuitName,
    timestamp: new Date().toISOString(),
    proofHash: proof?.pi_a?.[0] || "0xmockhash",
  };
  console.log("📡 Posting to Avail (mock):", metadata);

  await new Promise((res) => setTimeout(res, 1500));

  const availBlockHash =
    "0x" + Math.random().toString(16).substring(2, 10) + "abcd";
  return { success: true, availBlockHash };
}
