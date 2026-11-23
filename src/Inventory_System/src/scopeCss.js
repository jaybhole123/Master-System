import fs from 'fs';

let css = fs.readFileSync('c:/Users/acer/Desktop/ai_jai_bhole/Master-System/src/Inventory_System/src/original_style.css', 'utf-8');

function prefixCSS(cssText, prefix) {
    let result = '';
    let i = 0;
    const len = cssText.length;
    
    while (i < len) {
        while (i < len && /\s/.test(cssText[i])) {
            result += cssText[i];
            i++;
        }
        if (i >= len) break;
        
        if (cssText.slice(i, i+2) === '/*') {
            let endComment = cssText.indexOf('*/', i+2);
            if (endComment === -1) endComment = len;
            else endComment += 2;
            result += cssText.slice(i, endComment);
            i = endComment;
            continue;
        }
        
        let braceIndex = cssText.indexOf('{', i);
        if (braceIndex === -1) {
            result += cssText.slice(i);
            break;
        }
        
        let selector = cssText.slice(i, braceIndex).trim();
        
        if (selector.startsWith('@import') || selector.startsWith('@charset')) {
            let semi = cssText.indexOf(';', i);
            i = semi + 1;
            continue;
        }
        
        if (selector.startsWith('@keyframes') || selector.startsWith('@-webkit-keyframes')) {
            let depth = 1;
            let j = braceIndex + 1;
            while (j < len && depth > 0) {
                if (cssText[j] === '{') depth++;
                else if (cssText[j] === '}') depth--;
                j++;
            }
            result += cssText.slice(i, j) + '\n';
            i = j;
            continue;
        }
        
        if (selector.startsWith('@media')) {
            let depth = 1;
            let j = braceIndex + 1;
            while (j < len && depth > 0) {
                if (cssText[j] === '{') depth++;
                else if (cssText[j] === '}') depth--;
                j++;
            }
            let innerCss = cssText.slice(braceIndex + 1, j - 1);
            result += selector + ' {\n' + prefixCSS(innerCss, prefix) + '\n}\n';
            i = j;
            continue;
        }
        
        let parts = selector.split(',').map(s => {
            let p = s.trim();
            if (!p) return '';
            if (p === ':root' || p === 'body' || p === 'html') {
                return prefix;
            }
            if (p === '*') {
                return prefix + ', ' + prefix + ' *';
            }
            if (p.startsWith(prefix)) return p;
            return prefix + ' ' + p;
        }).filter(Boolean);
        
        let depth = 1;
        let j = braceIndex + 1;
        while (j < len && depth > 0) {
            if (cssText[j] === '{') depth++;
            else if (cssText[j] === '}') depth--;
            j++;
        }
        let body = cssText.slice(braceIndex, j);
        
        if (selector.includes('#main')) {
            body = body.replace(/margin-left:\s*236px;?/g, 'margin-left: 0;');
        }
        
        result += parts.join(', ') + ' ' + body + '\n';
        i = j;
    }
    return result;
}

let prefixed = prefixCSS(css, '.ims-system-container');

let headerVars = '.ims-system-container {\n' +
  '  --navy: #0b1b3a;\n' +
  '  --blue: #2f6fed;\n' +
  '  --bg: #f3f5fa;\n' +
  '  --tx: #1b2438;\n' +
  '  --mut: #6b778c;\n' +
  '  --bd: #e4e9f2;\n' +
  '  --ex: #2f6fed;\n' +
  '  --no: #1f9d6b;\n' +
  '  --md: #f29d12;\n' +
  '  --cr: #e5334b;\n' +
  '  --sh: 0 1px 2px #0b1b3a0a, 0 4px 14px #0b1b3a0d;\n' +
  '  font-family: "Plus Jakarta Sans", "Segoe UI", system-ui, sans-serif;\n' +
  '  color: var(--tx);\n' +
  '  line-height: 1.45;\n' +
  '  font-size: 14px;\n' +
  '  width: 100%;\n' +
  '  min-height: 100%;\n' +
  '}\n' +
  '.ims-system-container #main {\n' +
  '  margin-left: 0 !important;\n' +
  '  padding: 20px 22px !important;\n' +
  '  width: 100% !important;\n' +
  '  min-height: 100% !important;\n' +
  '}\n';

fs.writeFileSync('c:/Users/acer/Desktop/ai_jai_bhole/Master-System/src/Inventory_System/src/App.css', headerVars + '\n' + prefixed, 'utf-8');
console.log('App.css successfully generated!');
