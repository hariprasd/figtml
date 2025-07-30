/**
 * @file This script handles the element selection logic on the page.
 */

const API_ENDPOINT = "https://localhost:8080/convert-html-to-figma";

let selectedElement = null;
let floatingButton = null;

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
 * The main function to copy the selected element's HTML to the clipboard as Figma data.
 * @param {string} html The HTML of the selected element.
 */
async function copyHtmlToFigma(html) {
  if (floatingButton) {
    floatingButton.disabled = true;
    floatingButton.textContent = 'Copying...';
  }

  try {
    const figmaClipboard = await sendHtmlToServer(html);
    writeClipboard(figmaClipboard);
    if (floatingButton) {
      floatingButton.textContent = 'Copied!';
      setTimeout(() => { if (floatingButton) floatingButton.remove(); floatingButton = null; }, 1500);
    }
  } catch (err) {
    if (floatingButton) {
      if (err.message && err.message.includes('Extension context invalidated')) {
        floatingButton.textContent = 'Extension was reloaded or page changed. Try again.';
      } else {
        floatingButton.textContent = 'Network error: ' + (err.message || err);
      }
      setTimeout(() => { if (floatingButton) floatingButton.remove(); floatingButton = null; }, 3000);
    } else {
      alert(`Failed to copy for Figma: ${err.message}`);
    }
  }
}

function startSelector() {
  try {
    if (!document.body) return;
    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);
    document.addEventListener("click", handleClick);

    const indicator = document.createElement('div');
    indicator.textContent = 'Hover to select elements';
    indicator.classList.add('indicator');
    document.body.appendChild(indicator);

    setTimeout(() => {
      if (indicator && indicator.parentNode) {
        indicator.remove();
      }
    }, 3000);
  } catch (e) {
    // console.error("Selector failed to start:", e);
  }
}

function stopSelector() {
  document.removeEventListener("mouseover", handleMouseOver);
  document.removeEventListener("mouseout", handleMouseOut);
  document.removeEventListener("click", handleClick);
  if (selectedElement) {
    selectedElement.classList.remove("selected-element");
  }
}

function handleMouseOver(e) {
  if (selectedElement) {
    selectedElement.classList.remove("selected-element");
  }
  selectedElement = e.target;
  selectedElement.classList.add("selected-element");
}

function handleMouseOut(e) {
  if (selectedElement) {
    selectedElement.classList.remove("selected-element");
    selectedElement = null;
  }
}

function showFloatingButton(x, y, html) {
  if (floatingButton) floatingButton.remove();
  floatingButton = document.createElement('button');
  floatingButton.textContent = 'Copy to Figma';
  floatingButton.classList.add('floating-button');
  floatingButton.style.left = x + 'px';
  floatingButton.style.top = y + 'px';
  document.body.appendChild(floatingButton);

  floatingButton.onclick = async function(e) {
    e.stopPropagation();
    copyHtmlToFigma(html);
  };
}

function handleClick(e) {
  e.preventDefault();
  e.stopPropagation();
  if (selectedElement) {
    const html = selectedElement.outerHTML;
    showFloatingButton(e.clientX, e.clientY, html);
    stopSelector();
  }
}

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.action === "start-selector") {
    startSelector();
  } else if (msg.action === "stop-selector") {
    stopSelector();
  } else if (msg.action === "copy-html-for-figma") {
    if (selectedElement) {
      copyHtmlToFigma(selectedElement.outerHTML);
    } else {
      // If no element is selected via the hover selector,
      // we can try to get the selected element from the context menu click.
      // This is a bit tricky because the context menu doesn't directly give us the element.
      // We'll rely on the fact that the selector is active and `selectedElement` is set.
      // If not, we can't do much.
    }
  }
});
