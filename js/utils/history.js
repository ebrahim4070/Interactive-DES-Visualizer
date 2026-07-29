/**
 * utils/history.js
 * Manages encryption/decryption history stored in localStorage.
 * Exported to window.DESApp.history
 */
'use strict';

window.DESApp = window.DESApp || {};

(function () {
  const STORAGE_KEY = 'des_visualizer_history';
  const MAX_ENTRIES = 100;

  /**
   * Load history array from localStorage.
   * @returns {Object[]}
   */
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Save history array to localStorage.
   * @param {Object[]} entries
   */
  function save(entries) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      console.warn('DES History: Could not save to localStorage');
    }
  }

  /**
   * Add a new history entry.
   * @param {Object} entry
   * @param {string} entry.operation  'encrypt' | 'decrypt'
   * @param {string} entry.plaintext
   * @param {string} entry.key
   * @param {string} entry.ciphertext
   * @param {string} entry.format     'hex' | 'base64' | 'binary'
   * @param {number} entry.timeMs     Encryption time in milliseconds
   */
  function add(entry) {
    const entries = load();
    entries.unshift({
      id:        Date.now(),
      timestamp: new Date().toISOString(),
      ...entry
    });
    save(entries.slice(0, MAX_ENTRIES));
  }

  /**
   * Get all history entries, newest first.
   * @returns {Object[]}
   */
  function getAll() {
    return load();
  }

  /**
   * Search history entries by plaintext (case-insensitive).
   * @param {string} query
   * @returns {Object[]}
   */
  function search(query) {
    if (!query) return getAll();
    const q = query.toLowerCase();
    return load().filter(e =>
      (e.plaintext || '').toLowerCase().includes(q) ||
      (e.ciphertext || '').toLowerCase().includes(q) ||
      (e.key || '').toLowerCase().includes(q)
    );
  }

  /**
   * Delete a single entry by ID.
   * @param {number} id
   */
  function remove(id) {
    save(load().filter(e => e.id !== id));
  }

  /**
   * Clear all history.
   */
  function clear() {
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Export history as a JSON string (for download).
   * @returns {string}
   */
  function exportJSON() {
    return JSON.stringify(load(), null, 2);
  }

  /**
   * Export history as a CSV string (for download).
   * @returns {string}
   */
  function exportCSV() {
    const entries = load();
    const header = 'ID,Timestamp,Operation,Plaintext,Key,Ciphertext,Format,Time(ms)';
    const rows = entries.map(e =>
      [
        e.id,
        e.timestamp,
        e.operation,
        `"${(e.plaintext || '').replace(/"/g, '""')}"`,
        `"${(e.key || '').replace(/"/g, '""')}"`,
        e.ciphertext,
        e.format,
        e.timeMs
      ].join(',')
    );
    return [header, ...rows].join('\n');
  }

  // Export
  window.DESApp.history = { add, getAll, search, remove, clear, exportJSON, exportCSV };

})();
