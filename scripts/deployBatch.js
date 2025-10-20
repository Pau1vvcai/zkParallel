// scripts/deployBatch.js
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying BatchVerifier to local network...\n");

  const BatchVerifier = await hre.ethers.getContractFactory("BatchVerifier");
  const batch = await BatchVerifier.deploy();
  await batch.waitForDeployment();

  const batchAddress = await batch.getAddress();
  console.log(`✅ BatchVerifier deployed at: ${batchAddress}\n`);

  // deployments.json
  const frontendPath = path.join(__dirname, "../frontend/lib/config/deployments.json");
  const deployments = JSON.parse(fs.readFileSync(frontendPath, "utf-8"));

  deployments.BatchVerifier = batchAddress;

  fs.writeFileSync(frontendPath, JSON.stringify(deployments, null, 2));
  console.log("💾 Updated deployments.json with BatchVerifier address!");
  console.log("\n🎉 Deployment complete!");
}

main().catch((err) => {
  console.error("❌ Deployment failed:", err);
  process.exit(1);
});
