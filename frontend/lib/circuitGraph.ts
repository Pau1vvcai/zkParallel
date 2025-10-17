
export interface CircuitNode {
  deps: string[]; // 前置依赖电路
  next: string[]; // 后继电路
  mapOutput?: (prevOutput: any) => Record<string, any>; 
}

export const CIRCUIT_GRAPH: Record<string, CircuitNode> = {
  execution: {
    deps: [],
    next: ["transferVerify"],
    mapOutput: (out) => ({
      in_senderBefore: Number(out[0]), 
      in_receiverBefore: 50,          
      in_amount: 5,
    }),
  },


  transferVerify: {
    deps: ["execution"],
    next: ["merkleUpdate", "transactionHash"],
    mapOutput: (out) => ({
      in_oldLeaf: Number(out[0]),  
      in_newLeaf: Number(out[0]) + 5, 
      in_pathElements: [5, 32],
      in_pathIndices: [1, 0],

      in_sender: 101,
      in_receiver: 202,
      in_amount: 5,
      in_nonce: 1,
    }),
  },


  merkleUpdate: {
    deps: ["transferVerify"],
    next: ["rootVerifier"],
    mapOutput: (out) => ({
      in_oldRoot: Number(out[0]),
      in_newRoot: Number(out[1]),
      in_proof: 5, // mock proof data
    }),
  },


  rootVerifier: {
    deps: ["merkleUpdate"],
    next: ["signatureCheck"],
    mapOutput: (out) => ({
      in_msgHash: Number(out[0]), 
      in_pubKey: 3,
      in_sig: Number(out[0]) + 3, // sig = hash + pubKey
    }),
  },


  transactionHash: {
    deps: ["transferVerify"],
    next: ["signatureCheck"],
    mapOutput: (out) => ({
      in_msgHash: Number(out[0]), 
      in_pubKey: 3,
      in_sig: Number(out[0]) + 3,
    }),
  },


  signatureCheck: {
    deps: ["transactionHash", "rootVerifier"],
    next: [],
  },
};



export function getExecutionOrder(): string[] {
  const visited = new Set<string>();
  const order: string[] = [];

  function dfs(node: string) {
    if (visited.has(node)) return;
    visited.add(node);
    (CIRCUIT_GRAPH[node]?.deps || []).forEach(dfs);
    order.push(node);
  }

  Object.keys(CIRCUIT_GRAPH).forEach(dfs);
  return order;
}


export function describeGraph(): string {
  let desc = "🔗 zkParallel Circuit Dependency Graph:\n";
  for (const [key, val] of Object.entries(CIRCUIT_GRAPH)) {
    desc += `• ${key} → [${val.next.join(", ") || "END"}]\n`;
  }
  return desc;
}
