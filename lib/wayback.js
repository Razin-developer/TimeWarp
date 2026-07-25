/**
 * Library to interact with the Internet Archive Wayback Machine CDX API.
 */
const WaybackAPI = {
  /**
   * Cleans and normalizes a URL for the Wayback API.
   * @param {string} urlString 
   * @returns {string}
   */
  normalizeUrl(urlString) {
    try {
      const url = new URL(urlString);
      // Remove hash and trailing slash for consistency
      let cleanUrl = url.origin + url.pathname + url.search;
      if (cleanUrl.endsWith('/')) {
        cleanUrl = cleanUrl.slice(0, -1);
      }
      return cleanUrl;
    } catch (e) {
      return urlString;
    }
  },

  /**
   * Extracts the host/domain name from a URL.
   * @param {string} urlString 
   * @returns {string}
   */
  getDomain(urlString) {
    try {
      const url = new URL(urlString);
      return url.hostname;
    } catch (e) {
      return '';
    }
  },

  /**
   * Fetches all archived snapshots (timestamps) for a specific URL.
   * @param {string} url - The URL to fetch history for.
   * @param {object} options - Fetch options.
   * @param {boolean} options.useDomainFallback - If true, falls back to domain level if page has no archives.
   * @returns {Promise<string[]>} List of 14-digit timestamps (YYYYMMDDhhmmss).
   */
  async fetchSnapshots(url, options = {}) {
    const cleanUrl = this.normalizeUrl(url);
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      return [];
    }

    // Default to daily collapse for high fidelity scrubbing
    const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(cleanUrl)}&output=json&fl=timestamp&collapse=timestamp:8`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 seconds timeout

      const response = await fetch(cdxUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Wayback CDX API returned status ${response.status}`);
      }

      const data = await response.json();
      
      // The API returns [ ["timestamp"], ["20080516120000"], ... ]
      if (!Array.isArray(data) || data.length <= 1) {
        // If empty and fallback is requested, try domain level
        if (options.useDomainFallback) {
          const domain = this.getDomain(cleanUrl);
          if (domain) {
            const protocol = cleanUrl.startsWith('https://') ? 'https://' : 'http://';
            const fallbackUrl = protocol + domain;
            if (fallbackUrl !== cleanUrl) {
              return this.fetchSnapshots(fallbackUrl, { useDomainFallback: false });
            }
          }
        }
        return [];
      }

      // Remove header row and flatten array
      const timestamps = data
        .slice(1)
        .map(row => row[0])
        .filter(t => typeof t === 'string' && t.length === 14);

      // Return sorted chronologically
      return timestamps.sort();
    } catch (error) {
      console.error('Error fetching from Wayback CDX API:', error);
      console.log('Diagnostic - options:', JSON.stringify(options), 'cleanUrl:', cleanUrl);
      // Attempt domain fallback on failure/timeout as a last resort
      if (options.useDomainFallback) {
        console.warn('Attempting domain fallback on CDX fetch error...');
        const domain = this.getDomain(cleanUrl);
        console.log('Diagnostic - domain:', domain);
        if (domain) {
          const protocol = cleanUrl.startsWith('https://') ? 'https://' : 'http://';
          const fallbackUrl = protocol + domain;
          console.log('Diagnostic - fallbackUrl:', fallbackUrl);
          if (fallbackUrl !== cleanUrl) {
            try {
              console.log('Diagnostic - initiating fallback fetch to:', fallbackUrl);
              const result = await this.fetchSnapshots(fallbackUrl, { useDomainFallback: false });
              console.log('Diagnostic - fallback fetch succeeded, returning', result.length, 'results');
              return result;
            } catch (fallbackError) {
              console.error('Domain fallback check also failed:', fallbackError);
            }
          } else {
            console.log('Diagnostic - fallbackUrl is same as cleanUrl, skipping fallback');
          }
        }
      }
      throw error;
    }
  },

  /**
   * Formats a 14-digit Wayback timestamp into a human-readable format.
   * @param {string} timestamp - 14-digit string YYYYMMDDhhmmss
   * @returns {string}
   */
  formatTimestamp(timestamp) {
    if (!timestamp || timestamp.length !== 14) return 'Unknown Date';
    const year = timestamp.slice(0, 4);
    const month = timestamp.slice(4, 6);
    const day = timestamp.slice(6, 8);
    const hours = timestamp.slice(8, 10);
    const minutes = timestamp.slice(10, 12);
    
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const monthName = months[parseInt(month, 10) - 1] || month;
    
    return `${day} ${monthName} ${year} ${hours}:${minutes}`;
  },

  /**
   * Construct a Wayback Machine archive URL for a given URL and timestamp.
   * @param {string} url - Original URL
   * @param {string} timestamp - 14-digit timestamp
   * @returns {string}
   */
  getArchiveUrl(url, timestamp) {
    return `https://web.archive.org/web/${timestamp}/${url}`;
  }
};

// Export for ES Modules or CommonJS/ServiceWorker context
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WaybackAPI;
} else if (typeof globalThis !== 'undefined') {
  globalThis.WaybackAPI = WaybackAPI;
}
