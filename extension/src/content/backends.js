import $ from 'jquery';
import AFINNSentiment from 'sentiment';
import {SentimentIntensityAnalyzer as VaderAnalyser} from 'vader-sentiment/src/vaderSentiment.js';
import {lexicon as vaderLexicon} from 'vader-sentiment/src/vader_lexicon.js';

import {
  scoredTextsClassName,
  scoredTextsValueAtt,
  scoredTextsRankAtt,
  countMatches,
  extractElementText,
} from './common';

const wordPattern = /[a-z]{3,}/gi;

class BackendBase {
  static async processElements(elements, valuesCallback) {}

  static collectTexts_(elements) {
    return $.map(elements, (el) => extractElementText(el));
  }
}

/**
 * Updates negativity values using https://github.com/thisandagain/sentiment
 */
class JSNegativityAFINN extends BackendBase {
  static sentimentLib = new AFINNSentiment(); 
  static extraLexicon = {
    'trump': -2,
    'covid': -2,
    'coronavirus': -2,
    'pandemic': -2,
  }

  static async processElements(elements, chunkCallback) {
    const texts = this.collectTexts_(elements);
    const values = texts.map(
      (text) => {
        const result = this.sentimentLib.analyze(text, this.extraLexicon);
        // return -1 * result.comparative; 
        return -1 * result.score / result.calculation.length; 
      }
    );
    chunkCallback(elements, values);
  }
}

/**
 * Updates negativity values using https://github.com/vaderSentiment/vaderSentiment-js
 * which is a JS port of python https://github.com/cjhutto/vaderSentiment
 */
class JSNegativityVader extends BackendBase {
  static extraLexicon = {
    'trump': -2,
    'covid': -2,
    'coronavirus': -2,
    'pandemic': -2,
  }
  static lexiconUpdated = false;

  static lazyLexiconUpdate() {
    if (!this.lexiconUpdated) {
      Object.assign(vaderLexicon, this.extraLexicon);
      this.lexiconUpdated = true;
    }
  }
  
  static async processElements(elements, chunkCallback) {
    this.lazyLexiconUpdate();
    const texts = this.collectTexts_(elements);
    const values = texts.map(
      (text) => {
        const result = VaderAnalyser.polarity_scores(text);
        return (0.5 - 0.5 * result.compound); // compound score is in [-1, 1] range
        // consider using neg / neu / pos raw fields that are
        // ratios of parts of text that fall in each category
      }
    );
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
        body: JSON.stringify({ texts: this.collectTexts_(elements) }),
      });

      if (response.status === 200) {
        const data = await response.json();
        return data.values;
      } else {
        console.log(response);
        throw new Error(`Backend returned error: ${response.status}`);
      }
    } catch (error) {
      alert(`PythonBackendNegativity call failed: ${error}`);
      console.log(error);
    }
  }
}

/**
 * Processes and updates negativity data for elements
 */
export class NegativityCalculator {
  // constants
  static textNodesSelector =
    'div,h1,h2,h3,h4,h5,p,span,li,a,img,strong,em,font,big,small,b,i,u,td';
  static minNumWords = 5;
  // state
  static stats;

  static backends = {
    'python': PythonBackendNegativity,
    'jsvader': JSNegativityVader, 
    'jsafinn': JSNegativityAFINN,
  };

  static updateAll(restyleCallback) {
    chrome.storage.sync.get({
      backend: 'python',
    }, (settings) => {
      const allElements = this.findTextElements_();
      this.removeAllValues_(allElements);
      if (settings.backend !== 'off') {
        this.backends[settings.backend].processElements(
            allElements,
            (chunkElements, chunkValues) => {
              this.setNegativityValues_(chunkElements, chunkValues);
              // update all ranks for all elements
              this.updateNegativityRanks_(allElements);
              this.stats = this.calculateStats_(allElements);
              restyleCallback();
            });
      } else {
        this.stats = {};
        restyleCallback(); // backend == off
      }
    });
  }

  static findTextElements_() {
    return $(this.textNodesSelector).filter((i, element) => {
      const text = extractElementText(element);
      return countMatches(text, wordPattern) >= this.minNumWords;
    });
  }

  static setNegativityValues_(elements, values) {
    elements.each((i, el) => {
      $(el).addClass(scoredTextsClassName);
      $(el).attr(scoredTextsValueAtt, values[i]);
    });
  }

  static updateNegativityRanks_(elements) {
    const ranks = this.arrayDenseRanks_(this.negativityValues_(elements));
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

  static negativityValues_(elements) {
    return $.map(elements, (el) => parseFloat($(el).attr(scoredTextsValueAtt)));
  }

  static arrayDenseRanks_(arr) {
    const sorted = Array.from(new Set(arr)).sort((a, b) => a - b);
    const ranks = arr.map((v) => sorted.indexOf(v) + 1);
    return ranks;
  }

  static calculateStats_(elements) {
    const values = this.negativityValues_(elements);
    return {
      negatives: values.filter((v) => v > 0.5).length,
      total: values.length,
    }
  }
}
