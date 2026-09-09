# ADR 0004 — motor de memória local e plugin para ChatGPT

## Status

Aceito para o beta corrigido em 08/09/2026.

## Contexto

O beta publicado usava um `FakeAIProvider` preso a frases de uma fixture. A interface expunha o editor e uma proposta manual, mas não entregava o ciclo do Segundo Cérebro observado na estrutura canônica do usuário: recuperar contexto, classificar uma entrada, deduplicar, atualizar memória, registrar histórico e criar relações com significado.

Usar uma API de modelo no backend criaria custo variável e exigiria chave. Automatizar o site comum do ChatGPT por scraping não é uma integração suportada nem confiável. Por outro lado, um plugin remoto MCP permite que ChatGPT e Codex consultem e alterem dados do SINAPSE por ferramentas controladas.

## Decisão

O produto terá duas camadas complementares:

1. **Motor local sem API paga:** ingestão determinística, validação epistêmica, deduplicação conservadora, busca textual e criação de Contexto Mestre, neurônios, memória episódica, ações e sinapses. Ele é o fallback sempre disponível e nunca será chamado de modelo generativo.
2. **Plugin MCP autenticado:** ChatGPT/Codex fornecem a compreensão linguística na conversa normal e chamam ferramentas estreitas do SINAPSE para recuperar e consolidar memória. O MCP não chama a API de modelos da OpenAI; ele somente oferece dados e operações do produto.

O app principal permanece uma PWA para inspeção, correção, navegação pelo grafo e exportação. A conversa é a porta de entrada principal; o editor manual é uma ferramenta de precisão secundária.

## Superfície MCP planejada

- `search`: localizar memórias do usuário autenticado por texto, tipo, projeto e período.
- `fetch`: recuperar uma memória e seu contexto, fontes, histórico e sinapses.
- `get_context`: obter Contexto Mestre e o conjunto mínimo pertinente à intenção.
- `capture_memory`: registrar entrada bruta idempotente e produzir proposta estruturada.
- `commit_memory_update`: aplicar apenas operações confirmadas e não destrutivas.
- `close_session`: consolidar entregas, decisões explícitas, correções e próximas ações.

Leitura e escrita serão separadas. Escritas exigirão OAuth 2.1, escopo por usuário e confirmação adequada. Nenhum token de sessão será aceito do corpo da requisição.

## Consequências

- O usuário pode usar a inteligência do ChatGPT onde já conversa, sem fornecer uma chave de API ao SINAPSE.
- O funcionamento básico continua disponível sem ChatGPT ou provedor externo.
- A qualidade linguística máxima depende do host conectado; o fallback local é conservador e deve declarar suas limitações.
- “Sem limite de plano” significa não impor limites comerciais artificiais durante o beta. Armazenamento e processamento continuam sujeitos a limites físicos da infraestrutura, que devem ser informados honestamente.
- Publicação pública do plugin depende de endpoint HTTPS estável, OAuth 2.1, política de privacidade, testes e revisão da plataforma.

