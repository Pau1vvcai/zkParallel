import type { NextApiRequest, NextApiResponse } from "next";

let proofStore: any[] = [];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const proof = req.body;
    proofStore.push({ id: proofStore.length + 1, proof, time: Date.now() });
    res.status(200).json({ message: "Proof stored locally." });
  } else if (req.method === "GET") {
    res.status(200).json(proofStore);
  } else {
    res.status(405).end();
  }
}
