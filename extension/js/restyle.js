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

class BackendInterface {
  static async processElements(elements, valuesCallback) {}
}

/**
 * Updates negativity values using a very simple regex heuristic
 */
class NaiveNegativity extends BackendInterface {
  static negativesPattern = /trump|covid|coronavirus|pandemic/ig;

  static async processElements(elements, valuesCallback) {
    const texts = collectTexts(elements);
    const values = texts.map((text) => 
      countMatches(text, this.negativesPattern) / countMatches(text, wordPattern));
    valuesCallback(elements, values);
  }
}

/**
 * Updates negativity values using the python backend service
 */
class PythonBackendNegativity extends BackendInterface {
  static address = 'http://localhost:8000/sentiment/';
  static chunkSize = 50;

  static async processElements(elements, valuesCallback) {
    let start = 0;
    let chunkElements;
    let chunkValues;
    while (start < elements.length) {
      chunkElements = elements.slice(start, start + this.chunkSize);
      chunkValues = await this.singleCallPromise_(collectTexts(chunkElements));
      if (chunkValues) {
        valuesCallback(chunkElements, chunkValues);
      } else break;
      start += this.chunkSize;
    }
  }
  
  static async singleCallPromise_(texts) {
    try {
      const response = await fetch(this.address, {
        method: 'post',
        body: JSON.stringify({'texts': texts}),
      });

      if (response.status === 200) {
        const data = await response.json();
        return data.values;
      } else {
        console.log(response);
        throw new Error(`Backend returned error: ${response.status}`);
      }
    }
    catch (error) {
      alert(`PythonBackendNegativity call failed: ${error}`);
      console.log(error);
    }
  }
}

/**
 * Processes and updates negativity data for elements
 */
class NegativityProcessor {  

  static backends = {
    'simple': NaiveNegativity,
    'python': PythonBackendNegativity,
  }

  static processAll(restyleCallback) {
    chrome.storage.sync.get({
      backend: 'python',
    }, (settings) => {
      this.backends[settings.backend].processElements(
          findTextElements(), 
          (elements, values) => {
            this.setNegativityValues_(elements, values);
            restyleCallback();
          });
    });
  }

  static updateNegativityRanks(elements) {
    const values = $.map(elements, (el) => $(el).attr(scoredTextsValueAtt));
    const ranks = this.arrayDenseRanks_(values);
    const maxRank = Math.max.apply(null, ranks);
    elements.each((i, el) => {
      $(el).attr(scoredTextsRankAtt, ranks[i] / maxRank); 
    });
  }

  static setNegativityValues_(elements, values) {
    elements.each((i, el) => {
      $(el).addClass(scoredTextsClassName);
      $(el).attr(scoredTextsValueAtt, values[i]);
    });
  }
  
  static arrayDenseRanks_(arr) {
    const sorted = Array.from(new Set(arr)).sort((a, b) => (a - b));
    const ranks = arr.map((v) => (sorted.indexOf(v) + 1));
    return ranks;
  }
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
    if (settings.ranking) NegativityProcessor.updateNegativityRanks(scoredElements);
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
NegativityProcessor.processAll(updateStyleAll);

// watch for option changes
chrome.storage.onChanged.addListener((changes) => {
  console.log(changes);
  if (changes.backend != null) {
    NegativityProcessor.processAll(updateStyleAll);
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
    NegativityProcessor.processAll(updateStyleAll);
    added = 0;
  }
});
observer.observe(
    document.body, {attributes: false, childList: true, subtree: true});
