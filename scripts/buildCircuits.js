/*
 * zkParallel Build Script v3.2
 */

import fs from "fs";
import path from "path";
import { execSync as run } from "child_process";

// ==================== 配置区 ====================

const CIRCUITS = [
  "execution",
  "transferVerify",
  "merkleUpdate",
  "signatureCheck",
  "rootVerifier",
  "transactionHash",
];

const ROOT = path.resolve(".");
const CIRCOM_DIR = path.join(ROOT, "circom");
const FRONTEND_ZK_DIR = path.join(ROOT, "frontend", "public", "zk");
const CONTRACTS_DIR = path.join(ROOT, "contracts");
const ABI_DEST = path.join(ROOT, "frontend", "lib", "abis");
const PTAU_PATH = path.join(ROOT, "scripts", "pot12_final.ptau");

// ==================== 辅助函数 ====================

function log(msg) {
  console.log(msg);
}
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ==================== 主逻辑 ====================

log(`\n🚀 Starting zkParallel Circuit Build (v3.2)\n`);

// 🔧 自动清理旧缓存（防止路径冲突）
try {
  run(`npx hardhat clean`, { stdio: "inherit" });
  log("🧹 Cleaned old Hardhat artifacts and cache.\n");
} catch (err) {
  log("⚠️ Hardhat clean skipped (not installed globally).");
}

ensureDir(path.dirname(PTAU_PATH));
ensureDir(CONTRACTS_DIR);
ensureDir(ABI_DEST);

// 1️⃣ 检查或生成 ptau
if (!fs.existsSync(PTAU_PATH)) {
  log("⚙️ Generating new pot12_final.ptau ...");
  run(`snarkjs powersoftau new bn128 12 ${PTAU_PATH.replace("final", "0000")} -v`, { stdio: "inherit" });
  run(`snarkjs powersoftau contribute ${PTAU_PATH.replace("final", "0000")} ${PTAU_PATH.replace("final", "0001")} --name="zkParallel Contribution" -v`, { stdio: "inherit" });
  run(`snarkjs powersoftau prepare phase2 ${PTAU_PATH.replace("final", "0001")} ${PTAU_PATH} -v`, { stdio: "inherit" });
  log("✅ pot12_final.ptau ready!\n");
} else {
  log("✅ Using existing pot12_final.ptau\n");
}

// 2️⃣ 构建每个电路
for (const name of CIRCUITS) {
  const circuitFile = path.join(CIRCOM_DIR, `${name}.circom`);
  const outDir = path.join(FRONTEND_ZK_DIR, name);
  ensureDir(outDir);

  const capName = capitalize(name);
  const hasVerifierSuffix = capName.toLowerCase().endsWith("verifier");
  const contractName = hasVerifierSuffix ? capName : `${capName}Verifier`;
  const solPath = path.join(CONTRACTS_DIR, `${contractName}.sol`);

  log(`🧩 Building circuit: ${contractName}`);

  try {
    // === 编译 circom ===
    run(`circom "${circuitFile}" --r1cs --wasm --sym -o "${outDir}"`, { stdio: "inherit" });
    const wasmSrc = path.join(outDir, `${name}_js`, `${name}.wasm`);
    const wasmDest = path.join(outDir, `${name}.wasm`);
    if (fs.existsSync(wasmSrc)) {
      fs.copyFileSync(wasmSrc, wasmDest);
      console.log(`📦 Copied ${name}.wasm to ${outDir}`);
    }

    // === 生成 zkey ===
    run(`snarkjs groth16 setup "${outDir}/${name}.r1cs" "${PTAU_PATH}" "${outDir}/${name}_0000.zkey"`, { stdio: "inherit" });
    run(`snarkjs zkey contribute "${outDir}/${name}_0000.zkey" "${outDir}/${name}_0001.zkey" --name="1st Contributor" -v`, { stdio: "inherit" });
    run(`snarkjs zkey export verificationkey "${outDir}/${name}_0001.zkey" "${outDir}/verification_key.json"`, { stdio: "inherit" });

    // === 导出 solidity verifier ===
    run(`snarkjs zkey export solidityverifier "${outDir}/${name}_0001.zkey" "${solPath}"`, { stdio: "inherit" });

    // === 修正合约类名 ===
    let solCode = fs.readFileSync(solPath, "utf8");
    solCode = solCode.replace(/contract Groth16Verifier/g, `contract ${contractName}`);
    fs.writeFileSync(solPath, solCode);
    log(`🔧 Renamed contract class to ${contractName}`);

    log(`✅ ${contractName} compiled successfully!\n`);
  } catch (err) {
    console.error(`❌ Failed to build ${contractName}:`, err.message);
  }
}

// 3️⃣ 编译 Solidity 合约并同步 ABI
log("\n📦 Compiling Solidity contracts...");
try {
  run(`npx hardhat compile`, { stdio: "inherit" });

  const ARTIFACTS_DIR = path.join(ROOT, "artifacts", "contracts");
  ensureDir(ABI_DEST);

  fs.readdirSync(ARTIFACTS_DIR).forEach(folder => {
    const dir = path.join(ARTIFACTS_DIR, folder);
    if (!fs.statSync(dir).isDirectory()) return;

    fs.readdirSync(dir).forEach(file => {
      if (file.endsWith(".json") && !file.endsWith(".dbg.json")) {
        const srcFile = path.join(dir, file);
        const destFile = path.join(ABI_DEST, file);
        fs.copyFileSync(srcFile, destFile);
        log(`✅ Synced ABI: ${file}`);
      }
    });
  });

  log("\n🎉 All circuits compiled and ABIs synced successfully!");
} catch (err) {
  console.error("❌ Solidity compile or ABI sync failed:", err.message);
}

log("\n✅ Build complete. Ready for deployment!\n");
