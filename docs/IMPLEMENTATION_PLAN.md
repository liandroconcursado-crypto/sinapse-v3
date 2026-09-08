# Implementation Plan

## Fase 0 — fundação

Entregáveis:

- scaffold Next.js/TypeScript/pnpm;
- lint, format, typecheck, Vitest e Playwright;
- Docker Compose para PostgreSQL local;
- `.env.example` e validação de env;
- Drizzle e primeira migration;
- autenticação escolhida e ADR;
- layout mínimo dark-first;
- CI com lint, typecheck, tests e build.

Saída: projeto sobe localmente e CI funciona.

## Fase 1 — núcleo do vault

Entregáveis:

- modelo `vaults`, `vault_notes`, `vault_links`;
- parser de wikilinks com alias e exclusão de code blocks;
- CRUD de notas/pastas lógicas;
- resolução determinística e links quebrados;
- backlinks;
- transações e isolamento por usuário;
- explorer + editor CodeMirror + preview simples;
- autosave com conflito detectável.

Saída: nota editável, wikilink clicável e backlink persistido.

## Fase 2 — grafo e busca

Entregáveis:

- projeção Graphology;
- Sigma global/local;
- zoom, pan, drag, clique, hover e destaque;
- filtros e nós isolados;
- busca por título/path/tag/conteúdo;
- layout em worker e persistência de preferências.

Saída: navegação útil entre explorer, nota, backlinks e grafo.

## Fase 3 — exportação e importação básica

Entregáveis:

- export ZIP seguro;
- teste de descompactação e compatibilidade estrutural;
- importadores `.md`, `.txt` e texto colado;
- detecção de colisões e preview;
- attachments metadata.

Saída: round trip básico sem perda relevante.

## Fase 4 — pipeline de IA

Entregáveis:

- `ingestions`, `ai_jobs` e migrations;
- `AIProvider` + fake;
- chunking determinístico até 200 mil caracteres;
- extração, merge, deduplicação, proposta e preview;
- commit transacional idempotente;
- progresso por estágios;
- provider real configurável server-side;
- teste com `fixtures/professor-historia.md`.

Saída: relato cria/expande vault sem apagar conteúdo anterior.

## Fase 5 — onboarding, voz e PWA

Entregáveis:

- primeira experiência com quatro tipos de entrada;
- Web Speech API quando suportada, com fallback claro;
- arquitetura de transcrição server-side futura;
- manifest, ícones e instalação PWA;
- mobile com destinos definidos;
- estados de erro, loading, retry e cancelamento.

Saída: fluxo utilizável em desktop e celular.

## Fase 6 — perguntar, conectar e limpar

Entregáveis:

- pergunta baseada no vault com links das notas-fonte;
- sugestões de conexão;
- detecção conservadora de duplicatas;
- merge somente com preview/confirmação;
- atualização segura de Contexto Mestre;
- rotinas reais.

Saída: IA melhora a rede sem virar fonte autônoma de fatos.

## Fase 7 — endurecimento para beta

Entregáveis:

- auditoria de autorização;
- limites por tamanho/tipo e proteção de upload;
- rate limiting;
- política de retenção e exclusão;
- acessibilidade;
- performance com vault grande;
- backup/restore testado;
- observabilidade e runbook;
- deploy apenas após autorização.

## Backlog pós-MVP

- PDF/DOCX;
- export ChatGPT/Notion;
- import de vault Obsidian completo;
- embeddings/pgvector;
- versionamento de notas;
- sincronização;
- colaboração;
- aplicativos nativos;
- cobrança e planos.

## Regra de sequência

Não pular diretamente para RAG, cobrança ou design elaborado antes de concluir o núcleo do vault, links, isolamento e exportação.
