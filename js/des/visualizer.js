/**
 * des/visualizer.js
 * Generates the ordered array of step objects used by the StepPlayer.
 * Each step describes one DES operation with full before/after bit data,
 * highlight maps, and human-readable explanations.
 * Exported to window.DESApp.visualizer
 */
'use strict';

window.DESApp = window.DESApp || {};

(function () {
  const T = window.DESApp.tables;
  const C = window.DESApp.core;

  // ---------------------------------------------------------------------------
  // Highlight helpers
  // ---------------------------------------------------------------------------

  /** Compare before/after bits: 'unchanged' | 'changed' */
  function diffHighlight(before, after) {
    return before.map((b, i) => (b === after[i] ? 'unchanged' : 'changed'));
  }

  /** Fill array of given length with a single color */
  function fillColor(len, color) {
    return new Array(len).fill(color);
  }

  // ---------------------------------------------------------------------------
  // Main entry point
  // ---------------------------------------------------------------------------

  /**
   * Generate all DES visualization steps for a given plaintext and key.
   *
   * @param {string} plaintext  Up to 8 characters
   * @param {string} keyStr     Exactly 8 characters
   * @returns {Object[]}  Ordered array of step descriptors
   */
  function generateSteps(plaintext, keyStr) {
    const pt  = plaintext.padEnd(8, '\0').substring(0, 8);
    const ks  = keyStr.padEnd(8, '\0').substring(0, 8);

    const plainBits = C.stringToBits(pt);
    const keyBits   = C.stringToBits(ks);

    const steps = [];

    // =========================================================================
    // PHASE 0 — Plain Text
    // =========================================================================

    // ASCII table for each character
    const asciiData = Array.from(pt).map((ch, idx) => ({
      index:   idx,
      char:    ch === '\0' ? '\\0' : ch,
      ascii:   ch.charCodeAt(0),
      hex:     ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'),
      binary:  ch.charCodeAt(0).toString(2).padStart(8, '0')
    }));

    steps.push({
      id:          'plaintext-ascii',
      title:       'Step 1 — Plain Text to ASCII',
      phase:       'input',
      round:       null,
      inputBits:   null,
      outputBits:  plainBits,
      highlightMap: fillColor(64, 'active'),
      asciiData,
      explanation: {
        why:     'DES operates on binary data. Every character is first converted to its ASCII code (0–127), then expressed as an 8-bit binary number.',
        formula: 'char → ASCII code → 8-bit binary',
        example: `"${pt[0]}" → ASCII ${pt.charCodeAt(0)} → ${pt.charCodeAt(0).toString(2).padStart(8, '0')}`,
        input:   `"${pt}"`,
        output:  C.bitsToHex(plainBits)
      }
    });

    steps.push({
      id:          'plaintext-64bit',
      title:       'Step 1b — 64-Bit Plain Block',
      phase:       'input',
      round:       null,
      inputBits:   null,
      outputBits:  plainBits,
      highlightMap: [
        ...fillColor(8, 'active'),
        ...fillColor(56, 'unchanged')
      ],
      asciiData,
      explanation: {
        why:     'The 8 ASCII bytes are concatenated into a single 64-bit block — the fundamental unit DES processes. DES is a block cipher: it always works on exactly 64 bits at a time.',
        formula: '8 chars × 8 bits/char = 64 bits',
        example: `First byte: "${pt[0]}" (ASCII ${pt.charCodeAt(0)})`,
        input:   `"${pt}"`,
        output:  C.bitsToHex(plainBits)
      }
    });

    // =========================================================================
    // PHASE 1 — Initial Permutation
    // =========================================================================

    const afterIP = C.permute(plainBits, T.IP);

    steps.push({
      id:           'initial-permutation',
      title:        'Step 2 — Initial Permutation (IP)',
      phase:        'ip',
      round:        null,
      inputBits:    plainBits,
      outputBits:   afterIP,
      highlightMap: diffHighlight(plainBits, afterIP),
      permTable:    T.IP,
      explanation:  {
        why:     'The Initial Permutation (IP) reorders the 64 bits according to a fixed table. It has no cryptographic value — it exists for legacy hardware-efficiency reasons in the original DES chipset.',
        formula: 'IP_out[i] = input_bit[IP_table[i]]',
        example: `Output bit 1 = Input bit ${T.IP[0]}, Output bit 2 = Input bit ${T.IP[1]}`,
        input:   C.bitsToHex(plainBits),
        output:  C.bitsToHex(afterIP)
      }
    });

    // =========================================================================
    // PHASE 2 — Split L0 / R0
    // =========================================================================

    let L = afterIP.slice(0, 32);
    let R = afterIP.slice(32, 64);

    steps.push({
      id:           'split-lr',
      title:        'Step 3 — Split into L₀ and R₀',
      phase:        'split',
      round:        null,
      inputBits:    afterIP,
      outputBits:   [...L, ...R],
      highlightMap: [...fillColor(32, 'op'), ...fillColor(32, 'active')],
      splitData:    { L: [...L], R: [...R] },
      explanation:  {
        why:     'The 64-bit permuted block is divided into two 32-bit halves: Left (L₀) and Right (R₀). This is the foundation of the Feistel network — each half is processed separately and then combined.',
        formula: 'L₀ = bits[1..32],  R₀ = bits[33..64]',
        example: `L₀ = ${C.bitsToHex(L)}   R₀ = ${C.bitsToHex(R)}`,
        input:   C.bitsToHex(afterIP),
        output:  `L₀: ${C.bitsToHex(L)}  |  R₀: ${C.bitsToHex(R)}`
      }
    });

    // =========================================================================
    // PHASE 3 — Key Schedule
    // =========================================================================

    const key56 = C.permute(keyBits, T.PC1);

    steps.push({
      id:           'key-pc1',
      title:        'Step 4a — Key Permutation PC-1 (64→56 bits)',
      phase:        'keyschedule',
      round:        null,
      inputBits:    keyBits,
      outputBits:   key56,
      highlightMap: fillColor(56, 'op'),
      permTable:    T.PC1,
      explanation:  {
        why:     'PC-1 strips the 8 parity bits (bits 8,16,24,32,40,48,56,64) from the 64-bit key. These parity bits were used in the 1970s for hardware error-checking, leaving 56 effective key bits.',
        formula: 'key56 = PC1(key64)',
        example: `Parity bit positions discarded: 8, 16, 24, 32, 40, 48, 56, 64`,
        input:   C.bitsToHex(keyBits),
        output:  key56.slice(0, 28).join('') + '...'
      }
    });

    // Generate all 16 subkeys with intermediate C/D halves
    let Chalf = key56.slice(0, 28);
    let Dhalf = key56.slice(28, 56);
    const allSubkeys = [];
    const keyScheduleDetails = [];

    for (let r = 0; r < 16; r++) {
      const prevC = [...Chalf];
      const prevD = [...Dhalf];
      Chalf = C.leftRotate(Chalf, T.SHIFTS[r]);
      Dhalf = C.leftRotate(Dhalf, T.SHIFTS[r]);
      const CD = [...Chalf, ...Dhalf];
      const sk = C.permute(CD, T.PC2);
      allSubkeys.push(sk);
      keyScheduleDetails.push({
        round:  r + 1,
        shift:  T.SHIFTS[r],
        prevC,  prevD,
        C:      [...Chalf],
        D:      [...Dhalf],
        CD:     [...CD],
        subkey: [...sk]
      });
    }

    steps.push({
      id:           'key-schedule-all',
      title:        'Step 4b — Generate 16 Round Keys',
      phase:        'keyschedule',
      round:        null,
      inputBits:    key56,
      outputBits:   allSubkeys[0],
      highlightMap: fillColor(48, 'op'),
      subkeyData:   {
        key56:      [...key56],
        subkeys:    allSubkeys,
        details:    keyScheduleDetails,
        shifts:     T.SHIFTS
      },
      explanation:  {
        why:     'DES requires a unique 48-bit subkey for each of its 16 rounds. The 56-bit key is split into 28-bit halves C and D. Each round, both halves are left-rotated by 1 or 2 positions, then 48 bits are selected via PC-2.',
        formula: 'K_n = PC2( LS_n(C_{n-1}) ‖ LS_n(D_{n-1}) )',
        example: `Round 1: shift ${T.SHIFTS[0]}, K₁ = ${C.bitsToHex(allSubkeys[0])}`,
        input:   key56.join('').substring(0, 14) + '...',
        output:  `K₁=${C.bitsToHex(allSubkeys[0])}  K₂=${C.bitsToHex(allSubkeys[1])}  ...`
      }
    });

    // =========================================================================
    // PHASES 4-9 — 16 Feistel Rounds (6 sub-steps each)
    // =========================================================================

    let curL = [...L];
    let curR = [...R];

    for (let r = 0; r < 16; r++) {
      const roundNum = r + 1;
      const subkey   = allSubkeys[r];

      // ---- 4a: Expansion (32 → 48) ----------------------------------------
      const expanded = C.permute(curR, T.E);

      // Mark the "extra" bits introduced by expansion (duplicated positions)
      const expandHL = (() => {
        // positions in T.E that refer to bits also used elsewhere = duplicated
        const posCount = {};
        T.E.forEach(p => { posCount[p] = (posCount[p] || 0) + 1; });
        return T.E.map(p => posCount[p] > 1 ? 'active' : 'unchanged');
      })();

      steps.push({
        id:           `r${roundNum}-expansion`,
        title:        `Round ${roundNum} — Expansion E (32→48 bits)`,
        phase:        'expansion',
        round:        roundNum,
        inputBits:    [...curR],
        outputBits:   expanded,
        highlightMap: expandHL,
        permTable:    T.E,
        explanation:  {
          why:     'The 32-bit right half is expanded to 48 bits so it can be XOR\'ed with the 48-bit round key. 16 of the 48 bits are duplicates — this controlled redundancy increases diffusion.',
          formula: 'E(R) = permute(R, E_table)  [some bits appear twice]',
          example: `Bit 32 and Bit 1 of R are both used at output positions 1 and 2`,
          input:   C.bitsToHex(curR),
          output:  expanded.join('').substring(0, 12) + '...'
        }
      });

      // ---- 4b: XOR with Round Key -----------------------------------------
      const xored = C.xorBits(expanded, subkey);

      steps.push({
        id:           `r${roundNum}-xor-key`,
        title:        `Round ${roundNum} — XOR with Subkey K${roundNum}`,
        phase:        'xor',
        round:        roundNum,
        inputBits:    expanded,
        outputBits:   xored,
        highlightMap: diffHighlight(expanded, xored),
        xorData:      { a: expanded, b: subkey, result: xored },
        explanation:  {
          why:     'XOR with the round key is the only step where the secret key directly influences the data. XOR is perfectly reversible (A ⊕ K ⊕ K = A), making decryption possible using the same Feistel structure.',
          formula: 'B = E(R) ⊕ K_n',
          example: `Bit example: ${expanded[0]} ⊕ ${subkey[0]} = ${xored[0]}`,
          input:   `E(R): ...${C.bitsToHex(expanded).slice(-6)}  K${roundNum}: ${C.bitsToHex(subkey)}`,
          output:  C.bitsToHex(xored)
        }
      });

      // ---- 4c: S-Box Substitution (48 → 32) --------------------------------
      const sboxInputDetails  = [];
      const sboxOutputDetails = [];
      let   sboxResult        = [];

      for (let box = 0; box < 8; box++) {
        const six    = xored.slice(box * 6, box * 6 + 6);
        const rowIdx = (six[0] << 1) | six[5];
        const colIdx = (six[1] << 3) | (six[2] << 2) | (six[3] << 1) | six[4];
        const outVal = T.S_BOXES[box][rowIdx][colIdx];
        const outBits = [(outVal >> 3) & 1, (outVal >> 2) & 1, (outVal >> 1) & 1, outVal & 1];
        sboxInputDetails.push({ box, six, rowIdx, colIdx });
        sboxOutputDetails.push({ outVal, outBits });
        sboxResult = sboxResult.concat(outBits);
      }

      steps.push({
        id:           `r${roundNum}-sbox`,
        title:        `Round ${roundNum} — S-Box Substitution (48→32 bits)`,
        phase:        'sbox',
        round:        roundNum,
        inputBits:    xored,
        outputBits:   sboxResult,
        highlightMap: fillColor(32, 'op'),
        sboxData:     {
          inputs:  sboxInputDetails,
          outputs: sboxOutputDetails,
          tables:  T.S_BOXES
        },
        explanation:  {
          why:     'S-Boxes are the heart of DES security. They provide NON-linearity — outputs cannot be predicted by any linear function of the inputs. Without S-boxes DES would be trivially breakable by linear algebra.',
          formula: 'S_i(b) → row = bits[1,6]  col = bits[2,3,4,5]  → table[row][col]',
          example: `S1: input=${sboxInputDetails[0].six.join('')}, row=${sboxInputDetails[0].rowIdx}, col=${sboxInputDetails[0].colIdx} → ${sboxOutputDetails[0].outVal} (${sboxOutputDetails[0].outBits.join('')})`,
          input:   xored.join('').substring(0, 12) + '...',
          output:  sboxResult.join('').substring(0, 8) + '...'
        }
      });

      // ---- 4d: P-Permutation -----------------------------------------------
      const pResult = C.permute(sboxResult, T.P);

      steps.push({
        id:           `r${roundNum}-pperm`,
        title:        `Round ${roundNum} — P-Permutation`,
        phase:        'pperm',
        round:        roundNum,
        inputBits:    sboxResult,
        outputBits:   pResult,
        highlightMap: diffHighlight(sboxResult, pResult),
        permTable:    T.P,
        explanation:  {
          why:     'The P-permutation shuffles the 32-bit S-box output across all positions. Together with the S-boxes it ensures the "avalanche effect": flipping 1 input bit eventually changes ~50% of all output bits.',
          formula: 'P(B) = permute(B, P_table)',
          example: `Output bit 1 comes from S-box output bit ${T.P[0]}`,
          input:   sboxResult.join('').substring(0, 8) + '...',
          output:  pResult.join('').substring(0, 8) + '...'
        }
      });

      // ---- 4e: XOR with Left half ------------------------------------------
      const newR = C.xorBits(curL, pResult);

      steps.push({
        id:           `r${roundNum}-xor-left`,
        title:        `Round ${roundNum} — XOR F-result with L${r}`,
        phase:        'xor-left',
        round:        roundNum,
        inputBits:    [...curL, ...pResult],
        outputBits:   [...curR, ...newR],
        highlightMap: [...diffHighlight(curL, newR), ...fillColor(32, 'active')],
        xorData:      { a: curL, b: pResult, result: newR },
        explanation:  {
          why:     'The Feistel function result is XOR\'ed with the current Left half to produce the new Right half. This is the Feistel "mix" step — it makes decryption possible with the exact same circuit running in reverse.',
          formula: `R_${roundNum} = L_${r} ⊕ F(R_${r}, K_${roundNum})`,
          example: `${C.bitsToHex(curL)} ⊕ ${C.bitsToHex(pResult)} = ${C.bitsToHex(newR)}`,
          input:   `L${r}: ${C.bitsToHex(curL)},  F(): ${C.bitsToHex(pResult)}`,
          output:  `new R${roundNum}: ${C.bitsToHex(newR)}`
        }
      });

      // ---- 4f: Swap L and R ------------------------------------------------
      const prevL = [...curL];
      const prevR = [...curR];
      curL = [...curR];
      curR = [...newR];

      steps.push({
        id:           `r${roundNum}-swap`,
        title:        `Round ${roundNum} — Swap: L${roundNum} ← R${r}, R${roundNum} = new R`,
        phase:        'swap',
        round:        roundNum,
        inputBits:    [...prevL, ...prevR],
        outputBits:   [...curL, ...curR],
        highlightMap: [...fillColor(32, 'op'), ...fillColor(32, 'active')],
        swapData:     { oldL: prevL, oldR: prevR, newL: [...curL], newR: [...curR] },
        explanation:  {
          why:     'After each round the Left half simply becomes the old Right half, and the new Right is the F-function XOR result. This swap is what allows DES decryption to use the same hardware as encryption — just reverse the key order.',
          formula: `L_${roundNum} = R_${r},   R_${roundNum} = L_${r} ⊕ F(R_${r}, K_${roundNum})`,
          example: `L${roundNum} = ${C.bitsToHex(curL)}   R${roundNum} = ${C.bitsToHex(curR)}`,
          input:   `L${r}: ${C.bitsToHex(prevL)},  R${r}: ${C.bitsToHex(prevR)}`,
          output:  `L${roundNum}: ${C.bitsToHex(curL)},  R${roundNum}: ${C.bitsToHex(curR)}`
        }
      });
    } // end for each round

    // =========================================================================
    // PHASE 5 — Final Permutation → Ciphertext
    // =========================================================================

    // After 16 rounds, concatenate R16 ‖ L16 (deliberate swap before FP)
    const preOutput  = [...curR, ...curL];
    const cipherBits = C.permute(preOutput, T.FP);

    steps.push({
      id:           'final-permutation',
      title:        'Final — Final Permutation (FP = IP⁻¹)',
      phase:        'fp',
      round:        null,
      inputBits:    preOutput,
      outputBits:   cipherBits,
      highlightMap: diffHighlight(preOutput, cipherBits),
      permTable:    T.FP,
      explanation:  {
        why:     'The Final Permutation (FP) is the exact inverse of the Initial Permutation. It "undoes" the IP rearrangement. Like IP, it has no cryptographic purpose — it\'s there for hardware symmetry.',
        formula: 'Ciphertext = FP(R₁₆ ‖ L₁₆)',
        example: `FP undoes IP: FP(IP(m)) = m  (they are inverse permutations)`,
        input:   C.bitsToHex(preOutput),
        output:  C.bitsToHex(cipherBits)
      }
    });

    steps.push({
      id:           'cipher-output',
      title:        '🎉 Encryption Complete!',
      phase:        'output',
      round:        null,
      inputBits:    preOutput,
      outputBits:   cipherBits,
      highlightMap: fillColor(64, 'active'),
      explanation:  {
        why:     'DES encryption is complete. The 64-bit ciphertext is the result of: IP → 16 Feistel rounds (each with E, XOR, 8 S-boxes, P) → FP. To decrypt, run the same process using round keys in reverse order.',
        formula: 'C = DES_K(P)',
        example: `"${pt}" + key "${ks}" → ${C.bitsToHex(cipherBits)}`,
        input:   `Plaintext: "${pt}"  Key: "${ks}"`,
        output:  `Ciphertext (hex): ${C.bitsToHex(cipherBits)}`
      }
    });

    return steps;
  }

  // Export
  window.DESApp.visualizer = { generateSteps };

})();
