const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const pagesDir = path.resolve(rootDir, 'Frontend/pages');
const adminDir = path.resolve(rootDir, 'Frontend/admin-portal');

function fixHtmlFiles(dir, relativeConfigPath) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            // Relative config path needs to go deeper
            fixHtmlFiles(filePath, '../' + relativeConfigPath);
        } else if (file.endsWith('.html')) {
            let content = fs.readFileSync(filePath, 'utf8');
            let original = content;

            // 1. Remove any injected config.js that might be duplicated or broken
            content = content.replace(/<script src="[^"]*?config\.js"><\/script>\s*/g, '');

            // 2. Fix broken script paths like /college-portal/public/js/...
            // replace src="/college-portal/public/js/..." with src="../js/..." (for pages) or src="js/..."? 
            // Actually it's safer to just remove the prefix and see where they are.
            // Home.html is in Frontend/pages/home.html. js is in Frontend/js. Path should be ../js/
            // Admin files are in Frontend/admin-portal/. If js is in same dir, path is just file.js
            
            if (dir.includes('pages')) {
                content = content.replace(/src="\/college-portal\/public\/js\//g, 'src="../js/');
            } else if (dir.includes('admin-portal')) {
                // Admin portal seems to have js files in the same directory or different ones?
                // Looking at the file list, they are mostly in admin-portal/
                content = content.replace(/src="\/college-portal\/public\/js\//g, 'src="'); // Assume same dir for now or check if it needs ../js/
            }
            
            // 3. Inject config.js at the right place (near the end, but before other scripts)
            // Actually, config.js MUST be before any script that uses API_BASE.
            // Let's find the first local script tag.
            const scriptTag = '<script src="' + relativeConfigPath + '"></script>';
            const headEnd = content.indexOf('</head>');
            if (headEnd !== -1) {
                // Insert after other meta/links in head to be safe, or just before </body>
                // Inserting before </body> but before other scripts is safest for global variables.
                const firstScript = content.search(/<script/);
                if (firstScript !== -1) {
                    content = content.slice(0, firstScript) + scriptTag + '\n    ' + content.slice(firstScript);
                } else {
                    content = content.replace('</body>', '    ' + scriptTag + '\n</body>');
                }
            }

            if (content !== original) {
                fs.writeFileSync(filePath, content, 'utf8');
                console.log('Fixed scripts in', filePath);
            }
        }
    }
}

// Student pages: Frontend/pages/*.html -> config is in ../js/config.js
fixHtmlFiles(pagesDir, '../js/config.js');

// Admin portal: Frontend/admin-portal/*.html -> config is in ./config.js
fixHtmlFiles(adminDir, 'config.js');

// Root files
fixHtmlFiles(path.resolve(rootDir, 'Frontend'), './js/config.js');
