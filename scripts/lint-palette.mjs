// Lint de paleta (regra 13 do AGENTS.md / ADR 006):
// literal de cor (#hex, rgb(, hsl() só é permitido em src/styles/tokens.css.
// Porta do teste de paleta única do monólito.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const ALLOW = new Set([join(SRC, "styles", "tokens.css")]);
const PATTERN = /#[0-9a-fA-F]{3,8}\b|\brgb\(|\brgba\(|\bhsl\(|\bhsla\(/;

let violacoes = [];

function varre(dir) {
  for (const entrada of readdirSync(dir)) {
    const caminho = join(dir, entrada);
    if (statSync(caminho).isDirectory()) {
      varre(caminho);
    } else if (/\.(css|ts|tsx)$/.test(entrada) && !ALLOW.has(caminho)) {
      const linhas = readFileSync(caminho, "utf8").split("\n");
      linhas.forEach((linha, i) => {
        const semComentario = linha.replace(/\/\/.*$/, "");
        if (PATTERN.test(semComentario)) {
          violacoes.push(`${relative(ROOT, caminho)}:${i + 1}: ${linha.trim()}`);
        }
      });
    }
  }
}

varre(SRC);

if (violacoes.length > 0) {
  console.error("Cor literal fora de src/styles/tokens.css:");
  for (const v of violacoes) console.error("  " + v);
  process.exit(1);
}
console.log("lint-palette: nenhuma cor literal fora de tokens.css OK");
