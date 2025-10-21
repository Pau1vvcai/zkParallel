// scripts/deployAll.js
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");
const chalk = require("chalk");

async function main() {
  console.log(chalk.cyan.bold("\n🚀 Starting zkParallel Verifier Batch Deployment...\n"));

  try {
    const network = await hre.ethers.provider.getNetwork();
    console.log(chalk.gray(`📡 Connected to network: ${network.name} (chainId: ${network.chainId})\n`));
  } catch (err) {
    console.error(chalk.red("❌ No local Hardhat network detected."));
    console.log(chalk.yellow("💡 Please run:  npx hardhat node\n"));
    process.exit(1);
  }

  const CONTRACTS = [
    "executionVerifier",
    "transferVerifyVerifier",
    "merkleUpdateVerifier",
    "rootVerifierVerifier",
    "signatureCheckVerifier",
    "transactionHashVerifier",
  ];

  const deployed = [];
  const results = {};

  for (const name of CONTRACTS) {
    console.log(chalk.yellow(`📦 Deploying ${name}...`));

    const Factory = await hre.ethers.getContractFactory(name);
    const contract = await Factory.deploy();
    await contract.waitForDeployment();

    const addr = await contract.getAddress();
    const txHash = contract.deploymentTransaction().hash;
    const tx = await hre.ethers.provider.getTransactionReceipt(txHash);
    const gasUsed = tx.gasUsed?.toString() || "N/A";

    results[name] = addr;
    deployed.push({
      name,
      address: addr,
      gasUsed,
    });

    console.log(chalk.green(`✅ ${name} deployed at: ${addr}`));
    console.log(chalk.gray(`   ↳ Gas used: ${gasUsed}`));
    console.log("");
  }

  const outputDir = path.join(__dirname, "..", "frontend", "lib", "config");
  const outputPath = path.join(outputDir, "deployments.json");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));

  if (fs.existsSync(outputPath)) {
    console.log(chalk.greenBright(`💾 Deployment info saved to: ${outputPath}\n`));
  } else {
    console.error(chalk.red("❌ Failed to write deployments.json\n"));
  }

  console.log(chalk.cyan.bold("📋 Deployment Summary:\n"));
  console.table(deployed);
  console.log(chalk.cyan("\n🎉 All verifiers deployed successfully!\n"));
}

main().catch((err) => {
  console.error(chalk.red("❌ Deployment failed:"), err);
  process.exitCode = 1;
});
