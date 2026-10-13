# Visão Geral — Cofre Digital

## Mudanças de escopo desde a Entrega 1

- **Criptografia de arquivos gerais (PDFs, imagens, vídeos) foi removida do escopo.** O foco foi reduzido ao gerenciamento e cifragem de senhas e dados textuais, garantindo a viabilidade do MVP dentro do prazo.
- **Interface mantida como CLI (linha de comando).** Apesar de o Relatório de Ideação ter explorado wireframes de GUI, a Entrega 1 definiu o cliente como linha de comando, e essa decisão foi mantida.

## Módulos do sistema

| Módulo | O que faz | Tecnologia | Repositório | Responsável |
|---|---|---|---|---|
| **Cliente CLI** | Interface de linha de comando. Gera senhas fortes, cifra e decifra dados localmente com a chave derivada da senha mestra. Nunca envia texto claro ao servidor. | Java (JDK 17+) | `pi4-2026-2-0101-grupo06-frontend` | Eliseu Gili |
| **Módulo de Criptografia** (Back-end 2) | Biblioteca Java usada pelo Cliente CLI. Fornece funções de cifrar, decifrar, derivar chave, gerar salt e gerar IV. Roda dentro do processo do cliente, nunca no servidor. | Java (JDK 17+) | `pi4-2026-2-0101-grupo06-backend-2` | Leonardo Maciel |
| **Servidor** (Back-end 1) | Recebe as requisições do cliente via socket, gerencia autenticação e armazena apenas dados já cifrados. Nunca acessa a chave mestra nem o texto claro. | Java (JDK 17+) | `pi4-2026-2-0101-grupo06-backend-1` | Guilherme Heron |
| **Banco de Dados** | Persiste usuários, hashes de senha mestra e credenciais cifradas. | SQLite (via JDBC) | Junto ao Back-end 1 | Leonardo Maciel |
| **Infraestrutura** | Empacota servidor e banco em containers padronizados. | Docker + Docker Compose | Junto ao Back-end 1 | Pietra Bortolato |
| **Documentação** | Relatórios, PDFs e artefatos de entrega. | Markdown | `pi4-2026-2-0101-grupo06-documentos` | Pietra Bortolato |

## Diagrama de contêineres (C4 — Nível 2)

```mermaid
flowchart LR
    U[Usuário] -->|Comandos CLI| C

    subgraph C[Cliente CLI<br>Java JDK 17+]
        CM[Módulo de Criptografia<br>Back-end 2<br>Cifra, decifra, deriva chaves]
    end

    C -->|Socket TCP<br>Dados cifrados| S[Servidor<br>Back-end 1<br>Java JDK 17+]
    S -->|JDBC / SQL| DB[(Banco de Dados<br>SQLite<br>Armazena dados cifrados)]
    S -.-> I[Infraestrutura<br>Docker + Compose]
    I -.-> DB