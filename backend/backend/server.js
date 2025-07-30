const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { JSDOM } = require('jsdom');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { htmlToFigmaNodes, buildFigmaClipboard } = require('./figma');

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

/**
 * Creates a self-signed SSL certificate for HTTPS.
 * @returns {{cert: Buffer, key: Buffer}|null} The certificate and key, or null if creation fails.
 */
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

/**
 * Creates an HTTPS server.
 * Falls back to an HTTP server if HTTPS fails.
 */
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

/**
 * The main endpoint for converting HTML to Figma clipboard data.
 */
app.post('/convert-html-to-figma', async (req, res) => {
  const { html } = req.body || {};
  if (!html) {
    return res.status(400).send("Missing 'html' field in body.");
  }
  try {
    const dom = new JSDOM(`<body>${html}</body>`, {
      resources: 'usable',
      runScripts: 'dangerously',
    });

    const { document } = dom.window;
    const body = document.body;

    // Wait for resources to load
    const promise = new Promise((resolve) => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        dom.window.addEventListener('load', () => {
          resolve();
        });
      }
    });
    await promise;

    const nodes = htmlToFigmaNodes(body.firstChild);
    const clipboard = buildFigmaClipboard(nodes);
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(clipboard);
  } catch (e) {
    console.error('Conversion failed:', e);
    res.status(500).send(`Failed to convert HTML to Figma clipboard format: ${e.message}`);
  }
});

app.get('/', (req, res) => {
  res.send('HTML to Figma Clipboard Backend is running (native layers).');
});

if (require.main === module) {
  createHttpsServer();
}

module.exports = app;