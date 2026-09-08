# Product Specification — SINAPSE v3

## 1. Problema

Conhecimento pessoal costuma ficar espalhado em conversas com IA, PDFs, notas, links, gravações, documentos e lembranças. Ferramentas poderosas como o Obsidian exigem que a pessoa aprenda a estruturar o vault. Ferramentas simples organizam tarefas, mas não constroem uma rede de conhecimento portátil.

## 2. Proposta de valor

> Jogue a bagunça aqui. O SINAPSE organiza.

O usuário envia material bruto. O SINAPSE propõe notas Markdown, pastas, conexões e contexto; o usuário revisa e aplica. O resultado continua sendo dele e pode ser aberto no Obsidian.

## 3. Usuário inicial

Profissionais, estudantes, professores, pesquisadores e criadores que acumulam contexto em muitas fontes e querem recuperar relações, decisões e próximas ações sem classificar tudo manualmente.

## 4. Princípios

- Portabilidade acima de aprisionamento.
- Informação fornecida acima de invenção.
- Estrutura útil acima de volume de notas.
- Revisão humana para mutações de IA potencialmente destrutivas.
- Progressive disclosure: primeira camada enxuta, expansão posterior.
- Grafo para navegar relações; texto para trabalhar com conteúdo.

## 5. Objetos centrais

- Vault: conjunto isolado de um usuário.
- Nota: arquivo lógico Markdown com path, título e metadados.
- Link: relação extraída de wikilink ou sugerida/confirmada.
- Ingestão: material bruto e seu processamento.
- Plano de mutação: proposta validada antes de gravar.
- Job de IA: execução, progresso, tentativas e erros.
- Attachment: arquivo original e metadados; conteúdo derivado não substitui o original.

## 6. Fluxos do MVP

### 6.1 Onboarding

Conta nova vê uma tela de construção, não dashboard vazio:

- Falar;
- Escrever;
- Colar texto;
- Importar `.md` ou `.txt`.

Após processar, o sistema apresenta uma prévia: notas novas, notas atualizadas, possíveis duplicatas e links. O usuário aplica e entra no workspace.

### 6.2 Workspace

Desktop:

- topo: busca, IA, grafo, exportar, conta;
- esquerda: pastas e notas;
- centro: editor/preview;
- direita: backlinks, outgoing links, relacionados, tags e grafo local.

Mobile:

- cinco destinos: Arquivos, Nota, Grafo, IA e Links.

### 6.3 Nota

- criar, renomear, mover, editar e excluir com confirmação;
- autosave com indicador de estado;
- Markdown e preview;
- autocomplete de wikilinks;
- abrir link por clique/atalho;
- backlinks atualizados ao salvar;
- histórico/versionamento fica pós-MVP, mas o modelo não deve impedir sua inclusão.

### 6.4 Grafo

- global e local;
- zoom, pan e drag;
- clique abre nota;
- hover mostra título/path;
- destaca vizinhos;
- busca e filtros;
- nós isolados visíveis;
- layout estável.

### 6.5 Construir e expandir com IA

Modos:

- Construir: cria a primeira arquitetura.
- Expandir: integra informação nova preservando o vault.
- Conectar: sugere links adicionais.
- Limpar: sugere merges/renomes; nunca executa destruição silenciosa.
- Contexto: atualiza `00 - Contexto/Contexto Mestre.md`.
- Perguntar: responde com evidência do vault e aponta notas usadas.

### 6.6 Exportar

ZIP com diretórios e `.md` reais. Pode incluir anexos e um manifesto opcional, mas as notas devem funcionar sem ele.

## 7. Estrutura inicial sugerida

```text
00 - Contexto/
01 - Projetos/
02 - Áreas/
03 - Conhecimento/
04 - Fontes/
05 - Decisões/
06 - Ações/
07 - Diário/
99 - Sistema/
```

Essa estrutura é padrão inicial, não ontologia rígida. O usuário pode criar e renomear pastas.

## 8. Notas de sistema

- `00 - Contexto/Contexto Mestre.md`: identidade funcional, objetivos, restrições, áreas e estado atual, somente com base informada.
- `99 - Sistema/SINAPSE.md`: como o vault está organizado.
- `99 - Sistema/ROTINAS.md`: rotinas disponíveis e o que fazem.

## 9. Ações/rotinas

`/briefing`, `/brain`, `/project`, `/study`, `/research`, `/decision`, `/source`, `/idea`, `/next`, `/end` e `/review` são ações reais da aplicação, com schemas e handlers; não são texto decorativo nem comandos fingidos.

## 10. Não objetivos do MVP

- colaboração multiusuário em tempo real;
- aplicativos nativos;
- OCR avançado;
- importador completo do Notion;
- sincronização bidirecional com Obsidian;
- marketplace de plugins;
- agentes autônomos tomando decisões pelo usuário;
- promessa de offline total;
- embeddings obrigatórios para o primeiro funcionamento.

## 11. Métricas de produto iniciais

- tempo até o primeiro vault útil;
- porcentagem de propostas aceitas/editadas/rejeitadas;
- duplicatas criadas por ingestão;
- links úteis confirmados;
- sucesso de exportação e reabertura;
- taxa de erro e duração por estágio de job;
- retorno semanal ao workspace.

## 12. Modelo comercial a não implementar ainda

A arquitetura pode medir uso por ingestão e armazenamento, mas preços, limites pagos e cobrança ficam fora do MVP até validar utilidade e custo real.
