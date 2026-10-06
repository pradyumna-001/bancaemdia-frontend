import ts from 'typescript';
import { readdir, readFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

export function violations(source, file) {
  if (file === 'src/lib/format.ts') return [];
  const tree = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const errors = [];
  const money = /centavos|amount_minor|lucro|retorno|saldo|stake_|roi|win_rate/;
  const arithmetic = new Set([
    ts.SyntaxKind.PlusToken,
    ts.SyntaxKind.MinusToken,
    ts.SyntaxKind.AsteriskToken,
    ts.SyntaxKind.SlashToken,
    ts.SyntaxKind.PercentToken,
    ts.SyntaxKind.AsteriskAsteriskToken,
  ]);
  function monetary(node) {
    return (
      (ts.isIdentifier(node) && money.test(node.text)) ||
      node.getChildren(tree).some(monetary)
    );
  }
  function visit(node) {
    if (
      ts.isPropertyAccessExpression(node) &&
      node.expression.getText(tree) === 'Intl' &&
      ['NumberFormat', 'DateTimeFormat'].includes(node.name.text)
    )
      errors.push('Formatador fora de src/lib/format.ts.');
    // Geometria SVG posiciona valores prontos da API; não decide dinheiro.
    if (
      file !== 'src/components/graficos/geometria.ts' &&
      ts.isBinaryExpression(node) &&
      arithmetic.has(node.operatorToken.kind) &&
      (monetary(node.left) || monetary(node.right))
    )
      errors.push('Aritmética financeira fora do formatador.');
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return errors;
}

async function scan(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, item.name);
    if (item.isDirectory()) await scan(path);
    else if (
      /\.tsx?$/.test(item.name) &&
      !/\.test\.|\.d\.ts$/.test(item.name)
    ) {
      const file = relative(process.cwd(), path).replaceAll('\\', '/');
      const errors = violations(await readFile(path, 'utf8'), file);
      if (errors.length) throw new Error(`${file}: ${errors.join(' ')}`);
    }
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await scan(resolve('src'));
  console.log(
    'Formatação central e ausência de aritmética financeira nas features aprovadas.',
  );
}
