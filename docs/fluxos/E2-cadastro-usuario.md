
# Fluxo do E2: Cadastro de usuário

**Feito quando (da Entrega 1):** O usuário cria uma conta informando apenas um nome de usuário e uma senha mestra, e recebe a confirmação de que a conta foi criada.

## Passos

1. O Usuário informa o nome de usuário e a senha mestra no Cliente.
2. O Cliente usa o Módulo de Criptografia para gerar um salt aleatório.
3. O Módulo de Criptografia deriva um hash da senha mestra usando o salt.
4. O Cliente envia `username`, `senhaMestraHash` e `salt` para o Servidor.
5. O Servidor grava os dados na tabela `usuario`.
6. O Banco de Dados confirma a inserção.
7. O Servidor devolve a confirmação ao Cliente.
8. O Cliente exibe a mensagem de sucesso ao Usuário.

## Diagrama de sequência

```mermaid
sequenceDiagram
    actor U as Usuário
    participant C as Cliente
    participant CM as Módulo de Criptografia
    participant S as Servidor
    participant DB as Banco de Dados

    U->>C: informa usuário e senha mestra
    C->>CM: gera salt
    CM-->>C: salt
    C->>CM: deriva hash(senhaMestra, salt)
    CM-->>C: senhaMestraHash
    C->>S: CT1 cadastrarUsuario(username, senhaMestraHash, salt)
    S->>DB: CT11 Tabela usuario (inserir)
    DB-->>S: confirmação
    S-->>C: CT1 usuarioCadastrado
    C-->>U: exibe mensagem de sucesso