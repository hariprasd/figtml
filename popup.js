// Remove all the popup UI logic and immediately start selector
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, { action: "start-selector" });
  // Close the popup immediately after sending the message
  window.close();
});