import NegativityCalculator from './backends';
import Restyler from './restyling';

function restyleCallback() {
  Restyler.updateAll();
  chrome.runtime.sendMessage(
    {type: 'statsUpdate', stats: NegativityCalculator.stats});
}

// initial run
NegativityCalculator.updateAll(restyleCallback);

// watch for option changes
chrome.storage.onChanged.addListener((changes) => {
  console.log(changes);
  if (changes.backend != null) {
    NegativityCalculator.updateAll(restyleCallback);
  } else {
    restyleCallback();
  }
});

// watch for dynamically added elements (infinite scroll / twitter load)
let added = 0;
const observer = new MutationObserver((mutationsList) => {
  for (let mutation of mutationsList) {
    added += mutation.addedNodes.length;
  }
  if (added >= 20) {
    NegativityCalculator.updateAll(restyleCallback);
    added = 0;
  }
});
observer.observe(document.body, { attributes: false, childList: true, subtree: true });
