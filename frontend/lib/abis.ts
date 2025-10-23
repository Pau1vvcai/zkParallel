import executionVerifier from "../../artifacts/contracts/executionVerifier.sol/executionVerifier.json";
import transferVerifyVerifier from "../../artifacts/contracts/transferVerifyVerifier.sol/transferVerifyVerifier.json";
import merkleUpdateVerifier from "../../artifacts/contracts/merkleUpdateVerifier.sol/merkleUpdateVerifier.json";
import RootVerifier from "../../artifacts/contracts/RootVerifier.sol/RootVerifier.json";
import signatureCheckVerifier from "../../artifacts/contracts/signatureCheckVerifier.sol/signatureCheckVerifier.json";
import transactionHashVerifier from "../../artifacts/contracts/transactionHashVerifier.sol/transactionHashVerifier.json";
import BatchVerifier from "../../artifacts/contracts/BatchVerifier.sol/BatchVerifier.json";

export const ABIS = {
  execution: executionVerifier,
  transferVerify: transferVerifyVerifier,
  merkleUpdate: merkleUpdateVerifier,
  rootVerifier: RootVerifier,
  signatureCheck: signatureCheckVerifier,
  transactionHash: transactionHashVerifier,
  batchVerifier: BatchVerifier, 
};
