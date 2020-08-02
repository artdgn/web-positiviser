import $ from 'jquery';
import {defaultSettings} from '../settings.js'

function saveOptions() {
  const settings = {
    styling: $('#selected-styling').val(),
    backend: $('#selected-backend').val(),
    threshold: $('#selected-threshold').val() / 100,
    ranking: $('#selected-ranking-check').prop('checked'),
    onlyTexts: $('#selected-onlytexts-check').prop('checked'),
  };
  chrome.storage.sync.set({ storedSettings: settings });
}

function loadOptions() {
  chrome.storage.sync.get(
    { storedSettings: defaultSettings },
    (stored) => {
      const settings = stored.storedSettings;
      $('#selected-styling').val(settings.styling);
      $('#selected-backend').val(settings.backend);
      $('#selected-threshold').val(Math.round(settings.threshold * 100));
      $('#selected-ranking-check').prop('checked', settings.ranking);
      $('#selected-onlytexts-check').prop('checked', settings.onlyTexts);
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
        $('#positivity-score').text(text);
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

