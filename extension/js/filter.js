function findElements() {
    return $("h1,h2,h3,h4,h5,p,span,li,a,img").filter(qualifyElement);
}

$.fn.immediateText = function() {
    text = this.contents().not(this.children()).text();

    // handle img tags
    if (!text) {
        alt_text = $(this).attr("alt");
        text = (alt_text != null) ? text + ' ' + alt_text : text;
    };

    // handle a tags
    if (!text) {
        label_text = $(this).attr("label") ? $(this).attr("label") : "";
        title_text = $(this).attr("title") ? $(this).attr("title") : "";
        text = text + ' ' + label_text + ' ' + title_text
    };

    return text;
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
        texts[index] = $(this).immediateText();
    })
    return texts;
}


function markByBackend(callback) {
    elements = findElements();
    chrome.storage.sync.get({
        backend: 'python',
    }, function(stored) {
        backend = stored.backend;
        console.log("stored backend setting: " + backend);
        if (backend == "simple") {
            simpleHeuristicBackend(elements, callback);
        } else {
            pythonSentimentBackend(elements, callback);
        };
    });
}

function pythonSentimentBackend(elements, callback) {
    texts = collectTexts(elements);
    $.ajax({
        type: 'post',
        url: 'http://localhost:8000/sentiment/',
        data: JSON.stringify({'texts': texts}),
        success: function(data, status) {
            setSentimentData(elements, data.values, data.ranks);
            callback();
        },
        error: function(xhr, status, error) {
            alert(xhr.responseText);
        }
    });
}

function simpleHeuristicBackend(elements, callback) {
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
    setSentimentData(elements, values, arrayDenseRanks(values));
    callback();
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

function setSentimentData(elements, neg_values, neg_ranks) {
    max_rank = Math.max.apply(null, neg_ranks);
    elements.each(function (index) {
        $(this).addClass('negativityText');
        $(this).attr('data-negativity-value', neg_values[index]);
        $(this).attr('data-negativity-rank', neg_ranks[index] / max_rank);
    });
}

function adjustStyle() {
    neg_margin = 0.0;
    pos_margin = 0.0;
    min_opacity = 0.1

    chrome.storage.sync.get({
       styling: 'opacity',
       threshold: 50,
       ranking: false
    }, function(stored) {
       console.log("stored settings:");
       console.log(stored);

       threshold = stored.threshold / 100;
       neg_threshold = Math.min(threshold + neg_margin, 99.9);
       pos_threshold = Math.max(threshold - pos_margin, 0.01);

       $(".negativityText").each(function () {
           if (stored.ranking) {
               neg_score = parseFloat($(this).attr("data-negativity-rank"));
           } else {
               neg_score = parseFloat($(this).attr("data-negativity-value"));
           };

           if ((stored.styling == "opacity") && (neg_score >= neg_threshold)) {
                // opacity
               norm_score = (neg_score - neg_threshold) / (1 - neg_threshold);
               opacity = 1 - norm_score * (1 - min_opacity);
               $(this).css('opacity', opacity);
           } else {
               $(this).css('opacity', 1.0);
           };

           // color
           if (stored.styling == "color") {
               if (neg_score >= neg_threshold) {
                   max_red = 200;
                   norm_score = (neg_score - neg_threshold) / (1 - neg_threshold);
                   color_val = Math.round(max_red * Math.pow(norm_score, 3));
                   $(this).css('background-color',
                               `rgba(255, ${max_red - color_val}, ${max_red - color_val}, 0.4)`);
               } else if (neg_score < pos_threshold) {
                   max_green = 200;
                   norm_score = (pos_threshold - neg_score) / pos_threshold;
                   color_val = Math.round(max_green * Math.pow(norm_score, 3));
                   $(this).css('background-color',
                               `rgba(${max_green - color_val}, 255, ${max_green - color_val}, 0.4)`);
               }
           } else {
               $(this).css('background-color', 'white');
           };
       });
    });
}

// initial run
markByBackend(adjustStyle);

// watch for option changes
chrome.storage.onChanged.addListener(function(changes) {
    console.log(changes);
    if (changes.backend != null) {
        markByBackend(adjustStyle);
    } else {
        adjustStyle();
    };
})

// watch for dynamically added elements (infinite scroll / twitter load)
added = 0;
observer = new MutationObserver(function(mutationsList, observer) {
    for(let mutation of mutationsList) {
        added += mutation.addedNodes.length;
    }
    if (added >= 20) {
        markByBackend(adjustStyle);
        added = 0;
    }
});
observer.observe(document.body, {attributes: false,
                                 childList: true,
                                 subtree: true});
