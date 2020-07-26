/**
 * sadly, imports cannot be used, so these "scripts" share a common context.
 * This script assumes that common.js ran before it.
 */

const wordPattern = /[a-z]{3,}/ig

class BackendBase {
  static async processElements(elements, valuesCallback) {}

  static collectTexts_(elements) {
    return $.map(elements, (el) => extractElementText(el));
  }
}

/**
 * Updates negativity values using a very simple regex heuristic
 */
class NaiveNegativity extends BackendBase {
  static negativesPattern = /trump|covid|coronavirus|pandemic/ig;

  static async processElements(elements, chunkCallback) {
    const texts = this.collectTexts_(elements);
    const values = texts.map((text) => 
      countMatches(text, this.negativesPattern) / countMatches(text, wordPattern));
    chunkCallback(elements, values);
  }
}

/**
 * Updates negativity values using the python backend service
 */
class PythonBackendNegativity extends BackendBase {
  static address = 'http://localhost:8000/sentiment/';
  static chunkSize = 50;

  static async processElements(elements, chunkCallback) {
    let start = 0;
    let chunkElements;
    let chunkValues;
    while (start < elements.length) {
      chunkElements = elements.slice(start, start + this.chunkSize);
      chunkValues = await this.singleCallPromise_(chunkElements);
      if (chunkValues) {
        chunkCallback(chunkElements, chunkValues);
      } else break;
      start += this.chunkSize;
    }
  }
  
  static async singleCallPromise_(elements) {
    try {
      const response = await fetch(this.address, {
        method: 'post',
        body: JSON.stringify({'texts': this.collectTexts_(elements)}),
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
class NegativityCalculator { 
  static textNodesSelector = 
    'div,h1,h2,h3,h4,h5,p,span,li,a,img,strong,em,font,big,small,b,i,u,td'; 
  static minNumWords = 5;

  static backends = {
    'simple': NaiveNegativity,
    'python': PythonBackendNegativity,
  }

  static updateAll(restyleCallback) {
    chrome.storage.sync.get({
      backend: 'python',
    }, (settings) => {
      const allElements = this.findTextElements_();
      this.removeAllValues_(allElements);
      if (settings.backend === 'off') {
        restyleCallback();
      } else {
        this.backends[settings.backend].processElements(
            allElements, 
            (chunkElements, chunkValues) => {
              this.setNegativityValues_(chunkElements, chunkValues);
              // update all ranks for all elements
              this.updateNegativityRanks_(allElements);
              restyleCallback();
            });
      }
    });
  }

  static findTextElements_() {
    return $(this.textNodesSelector).filter((i, element) => {
      const text = extractElementText(element);
      return (countMatches(text, wordPattern) >= this.minNumWords);
    });
  }

  static setNegativityValues_(elements, values) {
    elements.each((i, el) => {
      $(el).addClass(scoredTextsClassName);
      $(el).attr(scoredTextsValueAtt, values[i]);
    });
  }

  static updateNegativityRanks_(elements) {
    const values = $.map(elements, (el) => $(el).attr(scoredTextsValueAtt));
    const ranks = this.arrayDenseRanks_(values);
    const maxRank = Math.max.apply(null, ranks);
    elements.each((i, el) => {
      $(el).attr(scoredTextsRankAtt, ranks[i] / maxRank); 
    });
  }

  static removeAllValues_(elements) {
    elements.each((i, el) => {
      $(el).removeClass(scoredTextsClassName);
      $(el).removeAttr(scoredTextsValueAtt);
      $(el).removeAttr(scoredTextsRankAtt);
    });
  }

  static arrayDenseRanks_(arr) {
    const sorted = Array.from(new Set(arr)).sort((a, b) => (a - b));
    const ranks = arr.map((v) => (sorted.indexOf(v) + 1));
    return ranks;
  }
}
  