/**
 * ui/decrypt.js
 * Decryption section UI handler.
 * Exported to window.DESApp.decryptUI
 */
'use strict';

window.DESApp = window.DESApp || {};

(function () {
  const core  = () => window.DESApp.core;
  const hist  = () => window.DESApp.history;
  const toast = () => window.DESApp.toast;
  const $     = id => document.getElementById(id);

  function init() {
    $('dec-btn-decrypt')?.addEventListener('click', _doDecrypt);

    $('dec-btn-copy')?.addEventListener('click', () => {
      const result = $('dec-result')?.textContent;
      if (result && result !== '—') {
        navigator.clipboard.writeText(result)
          .then(() => toast().show('Plain text copied!', 'success'))
          .catch(() => toast().show('Copy failed', 'error'));
      }
    });

    $('dec-btn-clear')?.addEventListener('click', () => {
      ['dec-cipher', 'dec-key', 'dec-result'].forEach(id => {
        const el = $(id);
        if (el) el.value !== undefined ? el.value = '' : el.textContent = '—';
      });
    });

    $('dec-btn-paste')?.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        const el = $('dec-cipher');
        if (el) { el.value = text; toast().show('Pasted from clipboard', 'info'); }
      } catch { toast().show('Clipboard access denied', 'error'); }
    });

    $('dec-key')?.addEventListener('input', _validateKey);
  }

  function _validateKey() {
    const keyEl   = $('dec-key');
    const errorEl = $('dec-key-error');
    if (!keyEl) return;
    const valid = keyEl.value.length === 8;
    keyEl.classList.toggle('input--error', !valid && keyEl.value.length > 0);
    if (errorEl) errorEl.textContent = (!valid && keyEl.value.length > 0) ? 'Key must be exactly 8 characters' : '';
  }

  function _doDecrypt() {
    const cipherEl = $('dec-cipher');
    const keyEl    = $('dec-key');
    if (!cipherEl || !keyEl) return;

    const cipher = cipherEl.value.trim().replace(/\s/g, '');
    const key    = keyEl.value;

    if (!cipher) { toast().show('Please enter cipher text', 'warning'); return; }
    if (key.length !== 8) { toast().show('Key must be exactly 8 characters', 'error'); return; }

    // Validate hex input
    if (!/^[0-9A-Fa-f]{16}$/.test(cipher)) {
      toast().show('Cipher text must be a 16-character hexadecimal string', 'error');
      return;
    }

    let plaintext;
    try {
      plaintext = core().decryptHex(cipher, key);
    } catch (e) {
      toast().show('Decryption failed: ' + e.message, 'error');
      return;
    }

    const resultEl = $('dec-result');
    if (resultEl) {
      resultEl.textContent = plaintext;
      resultEl.classList.add('result--flash');
      setTimeout(() => resultEl.classList.remove('result--flash'), 600);
    }

    hist().add({
      operation: 'decrypt',
      plaintext,
      key,
      ciphertext: cipher,
      format:     'hex',
      timeMs:     0
    });

    toast().show('Decryption successful!', 'success');
  }

  // Export
  window.DESApp.decryptUI = { init };

})();
