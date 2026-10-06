/**
 * Quantum UI Controller & Visualizer
 * RPI & IBM Quantum Challenge (Track 07)
 * Handles:
 * - Real-time HTML5 Canvas animation of photons & polarization states
 * - Interactive controls (Sliders, Attack toggles, Module switching)
 * - Metric dashboard updates (QBER, Asymptotic Secret Key Rate R, Mutual Info Delta I)
 * - Challenge briefing toggle & Google Drive code export
 * - Cascade error correction & Toeplitz matrix rendering
 * - Qiskit Python code copying & download
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Engine
  const engine = new QuantumEngine({
    numQubits: 48,
    fiberLengthKm: 15,
    depolarizationNoise: 0.01,
    attackMode: 'none',
    eveTapPercentage: 100,
    cnotCouplingAngle: 90,
    sacrificeFraction: 0.25,
    cascadeBlockSize: 4
  });

  // UI State
  let currentResults = null;
  let activeTab = 'module-1';
  let animationFrameId = null;
  let photons = [];
  let tableFilter = 'all';

  // DOM Elements
  const canvas = document.getElementById('quantumChannelCanvas');
  const ctx = canvas ? canvas.getContext('2d') : null;

  // Sliders & Inputs
  const numQubitsInput = document.getElementById('numQubitsInput');
  const numQubitsVal = document.getElementById('numQubitsVal');
  const fiberLengthInput = document.getElementById('fiberLengthInput');
  const fiberLengthVal = document.getElementById('fiberLengthVal');
  const noiseInput = document.getElementById('noiseInput');
  const noiseVal = document.getElementById('noiseVal');
  const eveTapInput = document.getElementById('eveTapInput');
  const eveTapVal = document.getElementById('eveTapVal');
  const cnotAngleInput = document.getElementById('cnotAngleInput');
  const cnotAngleVal = document.getElementById('cnotAngleVal');

  // Gauges
  const qberVal = document.getElementById('qberVal');
  const qberMeterFill = document.getElementById('qberMeterFill');
  const keyRateVal = document.getElementById('keyRateVal');
  const keyRateMeterFill = document.getElementById('keyRateMeterFill');
  const deltaIVal = document.getElementById('deltaIVal');
  const deltaIMeterFill = document.getElementById('deltaIMeterFill');
  const securityStatusAlert = document.getElementById('securityStatusAlert');

  // Key outputs
  const aliceFinalKeyBox = document.getElementById('aliceFinalKeyBox');
  const bobFinalKeyBox = document.getElementById('bobFinalKeyBox');
  const keyMatchBadge = document.getElementById('keyMatchBadge');
  const qubitTableBody = document.getElementById('qubitTableBody');

  // Briefing Card & Navigation
  const challengeBriefingCard = document.getElementById('challengeBriefingCard');
  const simulatorSection = document.getElementById('simulatorSection');
  const btnNavBriefing = document.getElementById('btnNavBriefing');
  const btnNavSimulator = document.getElementById('btnNavSimulator');
  const btnCloseToSimulator = document.getElementById('btnCloseToSimulator');
  const btnLaunchSimFromBriefing = document.getElementById('btnLaunchSimFromBriefing');
  const btnToggleBriefing = document.getElementById('btnToggleBriefing');
  const btnOpenCodePackage = document.getElementById('btnOpenCodePackage');
  const btnCopyQiskitCode = document.getElementById('btnCopyQiskitCode');

  // Navigation Logic
  function showBriefing() {
    if (challengeBriefingCard) {
      challengeBriefingCard.style.display = 'block';
      challengeBriefingCard.scrollIntoView({ behavior: 'smooth' });
    }
    if (btnNavBriefing) btnNavBriefing.classList.add('active');
    if (btnNavSimulator) btnNavSimulator.classList.remove('active');
  }

  function showSimulator() {
    if (simulatorSection) {
      simulatorSection.scrollIntoView({ behavior: 'smooth' });
    }
    if (btnNavSimulator) btnNavSimulator.classList.add('active');
    if (btnNavBriefing) btnNavBriefing.classList.remove('active');
  }

  if (btnNavBriefing) btnNavBriefing.addEventListener('click', showBriefing);
  if (btnNavSimulator) btnNavSimulator.addEventListener('click', showSimulator);
  if (btnCloseToSimulator) btnCloseToSimulator.addEventListener('click', showSimulator);
  if (btnLaunchSimFromBriefing) btnLaunchSimFromBriefing.addEventListener('click', showSimulator);
  if (btnToggleBriefing) btnToggleBriefing.addEventListener('click', showBriefing);

  // Open in Google Drive / Code Package button
  if (btnOpenCodePackage) {
    btnOpenCodePackage.addEventListener('click', () => {
      // Switch to Module 5 (Qiskit Code) and download Python script
      switchTab('module-5');
      showSimulator();
      // Also trigger file download for bb84_qiskit_pipeline.py
      const a = document.createElement('a');
      a.href = 'bb84_qiskit_pipeline.py';
      a.download = 'bb84_qiskit_pipeline.py';
      a.click();
    });
  }

  // Copy Qiskit Code Button
  if (btnCopyQiskitCode) {
    btnCopyQiskitCode.addEventListener('click', () => {
      const codePre = document.getElementById('qiskitCodePre');
      if (codePre) {
        navigator.clipboard.writeText(codePre.textContent.trim()).then(() => {
          const original = btnCopyQiskitCode.innerHTML;
          btnCopyQiskitCode.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
          setTimeout(() => { btnCopyQiskitCode.innerHTML = original; }, 2000);
        });
      }
    });
  }

  // Resize Canvas
  function resizeCanvas() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = 240 * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Initialize Canvas Animation
  function initPhotons(qubits) {
    photons = [];
    if (!qubits || qubits.length === 0 || !canvas) return;

    const canvasWidth = canvas.clientWidth;
    const canvasHeight = 240;

    const startX = 60;
    const eveX = canvasWidth / 2;
    const endX = canvasWidth - 60;
    const centerY = canvasHeight / 2;

    const count = Math.min(qubits.length, 24);
    for (let i = 0; i < count; i++) {
      const q = qubits[i];
      photons.push({
        qubit: q,
        x: startX - (i * 35),
        y: centerY + (Math.sin(i * 0.8) * 16),
        speed: 2.2,
        startX,
        eveX,
        endX,
        centerY,
        radius: 6,
        phase: Math.random() * Math.PI * 2,
        color: q.aliceBasis === 'Z' ? '#38bdf8' : '#c084fc',
        angle: q.polarizationAngle,
        tapped: false,
        measured: false
      });
    }
  }

  // Animation Loop
  function animate() {
    if (!ctx || !canvas) return;
    const w = canvas.clientWidth;
    const h = 240;

    ctx.clearRect(0, 0, w, h);

    // Draw Quantum Channel Fiber Guide
    const aliceX = 60;
    const eveX = w / 2;
    const bobX = w - 60;
    const centerY = h / 2;

    // Glowing Fiber Line
    const fiberGrad = ctx.createLinearGradient(aliceX, centerY, bobX, centerY);
    fiberGrad.addColorStop(0, 'rgba(244, 63, 94, 0.4)');
    fiberGrad.addColorStop(0.5, engine.config.attackMode !== 'none' ? 'rgba(245, 158, 11, 0.6)' : 'rgba(168, 85, 247, 0.4)');
    fiberGrad.addColorStop(1, 'rgba(6, 182, 212, 0.4)');

    ctx.beginPath();
    ctx.moveTo(aliceX, centerY);
    ctx.lineTo(bobX, centerY);
    ctx.strokeStyle = fiberGrad;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Subtle Core Glow
    ctx.beginPath();
    ctx.moveTo(aliceX, centerY);
    ctx.lineTo(bobX, centerY);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Node 1: Alice Station
    ctx.save();
    ctx.fillStyle = '#1e1b4b';
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(aliceX, centerY, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Alice', aliceX, centerY - 2);
    ctx.font = '9px monospace';
    ctx.fillStyle = '#fb7185';
    ctx.fillText('TX', aliceX, centerY + 10);
    ctx.restore();

    // Node 2: Eve Station (Channel Middle)
    ctx.save();
    const hasEve = engine.config.attackMode !== 'none';
    ctx.fillStyle = hasEve ? '#2d1808' : '#141525';
    ctx.strokeStyle = hasEve ? '#f59e0b' : '#333550';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(eveX, centerY, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = hasEve ? '#fbbf24' : '#64748b';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(hasEve ? 'Eve' : 'Clean', eveX, centerY - 2);
    ctx.font = '8px monospace';
    ctx.fillStyle = hasEve ? '#f59e0b' : '#475569';
    ctx.fillText(hasEve ? (engine.config.attackMode === 'intercept-resend' ? 'TAP' : 'CNOT') : 'PASS', eveX, centerY + 9);
    ctx.restore();

    // Node 3: Bob Station
    ctx.save();
    ctx.fillStyle = '#082f49';
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bobX, centerY, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Bob', bobX, centerY - 2);
    ctx.font = '9px monospace';
    ctx.fillStyle = '#38bdf8';
    ctx.fillText('RX', bobX, centerY + 10);
    ctx.restore();

    // Animate Flying Photons
    photons.forEach((p) => {
      p.x += p.speed;
      p.phase += 0.08;

      if (p.x > bobX + 30) {
        p.x = aliceX - 20;
        p.tapped = false;
        p.measured = false;
      }

      if (engine.config.attackMode !== 'none' && Math.abs(p.x - eveX) < 15 && !p.tapped) {
        p.tapped = true;
        if (p.qubit.eveTapped) {
          p.color = '#f59e0b';
        }
      }

      if (p.x >= aliceX - 10 && p.x <= bobX + 15) {
        ctx.save();
        const yOffset = Math.sin(p.phase) * 6;
        const py = centerY + yOffset;

        const glowGrad = ctx.createRadialGradient(p.x, py, 1, p.x, py, 12);
        glowGrad.addColorStop(0, p.color);
        glowGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(p.x, py, 12, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, py, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        const rad = (p.angle * Math.PI) / 180;
        const vLen = 11;
        ctx.beginPath();
        ctx.moveTo(p.x - Math.cos(rad) * vLen, py - Math.sin(rad) * vLen);
        ctx.lineTo(p.x + Math.cos(rad) * vLen, py + Math.sin(rad) * vLen);
        ctx.stroke();

        ctx.restore();
      }
    });

    animationFrameId = requestAnimationFrame(animate);
  }

  // Update Metrics Dashboard in Sidebar
  function updateMetricsDisplay(results) {
    if (!results) return;

    // 1. QBER
    const qberPercent = (results.qber * 100).toFixed(1);
    qberVal.textContent = `${qberPercent}%`;

    const qberMeterWidth = Math.min(100, (results.qber / 0.30) * 100);
    qberMeterFill.style.width = `${qberMeterWidth}%`;

    if (results.isAborted) {
      qberVal.className = 'gauge-val danger';
      qberMeterFill.style.backgroundColor = 'var(--accent-pink)';
    } else if (results.qber > 0.05) {
      qberVal.className = 'gauge-val warn';
      qberMeterFill.style.backgroundColor = 'var(--accent-amber)';
    } else {
      qberVal.className = 'gauge-val safe';
      qberMeterFill.style.backgroundColor = 'var(--accent-emerald)';
    }

    // 2. Asymptotic Secret Key Rate R >= 1 - 2H_2(QBER)
    const keyRatePercent = (results.asymptoticSecretKeyRate * 100).toFixed(1);
    keyRateVal.textContent = `${results.asymptoticSecretKeyRate.toFixed(3)} (${keyRatePercent}%)`;
    keyRateMeterFill.style.width = `${Math.min(100, results.asymptoticSecretKeyRate * 100)}%`;
    if (results.asymptoticSecretKeyRate > 0.4) {
      keyRateMeterFill.style.backgroundColor = 'var(--accent-emerald)';
      keyRateVal.className = 'gauge-val safe';
    } else if (results.asymptoticSecretKeyRate > 0) {
      keyRateMeterFill.style.backgroundColor = 'var(--accent-amber)';
      keyRateVal.className = 'gauge-val warn';
    } else {
      keyRateMeterFill.style.backgroundColor = 'var(--accent-pink)';
      keyRateVal.className = 'gauge-val danger';
    }

    // 3. Mutual Information Advantage: Delta I = I(A;B) - I(A;E)
    const deltaIFormatted = results.deltaI.toFixed(3);
    deltaIVal.textContent = `${deltaIFormatted} ${results.isPositiveDistillableKey ? '(ΔI > 0 ✓)' : '(ΔI ≤ 0 ✗)'}`;
    const deltaIWidth = Math.max(0, Math.min(100, ((results.deltaI + 0.5) / 1.5) * 100));
    deltaIMeterFill.style.width = `${deltaIWidth}%`;

    if (results.isPositiveDistillableKey) {
      deltaIVal.className = 'gauge-val safe';
      deltaIMeterFill.style.backgroundColor = 'var(--accent-cyan)';
    } else {
      deltaIVal.className = 'gauge-val danger';
      deltaIMeterFill.style.backgroundColor = 'var(--accent-pink)';
    }

    // Security Alert Banner
    if (results.isAborted) {
      securityStatusAlert.className = 'security-alert abort';
      securityStatusAlert.innerHTML = `
        <i class="fa-solid fa-triangle-exclamation" style="font-size:1.3rem;color:var(--accent-pink)"></i>
        <div>
          <strong>🚨 PROTOCOL ABORTED: Eavesdropper Detected!</strong><br />
          Observed QBER (${qberPercent}%) exceeds Shor-Preskill threshold (${results.shorPreskillPercentage}%).
          Eve has extracted too much mutual information (ΔI = ${deltaIFormatted}). Key distillation terminated to preserve secrecy.
        </div>
      `;
    } else {
      securityStatusAlert.className = 'security-alert secure';
      securityStatusAlert.innerHTML = `
        <i class="fa-solid fa-shield-halved" style="font-size:1.3rem;color:var(--accent-emerald)"></i>
        <div>
          <strong>🛡️ CHANNEL SECURE: Unconditional Secrecy Guaranteed</strong><br />
          Observed QBER (${qberPercent}%) is within bounds (&le; ${results.shorPreskillPercentage}%).
          Mutual information advantage &Delta;I = ${deltaIFormatted} &gt; 0 confirms positive distillable key capacity!
        </div>
      `;
    }

    // Final keys
    aliceFinalKeyBox.textContent = results.finalKeyAliceHex;
    bobFinalKeyBox.textContent = results.finalKeyBobHex;

    if (results.keysMatch) {
      keyMatchBadge.className = 'status-pill';
      keyMatchBadge.innerHTML = '<span class="status-dot"></span> Identical Shared Secret (100% Match)';
    } else if (results.isAborted) {
      keyMatchBadge.className = 'status-pill';
      keyMatchBadge.style.color = '#fb7185';
      keyMatchBadge.style.borderColor = 'rgba(244, 63, 94, 0.4)';
      keyMatchBadge.style.backgroundColor = 'rgba(244, 63, 94, 0.15)';
      keyMatchBadge.innerHTML = 'Key Generation Aborted';
    } else {
      keyMatchBadge.className = 'status-pill';
      keyMatchBadge.innerHTML = 'Zero Distilled Key';
    }

    // Cascade & Toeplitz stats
    const cascadeBlockContainer = document.getElementById('cascadeBlocksContainer');
    if (cascadeBlockContainer) {
      cascadeBlockContainer.innerHTML = '';
      if (results.cascadeLog && results.cascadeLog.length > 0) {
        results.cascadeLog.forEach(item => {
          const div = document.createElement('div');
          div.className = `cascade-block ${item.status === 'corrected' ? 'error-fixed' : 'match'}`;
          div.innerHTML = `
            <strong>Block #${item.block + 1} (${item.start}–${item.end - 1})</strong>
            <span>${item.status === 'corrected' ? '⚠️ Parity Error Fixed' : '✓ Parity Match'}</span>
          `;
          cascadeBlockContainer.appendChild(div);
        });
      } else {
        cascadeBlockContainer.innerHTML = `<span style="color:var(--text-dim);font-size:0.85rem">No Cascade error correction required (0 errors or aborted).</span>`;
      }
    }

    // Render Qubit Table
    renderQubitTable(results.qubits);

    // Re-initialize photon animations
    initPhotons(results.qubits);
  }

  // Render Qubit Transmission Table
  function renderQubitTable(qubits) {
    if (!qubitTableBody) return;
    qubitTableBody.innerHTML = '';

    const filtered = qubits.filter(q => {
      if (tableFilter === 'sifted') return q.sifted;
      if (tableFilter === 'errors') return q.isError;
      if (tableFilter === 'sacrificed') return q.sacrificed;
      if (tableFilter === 'finalKey') return q.finalKeyBit !== null;
      return true;
    });

    const displayQubits = filtered.slice(0, 100);

    displayQubits.forEach(q => {
      const tr = document.createElement('tr');
      if (q.isError) tr.className = 'row-error';
      else if (q.sacrificed) tr.className = 'row-sacrificed';
      else if (q.sifted) tr.className = 'row-sifted';

      tr.innerHTML = `
        <td>#${q.id + 1}</td>
        <td><span class="qubit-state-tag tag-bit-${q.aliceBit}">${q.aliceBit}</span></td>
        <td><span class="qubit-state-tag tag-basis-${q.aliceBasis.toLowerCase()}">${q.aliceBasis} (${q.aliceBasis === 'Z' ? '⊞' : '⊠'})</span></td>
        <td><strong>${q.aliceState}</strong></td>
        <td>${q.eveTapped ? `<span style="color:var(--accent-amber);font-weight:700">${q.eveBasis || 'CNOT'} → ${q.eveMeasuredBit !== null ? q.eveMeasuredBit : 'probe'}</span>` : '<span style="color:var(--text-dim)">—</span>'}</td>
        <td><span class="qubit-state-tag tag-basis-${q.bobBasis.toLowerCase()}">${q.bobBasis} (${q.bobBasis === 'Z' ? '⊞' : '⊠'})</span></td>
        <td><span class="qubit-state-tag tag-bit-${q.bobMeasuredBit}">${q.bobMeasuredBit}</span></td>
        <td>${q.sifted ? '<span style="color:#38bdf8;font-weight:700">✓ Match</span>' : '<span style="color:var(--text-dim)">✗ Discard</span>'}</td>
        <td>${q.sacrificed ? (q.isError ? '<span style="color:var(--accent-pink);font-weight:700">⚠️ Error</span>' : '<span style="color:#34d399">✓ Verified</span>') : '<span style="color:var(--text-dim)">Retained</span>'}</td>
        <td>${q.finalKeyBit !== null ? `<span class="qubit-state-tag" style="background:#0284c7;color:#fff">${q.finalKeyBit}</span>` : '—'}</td>
      `;
      qubitTableBody.appendChild(tr);
    });

    const countLabel = document.getElementById('tableCountLabel');
    if (countLabel) {
      countLabel.textContent = `Showing ${displayQubits.length} of ${filtered.length} qubits (${tableFilter})`;
    }
  }

  // Run Simulation
  function runSimulation() {
    currentResults = engine.simulate();
    updateMetricsDisplay(currentResults);
  }

  // Event Listeners for Sliders & Controls
  if (numQubitsInput) {
    numQubitsInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      numQubitsVal.textContent = val;
      engine.setConfig({ numQubits: val });
    });
  }

  if (fiberLengthInput) {
    fiberLengthInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      fiberLengthVal.textContent = `${val} km`;
      engine.setConfig({ fiberLengthKm: val });
    });
  }

  if (noiseInput) {
    noiseInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      noiseVal.textContent = `${(val * 100).toFixed(0)}%`;
      engine.setConfig({ depolarizationNoise: val });
    });
  }

  if (eveTapInput) {
    eveTapInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      eveTapVal.textContent = `${val}%`;
      engine.setConfig({ eveTapPercentage: val });
    });
  }

  if (cnotAngleInput) {
    cnotAngleInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      cnotAngleVal.textContent = `${val}°`;
      engine.setConfig({ cnotCouplingAngle: val });
    });
  }

  // Attack Selector Buttons
  const attackButtons = document.querySelectorAll('.attack-pill-btn');
  attackButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      attackButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const mode = btn.dataset.attack;
      engine.setConfig({ attackMode: mode });

      const irControls = document.getElementById('interceptResendControls');
      const cnotControls = document.getElementById('cnotControls');
      if (irControls) irControls.style.display = mode === 'intercept-resend' ? 'block' : 'none';
      if (cnotControls) cnotControls.style.display = mode === 'entanglement-cnot' ? 'block' : 'none';

      runSimulation();
    });
  });

  // Action Buttons
  const btnRunFull = document.getElementById('btnRunFull');
  if (btnRunFull) {
    btnRunFull.addEventListener('click', () => {
      runSimulation();
    });
  }

  const btnReset = document.getElementById('btnReset');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (numQubitsInput) numQubitsInput.value = 48;
      if (numQubitsVal) numQubitsVal.textContent = 48;
      if (fiberLengthInput) fiberLengthInput.value = 15;
      if (fiberLengthVal) fiberLengthVal.textContent = '15 km';
      if (noiseInput) noiseInput.value = 0.01;
      if (noiseVal) noiseVal.textContent = '1%';
      if (eveTapInput) eveTapInput.value = 100;
      if (eveTapVal) eveTapVal.textContent = '100%';

      attackButtons.forEach(b => b.classList.remove('active'));
      const noneBtn = document.querySelector('.attack-pill-btn[data-attack="none"]');
      if (noneBtn) noneBtn.classList.add('active');

      engine.setConfig({
        numQubits: 48,
        fiberLengthKm: 15,
        depolarizationNoise: 0.01,
        attackMode: 'none',
        eveTapPercentage: 100,
        cnotCouplingAngle: 90
      });

      const irControls = document.getElementById('interceptResendControls');
      const cnotControls = document.getElementById('cnotControls');
      if (irControls) irControls.style.display = 'none';
      if (cnotControls) cnotControls.style.display = 'none';

      runSimulation();
    });
  }

  // Module Tabs Switching
  const moduleTabs = document.querySelectorAll('.module-tab-btn');
  const moduleSections = document.querySelectorAll('.module-section');
  const overviewCards = document.querySelectorAll('.overview-card');

  function switchTab(tabId) {
    activeTab = tabId;
    moduleTabs.forEach(t => {
      t.classList.toggle('active', t.dataset.target === tabId);
    });
    overviewCards.forEach(c => {
      c.classList.toggle('active', c.dataset.target === tabId);
    });
    moduleSections.forEach(s => {
      s.classList.toggle('active', s.id === tabId);
    });
  }

  moduleTabs.forEach(t => {
    t.addEventListener('click', () => switchTab(t.dataset.target));
  });

  overviewCards.forEach(c => {
    c.addEventListener('click', () => {
      switchTab(c.dataset.target);
      showSimulator();
    });
  });

  // Table Filter Buttons
  const filterBtns = document.querySelectorAll('.table-filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tableFilter = btn.dataset.filter;
      if (currentResults) {
        renderQubitTable(currentResults.qubits);
      }
    });
  });

  // Export CSV
  const btnExportCSV = document.getElementById('btnExportCSV');
  if (btnExportCSV) {
    btnExportCSV.addEventListener('click', () => {
      if (!currentResults) return;
      let csv = 'ID,Alice_Bit,Alice_Basis,Alice_State,Eve_Tapped,Eve_Basis,Eve_Measured,Bob_Basis,Bob_Measured,Sifted,Sacrificed,Is_Error,Final_Key_Bit\n';
      currentResults.qubits.forEach(q => {
        csv += `${q.id + 1},${q.aliceBit},${q.aliceBasis},"${q.aliceState}",${q.eveTapped},${q.eveBasis || 'none'},${q.eveMeasuredBit !== null ? q.eveMeasuredBit : 'none'},${q.bobBasis},${q.bobMeasuredBit},${q.sifted},${q.sacrificed},${q.isError},${q.finalKeyBit !== null ? q.finalKeyBit : 'none'}\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rpi_ibm_quantum_bb84_${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // Encrypted Message Demo
  const secretPlaintextInput = document.getElementById('secretPlaintextInput');
  const btnEncryptMessage = document.getElementById('btnEncryptMessage');
  const cipherOutputBox = document.getElementById('cipherOutputBox');
  const bobDecryptedBox = document.getElementById('bobDecryptedBox');
  const eveDecryptedBox = document.getElementById('eveDecryptedBox');

  if (btnEncryptMessage && secretPlaintextInput) {
    btnEncryptMessage.addEventListener('click', () => {
      const text = secretPlaintextInput.value || 'RPI IBM QUANTUM: BB84 UNCONDITIONAL QUANTUM SECURITY VERIFIED';

      if (!currentResults || currentResults.isAborted || currentResults.finalKeyAlice.length === 0) {
        // Hacker was detected! Protocol was aborted!
        if (cipherOutputBox) {
          cipherOutputBox.innerHTML = `<span style="color:var(--accent-pink);font-weight:700">🚨 TRANSMISSION BLOCKED!</span><br /><span style="font-size:0.75rem;color:var(--text-muted)">QBER = ${currentResults ? (currentResults.qber * 100).toFixed(1) : '25.0'}% exceeds 11.0% Shor-Preskill limit. Alice aborted key distillation. No text was sent over the wire!</span>`;
        }
        if (bobDecryptedBox) {
          bobDecryptedBox.innerHTML = `<span style="color:var(--accent-amber);font-weight:700">🛡️ NO CIPHERTEXT RECEIVED</span><br /><span style="font-size:0.75rem;color:var(--text-muted)">Channel aborted due to eavesdropping disturbance. Message never transmitted.</span>`;
        }
        if (eveDecryptedBox) {
          eveDecryptedBox.innerHTML = `<span style="color:var(--accent-pink);font-weight:700">❌ 0 BYTES INTERCEPTED</span><br /><span style="font-size:0.75rem;color:var(--text-muted)">Eve's tampering was exposed during sifting! Eve intercepted 0 characters of Alice's text.</span>`;
        }
        return;
      }

      // Secure transmission
      const enc = engine.encryptMessage(text, currentResults.finalKeyAlice);
      if (cipherOutputBox) {
        cipherOutputBox.innerHTML = `<span style="color:#38bdf8;word-break:break-all;">${enc.cipherHex}</span><br /><span style="font-size:0.72rem;color:var(--accent-emerald)">✓ Encrypted with ${currentResults.finalKeyAlice.length}-bit QKD Distilled Key</span>`;
      }
      if (bobDecryptedBox) {
        bobDecryptedBox.innerHTML = `<span style="color:#34d399;font-weight:600;">"${enc.bobPlaintext}"</span><br /><span style="font-size:0.72rem;color:var(--accent-emerald)">✓ Perfect 100% Decryption (0 bit errors)</span>`;
      }
      if (eveDecryptedBox) {
        eveDecryptedBox.innerHTML = `<span style="color:var(--accent-pink);font-family:var(--font-mono);word-break:break-all;">"${enc.eveCorruptedText || 'Ø'}"</span><br /><span style="font-size:0.72rem;color:var(--text-dim)">Pure random noise. Eve has ΔI = 0 advantage on distilled key!</span>`;
      }
    });
  }

  // PQC Comparison Table Population
  const pqcTableBody = document.getElementById('pqcTableBody');
  if (pqcTableBody) {
    const data = engine.getPQCComparisonData();
    pqcTableBody.innerHTML = '';
    data.standards.forEach(s => {
      const tr = document.createElement('tr');
      const isQKD = s.name.includes('BB84');
      tr.innerHTML = `
        <td><strong style="color:${isQKD ? 'var(--accent-pink-glow)' : '#c084fc'}">${s.name}</strong><br /><span style="font-size:0.75rem;color:var(--text-dim)">${s.type}</span></td>
        <td><span class="badge-pqc ${isQKD ? 'badge-bb84' : 'badge-kyber'}">${s.securityBasis}</span></td>
        <td>${s.quantumSecurityLevel}</td>
        <td>${s.hardwareReqs}</td>
        <td>${s.throughput}</td>
        <td>${s.maxDistanceWithoutRepeaters}</td>
        <td>${s.networkScalability}</td>
      `;
      pqcTableBody.appendChild(tr);
    });
  }

  // Start Animation and Initial Run
  animate();
  runSimulation();
});
