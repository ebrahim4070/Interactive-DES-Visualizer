/**
 * ui/bitGrid.js
 * Renders a grid of colored bit cells for before/after comparison.
 * Exported to window.DESApp.bitGrid
 */
'use strict';

window.DESApp = window.DESApp || {};

(function () {

  /** Color class mapping for highlight types */
  const COLOR_CLASS = {
    'unchanged': 'bit--green',
    'changed':   'bit--red',
    'active':    'bit--yellow',
    'op':        'bit--blue',
    'inactive':  'bit--gray',
    'default':   'bit--gray'
  };

  /**
   * Render a bit array into a container as colored span elements.
   * @param {HTMLElement} container
   * @param {number[]}    bits          Bit values (0 or 1)
   * @param {string[]}    highlightMap  Array of color keys per bit
   * @param {number}      [groupSize=8] Bits per visual group (adds spacing)
   */
  function renderBits(container, bits, highlightMap, groupSize = 8) {
    container.innerHTML = '';
    container.classList.add('bit-grid');

    bits.forEach((bit, i) => {
      // Group divider
      if (i > 0 && i % groupSize === 0) {
        const sep = document.createElement('span');
        sep.className = 'bit-group-sep';
        container.appendChild(sep);
      }

      const span = document.createElement('span');
      const colorKey = (highlightMap && highlightMap[i]) || 'default';
      span.className = `bit ${COLOR_CLASS[colorKey] || 'bit--gray'}`;
      span.textContent = bit;
      span.dataset.index = i;
      // Stagger animation delay for sequential reveal
      span.style.animationDelay = `${(i % groupSize) * 20}ms`;
      container.appendChild(span);
    });
  }

  /**
   * Render an animated before→after bit comparison.
   * Shows two rows (Before / After) with color-coded differences.
   * @param {HTMLElement} container
   * @param {number[]}    before
   * @param {number[]}    after
   * @param {string[]}    [highlightMap]  If not provided, auto-computed
   */
  function renderComparison(container, before, after, highlightMap) {
    container.innerHTML = '';

    const hl = highlightMap || before.map((b, i) => b === after[i] ? 'unchanged' : 'changed');

    // Before row
    const beforeSection = document.createElement('div');
    beforeSection.className = 'bit-comparison__row';
    const beforeLabel = document.createElement('div');
    beforeLabel.className = 'bit-comparison__label';
    beforeLabel.textContent = 'Before';
    const beforeGrid = document.createElement('div');
    renderBits(beforeGrid, before, before.map(() => 'inactive'));
    beforeSection.appendChild(beforeLabel);
    beforeSection.appendChild(beforeGrid);

    // Arrow
    const arrow = document.createElement('div');
    arrow.className = 'bit-comparison__arrow';
    arrow.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14m0 0l-4-4m4 4l4-4"/></svg>';

    // After row
    const afterSection = document.createElement('div');
    afterSection.className = 'bit-comparison__row';
    const afterLabel = document.createElement('div');
    afterLabel.className = 'bit-comparison__label';
    afterLabel.textContent = 'After';
    const afterGrid = document.createElement('div');
    renderBits(afterGrid, after, hl);
    afterSection.appendChild(afterLabel);
    afterSection.appendChild(afterGrid);

    container.appendChild(beforeSection);
    container.appendChild(arrow);
    container.appendChild(afterSection);

    // Legend
    const legend = document.createElement('div');
    legend.className = 'bit-legend';
    legend.innerHTML = `
      <span class="bit bit--green">0</span><span class="bit-legend__label">Unchanged</span>
      <span class="bit bit--red">1</span><span class="bit-legend__label">Changed</span>
      <span class="bit bit--yellow">0</span><span class="bit-legend__label">Active</span>
      <span class="bit bit--blue">1</span><span class="bit-legend__label">Current Op</span>
    `;
    container.appendChild(legend);
  }

  /**
   * Render an XOR operation display (A ⊕ B = Result).
   * @param {HTMLElement} container
   * @param {number[]} a       First operand bits
   * @param {number[]} b       Second operand bits
   * @param {number[]} result  XOR result bits
   */
  function renderXOR(container, a, b, result) {
    container.innerHTML = '';
    container.classList.add('xor-display');

    const hlResult = result.map((bit, i) => a[i] !== b[i] ? 'changed' : 'unchanged');

    _addXorRow(container, a,      a.map(() => 'inactive'), 'Operand A', '');
    _addXorRow(container, b,      b.map(() => 'op'),       'Operand B', '⊕');
    // Divider
    const div = document.createElement('div');
    div.className = 'xor-divider';
    container.appendChild(div);
    _addXorRow(container, result, hlResult,                 'Result',    '=');
  }

  function _addXorRow(container, bits, hl, label, symbol) {
    const row = document.createElement('div');
    row.className = 'xor-row';

    const sym = document.createElement('span');
    sym.className = 'xor-symbol';
    sym.textContent = symbol;

    const lbl = document.createElement('span');
    lbl.className = 'xor-label';
    lbl.textContent = label;

    const grid = document.createElement('div');
    renderBits(grid, bits, hl);

    row.appendChild(sym);
    row.appendChild(lbl);
    row.appendChild(grid);
    container.appendChild(row);
  }

  // Export
  window.DESApp.bitGrid = { renderBits, renderComparison, renderXOR };

})();
