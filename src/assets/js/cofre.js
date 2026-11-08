document.addEventListener("DOMContentLoaded", () => {
  const vault = document.getElementById("vault");
  const viewPasta = document.getElementById("view-pasta");
  const viewConta = document.getElementById("view-conta");
  const toolsPanel = document.getElementById("vault-tools");
  const btnCloseTools = document.getElementById("btn-close-tools");
  const btnOpenTools = document.querySelectorAll(".btn-open-tools");
  const toolTabs = document.querySelectorAll(".tools-nav__btn");
  const btnFavoritar = document.getElementById("btn-favoritar");
  const btnMostrarSenha = document.getElementById("btn-mostrar-senha");
  const contaSenha = document.getElementById("conta-senha");
  const lengthInput = document.getElementById("senha-length");
  const lengthValue = document.getElementById("senha-length-value");
  const btnGerar = document.getElementById("btn-gerar-senha");
  const senhaGerada = document.getElementById("senha-gerada");
  const formMestra = document.getElementById("form-senha-mestra");
  const btnExportar = document.getElementById("btn-exportar");
  const btnImportar = document.getElementById("btn-importar");
  const backupFile = document.getElementById("backup-file");
  const filePick = document.querySelector(".file-pick span");
  const btnPasta = document.getElementById("btn-pasta");
  const btnConta = document.getElementById("btn-conta");

  const credenciais = new Map();
  let credencialAberta = null;
  let pedidoSenha = 0;

  function exibirCofreAlerta(msg, tipo) {
    const alerta = document.getElementById("cofre-alerta");
    if (!alerta) return;
    if (!msg) {
      alerta.hidden = true;
      alerta.textContent = "";
      alerta.className = "form-alerta";
      alerta.removeAttribute("role");
      return;
    }
    alerta.hidden = false;
    alerta.textContent = msg;
    alerta.className = tipo ? `form-alerta form-alerta--${tipo}` : "form-alerta";
    alerta.setAttribute("role", tipo === "erro" ? "alert" : "status");
  }

  function textoErro(erro) {
    if (window.ApiCliente && ApiCliente.mensagemErro) {
      return ApiCliente.mensagemErro(erro && erro.codigo, erro && erro.message);
    }
    return (erro && erro.message) || "Erro ao falar com o servidor.";
  }

  function definirStatusLista(texto) {
    const status = document.getElementById("lista-status");
    if (!status) return;
    status.hidden = !texto;
    status.textContent = texto || "";
  }

  function openTools() {
    vault.classList.add("is-tools-open");
    toolsPanel.setAttribute("aria-hidden", "false");
  }

  function closeTools() {
    vault.classList.remove("is-tools-open");
    toolsPanel.setAttribute("aria-hidden", "true");
  }

  function switchTool(name) {
    toolTabs.forEach((tab) => {
      const active = tab.dataset.tool === name;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });

    document.querySelectorAll(".tool-panel").forEach((panel) => {
      const active = panel.id === `tool-${name}`;
      panel.classList.toggle("is-active", active);
      panel.hidden = !active;
    });
  }

  function showView(type) {
    const isPasta = type === "pasta";

    viewPasta.classList.toggle("is-visible", isPasta);
    viewConta.classList.toggle("is-visible", !isPasta);
    viewPasta.hidden = !isPasta;
    viewConta.hidden = isPasta;
  }

  function renderLista() {
    const nav = document.getElementById("lista-servicos");
    if (!nav) return;

    const termo = (document.getElementById("busca")?.value || "").trim().toLowerCase();
    const itens = [...credenciais.values()].filter((cred) => {
      if (!termo) return true;
      const servico = String(cred.servico || "").toLowerCase();
      const login = String(cred.usuarioServico || "").toLowerCase();
      return servico.includes(termo) || login.includes(termo);
    });

    nav.replaceChildren();

    if (!itens.length) {
      definirStatusLista(
        credenciais.size
          ? "Nenhum serviço encontrado."
          : "Nenhuma credencial salva neste cofre."
      );
      return;
    }

    definirStatusLista("");

    itens.forEach((cred) => {
      const id = String(cred.credencialId);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "tree-item";
      button.dataset.id = id;
      button.dataset.type = "conta";
      if (credencialAberta === id) {
        button.classList.add("is-active");
        button.setAttribute("aria-current", "true");
      }

      const label = document.createElement("span");
      label.className = "tree-item__label";
      label.textContent = cred.servico || "Serviço";

      if (cred.usuarioServico) {
        const meta = document.createElement("span");
        meta.className = "tree-item__meta";
        meta.textContent = cred.usuarioServico;
        label.appendChild(meta);
      }

      button.appendChild(label);
      button.addEventListener("click", () => {
        abrirCredencial(id);
      });
      nav.appendChild(button);
    });
  }

  async function carregarServicos() {
    exibirCofreAlerta("");
    definirStatusLista("Carregando serviços…");

    if (!window.ApiCliente) {
      definirStatusLista("Não foi possível listar os serviços.");
      exibirCofreAlerta("Cliente indisponível nesta página.", "erro");
      return;
    }

    const sessao = ApiCliente.obterSessao();
    if (!sessao.token) {
      credenciais.clear();
      renderLista();
      definirStatusLista("Faça login para listar os serviços.");
      exibirCofreAlerta(ApiCliente.mensagemErro("SESSAO_INVALIDA"), "erro");
      return;
    }

    try {
      const lista = await ApiCliente.listarCredenciais(sessao.token);
      credenciais.clear();
      lista.forEach((item) => {
        if (item && item.credencialId != null) {
          credenciais.set(String(item.credencialId), item);
        }
      });
      renderLista();
    } catch (erro) {
      credenciais.clear();
      const nav = document.getElementById("lista-servicos");
      if (nav) nav.replaceChildren();
      definirStatusLista("Não foi possível listar os serviços.");
      exibirCofreAlerta(textoErro(erro), "erro");
    }
  }

  async function abrirCredencial(id) {
    const cred = credenciais.get(String(id));
    if (!cred || !contaSenha) return;

    const meuPedido = ++pedidoSenha;
    credencialAberta = String(id);

    document.querySelectorAll("#lista-servicos .tree-item").forEach((el) => {
      const ativo = el.dataset.id === credencialAberta;
      el.classList.toggle("is-active", ativo);
      if (ativo) el.setAttribute("aria-current", "true");
      else el.removeAttribute("aria-current");
    });

    showView("conta");
    const titulo = document.getElementById("conta-titulo");
    if (titulo) titulo.textContent = cred.servico || "Serviço";
    document.getElementById("conta-nome").value = cred.servico || "";
    document.getElementById("conta-login").value = cred.usuarioServico || "";
    contaSenha.value = "";
    contaSenha.type = "password";
    if (btnMostrarSenha) {
      btnMostrarSenha.textContent = "MOSTRAR";
      btnMostrarSenha.disabled = true;
    }
    if (btnFavoritar) {
      btnFavoritar.classList.remove("is-active");
      btnFavoritar.setAttribute("aria-pressed", "false");
    }
    exibirCofreAlerta("Decifrando senha…");

    try {
      const senha = await ApiCliente.decifrarSenha({
        dadosCifrados: cred.dadosCifrados,
        iv: cred.iv,
      });
      if (meuPedido !== pedidoSenha) return;
      contaSenha.value = senha;
      contaSenha.type = "text";
      if (btnMostrarSenha) btnMostrarSenha.textContent = "OCULTAR";
      exibirCofreAlerta("");
    } catch (erro) {
      if (meuPedido !== pedidoSenha) return;
      contaSenha.value = "";
      exibirCofreAlerta(textoErro(erro), "erro");
    } finally {
      if (meuPedido === pedidoSenha && btnMostrarSenha) {
        btnMostrarSenha.disabled = false;
      }
    }
  }

  async function copyFrom(button) {
    const targetId = button.getAttribute("data-copy-target");
    const input = document.getElementById(targetId);
    if (!input || !input.value) return;

    try {
      await navigator.clipboard.writeText(input.value);
    } catch {
      input.select();
      document.execCommand("copy");
    }

    const original = button.textContent;
    button.classList.add("is-copied");
    button.textContent = "COPIADO";

    setTimeout(() => {
      button.classList.remove("is-copied");
      button.textContent = original;
    }, 1200);
  }

  function generatePassword() {
    const length = Number(lengthInput.value);
    const sets = [];

    if (document.getElementById("opt-upper").checked) sets.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    if (document.getElementById("opt-lower").checked) sets.push("abcdefghijklmnopqrstuvwxyz");
    if (document.getElementById("opt-number").checked) sets.push("0123456789");
    if (document.getElementById("opt-symbol").checked) sets.push("!@#$%^&*()-_=+[]{};:,.?");

    if (!sets.length) {
      alert("Selecione ao menos uma opção.");
      return;
    }

    const all = sets.join("");
    let result = sets.map((set) => set[Math.floor(Math.random() * set.length)]).join("");

    for (let i = result.length; i < length; i += 1) {
      result += all[Math.floor(Math.random() * all.length)];
    }

    senhaGerada.value = result
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");
  }

  btnOpenTools.forEach((btn) => btn.addEventListener("click", openTools));
  if (btnCloseTools) btnCloseTools.addEventListener("click", closeTools);

  toolTabs.forEach((tab) => {
    tab.addEventListener("click", () => switchTool(tab.dataset.tool));
  });

  document.getElementById("busca")?.addEventListener("input", renderLista);

  document.getElementById("btn-bloquear")?.addEventListener("click", () => {
    if (window.ApiCliente) ApiCliente.limparSessao();
  });

  document.querySelectorAll(".btn-copy").forEach((btn) => {
    btn.addEventListener("click", () => copyFrom(btn));
  });

  if (btnFavoritar) {
    btnFavoritar.addEventListener("click", () => {
      const active = btnFavoritar.classList.toggle("is-active");
      btnFavoritar.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  if (btnMostrarSenha && contaSenha) {
    btnMostrarSenha.addEventListener("click", () => {
      const showing = contaSenha.type === "text";
      contaSenha.type = showing ? "password" : "text";
      btnMostrarSenha.textContent = showing ? "MOSTRAR" : "OCULTAR";
    });
  }

  if (lengthInput && lengthValue) {
    lengthInput.addEventListener("input", () => {
      lengthValue.textContent = lengthInput.value;
    });
  }

  if (btnGerar) btnGerar.addEventListener("click", generatePassword);

  if (formMestra) {
    formMestra.addEventListener("submit", (event) => {
      event.preventDefault();
      alert("Senha mestra atualizada (hard coded).");
      formMestra.reset();
    });
  }

  // Exportar Backup
  if (btnExportar) {
    btnExportar.addEventListener("click", async () => {
        const textoOriginal = btnExportar.textContent;
        btnExportar.disabled = true;
        btnExportar.textContent = "Gerando backup...";

        try {
            const dadosBackup = await ApiCliente.exportarBackup();
            const conteudoArquivo = JSON.stringify(dadosBackup, null, 2);
            const blob = new Blob([conteudoArquivo], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            link.href = url;
            link.setAttribute('download', `backup_cofre_${Date.now()}.vault`);
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (erro) {
            console.error(erro);
            alert(ApiCliente.mensagemErro(erro.codigo, erro.message));
        } finally {
            btnExportar.disabled = false;
            btnExportar.textContent = textoOriginal;
        }
    });
  }
  // Importar Backup
  if (btnImportar && backupFile) {
    btnImportar.addEventListener("click", async () => {
      const senhaDigitada = document.getElementById('backup-senha')?.value;

      // Validações iniciais
      if (!backupFile.files || backupFile.files.length === 0) {
        alert("Por favor, selecione um arquivo .vault primeiro.");
        return;
      }
      if (!senhaDigitada) {
        alert("Por favor, digite a senha mestra antiga do backup.");
        return;
      }

      const file = backupFile.files[0];
      const reader = new FileReader();

      reader.onload = async (e) => {
        const textoOriginal = btnImportar.textContent;
        btnImportar.disabled = true;
        btnImportar.textContent = "Importando...";

        try {
          const textoArquivo = e.target.result;
          const dadosBackup = JSON.parse(textoArquivo);

          // Chama a função do api.js que faz a re-cifragem
          const resposta = await ApiCliente.importarBackup(dadosBackup, senhaDigitada);

          alert(`Sucesso! ${resposta.credenciaisInseridas || resposta.credenciais?.length || 'Várias'} credenciais foram restauradas.`);
          
          // Limpa os campos
          backupFile.value = "";
          if (filePick) filePick.textContent = "Escolher arquivo";
          document.getElementById('backup-senha').value = "";

          // Recarrega a lista de credenciais na tela
          await carregarServicos();
          
        } catch (erro) {
          console.error(erro);
          alert(ApiCliente.mensagemErro(erro.codigo, erro.message));
        } finally {
          btnImportar.disabled = false;
          btnImportar.textContent = textoOriginal;
        }
      };

      reader.onerror = () => {
        alert("Erro ao ler o arquivo .vault.");
      };

      reader.readAsText(file);
    });
  }

  if (backupFile && filePick) {
    backupFile.addEventListener("change", () => {
      filePick.textContent = backupFile.files[0]
        ? backupFile.files[0].name
        : "Escolher arquivo";
    });
  }

  if (btnPasta) {
    btnPasta.addEventListener("click", () => {
      alert("Nova pasta — hard coded por enquanto.");
    });
  }

  // --- Modal Nova Conta / Salvar Credencial ---
  const modalConta = document.getElementById("modal-conta");
  const modalContaOverlay = document.getElementById("modal-conta-overlay");
  const btnFecharModal = document.getElementById("btn-fechar-modal-conta");
  const btnCancelarModal = document.getElementById("btn-cancelar-modal-conta");
  const formNovaConta = document.getElementById("form-nova-conta");
  const modalAlerta = document.getElementById("modal-conta-alerta");
  const btnToggleSenhaModal = document.getElementById("btn-toggle-senha-modal");
  const inputNovaSenha = document.getElementById("nova-conta-senha");
  const btnSalvarConta = document.getElementById("btn-salvar-conta");

  function exibirModalAlerta(msg, tipo) {
    if (!modalAlerta) return;
    modalAlerta.hidden = false;
    modalAlerta.textContent = msg;
    modalAlerta.className = `form-alerta form-alerta--${tipo}`;
    modalAlerta.setAttribute("role", tipo === "erro" ? "alert" : "status");
  }

  function limparModalAlerta() {
    if (!modalAlerta) return;
    modalAlerta.hidden = true;
    modalAlerta.textContent = "";
    modalAlerta.className = "form-alerta";
    modalAlerta.removeAttribute("role");
  }

  function abrirModalConta() {
    if (!modalConta) return;
    limparModalAlerta();
    if (formNovaConta) formNovaConta.reset();
    if (inputNovaSenha) inputNovaSenha.type = "password";
    if (btnToggleSenhaModal) btnToggleSenhaModal.textContent = "MOSTRAR";
    modalConta.hidden = false;
    modalConta.setAttribute("aria-hidden", "false");
    document.getElementById("nova-conta-servico")?.focus();
  }

  function fecharModalConta() {
    if (!modalConta) return;
    modalConta.hidden = true;
    modalConta.setAttribute("aria-hidden", "true");
    limparModalAlerta();
  }

  if (btnConta) btnConta.addEventListener("click", abrirModalConta);
  if (btnFecharModal) btnFecharModal.addEventListener("click", fecharModalConta);
  if (btnCancelarModal) btnCancelarModal.addEventListener("click", fecharModalConta);
  if (modalContaOverlay) modalContaOverlay.addEventListener("click", fecharModalConta);

  if (btnToggleSenhaModal && inputNovaSenha) {
    btnToggleSenhaModal.addEventListener("click", () => {
      const isPassword = inputNovaSenha.type === "password";
      inputNovaSenha.type = isPassword ? "text" : "password";
      btnToggleSenhaModal.textContent = isPassword ? "OCULTAR" : "MOSTRAR";
    });
  }

  if (formNovaConta) {
    formNovaConta.addEventListener("submit", async (event) => {
      event.preventDefault();
      limparModalAlerta();

      const servico = document.getElementById("nova-conta-servico")?.value?.trim();
      const usuarioServico = document.getElementById("nova-conta-usuario")?.value?.trim();
      const senha = inputNovaSenha?.value;

      if (!servico || !usuarioServico || !senha) {
        exibirModalAlerta("Preencha todos os campos da credencial.", "erro");
        return;
      }

      if (btnSalvarConta) {
        btnSalvarConta.disabled = true;
        btnSalvarConta.textContent = "Cifrando e salvando…";
      }

      try {
        if (window.HttpClient) {
          const conexao = await HttpClient.testarConexoes();
          if (!conexao.online) {
            exibirModalAlerta(
              (conexao.mensagem || "Sem resposta dos servidores.") +
                " Não foi possível salvar. Teste a conexão.",
              "erro"
            );
            return;
          }
        }

        const resultado = await ApiCliente.executarSalvarCredencial({
          servico,
          usuarioServico,
          senha,
        });

        const idGerado = resultado.credencialId;
        const msgSucesso = `${resultado.mensagem} (ID: ${idGerado})`;
        exibirModalAlerta(msgSucesso, "sucesso");
        await carregarServicos();

        formNovaConta.reset();
        inputNovaSenha.type = "password";
        if (btnToggleSenhaModal) btnToggleSenhaModal.textContent = "MOSTRAR";

        setTimeout(() => {
          fecharModalConta();
        }, 1500);

      } catch (erro) {
        const msg = window.ApiCliente && ApiCliente.mensagemErro
          ? ApiCliente.mensagemErro(erro.codigo, erro.message)
          : erro.message || "Erro ao salvar credencial.";
        exibirModalAlerta(msg, "erro");
      } finally {
        if (btnSalvarConta) {
          btnSalvarConta.disabled = false;
          btnSalvarConta.textContent = "Salvar Credencial";
        }
      }
    });
  }

  // --- Editar e excluir credencial ---
  const btnEditarConta = document.getElementById("btn-editar-conta");
  const btnExcluirConta = document.getElementById("btn-excluir-conta");

  const modalEditar = document.getElementById("modal-editar");
  const modalEditarOverlay = document.getElementById("modal-editar-overlay");
  const btnFecharModalEditar = document.getElementById("btn-fechar-modal-editar");
  const btnCancelarEditar = document.getElementById("btn-cancelar-editar");
  const btnToggleSenhaEditar = document.getElementById("btn-toggle-senha-editar");
  const formEditarConta = document.getElementById("form-editar-conta");
  const inputEditarSenha = document.getElementById("editar-senha");
  const modalEditarAlerta = document.getElementById("modal-editar-alerta");
  const btnSalvarEditar = document.getElementById("btn-salvar-editar");

  const modalExcluir = document.getElementById("modal-excluir");
  const modalExcluirOverlay = document.getElementById("modal-excluir-overlay");
  const btnCancelarExcluir = document.getElementById("btn-cancelar-excluir");
  const btnConfirmarExcluir = document.getElementById("btn-confirmar-excluir");
  const modalExcluirAlerta = document.getElementById("modal-excluir-alerta");

  function mostrarModal(modal) {
    modal.hidden = false;
    modal.setAttribute("aria-hidden", "false");
  }

  function ocultarModal(modal) {
    modal.hidden = true;
    modal.setAttribute("aria-hidden", "true");
  }

  function mostrarAlertaModal(alerta, msg, tipo) {
    alerta.hidden = false;
    alerta.textContent = msg;
    alerta.className = `form-alerta form-alerta--${tipo}`;
    alerta.setAttribute("role", tipo === "erro" ? "alert" : "status");
  }

  if (btnEditarConta) {
    btnEditarConta.addEventListener("click", () => {
      const cred = credenciais.get(credencialAberta);
      if (!cred || !contaSenha.value) {
        exibirCofreAlerta("Aguarde a senha ser decifrada antes de editar.", "erro");
        return;
      }
      document.getElementById("editar-servico").value = cred.servico || "";
      document.getElementById("editar-usuario").value = cred.usuarioServico || "";
      inputEditarSenha.value = contaSenha.value;
      inputEditarSenha.type = "password";
      if (btnToggleSenhaEditar) btnToggleSenhaEditar.textContent = "MOSTRAR";
      modalEditarAlerta.hidden = true;
      mostrarModal(modalEditar);
    });
  }

  [btnFecharModalEditar, btnCancelarEditar, modalEditarOverlay].forEach((el) => {
    if (el) el.addEventListener("click", () => ocultarModal(modalEditar));
  });

  if (btnToggleSenhaEditar && inputEditarSenha) {
    btnToggleSenhaEditar.addEventListener("click", () => {
      const isPassword = inputEditarSenha.type === "password";
      inputEditarSenha.type = isPassword ? "text" : "password";
      btnToggleSenhaEditar.textContent = isPassword ? "OCULTAR" : "MOSTRAR";
    });
  }

  if (formEditarConta) {
    formEditarConta.addEventListener("submit", async (event) => {
      event.preventDefault();
      const id = credencialAberta;
      const servico = document.getElementById("editar-servico").value.trim();
      const usuarioServico = document.getElementById("editar-usuario").value.trim();
      const senha = inputEditarSenha.value;

      if (!servico || !usuarioServico || !senha) {
        mostrarAlertaModal(modalEditarAlerta, "Preencha todos os campos da credencial.", "erro");
        return;
      }

      btnSalvarEditar.disabled = true;
      btnSalvarEditar.textContent = "Cifrando e salvando…";
      try {
        await ApiCliente.editarCredencial({ id, servico, usuarioServico, senha });
        ocultarModal(modalEditar);
        await carregarServicos();
        await abrirCredencial(id);
        exibirCofreAlerta("Credencial atualizada.", "sucesso");
      } catch (erro) {
        mostrarAlertaModal(
          modalEditarAlerta,
          ApiCliente.mensagemErro(erro.codigo, erro.message),
          "erro"
        );
      } finally {
        btnSalvarEditar.disabled = false;
        btnSalvarEditar.textContent = "Salvar alterações";
      }
    });
  }

  if (btnExcluirConta) {
    btnExcluirConta.addEventListener("click", () => {
      modalExcluirAlerta.hidden = true;
      mostrarModal(modalExcluir);
    });
  }

  [btnCancelarExcluir, modalExcluirOverlay].forEach((el) => {
    if (el) el.addEventListener("click", () => ocultarModal(modalExcluir));
  });

  if (btnConfirmarExcluir) {
    btnConfirmarExcluir.addEventListener("click", async () => {
      const id = credencialAberta;
      btnConfirmarExcluir.disabled = true;
      try {
        await ApiCliente.excluirCredencial({ id });
        ocultarModal(modalExcluir);
        credencialAberta = null;
        showView("pasta");
        await carregarServicos();
        exibirCofreAlerta("Credencial excluída.", "sucesso");
      } catch (erro) {
        mostrarAlertaModal(
          modalExcluirAlerta,
          ApiCliente.mensagemErro(erro.codigo, erro.message),
          "erro"
        );
      } finally {
        btnConfirmarExcluir.disabled = false;
      }
    });
  }

  let jaAvisouQueda = false;

  function avisarQuedaEPedirLogin(status) {
    if (status.online !== false) return;
    if (jaAvisouQueda) return;
    jaAvisouQueda = true;

    const extra =
      status.duranteGravacao || HttpClient.houveQuedaDuranteGravacao()
        ? " Confira a lista de credenciais antes de repetir a gravação."
        : "";

    window.alert(
      (status.mensagem || "Conexão caiu.") +
        extra +
        " Faça uma nova conexão e um novo login."
    );
    window.location.href = "index.html";
  }

  if (window.HttpClient) {
    HttpClient.onStatusChange(avisarQuedaEPedirLogin);

    if (HttpClient.houveQuedaDuranteGravacao()) {
      window.alert(
        "Houve uma queda durante uma gravação anterior. Confira a lista de credenciais abaixo antes de repetir o comando."
      );
      HttpClient.limparGravacaoPendente();
    }
  }

  generatePassword();
  carregarServicos(); 
});