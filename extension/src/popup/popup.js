import $ from 'jquery';
import {defaultSettings} from '../settings.js'

function withTab(tabCallback) {
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, (tabs) => {
    tabCallback(tabs[0]);
  });
}

function tabDomain(tab) {
  return tab.url.match(/:\/\/[a-z0-9\-._~%]+/gi)[0].slice(3)
}

function saveOptions() {
  chrome.storage.sync.get(
    { storedSettings: {global: defaultSettings} },
    (stored) => {
      const storedSettings = stored.storedSettings;

      const globalSwitch = $('#selected-globalsettings-check').prop('checked');

      const newSettings = {
        styling: $('#selected-styling').val(),
        backend: $('#selected-backend').val(),
        threshold: $('#selected-threshold').val() / 100,
        ranking: $('#selected-ranking-check').prop('checked'),
        onlyTexts: $('#selected-onlytexts-check').prop('checked'),
        onOff: $('#selected-onoff-check').prop('checked'),
      };

      withTab((tab) => {
        if (globalSwitch) {
          // set global
          storedSettings.global = newSettings;        
          // delete tab settings
          delete storedSettings[tabDomain(tab)];
        } else {
          // set for tab
          storedSettings[tabDomain(tab)] = newSettings;  
          // don't touch global
        }
        chrome.storage.sync.set({ storedSettings: storedSettings });
      });
    });
}

function loadOptions() {
  chrome.storage.sync.get(
    { storedSettings: {global: defaultSettings} },
    (stored) => {
      const storedSettings = stored.storedSettings;
      withTab((tab) => {
        // use non global if defined
        $('#selected-globalsettings-check').prop(
          'checked', (storedSettings[tabDomain(tab)] === undefined));
        
        const settings = storedSettings[tabDomain(tab)] || storedSettings.global;        
        
        $('#selected-styling').val(settings.styling);
        $('#selected-backend').val(settings.backend);
        $('#selected-threshold').val(Math.round(settings.threshold * 100));
        $('#selected-ranking-check').prop('checked', settings.ranking);
        $('#selected-onlytexts-check').prop('checked', settings.onlyTexts);
        $('#selected-onoff-check').prop('checked', settings.onOff);      
      });
    }
  );
}

function updateStatsText() {
  chrome.storage.local.get(
    {stats: {}}, 
    (stored) => {
      withTab((tab) => {
        const tabStats = stored.stats[tab.id];
        const positives = tabStats.total - tabStats.negatives;
        let text = '';
        if (!isNaN(positives)) {
          const percentageText = `${(100 * positives / tabStats.total).toFixed(1)}%`;
          text = `${percentageText} (${positives} / ${tabStats.total})`
        }
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

