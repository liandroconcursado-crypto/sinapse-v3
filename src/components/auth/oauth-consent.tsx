"use client";

import { useState } from "react";

export function OAuthConsent() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function decide(accept: boolean) {
    setPending(true);
    setError("");
    const response = await fetch("/api/auth/oauth2/consent", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accept, oauth_query: window.location.search.slice(1) }),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok || !payload || typeof payload !== "object" || !("redirect_uri" in payload) || typeof payload.redirect_uri !== "string") {
      setPending(false);
      setError("Não foi possível concluir a autorização.");
      return;
    }
    window.location.assign(payload.redirect_uri);
  }

  return (
    <main className="auth-shell">
      <section className="auth-copy">
        <span className="eyebrow">AUTORIZAÇÃO</span>
        <h1>Conectar o ChatGPT ao seu SINAPSE?</h1>
        <p>O ChatGPT poderá buscar, ler e organizar conteúdo no seu vault. O acesso é limitado à sua conta, pode ser revogado e não altera a portabilidade dos arquivos Markdown.</p>
      </section>
      <section className="auth-form">
        <h2>Permissões solicitadas</h2>
        <p className="capture-message">Ler notas e conexões; recuperar contexto; criar ou atualizar memórias quando você pedir.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary" disabled={pending} onClick={() => decide(true)}>Permitir conexão</button>
        <button className="text-button" disabled={pending} onClick={() => decide(false)}>Cancelar</button>
      </section>
    </main>
  );
}
