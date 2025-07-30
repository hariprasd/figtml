const https = require('https');
const fs = require('fs');
const path = require('path');
const { fork } = require('child_process');

const serverPath = path.join(__dirname, 'backend', 'backend', 'server.js');

const sampleHtml = `
  <div style="background-color: red; border-radius: 10px; padding: 20px;">
    <h1 style="color: white;">Hello, Figma!</h1>
    <p style="color: white;">This is a test.</p>
  </div>
`;

function runTest() {
  const server = fork(serverPath, [], {
    silent: true,
    cwd: path.join(__dirname, 'backend', 'backend')
  });

  server.stdout.on('data', (data) => {
    console.log(`Server stdout: ${data}`);
    if (data.toString().includes('HTTPS Backend server running')) {
      sendRequest();
    }
  });

  server.stderr.on('data', (data) => {
    console.error(`Server stderr: ${data}`);
  });

  server.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
  });

  function sendRequest() {
    const postData = JSON.stringify({ html: sampleHtml });

    const options = {
      hostname: 'localhost',
      port: 8080,
      path: '/convert-html-to-figma',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
      rejectUnauthorized: false, // Allow self-signed certificate
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        console.log('Response from server:', responseData);
        if (responseData.includes('data-metadata')) {
          console.log('✅ Test Passed: Received valid Figma clipboard data.');
        } else {
          console.error('❌ Test Failed: Did not receive valid Figma clipboard data.');
        }
        server.kill();
      });
    });

    req.on('error', (e) => {
      console.error(`Problem with request: ${e.message}`);
      server.kill();
    });

    req.write(postData);
    req.end();
  }
}

runTest();
