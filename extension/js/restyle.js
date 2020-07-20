const structuralNodesSelector = 'div,tr,nav';
const textNodesSelector = 
    'h1,h2,h3,h4,h5,p,span,li,a,img,strong,em,font,big,small,b,i,u,td';
const wordPattern = /[a-z]{3,}/ig

function findTextElements() {
  return $(textNodesSelector).filter((i, element) => {
    const text = extractImmediateText(element);

    const wordMatches = text.match(wordPattern);
    const numWords = wordMatches ? wordMatches.length : 0;

    return (numWords >= 3);
  });
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

function collectTexts(elements) {
  return $.map(elements, (el) => extractImmediateText(el));
}

function processTextsByBackend(callback) {
  const elements = findTextElements();
  chrome.storage.sync.get({
    backend: 'python',
  }, function(settings) {
    if (settings.backend == 'simple') {
      simpleHeuristicBackend(elements, callback);
    } else {
      pythonSentimentBackend(elements, callback);
    }
  });
}

function pythonSentimentBackend(elements, callback) {
  const texts = collectTexts(elements);
  fetch('http://localhost:8000/sentiment/', {
    method: 'post',
    body: JSON.stringify({'texts': texts}),
  }).then(response => {
    if (response.status !== 200) {
      alert(`Backend returned error: ${response.status}`);
      console.log(response);
      return;
    }
    return response.json();
  }).then(data => {
    setNegativityAttributes(elements, data.values, data.ranks);
    callback();
  }).catch((error) => {
    alert(`Backend call failed: ${error}`);
    console.log(error);
  });
}

function simpleHeuristicBackend(elements, callback) {
  const texts = collectTexts(elements);
  const values = texts.map((text) => {
    const wordMatches = text.match(wordPattern);
    const numWords = wordMatches ? wordMatches.length : 0;

    const negativeMatches = text.match(/trump|covid|coronavirus|pandemic/ig);
    const numNegatives = negativeMatches ? negativeMatches.length : 0;

    return numNegatives / numWords;
  });
  setNegativityAttributes(elements, values, arrayDenseRanks(values));
  callback();
}

function arrayDenseRanks(arr) {
  const sorted = Array.from(new Set(arr)).sort((a, b) => (a - b));
  const ranks = arr.map((v) => (sorted.indexOf(v) + 1));
  return ranks;
}

function setNegativityAttributes(elements, negValues, negRanks) {
  const maxRank = Math.max.apply(null, negRanks);
  elements.each((i, el) => {
    $(el).addClass('negativityText');
    $(el).attr('data-negativity-value', negValues[i]);
    $(el).attr('data-negativity-rank', negRanks[i] / maxRank);
  });
}

function adjustStyle() {
    const minOpacity = 0.1;

    chrome.storage.sync.get({
       styling: 'opacity',
       threshold: 50,
       ranking: false
    }, (stored) => {
       const threshold = Math.max(Math.min(stored.threshold / 100, 99.9), 0.01);

       $(".negativityText").each((i, el) => {
           let score;
           if (stored.ranking) {
               score = parseFloat($(el).attr("data-negativity-rank"));
           } else {
               score = parseFloat($(el).attr("data-negativity-value"));
           };

           // opacity
           if ((stored.styling == "opacity") && (score >= threshold)) {
               const normScore = (score - threshold) / (1 - threshold);
               const opacity = 1 - normScore * (1 - minOpacity);
               $(el).css('opacity', opacity);
           } else {
               $(el).css('opacity', 1.0);
           };

           // color
           const maxColor = 200;
           if (stored.styling == "color") {
               if (score >= threshold) {
                   const normScore = (score - threshold) / (1 - threshold);
                   const colorVal = Math.round(maxColor * Math.pow(normScore, 3));
                   $(el).css('background-color',
                               `rgba(255, ${maxColor - colorVal},
                                     ${maxColor - colorVal}, 0.4)`);
               } else {
                   const normScore = (threshold - score) / threshold;
                   const colorVal = Math.round(maxColor * Math.pow(normScore, 3));
                   $(el).css('background-color',
                             `rgba(${maxColor - colorVal}, 255,
                                   ${maxColor - colorVal}, 0.4)`);
               };
           } else {
               $(el).css('background-color', "inherit");
           };

           // remove
           if ((stored.styling == "remove") && (score >= threshold)) {
               $(el).hide(100);
               $(el).closest(structuralNodesSelector).hide(100);
           } else {
               $(el).show(100);
               $(el).closest(structuralNodesSelector).show(100);
           };
       });
    });
}

// initial run
processTextsByBackend(updateStyleAll);

// watch for option changes
chrome.storage.onChanged.addListener((changes) => {
  console.log(changes);
  if (changes.backend != null) {
    processTextsByBackend(updateStyleAll);
  } else {
    updateStyleAll();
  }
});

// watch for dynamically added elements (infinite scroll / twitter load)
let added = 0;
const observer = new MutationObserver((mutationsList, observer) => {
  for (let mutation of mutationsList) {
    added += mutation.addedNodes.length;
  }
  if (added >= 20) {
    processTextsByBackend(updateStyleAll);
    added = 0;
  }
});
observer.observe(
    document.body, {attributes: false, childList: true, subtree: true});
