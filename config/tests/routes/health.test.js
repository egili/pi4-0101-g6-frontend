const request = require("supertest");
const { createApp } = require("../../src/app");

describe("GET /api/health", () => {
  const app = createApp();

  test("retorna status da API", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ok: true,
      service: "cofre-senhas-backend",
      status: "up",
    });
  });

  test("rota inexistente retorna 404", async () => {
    const response = await request(app).get("/api/nao-existe");

    expect(response.status).toBe(404);
    expect(response.body.ok).toBe(false);
  });
});
