// html persistence constants
export const scoredTextsClassName = 'negativityText';
export const scoredTextsValueAtt = 'data-negativity-value';
export const scoredTextsRankAtt = 'data-negativity-rank';

/*
 * text functions
 */

export function countMatches(text, pattern) {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

export function extractElementText(el) {
  let text = el.text
  // text node text
  text = text ||
      [...el.childNodes]
      .filter(el => el.nodeType === Node.TEXT_NODE)
      .map(el => el.textContent).join("");
  // handle img tags
  text = text || `${el.getAttribute('alt') || ''}`;
  // handle a tags
  text = text || `${el.getAttribute('label') || ''} ${el.getAttribute('title') || ''}`;
  return text;
}


/*
 * settings functions
 */
export function domain() {
  return window.location.host;
}
