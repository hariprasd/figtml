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
function htmlToFigmaNodes(node, parentId = null, offset = { x: 0, y: 0 }) {
  let nodes = [];
  let id = (nodeId++).toString();

  if (node.nodeType === 1) { // Element node
    const computedStyle = node.ownerDocument.defaultView.getComputedStyle(node);
    const tagName = node.tagName.toLowerCase();
    let figmaNode = {
      id,
      parent: parentId,
      name: tagName,
      x: offset.x,
      y: offset.y,
    };

    let childrenOffset = { x: offset.x, y: offset.y };

    switch (tagName) {
      case 'div':
      case 'p':
      case 'h1':
      case 'h2':
      case 'h3':
      case 'ul':
      case 'ol':
      case 'li':
        figmaNode.type = "FRAME";
        figmaNode.layoutMode = "VERTICAL";
        figmaNode.itemSpacing = 8;
        figmaNode.paddingTop = 8;
        figmaNode.paddingRight = 8;
        figmaNode.paddingBottom = 8;
        figmaNode.paddingLeft = 8;
        figmaNode.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 0.0001 }]; // Make it visible for selection
        break;
      case 'span':
      case 'a':
        figmaNode.type = "TEXT";
        figmaNode.characters = node.textContent.trim();
        figmaNode.fontSize = parseFloat(computedStyle.fontSize);
        const color = computedStyle.color.match(/(\d+(\.\d+)?)/g).map(Number);
        figmaNode.fills = [{ type: 'SOLID', color: { r: color[0] / 255, g: color[1] / 255, b: color[2] / 255 }, opacity: color.length > 3 ? color[3] : 1 }];
        break;
      case 'img':
        figmaNode.type = "RECTANGLE";
        // In a real scenario, you'd fetch the image and get its dimensions and fill
        figmaNode.width = node.width || 100;
        figmaNode.height = node.height || 100;
        figmaNode.fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }];
        break;
      case 'svg':
        figmaNode.type = "VECTOR";
        // SVG conversion is complex, this is a placeholder
        figmaNode.width = node.width.baseVal.value || 100;
        figmaNode.height = node.height.baseVal.value || 100;
        figmaNode.fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }];
        break;
      default:
        // For other tags, we just create a container and recurse
        figmaNode.type = "FRAME";
        break;
    }

    nodes.push(figmaNode);

    // Recurse for children
    Array.from(node.childNodes).forEach((child, idx) => {
      nodes = nodes.concat(
        htmlToFigmaNodes(child, id, { x: childrenOffset.x, y: childrenOffset.y })
      );
      if (figmaNode.type === "FRAME" && figmaNode.layoutMode === "VERTICAL" && nodes[nodes.length - 1]) {
        childrenOffset.y += (nodes[nodes.length - 1].height || 20) + figmaNode.itemSpacing;
      } else if (figmaNode.type === "FRAME" && nodes[nodes.length - 1]) {
        childrenOffset.x += (nodes[nodes.length - 1].width || 20) + figmaNode.itemSpacing;
      }
    });

  } else if (node.nodeType === 3) { // Text node
    let textContent = node.nodeValue.trim();
    if (textContent) {
      const parentStyle = node.parentElement ? node.parentElement.ownerDocument.defaultView.getComputedStyle(node.parentElement) : {};
      const fontSize = parseFloat(parentStyle.fontSize) || 16;
      const colorMatch = parentStyle.color ? parentStyle.color.match(/(\d+(\.\d+)?)/g) : null;
      const color = colorMatch ? colorMatch.map(Number) : [0, 0, 0];


      nodes.push({
        id,
        type: "TEXT",
        name: "Text",
        parent: parentId,
        x: offset.x,
        y: offset.y,
        characters: textContent,
        fontSize: fontSize,
        fills: [{ type: "SOLID", color: { r: color[0] / 255, g: color[1] / 255, b: color[2] / 255 }, opacity: color.length > 3 ? color[3] : 1 }]
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