const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const jsDirs = [
    path.resolve(rootDir, 'Frontend/js'),
    path.resolve(rootDir, 'Frontend/admin-portal')
];

function processJS(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file.endsWith('.js') && file !== 'config.js') {
            const filePath = path.join(dir, file);
            let content = fs.readFileSync(filePath, 'utf8');
            let original = content;

            // 1. replace fetch(`${API_BASE}...`) or fetch(API_BASE + ...) with authFetch(...)
            // Matches: fetch(`${API_BASE}/...`)
            content = content.replace(/fetch\s*\(`\${API_BASE}([^`]+?)`([^{}]*?)(\)?)/g, 'authFetch(`${API_BASE}$1`$2$3');
            // Matches: fetch(API_BASE + '...')
            content = content.replace(/fetch\s*\(\s*(API_BASE|API|CONFIG\.API_BASE)\s*\+\s*([^,)\s]+)\s*(,[^)]+)?\)/g, 'authFetch($1 + $2$3)');

            // 2. Fix the logout() function to use doLogout() if it just clears and redirects
            // or if it calls the backend.
            if (file !== 'login.js') {
                content = content.replace(/function logout\(\)\s*\{[\s\S]*?localStorage\.clear\(\);[\s\S]*?window\.location\.href\s*=\s*'login\.html';[\s\S]*?\}/g, 'function logout() { if(confirm("Logout?")) doLogout(); }');
            }

            // 3. Remove any remaining legacy API constants in db.js or others
            content = content.replace(/const API\s*=\s*['"]http:\/\/localhost\/college-portal\/public\/index\.php\/api['"];/g, '// API from config.js');
            content = content.replace(/const API\s*=\s*window\.location\.origin\s*\+\s*['"]\/college-portal\/public\/index\.php\/api['"];/g, '// API from config.js');

            if (content !== original) {
                fs.writeFileSync(filePath, content, 'utf8');
                console.log('Fixed fetch in', filePath);
            }
        }
    }
}

jsDirs.forEach(processJS);
console.log('Done.');
