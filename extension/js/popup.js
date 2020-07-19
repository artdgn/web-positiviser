function saveOptions() {
    const options = {
        styling: document.getElementById('selected-styling').value,
        backend: document.getElementById('selected-backend').value,
        threshold: document.getElementById('selected-threshold').value,
        ranking: document.getElementById('selected-ranking-check').checked
    };
    chrome.storage.sync.set(options, () => void console.log(options));
}

function setFromStored(stored) {
    document.getElementById('selected-styling').value = stored.styling;
    document.getElementById('selected-backend').value = stored.backend;
    document.getElementById('selected-threshold').value = stored.threshold;
    document.getElementById('selected-ranking-check').checked = stored.ranking;
}

function getOptions(callback) {
    chrome.storage.sync.get({
        styling: 'opacity',
        backend: 'python',
        threshold: 50,
        ranking: false
    }, (stored) => void callback(stored));
}

function restoreOptions() {
    getOptions(setFromStored);
    for (element of document.getElementsByClassName('stored-options')) {
        element.addEventListener('change', saveOptions);
    };
}

document.addEventListener('DOMContentLoaded', restoreOptions);
