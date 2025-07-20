// This is a workaround to ensure that the server.log file is created and truncated on each app start
// Add this near the top of your src/index.mts file, before any logging happens
import fs from 'fs';

// Create a write stream that overwrites the file on each app start
const logFile = fs.createWriteStream('logs/server.log', { flags: 'w' });

// Store the original stdout/stderr write functions
const originalStdoutWrite = process.stdout.write.bind(process.stdout);
const originalStderrWrite = process.stderr.write.bind(process.stderr);

// Override stdout.write with a compatible function
process.stdout.write = function (
  buffer: string | Uint8Array,
  encoding?: BufferEncoding | ((err?: Error) => void),
  cb?: (err?: Error) => void
): boolean {
  logFile.write(buffer);
  return originalStdoutWrite(
    buffer, 
    encoding as BufferEncoding | undefined, 
    cb as ((err?: Error | null) => void) | undefined
  );
};

// Override stderr.write with a compatible function
process.stderr.write = function (
  buffer: string | Uint8Array,
  encoding?: BufferEncoding | ((err?: Error) => void),
  cb?: (err?: Error) => void
): boolean {
  logFile.write(buffer);
  return originalStderrWrite(
    buffer, 
    encoding as BufferEncoding | undefined, 
    cb as ((err?: Error | null) => void) | undefined
  );
};
