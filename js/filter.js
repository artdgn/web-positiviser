function findElements() {
    return $("h1,h2,h3,h4,h5,p,span,li,a").filter(qualifyElement);
}

function qualifyElement(index, element) {
    return this.innerText.length > 10;
}

function collectTexts(elements) {
    texts = [];
    elements.each(function (index) {
        texts[index] = $(this).text();
    })
    console.log("texts: " + texts)
    return texts;
}

function textValues(texts) {
    return backEndStub(texts);
}

function backEndStub(texts) {
    neg_values = [];
    texts.forEach(function(t, i) {
        neg_values[i] = t.length / 144;
    });
    console.log("values: " + neg_values)
    return neg_values;
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
   texts = collectTexts(elements);
   values = textValues(texts);
   markByValues(elements, values)
 });
chrome.runtime.sendMessage({}, function(response) {});
