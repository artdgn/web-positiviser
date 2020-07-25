// text constants
const structuralNodesSelector = 'div,tr,nav';
const textNodesSelector = 
    'h1,h2,h3,h4,h5,p,span,li,a,img,strong,em,font,big,small,b,i,u,td';
const wordPattern = /[a-z]{3,}/ig
const minNumWords = 5;
// restyling constants
const eps = 0.001
const maxColor = 200;
const minOpacity = 0.1;
// scoring constants
const scoredTextsClassName = 'negativityText';
const scoredTextsValueAtt = 'data-negativity-value';
const scoredTextsRankAtt = 'data-negativity-rank';

/*
 * text functions
 */

function findTextElements() {
  return $(textNodesSelector).filter((i, element) => {
    const text = extractImmediateText(element);
    return (countMatches(text, wordPattern) >= minNumWords);
  });
}

function countMatches(text, pattern) {
  const matches = text.match(pattern);
  return matches ? matches.length : 0;
}

function extractImmediateText(element) {
  element = $(element);

  let text = element.contents().not(element.children()).text();

  // handle img tags
  text = text || `${element.attr('alt') || ''}`;

  // handle a tags  
  text = text || `${element.attr('label') || ''} ${element.attr('title') || ''}`
  
  return text;
}

function collectTexts(elements) {
  return $.map(elements, (el) => extractImmediateText(el));
}

/*
 * backend related functions
 */

function processTextsByBackend(callback) {
  const elements = findTextElements();
  chrome.storage.sync.get({
    backend: 'python',
  }, function(settings) {
    if (settings.backend == 'simple') {
      simpleHeuristicBackend(elements, callback);
    } else {
      chunkedPythonBackend(elements, callback);
    }
  });
}

async function chunkedPythonBackend(elements, callback) {
  const chunkSize = 50;
  let success = true;
  let nextStart = 0;
  while (success && (nextStart < elements.length)) {
    success = await pythonSentimentBackendCall(
      elements.slice(nextStart, nextStart + chunkSize), callback);
    nextStart += chunkSize;
  }
}

function pythonSentimentBackendCall(elements, callback) {
  return fetch('http://localhost:8000/sentiment/', {
    method: 'post',
    body: JSON.stringify({'texts': collectTexts(elements)}),
  }).then(response => {
    if (response.status === 200) {
      return response.json();
    } else {
      console.log(response);
      throw new Error(`Backend returned error: ${response.status}`);
    }
  }).then(data => {
    setNegativityValues(elements, data.values);
    callback();
    return true; // success
  }).catch((error) => {
    alert(`Backend call failed: ${error}`);
    console.log(error);
    return false; // failure
  });
}

function simpleHeuristicBackend(elements, callback) {
  const negativesPattern = /trump|covid|coronavirus|pandemic/ig;
  const texts = collectTexts(elements);
  const values = texts.map((text) => 
    countMatches(text, negativesPattern) / countMatches(text, wordPattern));
  setNegativityValues(elements, values);
  callback();
}

function setNegativityValues(elements, negValues) {
  elements.each((i, el) => {
    $(el).addClass(scoredTextsClassName);
    $(el).attr(scoredTextsValueAtt, negValues[i]);
  });
}

function setNegativityRanks(elements) {
  const values = $.map(elements, (el) => $(el).attr(scoredTextsValueAtt));
  const ranks = arrayDenseRanks(values);
  const maxRank = Math.max.apply(null, ranks);
  elements.each((i, el) => {
    $(el).attr(scoredTextsRankAtt, ranks[i] / maxRank); 
  });
}

function arrayDenseRanks(arr) {
  const sorted = Array.from(new Set(arr)).sort((a, b) => (a - b));
  const ranks = arr.map((v) => (sorted.indexOf(v) + 1));
  return ranks;
}

/*
 * styling functions
 */

function updateStyleAll() {
  chrome.storage.sync.get({
    styling: 'opacity',
    threshold: 0.5,
    ranking: false,
  }, (settings) => {
    const scoredTextsSelector = `.${scoredTextsClassName}`
    const scoredElements = $(scoredTextsSelector);

    // using ranks or values as scores
    if (settings.ranking) setNegativityRanks(scoredElements);
    const scoreAttr = settings.ranking ? scoredTextsRankAtt : scoredTextsValueAtt;

    // try to find highest parents of single neg-elements and update them
    const allParents = $(structuralNodesSelector).has(scoredTextsSelector);
    const visitedChildren = new Set();
    allParents.each((i, parent) => {      
      parent = $(parent);      
      const children = parent.find(scoredTextsSelector);
      if (children.length == 1) {
        const onlyChild = children[0];

        if (visitedChildren.has(onlyChild)) return; // stop if already visited
        visitedChildren.add(onlyChild);

        const score = parseFloat($(onlyChild).attr(scoreAttr));
        updateElementStyle(parent, score, settings);
      } else {
        // in case it was a single parent before (when fewer elements were processed)
        // but not any longer 
        resetElementStyle(parent);
      }
    });

    // update all remaining elements that didn't find a single parent    
    scoredElements.each((i, element) => {
      if (visitedChildren.has(element)) return; // stop if already visited

      element = $(element);      
      const score = parseFloat(element.attr(scoreAttr));
      updateElementStyle(element, score, settings);
    });
  });
}

function updateElementStyle(element, score, settings) {
  updateElementOpacity(element, score, settings);
  updateElementColor(element, score, settings);
  updateElementVisibility(element, score, settings);   
}

function resetElementStyle(element) {
  resetOriginalOpacity(element);
  resetOriginalColor(element);
  resetOriginalVisility(element);
}

function updateElementOpacity(element, score, settings) {
  if (element.attr('data-original-opacity') === undefined) {
    element.attr('data-original-opacity', element.css('opacity'));
  }

  const threshold = settings.threshold;
  if ((settings.styling == 'opacity') && (score >= threshold)) {
    const normScore = (score - threshold) / (1 - threshold + eps);
    const opacity = 1 - normScore * (1 - minOpacity);
    element.css('opacity', opacity);
  } else resetOriginalOpacity(element);
}

function resetOriginalOpacity(element) {
  const origOpacity = element.attr('data-original-opacity');
  if (origOpacity !== undefined) element.css('opacity', origOpacity);
}

function negativeColorValue(difference, range) {
    const normValue = Math.round(maxColor * Math.pow(difference / (range + eps), 3));
    return maxColor - normValue;
  }

function updateElementColor(element, score, settings) {
  if (element.attr('data-original-background-color') === undefined) {
    element.attr('data-original-background-color', element.css('background-color'));
  }
  
  const threshold = settings.threshold;  
  if (settings.styling == 'color') {
    if (score >= threshold) {
      const colorVal = negativeColorValue(score - threshold, 1 - threshold);
      element.css('background-color', `rgba(255, ${colorVal}, ${colorVal}, 0.4)`);
    } else {
      const colorVal = negativeColorValue(threshold - score, threshold);
      element.css('background-color', `rgba(${colorVal}, 255, ${colorVal}, 0.4)`);
    }
  } else resetOriginalColor(element);
}

function resetOriginalColor(element) {
  const origColor = element.attr('data-original-background-color');
  if (origColor !== undefined) element.css('background-color', origColor);
}

function updateElementVisibility(element, score, settings) {
  if (element.attr('data-original-visible') === undefined) {
    element.attr('data-original-visible', element.is(':visible'));
  }

  if ((settings.styling == 'remove') && (score >= (settings.threshold))) {        
    element.hide(100);
  } else resetOriginalVisility(element);
}

function resetOriginalVisility(element) {
  const origVisibile = element.attr('data-original-visible');
  if ((origVisibile !== undefined) && (origVisibile == "true")) {
    element.show(100);
  }
}

/*
 * top level functionality and listeners
 */

// initial run
processTextsByBackend(updateStyleAll);

// watch for option changes
chrome.storage.onChanged.addListener((changes) => {
  console.log(changes);
  if (changes.backend != null) {
    processTextsByBackend(updateStyleAll);
  } else {
    updateStyleAll();
  }
});

// watch for dynamically added elements (infinite scroll / twitter load)
let added = 0;
const observer = new MutationObserver((mutationsList, observer) => {
  for (let mutation of mutationsList) {
    added += mutation.addedNodes.length;
  }
  if (added >= 20) {
    processTextsByBackend(updateStyleAll);
    added = 0;
  }
});
observer.observe(
    document.body, {attributes: false, childList: true, subtree: true});
