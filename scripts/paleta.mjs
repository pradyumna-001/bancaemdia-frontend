import valueParser from 'postcss-value-parser';
import colorNames from 'color-name';

const hex = /#(?:[a-f\d]{8}|[a-f\d]{6}|[a-f\d]{4}|[a-f\d]{3})(?![\w-])/i;
const functions = /^(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)$/i;
export function corLiteral(value, named = false) {
  let found;
  valueParser(value).walk((node) => {
    if (node.type === 'function') {
      if (node.value.toLowerCase() === 'url') return false;
      if (functions.test(node.value)) found ??= node.value + '(';
    }
    if (node.type === 'word') {
      const match = node.value.match(hex);
      if (match) found ??= match[0];
      if (
        named &&
        (Object.hasOwn(colorNames, node.value.toLowerCase()) ||
          node.value.toLowerCase() === 'transparent')
      )
        found ??= node.value;
    }
  });
  return found;
}
const colorProperty =
  /(?:color|background|fill|stroke|shadow|border|outline|caret|accent)/i;
export const regraPaleta = {
  meta: {
    type: 'problem',
    schema: [],
    messages: {
      literal:
        'Cor literal {{cor}} fora de tokens.css. Use um token semântico.',
    },
  },
  create(context) {
    const inspect = (node, value) => {
      if (typeof value !== 'string') return;
      const parent =
        node.parent?.type === 'JSXExpressionContainer'
          ? node.parent.parent
          : node.parent;
      const name =
        parent?.type === 'JSXAttribute'
          ? parent.name.name
          : parent?.type === 'Property'
            ? (parent.key.name ?? parent.key.value)
            : '';
      if (['href', 'src', 'to'].includes(name)) return;
      const cor = corLiteral(
        value,
        colorProperty.test(name) || Object.hasOwn(colorNames, value),
      );
      if (cor) context.report({ node, messageId: 'literal', data: { cor } });
    };
    return {
      Literal(node) {
        inspect(node, node.value);
      },
      TemplateElement(node) {
        inspect(node, node.value.cooked);
      },
    };
  },
};
