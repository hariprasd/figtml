const request = require('supertest');
const app = require('./server'); // Assuming server.js exports the app

const sampleHtml = `
  <div style="background-color: red; border-radius: 10px; padding: 20px;">
    <h1 style="color: white;">Hello, Figma!</h1>
    <p style="color: white;">This is a test.</p>
  </div>
`;

describe('POST /convert-html-to-figma', () => {
  it('should return valid Figma clipboard data', async () => {
    const res = await request(app)
      .post('/convert-html-to-figma')
      .send({ html: sampleHtml })
      .expect(200)
      .expect('Content-Type', /html/);

    expect(res.text).toContain('data-metadata');
  });
});
