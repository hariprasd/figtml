
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

const port = chrome.runtime.connect({ name: "content-script" });

port.onMessage.addListener(async function(msg) {
  if (msg.action === "copy-html-for-figma") {
    try {
      const figmaClipboard = await sendHtmlToServer(msg.html);
      writeClipboard(figmaClipboard);
    } catch (e) {
      alert("Failed to copy for Figma: " + e.message);
    }
  }
});