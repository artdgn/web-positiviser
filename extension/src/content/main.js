import { NegativityScorer } from './scoring.js';
import { Restyler } from './restyling.js';

function calulationsCallback() {
  Restyler.updateAll();
  chrome.runtime.sendMessage(
    { type: 'statsUpdate', stats: NegativityScorer.stats });
}

// initial run
NegativityScorer.updateAll(calulationsCallback);

// watch for option changes
chrome.storage.onChanged.addListener((changes) => {
  if ('storedSettings' in changes) {
    const settingsChange = changes.storedSettings;
    if ((settingsChange.newValue.backend != settingsChange.oldValue.backend) ||
      (settingsChange.newValue.onOff != settingsChange.oldValue.onOff)) {
      NegativityScorer.updateAll(calulationsCallback);
    } else {
      Restyler.updateAll();
    }
  }
});

// watch for dynamically added elements (infinite scroll / twitter load)
let added = 0;
const observer = new MutationObserver((mutationsList) => {
  for (let mutation of mutationsList) {
    added += mutation.addedNodes.length;
  }
  if (added >= 20) {
    NegativityScorer.updateAll(calulationsCallback);
    added = 0;
  }
});
observer.observe(document.body, { attributes: false, childList: true, subtree: true });
