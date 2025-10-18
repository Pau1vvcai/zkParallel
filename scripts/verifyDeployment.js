// scripts/verifyDeployment.js
const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🔍 Verifying deployed contracts on local network...\n");

  // 读取部署记录
  const path = "frontend/public/deployments.json";
  if (!fs.existsSync(path)) {
    console.error("❌ No deployment record found. Run scripts/deploy.js first.");
    process.exit(1);
  }

  const deployments = JSON.parse(fs.readFileSync(path, "utf8"));
  const provider = new hre.ethers.JsonRpcProvider("http://127.0.0.1:8545");

  const results = [];

  for (const [name, address] of Object.entries(deployments)) {
    try {
      // 获取代码字节码（如果合约不存在，则返回 "0x"）
      const code = await provider.getCode(address);
      const exists = code && code !== "0x";
      const size = exists ? (code.length / 2 - 1).toLocaleString() : 0;

      results.push({
        name,
        address,
        exists: exists ? "✅" : "❌",
        codeSize: exists ? `${size} bytes` : "-",
      });
    } catch (err) {
      results.push({
        name,
        address,
        exists: "⚠️ Error",
        codeSize: err.message,
      });
    }
  }

  console.log("📋 Deployment Verification Report");
  console.table(results);

  const okCount = results.filter((r) => r.exists === "✅").length;
  console.log(`\n✅ Verified ${okCount}/${results.length} contracts successfully.\n`);
}

main().catch((err) => {
  console.error("❌ Verification script failed:", err);
  process.exit(1);
});
