import { useState } from "react";

export default function SnarkjsComponent() {
  const [status, setStatus] = useState("idle");

  const handleProve = async () => {
    try {
      // ✅ 动态导入 snarkjs，仅在浏览器执行
      const snarkjs = await import("snarkjs");
      console.log("snarkjs loaded:", snarkjs);

      // 简单测试调用（验证模块是否正常工作）
      setStatus("snarkjs loaded successfully ✅");
    } catch (err) {
      console.error("Failed to load snarkjs:", err);
      setStatus("❌ failed");
    }
  };

  return (
    <div className="p-6">
      <button
        onClick={handleProve}
        className="bg-blue-600 text-white px-4 py-2 rounded-md"
      >
        Load snarkjs
      </button>
      <p className="mt-4">{status}</p>
    </div>
  );
}
