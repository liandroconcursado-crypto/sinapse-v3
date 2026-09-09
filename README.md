# SINAPSE v3

Segundo cérebro portátil baseado em Markdown, wikilinks, backlinks, knowledge graph e ingestão assistida por IA.

> Jogue a bagunça aqui. O SINAPSE organiza.

O beta inclui autenticação, vault em PostgreSQL, editor Markdown, wikilinks/backlinks, grafo, exportação ZIP, organização automática conservadora e uma experiência PWA responsiva com voz, escrita, texto colado e importação de Markdown, texto ou export do ChatGPT.

## North Star

```text
VAULT MARKDOWN
+ KNOWLEDGE GRAPH
+ IA QUE ORGANIZA O VAULT
```

O MVP deve transformar informação bruta em notas portáteis, permitir edição e navegação e exportar um ZIP compatível com Obsidian.

## Documentação

- Produto: `docs/PRODUCT_SPEC.md`
- Arquitetura: `docs/ARCHITECTURE.md`
- Contrato da IA: `docs/AI_CONTRACT.md`
- Plano: `docs/IMPLEMENTATION_PLAN.md`
- Aceite: `docs/ACCEPTANCE_TESTS.md`
- Ferramentas/MCPs: `docs/AGENT_TOOLING.md`

## Desenvolvimento local

Requisitos: Node.js 22+, pnpm 11 e Docker com Compose.

```powershell
Copy-Item .env.example .env.local
docker compose up -d postgres
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev
```

Acesse `http://localhost:3000`, crie uma conta com qualquer e-mail fictício e uma senha de pelo menos oito caracteres. Nenhum e-mail real é enviado.

## Qualidade

```powershell
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm build
pnpm test:e2e
```

Os testes de integração exigem `TEST_DATABASE_URL` ou `DATABASE_URL` apontando para um PostgreSQL migrado. O E2E também exige o banco e o Chromium do Playwright (`pnpm exec playwright install chromium`).

## ChatGPT e clientes MCP

O endpoint remoto é `https://SEU_DOMINIO/mcp`. Ele usa OAuth 2.1 e deriva a identidade exclusivamente do token autenticado. As ferramentas disponíveis são `search`, `fetch`, `get_context`, `capture_memory` e `commit_memory_update`.

Para desenvolvimento local, conecte um cliente MCP a `http://localhost:3000/mcp` depois de iniciar o banco, aplicar as migrations e subir o Next.js.

## Estado

Fases 0–5 disponíveis no primeiro corte funcional. A ingestão aceita até 8 milhões de caracteres no backend, persiste o progresso do job, separa conteúdo explícito, inferido e sugerido e aplica alterações não destrutivas em uma transação idempotente. O provider `local` é o padrão de produção e não usa rede, credenciais ou API paga de modelo; o provider `fake` permanece apenas como fixture determinística de teste.

Em navegadores compatíveis, use **Instalar app** para adicionar o SINAPSE ao computador ou celular. O ditado usa a Web Speech API quando disponível e apresenta entrada textual como fallback. O posicionamento de produto e monetização está registrado em `docs/adr/0003-distribuicao-e-monetizacao.md`.

## Beta no Render

O `render.yaml` provisiona o serviço web e um PostgreSQL na mesma região, gera o segredo de autenticação e aplica migrations idempotentes antes de iniciar a instância. O plano gratuito é apropriado apenas para o beta: o serviço pode hibernar após inatividade e o banco expira em 30 dias.

## Privacidade e monetização

- Política pública: `/privacy`
- Termos do beta: `/terms`
- Estratégia de receita: `docs/MONETIZATION.md`
- Pacote de revisão do plugin: `chatgpt-app-submission.json`
