/**
 * utils/fileHandler.js
 * File upload and download helpers.
 * Exported to window.DESApp.fileHandler
 */
'use strict';

window.DESApp = window.DESApp || {};

(function () {

  /**
   * Read a text file selected by the user.
   * @param {File}     file      File object from <input type="file">
   * @param {Function} callback  Called with (text, error)
   */
  function readTextFile(file, callback) {
    if (!file) { callback(null, 'No file provided'); return; }
    if (file.size > 1024 * 1024) { callback(null, 'File too large (max 1 MB)'); return; }

    const reader = new FileReader();
    reader.onload  = e => callback(e.target.result, null);
    reader.onerror = () => callback(null, 'Failed to read file');
    reader.readAsText(file, 'UTF-8');
  }

  /**
   * Trigger a browser download of a text string as a file.
   * @param {string} content   Text content
   * @param {string} filename  Suggested file name
   * @param {string} mimeType  MIME type (default: text/plain)
   */
  function downloadText(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType + ';charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Download history as JSON.
   */
  function downloadHistoryJSON() {
    downloadText(window.DESApp.history.exportJSON(), 'des_history.json', 'application/json');
  }

  /**
   * Download history as CSV.
   */
  function downloadHistoryCSV() {
    downloadText(window.DESApp.history.exportCSV(), 'des_history.csv', 'text/csv');
  }

  // Export
  window.DESApp.fileHandler = { readTextFile, downloadText, downloadHistoryJSON, downloadHistoryCSV };

})();
