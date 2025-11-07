/**
 * @fileoverview Build Package Script
 *
 * Organizes compiled executables and assets into deployment folder structure.
 * Run after: npm run build:node && npm run build:python
 *
 * Creates:
 * - dist/ShippingManagerCoPilot-v{version}/
 *   - ShippingManagerCoPilot.exe (Single-file: Python launcher + embedded Node.js server)
 *   - sysdata/forecast/ (forecast cache data)
 *   - LICENSE
 *   - README.md
 *   - START_HERE.txt
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const packageJson = require('../package.json');
const version = packageJson.version;

const distFolder = path.join(__dirname, '..', 'dist');
const outputFolder = path.join(distFolder, `ShippingManagerCoPilot-v${version}`);
const dataFolder = path.join(outputFolder, 'sysdata', 'forecast');
const userdataFolder = path.join(outputFolder, 'userdata');

console.log('='.repeat(60));
console.log('Building ShippingManager CoPilot Package');
console.log('='.repeat(60));
console.log(`Version: ${version}`);
console.log(`Output: ${outputFolder}`);
console.log();

// Create folder structure
console.log('[1/5] Creating folder structure...');
if (fs.existsSync(outputFolder)) {
    fs.rmSync(outputFolder, { recursive: true, force: true });
}
fs.mkdirSync(outputFolder, { recursive: true });
fs.mkdirSync(dataFolder, { recursive: true });

// Create userdata directory structure
const userdataSubfolders = ['settings', 'certs', 'logs', 'chatbot', 'hijack_history'];
for (const subfolder of userdataSubfolders) {
    const subfolderPath = path.join(userdataFolder, subfolder);
    fs.mkdirSync(subfolderPath, { recursive: true });
    // Add .gitkeep to preserve empty directories in ZIP
    fs.writeFileSync(path.join(subfolderPath, '.gitkeep'), '');
}
console.log('  [OK] Folders created (sysdata/, userdata/)');

// Copy forecast.json if it exists
const forecastSrc = path.join(__dirname, '..', 'sysdata', 'forecast', 'forecast.json');
if (fs.existsSync(forecastSrc)) {
    fs.copyFileSync(forecastSrc, path.join(dataFolder, 'forecast.json'));
    console.log('  [OK] forecast.json copied');
} else {
    console.log('  [WARN] forecast.json not found (will be generated on first run)');
}

// Copy executable
console.log('[2/5] Copying executable...');

// Single .exe file (Python launcher with embedded Node.js server)
const mainExe = path.join(distFolder, 'ShippingManagerCoPilot.exe');
if (!fs.existsSync(mainExe)) {
    console.error(`  [ERROR] ${mainExe} not found!`);
    console.error('  Run: npm run build (builds Node.js first, then embeds in Python)');
    process.exit(1);
}
fs.copyFileSync(mainExe, path.join(outputFolder, 'ShippingManagerCoPilot.exe'));
console.log('  [OK] ShippingManagerCoPilot.exe (single-file: Python + embedded Node.js server) copied');

// Copy helper executables
console.log('[2.5/5] Copying helper executables...');
const helperFolder = path.join(outputFolder, 'helper');
fs.mkdirSync(helperFolder, { recursive: true });

// Python-built helpers (from dist/)
const pythonHelperExes = [
    'get-session-windows.exe',
    'login-dialog.exe',
    'session-selector.exe',
    'expired-sessions-dialog.exe'
];

for (const helperExe of pythonHelperExes) {
    const srcPath = path.join(distFolder, helperExe);
    if (!fs.existsSync(srcPath)) {
        console.error(`  [ERROR] ${helperExe} not found in dist/`);
        process.exit(1);
    }
    fs.copyFileSync(srcPath, path.join(helperFolder, helperExe));
    console.log(`  [OK] ${helperExe} copied (from dist/)`);
}

// C#-built BrowserLogin.exe (from helper/)
const browserLoginSrc = path.join(__dirname, '..', 'helper', 'BrowserLogin.exe');
if (fs.existsSync(browserLoginSrc)) {
    fs.copyFileSync(browserLoginSrc, path.join(helperFolder, 'BrowserLogin.exe'));
    console.log(`  [OK] BrowserLogin.exe copied (from helper/)`);
} else {
    console.error(`  [ERROR] BrowserLogin.exe not found in helper/`);
    console.error('  Run: node build-browser-login.js');
    process.exit(1);
}

// WebDrivers: NOT bundled - Selenium Manager downloads them automatically
console.log('  [INFO] WebDrivers will be downloaded automatically by Selenium Manager on first run');

// Note: Everything is embedded in one exe
console.log('[3/5] Embedded resources...');
console.log('  [INFO] Node.js server embedded in main .exe (extracted to temp at runtime)');

// Copy public assets (favicon.ico)
console.log('[3.5/5] Copying public assets...');
const publicFolder = path.join(outputFolder, 'public');
fs.mkdirSync(publicFolder, { recursive: true });
const faviconSrc = path.join(__dirname, '..', 'public', 'favicon.ico');
if (fs.existsSync(faviconSrc)) {
    fs.copyFileSync(faviconSrc, path.join(publicFolder, 'favicon.ico'));
    console.log('  [OK] favicon.ico copied');
} else {
    console.log('  [WARN] favicon.ico not found (will use fallback)');
}

// Copy documentation
console.log('[4/5] Copying documentation...');
const docs = [
    { src: 'README.md', required: true },
    { src: 'LICENSE', required: false }
];

for (const doc of docs) {
    const srcPath = path.join(__dirname, '..', doc.src);
    if (!fs.existsSync(srcPath)) {
        if (doc.required) {
            console.error(`  [ERROR] ${doc.src} not found!`);
            process.exit(1);
        }
        console.log(`  [INFO] ${doc.src} not found (optional)`);
        continue;
    }
    fs.copyFileSync(srcPath, path.join(outputFolder, doc.src));
    console.log(`  [OK] ${doc.src} copied`);
}

// Create startup instructions
console.log('[5/5] Creating startup guide...');
const startupGuide = `ShippingManager CoPilot v${version}
${'='.repeat(60)}

QUICK START:
1. Double-click ShippingManagerCoPilot.exe to launch
2. The app will automatically:
   - Extract your Steam/Browser session
   - Start the server at https://localhost:12345
   - Open the web interface

FIRST RUN:
- Accept the self-signed certificate warning in your browser
- Select your login method if prompted (Steam or Browser)
- Allow firewall exception for local network access (optional)

DATA STORAGE:
- User settings: AppData/Local/ShippingManagerCoPilot/userdata/settings/
- Session cache: AppData/Local/ShippingManagerCoPilot/userdata/settings/sessions.json
- Certificates: AppData/Local/ShippingManagerCoPilot/userdata/certs/

TROUBLESHOOTING:
- If Steam session fails: Close Steam completely, restart app
- If browser session fails: Log into shippingmanager.cc first
- Port already in use: Close other instances or change PORT in config

NETWORK ACCESS:
The app is accessible on your local network at the IP shown in console.
Other devices can connect by accepting the certificate warning.

For full documentation, see README.md
`;

fs.writeFileSync(path.join(outputFolder, 'START_HERE.txt'), startupGuide);
console.log('  [OK] START_HERE.txt created');

console.log();
console.log('='.repeat(60));
console.log('[OK] Build complete!');
console.log('='.repeat(60));
console.log(`Package location: ${outputFolder}`);
console.log();

// Create app-payload.zip for installer
console.log('[6/6] Creating installer payload...');
const installerResourcesFolder = path.join(__dirname, '..', 'helper', 'installer', 'Resources');
const payloadZipPath = path.join(installerResourcesFolder, 'app-payload.zip');

// Create Resources folder if it doesn't exist
if (!fs.existsSync(installerResourcesFolder)) {
    fs.mkdirSync(installerResourcesFolder, { recursive: true });
}

// Remove old payload if exists
if (fs.existsSync(payloadZipPath)) {
    fs.unlinkSync(payloadZipPath);
}

// Create ZIP archive
const output = fs.createWriteStream(payloadZipPath);
const archive = archiver('zip', { zlib: { level: 9 } });

archive.on('error', (err) => {
    console.error('  [ERROR] Failed to create installer payload:', err.message);
    process.exit(1);
});

output.on('close', () => {
    const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
    console.log(`  [OK] Installer payload created (${sizeInMB} MB)`);
    console.log(`  [OK] Location: ${payloadZipPath}`);
    console.log();
    console.log('Next steps:');
    console.log('  1. Test: Run ShippingManagerCoPilot.exe in the output folder');
    console.log('  2. Build installer: cd helper/installer && dotnet publish -c Release');
    console.log('  3. Distribute: Share the installer executable');
    console.log();
});

archive.pipe(output);

// Add all files from output folder to ZIP (preserving directory structure)
archive.directory(outputFolder, false);

archive.finalize();
