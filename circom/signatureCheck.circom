pragma circom 2.0.0;

template SignatureCheck() {
    signal input in_msgHash;
    signal input in_pubKey;
    signal input in_sig;
    signal output out_validSig;

    // 模拟签名规则：sig == msgHash + pubKey
    signal diff;
    diff <== in_sig - (in_msgHash + in_pubKey);

    // diff = 0 → out_validSig = 1
    out_validSig <== 1 - (diff * diff);
}

component main = SignatureCheck();
