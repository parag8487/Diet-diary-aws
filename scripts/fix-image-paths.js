const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../public');
const S3_BASE_URL = 'https://dietdiary-502951073560-images.s3.us-east-1.amazonaws.com/';

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

const extensionsToFix = ['.html', '.css', '.js'];

console.log('🔍 Auditing image paths in public directory...');

walkDir(publicDir, (filePath) => {
    if (!extensionsToFix.includes(path.extname(filePath))) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // Pattern 1: images/images/filename.ext
    // Pattern 2: ./images/filename.ext
    // Pattern 3: images/filename.ext
    
    // We replace anything that looks like (./?)images/(images/)?filename
    // with S3_BASE_URL + filename
    
    // Using regex to catch variations: (?:./)?images/(?:images/)?([a-zA-Z0-9%._\-\s]+)
    // Actually, safer to target common patterns:
    
    const patterns = [
        { regex: /src="\.?\/images\/images\/([^"]+)"/g, replacement: `src="${S3_BASE_URL}$1"` },
        { regex: /src="\.?\/images\/([^"]+)"/g, replacement: `src="${S3_BASE_URL}$1"` },
        { regex: /url\(['"]?\.?\/images\/images\/([^'"]+)['"]?\)/g, replacement: `url(${S3_BASE_URL}$1)` },
        { regex: /url\(['"]?\.?\/images\/([^'"]+)['"]?\)/g, replacement: `url(${S3_BASE_URL}$1)` },
        // Also handle cases without leading slash or dot
        { regex: /src="images\/images\/([^"]+)"/g, replacement: `src="${S3_BASE_URL}$1"` },
        { regex: /src="images\/([^"]+)"/g, replacement: `src="${S3_BASE_URL}$1"` }
    ];

    patterns.forEach(p => {
        content = content.replace(p.regex, p.replacement);
    });

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Fixed: ${path.relative(publicDir, filePath)}`);
    }
});

console.log('✨ Image path audit completed.');
