const fs = require('fs');

const tsFile = 'web/src/i18n/index.ts';
let lines = fs.readFileSync(tsFile, 'utf8').split('\n');
const extracted = JSON.parse(fs.readFileSync('web/extracted_words.json', 'utf8'));
const amObj = extracted.am;
const enObj = extracted.en;

const entries = Object.entries(amObj).map(([k,v]) => `      "${k}": ${JSON.stringify(v)},`);

const insertIndex = lines.findIndex((l, i) => l === '    },' && lines[i+1] === '  },' && lines[i+2] === '};');

if (insertIndex !== -1) {
  lines.splice(insertIndex, 0, ...entries);
  fs.writeFileSync(tsFile, lines.join('\n'));
  console.log('Inserted am translations at line', insertIndex);
} else {
  console.log('Could not find insert index for am');
}

// Now let's also inject en missing translations into the en object.
// The en object ends at '    },' followed by '  },' followed by '  am: {'
let lines2 = fs.readFileSync(tsFile, 'utf8').split('\n');
const enEntries = Object.entries(enObj).map(([k,v]) => `      "${k}": ${JSON.stringify(v)},`);
const insertIndexEn = lines2.findIndex((l, i) => l === '    },' && lines2[i+1] === '  },' && lines2[i+2] === '  am: {');

if (insertIndexEn !== -1) {
  lines2.splice(insertIndexEn, 0, ...enEntries);
  fs.writeFileSync(tsFile, lines2.join('\n'));
  console.log('Inserted en translations at line', insertIndexEn);
} else {
  console.log('Could not find insert index for en');
}
