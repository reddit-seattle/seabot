// Statistics and animations
class StatsService {
    static createStats(data, isUpdate = false) {
        // Use header stats instead
        this.createHeaderStats(data, isUpdate);
    }

    static createHeaderStats(data, isUpdate = false) {
        const statsContainer = document.getElementById('statsInline');
        const headerStatsContainer = document.getElementById('headerStats');
        
        const totalMessages = (data.messageStats || []).reduce((sum, day) => sum + day.count, 0);
        const totalCommands = (data.commandStats || []).reduce((sum, cmd) => sum + cmd.count, 0);
        const activeChannels = (data.channelActivity || []).length;
        const avgMessagesPerHour = Math.round(totalMessages / 24);
        
        const stats = [
            { label: 'messages', value: totalMessages },
            { label: 'commands', value: totalCommands },
            { label: 'channels', value: activeChannels },
            { label: 'avg/hr', value: avgMessagesPerHour }
        ];
        
        // Show the header stats container
        headerStatsContainer.style.display = 'block';
        
        if (isUpdate) {
            this._animateHeaderStatUpdates(statsContainer, stats);
        } else {
            this._createHeaderStatCards(statsContainer, stats);
        }
    }

    static _createHeaderStatCards(container, stats) {
        container.innerHTML = stats.map(stat => `
            <div class="stat-inline">
                <span class="stat-value">${stat.value}</span>
                <span class="stat-label">${stat.label}</span>
            </div>
        `).join('');
    }

    static _animateHeaderStatUpdates(container, stats) {
        stats.forEach((stat, index) => {
            const card = container.children[index];
            if (card) {
                const valueEl = card.querySelector('.stat-value');
                const currentValue = parseInt(valueEl.textContent) || 0;
                
                // Animate number change for header stats (no icon)
                this._animateHeaderValue(valueEl, currentValue, stat.value, 800);
            }
        });
    }

    static _animateHeaderValue(element, start, end, duration) {
        const startTime = performance.now();
        const difference = end - start;
        
        function updateValue(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out cubic)
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(start + (difference * easeOutCubic));
            
            element.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(updateValue);
            }
        }
        
        requestAnimationFrame(updateValue);
    }

    static _createStatCards(container, stats) {
        container.innerHTML = stats.map(stat => `
            <div class="stat-card ${stat.type}">
                <div class="stat-number">${stat.icon} ${stat.value}</div>
                <div class="stat-label">${stat.label}</div>
            </div>
        `).join('');
    }

    static _animateStatUpdates(container, stats) {
        stats.forEach((stat, index) => {
            const card = container.children[index];
            if (card) {
                const numberEl = card.querySelector('.stat-number');
                const currentValue = parseInt(numberEl.textContent.replace(/[^\d]/g, '')) || 0;
                
                // Add counting animation class
                numberEl.classList.add('counting');
                setTimeout(() => numberEl.classList.remove('counting'), 300);
                
                // Animate number change
                this._animateValue(numberEl, currentValue, stat.value, 1000, stat.icon);
            }
        });
    }

    static _animateValue(element, start, end, duration, icon) {
        const startTime = performance.now();
        const difference = end - start;
        
        function updateValue(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function (ease-out cubic)
            const easeOutCubic = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(start + (difference * easeOutCubic));
            
            element.textContent = `${icon} ${current}`;
            
            if (progress < 1) {
                requestAnimationFrame(updateValue);
            }
        }
        
        requestAnimationFrame(updateValue);
    }

    static formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    static calculateTrends(currentData, previousData) {
        if (!previousData) return null;

        const trends = {};
        
        // Calculate message trend
        const currentMessages = (currentData.messageStats || []).reduce((sum, day) => sum + day.count, 0);
        const previousMessages = (previousData.messageStats || []).reduce((sum, day) => sum + day.count, 0);
        trends.messages = this._calculatePercentageChange(currentMessages, previousMessages);
        
        // Calculate command trend
        const currentCommands = (currentData.commandStats || []).reduce((sum, cmd) => sum + cmd.count, 0);
        const previousCommands = (previousData.commandStats || []).reduce((sum, cmd) => sum + cmd.count, 0);
        trends.commands = this._calculatePercentageChange(currentCommands, previousCommands);
        
        return trends;
    }

    static _calculatePercentageChange(current, previous) {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous * 100).toFixed(1);
    }
}
