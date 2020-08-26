import { domain } from './common.js'
import { NegativityScorer } from './scoring.js';
import { Restyler } from './restyling.js';

function calulationsCallback() {
  Restyler.updateAll();
  chrome.runtime.sendMessage(
    { type: 'statsUpdate', stats: NegativityScorer.stats });
}

function recalculationNeeded(newStoredSettings, oldStoredSettings) {
  const newSettings = newStoredSettings[domain()] || newStoredSettings.global;
  const oldSettings = oldStoredSettings[domain()] || oldStoredSettings.global;
  return (
    (newSettings.backend != oldSettings.backend) ||
    (newSettings.enabled != oldSettings.enabled)
  );
}

// watch for dynamically added elements (infinite scroll / twitter load)
// with mechanism to delay between mutation and calculation to allow 
// for transitions to finish (again, twitter)
function addMutationObserverWithDelay(delayedCallback) {  
  const consts = {
    maxDelays: 10,
    delayTime: 1000,
    minTimeDiff: 1000,
    minElements: 5,
  }
  let changeTimes = new Map();
  let currentDelay = 0;
  let lastRecalcTime = performance.now();

  function latestChangeTime() {
    return Math.max(...changeTimes.values());
  } 

  function textElements() {
    return NegativityScorer.qualifiedTextElements([...changeTimes.keys()]);
  }

  function updateAfterDelay() {
    if (latestChangeTime() - lastRecalcTime > consts.minTimeDiff) {
      changeTimes = new Map();        
      currentDelay = 0;
      delayedCallback();
      lastRecalcTime = performance.now();
    } else {       
      if (currentDelay < consts.maxDelays) {
        currentDelay += 1;
        setTimeout(updateAfterDelay, consts.delayTime); // recur 
      }
    }
  }

  const observer = new MutationObserver((mutationsList) => {   
    const changeTime = performance.now();
    for (let mutation of mutationsList) {
      mutation.addedNodes.forEach((n) => changeTimes.set(n, changeTime));
    }
    
    if ((currentDelay == 0) && (changeTimes.size >= consts.minElements)) {
      // not waiting due to previous changes, and at least a minimum amount of changes
      if (textElements().length >= consts.minElements) updateAfterDelay();
    }
  });
  observer.observe(document.body, { attributes: false, childList: true, subtree: true });
}

function main() {
  // initial run
  NegativityScorer.updateAll(calulationsCallback);

  // watch for option changes
  chrome.storage.onChanged.addListener((changes) => {
    if ('storedSettings' in changes) {
      const settingsChange = changes.storedSettings;
      if (recalculationNeeded(settingsChange.newValue, settingsChange.oldValue)) {
        NegativityScorer.updateAll(calulationsCallback);
      } else {
        Restyler.updateAll();
      }
    }
  });

  // watch for new elements
  addMutationObserverWithDelay(() => NegativityScorer.updateAll(calulationsCallback));
}

main();