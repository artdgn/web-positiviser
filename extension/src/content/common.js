import $ from 'jquery';

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

export function extractElementText(element) {
  element = $(element);
  let text = element.contents().not(element.children()).text();
  // handle img tags
  text = text || `${element.attr('alt') || ''}`;
  // handle a tags
  text = text || `${element.attr('label') || ''} ${element.attr('title') || ''}`;
  return text;
}


/*
 * settings functions
 */
export function domain() {
  return window.location.host;
}
