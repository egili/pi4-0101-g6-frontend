# Fluxo do E2: Cadastro de usuário

**Feito quando (da Entrega 1):** O usuário cria uma conta informando apenas um nome de usuário e uma senha mestra, e recebe a confirmação de que a conta foi criada.

## Passos

1. O Usuário preenche o formulário de cadastro no navegador (Front-end web) com o nome de usuário e a senha mestra.
2. O Cliente (Back-end 2) usa o Módulo de Criptografia para gerar um `salt` criptograficamente seguro (`SecureRandom`).
3. O Módulo de Criptografia deriva separadamente:
   - A **Chave de Cifragem** (mantida apenas na memória do Cliente para cifrar o cofre).
   - O **Hash de Autenticação** (`senhaMestraHash`), função unidirecional enviada ao Servidor para validação futura.
4. O Cliente envia `username`, `senhaMestraHash` e `salt` ao Servidor via socket TCP `PedidoDeCadastro` (CT1).
5. O Servidor grava os dados na tabela `usuario` (CT9).
6. O Banco de Dados confirma a inserção.
7. O Servidor devolve a confirmação com o `usuarioId` ao Cliente.
8. O Cliente devolve a confirmação ao navegador, que exibe a mensagem de sucesso ao Usuário.

## Diagrama de sequência

```mermaid
sequenceDiagram
    actor U as Usuário
    participant N as Navegador (Front-end web)
    participant C as Cliente (Back-end 2)
    participant CM as Módulo de Criptografia (Back-end 2)
    participant S as Servidor (Back-end 1)
    participant DB as Banco de Dados

    U->>N: preenche username e senha mestra
    N->>C: envia dados de cadastro
    C->>CM: gerarSalt()
    CM-->>C: salt
    Note over C,CM: Derivação de Chaves Separadas (Zero-Trust)
    C->>CM: derivarChaveCifragem(senhaMestra, salt)
    CM-->>C: chaveCifragem (armazenada apenas em memória no Cliente)
    C->>CM: derivarHashAutenticacao(chaveCifragem / senhaMestra)
    CM-->>C: senhaMestraHash
    C->>S: CT1 PedidoDeCadastro (username, senhaMestraHash, salt)
    S->>DB: CT9 Tabela usuario (inserir registro)
    DB-->>S: confirmação
    S-->>C: usuarioCadastrado (usuarioId)
    C-->>N: usuarioCadastrado
    N-->>U: exibe mensagem de sucesso
```