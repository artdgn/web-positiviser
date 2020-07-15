function saveOptions() {
  options = {
    styling: document.getElementById('selectedStyling').value,
    backend: document.getElementById('selectedBackend').value,
    threshold: document.getElementById('selectedThreshold').value,
    ranking: document.getElementById('selectedRankingCheck').checked
  };
  chrome.storage.sync.set(options, function() {
    console.log(options);
  });
}

function setFromStored(stored) {
    document.getElementById('selectedStyling').value = stored.styling;
    document.getElementById('selectedBackend').value = stored.backend;
    document.getElementById('selectedThreshold').value = stored.threshold;
    document.getElementById('selectedRankingCheck').checked = stored.ranking;
}


function getOptions(callback) {
  chrome.storage.sync.get({
    styling: 'default',
    backend: 'default',
    threshold: 50,
    ranking: false
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
