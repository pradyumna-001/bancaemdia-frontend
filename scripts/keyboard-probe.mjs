/* global document, getComputedStyle */
// Self-contained for the real browser harness. Returns only a count or boolean.
export function keyboardProbe({ scope: selector, mode }) {
  const scope = document.querySelector(selector);
  if (!scope) return mode === 'count' ? 0 : false;
  function exposed(el) {
    if (el.closest('[hidden],[inert],dialog:not([open])')) return false;
    for (let parent = el; parent; parent = parent.parentElement) {
      const style = getComputedStyle(parent);
      if (
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.visibility === 'collapse' ||
        Number(style.opacity) === 0
      )
        return false;
      if (parent !== el && parent.tagName === 'DETAILS' && !parent.open) {
        const summary = parent.querySelector(':scope > summary');
        if (!summary?.contains(el)) return false;
      }
    }
    return [...el.getClientRects()].some(
      (rect) => rect.width > 0 && rect.height > 0,
    );
  }
  function candidate(el) {
    return el.tabIndex >= 0 && !el.matches(':disabled') && exposed(el);
  }
  if (mode === 'count') {
    return [
      ...scope.querySelectorAll(
        'a[href],button,input,textarea,select,summary,[tabindex]',
      ),
    ]
      .filter(candidate)
      .filter((el) => {
        if (!el.matches('input[type="radio"]') || !el.name) return true;
        const group = [
          ...el.ownerDocument.querySelectorAll('input[type="radio"]'),
        ].filter(
          (other) =>
            other.name === el.name &&
            other.form === el.form &&
            other.getRootNode() === el.getRootNode() &&
            candidate(other),
        );
        return el === (group.find((other) => other.checked) ?? group[0]);
      }).length;
  }
  const el = document.activeElement;
  if (
    !el ||
    !scope.contains(el) ||
    !el.matches(':focus-visible') ||
    !exposed(el)
  )
    return false;
  function painted(value) {
    if (!value || value === 'none' || value === 'transparent') return false;
    const alpha = value.includes('/')
      ? Number.parseFloat(value.slice(value.lastIndexOf('/') + 1))
      : value.startsWith('rgba(')
        ? Number.parseFloat(value.slice(value.lastIndexOf(',') + 1))
        : 1;
    return alpha > 0;
  }
  const style = getComputedStyle(el);
  if (
    style.outlineStyle !== 'none' &&
    style.outlineStyle !== 'hidden' &&
    Number.parseFloat(style.outlineWidth) > 0 &&
    painted(style.outlineColor)
  )
    return true;
  // SVG points intentionally use an adjacent drawn focus ring, not a CSS box.
  const ring = el.nextElementSibling;
  if (
    !el.classList.contains('grafico-alvo') ||
    !ring?.classList.contains('grafico-indicador') ||
    !exposed(ring)
  )
    return false;
  const paint = getComputedStyle(ring);
  return (
    Number.parseFloat(paint.strokeWidth) >= 3 &&
    Number(paint.strokeOpacity) > 0 &&
    painted(paint.stroke)
  );
}
