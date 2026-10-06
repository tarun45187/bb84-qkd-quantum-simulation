# Information-Theoretic Cybersecurity via BB84 QKD & PQC Benchmarking

> **Track 7:** Information-Theoretic Cybersecurity via BB84 QKD (RPI Prompt)  
> **Platform:** IBM Quantum & Qiskit SDK  
> **Video Demonstration:** [PASTE YOUR YOUTUBE/LOOM/DRIVE LINK HERE]

---

## Table of Contents

- [Problem Statement Addressed](#a-problem-statement-addressed)
- [Circuit Design & Methodology](#b-circuit-design--methodology)
- [Installation & Execution Commands](#c-installation--execution-commands)
- [Key Output Figures & Metrics](#d-key-output-figures--metrics)
  - [Clean Channel (No Eavesdropper)](#clean-channel-no-eavesdropper)
  - [Intercept-Resend Attack (Eve Active)](#intercept-resend-attack-eve-active)
  - [PQC Comparative Result](#pqc-comparative-result)
- [Project Structure](#project-structure)
- [License](#license)

---

## (a) Problem Statement Addressed

Classical asymmetric encryption is vulnerable to Shor's algorithm on fault-tolerant quantum computers. This project implements an end-to-end BB84 Quantum Key Distribution (QKD) protocol using IBM Qiskit, evaluating information leakage under channel noise and eavesdropping, while benchmarking against NIST Post-Quantum Cryptography (ML-KEM / Kyber).

## (b) Circuit Design & Methodology

1. **State Preparation:** Alice encodes random bits in Rectilinear (Z) or Diagonal (X) bases.
2. **Eavesdropping Simulation:**
   - Intercept-Resend: Eve measures in random bases and re-prepares states.
   - Entanglement: Probe qubits coupled via CNOT gates.
3. **Sifting & Post-Processing:** Public basis reconciliation, QBER calculation, error correction (Cascade/Winnow), and privacy amplification (Toeplitz hashing).
4. **PQC Comparative Study:** Benchmarking BB84 QKD against NIST FIPS 203 ML-KEM (Kyber-512/768/1024).

## (c) Installation & Execution Commands

```bash
# Clone the repository
git clone https://github.com/tarun45187/bb84-qkd-quantum-simulation.git
cd bb84-qkd-quantum-simulation

# ── Python Qiskit Pipeline ──
pip install -r requirements.txt
python bb84_qiskit_pipeline.py

# ── Web Dashboard (Node.js) ──
cd server
npm install
npm start
# Open http://localhost:3000 in your browser
```

## (d) Key Output Figures & Metrics

### Clean Channel (No Eavesdropper)

Based on our 64-qubit simulation pipeline over a 15.0 km fiber configuration with no attack:
- **Quantum Bit Error Rate (QBER):** ~1% (channel noise only)
- **Binary Shannon Entropy H₂(QBER):** ~0.081
- **Asymptotic Secret Key Rate (R):** ~0.838 (83.8%)
- **Mutual Info Advantage (ΔI):** +0.919 (Valid since ΔI > 0)
- **Protocol Status:** ✅ SECURE — Key Distilled Successfully

### Intercept-Resend Attack (Eve Active)

- **Quantum Bit Error Rate (QBER):** ~25% (exceeds 11% Shor-Preskill threshold)
- **Binary Shannon Entropy H₂(QBER):** ~0.811
- **Asymptotic Secret Key Rate (R):** 0.000 (0%)
- **Protocol Status:** 🚨 ABORTED — Eavesdropper Detected

### PQC Comparative Result

BB84 provides **information-theoretic** (unconditional) security independent of computational assumptions, whereas ML-KEM offers software-deployable lattice-based security suitable for global internet deployment.

---

## Project Structure

```
├── index.html                  # Main interactive simulator & dashboard
├── pqc-benchmark.html          # PQC comparative benchmark studio
├── project-architecture.html   # Theory & mathematical foundations
├── reference.html              # References & contact
├── bb84_qiskit_pipeline.py     # Complete Qiskit BB84 simulation pipeline
├── requirements.txt            # Python dependencies (qiskit, qiskit-aer)
├── assets/
│   ├── js/quantum-engine.js    # BB84 simulation engine (JavaScript)
│   ├── js/quantum-ui.js        # UI controller & canvas visualizer
│   └── css/quantum.css         # Dark theme quantum styling
└── server/
    ├── server.js               # Express.js static server & API
    └── package.json            # Node.js dependencies
```

## License

This project was developed for the IBM Qiskit Fall Fest 2026 Hackathon (Track 07).