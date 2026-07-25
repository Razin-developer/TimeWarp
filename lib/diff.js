/**
 * Light-weight text diffing library.
 * Performs line-by-line comparison using a Longest Common Subsequence (LCS) algorithm.
 */
const WaybackDiff = {
  /**
   * Strips HTML tags, script, and style blocks to return clean readable plaintext lines.
   * @param {string} html 
   * @returns {string[]} Array of non-empty clean text lines.
   */
  extractTextLines(html) {
    if (!html) return [];
    
    // Parse HTML string using DOMParser if in browser context
    let text = '';
    if (typeof DOMParser !== 'undefined') {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Remove style, script, noscript, and iframe tags
        const toRemove = doc.querySelectorAll('style, script, noscript, iframe, svg, head, nav, footer');
        toRemove.forEach(el => el.remove());
        
        text = doc.body ? doc.body.innerText : doc.documentElement.innerText;
      } catch (e) {
        text = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                    .replace(/<[^>]+>/g, ' ');
      }
    } else {
      // Fallback regular expression parsing (for service worker context)
      text = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                  .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                  .replace(/<[^>]+>/g, ' ');
    }

    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  },

  /**
   * Computes the line-by-line diff between two text arrays.
   * Uses a standard LCS dynamic programming approach.
   * @param {string[]} oldLines 
   * @param {string[]} newLines 
   * @returns {Array<{type: 'added'|'deleted'|'unchanged', value: string}>}
   */
  diffLines(oldLines, newLines) {
    // 1. Strip common prefix (identical headers)
    let prefixCount = 0;
    const minLen = Math.min(oldLines.length, newLines.length);
    while (prefixCount < minLen && oldLines[prefixCount] === newLines[prefixCount]) {
      prefixCount++;
    }
    
    const prefixLines = oldLines.slice(0, prefixCount);
    let middleOld = oldLines.slice(prefixCount);
    let middleNew = newLines.slice(prefixCount);
    
    // 2. Strip common suffix (identical footers)
    let suffixCount = 0;
    const minMidLen = Math.min(middleOld.length, middleNew.length);
    while (suffixCount < minMidLen && 
           middleOld[middleOld.length - 1 - suffixCount] === middleNew[middleNew.length - 1 - suffixCount]) {
      suffixCount++;
    }
    
    const suffixLines = suffixCount > 0 ? middleOld.slice(middleOld.length - suffixCount) : [];
    middleOld = suffixCount > 0 ? middleOld.slice(0, middleOld.length - suffixCount) : middleOld;
    middleNew = suffixCount > 0 ? middleNew.slice(0, middleNew.length - suffixCount) : middleNew;
    
    // 3. Limit size of remaining middle blocks to prevent CPU lockup
    const MAX_LINES = 600;
    if (middleOld.length > MAX_LINES) middleOld = middleOld.slice(0, MAX_LINES);
    if (middleNew.length > MAX_LINES) middleNew = middleNew.slice(0, MAX_LINES);
    
    const n = middleOld.length;
    const m = middleNew.length;
    
    // 4. Fill DP table for middle block only (dramatically smaller matrix size)
    const dp = Array(n + 1).fill(null).map(() => Array(m + 1).fill(0));
    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        if (middleOld[i - 1] === middleNew[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    
    // 5. Reconstruct differences for middle block
    const middleResult = [];
    let i = n;
    let j = m;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && middleOld[i - 1] === middleNew[j - 1]) {
        middleResult.unshift({ type: 'unchanged', value: middleOld[i - 1] });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
        middleResult.unshift({ type: 'added', value: middleNew[j - 1] });
        j--;
      } else if (i > 0 && (j === 0 || dp[i - 1][j] >= dp[i][j - 1])) {
        middleResult.unshift({ type: 'deleted', value: middleOld[i - 1] });
        i--;
      }
    }
    
    // 6. Concatenate prefix + middle + suffix
    const finalResult = [];
    prefixLines.forEach(line => finalResult.push({ type: 'unchanged', value: line }));
    middleResult.forEach(item => finalResult.push(item));
    suffixLines.forEach(line => finalResult.push({ type: 'unchanged', value: line }));
    
    return finalResult;
  },

  /**
   * Helper to parse HTML strings and count structure components (DOM nodes, scripts, styles, images).
   */
  getPageMetrics(html) {
    if (!html) return { nodes: 0, scripts: 0, stylesheets: 0, images: 0 };
    
    let nodes = 0;
    let scripts = 0;
    let stylesheets = 0;
    let images = 0;

    if (typeof DOMParser !== 'undefined') {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        nodes = doc.querySelectorAll('*').length;
        scripts = doc.querySelectorAll('script').length;
        stylesheets = doc.querySelectorAll('link[rel="stylesheet"]').length + doc.querySelectorAll('style').length;
        images = doc.querySelectorAll('img').length + doc.querySelectorAll('svg').length;
      } catch (e) {
        nodes = (html.match(/<[a-zA-Z]/g) || []).length;
        scripts = (html.match(/<script/gi) || []).length;
        stylesheets = (html.match(/<style|<link[^>]*rel="stylesheet"/gi) || []).length;
        images = (html.match(/<img|<svg/gi) || []).length;
      }
    } else {
      nodes = (html.match(/<[a-zA-Z]/g) || []).length;
      scripts = (html.match(/<script/gi) || []).length;
      stylesheets = (html.match(/<style|<link[^>]*rel="stylesheet"/gi) || []).length;
      images = (html.match(/<img|<svg/gi) || []).length;
    }

    return { nodes, scripts, stylesheets, images };
  },

  /**
   * Helper to perform full comparison between two raw HTML inputs.
   */
  compareHtml(oldHtml, newHtml) {
    const oldText = this.extractTextLines(oldHtml);
    const newText = this.extractTextLines(newHtml);
    return this.diffLines(oldText, newText);
  }
};

// Export definitions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WaybackDiff;
} else if (typeof globalThis !== 'undefined') {
  globalThis.WaybackDiff = WaybackDiff;
}
