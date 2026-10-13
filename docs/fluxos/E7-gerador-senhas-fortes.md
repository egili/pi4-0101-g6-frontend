# Fluxo do E7: Gerador de senhas fortes

**Feito quando (da Entrega 1):** O usuário escolhe as opções de geração e recebe uma senha forte que pode utilizar no cadastro de uma credencial.

## Passos

1. O Usuário digita o comando para gerar uma senha e escolhe as opções (tamanho, maiúsculas, minúsculas, números, símbolos).
2. O Cliente chama o Módulo de Criptografia para gerar a senha.
3. O Módulo de Criptografia gera uma senha aleatória forte com as opções escolhidas.
4. O Cliente exibe a senha na tela.
5. O Usuário pode copiar a senha e usá-la em um cadastro de credencial (fluxo E4).

## Diagrama de sequência

```mermaid
sequenceDiagram
    actor U as Usuário
    participant C as Cliente
    participant CM as Módulo de Criptografia

    U->>C: gerar senha (tamanho 16, símbolos)
    C->>CM: gerarSenhaForte(opções)
    CM-->>C: senha gerada
    C-->>U: exibe a senha na tela