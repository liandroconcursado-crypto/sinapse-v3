"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { NoteDetail, NoteRecord } from "@/domain/vault/types";
import type { GraphProjection } from "@/server/services/graph/graph-service";
import { authClient } from "@/lib/auth-client";
import { CodeEditor } from "@/components/editor/code-editor";
import { MarkdownPreview } from "@/components/editor/markdown-preview";
import { GraphView } from "@/components/graph/graph-view";

type VaultPayload = { vaultId: string; notes: NoteRecord[] };

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload: unknown = await response.json();
  if (!response.ok) {
    const message = typeof payload === "object" && payload !== null && "error" in payload ? String(payload.error) : "Operação falhou.";
    throw new Error(message);
  }
  return payload as T;
}

export function WorkspaceShell({ userName }: { userName: string }) {
  const client = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showGraph, setShowGraph] = useState(false);
  const vault = useQuery({ queryKey: ["vault"], queryFn: () => jsonRequest<VaultPayload>("/api/vault") });
  const vaultId = vault.data?.vaultId;
  const activeSelectedId = selectedId ?? vault.data?.notes[0]?.id ?? null;
  const detail = useQuery({
    queryKey: ["note", vaultId, activeSelectedId],
    enabled: Boolean(vaultId && activeSelectedId),
    queryFn: () => jsonRequest<NoteDetail>(`/api/vault/notes/${activeSelectedId}?vaultId=${vaultId}`),
  });
  const graph = useQuery({
    queryKey: ["graph", vaultId],
    enabled: Boolean(vaultId),
    queryFn: () => jsonRequest<GraphProjection>(`/api/vault/graph?vaultId=${vaultId}`),
  });

  const refreshVault = useCallback(async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ["vault"] }),
      client.invalidateQueries({ queryKey: ["graph"] }),
    ]);
  }, [client]);

  const create = useMutation({
    mutationFn: (title: string) => {
      if (!vaultId) throw new Error("Vault indisponível.");
      const safe = title.replace(/[\\/:*?"<>|]/g, "-").trim() || "Sem título";
      return jsonRequest<NoteDetail>("/api/vault/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaultId,
          path: `03 - Conhecimento/${safe}.md`,
          title,
          contentMarkdown: `# ${title}\n`,
          tags: [],
        }),
      });
    },
    onSuccess: async (note) => { await refreshVault(); setSelectedId(note.id); setShowGraph(false); },
  });

  const openNote = useCallback((id: string) => { setSelectedId(id); setShowGraph(false); }, []);
  const folders = useMemo(() => {
    const result = new Map<string, NoteRecord[]>();
    for (const note of vault.data?.notes ?? []) {
      const folder = note.path.includes("/") ? note.path.slice(0, note.path.lastIndexOf("/")) : "Raiz";
      result.set(folder, [...(result.get(folder) ?? []), note]);
    }
    return result;
  }, [vault.data?.notes]);

  if (vault.isLoading) return <main className="center-state">Abrindo seu cérebro…</main>;
  if (vault.error) return <main className="center-state error-state">{vault.error.message}<br /><small>Inicie o PostgreSQL e aplique a migration.</small></main>;

  return (
    <main className="workspace">
      <header className="topbar">
        <strong className="brand">SINAPSE</strong>
        <input className="search" placeholder="Buscar no vault" aria-label="Buscar no vault" />
        <button disabled title="Disponível na fase de ingestão">Entrada IA</button>
        <button onClick={() => setShowGraph((current) => !current)}>{showGraph ? "Nota" : "Grafo"}</button>
        <a className="button-link" href={`/api/vault/export?vaultId=${vaultId}`}>Exportar</a>
        <button className="account" onClick={() => authClient.signOut().then(() => window.location.reload())}>{userName} · sair</button>
      </header>
      <aside className="explorer">
        <div className="panel-title"><span>Arquivos</span><button onClick={() => create.mutate("Nova nota")}>＋</button></div>
        {[...folders].map(([folder, notes]) => <section key={folder} className="folder">
          <h2>{folder}</h2>
          {notes.map((note) => <button key={note.id} className={activeSelectedId === note.id ? "note-row active" : "note-row"} onClick={() => openNote(note.id)}>
            <span>◇</span>{note.title}
          </button>)}
        </section>)}
      </aside>
      <section className="work-area">
        {showGraph && graph.data ? <GraphView data={graph.data} onOpenNote={openNote} /> : detail.data ? (
          <NoteWorkspace key={detail.data.id} note={detail.data} onOpen={openNote} onCreate={(title) => create.mutate(title)} onSaved={refreshVault} />
        ) : (
          <div className="empty-note">
            <p className="eyebrow">PRIMEIRA NOTA</p>
            <h1>Jogue a bagunça aqui.<br />O SINAPSE organiza.</h1>
            <div className="entry-modes"><button disabled>Falar</button><button onClick={() => create.mutate("Nova nota")}>Escrever</button><button disabled>Colar texto</button><button disabled>Importar arquivo</button></div>
          </div>
        )}
      </section>
      <nav className="mobile-nav" aria-label="Navegação móvel">
        <button>Arquivos</button><button onClick={() => setShowGraph(false)}>Nota</button><button onClick={() => setShowGraph(true)}>Grafo</button><button disabled>IA</button><button>Links</button>
      </nav>
    </main>
  );
}

function NoteWorkspace({ note, onOpen, onCreate, onSaved }: {
  note: NoteDetail;
  onOpen: (id: string) => void;
  onCreate: (title: string) => void;
  onSaved: () => Promise<void>;
}) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState(note.contentMarkdown);
  const [version, setVersion] = useState(note.version);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const contentRef = useRef(content);

  const save = useMutation({
    mutationFn: (variables: { contentMarkdown: string; expectedVersion: number }) => jsonRequest<NoteDetail>(`/api/vault/notes/${note.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vaultId: note.vaultId, path: note.path, title: note.title, tags: note.tags, ...variables }),
    }),
    onSuccess: async (saved, variables) => {
      setVersion(saved.version);
      if (contentRef.current === variables.contentMarkdown) setDirty(false);
      queryClient.setQueryData(["note", note.vaultId, note.id], saved);
      await onSaved();
    },
  });

  useEffect(() => {
    if (!dirty || save.isPending) return;
    const timer = window.setTimeout(() => save.mutate({ contentMarkdown: contentRef.current, expectedVersion: version }), 800);
    return () => window.clearTimeout(timer);
  }, [content, dirty, save, version]);

  return <div className="note-layout">
    <section className="editor-pane">
      <header className="note-header">
        <div><h1>{note.title}</h1><span>{note.path}</span></div>
        <div><span className={save.isError ? "save-state error" : "save-state"}>{save.isError ? save.error.message : save.isPending ? "Salvando…" : dirty ? "Alterado" : "Salvo"}</span><button onClick={() => setPreview((current) => !current)}>{preview ? "Editar" : "Preview"}</button></div>
      </header>
      {preview
        ? <MarkdownPreview markdown={content} links={note.outgoing} onOpen={onOpen} onCreate={onCreate} />
        : <CodeEditor value={content} onChange={(value) => { contentRef.current = value; setContent(value); setDirty(true); }} />}
    </section>
    <aside className="context-panel">
      <section><h2>Links de saída</h2>{note.outgoing.length ? note.outgoing.map((link) => <button key={link.id} className={link.targetNoteId ? "context-link" : "context-link broken"} onClick={() => link.targetNoteId ? onOpen(link.targetNoteId) : onCreate(link.targetText)}>{link.alias ?? link.targetText}{!link.targetNoteId && " · quebrado"}</button>) : <p>Nenhum link ainda.</p>}</section>
      <section><h2>Backlinks</h2>{note.backlinks.length ? note.backlinks.map(({ source, link }) => <button key={link.id} className="context-link" onClick={() => onOpen(source.id)}>{source.title}</button>) : <p>Nenhuma nota aponta para cá.</p>}</section>
      <section><h2>Tags</h2><p>{note.tags.length ? note.tags.map((tag) => `#${tag}`).join(" ") : "Sem tags"}</p></section>
    </aside>
  </div>;
}
