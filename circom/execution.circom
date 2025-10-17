pragma circom 2.0.0;
/*This circuit template checks pay action*/  

include "comparators.circom";

template execution () {  
   // Declaration of signals  
   signal input in_balance_before;  
   signal input in_amount;  
   signal output out_balance_after;  

   signal computed;

   // Constraints  
   computed <== in_balance_before - in_amount;
   out_balance_after <== computed;

   // Ensure balance_before >= amount  
   component ge = GreaterEqThan(32);
   ge.in[0] <== in_balance_before;
   ge.in[1] <== in_amount;
   ge.out === 1;
}

component main = execution();
