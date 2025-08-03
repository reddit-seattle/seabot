// Main dashboard controller
class Dashboard {
    constructor() {
        this.initializeEventListeners();
        this.createLiveIndicator();
    }

    async init() {
        await this.updateDashboard();
        this.startLiveUpdates();
    }

    initializeEventListeners() {
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            this.stopLiveUpdates();
        });

        // Handle visibility change to pause/resume updates
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stopLiveUpdates();
            } else if (isLive) {
                this.startLiveUpdates();
            }
        });
    }

    createLiveIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'live-indicator';
        indicator.style.opacity = '0';
        document.body.appendChild(indicator);
    }

    async updateDashboard(isLiveUpdate = false) {
        try {
            if (!isLiveUpdate) {
                this.showLoading();
                this.hideError();
            }
            
            const newData = await DataService.fetchMetrics();
            const hasDataChanged = JSON.stringify(newData) !== JSON.stringify(currentData);
            
            if (!hasDataChanged && isLiveUpdate) {
                return; // No changes, skip update
            }
            
            currentData = newData;
            lastUpdate = Date.now();
            
            // Create all charts with animations for updates
            StatsService.createStats(currentData, isLiveUpdate);
            ChartService.createTimelineChart(currentData, isLiveUpdate);
            ChartService.createTimelineStackedChart(currentData, isLiveUpdate);
            ChartService.createChannelChart(currentData, isLiveUpdate);
            ChartService.createCommandChart(currentData, isLiveUpdate);
            ChartService.createHeatmap(currentData, isLiveUpdate);
            
            // Show panels
            if (!isLiveUpdate) {
                this.hideLoading();
                this.showStats();
            }
            
            // Update live indicator
            this.updateLiveIndicator();
            
        } catch (error) {
            console.error('Dashboard update failed:', error);
            
            // Don't show generic error for rate limiting - DataService handles this
            if (!isLiveUpdate && error.message !== 'Rate limited') {
                this.hideLoading();
                this.showError(error.message);
            } else if (!isLiveUpdate) {
                this.hideLoading();
            }
        }
    }

    updateLiveIndicator() {
        const indicator = document.querySelector('.live-indicator');
        if (!indicator) return;
        
        indicator.textContent = `🟢 Live • Updated ${new Date().toLocaleTimeString()}`;
        indicator.style.opacity = '1';
        indicator.style.transform = 'scale(1.1)';
        
        setTimeout(() => {
            indicator.style.transform = 'scale(1)';
        }, 200);
    }

    toggleLiveUpdates() {
        isLive = !isLive;
        const btn = event.target;
        
        if (isLive) {
            btn.textContent = '⏸️ Pause Live';
            btn.style.background = 'rgba(255, 193, 7, 0.3)';
            this.startLiveUpdates();
        } else {
            btn.textContent = '▶️ Resume Live';
            btn.style.background = 'rgba(76, 175, 80, 0.3)';
            this.stopLiveUpdates();
        }
    }

    startLiveUpdates() {
        this.stopLiveUpdates(); // Clear any existing interval
        
        window.liveUpdateInterval = setInterval(() => {
            if (isLive && !document.hidden) {
                this.updateDashboard(true);
            }
        }, CONFIG.UPDATE_INTERVAL);
    }

    stopLiveUpdates() {
        if (window.liveUpdateInterval) {
            clearInterval(window.liveUpdateInterval);
            window.liveUpdateInterval = null;
        }
    }

    setTimeRange(range) {
        currentTimeRange = range;
        
        // Update button states
        document.querySelectorAll('.time-controls .btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // Clear cache for new time range
        DataService.clearCache();
        this.updateDashboard();
    }

    refreshData() {
        DataService.clearCache();
        this.updateDashboard();
    }

    // UI State Management
    showLoading() {
        document.getElementById('loading').style.display = 'block';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    showError(message) {
        const errorEl = document.getElementById('error');
        errorEl.style.display = 'block';
        errorEl.textContent = `Error: ${message}`;
    }

    hideError() {
        document.getElementById('error').style.display = 'none';
    }

    showStats() {
        const headerStats = document.getElementById('headerStats');
        if (headerStats) {
            headerStats.style.display = 'block';
        }
    }

    // Debug utilities
    getDebugInfo() {
        return {
            isLive,
            currentTimeRange,
            lastUpdate: new Date(lastUpdate).toISOString(),
            cacheInfo: DataService.getCacheInfo(),
            hasData: !!currentData
        };
    }
}

// Global functions for HTML onclick handlers
function toggleLiveUpdates() {
    window.dashboardInstance.toggleLiveUpdates();
}

function setTimeRange(range) {
    window.dashboardInstance.setTimeRange(range);
}

function refreshData() {
    window.dashboardInstance.refreshData();
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardInstance = new Dashboard();
    window.dashboardInstance.init();
});
