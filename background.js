chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "copyToFigmaClipboard",
    title: "Copy for Figma (native layers)",
    contexts: ["selection", "page"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  chrome.tabs.sendMessage(tab.id, { action: "copy-html-for-figma" });
});

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: "copy-html-for-figma" });
});