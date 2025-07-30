async function getSelectedHtml() {
  let selection = window.getSelection();
  if (selection.rangeCount) {
    let container = document.createElement("div");
    for (let i = 0; i < selection.rangeCount; ++i) {
      container.appendChild(selection.getRangeAt(i).cloneContents());
    }
    return container.innerHTML;
  }
  return document.body.innerHTML;
}

async function sendHtmlToServer(html) {
  const API_ENDPOINT = "http://localhost:8080/convert-html-to-figma";
  const res = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ html })
  });
  if (!res.ok) throw new Error("Failed to fetch from server");
  return await res.text();
}

function writeClipboard(figmaHtml) {
  const blobHtml = new Blob([figmaHtml], { type: "text/html" });
  const blobText = new Blob(["(Content copied for Figma. Paste in Figma!)"], { type: "text/plain" });
  const data = [new ClipboardItem({ "text/html": blobHtml, "text/plain": blobText })];
  navigator.clipboard.write(data).catch(e => {
    alert("Clipboard write failed: " + e.message);
  });
}

chrome.runtime.onMessage.addListener(async function(msg, sender, sendResponse) {
  if (msg.action === "copy-html-for-figma") {
    try {
      const html = await getSelectedHtml();
      const figmaClipboard = await sendHtmlToServer(html);
      writeClipboard(figmaClipboard);
    } catch (e) {
      alert("Failed to copy for Figma: " + e.message);
    }
  }
});