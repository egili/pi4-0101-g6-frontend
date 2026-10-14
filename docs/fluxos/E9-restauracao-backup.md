# Fluxo do E9: Restauração do backup cifrado

**Feito quando (da Entrega 1):** O usuário importa um backup cifrado utilizando sua senha mestra, e as credenciais salvas no backup ficam disponíveis no cofre.

## Passos

1. O Usuário digita o comando para importar um backup e informa o caminho do arquivo.
2. O Cliente lê o arquivo `.vault` do sistema de arquivos local.
3. O Cliente chama o Módulo de Criptografia para decifrar o pacote.
4. O Módulo de Criptografia valida a chave mestra e devolve as credenciais em texto claro.
5. O Cliente re-cifra cada credencial individualmente.
6. O Cliente envia cada credencial ao Servidor.
7. O Servidor insere as credenciais na tabela `credencial`.
8. O Banco de Dados confirma.
9. O Cliente exibe a mensagem de sucesso.

## Diagrama de sequência

```mermaid
sequenceDiagram
    actor U as Usuário
    participant C as Cliente
    participant CM as Módulo de Criptografia
    participant S as Servidor
    participant DB as Banco de Dados

    U->>C: importar backup arquivo.vault
    C->>C: lê arquivo do disco
    C->>CM: decifrar(pacote, chaveMestra)
    CM-->>C: credenciais em texto claro
    C->>CM: cifrar(cada credencial)
    CM-->>C: credenciais cifradas
    C->>S: CT8 importarBackup
    S->>DB: CT10 Tabela credencial (inserir em lote)
    DB-->>S: confirmação
    S-->>C: CT8 backupRestaurado
    C-->>U: exibe mensagem de sucesso