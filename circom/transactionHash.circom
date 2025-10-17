pragma circom 2.0.0;

include "poseidon.circom";

template TransactionHash() {
    signal input in_sender;
    signal input in_receiver;
    signal input in_amount;
    signal input in_nonce;
    signal output out_txHash;

    component h = Poseidon(4);
    h.inputs[0] <== in_sender;
    h.inputs[1] <== in_receiver;
    h.inputs[2] <== in_amount;
    h.inputs[3] <== in_nonce;

    out_txHash <== h.out;
}

component main = TransactionHash();
