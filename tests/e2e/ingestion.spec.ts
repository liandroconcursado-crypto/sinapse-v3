import { expect, test } from "@playwright/test";

test("revisa e aplica uma ingestão antes de alterar o vault", async ({ page }) => {
  const email = `ingestion-e2e-${Date.now()}@local.test`;
  await page.goto("/");
  await page.getByLabel("Nome").fill("Pessoa Ingestão E2E");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senha-segura-123");
  await page.getByRole("button", { name: "Criar conta" }).click();

  await expect(page.locator(".topbar")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Entrada IA" }).click();
  await page.getByLabel("Fonte").fill("Relato E2E");
  await page.getByLabel("Conteúdo").fill(
    "Meu nome é Marina e prefiro respostas objetivas. O Projeto Aurora organiza conhecimento científico. Decidi usar Markdown como formato principal. Preciso entrevistar três pesquisadoras.",
  );
  await page.getByLabel("Revisar a proposta antes de gravar (opcional)").check();
  await page.getByRole("button", { name: "Organizar no meu cérebro" }).click();

  await expect(page.getByText("Prévia pronta")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Contexto Mestre", { exact: true })).toBeVisible();
  await expect(page.getByText("Importação · Relato E2E", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Aplicar selecionadas/ }).click();

  await expect(page.getByText(/Aplicado: \d+ notas criadas ou atualizadas/)).toBeVisible({ timeout: 15_000 });
});
