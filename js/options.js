function saveOptions() {
  var selectedFilter = document.getElementById('selectedFilter').value;

  chrome.storage.sync.set({
    filter: selectedFilter
  }, function() {
    var status = document.getElementById('saveMessage');
    status.textContent = 'Filter selected - ' + selectedFilter;
    setTimeout(function() {
      status.textContent = '';
    }, 750);
  });
}

function getOptions(callback) {
  chrome.storage.sync.get({
    filter: 'default',
  }, function(items) {
    document.getElementById('selectedFilter').value = items.filter;
    callback(items.filter);
    return items.filter;
  });
}

function restoreOptions() {
  getOptions(function(filter) {
    document.getElementById('selectedFilter').value = filter;
  });
  document.getElementById('selectedFilter').addEventListener('change', saveOptions);
}

document.addEventListener('DOMContentLoaded', restoreOptions);
