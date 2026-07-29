/**
 * utils/format.js
 * Conversion utilities for displaying DES output in different formats.
 * Exported to window.DESApp.format
 */
'use strict';

window.DESApp = window.DESApp || {};

(function () {

  /**
   * Convert a hex string to a Base64 string.
   * @param {string} hex
   * @returns {string}
   */
  function hexToBase64(hex) {
    // Convert hex pairs to char codes, then btoa
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
      str += String.fromCharCode(parseInt(hex.substring(i, 2), 16));
    }
    try {
      return btoa(str);
    } catch {
      // Fallback using Uint8Array
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
      }
      return btoa(String.fromCharCode(...bytes));
    }
  }

  /**
   * Convert a hex string to a binary string (space-separated bytes).
   * @param {string} hex
   * @returns {string}
   */
  function hexToBinaryString(hex) {
    return hex.match(/.{1,2}/g)
      .map(byte => parseInt(byte, 16).toString(2).padStart(8, '0'))
      .join(' ');
  }

  /**
   * Convert a hex string to a decimal string.
   * @param {string} hex
   * @returns {string}
   */
  function hexToDecimal(hex) {
    return BigInt('0x' + hex).toString(10);
  }

  /**
   * Format the DES output into the requested representation.
   * @param {string} hexResult   Raw hex output from DES
   * @param {'hex'|'base64'|'binary'} format
   * @returns {string}
   */
  function formatOutput(hexResult, format) {
    switch (format) {
      case 'base64':  return hexToBase64(hexResult);
      case 'binary':  return hexToBinaryString(hexResult);
      case 'hex':
      default:        return hexResult;
    }
  }

  /**
   * Count printable characters in a string (excludes null bytes).
   * @param {string} str
   * @returns {number}
   */
  function countChars(str) {
    return str.replace(/\0/g, '').length;
  }

  /**
   * Count bytes in a UTF-8 encoded string.
   * @param {string} str
   * @returns {number}
   */
  function countBytes(str) {
    return new TextEncoder().encode(str).length;
  }

  /**
   * Generate a random 8-character printable ASCII key.
   * @returns {string}
   */
  function generateRandomKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const arr = new Uint8Array(8);
    crypto.getRandomValues(arr);
    return Array.from(arr).map(b => chars[b % chars.length]).join('');
  }

  /**
   * Generate a random 8-character plaintext string.
   * @returns {string}
   */
  function generateRandomPlaintext() {
    const words = [
      'HELLO', 'WORLD', 'SECRET', 'CIPHER', 'CRYPTO',
      'SECURE', 'BINARY', 'FEISTEL', 'ROUND16', 'DESTEST'
    ];
    const pick = words[Math.floor(Math.random() * words.length)];
    return pick.padEnd(8).substring(0, 8);
  }

  // Export
  window.DESApp.format = {
    hexToBase64,
    hexToBinaryString,
    hexToDecimal,
    formatOutput,
    countChars,
    countBytes,
    generateRandomKey,
    generateRandomPlaintext
  };

})();
