// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVerifier {
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[] memory input
    ) external view returns (bool);
}

contract BatchVerifier {
    function batchVerifyCalldata(address[] memory verifiers, bytes[] memory data)
        external
        view
        returns (bool[] memory results)
    {
        results = new bool[](verifiers.length);
        for (uint256 i = 0; i < verifiers.length; i++) {
            (bool success, bytes memory ret) = verifiers[i].staticcall(data[i]);
            if (success && ret.length > 0) {
                results[i] = abi.decode(ret, (bool));
            } else {
                results[i] = false;
            }
        }
    }
}
