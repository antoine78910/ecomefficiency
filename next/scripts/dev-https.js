/*
  HTTPS dev server for Next.js on https://localhost:5000

  Usage:
    1) Generate a local cert and key (PEM):
       - Put them at next/ssl/localhost-cert.pem and next/ssl/localhost-key.pem
         or set env SSL_CERT_FILE and SSL_KEY_FILE to point to your files.
    2) Run:  npm run dev:https
    3) Open: https://localhost:5000
*/

const fs = require('fs');
const path = require('path');
const https = require('https');
const next = require('next');

const dev = true;
const port = Number(process.env.PORT || 5000);
const hostname = process.env.HOST || 'localhost';

const defaultCertPath = path.join(__dirname, '..', 'ssl', 'localhost-cert.pem');
const defaultKeyPath = path.join(__dirname, '..', 'ssl', 'localhost-key.pem');
const CERT_FILE = process.env.SSL_CERT_FILE || defaultCertPath;
const KEY_FILE = process.env.SSL_KEY_FILE || defaultKeyPath;

if (!fs.existsSync(CERT_FILE) || !fs.existsSync(KEY_FILE)) {
  console.error('[dev-https] Missing certificate files. Expected:');
  console.error('  cert:', CERT_FILE);
  console.error('  key :', KEY_FILE);
  console.error('\nGenerate a local cert, for example with mkcert:');
  console.error('  mkcert -install');
  console.error('  mkcert -key ' + KEY_FILE + ' -cert ' + CERT_FILE + ' localhost');
  process.exit(1);
}

const options = {
  key: fs.readFileSync(KEY_FILE),
  cert: fs.readFileSync(CERT_FILE),
};

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  https
    .createServer(options, (req, res) => {
      handle(req, res);
    })
    .listen(port, hostname, () => {
      console.log(`[dev-https] Ready on https://${hostname}:${port}`);
    });
}).catch((err) => {
  console.error('[dev-https] Failed to start', err);
  process.exit(1);
});


