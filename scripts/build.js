const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Set environment variables
process.env.BABEL_ENV = 'production';
process.env.NODE_ENV = 'production';
process.env.CI = 'false';

// Import the build script from react-scripts
const buildScript = require('react-scripts/scripts/build');

console.log('Starting custom build process...');

// Run the build
try {
  // This bypasses the binary permission issue by requiring the module directly
  require('react-scripts/scripts/build');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
