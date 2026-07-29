/**
 * ui/toast.js
 * Lightweight toast notification system.
 * Exported to window.DESApp.toast
 */
'use strict';

window.DESApp = window.DESApp || {};

(function () {
  const ICONS = {
    success: '✓',
    error:   '✕',
    info:    'ℹ',
    warning: '⚠'
  };

  /**
   * Show a toast notification.
   * @param {string}  message   The message text
   * @param {'success'|'error'|'info'|'warning'} type
   * @param {number}  duration  Auto-dismiss ms (default 3000, 0 = persist)
   */
  function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <span class="toast__icon">${ICONS[type] || 'ℹ'}</span>
      <span class="toast__message">${message}</span>
      <button class="toast__close" aria-label="Close">×</button>
    `;

    // Close button
    toast.querySelector('.toast__close').addEventListener('click', () => dismiss(toast));

    container.appendChild(toast);

    // Trigger enter animation
    requestAnimationFrame(() => toast.classList.add('toast--visible'));

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => dismiss(toast), duration);
    }
  }

  function dismiss(toast) {
    toast.classList.remove('toast--visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }

  // Export
  window.DESApp.toast = { show: showToast };

})();
