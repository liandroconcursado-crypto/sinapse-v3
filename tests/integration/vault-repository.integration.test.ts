import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const describeWithDatabase = databaseUrl ? describe : describe.skip;

describeWithDatabase("vault repository with PostgreSQL", () => {
  type Repository = import("@/server/repositories/vault-repository").VaultRepository;
  type DatabasePool = typeof import("@/server/db").pool;

  let repository: Repository;
  let pool: DatabasePool;
  const userA = `test-a-${randomUUID()}`;
  const userB = `test-b-${randomUUID()}`;
  let vaultA: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = databaseUrl;
    process.env.BETTER_AUTH_SECRET ??= "integration-only-secret-with-32-characters";
    process.env.BETTER_AUTH_URL ??= "http://127.0.0.1:3000";

    const database = await import("@/server/db");
    const schema = await import("@/server/db/schema");
    const { VaultRepository } = await import("@/server/repositories/vault-repository");
    pool = database.pool;
    repository = new VaultRepository();
    await database.db.insert(schema.user).values([
      { id: userA, name: "Usuário A", email: `${userA}@local.test` },
      { id: userB, name: "Usuário B", email: `${userB}@local.test` },
    ]);
    vaultA = await repository.ensureDefaultVault({ userId: userA });
  });

  afterAll(async () => {
    if (!pool) return;
    await pool.query('DELETE FROM "user" WHERE id = ANY($1)', [[userA, userB]]);
    await pool.end();
  });

  it("persiste aliases, backlinks, links quebrados e reindexa após edição", async () => {
    const target = await repository.saveNote({ userId: userA }, {
      vaultId: vaultA,
      path: "Historia/Roma Antiga.md",
      title: "Roma Antiga",
      normalizedTitle: "roma antiga",
      contentMarkdown: "# Roma Antiga\n\nConteúdo manual preservado.",
      tags: ["historia"],
      links: [],
    });
    const source = await repository.saveNote({ userId: userA }, {
      vaultId: vaultA,
      path: "Historia/Republica.md",
      title: "República",
      normalizedTitle: "republica",
      contentMarkdown: "Veja [[Roma Antiga|Roma]] e [[Cartago]].",
      tags: [],
      links: [
        { targetText: "Roma Antiga", targetNormalized: "roma antiga", alias: "Roma", occurrenceCount: 1 },
        { targetText: "Cartago", targetNormalized: "cartago", alias: null, occurrenceCount: 1 },
      ],
    });

    expect(source.outgoing).toEqual(expect.arrayContaining([
      expect.objectContaining({ alias: "Roma", targetNoteId: target.id }),
      expect.objectContaining({ targetText: "Cartago", targetNoteId: null }),
    ]));
    expect((await repository.getNote({ userId: userA }, vaultA, target.id)).backlinks[0]?.source.id).toBe(source.id);

    const updated = await repository.saveNote({ userId: userA }, {
      vaultId: vaultA,
      noteId: source.id,
      path: source.path,
      title: source.title,
      normalizedTitle: "republica",
      contentMarkdown: "Sem links.",
      tags: [],
      expectedVersion: source.version,
      links: [],
    });
    expect(updated.outgoing).toEqual([]);
    expect((await repository.getNote({ userId: userA }, vaultA, target.id)).backlinks).toEqual([]);
  });

  it("detecta conflito e impede acesso entre usuários", async () => {
    const [note] = await repository.listNotes({ userId: userA }, vaultA);
    await expect(repository.getNote({ userId: userB }, vaultA, note.id)).rejects.toThrow("Vault não encontrado");
    await expect(repository.saveNote({ userId: userA }, {
      vaultId: vaultA,
      noteId: note.id,
      path: note.path,
      title: note.title,
      normalizedTitle: "roma antiga",
      contentMarkdown: note.contentMarkdown,
      tags: note.tags,
      expectedVersion: note.version + 10,
      links: [],
    })).rejects.toThrow("outra aba");
  });

  it("não resolve silenciosamente títulos duplicados", async () => {
    await repository.saveNote({ userId: userA }, {
      vaultId: vaultA,
      path: "Pessoas/Alex.md",
      title: "Alex",
      normalizedTitle: "alex",
      contentMarkdown: "# Alex 1",
      tags: [],
      links: [],
    });
    await repository.saveNote({ userId: userA }, {
      vaultId: vaultA,
      path: "Projetos/Alex.md",
      title: "Alex",
      normalizedTitle: "alex",
      contentMarkdown: "# Alex 2",
      tags: [],
      links: [],
    });
    const source = await repository.saveNote({ userId: userA }, {
      vaultId: vaultA,
      path: "Ambiguo.md",
      title: "Ambíguo",
      normalizedTitle: "ambiguo",
      contentMarkdown: "[[Alex]]",
      tags: [],
      links: [{ targetText: "Alex", targetNormalized: "alex", alias: null, occurrenceCount: 1 }],
    });
    expect(source.outgoing[0]?.targetNoteId).toBeNull();
  });

  it("processa e confirma ingestão de forma idempotente preservando conteúdo anterior", async () => {
    const { IngestionService } = await import("@/server/services/ingestion/ingestion-service");
    const service = new IngestionService();
    const text = await readFile("fixtures/professor-historia.md", "utf8");
    const proposal = await service.createProposal({ userId: userA }, { vaultId: vaultA, mode: "expand", sourceName: "Fixture professor", text, autoApply: false });
    expect(proposal.status).toBe("awaiting_review");
    expect(proposal.proposal?.notes.map((note) => note.kind)).toEqual(expect.arrayContaining(["project", "area", "knowledge", "source", "decision", "action"]));
    const selected = proposal.proposal?.notes.filter((note) => note.operation !== "possible_duplicate").map((note) => note.temporaryId) ?? [];
    const committed = await service.commit({ userId: userA }, proposal.ingestionId, { selectedTemporaryIds: selected });
    expect(committed.status).toBe("committed");
    const countAfterFirstCommit = (await repository.listNotes({ userId: userA }, vaultA)).length;

    const repeated = await service.createProposal({ userId: userA }, { vaultId: vaultA, mode: "expand", sourceName: "Fixture repetida", text, autoApply: false });
    const repeatedCommit = await service.commit({ userId: userA }, repeated.ingestionId, { selectedTemporaryIds: selected });
    expect(repeated.ingestionId).toBe(proposal.ingestionId);
    expect(repeatedCommit.commitResult).toEqual(committed.commitResult);
    expect((await repository.listNotes({ userId: userA }, vaultA)).length).toBe(countAfterFirstCommit);

    const roma = (await repository.listNotes({ userId: userA }, vaultA)).find((note) => note.title === "Roma Antiga");
    expect(roma?.contentMarkdown).toContain("Conteúdo manual preservado.");
  });

  it("protege o endpoint MCP e anuncia a descoberta OAuth", async () => {
    const { POST } = await import("@/app/mcp/route");
    const response = await POST(new Request("http://127.0.0.1:3000/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
    }));
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("resource_metadata");
  });
});
