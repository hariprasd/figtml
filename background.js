let port = null;

chrome.runtime.onConnect.addListener(function(p) {
  port = p;
  port.onDisconnect.addListener(() => {
    port = null;
  });
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "copyToFigmaClipboard",
    title: "Copy for Figma (native layers)",
    contexts: ["selection", "page"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (port) {
    port.postMessage({ action: "copy-html-for-figma" });
  }
});

chrome.action.onClicked.addListener((tab) => {
  if (port) {
    port.postMessage({ action: "copy-html-for-figma" });
  }
});