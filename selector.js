/**
 * @file This script handles the element selection logic on the page.
 */

/**
 * The currently selected HTML element.
 * @type {HTMLElement|null}
 */
let selectedElement = null;

/**
 * The floating "Copy to Figma" button.
 * @type {HTMLButtonElement|null}
 */
let floatingButton = null;

/**
 * Starts the element selector.
 * Adds event listeners for mouseover, mouseout, and click.
 * Displays a temporary indicator to show that the selector is active.
 */
function startSelector() {
  try {
    if (!document.body) return;
    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);
    document.addEventListener("click", handleClick);
    
    // Show a brief indicator that selector is active
    const indicator = document.createElement('div');
    indicator.textContent = 'Hover to select elements';
    indicator.classList.add('indicator');
    document.body.appendChild(indicator);
    
    // Remove indicator after 3 seconds
    setTimeout(() => {
      if (indicator && indicator.parentNode) {
        indicator.remove();
      }
    }, 3000);
  } catch (e) {
    // Optionally log or ignore
    // console.error("Selector failed to start:", e);
  }
}

/**
 * Stops the element selector.
 * Removes event listeners and the "selected-element" class from the selected element.
 */
function stopSelector() {
  document.removeEventListener("mouseover", handleMouseOver);
  document.removeEventListener("mouseout", handleMouseOut);
  document.removeEventListener("click", handleClick);
  if (selectedElement) {
    selectedElement.classList.remove("selected-element");
  }
}

/**
 * Handles the mouseover event.
 * Adds the "selected-element" class to the hovered element.
 * @param {MouseEvent} e The mouseover event.
 */
function handleMouseOver(e) {
  if (selectedElement) {
    selectedElement.classList.remove("selected-element");
  }
  selectedElement = e.target;
  selectedElement.classList.add("selected-element");
}

/**
 * Handles the mouseout event.
 * Removes the "selected-element" class from the previously hovered element.
 * @param {MouseEvent} e The mouseout event.
 */
function handleMouseOut(e) {
  if (selectedElement) {
    selectedElement.classList.remove("selected-element");
    selectedElement = null;
  }
}

/**
 * Shows the floating "Copy to Figma" button.
 * @param {number} x The x-coordinate of the button.
 * @param {number} y The y-coordinate of the button.
 * @param {string} html The HTML of the selected element.
 */
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
    floatingButton.disabled = true;
    floatingButton.textContent = 'Copying...';
    try {
      // Use HTTPS since backend now supports HTTPS with mkcert
      const API_ENDPOINT = "https://localhost:8080/convert-html-to-figma";
      const res = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html })
      });
      if (!res.ok) {
        const text = await res.text();
        floatingButton.textContent = 'Server error: ' + text;
        setTimeout(() => { if (floatingButton) floatingButton.remove(); floatingButton = null; }, 3000);
        return;
      }
      const figmaClipboard = await res.text();
      const blobHtml = new Blob([figmaClipboard], { type: "text/html" });
      const blobText = new Blob(["(Content copied for Figma. Paste in Figma!)"], { type: "text/plain" });
      const data = [new ClipboardItem({ "text/html": blobHtml, "text/plain": blobText })];
      try {
        await navigator.clipboard.write(data);
        floatingButton.textContent = 'Copied!';
        setTimeout(() => { if (floatingButton) floatingButton.remove(); floatingButton = null; }, 1500);
      } catch (clipErr) {
        floatingButton.textContent = 'Clipboard error: ' + (clipErr.message || clipErr);
        floatingButton.disabled = false;
        setTimeout(() => { if (floatingButton) floatingButton.textContent = 'Copy to Figma'; }, 2500);
      }
    } catch (err) {
      if (err.message && err.message.includes('Extension context invalidated')) {
        floatingButton.textContent = 'Extension was reloaded or page changed. Try again.';
      } else {
        floatingButton.textContent = 'Network error: ' + (err.message || err);
      }
      setTimeout(() => { if (floatingButton) floatingButton.remove(); floatingButton = null; }, 3000);
    }
  };
}

/**
 * Handles the click event.
 * Prevents the default action and stops propagation.
 * Shows the floating button and stops the selector.
 * @param {MouseEvent} e The click event.
 */
function handleClick(e) {
  e.preventDefault();
  e.stopPropagation();
  if (selectedElement) {
    const html = selectedElement.outerHTML;
    showFloatingButton(e.clientX, e.clientY, html);
    stopSelector();
  }
}

/**
 * Listens for messages from the extension.
 * @param {object} msg The message object.
 * @param {MessageSender} sender The sender of the message.
 * @param {function} sendResponse The function to call to send a response.
 */
chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.action === "start-selector") {
    startSelector();
  } else if (msg.action === "stop-selector") {
    stopSelector();
  }
});
