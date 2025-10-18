pragma circom 2.0.0;

include "comparators.circom";      
include "transferCheck.circom";    

template TransferVerify() {
    // --- Inputs ---
    signal input in_senderBefore;
    signal input in_receiverBefore;
    signal input in_amount;

    // --- Outputs ---
    signal output out_valid; 

    
    component enough = LessThan(32);
    // LessThan(a, b): 输出 1 当 a < b
    enough.in[0] <== in_amount;
    enough.in[1] <== in_senderBefore;

    
    component check = TransferCheck();
    check.in_senderBefore <== in_senderBefore;
    check.in_receiverBefore <== in_receiverBefore;
    check.in_amount <== in_amount;

    
    
    signal validSignal;
    validSignal <== enough.out * check.out_balanceConserved;

    
    out_valid <== 1 - (1 - validSignal) * (1 - validSignal);
}

component main = TransferVerify();
