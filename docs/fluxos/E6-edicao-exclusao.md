# Fluxo do E6: Edição e exclusão

**Feito quando (da Entrega 1):** O usuário cadastra dados pessoais no cofre e consegue consultá-los posteriormente. Ao apagar um dado, não consegue mais consultá-lo.

## Passos

1. O Usuário lista as credenciais e escolhe uma para editar.
2. O Cliente CLI decifra a credencial e exibe os dados atuais.
3. O Usuário altera os campos que quiser.
4. O Cliente CLI cifra os novos dados com o Módulo de Criptografia.
5. O Cliente CLI envia os dados atualizados ao Servidor.
6. O Servidor atualiza a credencial na tabela `credencial`.
7. O Banco de Dados confirma a atualização.
8. O Cliente CLI exibe a mensagem de sucesso.
9. (Exclusão) O Usuário escolhe uma credencial para apagar.
10. O Cliente CLI envia a requisição de exclusão ao Servidor, que apaga da tabela e confirma.

## Diagrama de sequência

```mermaid
sequenceDiagram
    actor U as Usuário
    participant C as Cliente CLI
    participant CM as Módulo de Criptografia
    participant S as Servidor
    participant DB as Banco de Dados

    U->>C: escolhe credencial para editar
    C->>CM: decifrar(dadosCifrados)
    CM-->>C: dados em texto claro
    C-->>U: exibe dados atuais
    U->>C: altera e confirma
    C->>CM: cifrar(novosDados)
    CM-->>C: dadosCifradosNovos
    C->>S: CT5 editarCredencial(credencialId, dadosCifradosNovos)
    S->>DB: CT10 Tabela credencial (atualizar)
    DB-->>S: confirmação
    S-->>C: CT5 credencialAtualizada
    C-->>U: exibe sucesso

    U->>C: escolhe credencial para excluir
    C->>S: CT6 excluirCredencial(credencialId)
    S->>DB: CT10 Tabela credencial (excluir)
    DB-->>S: confirmação
    S-->>C: CT6 credencialExcluida
    C-->>U: exibe sucesso