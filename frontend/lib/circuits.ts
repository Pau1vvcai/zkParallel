// /lib/circuits.ts
export type CircuitId =
  | "execution"
  | "transferVerify"
  | "merkleUpdate"
  | "signatureCheck"
  | "rootVerifier"
  | "transactionHash";

export type CircuitPaths = {
  wasm: string;
  zkey: string;
  vkey: string;
  input: string;
};

export const CIRCUIT_LIST: CircuitId[] = [
  "execution",
  "transferVerify",
  "merkleUpdate",
  "signatureCheck",
  "rootVerifier",
  "transactionHash",
];

export const getCircuitPaths = (name: CircuitId): CircuitPaths => ({
  wasm: `/zk/${name}/${name}.wasm`,
  zkey: `/zk/${name}/${name}_0001.zkey`,
  vkey: `/zk/${name}/verification_key.json`,
  input: `/inputs/${name}.json`,
});
