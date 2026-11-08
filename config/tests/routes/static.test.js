const fs = require("fs");
const os = require("os");
const path = require("path");
const request = require("supertest");
const { createApp } = require("../../src/app");

describe("páginas do front", () => {
  let pasta;

  beforeAll(() => {
    pasta = fs.mkdtempSync(path.join(os.tmpdir(), "cofre-front-"));
    fs.writeFileSync(path.join(pasta, "index.html"), "<h1>Login do Cofre</h1>");
    fs.writeFileSync(path.join(pasta, "cofre.html"), "<h1>Meu cofre</h1>");
  });

  afterAll(() => {
    fs.rmSync(pasta, { recursive: true, force: true });
  });

  test("serve index.html na raiz", async () => {
    const response = await request(createApp({ publicDir: pasta })).get("/");

    expect(response.status).toBe(200);
    expect(response.text).toContain("Login do Cofre");
  });

  test("serve cofre.html", async () => {
    const response = await request(createApp({ publicDir: pasta })).get("/cofre.html");

    expect(response.status).toBe(200);
    expect(response.text).toContain("Meu cofre");
  });

  test("a API continua respondendo antes dos arquivos estáticos", async () => {
    const response = await request(createApp({ publicDir: pasta })).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("up");
  });
});
