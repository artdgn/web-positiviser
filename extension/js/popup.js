function saveOptions() {
  var selectedStyling = document.getElementById('selectedStyling').value;
  var selectedBackend = document.getElementById('selectedBackend').value;

  chrome.storage.sync.set({
    styling: selectedStyling,
    backend: selectedBackend
  }, function() {
    console.log('Styling:' + selectedStyling);
    console.log('Backend:' + selectedBackend);
  });
}

function getOptions(callback) {
  chrome.storage.sync.get({
    styling: 'default',
    backend: 'default'
  }, function(stored) {
    document.getElementById('selectedStyling').value = stored.styling;
    document.getElementById('selectedBackend').value = stored.backend;
    callback(stored);
  });
}

function restoreOptions() {
  getOptions(function(stored) {
    document.getElementById('selectedStyling').value = stored.styling;
    document.getElementById('selectedBackend').value = stored.backend;
  });
  document.getElementById('selectedStyling').addEventListener('change', saveOptions);
  document.getElementById('selectedBackend').addEventListener('change', saveOptions);
}

document.addEventListener('DOMContentLoaded', restoreOptions);
