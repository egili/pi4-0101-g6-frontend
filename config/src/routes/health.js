const express = require("express");

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    ok: true,
    service: "cofre-senhas-backend",
    status: "up",
  });
});

module.exports = router;
