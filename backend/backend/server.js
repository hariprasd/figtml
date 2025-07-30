const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { JSDOM } = require('jsdom');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Configure CORS to allow all origins and methods
app.use(cors({
  origin: true, // Allow all origins
  credentials: true, // Allow credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200 // Some legacy browsers choke on 204
}));

app.use(bodyParser.json({ limit: '2mb' }));

// Add preflight handler for OPTIONS requests
app.options('*', cors());

let nodeId = 1;

// Create simple self-signed certificate
function createSelfSignedCert() {
  const certPath = path.join(__dirname, 'cert.pem');
  const keyPath = path.join(__dirname, 'key.pem');
  
  // Check if certificates already exist
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    return {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath)
    };
  }
  
  // Create simple self-signed certificate using openssl
  const { execSync } = require('child_process');
  try {
    console.log('Creating self-signed certificate...');
    execSync(`openssl req -x509 -newkey rsa:4096 -keyout ${keyPath} -out ${certPath} -days 365 -nodes -subj "/C=US/ST=CA/L=SF/O=HTML to Figma/CN=localhost"`, { stdio: 'pipe' });
    
    return {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath)
    };
  } catch (error) {
    console.error('Failed to create certificate with openssl:', error.message);
    return null;
  }
}

// Create HTTPS server
function createHttpsServer() {
  try {
    console.log('Setting up HTTPS server...');
    
    const certData = createSelfSignedCert();
    if (!certData) {
      throw new Error('Could not create certificates');
    }

    const httpsServer = https.createServer({
      key: certData.key,
      cert: certData.cert
    }, app);

    httpsServer.listen(PORT, () => {
      console.log(`✅ HTTPS Backend server running on port ${PORT}`);
      console.log(`🌐 Visit: https://localhost:${PORT}`);
      console.log(`🔒 Works on all sites (HTTP & HTTPS)`);
      console.log(`⚠️  Note: You may see a security warning - click "Advanced" → "Proceed to localhost"`);
    });
  } catch (error) {
    console.error('❌ Failed to create HTTPS server:', error.message);
    console.log('🔄 Falling back to HTTP server...');
    
    // Fallback to HTTP server
    app.listen(PORT, () => {
      console.log(`⚠️  HTTP Backend server running on port ${PORT}`);
      console.log(`🌐 Visit: http://localhost:${PORT}`);
      console.log(`⚠️  Note: May not work on HTTPS sites due to mixed content`);
    });
  }
}

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
        const colorMatch = computedStyle.color ? computedStyle.color.match(/(\d+(\.\d+)?)/g) : null;
        const color = colorMatch ? colorMatch.map(Number) : [0, 0, 0];
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

// Start HTTPS server
createHttpsServer();