import $ from 'jquery';
import AFINNSentiment from 'sentiment';
import { SentimentIntensityAnalyzer as VaderAnalyser } from 'vader-sentiment/src/vaderSentiment.js';
import { lexicon as vaderLexicon } from 'vader-sentiment/src/vader_lexicon.js';

import { extractElementText } from './common.js';

class BackendBase {
  static async processElements(elements, valuesCallback) {}

  static collectTexts_(elements) {
    return $.map(elements, (el) => extractElementText(el));
  }
}

/**
 * Updates negativity values using https://github.com/thisandagain/sentiment
 */
export class JSNegativityAFINN extends BackendBase {
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
export class JSNegativityVader extends BackendBase {
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
        // return (0.5 - 0.5 * result.compound); // compound score is in [-1, 1] range
        return Math.min(1, Math.max(0, (0.5 + result.neg - result.pos))); 
        // neg / neu / pos raw fields that are
        // ratios of parts of text that fall in each category
      }
    );
    chunkCallback(elements, values);
  }
}

/**
 * Updates negativity values using the python backend service
 */
export class PythonBackendNegativity extends BackendBase {
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
      alert(
          'Negativity-Balancer extension: external backend call failed (is it available?).\n\n' + 
          'Please switch to another scoring option in the menu.');
      console.log(error);
    }
  }
}
