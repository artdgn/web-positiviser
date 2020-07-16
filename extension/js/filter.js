function findElements() {
    return $("h1,h2,h3,h4,h5,p,span,li,a").filter(qualifyElement);
}


$.fn.immediateText = function() {
    return this.contents().not(this.children()).text();
};


function qualifyElement(index, element) {
    text = $(this).immediateText();

    // words number
    word_matches = text.match(/[\S]{3,}/g);
    n_words = word_matches ? word_matches.length : 0;

    return (n_words >= 3);
}


function collectTexts(elements) {
    texts = [];
    elements.each(function (index) {
        texts[index] = $(this).text();
    })
    return texts;
}


function markByBackend(elements) {
    chrome.storage.sync.get({
        backend: 'default',
    }, function(stored) {
        backend = stored.backend;
        console.log("stored backend setting: " + backend);
        if (backend == "simple") {
            simpleHeuristicBackend(elements);
        } else {
            pythonSentimentBackend(elements);
        };
    });
}


function pythonSentimentBackend(elements) {
    texts = collectTexts(elements);
    $.ajax({
        type: 'post',
        url: 'http://localhost:8000/sentiment/',
        data: JSON.stringify({'texts': texts}),
        success: function(data, status) {
            markByValues(elements, data.values, data.ranks);
        },
        error: function(xhr, status, error) {
            alert(xhr.responseText);
        }
    });
}

function simpleHeuristicBackend(elements) {
    texts = collectTexts(elements);
    values = [];
    texts.forEach(function (text, index) {
        word_matches = text.match(/[\S]{3,}/g);
        n_words = word_matches ? word_matches.length : 0;

        if (n_words == 0) {
            // shouldn't happen
            value = 0;
        } else {
            bad_words_matches = text.match(/trump|covid|coronavirus|pandemic/ig);
            n_bad = bad_words_matches ? bad_words_matches.length : 0;
            value = n_bad / n_words;
        }
        values[index] = value;
    });
    markByValues(elements, values, arrayDenseRanks(values));
}

function arrayDenseRanks(arr) {
    sorted = Array.from(new Set(arr)).sort(function(a, b) {
        return a - b;
    });
    ranks = arr.map(function(v) {
        return sorted.indexOf(v) + 1;
    });
    return ranks;
}

function markByValues(elements, neg_values, neg_ranks) {
    neg_margin = 0.0;
    pos_margin = 0.0;
    min_opacity = 0.1

    chrome.storage.sync.get({
       styling: 'default',
       threshold: 50,
       ranking: false
    }, function(stored) {
       console.log("stored settings:");
       console.log(stored);

       threshold = stored.threshold / 100;
       neg_threshold = Math.min(threshold + neg_margin, 99.9);
       pos_threshold = Math.max(threshold - pos_margin, 0.01);
       max_rank = Math.max.apply(null, neg_ranks);

       elements.each(function (index) {
           if (stored.ranking) {
               neg_score = neg_ranks[index] / max_rank;
           } else {
               neg_score = neg_values[index];
           };

           // opacity
           if (neg_score >= neg_threshold) {
               norm_score = (neg_score - neg_threshold) / (1 - neg_threshold);
               opacity = 1 - norm_score * (1 - min_opacity);
               $(this).css('opacity', opacity);
           } else {
               $(this).css('opacity', 1.0);
           }

           // color
           if (stored.styling == "with_color") {
               if (neg_score >= neg_threshold) {
                   norm_score = (neg_score - neg_threshold) / (1 - neg_threshold);
                   color_val = Math.round(255 * norm_score);
                   $(this).css('background-color',
                               `rgba(255, ${255 - color_val}, ${255 - color_val})`);
               } else if (neg_score < pos_threshold) {
                   norm_score = (pos_threshold - neg_score) / pos_threshold;
                   color_val = Math.round(255 * norm_score);
                   $(this).css('background-color',
                               `rgba(${255 - color_val}, 255, ${255 - color_val}, 0.5)`);
               }
           } else {
               $(this).css('background-color', 'white');
           }
       });
    });
}

elements = findElements();
markByBackend(elements)
chrome.storage.onChanged.addListener(function(changes) {
    markByBackend(elements);
})
chrome.runtime.sendMessage({}, function(response) {});
