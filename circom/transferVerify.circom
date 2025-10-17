pragma circom 2.0.0;

include "comparators.circom";      // 用于 LessThan
include "transferCheck.circom";    // 余额守恒验证模块

template TransferVerify() {
    // --- Inputs ---
    signal input in_senderBefore;
    signal input in_receiverBefore;
    signal input in_amount;

    // --- Outputs ---
    signal output out_valid; // 1 表示合法转账

    // --- 1️⃣ 检查余额充足 ---
    component enough = LessThan(32);
    // LessThan(a, b): 输出 1 当 a < b
    enough.in[0] <== in_amount;
    enough.in[1] <== in_senderBefore;

    // --- 2️⃣ 检查总额守恒 ---
    component check = TransferCheck();
    check.in_senderBefore <== in_senderBefore;
    check.in_receiverBefore <== in_receiverBefore;
    check.in_amount <== in_amount;

    // --- 3️⃣ 综合判断 ---
    // 若余额充足 (enough.out=1) 且 守恒成立 (check.out_balanceConserved=1)，则有效
    signal validSignal;
    validSignal <== enough.out * check.out_balanceConserved;

    // 布尔化处理（防止非法输入导致浮动）
    out_valid <== 1 - (1 - validSignal) * (1 - validSignal);
}

component main = TransferVerify();
