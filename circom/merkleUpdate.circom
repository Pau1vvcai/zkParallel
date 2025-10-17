pragma circom 2.0.0;

include "mux2.circom";


include "poseidon.circom";


template MerkleUpdate(depth) {

    signal input in_oldLeaf;
    signal input in_newLeaf;
    signal input in_pathElements[depth];
    signal input in_pathIndices[depth]; // 要求为 0/1


    signal output out_oldRoot;
    signal output out_newRoot;

    component hashOld[depth];
    component hashNew[depth];
    component muxLeftOld[depth];
    component muxRightOld[depth];
    component muxLeftNew[depth];
    component muxRightNew[depth];

    signal curOld[depth + 1];
    signal curNew[depth + 1];

    
    curOld[0] <== in_oldLeaf;
    curNew[0] <== in_newLeaf;

    
    for (var i = 0; i < depth; i++) {
        in_pathIndices[i] * (in_pathIndices[i] - 1) === 0;
    }

    for (var i = 0; i < depth; i++) {
        // old leaf 上行
        muxLeftOld[i] = Mux2();
        muxRightOld[i] = Mux2();

        
        muxLeftOld[i].sel <== in_pathIndices[i];
        muxLeftOld[i].in0 <== curOld[i];
        muxLeftOld[i].in1 <== in_pathElements[i];

        muxRightOld[i].sel <== in_pathIndices[i];
        muxRightOld[i].in0 <== in_pathElements[i];
        muxRightOld[i].in1 <== curOld[i];

        hashOld[i] = Poseidon(2);
        hashOld[i].inputs[0] <== muxLeftOld[i].out;
        hashOld[i].inputs[1] <== muxRightOld[i].out;
        curOld[i + 1] <== hashOld[i].out;


        muxLeftNew[i] = Mux2();
        muxRightNew[i] = Mux2();

        muxLeftNew[i].sel <== in_pathIndices[i];
        muxLeftNew[i].in0 <== curNew[i];
        muxLeftNew[i].in1 <== in_pathElements[i];

        muxRightNew[i].sel <== in_pathIndices[i];
        muxRightNew[i].in0 <== in_pathElements[i];
        muxRightNew[i].in1 <== curNew[i];

        hashNew[i] = Poseidon(2);
        hashNew[i].inputs[0] <== muxLeftNew[i].out;
        hashNew[i].inputs[1] <== muxRightNew[i].out;
        curNew[i + 1] <== hashNew[i].out;
    }


    out_oldRoot <== curOld[depth];
    out_newRoot <== curNew[depth];
}

component main = MerkleUpdate(2);