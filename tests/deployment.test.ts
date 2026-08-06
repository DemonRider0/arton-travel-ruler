import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const PUBLIC_BASE_PATH = "/arton-travel-ruler/";
const manifestPath = resolve(import.meta.dirname, "../public/manifest.json");
const viteConfigPath = resolve(import.meta.dirname, "../vite.config.ts");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
  icon: string;
  background_url: string;
  action: { icon: string; popover: string };
};

describe("manifesto publicado", () => {
  it("inclui a subpasta do GitHub Pages em todas as páginas do Owlbear", () => {
    expect(manifest.icon).toBe(`${PUBLIC_BASE_PATH}icon.svg`);
    expect(manifest.background_url).toBe(`${PUBLIC_BASE_PATH}background.html`);
    expect(manifest.action.icon).toBe(`${PUBLIC_BASE_PATH}icon.svg`);
    expect(manifest.action.popover).toBe(`${PUBLIC_BASE_PATH}index.html`);
  });

  it("não usa caminhos relativos que o Owlbear resolveria na raiz do domínio", () => {
    expect(manifest.icon).not.toMatch(/^\.\//);
    expect(manifest.background_url).not.toMatch(/^\.\//);
    expect(manifest.action.popover).not.toMatch(/^\.\//);
  });

  it("mantém a base do Vite alinhada com o manifesto", () => {
    const viteConfig = readFileSync(viteConfigPath, "utf8");
    expect(viteConfig).toContain(`base: "${PUBLIC_BASE_PATH}"`);
  });
});
