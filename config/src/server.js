const { createApp } = require("./app");

const PORT = process.env.PORT || 3000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`Cofre de Senhas API rodando em http://localhost:${PORT}`);
});
