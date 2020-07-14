function saveOptions() {
  var selectedStyling = document.getElementById('selectedStyling').value;

  chrome.storage.sync.set({
    styling: selectedStyling
  }, function() {
    console.log('Styling selected - ' + selectedStyling)
  });
}

function getOptions(callback) {
  chrome.storage.sync.get({
    styling: 'default',
  }, function(stored) {
    document.getElementById('selectedStyling').value = stored.styling;
    callback(stored.styling);
    return stored.styling;
  });
}

function restoreOptions() {
  getOptions(function(styling) {
    document.getElementById('selectedStyling').value = styling;
  });
  document.getElementById('selectedStyling').addEventListener('change', saveOptions);
}

document.addEventListener('DOMContentLoaded', restoreOptions);
