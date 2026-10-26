// Valve KeyValues: strip comments while tokenizing, preserving quoted URLs.
export function keyValues(text) {
  const tokens = [...text.matchAll(/"((?:\\.|[^"\\])*)"|\/\/[^\n]*|\/\*[\s\S]*?\*\/|([{}])|([^\s{}"]+)/g)]
    .filter(m => !m[0].startsWith('//') && !m[0].startsWith('/*')).map(m => m[1] ?? m[2] ?? m[3]);
  let i = 0;
  function object() {
    const result = {};
    while (i < tokens.length) {
      const key = tokens[i++]; if (key === '}') break;
      if (key === '#base' || key === '#include') { i++; continue; }
      if (key.startsWith('[')) continue;
      const value = tokens[i++];
      if (value === undefined) break;
      result[key] = value === '{' ? object() : value;
    }
    return result;
  }
  return object();
}
