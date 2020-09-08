import AFINNSentiment from 'sentiment';
import { SentimentIntensityAnalyzer as VaderAnalyser } from 'vader-sentiment/src/vaderSentiment.js';
import { lexicon as vaderLexicon } from 'vader-sentiment/src/vader_lexicon.js';

import { extractElementText } from './common.js';

function clip(n) {
  return Math.min(1, Math.max(0, n));
}

class BackendBase {
  static async processElements(elements, valuesCallback) {}

  static collectTexts_(elements) {
    return [...elements].map((el) => extractElementText(el));
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
        if (!result.calculation.length) {
          return 0.5;
        } else {
          return clip(-1 * result.score / result.calculation.length); 
        }
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
        const scoreNorm = Math.abs(result.neg) + Math.abs(result.pos);
        if (!scoreNorm) {
          return 0.5;
        } else {
          // discount neutral words becuase even a fully
          // negative sentence is expected to contain mostly neutral words
          const neutNorm = result.neu * 0.2;
          const centeredScore = result.neg - result.pos;
          return clip(0.5 + (centeredScore / (scoreNorm + neutNorm)));
          // neg / neu / pos raw fields that are
          // ratios of parts of text that fall in each category
        }
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
      } else {
        chunkCallback([], []);
        break;
      }
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
      console.log(error);
      if (!document.hidden) {  // only do this for active tab
        const instructionsLocation = 
          'https://github.com/artdgn/web-positiviser/blob/master/doc/python-backend.md';
        const confirmPrompt = (
            'Web-Positiviser extension: local backend call failed.\n\n' + 
            'Please switch to another scoring option, ' + 
            'or ensure that a local scoring service is running.' + 
            '\n\nPress "Cancel" to do nothing, or "OK" to open instructions page in a new tab.'
            );
        if (window.confirm(confirmPrompt)) window.open(instructionsLocation, '_blank');      
      }      
    }
  }
}
