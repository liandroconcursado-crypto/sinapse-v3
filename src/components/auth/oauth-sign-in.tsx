"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function OAuthSignIn() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

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
    if (result.error) {
      setPending(false);
      setError(result.error.message ?? "Não foi possível autenticar.");
      return;
    }
    router.push(`/api/auth/oauth2/authorize${window.location.search}`);
  }

  return (
    <main className="auth-shell">
      <section className="auth-copy">
        <span className="eyebrow">SINAPSE + CHATGPT</span>
        <h1>Seu cérebro acompanha a conversa.</h1>
        <p>Entre para permitir que o ChatGPT recupere e organize somente as memórias da sua conta.</p>
      </section>
      <form className="auth-form" onSubmit={submit}>
        <h2>{mode === "signup" ? "Criar conta" : "Entrar no SINAPSE"}</h2>
        {mode === "signup" && <label>Nome<input name="name" required minLength={2} autoComplete="name" /></label>}
        <label>E-mail<input name="email" type="email" required autoComplete="email" /></label>
        <label>Senha<input name="password" type="password" required minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} /></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary" disabled={pending}>{pending ? "Aguarde…" : mode === "signup" ? "Criar e continuar" : "Entrar e continuar"}</button>
        <button type="button" className="text-button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>{mode === "signin" ? "Ainda não tenho conta" : "Já tenho uma conta"}</button>
      </form>
    </main>
  );
}
