// /workers/prover.worker.ts
// 运行在 Worker 线程
// @ts-ignore - 在 Worker 中可用
self.onmessage = async (ev: MessageEvent) => {
  const msg = ev.data;
  if (msg?.type !== "prove") return;

  const { circuit, paths } = msg;
  const post = (type: string, payload: any = {}) =>
    // @ts-ignore
    self.postMessage({ type, circuit, ...payload });

  const t0 = Date.now();
  try {
    const fetchJson = async (url: string) => {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Failed to fetch ${url}`);
      return r.json();
    };

    post("log", { message: `Loaded ${paths.input}` });
    const input = await fetchJson(paths.input);

    post("log", { message: `Proving ${circuit}...` });
    // 动态导入 snarkjs（注意：在 worker 里也能用）
    // @ts-ignore
    const snarkjs = await import("snarkjs");
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      paths.wasm,
      paths.zkey
    );
    const vkey = await fetchJson(paths.vkey);
    const ok = await snarkjs.groth16.verify(vkey, publicSignals, proof);
    post("log", { message: `Verification result: ${ok}` });
    if (ok) post("log", { message: `${circuit} verified successfully!` });

    post("done", {
      result: { circuit, ok, elapsedMs: Date.now() - t0 },
    });
  } catch (e: any) {
    post("log", { message: `Error: ${e?.message ?? String(e)}` });
    post("done", {
      result: { circuit, ok: false, elapsedMs: Date.now() - t0, error: e?.message ?? String(e) },
    });
  }
};
export {};
