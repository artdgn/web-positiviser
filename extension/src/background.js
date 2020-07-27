chrome.runtime.onMessage.addListener((message, sender) => {
    if (message.type == 'statsUpdate') {
      tabId = sender.tab.id;
      chrome.storage.local.get(
        {stats: {}}, 
        (stored) => {
          stored.stats[tabId] = message.stats;
          chrome.storage.local.set(stored, () => void console.log(stored));
      });
    }
})