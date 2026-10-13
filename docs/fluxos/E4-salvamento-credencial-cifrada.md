# Fluxo do E4: Salvamento de credencial cifrada

**Feito quando (da Entrega 1):** O usuário digita os dados de um serviço (ex: Gmail), o cliente embaralha a senha e a envia ao servidor, que a guarda sem conseguir ler.

## Passos

1. O Usuário digita o comando para salvar uma credencial do Gmail no Cliente.
2. O Cliente chama o Módulo de Criptografia para cifrar a senha do serviço.
3. O Módulo de Criptografia devolve os `dadosCifrados` e o `iv`.
4. O Cliente envia `usuarioId`, `servico`, `usuarioServico`, `dadosCifrados` e `iv` ao Servidor.
5. O Servidor grava os dados na tabela `credencial`.
6. O Banco de Dados confirma a inserção.
7. O Servidor devolve a confirmação ao Cliente.
8. O Cliente exibe a mensagem de sucesso.

## Diagrama de sequência

```mermaid
sequenceDiagram
    actor U as Usuário
    participant C as Cliente
    participant CM as Módulo de Criptografia
    participant S as Servidor
    participant DB as Banco de Dados

    U->>C: digita credencial do Gmail
    C->>CM: cifrar(senha, chaveMestra)
    CM-->>C: dadosCifrados + iv
    C->>S: CT2 salvarCredencial(usuarioId, servico, usuarioServico, dadosCifrados, iv)
    S->>DB: CT10 Tabela credencial (inserir)
    DB-->>S: confirmação
    S-->>C: CT2 credencialSalva
    C-->>U: exibe mensagem de sucesso