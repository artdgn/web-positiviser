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
        if (backend == "random") {
            randomValuesBackend(elements);
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
        success: function(values, status) {
            markByValues(elements, values);
        },
        error: function(xhr, status, error) {
            alert(xhr.responseText);
        }
    });
}

// random marks to simluate a backend without running one
function randomValuesBackend(elements) {
    values = [];
    elements.each(function (index) {
        values[index] = Math.random();
    });
    markByValues(elements, values);
}


function markByValues(elements, neg_values) {
    neg_threshold = 0.85;
    pos_threshold = 0.35;
    min_opacity = 0.4

    chrome.storage.sync.get({
       styling: 'default',
    }, function(stored) {
       console.log("stored styling setting: " + stored.styling);

       styling = stored.styling;

       elements.each(function (index) {
           neg_score = neg_values[index];

           // opacity
           if (neg_score >= neg_threshold) {
               norm_score = (neg_score - neg_threshold) / (1 - neg_threshold);
               opacity = 1 - norm_score * (1 - min_opacity);
               $(this).css('opacity', opacity);
           }

           // color
           if (styling != "nocolors") {
               if (neg_score >= neg_threshold) {
                   norm_score = (neg_score - neg_threshold) / (1 - neg_threshold);
                   color_val = Math.round(255 * norm_score);
                   $(this).css('background-color',
                               `rgba(255, ${255 - color_val}, ${255 - color_val})`);
               } else if (neg_score < pos_threshold) {
                   norm_score = (pos_threshold - neg_score) / pos_threshold;
                   color_val = Math.round(255 * norm_score);
                   $(this).css('background-color',
                               `rgb(${255 - color_val}, 255, ${255 - color_val})`);
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
