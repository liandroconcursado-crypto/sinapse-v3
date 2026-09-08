import { describe, expect, it } from "vitest";
import { projectGraph } from "@/server/services/graph/graph-service";

describe("graph projection", () => {
  it("inclui nós isolados e apenas links resolvidos como arestas", () => {
    const nodes = [
      { id: "a", title: "A", path: "A.md", tags: [] },
      { id: "b", title: "B", path: "B.md", tags: ["tema"] },
      { id: "c", title: "C", path: "C.md", tags: [] },
    ];
    const result = projectGraph(nodes, [
      { id: "ab", sourceNoteId: "a", targetNoteId: "b", kind: "wikilink", occurrenceCount: 2 },
      { id: "broken", sourceNoteId: "a", targetNoteId: null, kind: "wikilink", occurrenceCount: 1 },
    ]);
    expect(result.nodes).toHaveLength(3);
    expect(result.nodes.find((node) => node.id === "c")?.degree).toBe(0);
    expect(result.edges).toEqual([{ id: "ab", source: "a", target: "b", kind: "wikilink", weight: 2 }]);
  });
});
