/**
 * Library to manage local caching, bookmarks, and recents using chrome.storage.local.
 */
const WaybackCache = {
  CACHE_PREFIX: 'snapshots:',
  EXPIRATION_MS: 24 * 60 * 60 * 1000, // 24 hours

  /**
   * Retrieves cached snapshots for a URL.
   * Checks for expiration and returns null if expired.
   * @param {string} url 
   * @returns {Promise<string[]|null>}
   */
  async getSnapshots(url) {
    const key = this.CACHE_PREFIX + url;
    try {
      const result = await chrome.storage.local.get(key);
      const cacheData = result[key];
      if (!cacheData) return null;

      // Check if cache has expired
      const now = Date.now();
      if (now - cacheData.lastFetched > this.EXPIRATION_MS) {
        // Expired cache, delete it in background
        chrome.storage.local.remove(key);
        return null;
      }

      return cacheData.snapshots;
    } catch (e) {
      console.error('Error reading snapshots from cache:', e);
      return null;
    }
  },

  /**
   * Caches a list of snapshots for a URL.
   * @param {string} url 
   * @param {string[]} snapshots 
   */
  async setSnapshots(url, snapshots) {
    const key = this.CACHE_PREFIX + url;
    const cacheData = {
      url,
      snapshots,
      lastFetched: Date.now()
    };
    try {
      await chrome.storage.local.set({ [key]: cacheData });
    } catch (e) {
      console.error('Error saving snapshots to cache:', e);
    }
  },

  /**
   * Retrieves all bookmarked snapshots.
   * @returns {Promise<Array<{url: string, timestamp: string, title: string, domain: string, addedAt: number}>>}
   */
  async getBookmarks() {
    try {
      const result = await chrome.storage.local.get('bookmarks');
      return result.bookmarks || [];
    } catch (e) {
      console.error('Error reading bookmarks:', e);
      return [];
    }
  },

  /**
   * Adds a snapshot to bookmarks.
   */
  async addBookmark(url, timestamp, title = '', tag = 'General') {
    try {
      const bookmarks = await this.getBookmarks();
      const domain = typeof WaybackAPI !== 'undefined' ? WaybackAPI.getDomain(url) : new URL(url).hostname;
      
      // Prevent duplicates
      const exists = bookmarks.some(b => b.url === url && b.timestamp === timestamp);
      if (!exists) {
        bookmarks.push({
          url,
          domain,
          timestamp,
          title: title || `${domain} (${WaybackCache.formatDateString(timestamp)})`,
          tag: tag || 'General',
          addedAt: Date.now()
        });
        await chrome.storage.local.set({ bookmarks });
      }
    } catch (e) {
      console.error('Error adding bookmark:', e);
    }
  },

  /**
   * Removes a snapshot from bookmarks.
   */
  async removeBookmark(url, timestamp) {
    try {
      let bookmarks = await this.getBookmarks();
      bookmarks = bookmarks.filter(b => !(b.url === url && b.timestamp === timestamp));
      await chrome.storage.local.set({ bookmarks });
    } catch (e) {
      console.error('Error removing bookmark:', e);
    }
  },

  /**
   * Checks if a snapshot is bookmarked.
   */
  async isBookmarked(url, timestamp) {
    const bookmarks = await this.getBookmarks();
    return bookmarks.some(b => b.url === url && b.timestamp === timestamp);
  },

  /**
   * Retrieves recently viewed snapshots.
   * @returns {Promise<Array<{url: string, domain: string, timestamp: string, title: string, viewedAt: number}>>}
   */
  async getRecents() {
    try {
      const result = await chrome.storage.local.get('recents');
      return result.recents || [];
    } catch (e) {
      console.error('Error reading recents:', e);
      return [];
    }
  },

  /**
   * Adds a snapshot to the recently viewed list.
   * Keeps only the top 10 entries.
   */
  async addRecent(url, timestamp, title = '') {
    try {
      let recents = await this.getRecents();
      const domain = typeof WaybackAPI !== 'undefined' ? WaybackAPI.getDomain(url) : new URL(url).hostname;
      const cleanTitle = title || `${domain} (${WaybackCache.formatDateString(timestamp)})`;

      // Remove existing item to bump it to the top
      recents = recents.filter(r => !(r.url === url && r.timestamp === timestamp));

      recents.unshift({
        url,
        domain,
        timestamp,
        title: cleanTitle,
        viewedAt: Date.now()
      });

      // Keep only top 10
      if (recents.length > 10) {
        recents = recents.slice(0, 10);
      }

      await chrome.storage.local.set({ recents });
    } catch (e) {
      console.error('Error adding to recents:', e);
    }
  },

  /**
   * Formats 14-digit timestamp for bookmark title fallback.
   */
  formatDateString(timestamp) {
    if (!timestamp || timestamp.length !== 14) return 'Unknown';
    const year = timestamp.slice(0, 4);
    const month = timestamp.slice(4, 6);
    const day = timestamp.slice(6, 8);
    return `${year}-${month}-${day}`;
  }
};

// Export for ES Modules or CommonJS/ServiceWorker context
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WaybackCache;
} else if (typeof globalThis !== 'undefined') {
  globalThis.WaybackCache = WaybackCache;
}
