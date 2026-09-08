# ADR 0003 — distribuição e monetização

## Status

Aceita para o beta.

## Decisão

O produto principal será um SaaS responsivo e instalável como PWA, com autenticação, vault e processamento mantidos pela infraestrutura do SINAPSE. Markdown continua sendo o formato canônico e o vault permanece exportável para Obsidian.

Notion, Obsidian, ChatGPT Apps/MCP e outros clientes serão adaptadores opcionais sobre o mesmo backend; nenhum deles será o armazenamento canônico. Assim, limites de contas gratuitas de terceiros não restringem o tamanho do cérebro do usuário nem criam dependência de plataforma.

O modelo comercial pretendido é freemium: um plano gratuito com cotas explícitas de armazenamento e processamento e planos pagos com mais capacidade, automações e uso de IA. A definição das cotas, cobrança e provedor de pagamento exige ADR próprio e autorização antes de criar recursos externos.

## Consequências

- A mesma conta e o mesmo vault funcionam no desktop e no celular.
- A PWA reduz a fricção de instalação sem exigir lojas no beta.
- Um app do ChatGPT pode servir como canal de distribuição futuro, mas não é requisito para receita nem fonte primária de identidade ou dados.
- Sincronização, backup, retenção, custos de IA e isolamento multiusuário passam a ser responsabilidades centrais do serviço.
