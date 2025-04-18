// This is a workaround to ensure that the server.log file is created and truncated on each app start
// Add this near the top of your src/index.mts file, before any logging happens
import fs from 'fs';

// Create a write stream that overwrites the file on each app start
const logFile = fs.createWriteStream('logs/server.log', { flags: 'w' });

// Store the original stdout/stderr write functions
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const originalStderrWrite = process.stderr.write.bind(process.stderr);

// Override stdout.write
process.stdout.write = function(chunk: string | Uint8Array, ...args: any[]) {
  logFile.write(chunk);
  return originalStdoutWrite(chunk, ...args);
};

// Override stderr.write
process.stderr.write = function(chunk: string | Uint8Array, ...args: any[]) {
  logFile.write(chunk);
  return originalStderrWrite(chunk, ...args);
};
