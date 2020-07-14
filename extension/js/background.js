function onMessage(request, sender, sendResponse) {
    chrome.storage.sync.get({
      styling: 'default'
    }, function(stored) {
      console.log("Styling: " + stored.styling);
    });
    sendResponse({});
}

chrome.runtime.onMessage.addListener(onMessage);
