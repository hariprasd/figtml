let selectedElement = null;

function startSelector() {
  document.addEventListener("mouseover", handleMouseOver);
  document.addEventListener("mouseout", handleMouseOut);
  document.addEventListener("click", handleClick);
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

function handleClick(e) {
  e.preventDefault();
  e.stopPropagation();
  if (selectedElement) {
    const html = selectedElement.outerHTML;
    chrome.runtime.sendMessage({ action: "set-selected-html", html: html });
    stopSelector();
  }
}

const port = chrome.runtime.connect({ name: "selector-script" });

port.onMessage.addListener(function (msg) {
  if (msg.action === "start-selector") {
    startSelector();
  } else if (msg.action === "stop-selector") {
    stopSelector();
  }
});
