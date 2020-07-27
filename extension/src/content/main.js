import NegativityCalculator from './backends';
import Restyler from './restyling';

// initial run
NegativityCalculator.updateAll(() => Restyler.updateAll());

// watch for option changes
chrome.storage.onChanged.addListener((changes) => {
  console.log(changes);
  if (changes.backend != null) {
    NegativityCalculator.updateAll(() => Restyler.updateAll());
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
    NegativityCalculator.updateAll(() => Restyler.updateAll());
    added = 0;
  }
});
observer.observe(document.body, { attributes: false, childList: true, subtree: true });
