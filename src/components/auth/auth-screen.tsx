"use client";

import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

export function AuthScreen() {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const fields = new FormData(event.currentTarget);
    const email = String(fields.get("email"));
    const password = String(fields.get("password"));
    const result = mode === "signup"
      ? await authClient.signUp.email({ name: String(fields.get("name")), email, password })
      : await authClient.signIn.email({ email, password });
    setPending(false);
    if (result.error) setError(result.error.message ?? "Não foi possível autenticar.");
    else window.location.reload();
  }

  return (
    <main className="auth-shell">
      <section className="auth-copy">
        <span className="eyebrow">SINAPSE</span>
        <h1>Jogue a bagunça aqui.<br />O SINAPSE organiza.</h1>
        <p>Um vault Markdown portátil, com links, backlinks e um grafo que ajuda você a reencontrar contexto.</p>
        <div className="entry-modes" aria-label="Formas de começar">
          <span>Falar</span><span>Escrever</span><span>Colar texto</span><span>Importar arquivo</span>
        </div>
      </section>
      <form className="auth-form" onSubmit={submit}>
        <h2>{mode === "signup" ? "Criar cérebro local" : "Entrar"}</h2>
        {mode === "signup" && <label>Nome<input name="name" required minLength={2} autoComplete="name" /></label>}
        <label>E-mail<input name="email" type="email" required autoComplete="email" placeholder="voce@local.test" /></label>
        <label>Senha<input name="password" type="password" required minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary" disabled={pending}>{pending ? "Aguarde…" : mode === "signup" ? "Criar conta" : "Entrar"}</button>
        <button type="button" className="text-button" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>
          {mode === "signup" ? "Já tenho uma conta" : "Quero criar uma conta"}
        </button>
        <small>Desenvolvimento local: use qualquer e-mail fictício; nenhum e-mail será enviado.</small>
      </form>
    </main>
  );
}
