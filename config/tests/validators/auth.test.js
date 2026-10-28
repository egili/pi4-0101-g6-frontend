const {
  validateUsername,
  validateEmail,
  validateMasterPassword,
  validateRegistration,
  validateLogin,
} = require("../../src/validators/auth");

describe("validateUsername", () => {
  test("aceita usuário válido", () => {
    expect(validateUsername("william")).toEqual({
      valid: true,
      value: "william",
    });
  });

  test("rejeita usuário vazio", () => {
    expect(validateUsername("")).toEqual({
      valid: false,
      error: "Usuário é obrigatório",
    });
  });

  test("rejeita usuário curto demais", () => {
    expect(validateUsername("ab")).toEqual({
      valid: false,
      error: "Usuário deve ter pelo menos 3 caracteres",
    });
  });

  test("rejeita caracteres inválidos", () => {
    expect(validateUsername("will@123")).toMatchObject({
      valid: false,
    });
  });
});

describe("validateEmail", () => {
  test("aceita e-mail válido e normaliza", () => {
    expect(validateEmail("  Will@Email.COM ")).toEqual({
      valid: true,
      value: "will@email.com",
    });
  });

  test("rejeita e-mail inválido", () => {
    expect(validateEmail("sem-arroba")).toEqual({
      valid: false,
      error: "E-mail inválido",
    });
  });
});

describe("validateMasterPassword", () => {
  test("aceita senha com 8+ caracteres", () => {
    expect(validateMasterPassword("senha123")).toEqual({ valid: true });
  });

  test("rejeita senha curta", () => {
    expect(validateMasterPassword("1234567")).toEqual({
      valid: false,
      error: "Senha mestra deve ter pelo menos 8 caracteres",
    });
  });
});

describe("validateRegistration", () => {
  test("valida registro completo", () => {
    expect(
      validateRegistration({
        username: "william",
        email: "will@email.com",
      })
    ).toEqual({
      valid: true,
      value: {
        username: "william",
        email: "will@email.com",
      },
    });
  });

  test("falha se e-mail for inválido", () => {
    expect(
      validateRegistration({
        username: "william",
        email: "invalido",
      })
    ).toMatchObject({ valid: false });
  });
});

describe("validateLogin", () => {
  test("valida login com usuário e senha", () => {
    expect(
      validateLogin({
        usernameOrEmail: "william",
        password: "senha12345",
      })
    ).toEqual({
      valid: true,
      value: { usernameOrEmail: "william" },
    });
  });

  test("rejeita login sem senha", () => {
    expect(
      validateLogin({
        usernameOrEmail: "william",
        password: "",
      })
    ).toMatchObject({ valid: false });
  });
});
