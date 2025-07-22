#!/usr/bin/env node
/**
 * HEOR Signal - Python Backend Launcher
 * This Node.js file starts the Python FastAPI server
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting HEOR Signal with Python FastAPI Backend');
console.log('📍 Node.js backend eliminated - Python backend only');

// Change to server directory and start Python FastAPI
const pythonProcess = spawn('python', ['main.py'], {
  cwd: __dirname,
  stdio: 'inherit',
  env: { ...process.env }
});

pythonProcess.on('error', (error) => {
  console.error('❌ Failed to start Python server:', error);
  process.exit(1);
});

pythonProcess.on('close', (code) => {
  console.log(`🐍 Python server exited with code ${code}`);
  process.exit(code || 0);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n✋ Shutting down HEOR Signal...');
  pythonProcess.kill();
});

process.on('SIGTERM', () => {
  console.log('\n✋ Terminating HEOR Signal...');
  pythonProcess.kill();
});

console.log('✅ Python FastAPI server starting on http://localhost:5000');
console.log('🤖 OpenAI Assistant API integrated');
console.log('🗄️  PostgreSQL database connected');
console.log('📊 Frontend served from Python backend');