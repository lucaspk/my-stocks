/**
 * Generic cache utilities using localStorage with TTL support.
 * Expects config: { cacheKey: string, cacheTTL: number }
 */
(function () {
    'use strict';

    /**
     * Retrieves cached data if it exists and hasn't expired.
     * @param {Object} config - { cacheKey, cacheTTL }
     * @returns {*} Cached data or null
     */
    function getCache(config) {
        const cached = localStorage.getItem(config.cacheKey);
        if (!cached) return null;

        try {
            const { timestamp, data } = JSON.parse(cached);
            const age = Date.now() - timestamp;
            return age < config.cacheTTL ? data : null;
        } catch (err) {
            console.error('Error reading cache:', err);
            return null;
        }
    }

    /**
     * Stores data in cache with current timestamp.
     * @param {Object} config - { cacheKey }
     * @param {*} data - Data to cache
     */
    function setCache(config, data) {
        try {
            localStorage.setItem(config.cacheKey, JSON.stringify({
                timestamp: Date.now(),
                data
            }));
        } catch (err) {
            console.error('Error saving cache:', err);
        }
    }

    window.Cache = { getCache, setCache };
})();
