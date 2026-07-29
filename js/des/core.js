/**
 * des/core.js
 * Pure DES encryption/decryption engine (no DOM).
 * All operations work on arrays of bits (0s and 1s).
 * Exported to window.DESApp.core
 */
'use strict';

window.DESApp = window.DESApp || {};

(function () {
  const T = window.DESApp.tables;

  // ---------------------------------------------------------------------------
  // Bit conversion utilities
  // ---------------------------------------------------------------------------

  /**
   * Convert a string (up to 8 chars) to a 64-bit array.
   * Shorter strings are zero-padded; longer strings are truncated.
   * @param {string} str
   * @returns {number[]} 64-element bit array (MSB first)
   */
  function stringToBits(str) {
    const bits = [];
    for (let i = 0; i < 8; i++) {
      const code = i < str.length ? str.charCodeAt(i) : 0;
      for (let j = 7; j >= 0; j--) {
        bits.push((code >>> j) & 1);
      }
    }
    return bits; // length = 64
  }

  /**
   * Convert a 64-bit array back to a string.
   * @param {number[]} bits
   * @returns {string} 8-character string
   */
  function bitsToString(bits) {
    let str = '';
    for (let i = 0; i < 8; i++) {
      let code = 0;
      for (let j = 0; j < 8; j++) {
        code = (code << 1) | (bits[i * 8 + j] || 0);
      }
      str += String.fromCharCode(code);
    }
    return str;
  }

  /**
   * Convert a bit array to a hexadecimal string (uppercase).
   * @param {number[]} bits
   * @returns {string}
   */
  function bitsToHex(bits) {
    let hex = '';
    for (let i = 0; i < bits.length; i += 4) {
      let nibble = 0;
      for (let j = 0; j < 4 && i + j < bits.length; j++) {
        nibble = (nibble << 1) | (bits[i + j] || 0);
      }
      hex += nibble.toString(16).toUpperCase();
    }
    return hex;
  }

  /**
   * Convert a hexadecimal string to a bit array.
   * @param {string} hex
   * @returns {number[]}
   */
  function hexToBits(hex) {
    const bits = [];
    for (let i = 0; i < hex.length; i++) {
      const nibble = parseInt(hex[i], 16);
      if (isNaN(nibble)) continue;
      for (let j = 3; j >= 0; j--) {
        bits.push((nibble >>> j) & 1);
      }
    }
    return bits;
  }

  /**
   * Convert a bit array to a binary string (groups of 8 separated by space).
   * @param {number[]} bits
   * @returns {string}
   */
  function bitsToBinaryString(bits) {
    let result = '';
    for (let i = 0; i < bits.length; i++) {
      if (i > 0 && i % 8 === 0) result += ' ';
      result += bits[i];
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  // Core DES operations
  // ---------------------------------------------------------------------------

  /**
   * Apply a permutation table to a bit array.
   * Table values are 1-based indices into the input.
   * @param {number[]} bits   Input bit array
   * @param {number[]} table  Permutation table (1-indexed)
   * @returns {number[]} Permuted bit array
   */
  function permute(bits, table) {
    return table.map(pos => bits[pos - 1]);
  }

  /**
   * XOR two bit arrays element-wise.
   * @param {number[]} a
   * @param {number[]} b
   * @returns {number[]}
   */
  function xorBits(a, b) {
    return a.map((bit, i) => bit ^ (b[i] || 0));
  }

  /**
   * Left circular rotation of a bit array by n positions.
   * @param {number[]} bits
   * @param {number}   n     Number of positions to rotate
   * @returns {number[]}
   */
  function leftRotate(bits, n) {
    return [...bits.slice(n), ...bits.slice(0, n)];
  }

  /**
   * S-Box lookup: map 6 bits → 4 bits using S_BOXES[boxIndex].
   * Row  = bit[0]*2 + bit[5]       (outer two bits)
   * Column = bit[1]*8 + bit[2]*4 + bit[3]*2 + bit[4]  (inner four bits)
   * @param {number}   boxIndex  0–7
   * @param {number[]} sixBits   6-element bit array
   * @returns {number[]} 4-element bit array
   */
  function sboxLookup(boxIndex, sixBits) {
    const row = (sixBits[0] << 1) | sixBits[5];
    const col = (sixBits[1] << 3) | (sixBits[2] << 2) | (sixBits[3] << 1) | sixBits[4];
    const val = T.S_BOXES[boxIndex][row][col];
    return [(val >>> 3) & 1, (val >>> 2) & 1, (val >>> 1) & 1, val & 1];
  }

  // ---------------------------------------------------------------------------
  // Key schedule
  // ---------------------------------------------------------------------------

  /**
   * Generate all 16 round subkeys from a 64-bit key.
   * @param {number[]} keyBits  64-element key bit array
   * @returns {number[][]} Array of 16 × 48-bit subkeys
   */
  function generateSubkeys(keyBits) {
    // PC-1: 64 → 56 bits (removes parity bits)
    const key56 = permute(keyBits, T.PC1);

    let C = key56.slice(0, 28);
    let D = key56.slice(28, 56);

    const subkeys = [];
    for (let round = 0; round < 16; round++) {
      C = leftRotate(C, T.SHIFTS[round]);
      D = leftRotate(D, T.SHIFTS[round]);
      const CD = [...C, ...D]; // 56 bits
      subkeys.push(permute(CD, T.PC2)); // PC-2: 56 → 48 bits
    }
    return subkeys;
  }

  // ---------------------------------------------------------------------------
  // Feistel function F
  // ---------------------------------------------------------------------------

  /**
   * Compute the Feistel function F(R, K):
   *   1. E(R):  Expand 32-bit R to 48 bits
   *   2. XOR:   E(R) ⊕ K
   *   3. S-Box: 48 bits → 32 bits via 8 S-boxes
   *   4. P:     P-permutation of 32 bits
   *
   * @param {number[]} R  32-element bit array (right half)
   * @param {number[]} K  48-element bit array (round subkey)
   * @returns {number[]} 32-element result
   */
  function feistelF(R, K) {
    const expanded = permute(R, T.E);          // Step 1: 32 → 48
    const xored    = xorBits(expanded, K);      // Step 2: XOR

    // Step 3: S-Box substitution (8 × 6-bit inputs → 8 × 4-bit outputs)
    let sboxOut = [];
    for (let i = 0; i < 8; i++) {
      sboxOut = sboxOut.concat(sboxLookup(i, xored.slice(i * 6, i * 6 + 6)));
    }

    return permute(sboxOut, T.P);              // Step 4: P-permutation
  }

  // ---------------------------------------------------------------------------
  // DES encryption / decryption
  // ---------------------------------------------------------------------------

  /**
   * DES-encrypt a 64-bit plaintext block with a 64-bit key.
   * @param {number[]} plainBits  64-element bit array
   * @param {number[]} keyBits    64-element bit array
   * @returns {number[]} 64-element ciphertext bit array
   */
  function desEncryptBits(plainBits, keyBits) {
    const subkeys = generateSubkeys(keyBits);
    return _desProcess(plainBits, subkeys);
  }

  /**
   * DES-decrypt a 64-bit ciphertext block with a 64-bit key.
   * Identical to encryption but with reversed subkey order.
   * @param {number[]} cipherBits  64-element bit array
   * @param {number[]} keyBits     64-element bit array
   * @returns {number[]} 64-element plaintext bit array
   */
  function desDecryptBits(cipherBits, keyBits) {
    const subkeys = generateSubkeys(keyBits).reverse();
    return _desProcess(cipherBits, subkeys);
  }

  /**
   * Internal: apply IP → 16 Feistel rounds → FP.
   * @param {number[]} inputBits  64-element bit array
   * @param {number[][]} subkeys  16 × 48-element subkey arrays
   * @returns {number[]} 64-element output bit array
   */
  function _desProcess(inputBits, subkeys) {
    let block = permute(inputBits, T.IP);
    let L = block.slice(0, 32);
    let R = block.slice(32, 64);

    for (let i = 0; i < 16; i++) {
      const newR = xorBits(L, feistelF(R, subkeys[i]));
      L = R;
      R = newR;
    }

    // After 16 rounds, concatenate R16||L16 (deliberate swap)
    return permute([...R, ...L], T.FP);
  }

  // ---------------------------------------------------------------------------
  // High-level string API
  // ---------------------------------------------------------------------------

  /**
   * Encrypt a plaintext string using DES (single 8-char block).
   * @param {string} plaintext  Up to 8 characters
   * @param {string} keyStr     Exactly 8 characters
   * @returns {string} Hexadecimal ciphertext (16 chars)
   */
  function encryptString(plaintext, keyStr) {
    const pt  = plaintext.padEnd(8, '\0').substring(0, 8);
    const key = keyStr.padEnd(8, '\0').substring(0, 8);
    return bitsToHex(desEncryptBits(stringToBits(pt), stringToBits(key)));
  }

  /**
   * Decrypt a hexadecimal ciphertext using DES (single block).
   * @param {string} hexCipher  16-char hex string
   * @param {string} keyStr     Exactly 8 characters
   * @returns {string} Plaintext string (null bytes trimmed)
   */
  function decryptHex(hexCipher, keyStr) {
    const key = keyStr.padEnd(8, '\0').substring(0, 8);
    const plainBits = desDecryptBits(hexToBits(hexCipher), stringToBits(key));
    return bitsToString(plainBits).replace(/\0+$/g, '');
  }

  // ---------------------------------------------------------------------------
  // Export
  // ---------------------------------------------------------------------------

  window.DESApp.core = {
    // Converters
    stringToBits,
    bitsToString,
    bitsToHex,
    hexToBits,
    bitsToBinaryString,
    // Primitives
    permute,
    xorBits,
    leftRotate,
    sboxLookup,
    // Key schedule
    generateSubkeys,
    // Feistel
    feistelF,
    // Block cipher
    desEncryptBits,
    desDecryptBits,
    // String API
    encryptString,
    decryptHex
  };

})();
