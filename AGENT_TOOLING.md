# Codex, Copilot e MCPs

## Configuração recomendada

Use um único repositório GitHub como fonte de verdade.

- Codex: agente principal para implementar fases, refactors, testes e revisão ampla.
- GitHub Copilot Agent Mode: alternativa para executar as mesmas tarefas dentro do editor e apoio diário.
- GitHub: issues, branches, commits, PRs e CI.

Não mantenha duas implementações paralelas. Codex e Copilot trabalham sobre o mesmo histórico, uma tarefa/branch por vez.

## Ferramentas essenciais

### 1. GitHub

Uso: ler issues, criar branches/PRs quando autorizado, revisar diff e acompanhar CI.

Permissões mínimas. Não conceder acesso administrativo se leitura/escrita no repositório bastar.

### 2. Browser/Playwright

Uso: executar o fluxo real no navegador, capturar erros e validar desktop/mobile.

Priorizar Playwright no próprio repositório. Um MCP de browser é complementar, não substitui testes versionados.

### 3. PostgreSQL

Uso: inspecionar schema e dados de desenvolvimento. No começo, Docker Compose e comandos do projeto são suficientes; não é obrigatório dar ao agente acesso direto a banco externo.

Nunca conectar MCP de banco de produção com permissão de escrita durante desenvolvimento comum.

### 4. Documentação oficial

Uso: consultar APIs atuais de Next.js, CodeMirror, Sigma/Graphology, Drizzle e autenticação. Prefira documentação oficial e fixe versões no lockfile.

## Ferramentas opcionais

- Figma: quando o núcleo funcional estiver pronto e houver arquivo/design real.
- Vercel: preview/deploy após autorização.
- Supabase/Neon: se escolhidos como infraestrutura PostgreSQL; não necessários para desenvolver localmente.
- Sentry/observabilidade: fase beta.

## Não instalar por instalar

Evite dezenas de MCPs. Eles aumentam superfície de erro e permissões. Para o primeiro MVP, GitHub + browser + documentação são suficientes; PostgreSQL local pode continuar via terminal.

## Regra de segurança

- credenciais fora do repositório;
- `.env` ignorado;
- `.env.example` sem valores reais;
- princípio do menor privilégio;
- nenhuma ação destrutiva ou deploy sem autorização;
- banco de produção nunca usado para testes automatizados;
- revisar comandos e diffs antes de merge.

## Fluxo prático

1. Abrir issue de uma fase pequena.
2. Criar branch.
3. Dar ao agente tarefa com critério de aceite.
4. Agente implementa e roda verificações.
5. Revisar diff e executar fluxo real.
6. Abrir PR e deixar CI validar.
7. Fazer merge somente com `main` verde.

## Prompt curto para tarefas seguintes

```text
Leia AGENTS.md e a documentação relevante em docs/. Implemente a próxima fatia incompleta de docs/IMPLEMENTATION_PLAN.md. Preserve os invariantes do produto, atualize testes e rode lint, typecheck, tests e build. Não faça deploy. Ao final, informe alterações, verificações e limitações reais.
```

## Quando alternar agentes

Pode usar Copilot para uma tarefa local e Codex para a seguinte. Antes de alternar:

- commit ou guarde claramente o estado atual;
- atualize a issue/PR;
- não deixe dois agentes editarem a mesma branch ao mesmo tempo;
- peça ao novo agente para inspecionar diff e testes antes de continuar.
