// html persistence constants
const scoredTextsClassName = 'negativityText';
const scoredTextsValueAtt = 'data-negativity-value';
const scoredTextsRankAtt = 'data-negativity-rank';

/*
 * text functions
 */

function countMatches(text, pattern) {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

function extractElementText(element) {
  element = $(element);
  let text = element.contents().not(element.children()).text();
  // handle img tags
  text = text || `${element.attr('alt') || ''}`;
  // handle a tags  
  text = text || `${element.attr('label') || ''} ${element.attr('title') || ''}`  
  return text;
}
