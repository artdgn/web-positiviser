import $ from 'jquery';
import {defaultSettings} from '../settings.js'

function saveOptions() {
  const settings = {
    styling: $('#selected-styling')[0].value,
    backend: $('#selected-backend')[0].value,
    threshold: $('#selected-threshold')[0].value / 100,
    ranking: $('#selected-ranking-check')[0].checked,
    onlyTexts: $('#selected-onlytexts-check')[0].checked,
  };
  chrome.storage.sync.set({ storedSettings: settings });
}

function loadOptions() {
  chrome.storage.sync.get(
    { storedSettings: defaultSettings },
    (stored) => {
      const settings = stored.storedSettings;
      $('#selected-styling')[0].value = settings.styling;
      $('#selected-backend')[0].value = settings.backend;
      $('#selected-threshold')[0].value = Math.round(settings.threshold * 100);
      $('#selected-ranking-check')[0].checked = settings.ranking;
      $('#selected-onlytexts-check')[0].checked = settings.onlyTexts;
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
        $('#positivity-score')[0].textContent = text;
      });
    });  
}

function onReady() {
  // options
  loadOptions();
  // add options listeners
  $('.stored-options').on('change', saveOptions);

  // stats
  updateStatsText();
  // watch for stats changes
  chrome.storage.local.onChanged.addListener(
    (changes) => { if (changes.stats != null) updateStatsText() });
}

$(onReady);

