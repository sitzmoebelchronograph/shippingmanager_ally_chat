/**
 * @fileoverview Build BrowserLogin.exe
 *
 * Builds the C# WebView2 browser login helper for Windows.
 * This replaces Selenium/ChromeDriver for Windows users.
 *
 * Creates: helper/BrowserLogin.exe (self-contained .NET 8 WPF app)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectDir = path.join(__dirname, '..', 'helper', 'BrowserLogin');
const helperDir = path.join(__dirname, '..', 'helper');
const outputExe = path.join(helperDir, 'BrowserLogin.exe');

console.log('='.repeat(60));
console.log('Building BrowserLogin.exe (WebView2)');
console.log('='.repeat(60));
console.log();

// Check prerequisites
console.log('[1/4] Checking prerequisites...');

if (!fs.existsSync(projectDir)) {
    console.error('  [ERROR] BrowserLogin project not found!');
    console.error(`  Expected: ${projectDir}`);
    process.exit(1);
}
console.log('  [OK] Project directory found');

// Check for .NET SDK
try {
    const dotnetVersion = execSync('dotnet --version', { encoding: 'utf8' }).trim();
    console.log(`  [OK] .NET SDK found (${dotnetVersion})`);
} catch (error) {
    console.error('  [ERROR] .NET SDK not found!');
    console.error('  Install from: https://dotnet.microsoft.com/download');
    console.error('  Required: .NET 8.0 SDK or later');
    process.exit(1);
}

// Restore dependencies
console.log('[2/4] Restoring .NET dependencies...');
try {
    execSync('dotnet restore helper/BrowserLogin', { stdio: 'inherit' });
    console.log('  [OK] Dependencies restored');
} catch (error) {
    console.error('  [ERROR] Failed to restore dependencies');
    process.exit(1);
}

// Build project with PublishSingleFile
console.log('[3/4] Building BrowserLogin.exe...');
try {
    const buildCommand = 'dotnet publish helper/BrowserLogin -c Release -r win-x64 --self-contained -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -p:EnableCompressionInSingleFile=true';
    console.log(`  Running: ${buildCommand}`);
    execSync(buildCommand, { stdio: 'inherit' });
    console.log('  [OK] Build completed');
} catch (error) {
    console.error('  [ERROR] Failed to build BrowserLogin.exe');
    process.exit(1);
}

// Copy to helper directory
console.log('[4/4] Copying BrowserLogin.exe to helper/...');
const publishDir = path.join(projectDir, 'bin', 'Release', 'net8.0-windows10.0.19041.0', 'win-x64', 'publish');
const sourceExe = path.join(publishDir, 'BrowserLogin.exe');

if (!fs.existsSync(sourceExe)) {
    console.error('  [ERROR] BrowserLogin.exe not found after build!');
    console.error(`  Expected: ${sourceExe}`);
    process.exit(1);
}

// Create helper directory if needed
if (!fs.existsSync(helperDir)) {
    fs.mkdirSync(helperDir, { recursive: true });
}

// Copy to helper/ (used by get_session_windows.py and packaging)
fs.copyFileSync(sourceExe, outputExe);

const exeSize = fs.statSync(outputExe).size;
const exeSizeInMB = (exeSize / 1024 / 1024).toFixed(2);
console.log(`  [OK] BrowserLogin.exe copied (${exeSizeInMB} MB)`);
console.log(`  Location: ${outputExe}`);

console.log();
console.log('='.repeat(60));
console.log('[SUCCESS] BrowserLogin.exe built successfully!');
console.log('='.repeat(60));
console.log(`Output: helper/BrowserLogin.exe (${exeSizeInMB} MB)`);
console.log();
console.log('✅ WebView2 Browser Login Helper:');
console.log('   • No Selenium/ChromeDriver needed');
console.log('   • Uses native Windows WebView2');
console.log('   • Self-contained .NET 8 app');
console.log('   • Automatic cookie extraction and validation');
console.log();
console.log('Usage:');
console.log('  helper\\BrowserLogin.exe --url https://shippingmanager.cc --timeout 300');
console.log();
console.log('Next steps:');
console.log('  1. Test: helper\\BrowserLogin.exe --help');
console.log('  2. Integration with get_session_windows.py is automatic');
console.log();
