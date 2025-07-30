/**
 * @file This script handles communication with the backend server and writing to the clipboard.
 */

/**
 * The API endpoint for the backend server.
 * @type {string}
 */
const API_ENDPOINT = "https://localhost:8080/convert-html-to-figma";

/**
 * Sends the HTML of the selected element to the backend server.
 * @param {string} html The HTML of the selected element.
 * @returns {Promise<string>} A promise that resolves with the Figma-formatted HTML.
 */
async function sendHtmlToServer(html) {
  try {
    const res = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ html })
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Server error: ${text}`);
    }
    return await res.text();
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error("Network error. Is the backend server running?");
    }
    throw err;
  }
}

/**
 * Writes the Figma-formatted HTML to the clipboard.
 * @param {string} figmaHtml The Figma-formatted HTML.
 */
function writeClipboard(figmaHtml) {
  const blobHtml = new Blob([figmaHtml], { type: "text/html" });
  const blobText = new Blob(["(Content copied for Figma. Paste in Figma!)"], { type: "text/plain" });
  const data = [new ClipboardItem({ "text/html": blobHtml, "text/plain": blobText })];
  navigator.clipboard.write(data).catch(e => {
    alert(`Clipboard write failed: ${e.message}`);
  });
}

/**
 * Listens for messages from the extension.
 * @param {object} msg The message object.
 * @param {MessageSender} sender The sender of the message.
 * @param {function} sendResponse The function to call to send a response.
 */
chrome.runtime.onMessage.addListener(async function(msg, sender, sendResponse) {
  if (msg.action === "copy-html-for-figma") {
    try {
      const figmaClipboard = await sendHtmlToServer(msg.html);
      writeClipboard(figmaClipboard);
    } catch (e) {
      alert(`Failed to copy for Figma: ${e.message}`);
    }
  }
});