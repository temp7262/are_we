const fs = require('fs');
const path = require('path');

const jsDir = path.resolve(__dirname, '../Frontend/js');

function processDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file.endsWith('.js') && file !== 'login.js' && file !== 'config.js') {
            const filePath = path.join(dir, file);
            let content = fs.readFileSync(filePath, 'utf8');
            let original = content;

            // Simple replace to append token to window.open urls that contain /documents/download
            // e.g. window.open(API_BASE + '/documents/download?application_number=' + id, ...)
            // We append + '&token=' + localStorage.getItem('token')
            
            // Regex to find window.open matching our specific structure
            // /documents/download... -> add token
            content = content.replace(/(API_BASE\s*\+\s*['"]\/documents\/download[^\n,'"]*?['"])(?!.*token)/g, "$1 + '&token=' + (localStorage.getItem('token') || '')");
            
            // Some append var dynamically like `+ encodeURIComponent(doc.id)`
            // we specifically search for window.open(API_BASE + ...download...);
            // using a more robust mechanism:
            // anywhere we see `/documents/download`, append token IF it doesn't have it.
            // Actually, let's just do a blanket regex:
            // /documents/download\?application_number=' \+ [a-zA-Z0-9_.\(\)]+, '_blank'\)/
            // Wait, we can just replace the string literal if it ends with query param.
            
            // Let's use string replace for track-status.js, home.js, download.js, dashboard.js
            
            if (content !== original) {
                fs.writeFileSync(filePath, content, 'utf8');
                console.log('Appended token in', filePath);
            }
        }
    }
}

// Let's just manually replace the lines in the known files since there's only 4.
// The node script approach might be tricky with regex. Let me do exact replacements.

const filesToFix = [
    'track-status.js', 'home.js', 'download.js', 'dashboard.js'
];

for (const file of filesToFix) {
    const fPath = path.join(jsDir, file);
    if(fs.existsSync(fPath)) {
        let text = fs.readFileSync(fPath, 'utf8');
        let old = text;
        
        // Find encoding: `encodeURIComponent(appNo)` or `encodeURIComponent(doc.id)` or `encodeURIComponent(...)`
        // We just replace `, '_blank')`  with ` + '&token=' + localStorage.getItem('token'), '_blank')`
        
        // track-status.js: authFetch(API_BASE + '/documents/download?application_number=' + encodeURIComponent(appNo), {
        // Since it's authFetch, token is passed in header. So that one is fine!
        
        // Let's explicitly check `window.open`
        text = text.replace(/window\.open\(([^,]+?documents\/download[^,]+?)(,[^)]+)?\)/g, "window.open($1 + '&token=' + (localStorage.getItem('token')||'')$2)");

        // What if url = API_BASE + ...
        // download.js has: `url = API_BASE + '/documents/download?application_number=' + encodeURIComponent(doc.id);`
        text = text.replace(/url\s*=\s*(API_BASE[^;]+\/documents\/download[^;]+);/g, "url = $1 + '&token=' + (localStorage.getItem('token')||'');");

        if (text !== old) {
            fs.writeFileSync(fPath, text, 'utf8');
            console.log('Fixed downloads in', fPath);
        }
    }
}
