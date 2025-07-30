const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { JSDOM } = require('jsdom');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(bodyParser.json({ limit: '2mb' }));

let nodeId = 1;

// Map HTML nodes to Figma scenegraph nodes
function htmlToFigmaNodes(node, parentId = null, offset = {x:0, y:0}) {
  let nodes = [];
  let id = (nodeId++).toString();

  // For demonstration: map <div> to rectangles, <span> and text to text
  if (node.nodeType === 1) {
    if (node.tagName === 'DIV') {
      // Rectangle node
      let rectNode = {
        id,
        type: "RECTANGLE",
        name: "Div",
        parent: parentId,
        x: offset.x,
        y: offset.y,
        width: 120,
        height: 40,
        fills: [{ type: "SOLID", color: { r: 0.9, g: 0.9, b: 0.9 }, opacity: 1 }]
      };
      nodes.push(rectNode);

      // Recurse for children
      Array.from(node.childNodes).forEach((child, idx) => {
        nodes = nodes.concat(
          htmlToFigmaNodes(child, id, {x: offset.x + 10, y: offset.y + 10 + idx*50})
        );
      });
    } else if (node.tagName === 'SPAN') {
      // Text node for span text
      let textContent = node.textContent.trim();
      if (textContent) {
        nodes.push({
          id,
          type: "TEXT",
          name: "SpanText",
          parent: parentId,
          x: offset.x,
          y: offset.y,
          characters: textContent,
          fontSize: 16,
          fills: [{ type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: 1 }]
        });
      }
    } else {
      // Other elements: recurse
      Array.from(node.childNodes).forEach((child, idx) => {
        nodes = nodes.concat(
          htmlToFigmaNodes(child, parentId, {x: offset.x, y: offset.y + idx*50})
        );
      });
    }
  } else if (node.nodeType === 3) {
    // Text node
    let textContent = node.nodeValue.trim();
    if (textContent) {
      nodes.push({
        id,
        type: "TEXT",
        name: "Text",
        parent: parentId,
        x: offset.x,
        y: offset.y,
        characters: textContent,
        fontSize: 16,
        fills: [{ type: "SOLID", color: { r: 0, g: 0, b: 0 }, opacity: 1 }]
      });
    }
  }
  return nodes;
}

function buildFigmaClipboard(nodes) {
  const metadata = {
    version: "0.1.0",
    nodes
  };
  // Figma expects base64 encoding of JSON metadata
  const encoded = Buffer.from(JSON.stringify(metadata)).toString('base64');
  return `
<meta charset='utf-8'>
<span data-metadata="${encoded}"></span>
  `.trim();
}

app.post('/convert-html-to-figma', async (req, res) => {
  const { html } = req.body || {};
  if (!html) {
    return res.status(400).send("Missing 'html' field in body.");
  }
  try {
    nodeId = 1; // Reset for each request
    const dom = new JSDOM(`<body>${html}</body>`);
    const body = dom.window.document.body;
    const nodes = htmlToFigmaNodes(body);
    const clipboard = buildFigmaClipboard(nodes);
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(clipboard);
  } catch (e) {
    res.status(500).send(`Failed to convert HTML to Figma clipboard format: ${e.message}`);
  }
});

app.get('/', (req, res) => {
  res.send('HTML to Figma Clipboard Backend is running (native layers).');
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});