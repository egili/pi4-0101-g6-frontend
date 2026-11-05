#!/usr/bin/env node
/**
 * Script Utilitário: Salvar Credencial (H05.3 / CT2)
 *
 * Execução: node scripts/salvarCredencial.js
 *
 * 1. Solicita interativamente: serviço, usuário e senha (com digitação mascarada com asteriscos).
 * 2. Cifra a senha localmente usando AES-256-GCM com IV aleatório e exclusivo de 12 bytes.
 * 3. Envia os dados cifrados e o IV via HTTP POST para o Back-end 1 (/credentials).
 * 4. Exibe a confirmação de sucesso com o ID gerado ou mensagem clara de erro.
 */

const readline = require("readline");
const crypto = require("crypto");

const BACKEND1_URL = process.env.BACKEND1_URL || "http://localhost:8080";
const JWT_SECRET = process.env.JWT_SECRET || "cofre-digital-chave-secreta-zero-trust-jwt-token-2026-pi4";

/**
 * Lê entrada do usuário com mascaramento de caracteres na digitação da senha.
 */
function readMaskedInput(promptText) {
  return new Promise((resolve) => {
    process.stdout.write(promptText);

    let input = "";
    const wasRaw = process.stdin.isRaw;

    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    function onData(chunk) {
      for (const char of chunk) {
        if (char === "\n" || char === "\r" || char === "\u0004") {
          // Enter ou fim de linha
          if (process.stdin.setRawMode) {
            process.stdin.setRawMode(wasRaw || false);
          }
          process.stdin.pause();
          process.stdin.removeListener("data", onData);
          process.stdout.write("\n");
          resolve(input);
          return;
        } else if (char === "\u0003") {
          // Ctrl+C
          process.stdout.write("\nOperação cancelada pelo usuário.\n");
          process.exit(130);
        } else if (char === "\u0008" || char === "\x7f") {
          // Backspace
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write("\b \b");
          }
        } else {
          // Caractere digitado mascarado com asterisco
          input += char;
          process.stdout.write("*");
        }
      }
    }

    process.stdin.on("data", onData);
  });
}

function readLineInput(promptText) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Cifragem local com AES-256-GCM (12 bytes IV, tag de autenticação de 16 bytes).
 * Idêntica à implementação do Módulo de Criptografia do Java.
 */
function cifrarLocalmente(textoPlano, chaveBase64) {
  const iv = crypto.randomBytes(12);
  const chave = Buffer.from(chaveBase64, "base64");
  const cipher = crypto.createCipheriv("aes-256-gcm", chave, iv);

  let encrypted = cipher.update(textoPlano, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag(); // 16 bytes tag de integridade

  // O Java AES/GCM/NoPadding anexa a tag de autenticação ao final dos dados cifrados
  const dadosCifrados = Buffer.concat([encrypted, authTag]).toString("base64");
  const ivBase64 = iv.toString("base64");

  return { dadosCifrados, iv: ivBase64 };
}

/**
 * Gera um token JWT HS256 padrão para autenticação no Back-end 1.
 */
function gerarTokenLocal(usuarioId, username) {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" }))
    .toString("base64url");

  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      sub: String(usuarioId),
      usuarioId: usuarioId,
      username: username,
      iat: now,
      exp: now + 86400,
    })
  ).toString("base64url");

  const content = `${header}.${payload}`;
  const signature = crypto
    .createHmac("sha256", JWT_SECRET)
    .update(content)
    .digest("base64url");

  return `${content}.${signature}`;
}

async function main() {
  console.log("=================================================");
  console.log(" Cofre Digital — Comando Interativo: Salvar Credencial (CT2)");
  console.log(" Arquitetura Zero-Trust: A senha é cifrada localmente");
  console.log("=================================================\n");

  const servico = await readLineInput("1. Nome do serviço (ex: Gmail, GitHub): ");
  if (!servico) {
    console.error("\n[ERRO] O nome do serviço é obrigatório.");
    process.exit(1);
  }

  const usuarioServico = await readLineInput("2. Usuário / Login do serviço (ex: meu_email@gmail.com): ");
  if (!usuarioServico) {
    console.error("\n[ERRO] O login do serviço é obrigatório.");
    process.exit(1);
  }

  const senha = await readMaskedInput("3. Digite a senha a ser salva (digitação mascarada): ");
  if (!senha) {
    console.error("\n[ERRO] A senha não pode ser vazia.");
    process.exit(1);
  }

  // Chave simétrica derivada da sessão
  let chaveCifra = process.env.CHAVE_CIFRA;
  if (!chaveCifra) {
    // 32 bytes aleatórios (256 bits) para a sessão local
    chaveCifra = crypto.randomBytes(32).toString("base64");
  }

  console.log("\n[1/3] Cifrando senha localmente no cliente (AES-256-GCM)...");
  const { dadosCifrados, iv } = cifrarLocalmente(senha, chaveCifra);
  console.log("      - IV único gerado (12 bytes Base64):", iv);
  console.log("      - Payload cifrado:", dadosCifrados.substring(0, 24) + "...");

  // Token JWT
  let token = process.env.TOKEN || process.env.AUTH_TOKEN;
  if (!token) {
    const tokenInformado = await readLineInput("\nInforme o Token JWT ativo (pressione Enter para gerar token de sessão padrão [UID=1]): ");
    token = tokenInformado || gerarTokenLocal(1, "usuario.sessao");
  }

  console.log("\n[2/3] Enviando credencial cifrada ao servidor:", `${BACKEND1_URL}/credentials`);

  try {
    const response = await fetch(`${BACKEND1_URL.replace(/\/$/, "")}/credentials`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        tokenSessao: token,
      },
      body: JSON.stringify({
        servico,
        usuarioServico,
        dadosCifrados,
        iv,
      }),
    });

    const body = await response.json().catch(() => null);

    console.log("\n[3/3] Resposta do Servidor:");
    if (response.status === 201) {
      console.log("=================================================");
      console.log(" ✔ SUCESSO: Credencial salva com sucesso!");
      console.log(`   - ID Gerado no Banco: ${body?.credencialId || body?.id || "Confirmado"}`);
      console.log(`   - Serviço: ${servico}`);
      console.log(`   - Usuário: ${usuarioServico}`);
      console.log("=================================================\n");
    } else {
      console.log("=================================================");
      console.error(` ✖ FALHA (HTTP ${response.status}):`);
      const codigoErro = body?.erro || body?.error || "ERRO_DESCONHECIDO";
      console.error(`   - Código do erro: ${codigoErro}`);
      if (codigoErro === "SESSAO_INVALIDA") {
        console.error("   - Motivo: Token JWT inválido ou sessão expirada. Faça login novamente.");
      } else if (codigoErro === "DADOS_INVALIDOS") {
        console.error("   - Motivo: Campos obrigatórios ausentes ou payload corrompido.");
      } else if (codigoErro === "USUARIO_NAO_ENCONTRADO") {
        console.error("   - Motivo: O usuário dono do token não foi localizado na tabela usuario.");
      } else {
        console.error(`   - Mensagem: ${body?.mensagem || "Verifique os logs do servidor."}`);
      }
      console.log("=================================================\n");
      process.exit(1);
    }
  } catch (err) {
    console.error("\n[ERRO DE CONEXÃO] Falha ao comunicar com o servidor Back-end 1:", err.message);
    console.error("Certifique-se de que o Back-end 1 está em execução na porta 8080.\n");
    process.exit(1);
  }
}

main();

