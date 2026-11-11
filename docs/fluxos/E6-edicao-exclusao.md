# Fluxo do E6: Edição e exclusão

**Feito quando (da Entrega 1):** O usuário cadastra dados pessoais no cofre e consegue consultá-los posteriormente. Ao apagar um dado, não consegue mais consultá-lo.

## Passos

1. O Usuário lista as credenciais no navegador (Front-end web) e clica em editar uma delas.
2. O Cliente (Back-end 2) decifra a credencial e devolve os dados atuais ao navegador, que os exibe.
3. O Usuário altera os campos que quiser no formulário.
4. O Cliente cifra os novos dados com o Módulo de Criptografia.
5. O Cliente envia os dados atualizados ao Servidor via socket TCP `PedidoDeAtualizacao` (CT5), com o header o token da sessão.
6. O Servidor atualiza a credencial na tabela `credencial`.
7. O Banco de Dados confirma a atualização.
8. O Cliente devolve a confirmação ao navegador, que exibe a mensagem de sucesso.
9. (Exclusão) O Usuário clica em excluir em uma credencial.
10. O Cliente envia `PedidoDeExclusao` (CT6) ao Servidor, com o header o token da sessão; o Servidor apaga da tabela e confirma.

## Diagrama de sequência

```mermaid
sequenceDiagram
    actor U as Usuário
    participant N as Navegador (Front-end web)
    participant C as Cliente (Back-end 2)
    participant CM as Módulo de Criptografia (Back-end 2)
    participant S as Servidor (Back-end 1)
    participant DB as Banco de Dados

    U->>N: clica em editar uma credencial
    N->>C: pede dados da credencial
    C->>CM: decifrar(dadosCifrados)
    CM-->>C: dados em texto claro
    C-->>N: dados atuais
    N-->>U: exibe dados atuais
    U->>N: altera e confirma
    N->>C: envia novos dados
    C->>CM: cifrar(novosDados)
    CM-->>C: dadosCifradosNovos
    C->>S: CT5 PedidoDeAtualizacao (token da sessão)
    S->>DB: CT10 Tabela credencial (atualizar)
    DB-->>S: confirmação
    S-->>C: credencialAtualizada
    C-->>N: credencialAtualizada
    N-->>U: exibe sucesso

    U->>N: clica em excluir uma credencial
    N->>C: pede exclusão
    C->>S: CT6 PedidoDeExclusao (token da sessão)
    S->>DB: CT10 Tabela credencial (excluir)
    DB-->>S: confirmação
    S-->>C: credencialExcluida
    C-->>N: credencialExcluida
    N-->>U: exibe sucesso
```