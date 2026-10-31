/**
 * UI de conexão: testa BE1/BE2, avisa queda e orienta novo login.
 */
(function () {
  function garantirBanner() {
    let banner = document.getElementById("conexao-banner");
    if (banner) return banner;

    banner = document.createElement("div");
    banner.id = "conexao-banner";
    banner.className = "conexao-banner";
    banner.hidden = true;
    banner.innerHTML = `
      <div class="conexao-banner__inner">
        <p class="conexao-banner__texto" id="conexao-banner-texto"></p>
        <div class="conexao-banner__acoes">
          <button type="button" class="conexao-banner__btn" id="btn-testar-conexao">
            Testar conexão
          </button>
          <a class="conexao-banner__link" id="btn-novo-login" href="index.html">
            Novo login
          </a>
        </div>
      </div>
    `;
    document.body.prepend(banner);
    return banner;
  }

  function renderStatus(status) {
    const banner = garantirBanner();
    const texto = document.getElementById("conexao-banner-texto");
    if (!texto) return;

    const online = status.online === true;
    const pendente = status.online === null;

    banner.hidden = false;
    banner.classList.toggle("conexao-banner--ok", online);
    banner.classList.toggle("conexao-banner--erro", status.online === false);
    banner.classList.toggle("conexao-banner--pendente", pendente);

    let msg = status.mensagem || "";
    if (status.duranteGravacao || HttpClient.houveQuedaDuranteGravacao()) {
      msg +=
        (msg ? " " : "") +
        "Confira a lista de credenciais no cofre antes de repetir a gravação.";
    }
    texto.textContent = msg;

    const btnLogin = document.getElementById("btn-novo-login");
    if (btnLogin) {
      btnLogin.hidden = online || pendente;
    }
  }

  async function testarAgora(botao) {
    if (botao) {
      botao.disabled = true;
      botao.textContent = "Testando…";
    }

    try {
      const resultado = await HttpClient.testarConexoes();
      renderStatus(HttpClient.getStatus());

      if (
        resultado.online &&
        HttpClient.houveQuedaDuranteGravacao() &&
        !window.location.pathname.endsWith("cofre.html")
      ) {
        // Após reconectar, oriente a conferir a lista antes de repetir
        const status = HttpClient.getStatus();
        renderStatus({
          ...status,
          mensagem:
            "Conexão restabelecida. Faça login e confira a lista de credenciais antes de repetir qualquer gravação.",
          duranteGravacao: true,
        });
      }

      return resultado;
    } finally {
      if (botao) {
        botao.disabled = false;
        botao.textContent = "Testar conexão";
      }
    }
  }

  function iniciar() {
    if (!window.HttpClient) return;

    garantirBanner();
    renderStatus(HttpClient.getStatus());
    HttpClient.onStatusChange(renderStatus);

    document.addEventListener("click", (event) => {
      const botao = event.target.closest("#btn-testar-conexao");
      if (!botao) return;
      event.preventDefault();
      testarAgora(botao);
    });

    // Teste automático ao abrir o Cliente
    testarAgora(document.getElementById("btn-testar-conexao"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }

  window.ConexaoUI = { testarAgora, renderStatus };
})();
