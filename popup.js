document.getElementById("copy-btn").addEventListener("click", async () => {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {action: "copy-html-for-figma"});
    document.getElementById("status").innerText = "Copied! Paste in Figma.";
    setTimeout(() => {
      document.getElementById("status").innerText = "";
    }, 2000);
  });
});