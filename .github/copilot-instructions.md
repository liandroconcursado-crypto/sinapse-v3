# GitHub Copilot instructions — SINAPSE

Leia e siga `AGENTS.md` como regra principal. Leia também os documentos em `docs/` antes de propor arquitetura ou alterar comportamento do produto.

SINAPSE é um vault Markdown portátil com wikilinks, backlinks, knowledge graph e ingestão assistida por IA. Não o transforme em dashboard, lista de tarefas com cards ou chat genérico.

Ao implementar:

- trabalhe em fatias verticais executáveis;
- preserve Markdown como formato canônico;
- mantenha autorização e IA no servidor;
- derive o usuário da sessão;
- valide fronteiras com Zod;
- mantenha domínio, serviços, persistência e UI separados;
- crie migrations para schema;
- escreva ou atualize testes;
- rode lint, typecheck, tests e build;
- não exponha segredos;
- não faça deploy sem autorização.

Quando a tarefa for ampla, apresente um plano curto e comece a executar. Não responda somente com pseudocódigo.
