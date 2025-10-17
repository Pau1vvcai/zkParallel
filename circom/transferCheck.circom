pragma circom 2.0.0;

template TransferCheck() {
    signal input in_senderBefore;
    signal input in_receiverBefore;
    signal input in_amount;

    signal output out_senderAfter;
    signal output out_receiverAfter;
    signal output out_balanceConserved;

    out_senderAfter <== in_senderBefore - in_amount;
    out_receiverAfter <== in_receiverBefore + in_amount;

    signal sumBefore;
    signal sumAfter;
    sumBefore <== in_senderBefore + in_receiverBefore;
    sumAfter <== out_senderAfter + out_receiverAfter;

    signal diff;
    diff <== sumBefore - sumAfter;
    out_balanceConserved <== 1 - (diff * diff);
}
