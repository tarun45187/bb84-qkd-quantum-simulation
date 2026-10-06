const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, "..");

app.use(cors());
app.use(express.json());
app.use(express.static(ROOT));

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "QuantumLab BB84 & NIST PQC Laboratory API",
    version: "2.0.0",
    modules: [
      "1. State Preparation & Quantum Channel",
      "2. Eavesdropping Attacks (Intercept-Resend & CNOT Probe)",
      "3. Sifting, Cascade Error Correction & Toeplitz Hashing",
      "4. Post-Quantum Cryptography Comparative Study (ML-KEM / Kyber)"
    ]
  });
});

// Fallback to index.html for single-page routing
app.get("*", (req, res) => {
  res.sendFile(path.join(ROOT, "index.html"));
});

app.listen(PORT, () => {
  console.log(`[QuantumLab Server] Running at http://localhost:${PORT}`);
});
