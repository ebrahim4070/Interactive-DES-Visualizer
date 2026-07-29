/**
 * ui/stepPlayer.js
 * Controls playback of DES visualization steps.
 * Handles: prev/next/play/pause/reset/replay/speed/jump-to-round
 * Keyboard: ← → Space R
 * Exported to window.DESApp.stepPlayer
 */
'use strict';

window.DESApp = window.DESApp || {};

(function () {
  const BG   = window.DESApp.bitGrid;
  const FC   = window.DESApp.flowchart;
  const RT   = window.DESApp.roundTrack;

  // Speed multiplier → interval ms
  const SPEED_MS = { '0.5': 2000, '1': 1000, '2': 500, '4': 250 };

  // State
  let _steps        = [];
  let _currentIdx   = -1;
  let _isPlaying    = false;
  let _speed        = '1';
  let _playInterval = null;
  let _soundEnabled = false;
  let _audioCtx     = null;

  // DOM references
  const $ = id => document.getElementById(id);

  // ---------------------------------------------------------------------------
  // Audio
  // ---------------------------------------------------------------------------

  function _tick() {
    if (!_soundEnabled) return;
    try {
      if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc  = _audioCtx.createOscillator();
      const gain = _audioCtx.createGain();
      osc.connect(gain);
      gain.connect(_audioCtx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.05, _audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, _audioCtx.currentTime + 0.1);
      osc.start();
      osc.stop(_audioCtx.currentTime + 0.1);
    } catch { /* silently ignore */ }
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  function _renderStep(step) {
    if (!step) return;

    // ---- Title & counter
    const titleEl  = $('vis-step-title');
    const counterEl = $('vis-step-counter');
    if (titleEl)   titleEl.textContent  = step.title;
    if (counterEl) counterEl.textContent = `Step ${_currentIdx + 1} of ${_steps.length}`;

    // ---- Progress bar
    const bar = $('vis-progress-bar');
    if (bar) bar.style.width = `${((_currentIdx + 1) / _steps.length) * 100}%`;

    // ---- Flowchart highlight
    FC.setActivePhase(step.phase);

    // ---- Round tracker
    const maxDone = step.round ? step.round - 1 : 0;
    RT.setRound(step.round, maxDone);

    // ---- Explanation panel
    _renderExplanation(step);

    // ---- Bit display area
    _renderBitDisplay(step);

    // ---- Sound
    _tick();
  }

  function _renderExplanation(step) {
    const panel = $('vis-explanation');
    if (!panel || !step.explanation) return;

    const ex = step.explanation;
    panel.innerHTML = `
      <div class="explanation-card">
        <h3 class="explanation-title">${step.title}</h3>
        <div class="explanation-section">
          <span class="explanation-badge badge--why">Why</span>
          <p>${ex.why}</p>
        </div>
        <div class="explanation-section">
          <span class="explanation-badge badge--formula">Formula</span>
          <code class="formula-code">${ex.formula}</code>
        </div>
        ${ex.input ? `
        <div class="explanation-section">
          <span class="explanation-badge badge--input">Input</span>
          <code class="formula-code small">${ex.input}</code>
        </div>` : ''}
        ${ex.output ? `
        <div class="explanation-section">
          <span class="explanation-badge badge--output">Output</span>
          <code class="formula-code small">${ex.output}</code>
        </div>` : ''}
        <div class="explanation-section">
          <span class="explanation-badge badge--example">Example</span>
          <p class="example-text">${ex.example}</p>
        </div>
      </div>
    `;
  }

  function _renderBitDisplay(step) {
    const area = $('vis-bit-area');
    if (!area) return;
    area.innerHTML = '';

    // ASCII table view (first two steps)
    if (step.asciiData) {
      _renderAsciiTable(area, step.asciiData);
      return;
    }

    // XOR display
    if (step.xorData && step.phase !== 'xor-left') {
      const xd = step.xorData;
      BG.renderXOR(area, xd.a, xd.b, xd.result);
      return;
    }

    // XOR with left — show split display
    if (step.xorData && step.phase === 'xor-left') {
      const xd = step.xorData;
      _renderSplitXOR(area, xd.a, xd.b, xd.result);
      return;
    }

    // Split display
    if (step.splitData) {
      _renderSplit(area, step.splitData.L, step.splitData.R);
      return;
    }

    // Swap display
    if (step.swapData) {
      _renderSwap(area, step.swapData);
      return;
    }

    // S-Box display
    if (step.sboxData) {
      _renderSboxDisplay(area, step.sboxData);
      return;
    }

    // Subkey schedule overview
    if (step.subkeyData) {
      _renderSubkeyOverview(area, step.subkeyData);
      return;
    }

    // Default: before/after comparison
    if (step.inputBits && step.outputBits) {
      BG.renderComparison(area, step.inputBits, step.outputBits, step.highlightMap);
    } else if (step.outputBits) {
      const grid = document.createElement('div');
      BG.renderBits(grid, step.outputBits, step.highlightMap);
      area.appendChild(grid);
    }
  }

  function _renderAsciiTable(area, asciiData) {
    const table = document.createElement('div');
    table.className = 'ascii-table';
    table.innerHTML = `
      <div class="ascii-table__header">
        <span>Char</span><span>ASCII</span><span>Hex</span><span>Binary</span>
      </div>
    `;
    asciiData.forEach(row => {
      const div = document.createElement('div');
      div.className = 'ascii-table__row';
      div.innerHTML = `
        <span class="ascii-char">${row.char}</span>
        <span class="ascii-decimal">${row.ascii}</span>
        <span class="ascii-hex">0x${row.hex}</span>
        <span class="ascii-binary">${row.binary}</span>
      `;
      table.appendChild(div);
    });
    area.appendChild(table);
  }

  function _renderSplit(area, L, R) {
    const wrap = document.createElement('div');
    wrap.className = 'split-display';

    const lDiv = document.createElement('div');
    lDiv.className = 'split-half split-half--left';
    lDiv.innerHTML = '<div class="split-label">L₀ (Left 32 bits)</div>';
    const lGrid = document.createElement('div');
    const C = window.DESApp.core;
    BG.renderBits(lGrid, L, L.map(() => 'op'));
    lDiv.appendChild(lGrid);
    lDiv.innerHTML += `<div class="split-hex">${C.bitsToHex(L)}</div>`;

    const rDiv = document.createElement('div');
    rDiv.className = 'split-half split-half--right';
    rDiv.innerHTML = '<div class="split-label">R₀ (Right 32 bits)</div>';
    const rGrid = document.createElement('div');
    BG.renderBits(rGrid, R, R.map(() => 'active'));
    rDiv.appendChild(rGrid);
    rDiv.innerHTML += `<div class="split-hex">${C.bitsToHex(R)}</div>`;

    wrap.appendChild(lDiv);
    wrap.appendChild(rDiv);
    area.appendChild(wrap);
  }

  function _renderSplitXOR(area, L, f, newR) {
    const C = window.DESApp.core;
    const wrap = document.createElement('div');
    wrap.className = 'xor-display';

    _addLabeledRow(wrap, L, L.map(() => 'inactive'), `Left Half (L)`, '');
    _addLabeledRow(wrap, f, f.map(() => 'op'), `F-function result`, '⊕');

    const div = document.createElement('div');
    div.className = 'xor-divider';
    wrap.appendChild(div);

    const hl = newR.map((b, i) => L[i] !== f[i] ? 'changed' : 'unchanged');
    _addLabeledRow(wrap, newR, hl, `New Right Half (R)`, '=');

    area.appendChild(wrap);
  }

  function _addLabeledRow(container, bits, hl, label, symbol) {
    const row = document.createElement('div');
    row.className = 'xor-row';
    row.innerHTML = `<span class="xor-symbol">${symbol}</span><span class="xor-label">${label}</span>`;
    const grid = document.createElement('div');
    BG.renderBits(grid, bits, hl);
    row.appendChild(grid);
    container.appendChild(row);
  }

  function _renderSwap(area, sd) {
    const C = window.DESApp.core;
    const wrap = document.createElement('div');
    wrap.className = 'swap-display';
    wrap.innerHTML = `
      <div class="swap-row">
        <div class="swap-col">
          <div class="swap-label">Old L</div>
          <code class="swap-hex old">${C.bitsToHex(sd.oldL)}</code>
          <div class="swap-arrow">↓ becomes new R (unchanged)</div>
        </div>
        <div class="swap-col">
          <div class="swap-label">Old R</div>
          <code class="swap-hex old">${C.bitsToHex(sd.oldR)}</code>
          <div class="swap-arrow">↓ becomes new L</div>
        </div>
      </div>
      <div class="swap-row swap-row--new">
        <div class="swap-col">
          <code class="swap-hex new">${C.bitsToHex(sd.newL)}</code>
          <div class="swap-label">New L</div>
        </div>
        <div class="swap-col">
          <code class="swap-hex new">${C.bitsToHex(sd.newR)}</code>
          <div class="swap-label">New R</div>
        </div>
      </div>
    `;
    area.appendChild(wrap);
  }

  function _renderSboxDisplay(area, sd) {
    const wrap = document.createElement('div');
    wrap.className = 'sbox-display';

    sd.inputs.forEach((inp, i) => {
      const out = sd.outputs[i];
      const card = document.createElement('div');
      card.className = 'sbox-card';
      card.innerHTML = `
        <div class="sbox-header">S-Box ${i + 1}</div>
        <div class="sbox-body">
          <div class="sbox-detail">
            <span class="sbox-label">6-bit input:</span>
            <code class="sbox-code">${inp.six.join('')}</code>
          </div>
          <div class="sbox-detail">
            <span class="sbox-label">Row (bits 1,6):</span>
            <code class="sbox-code">${inp.rowIdx}</code>
          </div>
          <div class="sbox-detail">
            <span class="sbox-label">Col (bits 2–5):</span>
            <code class="sbox-code">${inp.colIdx}</code>
          </div>
          <div class="sbox-detail">
            <span class="sbox-label">Output:</span>
            <code class="sbox-code sbox-output">${out.outVal} (${out.outBits.join('')})</code>
          </div>
        </div>
      `;
      wrap.appendChild(card);
    });

    area.appendChild(wrap);
  }

  function _renderSubkeyOverview(area, sd) {
    const C = window.DESApp.core;
    const wrap = document.createElement('div');
    wrap.className = 'subkey-overview';

    const grid = document.createElement('div');
    grid.className = 'subkey-grid';
    sd.subkeys.forEach((sk, i) => {
      const item = document.createElement('div');
      item.className = 'subkey-item';
      item.innerHTML = `
        <span class="subkey-label">K${i + 1}</span>
        <code class="subkey-hex">${C.bitsToHex(sk)}</code>
        <span class="subkey-shift">shift: ${sd.shifts[i]}</span>
      `;
      grid.appendChild(item);
    });
    wrap.appendChild(grid);
    area.appendChild(wrap);
  }

  // ---------------------------------------------------------------------------
  // Playback controls
  // ---------------------------------------------------------------------------

  function _stopInterval() {
    if (_playInterval) {
      clearInterval(_playInterval);
      _playInterval = null;
    }
  }

  function _setPlayingState(playing) {
    _isPlaying = playing;
    const btn = $('vis-play-pause');
    if (btn) btn.textContent = playing ? '⏸ Pause' : '▶ Play';
  }

  function goTo(idx) {
    if (idx < 0 || idx >= _steps.length) return;
    _currentIdx = idx;
    _renderStep(_steps[_currentIdx]);
    _updateNavButtons();
  }

  function next() {
    if (_currentIdx < _steps.length - 1) {
      goTo(_currentIdx + 1);
    } else {
      pause();
    }
  }

  function prev() {
    if (_currentIdx > 0) goTo(_currentIdx - 1);
  }

  function play() {
    if (_isPlaying || _currentIdx >= _steps.length - 1) return;
    _setPlayingState(true);
    _playInterval = setInterval(() => {
      if (_currentIdx >= _steps.length - 1) { pause(); return; }
      next();
    }, SPEED_MS[_speed] || 1000);
  }

  function pause() {
    _stopInterval();
    _setPlayingState(false);
  }

  function reset() {
    pause();
    _currentIdx = -1;
    FC.reset();
    RT.reset();
    const area = $('vis-bit-area');
    if (area) area.innerHTML = '<div class="vis-placeholder">Press Start or Next to begin the visualization</div>';
    const titleEl   = $('vis-step-title');
    const counterEl = $('vis-step-counter');
    const bar       = $('vis-progress-bar');
    const panel     = $('vis-explanation');
    if (titleEl)   titleEl.textContent   = 'Ready';
    if (counterEl) counterEl.textContent = `Step 0 of ${_steps.length}`;
    if (bar)       bar.style.width       = '0%';
    if (panel)     panel.innerHTML       = '<div class="explanation-placeholder">Explanation will appear here as you step through the visualization.</div>';
    _updateNavButtons();
  }

  function replay() {
    pause();
    _currentIdx = 0;
    _renderStep(_steps[0]);
    _updateNavButtons();
  }

  function setSpeed(s) {
    _speed = s;
    if (_isPlaying) { pause(); play(); }
  }

  /**
   * Jump to the first step of a specific round.
   * @param {number} roundNum  1–16
   */
  function jumpToRound(roundNum) {
    const idx = _steps.findIndex(s => s.round === roundNum);
    if (idx >= 0) { pause(); goTo(idx); }
  }

  function _updateNavButtons() {
    const btnPrev = $('vis-prev');
    const btnNext = $('vis-next');
    if (btnPrev) btnPrev.disabled = _currentIdx <= 0;
    if (btnNext) btnNext.disabled = _currentIdx >= _steps.length - 1;
  }

  // ---------------------------------------------------------------------------
  // Initialise
  // ---------------------------------------------------------------------------

  /**
   * Load a new step set and reset the player.
   * @param {Object[]} steps  Array produced by DESApp.visualizer.generateSteps()
   */
  function load(steps) {
    _steps = steps || [];
    reset();
    const startBtn = $('vis-start');
    if (startBtn) startBtn.disabled = _steps.length === 0;
  }

  /**
   * Wire up all control buttons and keyboard shortcuts.
   * Call this once after DOM is ready.
   */
  function initControls() {
    const bind = (id, fn) => {
      const el = $(id);
      if (el) el.addEventListener('click', fn);
    };

    bind('vis-start',     () => { if (_currentIdx < 0) goTo(0); else play(); });
    bind('vis-prev',      prev);
    bind('vis-next',      next);
    bind('vis-play-pause', () => _isPlaying ? pause() : play());
    bind('vis-reset',     reset);
    bind('vis-replay',    replay);

    // Speed selector
    const speedSel = $('vis-speed');
    if (speedSel) speedSel.addEventListener('change', e => setSpeed(e.target.value));

    // Jump to round
    const roundSel = $('vis-jump-round');
    if (roundSel) roundSel.addEventListener('change', e => {
      const v = parseInt(e.target.value);
      if (v >= 1 && v <= 16) jumpToRound(v);
    });

    // Sound toggle
    const soundBtn = $('vis-sound');
    if (soundBtn) soundBtn.addEventListener('click', () => {
      _soundEnabled = !_soundEnabled;
      soundBtn.textContent = _soundEnabled ? '🔊 Sound' : '🔇 Mute';
    });

    // Fullscreen
    const fsBtn = $('vis-fullscreen');
    if (fsBtn) fsBtn.addEventListener('click', () => {
      const viz = $('visualizer');
      if (viz) {
        if (document.fullscreenElement) document.exitFullscreen();
        else viz.requestFullscreen().catch(() => {});
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
      // Only when visualizer is visible
      const vis = $('visualizer');
      if (!vis || vis.classList.contains('section--hidden')) return;
      // Don't intercept if focused on an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      switch (e.key) {
        case 'ArrowLeft':  e.preventDefault(); prev(); break;
        case 'ArrowRight': e.preventDefault(); next(); break;
        case ' ':          e.preventDefault(); _isPlaying ? pause() : play(); break;
        case 'r':
        case 'R':          reset(); break;
      }
    });
  }

  // Export
  window.DESApp.stepPlayer = {
    load,
    initControls,
    goTo,
    next,
    prev,
    play,
    pause,
    reset,
    replay,
    setSpeed,
    jumpToRound,
    get currentIndex() { return _currentIdx; },
    get totalSteps()   { return _steps.length; }
  };

})();
