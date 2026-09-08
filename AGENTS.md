# SINAPSE — regras para agentes

Estas instruções valem para todo o repositório.

## North Star

SINAPSE é um vault Markdown com knowledge graph e IA. A experiência principal nunca deve virar um dashboard de produtividade.

## Invariantes do produto

1. Markdown é o formato canônico do conteúdo.
2. `[[Nota]]` e `[[Nota|Alias]]` geram links navegáveis e backlinks.
3. O vault inteiro é exportável e utilizável no Obsidian.
4. O grafo é uma interface de navegação, não decoração.
5. Nova ingestão expande e atualiza; não apaga o cérebro existente.
6. Informação explícita, inferência e sugestão são categorias distintas.
7. A IA não inventa fatos pessoais, decisões, fontes, referências ou compromissos.

## Engenharia

- TypeScript strict; evite `any` e casts inseguros.
- Valide entradas externas com Zod nas fronteiras.
- Mantenha lógica de domínio fora de componentes React e route handlers.
- UI chama serviços; serviços aplicam regras; repositórios acessam dados.
- Toda query é escopada pelo usuário autenticado.
- O servidor deriva `userId` da sessão; nunca confia no valor enviado pelo cliente.
- Alterações de schema exigem migration versionada.
- Alterações de nota e relações devem ser atômicas.
- Jobs devem ser idempotentes e registrar estado, progresso e erro sanitizado.
- Secrets só no servidor e nunca em logs, bundles ou respostas.
- Não faça chamadas externas reais em testes.
- Não silencie erros com mocks que removam o comportamento relevante.

## UX

Desktop: `explorer | editor/preview | backlinks/contexto` e modo de grafo global.

Mobile: `Arquivos | Nota | Grafo | IA | Links`.

Dark-first, profissional e discreto. Evite cards enormes, gradientes chamativos, excesso de arredondamento, telas vazias e estética de infoproduto.

## Grafo

- Use IDs de nota como identidade dos nós, nunca apenas títulos.
- Cliques abrem notas; hover mostra contexto; vizinhos podem ser destacados.
- Suporte a filtros por pasta, tag e texto.
- Nós isolados são válidos e visíveis.
- O layout deve preservar posições quando possível para reduzir saltos visuais.

## Portabilidade e segurança

- Normalize caminhos para formato POSIX dentro do vault.
- Rejeite caminhos absolutos, `..`, bytes nulos e colisões perigosas.
- YAML frontmatter deve ser simples e legível.
- O usuário acessa seu conhecimento sem depender de formato proprietário.

## Disciplina de mudança

- Preserve alterações existentes não relacionadas.
- Prefira patches pequenos e revisáveis.
- Não introduza dependência sem justificar necessidade.
- Não mude a stack definida por preferência pessoal. Se a mudança for materialmente melhor, crie ADR antes.
- Não faça deploy ou crie recurso externo pago sem autorização.

## Definition of Done

Antes de concluir uma tarefa, execute os comandos reais definidos no `package.json` para:

- lint;
- typecheck;
- testes unitários/integrados;
- build;
- E2E quando o fluxo alterado for coberto.

Não declare sucesso se algum deles falhar. Informe testes não executados e o motivo.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
