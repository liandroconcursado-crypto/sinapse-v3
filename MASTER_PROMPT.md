# Tarefa mestre — construir o SINAPSE v3

Você é o engenheiro principal e arquiteto deste repositório. Implemente uma aplicação executável; não entregue apenas sugestões, wireframes ou pseudocódigo.

Leia integralmente, nesta ordem:

1. `AGENTS.md`
2. `docs/PRODUCT_SPEC.md`
3. `docs/ARCHITECTURE.md`
4. `docs/AI_CONTRACT.md`
5. `docs/IMPLEMENTATION_PLAN.md`
6. `docs/ACCEPTANCE_TESTS.md`

## Missão

Construir o SINAPSE: um segundo cérebro no qual o usuário despeja texto, transcrição ou arquivos e a IA transforma o conteúdo em um vault portátil de notas Markdown, `[[wikilinks]]`, backlinks, pastas e um grafo navegável.

Não aproveite código do Floot automaticamente. Esta é uma implementação limpa. Código antigo só pode ser incorporado depois de revisão explícita, teste e compatibilidade com esta arquitetura.

## Forma de trabalhar

1. Inspecione o repositório e confirme quais arquivos existem.
2. Registre um plano curto e executável.
3. Implemente por fatias verticais seguindo `docs/IMPLEMENTATION_PLAN.md`.
4. Tome decisões técnicas razoáveis sem interromper o usuário.
5. Não comece por decoração visual. Comece pelo modelo de conhecimento e pelos invariantes.
6. Não pare no scaffolding.
7. Ao final de cada fase, execute lint, typecheck, testes e build.
8. Corrija falhas antes de declarar a fase concluída.
9. Faça commits pequenos e descritivos quando o ambiente estiver autorizado a fazer commits.
10. Não publique, não faça deploy e não crie serviços pagos sem autorização explícita.

## Primeiro marco obrigatório

Entregue uma fatia vertical local que permita:

- iniciar PostgreSQL localmente;
- criar usuário de desenvolvimento ou autenticar de forma segura;
- criar uma nota Markdown;
- detectar `[[wikilinks]]` e `[[wikilinks|com alias]]`;
- persistir links e backlinks;
- mostrar arquivos no explorer;
- abrir e editar a nota em CodeMirror;
- mostrar o grafo correspondente;
- exportar o vault em ZIP;
- passar nos testes unitários e de integração dessa fatia.

Depois implemente a ingestão por IA.

## Restrições fundamentais

- Markdown é o conteúdo canônico e exportável.
- A estrutura de pastas é representada por `path`; não crie um formato fechado.
- Toda leitura e escrita server-side deve ser escopada por `userId`.
- Nunca aceite `userId` do cliente como fonte de autorização.
- Nunca exponha chaves de IA ou banco no frontend.
- Toda mutação de nota e links deve ocorrer em transação.
- Links quebrados são permitidos e devem aparecer como destinos ainda não materializados.
- Títulos duplicados precisam de resolução determinística; não ligue silenciosamente à nota errada.
- A IA nunca pode inventar fatos, decisões, fontes ou compromissos do usuário.
- Ingestões grandes são jobs idempotentes, retomáveis e observáveis.
- O vault anterior nunca é apagado ao expandir o cérebro.
- Exportação deve produzir ZIP utilizável no Obsidian.

## Stack definida

Use as versões estáveis compatíveis disponíveis no momento da instalação e fixe-as no lockfile:

- Next.js App Router e React;
- TypeScript strict;
- PostgreSQL;
- Drizzle ORM e migrations versionadas;
- CodeMirror 6;
- Sigma.js e Graphology;
- TanStack Query;
- Zod;
- Vitest + Testing Library;
- Playwright;
- pnpm.

Escolha uma solução madura de autenticação compatível com Next.js e PostgreSQL. Antes de instalar, consulte a documentação oficial disponível no ambiente. Registre a escolha em `docs/adr/0001-auth.md`. Para desenvolvimento local, forneça um caminho documentado que não dependa de e-mail real.

## Estrutura esperada

Você pode ajustar nomes, mas preserve a separação de responsabilidades:

```text
src/
  app/
  components/
    explorer/
    editor/
    graph/
    backlinks/
    ingestion/
  server/
    auth/
    db/
    repositories/
    services/
      notes/
      links/
      export/
      ingestion/
      ai/
  domain/
    vault/
    wikilinks/
    ingestion/
  lib/
tests/
  unit/
  integration/
  e2e/
drizzle/
docs/adr/
```

## UX obrigatória

Desktop:

```text
barra: busca | entrada IA | grafo | exportar | conta
explorer de arquivos | editor/preview Markdown | backlinks/contexto/grafo local
```

Mobile: navegação compacta por `Arquivos`, `Nota`, `Grafo`, `IA` e `Links`. Não converter em dashboard.

A primeira experiência oferece `Falar`, `Escrever`, `Colar texto` e `Importar arquivo`, com a mensagem: “Jogue a bagunça aqui. O SINAPSE organiza.”

## IA

Implemente `AIProvider` server-side e um `FakeAIProvider` determinístico para testes e desenvolvimento. O sistema precisa funcionar e ser demonstrável sem consumir uma API externa.

Pipeline:

```text
input -> normalização -> chunking -> extração por bloco -> merge/deduplicação
-> plano de mutação -> validação -> prévia -> commit transacional -> reindexação do grafo
```

Para entradas longas, não envie tudo em uma chamada. Projete inicialmente para 200 mil caracteres. Exiba progresso por estágios. Use o contrato de `docs/AI_CONTRACT.md` e valide toda saída com Zod antes de tocar no banco.

## Qualidade mínima

Implemente testes para:

- parsing e normalização de wikilinks;
- alias;
- backlinks;
- links quebrados;
- colisão de títulos;
- criação e atualização de notas;
- deduplicação;
- isolamento entre usuários;
- idempotência de ingestão;
- ingestão grande;
- merge que preserva conteúdo anterior;
- exportação ZIP segura;
- geração dos dados do grafo;
- fluxo E2E essencial.

Proteja a exportação contra path traversal e nomes inválidos. Não permita que caminhos do vault escapem da raiz do ZIP.

## Conclusão de cada fase

Informe objetivamente:

- implementado;
- arquivos principais alterados;
- comandos executados;
- testes aprovados;
- limitações reais;
- próximo passo.

Comece agora pela Fase 0 e prossiga até deixar a primeira fatia vertical funcionando. Se encontrar uma ambiguidade não bloqueante, escolha a opção mais simples e registre a decisão. Pergunte apenas quando faltar credencial, autorização externa ou uma escolha que altere materialmente o produto.
