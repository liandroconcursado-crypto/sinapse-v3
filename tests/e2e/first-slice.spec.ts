import { expect, test } from "@playwright/test";

test("cria conta, nota, edita e abre o grafo", async ({ page }) => {
  const email = `e2e-${Date.now()}@local.test`;
  await page.goto("/");
  await page.getByLabel("Nome").fill("Pessoa E2E");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill("senha-segura-123");
  await page.getByRole("button", { name: "Criar conta" }).click();

  await expect(page.getByText("SINAPSE").first()).toBeVisible();
  await page.getByRole("button", { name: "＋" }).click();
  await expect(page.getByRole("heading", { name: "Nova nota" })).toBeVisible();

  const editor = page.locator(".cm-content");
  await editor.fill("# Nova nota\n\nVeja [[Roma Antiga|Roma]].");
  await expect(page.getByText("Roma · quebrado")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Salvo", { exact: true })).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("link", { name: "Exportar" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("sinapse-vault.zip");

  await page.locator(".topbar").getByRole("button", { name: "Grafo" }).click();
  await expect(page.getByLabel("Grafo de notas")).toBeVisible();
});
