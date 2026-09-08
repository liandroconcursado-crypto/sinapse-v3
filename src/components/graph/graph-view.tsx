"use client";

import Graph from "graphology";
import Sigma from "sigma";
import { useEffect, useRef } from "react";
import type { GraphProjection } from "@/server/services/graph/graph-service";

export function GraphView({ data, onOpenNote }: { data: GraphProjection; onOpenNote: (id: string) => void }) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!host.current) return;
    const graph = new Graph({ multi: true, type: "directed" });
    data.nodes.forEach((node, index) => {
      const angle = (index / Math.max(data.nodes.length, 1)) * Math.PI * 2;
      const radius = 8 + Math.sqrt(data.nodes.length) * 2;
      graph.addNode(node.id, {
        label: node.title,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        size: 5 + Math.min(node.degree, 6),
        color: node.degree ? "#62d9c7" : "#667085",
        path: node.path,
      });
    });
    for (const edge of data.edges) {
      if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
        graph.addEdgeWithKey(edge.id, edge.source, edge.target, { size: Math.min(edge.weight, 4), color: "#3f6f6b" });
      }
    }
    const renderer = new Sigma(graph, host.current, { renderEdgeLabels: false, labelDensity: 0.8 });
    renderer.on("clickNode", ({ node }) => onOpenNote(node));
    renderer.on("enterNode", ({ node }) => {
      const neighbors = new Set(graph.neighbors(node));
      renderer.setSetting("nodeReducer", (candidate, attributes) => candidate === node || neighbors.has(candidate)
        ? attributes
        : { ...attributes, color: "#2b323d", label: "" });
      renderer.setSetting("edgeReducer", (candidate, attributes) => graph.extremities(candidate).includes(node)
        ? { ...attributes, color: "#62d9c7" }
        : { ...attributes, hidden: true });
      renderer.refresh();
    });
    renderer.on("leaveNode", () => {
      renderer.setSetting("nodeReducer", null);
      renderer.setSetting("edgeReducer", null);
      renderer.refresh();
    });
    return () => renderer.kill();
  }, [data, onOpenNote]);

  return <div ref={host} className="graph-canvas" aria-label="Grafo de notas" />;
}
