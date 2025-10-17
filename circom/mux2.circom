pragma circom 2.0.0;

template Mux2() {
    signal input sel;
    signal input in0;
    signal input in1;
    signal output out;

    // sel must be boolean
    sel * (1 - sel) === 0;

    // define intermediate
    signal t0;
    signal t1;

    // compute products separately (each is quadratic)
    t0 <== in0 * (1 - sel);
    t1 <== in1 * sel;

    // sum them up (linear)
    out <== t0 + t1;
}
