/**
 * ui/flowchart.js
 * Renders and animates the live DES pipeline flowchart.
 * Nodes glow blue (active), turn green (done), remain gray (pending).
 * Exported to window.DESApp.flowchart
 */
'use strict';

window.DESApp = window.DESApp || {};

(function () {

  /** Ordered list of pipeline nodes with display labels and phase IDs */
  const PIPELINE_NODES = [
    { id: 'input',       label: 'Plain Text',           icon: '📄' },
    { id: 'ip',          label: 'Initial Permutation',  icon: '🔀' },
    { id: 'split',       label: 'Split L₀ / R₀',        icon: '✂️' },
    { id: 'keyschedule', label: 'Key Schedule',         icon: '🔑' },
    { id: 'expansion',   label: 'Expansion E',          icon: '📈' },
    { id: 'xor',         label: 'XOR ⊕ Round Key',      icon: '⊕' },
    { id: 'sbox',        label: 'S-Box Substitution',   icon: '🎲' },
    { id: 'pperm',       label: 'P-Permutation',        icon: '🔄' },
    { id: 'xor-left',    label: 'XOR ⊕ Left Half',      icon: '⊕' },
    { id: 'swap',        label: 'Swap L / R',           icon: '↔️' },
    { id: 'fp',          label: 'Final Permutation',    icon: '🔀' },
    { id: 'output',      label: 'Cipher Text',          icon: '🔒' }
  ];

  const PHASE_ORDER = PIPELINE_NODES.map(n => n.id);

  let _container = null;
  let _nodeEls   = {};

  /**
   * Initialize the flowchart inside a container.
   * @param {string|HTMLElement} containerOrId
   */
  function init(containerOrId) {
    _container = typeof containerOrId === 'string'
      ? document.getElementById(containerOrId)
      : containerOrId;

    if (!_container) return;

    _container.innerHTML = '';
    _container.className = 'flowchart';
    _nodeEls = {};

    PIPELINE_NODES.forEach((node, idx) => {
      // Node card
      const card = document.createElement('div');
      card.className = 'flowchart__node flowchart__node--pending';
      card.id = `fc-node-${node.id}`;
      card.innerHTML = `
        <span class="flowchart__icon">${node.icon}</span>
        <span class="flowchart__label">${node.label}</span>
      `;
      _container.appendChild(card);
      _nodeEls[node.id] = card;

      // Connector arrow (except after last node)
      if (idx < PIPELINE_NODES.length - 1) {
        const arrow = document.createElement('div');
        arrow.className = 'flowchart__arrow';
        arrow.id = `fc-arrow-${idx}`;
        arrow.innerHTML = `<div class="flowchart__arrow-line"></div><div class="flowchart__arrow-head">▼</div>`;
        _container.appendChild(arrow);
      }
    });
  }

  /**
   * Update all node states based on the current active phase.
   * @param {string|null} activePhase  Phase ID of the current step
   */
  function setActivePhase(activePhase) {
    const activeIdx = PHASE_ORDER.indexOf(activePhase);

    PIPELINE_NODES.forEach((node, idx) => {
      const el = _nodeEls[node.id];
      if (!el) return;

      el.classList.remove(
        'flowchart__node--active',
        'flowchart__node--done',
        'flowchart__node--pending'
      );

      if (idx === activeIdx) {
        el.classList.add('flowchart__node--active');
        // Scroll node into view inside the flowchart container
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      } else if (idx < activeIdx) {
        el.classList.add('flowchart__node--done');
      } else {
        el.classList.add('flowchart__node--pending');
      }

      // Arrow coloring
      const arrowEl = document.getElementById(`fc-arrow-${idx}`);
      if (arrowEl) {
        arrowEl.classList.toggle('flowchart__arrow--done', idx < activeIdx);
        arrowEl.classList.toggle('flowchart__arrow--active', idx === activeIdx);
      }
    });
  }

  /**
   * Reset all nodes to pending.
   */
  function reset() {
    PIPELINE_NODES.forEach(node => {
      const el = _nodeEls[node.id];
      if (el) {
        el.classList.remove('flowchart__node--active', 'flowchart__node--done');
        el.classList.add('flowchart__node--pending');
      }
    });
    document.querySelectorAll('.flowchart__arrow').forEach(a => {
      a.classList.remove('flowchart__arrow--done', 'flowchart__arrow--active');
    });
  }

  // Export
  window.DESApp.flowchart = { init, setActivePhase, reset, PIPELINE_NODES };

})();
