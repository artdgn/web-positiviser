import {
  scoredTextsClassName,
  scoredTextsValueAtt,
  scoredTextsRankAtt,
  domain,
} from './common.js';

import { defaultSettings } from '../settings.js'

export class Restyler {
  // constants
  static containerSelector = 'div,tr,nav,li';
  static eps = 0.001;
  static maxColor = 200;
  static minOpacity = 0.1;
  static maxCombine = 3;
  static scoredTextsSelector = `.${scoredTextsClassName}`;
  // state
  static restyledPreviously_ = new Set();
  static restoreValues_ = {
    opacity: new Map(),
    color: new Map(),
    visibility: new Map(),
  }
  static settings_ = {};

  static updateAll() {
    chrome.storage.local.get(
      { storedSettings: { global: defaultSettings } },
      (stored) => {        
        this.settings_ = stored.storedSettings[domain()] || stored.storedSettings.global;
        if (this.settings_.enabled) {
          this.findAndRestyleAll_();
        } else {
          this.restoreRestyledPreviosly();
        }
      }
    );
  }

  static findAndRestyleAll_() {
    const scoreAttr = this.settings_.ranking ? scoredTextsRankAtt : scoredTextsValueAtt;
    const restyled = new Set();
    const visitedChildren = new Set();
    
    // restyle parents
    if (!this.settings_.onlyTexts) {
      const allParents = document.querySelectorAll(
          `${this.containerSelector} > ${this.scoredTextsSelector}`)

      // order is assumed to be topological (top to bottom of tree)
      // so that higher parents have precedence over lower ones
      allParents.forEach((parent) => {
        const children = [...parent.querySelectorAll(this.scoredTextsSelector)];

        // limit number of children that can be combined
        if (children.length == 0 || children.length > this.maxCombine) return;

        // stop if some are visited
        if (children.some((el) => visitedChildren.has(el))) return;

        const scores = children.map((el) => parseFloat(el.getAttribute(scoreAttr)));
        const numNegs = scores.filter((val) => val >= this.settings_.threshold).length;

        // only if all negatives or all positives (or only one child)
        if ((numNegs == scores.length) || (numNegs == 0)) {         
          // there is not a mean() or even a sum() function
          // in all of JS or even its Math(!) module. Mind blown.
          // const combinedScore = scores.reduce((a, b) => a + b, 0) / scores.length
          const combinedScore = scores.reduce((a, b) => Math.max(a, b), 0)
          this.updateElementStyle_(parent, combinedScore);
          children.forEach((el) => visitedChildren.add(el));
          restyled.add(parent);
        }
      });
    }

    // restyle unvisited leaves
    const scoredElements = [...document.querySelectorAll(this.scoredTextsSelector)];
    scoredElements.forEach((element) => {
      if (!visitedChildren.has(element)) {
        this.updateElementStyle_(element, element.getAttribute(scoreAttr));
        restyled.add(element);
      }
    });    
    // console.log(`altered ${restyled.size} elements`);    

    // reset previously restyled skipped this time
    // (e.g. due to different number of children / backend selection)
    [...restyled].forEach(el => this.restyledPreviously_.delete(el));
    this.restoreRestyledPreviosly();
    this.restyledPreviously_ = restyled;   
  }

  static restoreRestyledPreviosly() {
    [...this.restyledPreviously_].forEach(el => this.resetElementStyle_(el));
    // console.log(`restored ${this.restyledPreviously_.size} elements`);
    this.restyledPreviously_ = new Set();
  }
 
  static updateElementStyle_(element, score) {
    score = parseFloat(score);
    this.updateElementOpacity_(element, score);
    this.updateElementColor_(element, score);
    this.updateElementVisibility_(element, score);
  }

  static resetElementStyle_(element) {
    this.resetOriginalOpacity_(element);
    this.resetOriginalColor_(element);
    this.resetOriginalVisility_(element);
  }

  static storeRestoreValue_(element, attType, curValue) {
    if (!this.restoreValues_[attType].has(element)) {      
      // this is a newly encountered element
      this.restoreValues_[attType].set(element, curValue)
    }
  }

  // opacity

  static resetOriginalOpacity_(element) {
    if (this.restoreValues_.opacity.has(element)) {
      element.style.opacity = this.restoreValues_.opacity.get(element);
    }
  }

  static updateElementOpacity_(element, score) {
    this.storeRestoreValue_(element, 'opacity', element.style.opacity);

    const threshold = this.settings_.threshold;
    if (this.settings_.styling == 'opacity' && score >= threshold) {
      const normScore = (score - threshold) / (1 - threshold + this.eps);
      const opacity = (1 - normScore * (1 - this.minOpacity)).toFixed(2);
      element.style.opacity = opacity;
    } else this.resetOriginalOpacity_(element);
  }

  // color

  static resetOriginalColor_(element) {
    if (this.restoreValues_.color.has(element)) {
      element.style.backgroundColor = this.restoreValues_.color.get(element);
    }
  }

  static colorValue_(difference, range) {
    const normValue = Math.round(this.maxColor * Math.pow(difference / (range + this.eps), 3));
    return this.maxColor - normValue;
  }

  static updateElementColor_(element, score) {
    this.storeRestoreValue_(element, 'color', element.style.backgroundColor);

    const threshold = this.settings_.threshold;
    if (this.settings_.styling == 'color') {
      let colorStr;
      if (score >= threshold) {
        const colorVal = this.colorValue_(score - threshold, 1 - threshold);
        colorStr = `rgba(255, ${colorVal}, ${colorVal}, 0.4)`;
      } else {
        const colorVal = this.colorValue_(threshold - score, threshold);
        colorStr = `rgba(${colorVal}, 255, ${colorVal}, 0.4)`;
      }
      element.style.backgroundColor = colorStr;
    } else this.resetOriginalColor_(element);
  }

  // visibility

  static resetOriginalVisility_(element) {
    if (this.restoreValues_.visibility.has(element)) {
      element.style.display = this.restoreValues_.visibility.get(element);
    }
  }

  static updateElementVisibility_(element, score) {
    this.storeRestoreValue_(element, 'visibility', element.style.display);

    if (this.settings_.styling == 'remove' && score >= this.settings_.threshold) {
      element.style.display = 'none';
    } else this.resetOriginalVisility_(element);
  }
}
