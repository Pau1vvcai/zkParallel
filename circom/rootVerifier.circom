pragma circom 2.0.0;

include "poseidon.circom";

template RootVerifier() {
    signal input in_oldRoot;
    signal input in_newRoot;
    signal input in_proof;
    signal output out_verified;

    component h = Poseidon(2);
    h.inputs[0] <== in_oldRoot;
    h.inputs[1] <== in_proof;

    // 检查新根与哈希结果相等
    signal diff;
    diff <== in_newRoot - h.out;

    // diff = 0 表示通过
    out_verified <== 1 - (diff * diff);
}

component main = RootVerifier();
