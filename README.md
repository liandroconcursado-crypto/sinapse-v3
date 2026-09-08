# SINAPSE v3

Segundo cérebro portátil baseado em Markdown, wikilinks, backlinks, knowledge graph e ingestão assistida por IA.

> Jogue a bagunça aqui. O SINAPSE organiza.

O primeiro corte vertical já inclui autenticação local, vault em PostgreSQL, editor Markdown, wikilinks/backlinks, grafo e exportação ZIP.

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

## Estado

Fases 0–3 em implementação: o núcleo da primeira fatia funcional está disponível; ingestão por IA permanece para a próxima fase.
