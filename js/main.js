/**
 * main.js
 * Application bootstrap. Initializes all modules and the SPA router.
 * Exported to window.DESApp.router (router only)
 */
'use strict';

window.DESApp = window.DESApp || {};

(function () {

  // ---------------------------------------------------------------------------
  // SPA Router
  // ---------------------------------------------------------------------------

  const SECTIONS = ['home', 'encrypt', 'decrypt', 'visualizer', 'about'];

  let _currentSection = 'home';

  function navigate(sectionId) {
    if (!SECTIONS.includes(sectionId)) return;
    _currentSection = sectionId;

    // Show/hide sections
    SECTIONS.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('section--hidden', id !== sectionId);
    });

    // Update nav links
    document.querySelectorAll('.nav__link').forEach(link => {
      link.classList.toggle('nav__link--active', link.dataset.section === sectionId);
    });

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Special section init
    if (sectionId === 'about') window.DESApp.aboutPage?.init();
    if (sectionId === 'visualizer') _initVisualizer();
  }

  function _bindNavLinks() {
    document.querySelectorAll('.nav__link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        navigate(link.dataset.section);
      });
    });

    // CTA buttons on home
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => navigate(btn.dataset.nav));
    });
  }

  // ---------------------------------------------------------------------------
  // Theme Toggle
  // ---------------------------------------------------------------------------

  function _initTheme() {
    const saved = localStorage.getItem('des_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    _updateThemeBtn(saved);
  }

  function _updateThemeBtn(theme) {
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️ Light' : '🌙 Dark';
  }

  function _bindThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next    = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('des_theme', next);
      _updateThemeBtn(next);
      window.DESApp.toast?.show(`Switched to ${next} mode`, 'info', 1500);
    });
  }

  // ---------------------------------------------------------------------------
  // Visualizer section init
  // ---------------------------------------------------------------------------

  function _initVisualizer() {
    const FC = window.DESApp.flowchart;
    const RT = window.DESApp.roundTrack;
    const SP = window.DESApp.stepPlayer;

    FC?.init('vis-flowchart');
    RT?.init('vis-round-track');

    // If flowchart and round track already initialized, just set state
    // Bind "Start Visualization" button in the visualizer input area
    const startBtn = document.getElementById('vis-start-new');
    if (startBtn) {
      startBtn.addEventListener('click', _startVisualization);
    }

    // Jump to round select: populate options
    const roundSel = document.getElementById('vis-jump-round');
    if (roundSel && roundSel.options.length <= 1) {
      for (let i = 1; i <= 16; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = `Round ${i}`;
        roundSel.appendChild(opt);
      }
    }
  }

  function _startVisualization() {
    const ptEl  = document.getElementById('vis-plaintext');
    const keyEl = document.getElementById('vis-key');
    if (!ptEl || !keyEl) return;

    const pt  = ptEl.value;
    const key = keyEl.value;

    if (!pt) {
      window.DESApp.toast?.show('Enter plain text for the visualizer', 'warning');
      return;
    }
    if (key.length !== 8) {
      window.DESApp.toast?.show('Visualizer key must be exactly 8 characters', 'error');
      return;
    }

    // Show loading spinner briefly
    const spinner = document.getElementById('vis-spinner');
    if (spinner) spinner.classList.remove('hidden');

    setTimeout(() => {
      try {
        const steps = window.DESApp.visualizer.generateSteps(pt, key);
        window.DESApp.stepPlayer.load(steps);
        window.DESApp.stepPlayer.goTo(0);
        if (spinner) spinner.classList.add('hidden');
        window.DESApp.toast?.show(`${steps.length} visualization steps generated!`, 'success');
      } catch (e) {
        if (spinner) spinner.classList.add('hidden');
        window.DESApp.toast?.show('Visualization error: ' + e.message, 'error');
      }
    }, 50);
  }

  // ---------------------------------------------------------------------------
  // History panel
  // ---------------------------------------------------------------------------

  function _initHistoryPanel() {
    const searchEl = document.getElementById('hist-search');
    if (searchEl) {
      searchEl.addEventListener('input', () => _renderHistory(searchEl.value));
    }

    document.getElementById('hist-clear')?.addEventListener('click', () => {
      window.DESApp.history.clear();
      _renderHistory('');
      window.DESApp.toast?.show('History cleared', 'info');
    });

    document.getElementById('hist-export-json')?.addEventListener('click', () => {
      window.DESApp.fileHandler.downloadHistoryJSON();
      window.DESApp.toast?.show('History exported as JSON', 'success');
    });

    document.getElementById('hist-export-csv')?.addEventListener('click', () => {
      window.DESApp.fileHandler.downloadHistoryCSV();
      window.DESApp.toast?.show('History exported as CSV', 'success');
    });

    _renderHistory('');
  }

  function _renderHistory(query) {
    const list = document.getElementById('hist-list');
    if (!list) return;

    const entries = window.DESApp.history.search(query);
    if (entries.length === 0) {
      list.innerHTML = '<div class="hist-empty">No history entries yet. Encrypt or decrypt something!</div>';
      return;
    }

    list.innerHTML = entries.map(e => `
      <div class="hist-item" data-id="${e.id}">
        <div class="hist-item__header">
          <span class="hist-badge hist-badge--${e.operation}">${e.operation.toUpperCase()}</span>
          <span class="hist-time">${new Date(e.timestamp).toLocaleString()}</span>
          <button class="hist-delete" data-id="${e.id}" aria-label="Delete">✕</button>
        </div>
        <div class="hist-item__body">
          <div><span class="hist-label">Plain:</span> <code>${e.plaintext || '—'}</code></div>
          <div><span class="hist-label">Key:</span>   <code>${e.key}</code></div>
          <div><span class="hist-label">Cipher:</span><code>${e.ciphertext}</code></div>
        </div>
      </div>
    `).join('');

    // Delete buttons
    list.querySelectorAll('.hist-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id);
        window.DESApp.history.remove(id);
        _renderHistory(query);
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Mobile nav toggle
  // ---------------------------------------------------------------------------

  function _initMobileNav() {
    const toggle = document.getElementById('nav-toggle');
    const menu   = document.getElementById('nav-menu');
    if (!toggle || !menu) return;

    toggle.addEventListener('click', () => {
      menu.classList.toggle('nav__menu--open');
      toggle.setAttribute('aria-expanded', menu.classList.contains('nav__menu--open'));
    });

    // Close on link click
    menu.querySelectorAll('.nav__link').forEach(link => {
      link.addEventListener('click', () => {
        menu.classList.remove('nav__menu--open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Welcome modal
  // ---------------------------------------------------------------------------

  function _initWelcomeModal() {
    const modal   = document.getElementById('welcome-modal');
    const closeBtn = document.getElementById('welcome-close');
    const startBtn = document.getElementById('welcome-start');
    if (!modal) return;

    const seen = localStorage.getItem('des_welcome_seen');
    if (!seen) {
      modal.classList.remove('hidden');
    }

    const close = () => {
      modal.classList.add('hidden');
      localStorage.setItem('des_welcome_seen', '1');
    };

    closeBtn?.addEventListener('click', close);
    startBtn?.addEventListener('click', () => { close(); navigate('encrypt'); });
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
  }

  // ---------------------------------------------------------------------------
  // Keyboard shortcut help modal
  // ---------------------------------------------------------------------------

  function _initShortcutHelp() {
    const btn   = document.getElementById('shortcuts-btn');
    const modal = document.getElementById('shortcuts-modal');
    const close = document.getElementById('shortcuts-close');
    if (!btn || !modal) return;

    btn.addEventListener('click',   () => modal.classList.toggle('hidden'));
    close?.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });
  }

  // ---------------------------------------------------------------------------
  // Bootstrap
  // ---------------------------------------------------------------------------

  function _init() {
    _initTheme();
    _bindThemeToggle();
    _bindNavLinks();
    _initMobileNav();
    _initWelcomeModal();
    _initShortcutHelp();

    // Init feature modules
    window.DESApp.encryptUI?.init();
    window.DESApp.decryptUI?.init();
    window.DESApp.stepPlayer?.initControls();
    _initHistoryPanel();

    // Navigate to home (show home section, hide others)
    navigate('home');

    console.log('%c DES Visualizer loaded ✓ ', 'background:#6c63ff;color:#fff;font-size:14px;border-radius:4px;padding:4px 8px;');
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

  // Export router
  window.DESApp.router = { navigate };

})();
