const selectBtn = document.getElementById("select-btn");
const copyBtn = document.getElementById("copy-btn");
const cancelBtn = document.getElementById("cancel-btn");
const statusDiv = document.getElementById("status");

let selectedHtml = null;

selectBtn.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "start-selector" });
    statusDiv.innerText = "Select an element on the page.";
    selectBtn.style.display = "none";
    cancelBtn.style.display = "block";
  });
});

cancelBtn.addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "stop-selector" });
    statusDiv.innerText = "";
    selectBtn.style.display = "block";
    cancelBtn.style.display = "none";
  });
});

copyBtn.addEventListener("click", async () => {
  if (selectedHtml) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "copy-html-for-figma", html: selectedHtml }, function(response) {
          if (chrome.runtime.lastError) {
            statusDiv.innerText = "Error: Could not connect to the page. Please reload the page and try again.";
          } else {
            statusDiv.innerText = "Copied! Paste in Figma.";
            setTimeout(() => {
              statusDiv.innerText = "";
            }, 2000);
          }
        });
      } else {
        statusDiv.innerText = "Error: No active tab found.";
      }
    });
  }
});

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.action === "set-selected-html") {
    selectedHtml = msg.html;
    copyBtn.disabled = false;
    statusDiv.innerText = "Element selected. Ready to copy.";
    selectBtn.style.display = "block";
    cancelBtn.style.display = "none";
  }
});