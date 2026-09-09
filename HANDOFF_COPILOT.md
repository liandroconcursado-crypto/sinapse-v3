# Passagem para o Copilot — SINAPSE v3

## Leia primeiro

1. `AGENTS.md`
2. `MASTER_PROMPT.md`
3. `PRODUCT_SPEC.md`
4. `AI_CONTRACT.md`
5. `ARCHITECTURE.md`
6. `docs/adr/0004-memoria-local-e-plugin-chatgpt.md`

## Correção de entendimento do produto

SINAPSE não é um editor de notas com uma caixa de IA. É um Segundo Cérebro que recebe conversa, voz, texto, arquivo ou histórico de outra IA e executa este ciclo:

`capturar → compreender → buscar antes de criar → classificar → conectar → atualizar memória canônica → registrar histórico → recuperar contexto na próxima conversa`

A experiência principal é conversar e despejar material bruto. O explorador Markdown, editor e grafo servem para conferir, navegar, corrigir e exportar. Não transforme o produto em dashboard de produtividade nem obrigue o usuário a organizar pastas manualmente.

## Referência funcional observada no Notion

A estrutura pessoal foi apenas estudada; dados pessoais não devem ser copiados para clientes. O template conceitual limpo contém:

- Contexto Mestre: identidade funcional, preferências, prioridades, restrições e estado atual.
- Neurônios: projetos, conceitos, pessoas, áreas, fontes, ideias e recursos.
- Memória episódica: decisões, eventos/sessões, correções e pendências de verificação.
- Sinapses: origem, tipo de relação, destino, justificativa, fonte e data.
- Agora: entradas e ações com estado, fonte, relação, prioridade e critério de conclusão.
- Recuperação por intenção: carregar primeiro o menor contexto pertinente; expandir pelas relações.
- Gravação: buscar antes de criar, preservar versões, separar fato/decisão/proposta/entrega e nunca inventar compromisso.
- Rotinas reais: `/briefing`, `/brain`, `/end`, `/review`, `/research`, `/study`, `/money`, `/project`, `/decision`, `/source`, `/idea`, `/next`.

## Erro encontrado no beta anterior

`src/server/services/ai/fake-ai-provider.ts` continha regexes específicas para a fixture do professor de História (`Roma`, `Revolução Francesa` etc.). Fora dessa história, o sistema quase não estruturava nada. Não reative esse provider nem trate heurística como IA generativa.

## O que já foi corrigido nesta passagem

- `LocalMemoryProvider` generalizado em `src/server/services/ai/local-memory-provider.ts`.
- Classificação conservadora de contexto, projeto, decisão, ação, fonte e conhecimento.
- Criação/atualização de `Contexto Mestre.md`.
- Registro de cada ingestão em `07 - Memória episódica`.
- Sinapses com justificativa, mantendo inferências marcadas.
- Busca de semelhantes para não duplicar silenciosamente.
- Gravação automática não destrutiva por padrão; revisão manual é opcional.
- Importação de `.json` exportado pelo ChatGPT, além de `.md` e `.txt`.
- Modo `build` cria as notas de sistema `SINAPSE.md` e `ROTINAS.md`.
- Render configurado com `AI_PROVIDER=local`, sem custo de API.

## Arquitetura correta para o chat normal

Implementar um plugin **MCP remoto, inicialmente tool-only**, conectado ao backend atual. O SINAPSE não chama a API da OpenAI. O ChatGPT/Codex usa suas próprias capacidades de conversa e chama ferramentas do SINAPSE.

Ferramentas mínimas:

1. `search` — leitura, busca memórias por texto/tipo/projeto/período.
2. `fetch` — leitura, abre memória por ID estável com relações e evidências.
3. `get_context` — leitura, recupera Contexto Mestre e nós pertinentes.
4. `capture_memory` — escrita, entrada idempotente e proposta estruturada.
5. `commit_memory_update` — escrita, aplica seleção confirmada atomicamente.
6. `close_session` — escrita, consolida fatos duráveis, decisões explícitas, correções, entregas e ações.

Requisitos obrigatórios:

- endpoint público `POST /mcp` com Streamable HTTP;
- SDK oficial `@modelcontextprotocol/sdk` e Zod;
- OAuth 2.1 conforme MCP para qualquer dado específico ou escrita;
- `userId` derivado do token verificado, nunca do argumento da ferramenta;
- ferramentas de leitura separadas das mutações;
- descrições por intenção e annotations corretas;
- idempotência por origem/hash/período;
- resultados pequenos com IDs/links; sem texto pessoal em logs;
- nenhuma chamada à API OpenAI dentro do servidor;
- política de privacidade e exclusão antes da submissão pública.

Documentação oficial consultada:

- https://developers.openai.com/plugins/quickstart
- https://developers.openai.com/plugins/plan/tools
- https://developers.openai.com/plugins/build/mcp-server
- https://developers.openai.com/plugins/build/auth
- https://developers.openai.com/plugins/deploy/connect-chatgpt
- https://developers.openai.com/plugins/deploy/submission

## MCP implementado nesta passagem

- endpoint Streamable HTTP `/mcp`;
- OAuth 2.1, JWT e Client ID Metadata Documents com Better Auth;
- migrations versionadas para as tabelas OAuth;
- `search`, `fetch`, `get_context`, `capture_memory` e `commit_memory_update`;
- todas as ferramentas com `inputSchema`, `outputSchema` e três annotations explícitas;
- telas de login e consentimento;
- metadados OAuth em `/.well-known/`;
- arquivo `chatgpt-app-submission.json` com cinco casos positivos e três negativos.

## Próximas tarefas em ordem

### 1. Fechar a fatia local atual

- Rodar lint, typecheck, unit/integration, build e E2E.
- Corrigir qualquer regressão do `LocalMemoryProvider`.
- Adicionar E2E com uma pessoa/tema não presentes nas fixtures antigas.
- Testar `conversations.json` com múltiplas conversas e arquivo inválido.
- Melhorar a tela pós-ingestão para mostrar “o que foi lembrado” por categoria, sem parecer formulário técnico.
- Remover ou manter `fake-ai-provider.ts` apenas como fixture explicitamente de teste; produção deve usar `local`.

### 2. Tornar a memória recuperável

- Implementar busca real na caixa superior.
- Criar serviço de recuperação que ranqueie título, conteúdo, tags, projeto, data e vizinhança no grafo.
- Responder com notas/fontes usadas; não responder apenas “encontrei contexto”.
- Implementar Contexto Mestre gerenciado por seções, preservando texto livre.
- Modelar sinapse com relação, justificativa, evidência e estado; wikilink sozinho não basta.

### 3. Importação de conhecimento em escala

- Processar exports grandes em lotes retomáveis, sem truncar silenciosamente.
- Mostrar quantidade total, processada, ignorada e erros.
- Aceitar export do ChatGPT, Markdown/Obsidian ZIP e export Markdown/CSV do Notion.
- Deduplicar por hash de origem, URL/DOI, título e similaridade conservadora.
- Preservar o original ou metadados suficientes para rastreabilidade.

### 4. Plugin MCP

- Ler as páginas oficiais acima antes de codificar.
- O corte tool-only está implementado; UI dentro do ChatGPT é posterior.
- Criar mais testes de contrato e usar MCP Inspector.
- Testar OAuth completo no Developer Mode com o endpoint HTTPS após o deploy.
- Não submeter publicamente até OAuth, privacidade e casos de teste estarem completos.

### 5. Produto e infraestrutura

- A hospedagem gratuita atual é apenas beta e tem limites físicos; não prometa infinito.
- Não criar plano pago/recurso externo sem autorização específica, embora o usuário tenha autorizado procedimentos técnicos do beta.
- Manter o vault exportável em Markdown/ZIP e compatível com Obsidian.
- O armazenamento próprio é a fonte operacional; Notion/Drive/Obsidian são importadores/exportadores, não dependências obrigatórias.

## Prompt pronto para colar no Copilot

> Leia integralmente `AGENTS.md`, `MASTER_PROMPT.md` e `HANDOFF_COPILOT.md`. Continue o SINAPSE a partir do estado atual sem reverter mudanças existentes. O produto é um Segundo Cérebro conversacional, não um editor manual de notas. Primeiro conclua e valide a fatia do `LocalMemoryProvider`, a importação de `conversations.json` e a gravação automática não destrutiva. Depois implemente recuperação real de memória e prepare o plugin MCP tool-only para ChatGPT/Codex seguindo a documentação oficial indicada no handoff. Não use API paga de modelo, não invente fatos, não exponha dados entre usuários e mantenha Markdown/Obsidian como formato portátil. Leia os guias locais do Next em `node_modules/next/dist/docs/` antes de alterar rotas. Execute todos os comandos da Definition of Done e informe qualquer falha sem mascará-la.

## Comandos de validação

```powershell
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm build
pnpm test:e2e
git status --short
```

Integração e E2E exigem PostgreSQL acessível e as variáveis de ambiente já documentadas no README/CI.
