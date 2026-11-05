# Fluxo do E9: Restauração do backup cifrado com re-cifragem

**Feito quando (da Entrega 1):** O usuário importa um backup cifrado (`.vault`) utilizando a senha mestra correspondente ao arquivo, e as credenciais são re-cifradas com a chave atual do cofre e disponibilizadas com sucesso na interface web.

---

## Por que a Re-cifragem no Cliente é Obrigatória (Zero-Trust)?

Um arquivo de backup (`.vault`) pode ter sido gerado com uma senha mestra antiga ou pertencer a um cofre de origem com salt distinto. 
- Se as credenciais fossem enviadas ao Servidor exatamente como estavam no backup, elas ficariam **ilegíveis** no cofre atual (pois foram cifradas com uma chave diferente).
- O Servidor **não pode re-cifrar** as credenciais porque nunca possui a chave de origem, a chave atual, nem os dados em texto claro.
- **Solução Zero-Trust:** O Cliente Web (navegador) decifra cada registro utilizando a **chave de origem** (derivada da senha do backup e do salt do arquivo) e **re-cifra imediatamente cada credencial com a chave mestra ativa do cofre atual** (utilizando novos IVs aleatórios) antes de enviá-las ao Servidor.

---

## Passos

1. O Usuário seleciona o arquivo `.vault` no formulário da interface Web e informa a senha mestra do backup.
2. O Cliente Web lê o arquivo `.vault` via API do navegador (`FileReader`) e extrai os metadados do cabeçalho aberto (`salt` e `iv`).
3. O Cliente Web aciona a criptografia local no navegador para:
   - Derivar a **chave de origem**: `chaveOrigem = derivarChaveCifragem(senhaMestraBackup, saltBackup)`;
   - Decifrar o corpo do backup com a `chaveOrigem` e o `iv` do cabeçalho.
4. Caso a senha do backup esteja errada ou os dados corrompidos, a decifragem falha e o Cliente Web cancela a operação exibindo o erro correspondente na tela (`SENHA_BACKUP_INCORRETA` ou `BACKUP_CORROMPIDO`).
5. Se a decifragem for bem-sucedida, o Cliente Web obtém a lista das credenciais em texto claro na memória volátil do navegador.
6. **Re-cifragem individual (Zero-Trust):** Para cada credencial obtida:
   - Gera um novo vetor de inicialização (`novoIv = gerarIV()`);
   - Cifra os dados da credencial utilizando a **chave de cifragem ativa do cofre atual** (`chaveCifragemAtual`) e o `novoIv`.
7. O Cliente Web monta a lista de credenciais já re-cifradas com a chave atual e envia a requisição `CT8 importarBackup` ao Servidor via API Fetch, contendo `usuarioId` e a lista de credenciais com o cabeçalho `Authorization: Bearer <token>`.
8. O Servidor valida o token JWT e insere os registros cifrados na tabela `credencial` (`CT10`).
9. O Banco de Dados confirma a gravação dos novos registros.
10. O Servidor responde ao Cliente Web com a confirmação e o total de `credenciaisInseridas`.
11. O Cliente Web atualiza a lista de credenciais e exibe a mensagem de sucesso ao Usuário na interface.

---

## Diagrama de Sequência

```mermaid
sequenceDiagram
    actor U as Usuário
    participant C as Cliente Web
    participant CM as Criptografia Local (Navegador)
    participant S as Servidor Back-end 1
    participant DB as Banco de Dados

    U->>C: seleciona arquivo .vault e digita senha do backup na interface Web
    C->>C: lê arquivo .vault via FileReader API
    C->>C: extrai salt e iv do cabeçalho aberto

    Note over C,CM: Decifragem com Chave de Origem no Navegador
    C->>CM: derivarChave(senhaBackup, salt)
    CM-->>C: chaveOrigem
    C->>CM: decifrar(payloadCifrado, iv, chaveOrigem)
    CM-->>C: credenciais em texto claro (memória volátil)

    Note over C,CM: Re-cifragem com Chave Ativa do Cofre
    loop Para cada credencial
        C->>CM: cifrar(credencial, chaveAtivaCofre, novoIv)
        CM-->>C: dadosReCifrados + novoIv
    end

    C->>S: fetch POST /backup/import (Authorization: Bearer JWT, listaReCifrada)
    S->>DB: CT10 Tabela credencial (insere registros)
    DB-->>S: confirmação
    S-->>C: CT8 backupRestaurado (totalInserido)
    C-->>U: atualiza exibição e confirma sucesso na interface web
```
