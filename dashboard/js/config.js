// Configuration and constants
const CONFIG = {
    CACHE_DURATION: 10000,  // 10 seconds
    UPDATE_INTERVAL: 5000,  // 5 seconds  
    ANIMATION_DURATION: 800, // 800ms
    CHART_COLORS: {
        primary: '#667eea',
        secondary: '#764ba2',
        success: '#4caf50',
        warning: '#ffc107',
        error: '#f44336'
    }
};

// Global state
let currentTimeRange = '24h';
let currentData = null;
let dataCache = new Map();
let lastUpdate = 0;
let isLive = true;
