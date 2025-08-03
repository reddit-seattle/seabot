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
            
            if (response.status === 429) {
                // Handle rate limiting with countdown
                this.showRateLimitMessage();
                throw new Error('Rate limited');
            }
            
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

    static showRateLimitMessage() {
        // Create or update rate limit notification
        let notification = document.getElementById('rateLimitNotification');
        
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'rateLimitNotification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(255, 87, 34, 0.95);
                color: white;
                padding: 15px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 1000;
                font-size: 14px;
                max-width: 300px;
                backdrop-filter: blur(10px);
            `;
            document.body.appendChild(notification);
        }

        // Start countdown
        let countdown = 30;
        const updateMessage = () => {
            notification.innerHTML = `
                <div style="font-weight: bold; margin-bottom: 5px;">🚦 Rate Limited</div>
                <div>Too many requests. Please wait ${countdown} seconds before trying again.</div>
                <div style="margin-top: 8px; font-size: 12px; opacity: 0.8;">
                    Auto-refresh paused
                </div>
            `;
        };

        updateMessage();

        const timer = setInterval(() => {
            countdown--;
            if (countdown <= 0) {
                clearInterval(timer);
                notification.remove();
            } else {
                updateMessage();
            }
        }, 1000);

        // Pause live updates during rate limit
        if (typeof isLive !== 'undefined' && isLive) {
            window.dashboardInstance?.stopLiveUpdates();
            setTimeout(() => {
                if (typeof isLive !== 'undefined' && isLive) {
                    window.dashboardInstance?.startLiveUpdates();
                }
            }, 30000);
        }
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
