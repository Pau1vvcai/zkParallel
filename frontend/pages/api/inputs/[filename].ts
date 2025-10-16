import fs from "fs";
import path from "path";
import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { filename } = req.query;
  const rootDir = path.resolve(process.cwd(), "../");
  const filePath = path.join(rootDir, "inputs", `${filename}.json`);

  try {
    if (req.method === "GET") {
      // Read Json
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "File not found." });
      }
      const data = fs.readFileSync(filePath, "utf-8");
      return res.status(200).json(JSON.parse(data));
    }

    if (req.method === "POST") {
      // Write Json
      const body = req.body;
      fs.writeFileSync(filePath, JSON.stringify(body, null, 2), "utf-8");
      return res.status(200).json({ message: `✅ ${filename}.json updated successfully.` });
    }

    return res.status(405).json({ error: "Method not allowed." });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error." });
  }
}
