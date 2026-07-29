/**
 * ui/encrypt.js
 * Encryption section UI handler.
 * Exported to window.DESApp.encryptUI
 */
'use strict';

window.DESApp = window.DESApp || {};

(function () {
  const core    = () => window.DESApp.core;
  const fmt     = () => window.DESApp.format;
  const hist    = () => window.DESApp.history;
  const fh      = () => window.DESApp.fileHandler;
  const toast   = () => window.DESApp.toast;
  const $ = id  => document.getElementById(id);

  let _currentFormat = 'hex';

  function init() {
    // Format tabs
    document.querySelectorAll('.format-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.format-tab').forEach(b => b.classList.remove('format-tab--active'));
        btn.classList.add('format-tab--active');
        _currentFormat = btn.dataset.format;
        // Re-display with new format if result exists
        const hexResult = $('enc-result-hex')?.dataset.hex;
        if (hexResult) _displayResult(hexResult);
      });
    });

    // Encrypt button
    $('enc-btn-encrypt')?.addEventListener('click', _doEncrypt);

    // Generate random key
    $('enc-btn-random-key')?.addEventListener('click', () => {
      const keyEl = $('enc-key');
      if (keyEl) { keyEl.value = fmt().generateRandomKey(); toast().show('Random key generated!', 'success'); }
    });

    // Generate random plaintext
    $('enc-btn-random-text')?.addEventListener('click', () => {
      const ptEl = $('enc-plaintext');
      if (ptEl) { ptEl.value = fmt().generateRandomPlaintext(); }
    });

    // Copy cipher
    $('enc-btn-copy')?.addEventListener('click', () => {
      const result = $('enc-result')?.textContent;
      if (result && result !== '—') {
        navigator.clipboard.writeText(result).then(() => toast().show('Copied to clipboard!', 'success'));
      }
    });

    // Clear
    $('enc-btn-clear')?.addEventListener('click', () => {
      ['enc-plaintext', 'enc-key', 'enc-result'].forEach(id => {
        const el = $(id);
        if (el) el.value !== undefined ? el.value = '' : el.textContent = '—';
      });
      ['enc-time', 'enc-chars', 'enc-bytes'].forEach(id => {
        const el = $(id); if (el) el.textContent = '—';
      });
    });

    // Paste
    $('enc-btn-paste')?.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        const ptEl = $('enc-plaintext');
        if (ptEl) { ptEl.value = text; toast().show('Pasted from clipboard', 'info'); }
      } catch { toast().show('Clipboard access denied', 'error'); }
    });

    // Download
    $('enc-btn-download')?.addEventListener('click', () => {
      const result = $('enc-result')?.textContent;
      if (result && result !== '—') {
        fh().downloadText(result, 'des_cipher.txt');
        toast().show('Downloaded!', 'success');
      }
    });

    // Upload
    $('enc-btn-upload')?.addEventListener('click', () => $('enc-file-input')?.click());
    $('enc-file-input')?.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      fh().readTextFile(file, (text, err) => {
        if (err) { toast().show(err, 'error'); return; }
        const ptEl = $('enc-plaintext');
        if (ptEl) ptEl.value = text.substring(0, 8);
        toast().show(`Loaded "${file.name}"`, 'success');
      });
    });

    // Key validation on input
    $('enc-key')?.addEventListener('input', _validateKey);

    // Decrypt quick-link from enc section
    $('enc-btn-decrypt')?.addEventListener('click', () => {
      // Switch to decrypt section
      window.DESApp.router?.navigate('decrypt');
      const hexResult = $('enc-result-hex')?.dataset.hex;
      const key       = $('enc-key')?.value;
      if (hexResult) {
        const dec = $('dec-cipher'); if (dec) dec.value = hexResult;
        const dk  = $('dec-key');   if (dk)  dk.value  = key;
      }
    });
  }

  function _validateKey() {
    const keyEl    = $('enc-key');
    const errorEl  = $('enc-key-error');
    if (!keyEl) return true;
    const valid = keyEl.value.length === 8;
    keyEl.classList.toggle('input--error', !valid && keyEl.value.length > 0);
    if (errorEl) errorEl.textContent = (!valid && keyEl.value.length > 0) ? 'Key must be exactly 8 characters' : '';
    return valid;
  }

  function _doEncrypt() {
    const ptEl  = $('enc-plaintext');
    const keyEl = $('enc-key');
    if (!ptEl || !keyEl) return;

    const plaintext = ptEl.value;
    const key       = keyEl.value;

    if (!plaintext.trim()) { toast().show('Please enter plain text', 'warning'); return; }
    if (key.length !== 8)  { toast().show('Key must be exactly 8 characters', 'error'); return; }

    // Encrypt
    const t0 = performance.now();
    let hexResult;
    try {
      hexResult = core().encryptString(plaintext, key);
    } catch (e) {
      toast().show('Encryption failed: ' + e.message, 'error');
      return;
    }
    const elapsed = (performance.now() - t0).toFixed(2);

    // Store hex for format switching
    const hexStore = $('enc-result-hex');
    if (hexStore) hexStore.dataset.hex = hexResult;

    _displayResult(hexResult);

    // Stats
    const timeEl  = $('enc-time');  if (timeEl)  timeEl.textContent  = elapsed + ' ms';
    const charEl  = $('enc-chars'); if (charEl)  charEl.textContent  = plaintext.length + ' chars';
    const byteEl  = $('enc-bytes'); if (byteEl)  byteEl.textContent  = fmt().countBytes(plaintext) + ' bytes';

    // History
    hist().add({
      operation:  'encrypt',
      plaintext,
      key,
      ciphertext: hexResult,
      format:     _currentFormat,
      timeMs:     parseFloat(elapsed)
    });

    toast().show('Encryption successful!', 'success');

    // Populate visualizer inputs too
    const visPlain = $('vis-plaintext'); if (visPlain) visPlain.value = plaintext;
    const visKey   = $('vis-key');       if (visKey)   visKey.value   = key;
  }

  function _displayResult(hexResult) {
    const resultEl = $('enc-result');
    if (!resultEl) return;
    const formatted = fmt().formatOutput(hexResult, _currentFormat);
    resultEl.textContent = formatted;
    resultEl.classList.add('result--flash');
    setTimeout(() => resultEl.classList.remove('result--flash'), 600);
  }

  // Export
  window.DESApp.encryptUI = { init };

})();
