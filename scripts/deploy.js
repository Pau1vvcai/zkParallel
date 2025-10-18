// scripts/deploy.js
const hre = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("🚀 Starting batch deployment...\n");

  // 你所有电路对应的 verifier 合约名称（必须与 contracts 目录文件名一致）
  const contractNames = [
    "ExecutionVerifier",
    "transferVerifyVerifier",
    "merkleUpdateVerifier",
    "rootVerifierVerifier",
    "signatureCheckVerifier",
    "transactionHashVerifier"
  ];

  const deployed = {};

  for (const name of contractNames) {
    console.log(`📦 Deploying ${name}...`);
    const Verifier = await hre.ethers.getContractFactory(name);
    const contract = await Verifier.deploy();
    await contract.waitForDeployment();
    const address = await contract.getAddress();
    deployed[name] = address;
    console.log(`✅ ${name} deployed at: ${address}\n`);
  }

  // 将部署信息保存为 JSON 文件供前端使用
  const outputPath = "frontend/public/deployments.json";
  fs.writeFileSync(outputPath, JSON.stringify(deployed, null, 2));

  console.log("💾 All verifier addresses saved to:", outputPath);
  console.log("\n🎉 Deployment finished successfully!");
}

// 运行
main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exit(1);
});
