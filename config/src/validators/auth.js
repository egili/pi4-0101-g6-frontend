/**
 * Validações iniciais para credenciais mestras.
 * Expandir conforme o backend for crescendo.
 */

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateUsername(username) {
  if (!isNonEmptyString(username)) {
    return { valid: false, error: "Usuário é obrigatório" };
  }

  const normalized = username.trim();

  if (normalized.length < 3) {
    return { valid: false, error: "Usuário deve ter pelo menos 3 caracteres" };
  }

  if (normalized.length > 32) {
    return { valid: false, error: "Usuário deve ter no máximo 32 caracteres" };
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(normalized)) {
    return {
      valid: false,
      error: "Usuário contém caracteres inválidos",
    };
  }

  return { valid: true, value: normalized };
}

function validateEmail(email) {
  if (!isNonEmptyString(email)) {
    return { valid: false, error: "E-mail é obrigatório" };
  }

  const normalized = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(normalized)) {
    return { valid: false, error: "E-mail inválido" };
  }

  return { valid: true, value: normalized };
}

function validateMasterPassword(password) {
  if (!isNonEmptyString(password)) {
    return { valid: false, error: "Senha mestra é obrigatória" };
  }

  if (password.length < 8) {
    return {
      valid: false,
      error: "Senha mestra deve ter pelo menos 8 caracteres",
    };
  }

  return { valid: true };
}

function validateRegistration({ username, email }) {
  const usernameResult = validateUsername(username);
  if (!usernameResult.valid) return usernameResult;

  const emailResult = validateEmail(email);
  if (!emailResult.valid) return emailResult;

  return {
    valid: true,
    value: {
      username: usernameResult.value,
      email: emailResult.value,
    },
  };
}

function validateLogin({ usernameOrEmail, password }) {
  if (!isNonEmptyString(usernameOrEmail)) {
    return { valid: false, error: "Usuário ou e-mail é obrigatório" };
  }

  const passwordResult = validateMasterPassword(password);
  if (!passwordResult.valid) return passwordResult;

  return {
    valid: true,
    value: {
      usernameOrEmail: usernameOrEmail.trim(),
    },
  };
}

module.exports = {
  validateUsername,
  validateEmail,
  validateMasterPassword,
  validateRegistration,
  validateLogin,
};
