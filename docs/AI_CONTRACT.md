# AI Contract — ingestão sem invenções

## 1. Objetivo

A IA converte material fornecido em uma proposta estruturada. Ela não escreve diretamente no banco e não recebe autoridade para apagar conhecimento.

## 2. Classes epistêmicas

Cada item precisa declarar uma origem:

- `explicit`: informado diretamente no material.
- `inferred`: inferência razoável, marcada como tal.
- `suggested`: sugestão da IA, não fato do usuário.

Decisões, compromissos, fontes e dados pessoais só podem ser `explicit`, salvo quando apresentados ao usuário apenas como sugestão não aplicada.

## 3. Saída lógica

Implementar schema Zod equivalente a:

```ts
type Evidence = {
  chunkId: string;
  excerpt: string; // curto, apenas para revisão
};

type ProposedNote = {
  temporaryId: string;
  operation: "create" | "update" | "possible_duplicate";
  proposedPath: string;
  title: string;
  kind: "context" | "project" | "area" | "knowledge" | "source" | "decision" | "action" | "journal" | "system";
  epistemicStatus: "explicit" | "inferred" | "suggested";
  summary: string;
  markdownSections: Array<{
    heading: string;
    body: string;
    mode: "append" | "replace_managed";
  }>;
  tags: string[];
  links: Array<{
    targetTitle: string;
    alias?: string;
    reason: string;
    epistemicStatus: "explicit" | "inferred" | "suggested";
  }>;
  evidence: Evidence[];
  confidence: number;
};

type IngestionProposal = {
  schemaVersion: 1;
  inputSummary: string;
  notes: ProposedNote[];
  warnings: string[];
  unresolved: Array<{ label: string; reason: string }>;
};
```

O schema implementado é autoridade, não o texto acima. Deve usar limites de tamanho, enums, strings não vazias e validações cruzadas.

## 4. Regras de geração

- Criar menos notas, mais úteis; não uma nota por frase.
- Não duplicar nota existente apenas por variação de plural, acento ou capitalização.
- Preferir atualizar/ligar quando houver correspondência clara.
- Não fabricar bibliografia. Uma obra citada sem detalhes continua incompleta.
- Não converter desejo em decisão.
- Não converter possibilidade futura em tarefa urgente.
- Não atribuir diagnóstico, intenção, prazo ou prioridade ausente.
- Preservar incertezas no campo `warnings`/`unresolved`.
- Toda nota factual deve ter ao menos uma evidência de chunk.
- Excerpts devem ser curtos e usados apenas para revisão; o conteúdo canônico continua sendo o input original e as notas confirmadas.

## 5. Prompting em camadas

### Extração por chunk

Extrair entidades úteis, projetos, assuntos, fontes, decisões explícitas, ações explícitas, restrições e relações, sempre com evidência.

### Merge

Unificar aliases e repetições, preservar conflitos e não resolver ambiguidade sem evidência.

### Planejamento contra o vault

Receber um índice limitado do vault existente, propor create/update/duplicate e evitar apagar conteúdo.

### Contexto Mestre

Atualizar apenas seção gerenciada pelo SINAPSE, delimitada por marcadores estáveis. Não sobrescrever texto livre do usuário.

## 6. Provider

```ts
interface AIProvider {
  extractChunk(input: ExtractChunkInput): Promise<ChunkExtraction>;
  mergeExtractions(input: MergeInput): Promise<IngestionProposal>;
  answerFromVault(input: VaultQuestionInput): Promise<VaultAnswer>;
}
```

Criar `FakeAIProvider` determinístico com fixtures. Provider real fica atrás de variável de ambiente e nunca roda em testes por padrão.

## 7. Falhas

- JSON inválido: reparar uma vez com schema explícito; depois falhar com mensagem segura.
- Rate limit: backoff limitado e job retomável.
- Timeout: preservar estágio e chunks concluídos.
- Saída enorme: rejeitar antes do banco e registrar métrica.
- Evidência ausente: rebaixar para sugestão ou excluir da proposta factual.

## 8. Privacidade

- Não logar texto bruto ou excerpts em produção por padrão.
- Informar claramente quando um provider externo processará conteúdo.
- Permitir excluir ingestão e original.
- Definir retenção antes de produção pública.
