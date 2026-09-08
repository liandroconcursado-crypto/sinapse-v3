# Acceptance Tests — MVP

## A. Conta e isolamento

- A1: usuário A cria nota e usuário B não a lista, abre, busca, altera ou exporta.
- A2: trocar `noteId` na URL/API não contorna autorização.
- A3: cliente não consegue escolher `userId` efetivo.

## B. Notas e wikilinks

- B1: salvar `[[Roma Antiga]]` cria outgoing link.
- B2: nota alvo mostra backlink.
- B3: `[[Roma Antiga|Roma]]` preserva alias e resolve o mesmo alvo.
- B4: wikilink em bloco de código não cria relação.
- B5: link sem alvo permanece visível como quebrado.
- B6: dois títulos normalizados iguais não são resolvidos aleatoriamente.
- B7: editar uma nota substitui o índice de outgoing links sem deixar relações fantasmas.
- B8: conflito de autosave entre duas versões é detectado.

## C. Interface

- C1: explorer abre nota no editor.
- C2: clicar em wikilink abre destino ou oferece criar nota.
- C3: painel direito mostra backlinks e outgoing links corretos.
- C4: mobile permite alcançar Arquivos, Nota, Grafo, IA e Links.
- C5: navegação principal não depende de dashboard/cards.

## D. Grafo

- D1: todas as notas são nós, inclusive isoladas.
- D2: links resolvidos viram arestas com IDs de notas.
- D3: clicar abre nota.
- D4: busca/filtro reduz visualização corretamente.
- D5: layout não congela o editor com fixture grande.

## E. Ingestão

- E1: fixture do professor gera projetos, áreas, conhecimento, fontes, decisões e ações sem criar itens genéricos demais.
- E2: “quero talvez criar um canal” não vira compromisso confirmado.
- E3: decisão explícita de reduzir slides é marcada como explícita.
- E4: obra citada não ganha autor/edição/link inventados.
- E5: reprocessar a mesma ingestão não duplica notas.
- E6: expandir preserva texto manual anterior.
- E7: entrada de 200 mil caracteres é processada por chunks.
- E8: progresso passa por estágios coerentes e falha pode ser retomada.
- E9: proposta inválida não toca no banco.
- E10: preview permite rejeitar operação antes do commit.

## F. Exportação

- F1: ZIP contém paths e `.md` esperados.
- F2: conteúdo Markdown e wikilinks são preservados.
- F3: paths com `..`, absolutos ou byte nulo são rejeitados.
- F4: vault exportado pode ser descompactado e aberto como pasta de notas.
- F5: usuário nunca exporta nota de outro usuário.

## G. Qualidade

- G1: instalação limpa segue README.
- G2: migration sobe banco vazio.
- G3: lint passa.
- G4: typecheck passa.
- G5: testes passam sem API externa.
- G6: build de produção passa.
- G7: `.env.example` não contém segredo real.

## Teste manual final

1. Criar conta A.
2. Colar `fixtures/professor-historia.md`.
3. Construir cérebro e revisar proposta.
4. Confirmar criação.
5. Abrir `Revolução Francesa`.
6. Seguir wikilink para `Revolução Haitiana`.
7. Ver backlink.
8. Navegar no grafo.
9. Adicionar novo parágrafo e expandir.
10. Confirmar que notas antigas permanecem.
11. Exportar ZIP.
12. Descompactar e verificar no Obsidian ou leitor Markdown compatível.

O MVP não é aceito enquanto esse roteiro falhar em etapa essencial.
