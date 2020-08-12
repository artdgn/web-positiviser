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
  static origOpacityAttr = 'data-original-opacity';
  static origColorAttr = 'data-original-background-color';
  static origVisibleAttr = 'data-original-visible';
  static eps = 0.001;
  static maxColor = 200;
  static minOpacity = 0.1;
  static scoredTextsSelector = `.${scoredTextsClassName}`;
  // state
  static restyledPreviously_ = new Set();
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
    this.restyledPreviously_ = restyled;
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

  static updateElementOpacity_(element, score) {
    if (element.attr(this.origOpacityAttr) === undefined) {
      element.attr(this.origOpacityAttr, element.css('opacity'));
    }

    const threshold = this.settings_.threshold;
    if (this.settings_.styling == 'opacity' && score >= threshold) {
      const normScore = (score - threshold) / (1 - threshold + this.eps);
      const opacity = 1 - normScore * (1 - this.minOpacity);
      element.css('opacity', opacity);
    } else this.resetOriginalOpacity_(element);
  }

  static resetOriginalOpacity_(element) {
    const origOpacity = element.attr(this.origOpacityAttr);
    if (origOpacity !== undefined) element.css('opacity', origOpacity);
  }

  static colorValue_(difference, range) {
    const normValue = Math.round(this.maxColor * Math.pow(difference / (range + this.eps), 3));
    return this.maxColor - normValue;
  }

  static updateElementColor_(element, score) {
    if (element.attr(this.origColorAttr) === undefined) {
      element.attr(this.origColorAttr, element.css('background-color'));
    }

    const threshold = this.settings_.threshold;
    if (this.settings_.styling == 'color') {
      if (score >= threshold) {
        const colorVal = this.colorValue_(score - threshold, 1 - threshold);
        element.css('background-color', `rgba(255, ${colorVal}, ${colorVal}, 0.4)`);
      } else {
        const colorVal = this.colorValue_(threshold - score, threshold);
        element.css('background-color', `rgba(${colorVal}, 255, ${colorVal}, 0.4)`);
      }
    } else this.resetOriginalColor_(element);
  }

  static resetOriginalColor_(element) {
    const origColor = element.attr(this.origColorAttr);
    if (origColor !== undefined) element.css('background-color', origColor);
  }

  static updateElementVisibility_(element, score) {
    if (element.attr(this.origVisibleAttr) === undefined) {
      element.attr(this.origVisibleAttr, element.is(':visible'));
    }

    if (this.settings_.styling == 'remove' && score >= this.settings_.threshold) {
      element.hide(100);
    } else this.resetOriginalVisility_(element);
  }

  static resetOriginalVisility_(element) {
    const origVisibile = element.attr(this.origVisibleAttr);
    if (origVisibile !== undefined && origVisibile == 'true') {
      element.show(100);
    }
  }
}
