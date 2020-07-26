function saveOptions() {
  const options = {
    styling: document.getElementById('selected-styling').value,
    backend: document.getElementById('selected-backend').value,
    threshold: document.getElementById('selected-threshold').value / 100,
    ranking: document.getElementById('selected-ranking-check').checked,
    onlyTexts: document.getElementById('selected-onlytexts-check').checked,
  };
  chrome.storage.sync.set(options, () => void console.log(options));
}

function updateFromStored() {
  chrome.storage.sync.get({
    styling: 'opacity',
    backend: 'python',
    threshold: 0.5,
    ranking: false,
    onlyTexts: false,
  }, (stored) => {
    document.getElementById('selected-styling').value = stored.styling;
    document.getElementById('selected-backend').value = stored.backend;
    document.getElementById('selected-threshold').value = Math.round(stored.threshold * 100);
    document.getElementById('selected-ranking-check').checked = stored.ranking;
    document.getElementById('selected-onlyTexts-check').checked = stored.onlyTexts;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  updateFromStored();
  for (element of document.getElementsByClassName('stored-options')) {
    element.addEventListener('change', saveOptions);
  }
});
