/**
 * Standalone 2FA/TOTP Server
 * This server can generate TOTP codes from secrets
 * Can be deployed independently on any server
 * 
 * Usage:
 * 1. Install dependencies: npm install express speakeasy cors
 * 2. Run: node 2fa_server.js
 * 3. Access via: http://localhost:3000
 */

const express = require('express');
const speakeasy = require('speakeasy');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow cross-origin requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static HTML page for testing
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>2FA TOTP Generator</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 50px auto;
          padding: 20px;
          background: #f5f5f5;
        }
        .container {
          background: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
          color: #333;
          text-align: center;
        }
        .form-group {
          margin-bottom: 20px;
        }
        label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
          color: #555;
        }
        textarea, input {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 5px;
          font-size: 14px;
          box-sizing: border-box;
        }
        textarea {
          min-height: 100px;
          font-family: monospace;
        }
        button {
          width: 100%;
          padding: 12px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 5px;
          font-size: 16px;
          cursor: pointer;
          transition: background 0.3s;
        }
        button:hover {
          background: #0056b3;
        }
        .result {
          margin-top: 20px;
          padding: 15px;
          background: #e8f5e9;
          border-left: 4px solid #4caf50;
          border-radius: 5px;
          display: none;
        }
        .result.show {
          display: block;
        }
        .code {
          font-size: 24px;
          font-weight: bold;
          color: #2e7d32;
          font-family: monospace;
          text-align: center;
          margin: 10px 0;
        }
        .error {
          background: #ffebee;
          border-left-color: #f44336;
        }
        .info {
          margin-top: 30px;
          padding: 15px;
          background: #e3f2fd;
          border-left: 4px solid #2196f3;
          border-radius: 5px;
          font-size: 14px;
        }
        .api-example {
          background: #f5f5f5;
          padding: 10px;
          border-radius: 5px;
          font-family: monospace;
          margin: 10px 0;
          overflow-x: auto;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🔐 2FA TOTP Generator</h1>
        
        <div class="form-group">
          <label for="secret">TOTP Secret:</label>
          <textarea id="secret" placeholder="Enter your TOTP secret (e.g., t2v4 3lj5 ysb2 kh2y vidm gip2 4nty 3mu4)"></textarea>
        </div>
        
        <button onclick="generateCode()">Generate Code</button>
        
        <div id="result" class="result">
          <div class="code" id="code"></div>
          <p style="text-align: center; color: #666;">Time remaining: <span id="timer"></span>s</p>
        </div>
        
        <div class="info">
          <h3>API Usage:</h3>
          <p><strong>POST /generate</strong></p>
          <div class="api-example">
{
  "secret": "t2v4 3lj5 ysb2 kh2y vidm gip2 4nty 3mu4"
}
          </div>
          <p><strong>Response:</strong></p>
          <div class="api-example">
{
  "success": true,
  "code": "123456",
  "timeRemaining": 25
}
          </div>
          
          <p><strong>GET /generate?secret=YOUR_SECRET</strong></p>
          <p>Returns the same JSON response</p>
        </div>
      </div>
      
      <script>
        let updateInterval = null;
        
        async function generateCode() {
          const secret = document.getElementById('secret').value.trim();
          const resultDiv = document.getElementById('result');
          const codeDiv = document.getElementById('code');
          
          if (!secret) {
            resultDiv.className = 'result error show';
            codeDiv.textContent = 'Please enter a TOTP secret';
            return;
          }
          
          try {
            const response = await fetch('/generate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ secret })
            });
            
            const data = await response.json();
            
            if (data.success) {
              resultDiv.className = 'result show';
              codeDiv.textContent = data.code;
              
              // Clear previous interval
              if (updateInterval) {
                clearInterval(updateInterval);
              }
              
              // Update timer
              updateTimer(data.timeRemaining);
              
              // Auto-refresh when time is up
              updateInterval = setInterval(() => {
                const timer = parseInt(document.getElementById('timer').textContent);
                if (timer <= 1) {
                  generateCode();
                } else {
                  updateTimer(timer - 1);
                }
              }, 1000);
            } else {
              resultDiv.className = 'result error show';
              codeDiv.textContent = 'Error: ' + (data.message || 'Unknown error');
              if (updateInterval) {
                clearInterval(updateInterval);
              }
            }
          } catch (error) {
            resultDiv.className = 'result error show';
            codeDiv.textContent = 'Error: ' + error.message;
            if (updateInterval) {
              clearInterval(updateInterval);
            }
          }
        }
        
        function updateTimer(seconds) {
          document.getElementById('timer').textContent = seconds;
        }
        
        // Allow Enter key to generate
        document.getElementById('secret').addEventListener('keypress', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            generateCode();
          }
        });
      </script>
    </body>
    </html>
  `);
});

// API endpoint to generate TOTP code - POST
app.post('/generate', (req, res) => {
  try {
    const { secret } = req.body;
    
    if (!secret) {
      return res.status(400).json({
        success: false,
        message: 'Secret is required'
      });
    }
    
    // Remove spaces and convert to uppercase
    const cleanSecret = secret.replace(/\s+/g, '').toUpperCase();
    
    // Generate TOTP code
    const token = speakeasy.totp({
      secret: cleanSecret,
      encoding: 'base32'
    });
    
    // Calculate time remaining in current 30-second window
    const timeRemaining = 30 - Math.floor((Date.now() / 1000) % 30);
    
    res.json({
      success: true,
      code: token,
      timeRemaining: timeRemaining,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating TOTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate TOTP code: ' + error.message
    });
  }
});

// API endpoint to generate TOTP code - GET
app.get('/generate', (req, res) => {
  try {
    const { secret } = req.query;
    
    if (!secret) {
      return res.status(400).json({
        success: false,
        message: 'Secret is required as query parameter'
      });
    }
    
    // Remove spaces and convert to uppercase
    const cleanSecret = secret.replace(/\s+/g, '').toUpperCase();
    
    // Generate TOTP code
    const token = speakeasy.totp({
      secret: cleanSecret,
      encoding: 'base32'
    });
    
    // Calculate time remaining in current 30-second window
    const timeRemaining = 30 - Math.floor((Date.now() / 1000) % 30);
    
    res.json({
      success: true,
      code: token,
      timeRemaining: timeRemaining,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating TOTP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate TOTP code: ' + error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🔐 2FA TOTP Server running on http://localhost:${PORT}`);
  console.log(`📡 API endpoints:`);
  console.log(`   - POST /generate (with JSON body: {"secret": "YOUR_SECRET"})`);
  console.log(`   - GET /generate?secret=YOUR_SECRET`);
  console.log(`   - GET /health`);
  console.log(`\n🌐 Open http://localhost:${PORT} in your browser to test`);
});

