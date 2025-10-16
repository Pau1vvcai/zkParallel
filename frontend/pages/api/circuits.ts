import fs from "fs";
import path from "path";
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const zkDir = path.join(process.cwd(), "public", "zk");
    const circuits = fs
      .readdirSync(zkDir)
      .filter((dir) => fs.statSync(path.join(zkDir, dir)).isDirectory())
      .map((dir) => {
        const wasm = path.join("/zk", dir, `${dir}.wasm`);
        const zkey = path.join("/zk", dir, `${dir}_0001.zkey`);
        const vkey = path.join("/zk", dir, `verification_key.json`);

        return { id: dir, name: dir, wasm, zkey, vkey };
      });

    res.status(200).json(circuits);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to scan circuits" });
  }
}
