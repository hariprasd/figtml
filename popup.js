document.getElementById("copy-btn").addEventListener("click", async () => {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "copy-html-for-figma" }, function(response) {
        if (chrome.runtime.lastError) {
          document.getElementById("status").innerText = "Error: Could not connect to the page. Please reload the page and try again.";
        } else {
          document.getElementById("status").innerText = "Copied! Paste in Figma.";
          setTimeout(() => {
            document.getElementById("status").innerText = "";
          }, 2000);
        }
      });
    } else {
      document.getElementById("status").innerText = "Error: No active tab found.";
    }
  });
});