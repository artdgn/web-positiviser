// common constants
const wordPattern = /[a-z]{3,}/ig
// persistence constants
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

function extractImmediateText(element) {
  element = $(element);
  let text = element.contents().not(element.children()).text();
  // handle img tags
  text = text || `${element.attr('alt') || ''}`;
  // handle a tags  
  text = text || `${element.attr('label') || ''} ${element.attr('title') || ''}`  
  return text;
}

/*
 * backend functions
 */

class BackendBase {
  static async processElements(elements, valuesCallback) {}

  static collectTexts_(elements) {
    return $.map(elements, (el) => extractImmediateText(el));
  }
}

/**
 * Updates negativity values using a very simple regex heuristic
 */
class NaiveNegativity extends BackendBase {
  static negativesPattern = /trump|covid|coronavirus|pandemic/ig;

  static async processElements(elements, valuesCallback) {
    const texts = this.collectTexts_(elements);
    const values = texts.map((text) => 
      countMatches(text, this.negativesPattern) / countMatches(text, wordPattern));
    valuesCallback(elements, values);
  }
}

/**
 * Updates negativity values using the python backend service
 */
class PythonBackendNegativity extends BackendBase {
  static address = 'http://localhost:8000/sentiment/';
  static chunkSize = 50;

  static async processElements(elements, valuesCallback) {
    let start = 0;
    let chunkElements;
    let chunkValues;
    while (start < elements.length) {
      chunkElements = elements.slice(start, start + this.chunkSize);
      chunkValues = await this.singleCallPromise_(this.collectTexts_(chunkElements));
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
  static textNodesSelector = 
    'h1,h2,h3,h4,h5,p,span,li,a,img,strong,em,font,big,small,b,i,u,td'; 
  static minNumWords = 5;

  static backends = {
    'simple': NaiveNegativity,
    'python': PythonBackendNegativity,
  }

  static processAll(restyleCallback) {
    chrome.storage.sync.get({
      backend: 'python',
    }, (settings) => {
      this.backends[settings.backend].processElements(
          this.findTextElements_(), 
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

  static findTextElements_() {
    return $(this.textNodesSelector).filter((i, element) => {
      const text = extractImmediateText(element);
      return (countMatches(text, wordPattern) >= this.minNumWords);
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
class Restyler {
  static structuralNodesSelector = 'div,tr,nav';
  static eps = 0.001
  static maxColor = 200;
  static minOpacity = 0.1;
  static scoredTextsSelector = `.${scoredTextsClassName}`

  static updateAll() {
    chrome.storage.sync.get({
      styling: 'opacity',
      threshold: 0.5,
      ranking: false,
    }, (settings) => {
      const scoredElements = $(this.scoredTextsSelector);
  
      // using ranks or values as scores
      if (settings.ranking) {
        NegativityProcessor.updateNegativityRanks(scoredElements);
      }
      const scoreAttr = settings.ranking ? scoredTextsRankAtt : scoredTextsValueAtt;
  
      // try to find highest parents of single neg-elements and update them
      const allParents = $(this.structuralNodesSelector).has(this.scoredTextsSelector);
      const visitedChildren = new Set();
      allParents.each((i, parent) => {      
        parent = $(parent);      
        const children = parent.find(this.scoredTextsSelector);
        if (children.length == 1) {
          const onlyChild = children[0];
  
          if (visitedChildren.has(onlyChild)) return; // stop if already visited
          visitedChildren.add(onlyChild);
  
          const score = parseFloat($(onlyChild).attr(scoreAttr));
          this.updateElementStyle_(parent, score, settings);
        } else {
          // in case it was a single parent before (when fewer elements were processed)
          // but not any longer 
          this.resetElementStyle_(parent);
        }
      });
  
      // update all remaining elements that didn't find a single parent    
      scoredElements.each((i, element) => {
        if (!visitedChildren.has(element)) {
          element = $(element);      
          const score = parseFloat(element.attr(scoreAttr));
          this.updateElementStyle_(element, score, settings);
        }
      });
    });
  }

  static updateElementStyle_(element, score, settings) {
    this.updateElementOpacity_(element, score, settings);
    this.updateElementColor_(element, score, settings);
    this.updateElementVisibility_(element, score, settings);   
  }
  
  static resetElementStyle_(element) {
    this.resetOriginalOpacity_(element);
    this.resetOriginalColor_(element);
    this.resetOriginalVisility_(element);
  }
  
  static updateElementOpacity_(element, score, settings) {
    if (element.attr('data-original-opacity') === undefined) {
      element.attr('data-original-opacity', element.css('opacity'));
    }
  
    const threshold = settings.threshold;
    if ((settings.styling == 'opacity') && (score >= threshold)) {
      const normScore = (score - threshold) / (1 - threshold + this.eps);
      const opacity = 1 - normScore * (1 - this.minOpacity);
      element.css('opacity', opacity);
    } else this.resetOriginalOpacity_(element);
  }
  
  static resetOriginalOpacity_(element) {
    const origOpacity = element.attr('data-original-opacity');
    if (origOpacity !== undefined) element.css('opacity', origOpacity);
  }
  
  static negativeColorValue_(difference, range) {
      const normValue = Math.round(
          this.maxColor * Math.pow(difference / (range + this.eps), 3));
      return this.maxColor - normValue;
  }
  
  static updateElementColor_(element, score, settings) {
    if (element.attr('data-original-background-color') === undefined) {
      element.attr('data-original-background-color', element.css('background-color'));
    }
    
    const threshold = settings.threshold;  
    if (settings.styling == 'color') {
      if (score >= threshold) {
        const colorVal = this.negativeColorValue_(score - threshold, 1 - threshold);
        element.css('background-color', `rgba(255, ${colorVal}, ${colorVal}, 0.4)`);
      } else {
        const colorVal = this.negativeColorValue_(threshold - score, threshold);
        element.css('background-color', `rgba(${colorVal}, 255, ${colorVal}, 0.4)`);
      }
    } else this.resetOriginalColor_(element);
  }
  
  static resetOriginalColor_(element) {
    const origColor = element.attr('data-original-background-color');
    if (origColor !== undefined) element.css('background-color', origColor);
  }
  
  static updateElementVisibility_(element, score, settings) {
    if (element.attr('data-original-visible') === undefined) {
      element.attr('data-original-visible', element.is(':visible'));
    }
  
    if ((settings.styling == 'remove') && (score >= (settings.threshold))) {        
      element.hide(100);
    } else this.resetOriginalVisility_(element);
  }
  
  static resetOriginalVisility_(element) {
    const origVisibile = element.attr('data-original-visible');
    if ((origVisibile !== undefined) && (origVisibile == "true")) {
      element.show(100);
    }
  }
}

/*
 * top level functionality and listeners
 */

// initial run
NegativityProcessor.processAll(() => Restyler.updateAll());

// watch for option changes
chrome.storage.onChanged.addListener((changes) => {
  console.log(changes);
  if (changes.backend != null) {
    NegativityProcessor.processAll(() => Restyler.updateAll());
  } else {
    Restyler.updateAll();
  }
});

// watch for dynamically added elements (infinite scroll / twitter load)
let added = 0;
const observer = new MutationObserver((mutationsList, observer) => {
  for (let mutation of mutationsList) {
    added += mutation.addedNodes.length;
  }
  if (added >= 20) {
    NegativityProcessor.processAll(() => Restyler.updateAll());
    added = 0;
  }
});
observer.observe(
    document.body, {attributes: false, childList: true, subtree: true});
