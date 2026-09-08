# SINAPSE v3 — pacote de partida

Este pacote é a fonte inicial de verdade para construir o SINAPSE no Codex ou no GitHub Copilot.

## Caminho recomendado

1. Crie um repositório vazio chamado `sinapse-v3` no GitHub.
2. Copie todo o conteúdo deste pacote para a raiz do repositório.
3. Abra o repositório no Codex.
4. Cole integralmente o conteúdo de `MASTER_PROMPT.md` como a primeira tarefa.
5. Deixe o agente concluir a Fase 0 e a Fase 1 antes de pedir mudanças visuais.
6. Faça commits pequenos por fase e mantenha `main` sempre executável.

No GitHub Copilot, use o Agent Mode e cole o mesmo `MASTER_PROMPT.md`. O arquivo `.github/copilot-instructions.md` será lido como orientação permanente. No Codex, `AGENTS.md` cumpre essa função.

## Arquivos

- `MASTER_PROMPT.md`: ordem inicial completa para o agente.
- `AGENTS.md`: constituição técnica e de produto do repositório.
- `.github/copilot-instructions.md`: instruções equivalentes para o Copilot.
- `docs/PRODUCT_SPEC.md`: produto, fluxos, escopo e não objetivos.
- `docs/ARCHITECTURE.md`: arquitetura definida, modelo de dados e serviços.
- `docs/IMPLEMENTATION_PLAN.md`: fases, entregáveis e ordem de execução.
- `docs/ACCEPTANCE_TESTS.md`: critérios objetivos para dizer que o MVP funciona.
- `docs/AI_CONTRACT.md`: contrato de saída da IA e regras contra invenções.
- `fixtures/professor-historia.md`: relato de teste para ingestão.
- `.env.example`: contrato das variáveis de ambiente, sem segredos.

## Decisão técnica inicial

- Aplicação full-stack: Next.js App Router + TypeScript strict.
- Banco: PostgreSQL + Drizzle ORM.
- Editor: CodeMirror 6.
- Grafo: Sigma.js + Graphology.
- Estado remoto: TanStack Query.
- Validação: Zod.
- Testes: Vitest, Testing Library e Playwright.
- PWA: manifest + service worker, sem prometer offline total no primeiro MVP.
- IA: adaptador server-side desacoplado; nenhum segredo no navegador.

O agente pode substituir uma peça apenas se registrar uma ADR curta explicando ganho, custo e migração.

## Regra de ouro

O produto é:

> vault Markdown + knowledge graph + IA que organiza informação bruta.

Não é um dashboard, um gerenciador de tarefas genérico ou um chat com cards.
