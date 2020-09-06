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

function getById(id) {
  return document.getElementById(id);
}

function saveOptions(event) {
  chrome.storage.local.get(
    { storedSettings: { global: defaultSettings } },
    (stored) => {
      const storedSettings = stored.storedSettings;
      const thisSiteOnly = getById(thisSiteCheckId).checked;
      const thisSiteOnlyUpdated = (event.target.id == thisSiteCheckId);
      const switchedToThisSiteOnly = thisSiteOnlyUpdated && thisSiteOnly;

      const newSettings = {
        styling: getById('selected-styling').value,
        backend: getById('selected-backend').value,
        threshold: getById('selected-threshold').value / 100,
        ranking: getById('selected-ranking-check').checked,
        onlyTexts: getById('selected-onlytexts-check').checked,
        enabled: getById('selected-enabled-check').checked || switchedToThisSiteOnly,
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
        chrome.storage.local.set({ storedSettings: storedSettings });
        loadOptions(); // sync view in case view needs to change
      });
    });
}

function loadOptions() {
  chrome.storage.local.get(
    { storedSettings: { global: defaultSettings } },
    (stored) => {
      const storedSettings = stored.storedSettings;
      withTab((tab) => {
        // use this site settings if defined
        getById('selected-thissiteonly-check').checked =
            (storedSettings[tabDomain(tab)] !== undefined);

        const settings = storedSettings[tabDomain(tab)] || storedSettings.global;
        const threshold = Math.round(settings.threshold * 100);

        getById('selected-styling').value = settings.styling;
        getById('selected-backend').value = settings.backend;
        getById('selected-threshold').value = threshold;
        getById('threshold-text').innerText = `${threshold}%`;
        getById('selected-ranking-check').checked = settings.ranking;
        getById('selected-onlytexts-check').checked = settings.onlyTexts;
        getById('selected-enabled-check').checked = settings.enabled;
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
        getById('positivity-score').innerText = text;
      });
    });
}

function main() {
  // options
  loadOptions();
  // add options listeners
  document
      .querySelectorAll('.stored-options')
      .forEach(el => el.onchange = saveOptions);

  // stats
  updateStatsText();
  // watch for stats changes
  chrome.storage.onChanged.addListener(
    (changes) => { if (changes.stats != null) updateStatsText() });
}

main();

