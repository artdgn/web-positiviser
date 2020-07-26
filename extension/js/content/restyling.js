/**
 * sadly, imports cannot be used, so these "scripts" share a common context.
 * This script assumes that common.js ran before it.
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
        const scoreAttr = settings.ranking ? scoredTextsRankAtt : scoredTextsValueAtt;

        // elements and parents
        const scoredElements = $(this.scoredTextsSelector);    
        const allParents = $(this.structuralNodesSelector).has(this.scoredTextsSelector);

        // try to find highest parents of single neg-elements and update them        
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
  