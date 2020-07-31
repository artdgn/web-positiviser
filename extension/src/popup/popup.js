function saveOptions() {
  const options = {
    styling: document.getElementById('selected-styling').value,
    backend: document.getElementById('selected-backend').value,
    threshold: document.getElementById('selected-threshold').value / 100,
    ranking: document.getElementById('selected-ranking-check').checked,
    onlyTexts: document.getElementById('selected-onlytexts-check').checked,
  };
  chrome.storage.sync.set(options);
}

function loadOptions() {
  chrome.storage.sync.get(
    {
      styling: 'opacity',
      backend: 'pyflair',
      threshold: 0.5,
      ranking: false,
      onlyTexts: false,
    },
    (stored) => {
      document.getElementById('selected-styling').value = stored.styling;
      document.getElementById('selected-backend').value = stored.backend;
      document.getElementById('selected-threshold').value = Math.round(stored.threshold * 100);
      document.getElementById('selected-ranking-check').checked = stored.ranking;
      document.getElementById('selected-onlytexts-check').checked = stored.onlyTexts;
    }
  );
}

function updateStatsText() {
  chrome.storage.local.get(
    {stats: {}}, 
    (stored) => {
      chrome.tabs.query({
        active: true, 
        currentWindow: true
      }, (tabs) => {
        const tabStats = stored.stats[tabs[0].id];
        const positives = tabStats.total - tabStats.negatives;
        const percentageText = `${(100 * positives / tabStats.total).toFixed(1)}%`;
        const text = `${percentageText} (${positives} / ${tabStats.total})`
        document.getElementById('positivity-score').textContent = text;
      });
    });  
}

document.addEventListener('DOMContentLoaded', () => {
  // options
  loadOptions();
  // add options listeners
  for (element of document.getElementsByClassName('stored-options')) {
    element.addEventListener('change', saveOptions);
  }

  // stats
  updateStatsText();
  // watch for stats changes
  chrome.storage.local.onChanged.addListener(
    (changes) => { if (changes.stats != null) updateStatsText() });
});

