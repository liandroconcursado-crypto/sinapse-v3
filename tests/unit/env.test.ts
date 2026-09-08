import { describe, expect, it } from "vitest";
import { resolveAuthBaseUrl } from "@/server/env";

describe("ambiente de produção", () => {
  it("usa a URL explícita antes da URL automática do Render", () => {
    expect(resolveAuthBaseUrl({
      BETTER_AUTH_URL: "https://sinapse.example.com",
      RENDER_EXTERNAL_URL: "https://sinapse.onrender.com",
    })).toBe("https://sinapse.example.com");
  });

  it("usa a URL pública do Render sem fixar o nome do serviço", () => {
    expect(resolveAuthBaseUrl({ RENDER_EXTERNAL_URL: "https://sinapse-beta.onrender.com" }))
      .toBe("https://sinapse-beta.onrender.com");
  });
});
