let pauseBlocked = false;
let blockEndTime = null;
let firstPauseAllowed = true;
let isPaused = false;
let pageLoaded = false;
let firstPauseOccurred = false;

// Function to check if we should block pause
function checkPauseBlock() {
  if (pauseBlocked && blockEndTime) {
    if (Date.now() >= blockEndTime) {
      pauseBlocked = false;
      console.log('Pause block expired');
    }
  }
}

// Function to disable pause button
function disablePauseButton() {
  const pauseButton = document.querySelector('.ytp-play-button');
  if (pauseButton) {
    pauseButton.style.opacity = '0.5';
    pauseButton.style.cursor = 'not-allowed';
    pauseButton.title = 'Pause is temporarily disabled';
  }
}

// Function to enable pause button
function enablePauseButton() {
  const pauseButton = document.querySelector('.ytp-play-button');
  if (pauseButton) {
    pauseButton.style.opacity = '1';
    pauseButton.style.cursor = 'pointer';
    pauseButton.title = 'Pause (k)';
  }
}

// Function to setup pause blocking
function setupPauseBlocking() {
  chrome.storage.sync.get(['pauseBlockDuration'], function(result) {
    if (result.pauseBlockDuration) {
      pauseBlocked = true;
      blockEndTime = Date.now() + (result.pauseBlockDuration * 1000);
      console.log('Pause blocked for', result.pauseBlockDuration, 'seconds');
      disablePauseButton();
    }
  });
}

// Function to handle pause button clicks
function handlePauseButtonClick(e) {
  if (!pauseBlocked) return;
  
  // If video is paused, always allow play
  if (isPaused) return;
  
  // If it's the first pause attempt, allow it
  if (firstPauseAllowed) {
    firstPauseAllowed = false;
    console.log('First pause allowed via button click');
    return;
  }
  
  // Block all other pause attempts
  e.preventDefault();
  e.stopPropagation();
  console.log('Pause blocked via button click');
}

// Function to handle video clicks
function handleVideoClick(e) {
  if (!pauseBlocked) return;
  
  // If video is paused, always allow play
  if (isPaused) return;
  
  // If it's the first pause attempt, allow it
  if (firstPauseAllowed) {
    firstPauseAllowed = false;
    console.log('First pause allowed via video click');
    return;
  }
  
  // Block all other pause attempts
  e.preventDefault();
  e.stopPropagation();
  console.log('Pause blocked via video click');
}

// Function to handle spacebar and k key
function handleKeyboardShortcuts(e) {
  // Only handle keyboard shortcuts if they're not in an input or textarea
  if (e.target.matches('input, textarea')) return;

  // Check if it's a pause-related key (Space or K)
  if (e.code === 'Space' || e.code === 'KeyK') {
    if (!pauseBlocked) return;
    
    // If video is paused, always allow play
    if (isPaused) return;
    
    // If it's the first pause attempt, allow it
    if (firstPauseAllowed) {
      firstPauseAllowed = false;
      console.log('First pause allowed via keyboard shortcut');
      return;
    }
    
    // Block all other pause attempts
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    console.log('Pause blocked via keyboard shortcut');
    return false;
  }
}

// Function to setup event listeners
function setupEventListeners() {
  // Remove existing event listeners
  document.removeEventListener('click', handlePauseButtonClick, true);
  document.removeEventListener('click', handleVideoClick, true);
  document.removeEventListener('keydown', handleKeyboardShortcuts, true);
  document.removeEventListener('keyup', handleKeyboardShortcuts, true);
  document.removeEventListener('keypress', handleKeyboardShortcuts, true);
  
  // Add event listeners
  document.addEventListener('click', function(e) {
    // Check if click is on the pause button
    if (e.target.closest('.ytp-play-button')) {
      handlePauseButtonClick(e);
    }
    
    // Check if click is on the video
    if (e.target.tagName === 'VIDEO') {
      handleVideoClick(e);
    }
  }, true);
  
  // Add keyboard event listeners with capture phase
  document.addEventListener('keydown', handleKeyboardShortcuts, true);
  document.addEventListener('keyup', handleKeyboardShortcuts, true);
  document.addEventListener('keypress', handleKeyboardShortcuts, true);
}

// Function to setup video state listeners
function setupVideoStateListeners() {
  const video = document.querySelector('video');
  if (!video) return;
  
  // Remove existing event listeners
  video.removeEventListener('play', handleVideoPlay);
  video.removeEventListener('pause', handleVideoPause);
  
  // Add event listeners
  video.addEventListener('play', handleVideoPlay);
  video.addEventListener('pause', handleVideoPause);
  
  // Initialize state if video is already playing
  if (!video.paused) {
    console.log('Video already playing on initialization');
    isPaused = false;
    
    // If this is the first time the page is loaded, mark it as loaded
    if (!pageLoaded) {
      pageLoaded = true;
      firstPauseAllowed = true;
      firstPauseOccurred = false;
      console.log('Page loaded, first pause allowed');
    }
  } else {
    console.log('Video paused on initialization');
    isPaused = true;
  }
}

// Function to handle video play
function handleVideoPlay() {
  console.log('Video played');
  isPaused = false;
  
  // If this is the first time the page is loaded, allow the first pause
  if (!pageLoaded) {
    pageLoaded = true;
    firstPauseAllowed = true;
    firstPauseOccurred = false;
    console.log('Page loaded, first pause allowed');
    return;
  }
  
  // After the first pause has occurred, block pausing for the specified duration
  if (firstPauseOccurred) {
    setupPauseBlocking();
  }
}

// Function to handle video pause
function handleVideoPause() {
  console.log('Video paused');
  isPaused = true;
  
  // After the first pause, set up pause blocking for the next play
  if (firstPauseAllowed) {
    firstPauseAllowed = false;
    firstPauseOccurred = true;
    console.log('First pause completed, will block pausing on next play');
  }
}

// Function to setup mutation observer to detect video element
function setupMutationObserver() {
  const observer = new MutationObserver(function(mutations) {
    let shouldSetup = false;
    
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes.length) {
        shouldSetup = true;
      }
    });
    
    if (shouldSetup) {
      setupVideoStateListeners();
      setupEventListeners();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Check periodically if we should unblock pause
setInterval(function() {
  checkPauseBlock();
  if (!pauseBlocked) {
    enablePauseButton();
  }
}, 1000);

// Listen for messages from popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'updateSettings') {
    if (pauseBlocked) {
      blockEndTime = Date.now() + (request.duration * 1000);
      console.log('Settings updated, pause blocked for', request.duration, 'seconds');
    }
  }
});

// Initialize the extension
function initializeExtension() {
  console.log('Initializing extension');
  pageLoaded = false;
  firstPauseAllowed = true;
  firstPauseOccurred = false;
  pauseBlocked = false;
  blockEndTime = null;
  
  // Setup initial event listeners
  setupVideoStateListeners();
  setupEventListeners();
  setupMutationObserver();
}

// Run initialization when the content script loads
initializeExtension(); 