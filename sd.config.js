// Main build script - runs all platform builds
await import('./config/css/build.js');
await import('./config/ios/build.js');
await import('./config/android/build.js');
await import('./config/cpp/build.js');

console.log('Build completed for all platforms!');
