/**
 * about.js
 * Renders the About DES educational page content.
 * Exported to window.DESApp.aboutPage
 */
'use strict';

window.DESApp = window.DESApp || {};

(function () {

  const CONTENT = `
    <div class="about-hero">
      <h2 class="about-hero__title">Data Encryption Standard</h2>
      <p class="about-hero__subtitle">A landmark in the history of cryptography</p>
    </div>

    <div class="about-grid">

      <!-- History -->
      <article class="about-card">
        <div class="about-card__icon">📜</div>
        <h3>History of DES</h3>
        <p>DES (Data Encryption Standard) was developed by IBM in the early 1970s and adopted as a federal standard in <strong>1977</strong> (FIPS 46). It was the world's first publicly available, standardized encryption algorithm.</p>
        <p>Originally designed with a 56-bit key, DES was standardized after the NSA reduced IBM's proposed 64-bit key — a decision that later proved fateful as computing power grew.</p>
        <p>In <strong>1998</strong> the EFF built "Deep Crack" for $250,000 and broke DES in 56 hours, proving it insecure. DES was officially retired in <strong>2005</strong>.</p>
      </article>

      <!-- How DES works -->
      <article class="about-card">
        <div class="about-card__icon">⚙️</div>
        <h3>How DES Works</h3>
        <ol class="about-list">
          <li><strong>Plain Text Input:</strong> 64-bit (8 byte) block</li>
          <li><strong>Initial Permutation (IP):</strong> Reorders all 64 bits</li>
          <li><strong>Key Schedule:</strong> Generates 16 × 48-bit round keys from the 56-bit key</li>
          <li><strong>16 Feistel Rounds:</strong> Each applies Expand → XOR → S-Box → P → XOR with L</li>
          <li><strong>Final Permutation (FP):</strong> Inverse of IP</li>
          <li><strong>Cipher Text:</strong> 64-bit encrypted output</li>
        </ol>
      </article>

      <!-- Feistel Structure -->
      <article class="about-card">
        <div class="about-card__icon">🔀</div>
        <h3>The Feistel Structure</h3>
        <p>DES uses a <strong>Feistel network</strong> invented by IBM's Horst Feistel. The key insight: split the data into two halves (L and R) and process them alternately.</p>
        <p>Each round: <code>L_n = R_{n-1},  R_n = L_{n-1} ⊕ F(R_{n-1}, K_n)</code></p>
        <p>The genius of the Feistel structure is that <strong>decryption is identical to encryption</strong> — just use the round keys in reverse order. This is elegant and hardware-efficient.</p>
      </article>

      <!-- Specs -->
      <article class="about-card about-card--specs">
        <div class="about-card__icon">📐</div>
        <h3>DES Specifications</h3>
        <table class="about-specs-table">
          <tr><td>Block Size</td><td><strong>64 bits</strong> (8 bytes)</td></tr>
          <tr><td>Key Size</td><td><strong>56 bits</strong> (64 bits with 8 parity bits)</td></tr>
          <tr><td>Number of Rounds</td><td><strong>16</strong></td></tr>
          <tr><td>Structure</td><td><strong>Feistel Network</strong></td></tr>
          <tr><td>Round Key Size</td><td><strong>48 bits</strong></td></tr>
          <tr><td>S-Boxes</td><td><strong>8</strong> (4-row × 16-column each)</td></tr>
          <tr><td>Subkey Generation</td><td><strong>PC-1, PC-2, Left Shifts</strong></td></tr>
          <tr><td>Published</td><td><strong>1977 (FIPS 46)</strong></td></tr>
          <tr><td>Retired</td><td><strong>2005</strong></td></tr>
        </table>
      </article>

      <!-- S-Boxes -->
      <article class="about-card">
        <div class="about-card__icon">🎲</div>
        <h3>S-Boxes: The Core of Security</h3>
        <p>DES has 8 S-boxes (S1–S8). Each maps a <strong>6-bit input → 4-bit output</strong> using a fixed lookup table. This non-linear substitution is what makes DES cryptographically strong.</p>
        <p>Row selection: bits 1 and 6 of the 6-bit input form a 2-bit number (0–3).</p>
        <p>Column selection: bits 2–5 form a 4-bit number (0–15).</p>
        <p>The specific S-box values were designed to resist <strong>differential cryptanalysis</strong> (a technique discovered publicly in 1990, but apparently known to the NSA in the 1970s).</p>
      </article>

      <!-- Advantages & Disadvantages -->
      <article class="about-card">
        <div class="about-card__icon">⚖️</div>
        <h3>Advantages &amp; Disadvantages</h3>
        <div class="about-two-col">
          <div>
            <h4 class="color-green">✓ Advantages</h4>
            <ul class="about-list">
              <li>First widely adopted standard</li>
              <li>Simple, elegant structure</li>
              <li>Fast in hardware</li>
              <li>Well-studied &amp; analyzed</li>
              <li>Foundation for 3DES &amp; modern ciphers</li>
            </ul>
          </div>
          <div>
            <h4 class="color-red">✗ Disadvantages</h4>
            <ul class="about-list">
              <li>56-bit key = only 2⁵⁶ ≈ 72 quadrillion combinations</li>
              <li>Broken by brute force in 1998</li>
              <li>Small block size (64 bits) — birthday attacks</li>
              <li>Slow in pure software</li>
              <li>Not secure for modern use</li>
            </ul>
          </div>
        </div>
      </article>

      <!-- Comparison: DES vs 3DES vs AES -->
      <article class="about-card about-card--wide">
        <div class="about-card__icon">🔐</div>
        <h3>DES vs. 3DES vs. AES</h3>
        <div class="comparison-table-wrap">
          <table class="comparison-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>DES</th>
                <th>3DES (Triple-DES)</th>
                <th>AES</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Published</td><td>1977</td><td>1998 (NIST)</td><td>2001</td></tr>
              <tr><td>Key Size</td><td>56 bits</td><td>112 or 168 bits</td><td>128, 192, or 256 bits</td></tr>
              <tr><td>Block Size</td><td>64 bits</td><td>64 bits</td><td>128 bits</td></tr>
              <tr><td>Rounds</td><td>16</td><td>48 (3 × 16)</td><td>10, 12, or 14</td></tr>
              <tr><td>Structure</td><td>Feistel</td><td>Feistel (3×)</td><td>SPN (Substitution-Permutation)</td></tr>
              <tr><td>Security</td><td class="color-red">Broken</td><td class="color-yellow">Weak (deprecated 2023)</td><td class="color-green">Secure (current standard)</td></tr>
              <tr><td>Speed</td><td>Fast (HW)</td><td>3× slower than DES</td><td>Very fast (especially with AES-NI)</td></tr>
              <tr><td>Use Today</td><td class="color-red">Never</td><td class="color-yellow">Legacy only</td><td class="color-green">Recommended</td></tr>
            </tbody>
          </table>
        </div>
      </article>

      <!-- Why DES is insecure -->
      <article class="about-card about-card--danger">
        <div class="about-card__icon">⚠️</div>
        <h3>Why DES is No Longer Secure</h3>
        <div class="timeline">
          <div class="timeline-item">
            <span class="timeline-year">1977</span>
            <p>DES standardized. Whitfield Diffie and Martin Hellman immediately warn that a dedicated machine could break it.</p>
          </div>
          <div class="timeline-item">
            <span class="timeline-year">1993</span>
            <p>Michael Wiener designs a $1M machine that could break DES in 3.5 hours. The key space of 2⁵⁶ is insufficient.</p>
          </div>
          <div class="timeline-item">
            <span class="timeline-year">1997</span>
            <p>RSA Security DES Challenge I: Internet distributed computing breaks DES in 96 days.</p>
          </div>
          <div class="timeline-item">
            <span class="timeline-year">1998</span>
            <p>EFF's "Deep Crack" breaks DES in <strong>56 hours</strong> for $250,000. The verdict: DES is dead.</p>
          </div>
          <div class="timeline-item">
            <span class="timeline-year">1999</span>
            <p>Deep Crack + distributed.net breaks DES in <strong>22 hours 15 minutes</strong>.</p>
          </div>
          <div class="timeline-item">
            <span class="timeline-year">2005</span>
            <p>NIST formally withdraws DES as a standard. AES (Rijndael) takes its place.</p>
          </div>
        </div>
      </article>

    </div><!-- /.about-grid -->
  `;

  function init() {
    const container = document.getElementById('about-content');
    if (container) container.innerHTML = CONTENT;
  }

  // Export
  window.DESApp.aboutPage = { init };

})();
