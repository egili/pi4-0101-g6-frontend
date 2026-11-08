const path = require("path");
const express = require("express");
const healthRoutes = require("./routes/health");

function createApp({ publicDir = path.join(__dirname, "..", "public") } = {}) {
  const app = express();

  app.use(express.json());
  app.use("/api", healthRoutes);
  app.use(express.static(publicDir));

  app.use((req, res) => {
    res.status(404).json({
      ok: false,
      message: "Rota não encontrada",
    });
  });

  return app;
}

module.exports = { createApp };
