let selectedElement = null;
let floatingButton = null;

function startSelector() {
  try {
    if (!document.body) return;
    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseout", handleMouseOut);
    document.addEventListener("click", handleClick);
    
    // Show a brief indicator that selector is active
    const indicator = document.createElement('div');
    indicator.textContent = 'Hover to select elements';
    indicator.style.position = 'fixed';
    indicator.style.top = '20px';
    indicator.style.right = '20px';
    indicator.style.background = '#007bff';
    indicator.style.color = '#fff';
    indicator.style.padding = '8px 16px';
    indicator.style.borderRadius = '4px';
    indicator.style.zIndex = 999998;
    indicator.style.fontSize = '14px';
    indicator.style.fontFamily = 'inherit';
    indicator.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
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
  floatingButton.style.position = 'fixed';
  floatingButton.style.left = x + 'px';
  floatingButton.style.top = y + 'px';
  floatingButton.style.zIndex = 999999;
  floatingButton.style.padding = '8px 16px';
  floatingButton.style.background = '#007bff';
  floatingButton.style.color = '#fff';
  floatingButton.style.border = 'none';
  floatingButton.style.borderRadius = '4px';
  floatingButton.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
  floatingButton.style.cursor = 'pointer';
  floatingButton.style.fontSize = '14px';
  floatingButton.style.fontFamily = 'inherit';
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
  }
});
