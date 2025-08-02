// Data fetching and caching utilities
class DataService {
    static async fetchMetrics() {
        const now = Date.now();
        const cacheKey = `metrics_${currentTimeRange}`;
        
        // Check cache first
        if (dataCache.has(cacheKey)) {
            const cached = dataCache.get(cacheKey);
            if (now - cached.timestamp < CONFIG.CACHE_DURATION) {
                return cached.data;
            }
        }
        
        try {
            const response = await fetch('/metrics');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Cache the result
            dataCache.set(cacheKey, {
                data: data,
                timestamp: now
            });
            
            return data;
        } catch (error) {
            console.error('Failed to fetch metrics:', error);
            throw error;
        }
    }

    static clearCache() {
        dataCache.clear();
    }

    static getCacheSize() {
        return dataCache.size;
    }

    static getCacheInfo() {
        const info = [];
        for (const [key, value] of dataCache.entries()) {
            info.push({
                key,
                age: Date.now() - value.timestamp,
                size: JSON.stringify(value.data).length
            });
        }
        return info;
    }
}
