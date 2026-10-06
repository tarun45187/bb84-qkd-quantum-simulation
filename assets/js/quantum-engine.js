/**
 * Quantum Cryptography Simulation Engine (BB84 & PQC Benchmarking)
 * Implements:
 * 1. State Preparation & Quantum Channel (Z & X bases, fiber attenuation, depolarization noise)
 * 2. Eavesdropping Attacks (Intercept-Resend & CNOT Ancilla Probe)
 * 3. Measurement, Sifting, Error Correction (Cascade) & Privacy Amplification (Toeplitz)
 * 4. Post-Quantum Cryptography (ML-KEM / Kyber) Comparative Metrics
 * Quantitative Metrics: QBER, Asymptotic Secret Key Rate R >= 1 - 2H_2(QBER), Delta I
 */

(function(root) {
  'use strict';

  // Constants
  const BASES = {
    Z: 'Z', // Rectilinear: |0>, |1> (0 deg, 90 deg)
    X: 'X'  // Diagonal: |+>, |-> (+45 deg, -45 deg)
  };

  const SHOR_PRESKILL_ABORT_THRESHOLD = 0.1100; // 11.0%

  // Shannon Entropy
  function binaryShannonEntropy(p) {
    if (p <= 0 || p >= 1) return 0;
    return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
  }

  // PRNG helper
  function randomBit() {
    return Math.random() < 0.5 ? 0 : 1;
  }

  function randomBasis() {
    return Math.random() < 0.5 ? BASES.Z : BASES.X;
  }

  // Quantum Simulation Engine Class
  class QuantumEngine {
    constructor(config = {}) {
      this.config = Object.assign({
        numQubits: 64,
        fiberLengthKm: 15, // km
        attenuationDbPerKm: 0.2, // dB/km standard single-mode fiber
        depolarizationNoise: 0.02, // 2% baseline channel noise
        darkCountRate: 0.001,
        attackMode: 'none', // 'none' | 'intercept-resend' | 'entanglement-cnot'
        eveTapPercentage: 100, // 0 - 100%
        cnotCouplingAngle: 90, // degrees: 90 = full CNOT coupling
        sacrificeFraction: 0.25, // 25% of sifted bits used for QBER test
        cascadeBlockSize: 4,
        privacyAmpSecurityParam: 8
      }, config);

      this.results = null;
    }

    setConfig(newConfig) {
      this.config = Object.assign(this.config, newConfig);
    }

    /**
     * Run full BB84 simulation according to the 4 modules
     */
    simulate() {
      const cfg = this.config;
      const numQubits = Math.max(16, parseInt(cfg.numQubits) || 64);
      const qubits = [];

      // Fiber transmittance calculation: eta = 10^(-alpha * L / 10)
      const fiberTransmittance = Math.pow(10, -(cfg.attenuationDbPerKm * cfg.fiberLengthKm) / 10);

      // MODULE 1: State Preparation (Alice)
      for (let i = 0; i < numQubits; i++) {
        const aliceBit = randomBit();
        const aliceBasis = randomBasis();

        // State representation:
        // Z basis: 0 -> |0> (0 deg), 1 -> |1> (90 deg)
        // X basis: 0 -> |+> (45 deg), 1 -> |-> (135 deg)
        let stateLabel = '';
        let polarizationAngle = 0;
        if (aliceBasis === BASES.Z) {
          stateLabel = aliceBit === 0 ? '|0⟩' : '|1⟩';
          polarizationAngle = aliceBit === 0 ? 0 : 90;
        } else {
          stateLabel = aliceBit === 0 ? '|+⟩' : '|−⟩';
          polarizationAngle = aliceBit === 0 ? 45 : 135;
        }

        qubits.push({
          id: i,
          aliceBit,
          aliceBasis,
          aliceState: stateLabel,
          polarizationAngle,
          // Channel transmission tracking
          transmitted: true,
          // Eve tracking
          eveTapped: false,
          eveBasis: null,
          eveMeasuredBit: null,
          eveState: null,
          // Bob tracking
          bobBasis: null,
          bobMeasuredBit: null,
          // Pipeline state
          sifted: false,
          sacrificed: false,
          isError: false,
          cascadeCorrected: false,
          finalKeyBit: null
        });
      }

      // MODULE 2: Quantum Channel & Eavesdropping Attacks (Eve)
      const eveTapRate = (cfg.eveTapPercentage || 0) / 100;

      for (let i = 0; i < numQubits; i++) {
        const q = qubits[i];
        let incomingBit = q.aliceBit;
        let incomingBasis = q.aliceBasis;

        // Channel depolarization noise flip (Pauli channel)
        if (Math.random() < cfg.depolarizationNoise) {
          incomingBit = 1 - incomingBit;
        }

        if (cfg.attackMode === 'intercept-resend') {
          // Eve taps with probability eveTapRate
          if (Math.random() < eveTapRate) {
            q.eveTapped = true;
            q.eveBasis = randomBasis();

            // Eve measures photon
            if (q.eveBasis === incomingBasis) {
              q.eveMeasuredBit = incomingBit;
            } else {
              // Wrong basis: 50% random collapse
              q.eveMeasuredBit = randomBit();
            }

            // Eve reprepairs state in her measured basis and forwards to Bob
            q.eveState = q.eveBasis === BASES.Z
              ? (q.eveMeasuredBit === 0 ? '|0⟩' : '|1⟩')
              : (q.eveMeasuredBit === 0 ? '|+⟩' : '|−⟩');

            incomingBit = q.eveMeasuredBit;
            incomingBasis = q.eveBasis;
          }
        } else if (cfg.attackMode === 'entanglement-cnot') {
          // Entanglement-based / Beam-Splitter Attack: Eve couples ancilla probe |0>_E via CNOT
          if (Math.random() < eveTapRate) {
            q.eveTapped = true;
            // Coupling strength based on coupling angle (default 90 deg = full CNOT)
            const couplingFactor = Math.sin((cfg.cnotCouplingAngle * Math.PI) / 180);
            
            // CNOT probe interaction:
            // If Alice sent in Z basis: CNOT copies bit perfectly without error: |b>_A |0>_E -> |b>_A |b>_E
            // If Alice sent in X basis: CNOT creates entanglement: |+>_A |0>_E -> (|00> + |11>)/sqrt(2) = (|+>|+> + |->|->)/sqrt(2)
            // Measuring in X basis induces 25% error rate on Bob for full coupling
            if (incomingBasis === BASES.Z) {
              q.eveMeasuredBit = incomingBit;
              q.eveBasis = BASES.Z;
            } else {
              // In X basis, CNOT causes disturbance
              if (Math.random() < 0.25 * couplingFactor) {
                incomingBit = 1 - incomingBit; // Disturbance induced by entanglement collapse
              }
              // Eve stores ancilla in quantum memory until basis is announced,
              // then measures in the announced basis (X)
              q.eveBasis = BASES.X;
              q.eveMeasuredBit = incomingBit; // Correlated measurement
            }

            q.eveState = 'Probe Ancilla (|e⟩)';
          }
        }

        // MODULE 3: Bob's Measurement
        q.bobBasis = randomBasis();

        if (q.bobBasis === incomingBasis) {
          // Basis matched: deterministic measurement
          q.bobMeasuredBit = incomingBit;
        } else {
          // Mismatched basis: 50/50 probability by Born's Rule
          q.bobMeasuredBit = randomBit();
        }

        // Dark count trigger (random detector click)
        if (Math.random() < cfg.darkCountRate) {
          q.bobMeasuredBit = 1 - q.bobMeasuredBit;
        }
      }

      // MODULE 3 Part B: Public Basis Reconciliation (Sifting)
      const siftedIndices = [];
      for (let i = 0; i < numQubits; i++) {
        const q = qubits[i];
        if (q.aliceBasis === q.bobBasis) {
          q.sifted = true;
          siftedIndices.push(i);
        } else {
          q.sifted = false;
        }
      }

      const totalSifted = siftedIndices.length;

      // MODULE 3 Part C: QBER Calculation over Sacrificed Sample
      const sampleSize = Math.max(2, Math.floor(totalSifted * cfg.sacrificeFraction));
      // Shuffle sifted indices to pick random sacrificed sample
      const shuffledSifted = siftedIndices.slice().sort(() => Math.random() - 0.5);
      const sacrificedIndices = shuffledSifted.slice(0, sampleSize);
      const remainingSiftedIndices = shuffledSifted.slice(sampleSize);

      let sampleErrors = 0;
      sacrificedIndices.forEach(idx => {
        const q = qubits[idx];
        q.sacrificed = true;
        if (q.aliceBit !== q.bobMeasuredBit) {
          q.isError = true;
          sampleErrors++;
        }
      });

      const qber = sampleSize > 0 ? (sampleErrors / sampleSize) : 0;
      const isAborted = qber > SHOR_PRESKILL_ABORT_THRESHOLD;

      // MODULE 3 Part D: Classical Error Correction (Cascade Protocol on remaining key)
      const remainingAliceBits = [];
      const remainingBobBits = [];
      const remainingIndicesClean = [];

      remainingSiftedIndices.forEach(idx => {
        const q = qubits[idx];
        remainingAliceBits.push(q.aliceBit);
        remainingBobBits.push(q.bobMeasuredBit);
        remainingIndicesClean.push(idx);
        if (q.aliceBit !== q.bobMeasuredBit) {
          q.isError = true;
        }
      });

      // Cascade parity correction simulation
      const cascadeLog = [];
      const blockSize = Math.max(2, cfg.cascadeBlockSize || 4);
      let correctedErrorsCount = 0;
      let parityBitsDisclosed = 0;

      if (!isAborted && remainingAliceBits.length > 0) {
        // Pass 1: Block parity comparison
        const numBlocks = Math.ceil(remainingAliceBits.length / blockSize);
        for (let b = 0; b < numBlocks; b++) {
          const start = b * blockSize;
          const end = Math.min(remainingAliceBits.length, start + blockSize);
          parityBitsDisclosed++;

          let aliceParity = 0;
          let bobParity = 0;
          for (let k = start; k < end; k++) {
            aliceParity ^= remainingAliceBits[k];
            bobParity ^= remainingBobBits[k];
          }

          if (aliceParity !== bobParity) {
            // Parity mismatch: dichotomic search locates the error
            for (let k = start; k < end; k++) {
              if (remainingAliceBits[k] !== remainingBobBits[k]) {
                remainingBobBits[k] = remainingAliceBits[k]; // Correct error
                qubits[remainingIndicesClean[k]].cascadeCorrected = true;
                correctedErrorsCount++;
                parityBitsDisclosed += Math.ceil(Math.log2(blockSize));
                break;
              }
            }
            cascadeLog.push({ block: b, start, end, status: 'corrected' });
          } else {
            cascadeLog.push({ block: b, start, end, status: 'match' });
          }
        }
      }

      // MODULE 3 Part E: Privacy Amplification (Toeplitz Hashing)
      // Asymptotic Secret Key Rate: R >= 1 - 2 * H_2(QBER)
      const h2Qber = binaryShannonEntropy(qber);
      const theoreticalKeyRate = isAborted ? 0 : Math.max(0, 1 - 2 * h2Qber);

      let finalKeyAlice = [];
      let finalKeyBob = [];
      let toeplitzMatrix = [];

      if (!isAborted && remainingAliceBits.length > 0 && theoreticalKeyRate > 0) {
        const rawKeyLength = remainingAliceBits.length;
        // Target distilled key length: m <= n * (1 - 2*H_2(QBER)) - security_param
        const targetKeyLength = Math.max(1, Math.floor(rawKeyLength * theoreticalKeyRate) - cfg.privacyAmpSecurityParam);
        
        if (targetKeyLength > 0) {
          // Construct Toeplitz Matrix T of dimension m x n
          // Defined by m + n - 1 random bits
          const toeplitzSeed = [];
          for (let s = 0; s < targetKeyLength + rawKeyLength - 1; s++) {
            toeplitzSeed.push(randomBit());
          }

          for (let r = 0; r < targetKeyLength; r++) {
            const row = [];
            for (let c = 0; c < rawKeyLength; c++) {
              // Toeplitz property: T[r][c] = seed[r - c + (n - 1)]
              row.push(toeplitzSeed[r - c + (rawKeyLength - 1)]);
            }
            toeplitzMatrix.push(row);
          }

          // Matrix-vector multiplication over GF(2): K_final = T * K_corrected (mod 2)
          for (let r = 0; r < targetKeyLength; r++) {
            let bitA = 0;
            let bitB = 0;
            for (let c = 0; c < rawKeyLength; c++) {
              bitA ^= (toeplitzMatrix[r][c] & remainingAliceBits[c]);
              bitB ^= (toeplitzMatrix[r][c] & remainingBobBits[c]);
            }
            finalKeyAlice.push(bitA);
            finalKeyBob.push(bitB);
          }
        }
      }

      // Mark final key bits on qubits for UI
      finalKeyAlice.forEach((bit, idx) => {
        if (idx < remainingIndicesClean.length) {
          qubits[remainingIndicesClean[idx]].finalKeyBit = bit;
        }
      });

      // KEY QUANTITATIVE METRICS COMPUTATION
      // 1. Quantum Bit Error Rate (QBER): QBER = N_error / N_sifted
      // 2. Asymptotic Secret Key Rate (R): R >= 1 - 2H_2(QBER)
      // 3. Mutual Information Advantage: Delta I = I(A; B) - I(A; E)
      const mutualInfoAliceBob = 1 - h2Qber;
      
      let mutualInfoAliceEve = 0;
      if (cfg.attackMode === 'intercept-resend') {
        // For 100% intercept-resend, Eve gets full info on 50% matching bases: I(A;E) = eveTapRate * 0.5
        mutualInfoAliceEve = eveTapRate * 0.5;
      } else if (cfg.attackMode === 'entanglement-cnot') {
        // CNOT ancilla probe bounds: I(A;E) ~ H_2(QBER)
        mutualInfoAliceEve = Math.min(1, h2Qber * (cfg.cnotCouplingAngle / 90));
      } else {
        mutualInfoAliceEve = 0;
      }

      const deltaI = mutualInfoAliceBob - mutualInfoAliceEve;
      const isPositiveDistillableKey = deltaI > 0 && !isAborted;

      this.results = {
        qubits,
        totalTransmitted: numQubits,
        totalSifted,
        sampleSize,
        sampleErrors,
        qber,
        qberPercentage: (qber * 100).toFixed(2),
        isAborted,
        shorPreskillThreshold: SHOR_PRESKILL_ABORT_THRESHOLD,
        shorPreskillPercentage: (SHOR_PRESKILL_ABORT_THRESHOLD * 100).toFixed(1),
        h2Qber,
        asymptoticSecretKeyRate: theoreticalKeyRate,
        mutualInfoAliceBob,
        mutualInfoAliceEve,
        deltaI,
        isPositiveDistillableKey,
        cascadeLog,
        correctedErrorsCount,
        parityBitsDisclosed,
        finalKeyAlice,
        finalKeyBob,
        finalKeyAliceHex: this._bitsToHex(finalKeyAlice),
        finalKeyBobHex: this._bitsToHex(finalKeyBob),
        keysMatch: finalKeyAlice.length > 0 && finalKeyAlice.join('') === finalKeyBob.join('')
      };

      return this.results;
    }

    _bitsToHex(bits) {
      if (!bits || bits.length === 0) return 'None';
      let hex = '';
      for (let i = 0; i < bits.length; i += 4) {
        const chunk = bits.slice(i, i + 4);
        let val = 0;
        for (let j = 0; j < chunk.length; j++) {
          val = (val << 1) | chunk[j];
        }
        hex += val.toString(16).toUpperCase();
      }
      return hex;
    }

    /**
     * MODULE 4: Post-Quantum Cryptography Comparative Data (BB84 vs NIST ML-KEM)
     */
    getPQCComparisonData() {
      return {
        standards: [
          {
            name: 'BB84 QKD',
            type: 'Quantum Key Distribution',
            securityBasis: 'Information-Theoretic (Heisenberg Uncertainty & No-Cloning)',
            hardnessAssumption: 'Fundamental Quantum Mechanics (Unconditional)',
            quantumSecurityLevel: 'Immune to all quantum/classical algorithmic advances',
            hardwareReqs: 'Single-photon source/laser, optical fiber, cryogenic single-photon detectors (SPAD / SNSPD)',
            throughput: '~10 - 100 kbps (15 km fiber), decays exponentially with distance',
            maxDistanceWithoutRepeaters: '100 - 150 km (optical attenuation limits)',
            networkScalability: 'Point-to-point dedicated optical paths or trusted node networks',
            keySize: 'Flexible continuous stream (e.g. 256-bit OTP or AES key blocks)',
            vulnerabilities: 'Detector blinding, side-channel trojan attacks, optical beam splitting'
          },
          {
            name: 'ML-KEM-512 (Kyber-512)',
            type: 'Post-Quantum Lattice KEM (NIST FIPS 203)',
            securityBasis: 'Computational Hardness (Module Learning With Errors / M-LWE)',
            hardnessAssumption: 'Shortest Vector Problem (SVP) in module lattices',
            quantumSecurityLevel: 'NIST Security Category 1 (equivalent to AES-128 brute force)',
            hardwareReqs: 'Standard commodity CPUs (x86, ARM, RISC-V, microcontrollers)',
            throughput: '> 100,000 operations/sec on modern desktop CPU',
            maxDistanceWithoutRepeaters: 'Unlimited (operates over existing TCP/IP internet, satellite, mesh)',
            networkScalability: 'Seamless drop-in for TLS 1.3, SSH, VPNs with zero infrastructure overhaul',
            keySize: 'Public Key: 800 bytes, Ciphertext: 768 bytes, Shared Secret: 32 bytes',
            vulnerabilities: 'Potential future mathematical lattice reduction breakthroughs, physical power side-channels'
          },
          {
            name: 'ML-KEM-768 (Kyber-768)',
            type: 'Post-Quantum Lattice KEM (NIST FIPS 203 Primary)',
            securityBasis: 'Computational Hardness (Module Learning With Errors / M-LWE)',
            hardnessAssumption: 'Shortest Vector Problem (SVP) in module lattices',
            quantumSecurityLevel: 'NIST Security Category 3 (equivalent to AES-192 brute force)',
            hardwareReqs: 'Standard commodity CPUs (x86, ARM, RISC-V)',
            throughput: '> 75,000 operations/sec on modern desktop CPU',
            maxDistanceWithoutRepeaters: 'Unlimited (standard internet packet routing)',
            networkScalability: 'Primary general-purpose post-quantum standard recommended by NIST & BSI',
            keySize: 'Public Key: 1,184 bytes, Ciphertext: 1,088 bytes, Shared Secret: 32 bytes',
            vulnerabilities: 'Implementation side-channels (differential power analysis, timing), lattice heuristics'
          },
          {
            name: 'ML-KEM-1024 (Kyber-1024)',
            type: 'Post-Quantum Lattice KEM (NIST FIPS 203 Top Tier)',
            securityBasis: 'Computational Hardness (Module Learning With Errors / M-LWE)',
            hardnessAssumption: 'Shortest Vector Problem (SVP) in module lattices',
            quantumSecurityLevel: 'NIST Security Category 5 (equivalent to AES-256 brute force)',
            hardwareReqs: 'Standard commodity CPUs',
            throughput: '> 50,000 operations/sec on modern desktop CPU',
            maxDistanceWithoutRepeaters: 'Unlimited (standard internet routing)',
            networkScalability: 'High-security defense and government installations',
            keySize: 'Public Key: 1,568 bytes, Ciphertext: 1,568 bytes, Shared Secret: 32 bytes',
            vulnerabilities: 'Side-channel fault injection, mathematical lattice cryptanalysis advances'
          }
        ]
      };
    }

    /**
     * Demo message encryption using distilled QKD key
     */
    encryptMessage(plaintext, keyBits) {
      if (!plaintext || !keyBits || keyBits.length === 0) {
        return { error: 'No key available. Run simulation first with QBER <= 11%.' };
      }

      // Convert plaintext string to binary
      const textEncoder = new TextEncoder();
      const bytes = textEncoder.encode(plaintext);
      const textBits = [];
      for (let b of bytes) {
        for (let i = 7; i >= 0; i--) {
          textBits.push((b >> i) & 1);
        }
      }

      // One-Time Pad / Stream cipher XOR with recycled or truncated key
      const ciphertextBits = [];
      const keyLength = keyBits.length;
      for (let i = 0; i < textBits.length; i++) {
        ciphertextBits.push(textBits[i] ^ keyBits[i % keyLength]);
      }

      // Convert ciphertext bits to hex string
      let cipherHex = '';
      for (let i = 0; i < ciphertextBits.length; i += 4) {
        const chunk = ciphertextBits.slice(i, i + 4);
        let val = 0;
        for (let j = 0; j < chunk.length; j++) {
          val = (val << 1) | chunk[j];
        }
        cipherHex += val.toString(16).toUpperCase();
      }

      // Bob decrypts with his matching key
      const bobDecryptedBits = [];
      for (let i = 0; i < ciphertextBits.length; i++) {
        bobDecryptedBits.push(ciphertextBits[i] ^ keyBits[i % keyLength]);
      }

      // Convert bits back to string
      const decBytes = [];
      for (let i = 0; i < bobDecryptedBits.length; i += 8) {
        let b = 0;
        for (let j = 0; j < 8 && (i + j) < bobDecryptedBits.length; j++) {
          b = (b << 1) | bobDecryptedBits[i + j];
        }
        decBytes.push(b);
      }
      const textDecoder = new TextDecoder();
      const bobPlaintext = textDecoder.decode(new Uint8Array(decBytes));

      // Eve attempts decryption with random guesses or partial leaked info
      const eveNoiseBits = ciphertextBits.map(bit => bit ^ (Math.random() < 0.5 ? 1 : 0));
      const eveBytes = [];
      for (let i = 0; i < eveNoiseBits.length; i += 8) {
        let b = 0;
        for (let j = 0; j < 8 && (i + j) < eveNoiseBits.length; j++) {
          b = (b << 1) | eveNoiseBits[i + j];
        }
        eveBytes.push(b);
      }
      const eveCorruptedText = String.fromCharCode(...eveBytes).replace(/[^\x20-\x7E]/g, '');

      return {
        plaintext,
        cipherHex,
        bobPlaintext,
        eveCorruptedText
      };
    }
  }

  // Export to global
  root.QuantumEngine = QuantumEngine;
  root.binaryShannonEntropy = binaryShannonEntropy;
  root.SHOR_PRESKILL_ABORT_THRESHOLD = SHOR_PRESKILL_ABORT_THRESHOLD;

})(typeof window !== 'undefined' ? window : this);
