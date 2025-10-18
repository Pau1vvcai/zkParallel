// /lib/parallel.ts
import type { CircuitId, CircuitPaths } from "./circuits";

export type LogFn = (msg: string, circuit?: CircuitId) => void;
export type ProgressFn = (done: number, total: number) => void;

type VerifyResult = {
  circuit: CircuitId;
  ok: boolean;
  elapsedMs: number;
  error?: string;
};

const loadSnarkjs = async () => await import("snarkjs");
const fetchJson = async <T,>(url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}`);
  return (await res.json()) as T;
};

// ---- 直接在主线程证明（备用，或当 Worker 关闭时）
export async function verifySingle(
  circuit: CircuitId,
  paths: CircuitPaths,
  log: LogFn = () => {}
): Promise<VerifyResult> {
  const t0 = performance.now();
  try {
    log(`Loaded ${paths.input}`, circuit);
    const input = await fetchJson<Record<string, any>>(paths.input);
    log(`Proving ${circuit}...`, circuit);

    const snarkjs = await loadSnarkjs();
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      paths.wasm,
      paths.zkey
    );
    const vkey = await fetchJson(paths.vkey);
    const ok = await snarkjs.groth16.verify(vkey, publicSignals, proof);
    log(`Verification result: ${ok}`, circuit);
    if (ok) log(`${circuit} verified successfully!`, circuit);

    return { circuit, ok, elapsedMs: Math.round(performance.now() - t0) };
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    log(`Error: ${msg}`, circuit);
    return { circuit, ok: false, elapsedMs: Math.round(performance.now() - t0), error: msg };
  }
}

// ---- 基于 Web Worker 的证明（避免阻塞 UI）
export function makeWorker() {
  try {
    // Webpack / Next.js 支持：相对路径到 /workers
    const worker = new Worker(new URL("../workers/prover.worker.ts", import.meta.url));
    return worker;
  } catch {
    return null;
  }
}

export async function verifyManyCircuits(
  items: Array<{ id: CircuitId; paths: CircuitPaths }>,
  {
    log = () => {},
    onProgress = () => {},
    concurrency = 3,
    useWorker = true,
  }: { log?: LogFn; onProgress?: ProgressFn; concurrency?: number; useWorker?: boolean } = {}
): Promise<VerifyResult[]> {
  const total = items.length;
  let done = 0;
  const results: VerifyResult[] = [];
  const queue = [...items];
  const running: Promise<any>[] = [];
  const worker = useWorker ? makeWorker() : null;

  const runOne = (item: { id: CircuitId; paths: CircuitPaths }) => {
    if (!worker) {
      // fallback：主线程执行
      return verifySingle(item.id, item.paths, log).then((r) => {
        results.push(r);
        done++; onProgress(done, total);
      });
    }
    // Worker 执行
    return new Promise<void>((resolve) => {
      const handle = (ev: MessageEvent) => {
        const m = ev.data;
        if (m.type === "log" && m.circuit === item.id) log(m.message, m.circuit);
        if (m.type === "done" && m.circuit === item.id) {
          results.push(m.result as VerifyResult);
          done++; onProgress(done, total);
          worker!.removeEventListener("message", handle);
          resolve();
        }
      };
      worker.addEventListener("message", handle);
      worker.postMessage({ type: "prove", circuit: item.id, paths: item.paths });
    });
  };

  const launch = () => {
    const next = queue.shift();
    if (!next) return;
    const p = runOne(next).then(() => {
      running.splice(running.indexOf(p), 1);
      launch();
    });
    running.push(p);
  };

  const slots = Number.isFinite(concurrency) ? Math.max(1, concurrency) : items.length;
  for (let i = 0; i < slots; i++) launch();

  await Promise.all(running);
  worker?.terminate();
  return results;
}
