import $ from 'jquery';

import {
  scoredTextsClassName,
  scoredTextsValueAtt,
  scoredTextsRankAtt,
  domain,
} from './common.js';

import { defaultSettings } from '../settings.js'

export class Restyler {
  // constants
  static containerSelector = 'div,tr,nav';
  static eps = 0.001;
  static maxColor = 200;
  static minOpacity = 0.1;
  static scoredTextsSelector = `.${scoredTextsClassName}`;
  // state
  static restyledPreviously_ = new Set();
  static restoreValues_ = {
    opacity: new Map(),
    color: new Map(),
    visibility: new Map(),
  }
  static alteredValues_ = {
    opacity: new Map(),
    color: new Map(),
    visibility: new Map(),
  }
  static settings_ = {};

  static updateAll() {
    chrome.storage.sync.get(
      { storedSettings: { global: defaultSettings } },
      (stored) => {        
        this.settings_ = stored.storedSettings[domain()] || stored.storedSettings.global;
        this.findAndRestyleAll_();
      }
    );
  }

  static findAndRestyleAll_() {
    const scoreAttr = this.settings_.ranking ? scoredTextsRankAtt : scoredTextsValueAtt;

    // elements and parents
    const scoredElements = $(this.scoredTextsSelector);
    const allParents = $(this.containerSelector).has(this.scoredTextsSelector);

    // try to find highest parents of single neg-elements and update them
    const visitedChildren = new Set();
    const restyled = new Set();
    allParents.each((i, parent) => {
      const children = $(parent).find(this.scoredTextsSelector);
      if (children.length == 1 && !this.settings_.onlyTexts) {
        const onlyChild = children[0];

        if (visitedChildren.has(onlyChild)) return; // stop if already visited
        visitedChildren.add(onlyChild);

        this.updateElementStyle_(parent, $(onlyChild).attr(scoreAttr));
        restyled.add(parent);
      }
    });

    // update all remaining elements that didn't find a single parent
    scoredElements.each((i, element) => {
      if (!visitedChildren.has(element)) {
        this.updateElementStyle_(element, $(element).attr(scoreAttr));
        restyled.add(element);
      }
    });

    // reset previously restyled skipped this time
    // (e.g. due to different number of children / backend selection)
    [...this.restyledPreviously_]
      .filter((element) => !restyled.has(element))
      .forEach((element) => this.resetElementStyle_(element));
    console.log(`restored ${this.restyledPreviously_.size} elements`);
    this.restyledPreviously_ = restyled;
    console.log(`altered ${restyled.size} elements`);
  }

  static updateElementStyle_(element, score) {
    element = $(element);
    score = parseFloat(score);
    this.updateElementOpacity_(element, score);
    this.updateElementColor_(element, score);
    this.updateElementVisibility_(element, score);
  }

  static resetElementStyle_(element) {
    element = $(element);
    this.resetOriginalOpacity_(element);
    this.resetOriginalColor_(element);
    this.resetOriginalVisility_(element);
  }

  static storeRestoreValue(element, attType, curValue) {
    if (!this.alteredValues_[attType].has(element[0]) || 
        (this.alteredValues_[attType].get(element[0]) != curValue)) {
      // if this is a newly encountered element or
      // if value changed since last restyle (someone else changed it)
      // store that as restore value, 
      this.restoreValues_[attType].set(element[0], curValue)
    }
  }

  static updateElementOpacity_(element, score) {
    this.storeRestoreValue(element, 'opacity', element.css('opacity'));

    const threshold = this.settings_.threshold;
    if (this.settings_.styling == 'opacity' && score >= threshold) {
      const normScore = (score - threshold) / (1 - threshold + this.eps);
      const opacity = (1 - normScore * (1 - this.minOpacity)).toFixed(2);
      element.css('opacity', opacity);
      this.alteredValues_.opacity.set(element[0], opacity);
    } else this.resetOriginalOpacity_(element);
  }

  static resetOriginalOpacity_(element) {
    if (this.restoreValues_.opacity.has(element[0])) {
      element.css('opacity', this.restoreValues_.opacity.get(element[0]));
    }
  }

  static colorValue_(difference, range) {
    const normValue = Math.round(this.maxColor * Math.pow(difference / (range + this.eps), 3));
    return this.maxColor - normValue;
  }

  static updateElementColor_(element, score) {
    this.storeRestoreValue(element, 'color', element.css('background-color'));

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
      element.css('background-color', colorStr);
      this.alteredValues_.color.set(element[0], colorStr);
    } else this.resetOriginalColor_(element);
  }

  static resetOriginalColor_(element) {
    if (this.restoreValues_.color.has(element[0])) {
      element.css('background-color', this.restoreValues_.color.get(element[0]));
    }
  }

  static updateElementVisibility_(element, score) {
    this.storeRestoreValue(element, 'visibility', element.is(':visible'));

    if (this.settings_.styling == 'remove' && score >= this.settings_.threshold) {
      element.hide(100);
      this.alteredValues_.visibility.set(element[0], false);
    } else this.resetOriginalVisility_(element);
  }

  static resetOriginalVisility_(element) {
    if (this.restoreValues_.visibility.has(element[0])) {
      if (this.restoreValues_.visibility.get(element[0])) element.show(100);
    }
  }
}
