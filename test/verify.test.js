const { expect } = require("chai");
const { groth16 } = require("snarkjs");
const fs = require("fs");

describe("ExecutionVerifier", function () {
  it("should verify zk proof locally on Hardhat network", async function () {
    const Verifier = await ethers.getContractFactory("ExecutionVerifier");
    const verifier = await Verifier.deploy();

    // 读取输入
    const input = JSON.parse(fs.readFileSync("frontend/public/inputs/execution.json"));

    // 生成证明
    const { proof, publicSignals } = await groth16.fullProve(
      input,
      "frontend/public/zk/execution/execution.wasm",
      "frontend/public/zk/execution/execution_0001.zkey"
    );

    // 生成 Solidity 调用数据
    const calldata = await groth16.exportSolidityCallData(proof, publicSignals);
    const argv = JSON.parse("[" + calldata + "]");

    // 调用合约验证
    const verified = await verifier.verifyProof(...argv);
    expect(verified).to.equal(true);
  });
});
