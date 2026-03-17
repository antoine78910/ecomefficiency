const express = require('express');
const app = express();

// CORS pour permettre l'accès depuis l'extension
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.get('/health', (req, res) => {
  res.json({ ok: true, port: 3005, message: 'Test server running' });
});

app.get('/otp', (req, res) => {
  // Code de test
  res.json({ code: '123456' });
});

app.listen(3005, () => {
  console.log('Test server running on http://localhost:3005');
});
