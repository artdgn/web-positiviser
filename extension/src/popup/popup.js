import $ from 'jquery';
import { defaultSettings } from '../settings.js'

const thisSiteCheckId = 'selected-thissiteonly-check';

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

function saveOptions(event) {
  chrome.storage.sync.get(
    { storedSettings: { global: defaultSettings } },
    (stored) => {
      const storedSettings = stored.storedSettings;
      const thisSiteOnly = $(`#${thisSiteCheckId}`).prop('checked');
      const thisSiteOnlyUpdated = (event.target.id == thisSiteCheckId);
      const switchedToThisSiteOnly = thisSiteOnlyUpdated && thisSiteOnly;

      const newSettings = {
        styling: $('#selected-styling').val(),
        backend: $('#selected-backend').val(),
        threshold: $('#selected-threshold').val() / 100,
        ranking: $('#selected-ranking-check').prop('checked'),
        onlyTexts: $('#selected-onlytexts-check').prop('checked'),
        enabled: $('#selected-enabled-check').prop('checked') || switchedToThisSiteOnly,
      };

      withTab((tab) => {        
        const switchedToGlobal = thisSiteOnlyUpdated && !thisSiteOnly;
        if (switchedToGlobal) {
          // remove domain settings and restore global
          delete storedSettings[tabDomain(tab)]; // delete tab settings
        } else {
          // update settings according to thisSiteOnly toggle
          const key = thisSiteOnly ? tabDomain(tab) : 'global';
          storedSettings[key] = newSettings;
        }
        chrome.storage.sync.set({ storedSettings: storedSettings });
        loadOptions(); // sync view in case view needs to change
      });
    });
}

function loadOptions() {
  chrome.storage.sync.get(
    { storedSettings: { global: defaultSettings } },
    (stored) => {
      const storedSettings = stored.storedSettings;
      withTab((tab) => {
        // use this site settings if defined
        $('#selected-thissiteonly-check').prop(
          'checked', (storedSettings[tabDomain(tab)] !== undefined));

        const settings = storedSettings[tabDomain(tab)] || storedSettings.global;

        $('#selected-styling').val(settings.styling);
        $('#selected-backend').val(settings.backend);
        $('#selected-threshold').val(Math.round(settings.threshold * 100));
        $('#selected-ranking-check').prop('checked', settings.ranking);
        $('#selected-onlytexts-check').prop('checked', settings.onlyTexts);
        $('#selected-enabled-check').prop('checked', settings.enabled);
      });
    }
  );
}

function updateStatsText() {
  chrome.storage.local.get(
    { stats: {} },
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
  chrome.storage.onChanged.addListener(
    (changes) => { if (changes.stats != null) updateStatsText() });
}

$(onReady);

