function onMessage(request, sender, sendResponse) {
  if (request.method == "saveStats") {
    console.log("Storing stats...");
    console.log ("Adding " + request.marked + " marked to stats.");
    chrome.storage.sync.get({
      marked: 0,
      pages: 0
    }, function(items) {
      chrome.storage.sync.set({
        marked: items.marked + request.marked,
        pages: items.pages + 1
      });
    });
    sendResponse({});
  } else {
    // Show icon
    console.log("Putting badge on address bar.");
    chrome.pageAction.show(sender.tab.id);

    console.log("Logging Filter event...");
    chrome.storage.sync.get({
      filter: 'mild'
    }, function(items) {
      console.log("Filtering on " + items.filter + " setting.");
    });
    sendResponse({});
  }
}

chrome.runtime.onMessage.addListener(onMessage);
