# ADR 0002 — estratégia de jobs no MVP

## Status

Aceita.

## Decisão

A ingestão usa registros persistidos em `ingestions` e `ai_jobs`, com hash de conteúdo, estágios, progresso, tentativas, erro sanitizado e proposta validada. No MVP, o processamento acontece de forma síncrona dentro da requisição server-side, mas cada transição é persistida e a mesma entrada reutiliza o mesmo job.

O commit da proposta é separado do processamento, exige seleção explícita do usuário e aplica todas as notas e relações em uma única transação PostgreSQL. Repetir o commit de um job concluído devolve o resultado anterior sem duplicar notas.

## Consequências

- O fluxo é demonstrável sem fila, worker ou serviço pago.
- Jobs falhos podem ser retomados enviando novamente a mesma entrada.
- O endpoint de status torna o processamento observável.
- Requisições longas ainda ficam limitadas pelo runtime HTTP; antes de produção pública, o executor pode migrar para uma fila sem alterar o contrato persistido.
