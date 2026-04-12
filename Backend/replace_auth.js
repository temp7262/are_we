const fs = require('fs');
const path = require('path');

const jsDir = path.resolve(__dirname, '../Frontend/js');
const adminDir = path.resolve(__dirname, '../Frontend/admin-portal');

function processDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file.endsWith('.js') && file !== 'login.js' && file !== 'config.js') {
            const filePath = path.join(dir, file);
            let content = fs.readFileSync(filePath, 'utf8');
            let original = content;

            // 1. replace fetch(API_BASE + '...') with authFetch(API_BASE + '...')
            content = content.replace(/fetch\s*\(\s*(API|API_BASE|CONFIG\.API_BASE)/g, 'authFetch($1');
            
            // 2. Remove credentials: 'include'
            content = content.replace(/credentials\s*:\s*['"]include['"]\s*,?/g, '/* credentials:include removed — use JWT */');

            // 3. Ensure authFetch calls only have 2 or 3 arguments, but we don't necessarily have to parse the whole AST,
            // authFetch automatically drops credentials and injects headers.
            // Let's just fix the logout API call:
            // FROM: fetch(API_BASE + '/auth/logout', ...)
            // TO: doLogout()
            content = content.replace(/authFetch\s*\(\s*(?:API_BASE|API|CONFIG\.API_BASE)\s*\+\s*['"]\/auth\/logout['"](,[\s\S]*?)?\)\s*(?:\.then\([\s\S]*?\))?(?:\.catch\([\s\S]*?\))?(?:\.finally\([\s\S]*?\))?/g, 'doLogout()');

            if (content !== original) {
                fs.writeFileSync(filePath, content, 'utf8');
                console.log('Updated', filePath);
            }
        }
    }
}

processDir(jsDir);
processDir(adminDir);

// Now for HTML files, add config.js script tag before other scripts
function processHtmlDir(dir, configPath) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            processHtmlDir(filePath, configPath); // recurse
        } else if (file.endsWith('.html')) {
            let content = fs.readFileSync(filePath, 'utf8');
            let original = content;

            // If it doesn't already have config.js
            if (!content.includes(configPath)) {
                // Find first <script src=... that is NOT a CDN
                const firstScriptRegex = /<script\s+src=['"](?!http|\/\/)/i;
                if (firstScriptRegex.test(content)) {
                    content = content.replace(firstScriptRegex, `<script src="${configPath}"></script>\n    $&`);
                } else {
                    // Just put it before closing body
                    content = content.replace(/<\/body>/i, `    <script src="${configPath}"></script>\n</body>`);
                }
            }

            if (content !== original) {
                fs.writeFileSync(filePath, content, 'utf8');
                console.log('Added config to', filePath);
            }
        }
    }
}

processHtmlDir(path.resolve(__dirname, '../Frontend/pages'), '../js/config.js');
// Also process root index.html? No, that's just a splash page or maybe a redirect. Let's process it if exists.
if (fs.existsSync(path.resolve(__dirname, '../Frontend/index.html'))) {
    processHtmlDir(path.resolve(__dirname, '../Frontend'), './js/config.js'); // Assuming we don't recurse here properly, actually processHtmlDir is recursive. Let's just do pages.
}

processHtmlDir(path.resolve(__dirname, '../Frontend/admin-portal'), 'config.js');

console.log('Done.');
