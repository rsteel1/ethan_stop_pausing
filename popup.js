document.addEventListener('DOMContentLoaded', function() {
  const durationInput = document.getElementById('duration');
  const saveButton = document.getElementById('saveSettings');
  const statusDiv = document.getElementById('status');

  // Load saved duration
  chrome.storage.sync.get(['pauseBlockDuration'], function(result) {
    if (result.pauseBlockDuration) {
      durationInput.value = result.pauseBlockDuration;
    }
  });

  // Function to format seconds into a readable time string
  function formatTime(seconds) {
    if (seconds < 60) {
      return `${seconds} seconds`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
    return `${minutes} minute${minutes > 1 ? 's' : ''} and ${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''}`;
  }

  saveButton.addEventListener('click', function() {
    const duration = parseInt(durationInput.value);
    if (duration < 0 || duration > 3600) {
      statusDiv.textContent = 'Please enter a duration between 0 and 3600 seconds';
      return;
    }

    chrome.storage.sync.set({ pauseBlockDuration: duration }, function() {
      statusDiv.textContent = `Settings saved! Pause will be blocked for ${formatTime(duration)}`;
      
      // Notify content script of the new settings
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0].url.includes('youtube.com')) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: 'updateSettings',
            duration: duration
          });
        }
      });
    });
  });
}); 