function findElements() {
    return $("h1,h2,h3,h4,h5,p,span,li,a").filter(qualifyElement);
}


function qualifyElement(index, element) {
    text = $(this).text();
    word_matches = text.match(/[\S]{3,}/g);
    n_words = word_matches ? word_matches.length : 0;
    return n_words >= 3;
}


function collectTexts(elements) {
    texts = [];
    elements.each(function (index) {
        texts[index] = $(this).text();
    })
//    console.log("texts: " + texts)
    return texts;
}


function markByBackend(elements) {
    texts = collectTexts(elements);
    $.ajax({
        type: 'post',
        url: 'http://localhost:8000/sentiment/',
        data: JSON.stringify({'texts': texts}),
        success: function(values, status) {
//            console.log("values: " + values)
            markByValues(elements, values)
        },
        error: function(xhr, status, error) {
          alert(xhr.responseText);
        }
    });
}


function markByValues(elements, neg_values) {
    elements.each(function (index) {
        var color_val = Math.round(255 * neg_values[index]);
        var color = `rgb(255, ${255 - color_val}, ${255 - color_val})`;
        $(this).css('background-color', color);
//        $(this).css('opacity', color_val);
    });
}


chrome.storage.sync.get({
 filter: 'default',
}, function(items) {
   console.log("Filter setting stored is: " + items.filter);
   elements = findElements();
   markByBackend(elements)
 });
chrome.runtime.sendMessage({}, function(response) {});
