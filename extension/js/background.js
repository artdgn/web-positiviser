function onMessage(request, sender, sendResponse) {
    // Show icon
    console.log("Putting badge on address bar.");
    chrome.pageAction.show(sender.tab.id);

    console.log("Logging Filter event...");
    chrome.storage.sync.get({
      filter: 'default'
    }, function(items) {
      console.log("Filtering on " + items.filter + " setting.");
    });
    sendResponse({});
}

chrome.runtime.onMessage.addListener(onMessage);
