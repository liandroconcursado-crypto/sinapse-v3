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
    "Sou professor de História no ensino médio. Quero melhorar as aulas sobre Roma, hoje muito baseadas em exposição oral e slides.",
  );
  await page.getByRole("button", { name: "Preparar proposta" }).click();

  await expect(page.getByText("Prévia pronta")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Ensino de História", { exact: true })).toBeVisible();
  await expect(page.getByText("Melhorar aulas sobre Roma", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Aplicar selecionadas/ }).click();

  await expect(page.getByText(/Aplicado: \d+ notas criadas ou atualizadas/)).toBeVisible({ timeout: 15_000 });
});
