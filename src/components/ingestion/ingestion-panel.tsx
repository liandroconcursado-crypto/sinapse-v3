"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import type { IngestionProposal } from "@/domain/ingestion/schema";

type JobPayload = {
  ingestionId: string;
  status: string;
  stage: string;
  progress: number;
  proposal: IngestionProposal | null;
  commitResult: { noteIds: string[] } | null;
  errorMessage: string | null;
};

async function requestJob(url: string, body: unknown): Promise<JobPayload> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const message = typeof payload === "object" && payload !== null && "error" in payload ? String(payload.error) : "A ingestão falhou.";
    throw new Error(message);
  }
  return payload as JobPayload;
}

export function IngestionPanel({ vaultId, onApplied }: { vaultId: string; onApplied: () => Promise<void> }) {
  const [job, setJob] = useState<JobPayload | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const propose = useMutation({
    mutationFn: (input: { text: string; sourceName: string; mode: "build" | "expand" }) => requestJob("/api/ingestions", { vaultId, ...input }),
    onSuccess: (created) => {
      setJob(created);
      setSelected(new Set(created.proposal?.notes.filter((note) => note.operation !== "possible_duplicate").map((note) => note.temporaryId) ?? []));
    },
  });
  const commit = useMutation({
    mutationFn: () => {
      if (!job) throw new Error("Proposta indisponível.");
      return requestJob(`/api/ingestions/${job.ingestionId}/commit`, { selectedTemporaryIds: [...selected] });
    },
    onSuccess: async (committed) => { setJob(committed); await onApplied(); },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    propose.mutate({
      text: String(fields.get("text")),
      sourceName: String(fields.get("sourceName")) || "Texto colado",
      mode: fields.get("mode") === "build" ? "build" : "expand",
    });
  }

  const proposal = job?.proposal;
  const selectedCount = useMemo(() => selected.size, [selected]);

  return <section className="ingestion-shell">
    <header>
      <p className="eyebrow">CONSTRUIR COM IA</p>
      <h1>Jogue a bagunça aqui.</h1>
      <p>O provider falso organiza localmente e prepara uma proposta. Nada é gravado no vault antes da sua revisão.</p>
    </header>
    {!proposal ? <form className="ingestion-form" onSubmit={submit}>
      <div className="ingestion-fields">
        <label>Fonte<input name="sourceName" defaultValue="Texto colado" maxLength={240} /></label>
        <label>Modo<select name="mode" defaultValue="expand"><option value="expand">Expandir</option><option value="build">Construir</option></select></label>
      </div>
      <label>Conteúdo<textarea name="text" required maxLength={200_000} rows={16} placeholder="Cole uma transcrição, relato ou texto de até 200 mil caracteres…" /></label>
      {propose.error && <p className="form-error" role="alert">{propose.error.message}</p>}
      <button className="primary" disabled={propose.isPending}>{propose.isPending ? "Normalizando · extraindo · mesclando…" : "Preparar proposta"}</button>
    </form> : <div className="proposal">
      <div className="proposal-summary"><div><span>Prévia pronta</span><strong>{proposal.notes.length} notas propostas</strong></div><span>{job.progress}% · {job.stage}</span></div>
      {proposal.warnings.map((warning) => <p className="proposal-warning" key={warning}>{warning}</p>)}
      <div className="proposal-list">{proposal.notes.map((note) => {
        const disabled = note.operation === "possible_duplicate";
        return <label className="proposal-note" key={note.temporaryId}>
          <input type="checkbox" disabled={disabled} checked={selected.has(note.temporaryId)} onChange={(event) => setSelected((current) => {
            const next = new Set(current);
            if (event.target.checked) next.add(note.temporaryId); else next.delete(note.temporaryId);
            return next;
          })} />
          <span><span className={`epistemic ${note.epistemicStatus}`}>{note.epistemicStatus}</span> <span className="operation">{note.operation}</span></span>
          <strong>{note.title}</strong>
          <small>{note.proposedPath}</small>
          <p>{note.summary}</p>
          {note.evidence[0] && <blockquote>“{note.evidence[0].excerpt}”</blockquote>}
        </label>;
      })}</div>
      {proposal.unresolved.map((item) => <p className="proposal-warning" key={item.label}><strong>{item.label}:</strong> {item.reason}</p>)}
      {commit.error && <p className="form-error" role="alert">{commit.error.message}</p>}
      {job.status === "committed" ? <p className="commit-success">Aplicado: {job.commitResult?.noteIds.length ?? 0} notas criadas ou atualizadas.</p> : <div className="proposal-actions">
        <button onClick={() => { setJob(null); setSelected(new Set()); }}>Descartar proposta</button>
        <button className="primary" disabled={commit.isPending} onClick={() => commit.mutate()}>{commit.isPending ? "Aplicando em transação…" : `Aplicar selecionadas (${selectedCount})`}</button>
      </div>}
    </div>}
  </section>;
}
