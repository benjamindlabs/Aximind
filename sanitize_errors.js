const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(dirPath);
  });
}

const dir = path.join(__dirname, 'src');

walkDir(dir, function(filePath) {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Sanitize console.error logging the raw 'error' or 'err' object
    // e.g. console.error('...', error) -> console.error('...', error?.message || 'Unknown error')
    
    // Pattern matches: console.error('some string', err) or console.error("...", error)
    const newContent = content.replace(/console\.error\((['"`].+?['"`]),\s*(error|err)\)/g, "console.error($1, $2?.message || 'Unknown error')");
    
    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent);
      console.log(`Updated: ${filePath}`);
    }
  }
});
