# Fluxo do E8: Backup cifrado do cofre

**Feito quando (da Entrega 1):** O usuário exporta um arquivo de backup cifrado e consegue identificar o arquivo salvo para uso posterior.

## Passos

1. O Usuário digita o comando para exportar o backup.
2. O Cliente solicita ao Servidor todas as credenciais cifradas do usuário.
3. O Servidor busca na tabela `credencial` e devolve a lista.
4. O Cliente empacota os dados em um arquivo `.vault`.
5. O Cliente chama o Módulo de Criptografia para cifrar o pacote com a chave mestra.
6. O Módulo de Criptografia devolve o pacote cifrado.
7. O Cliente grava o arquivo no sistema de arquivos local.
8. O Cliente exibe o caminho do arquivo salvo ao Usuário.

## Diagrama de sequência

```mermaid
sequenceDiagram
    actor U as Usuário
    participant C as Cliente
    participant CM as Módulo de Criptografia
    participant S as Servidor
    participant DB as Banco de Dados

    U->>C: exportar backup
    C->>S: CT7 exportarBackup(usuarioId)
    S->>DB: CT10 Tabela credencial (buscar todas)
    DB-->>S: lista de credenciais cifradas
    S-->>C: CT7 backupCifrado (lista)
    C->>CM: cifrar(pacote, chaveMestra)
    CM-->>C: pacoteCifrado
    C->>C: grava arquivo backup.vault
    C-->>U: exibe caminho do arquivo