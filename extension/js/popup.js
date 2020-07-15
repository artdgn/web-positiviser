function saveOptions() {
  options = {
    styling: document.getElementById('selectedStyling').value,
    backend: document.getElementById('selectedBackend').value,
    balance: document.getElementById('balanceAdjustment').value
  };
  chrome.storage.sync.set(options, function() {
    console.log(options);
  });
}

function setFromStored(stored) {
    document.getElementById('selectedStyling').value = stored.styling;
    document.getElementById('selectedBackend').value = stored.backend;
    document.getElementById('balanceAdjustment').value = stored.balance;
}


function getOptions(callback) {
  chrome.storage.sync.get({
    styling: 'default',
    backend: 'default',
    balance: 50
  }, function(stored) {
    callback(stored);
  });
}

function restoreOptions() {
  getOptions(setFromStored);
  for (element of document.getElementsByClassName('storedOptions')) {
    element.addEventListener('change', saveOptions);
  };
}

document.addEventListener('DOMContentLoaded', restoreOptions);
