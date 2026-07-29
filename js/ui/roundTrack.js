/**
 * ui/roundTrack.js
 * Renders the Round 1–16 progress tracker in the visualizer.
 * Exported to window.DESApp.roundTrack
 */
'use strict';

window.DESApp = window.DESApp || {};

(function () {

  let _container = null;
  let _pills     = [];

  /**
   * Initialize the round tracker inside a container element.
   * @param {string|HTMLElement} containerOrId
   */
  function init(containerOrId) {
    _container = typeof containerOrId === 'string'
      ? document.getElementById(containerOrId)
      : containerOrId;

    if (!_container) return;

    _container.innerHTML = '';
    _container.className = 'round-track';
    _pills = [];

    for (let i = 1; i <= 16; i++) {
      const pill = document.createElement('div');
      pill.className = 'round-pill round-pill--pending';
      pill.textContent = i;
      pill.setAttribute('aria-label', `Round ${i}`);
      pill.dataset.round = i;
      _container.appendChild(pill);
      _pills.push(pill);
    }
  }

  /**
   * Update the tracker for the given active round.
   * @param {number|null} activeRound  1–16, or null if not in a round
   * @param {number}      maxComplete  Highest completed round
   */
  function setRound(activeRound, maxComplete = 0) {
    _pills.forEach((pill, idx) => {
      const roundNum = idx + 1;
      pill.classList.remove('round-pill--active', 'round-pill--done', 'round-pill--pending');

      if (activeRound && roundNum === activeRound) {
        pill.classList.add('round-pill--active');
      } else if (roundNum <= maxComplete) {
        pill.classList.add('round-pill--done');
      } else {
        pill.classList.add('round-pill--pending');
      }
    });
  }

  /**
   * Reset all pills to pending state.
   */
  function reset() {
    _pills.forEach(pill => {
      pill.classList.remove('round-pill--active', 'round-pill--done');
      pill.classList.add('round-pill--pending');
    });
  }

  // Export
  window.DESApp.roundTrack = { init, setRound, reset };

})();
