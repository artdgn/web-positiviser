import $ from 'jquery';
import {
  scoredTextsClassName,
  scoredTextsValueAtt,
  scoredTextsRankAtt,
  countMatches,
  extractElementText,
  domain,
} from './common.js';

import { defaultSettings } from '../settings.js'

import { PythonBackendNegativity, JSNegativityVader, JSNegativityAFINN } from './backends.js';

/**
 * Processes and updates negativity data for elements
 */
export class NegativityScorer {
  // constants
  static textNodesSelector = 
    'div,h1,h2,h3,h4,h5,p,span,li,a,img,strong,em,\
    font,big,small,b,i,u,td,yt-formatted-string';
  static wordPattern = /[a-z]{3,}/gi;
  static minNumWords = 5;
  static minNumElements = 5;
  // state
  static stats;
  static settings_ = {};

  static backends = {
    'pyflair': PythonBackendNegativity,
    'jsvader': JSNegativityVader,
    'jsafinn': JSNegativityAFINN,
  };

  static updateAll(restyleCallback) {
    chrome.storage.sync.get(
      {
        storedSettings: { global: defaultSettings },
      },
      (stored) => {
        this.settings_ = stored.storedSettings[domain()] || stored.storedSettings.global;        
        this.updateAll_(restyleCallback);
      });
  }

  static updateAll_(restyleCallback) {
    const allElements = this.qualifiedTextElements($(document));
    this.removeAllValues_(allElements);
    if (
        (this.settings_.enabled) && 
        (this.settings_.backend != 'off') && 
        (allElements.length >= this.minNumElements)
        ) {
      console.log(`scoring ${allElements.length} text elements`);
      // claculations need to be done
      this.backends[this.settings_.backend].processElements(
        allElements,
        (chunkElements, chunkValues) => {
          this.setNegativityValues_(chunkElements, chunkValues);
          // update all ranks for all elements
          this.updateNegativityRanks_(allElements);
          this.stats = this.calculateStats_(allElements);
          restyleCallback();
        });
    } else {
      // reset all
      this.stats = {};
      restyleCallback();
    }
  }

  static qualifiedTextElements(elements) {
    return $(elements).find(this.textNodesSelector).filter((i, element) => {
      const text = extractElementText(element);
      return countMatches(text, this.wordPattern) >= this.minNumWords;
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
    };
  }
}
