import NegativityCalculator from './backends';
import Restyler from './restyling';

function calulationsCallback() {
  Restyler.updateAll();
  chrome.runtime.sendMessage(
    {type: 'statsUpdate', stats: NegativityCalculator.stats});
}

// initial run
NegativityCalculator.updateAll(calulationsCallback);

// watch for option changes
chrome.storage.onChanged.addListener((changes) => {
  console.log(changes);
  if (changes.backend != null) {
    NegativityCalculator.updateAll(calulationsCallback);
  } else {
    Restyler.updateAll();
  }
});

// watch for dynamically added elements (infinite scroll / twitter load)
let added = 0;
const observer = new MutationObserver((mutationsList) => {
  for (let mutation of mutationsList) {
    added += mutation.addedNodes.length;
  }
  if (added >= 20) {
    NegativityCalculator.updateAll(calulationsCallback);
    added = 0;
  }
});
observer.observe(document.body, { attributes: false, childList: true, subtree: true });
