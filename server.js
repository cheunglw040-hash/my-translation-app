const express = require('express');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Retrieve your API key safely from server environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("FATAL ERROR: GEMINI_API_KEY environment variable is not set!");
  process.exit(1);
}

wss.on('connection', (clientWs) => {
  console.log('Client connected to WebSocket proxy server.');

  // Target URL for the Gemini Live API over WebSockets
  const apiVersion = 'v1alpha'; 
  const geminiUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.${apiVersion}.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`;
  
  // Establish outbound WebSocket connection to Google
  const geminiWs = new WebSocket(geminiUrl);

  geminiWs.on('open', () => {
    console.log('Successfully connected to Google Gemini Live API.');
  });

  // 1. Forward audio/setup messages from the Browser Client to Gemini
  clientWs.on('message', (message) => {
    if (geminiWs.readyState === WebSocket.OPEN) {
      geminiWs.send(message);
    }
  });

  // 2. Forward translated audio/text packets from Gemini back to the Browser Client
  geminiWs.on('message', (message) => {
    if (clientWs.readyState === WebSocket.OPEN) {
      clientWs.send(message);
    }
  });

  clientWs.on('close', () => {
    console.log('Client disconnected. Closing Gemini connection.');
    geminiWs.close();
  });

  geminiWs.on('close', () => {
    console.log('Gemini disconnected. Closing client connection.');
    clientWs.close();
  });

  // Handle errors gracefully to prevent server crashes
  clientWs.on('error', (err) => console.error('Client Socket Error:', err));
  geminiWs.on('error', (err) => console.error('Gemini Socket Error:', err));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`BidiProxy Server running on port ${PORT}`);
});
