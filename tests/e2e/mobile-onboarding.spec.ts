import { expect, test } from "@playwright/test";

test("oferece instalação e quatro entradas no onboarding móvel", async ({ page, request }) => {
  test.setTimeout(60_000);
  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  await expect(manifestResponse.json()).resolves.toMatchObject({
    name: "SINAPSE — segundo cérebro",
    display: "standalone",
    start_url: "/",
  });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByLabel("Nome").fill("Pessoa Mobile E2E");
  await page.getByLabel("E-mail").fill(`mobile-e2e-${Date.now()}@local.test`);
  await page.getByLabel("Senha").fill("senha-segura-123");
  await page.getByRole("button", { name: "Criar conta" }).click();

  await expect(page.getByRole("button", { name: "Falar" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: "Escrever" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Colar texto" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Importar arquivo" })).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles({
    name: "entrada-beta.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("# Entrada beta\n\nEste conteúdo veio de um arquivo Markdown."),
  });
  await expect(page.getByLabel("Fonte")).toHaveValue("entrada-beta.md");
  await expect(page.getByLabel("Conteúdo")).toHaveValue(/Este conteúdo veio de um arquivo Markdown\./);

  await page.getByRole("button", { name: "Arquivos", exact: true }).click();
  await expect(page.locator(".explorer")).toBeVisible();
  await page.getByRole("button", { name: "IA", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Jogue a bagunça aqui." })).toBeVisible();
});
