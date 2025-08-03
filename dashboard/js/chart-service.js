// Chart creation utilities
class ChartService {
    // Common chart constants
    static CHART_CONSTANTS = {
        COLORS: {
            scheme: "category20",
            currentTimeIndicator: "#ff4500",
            heatmapRange: {
                start: "#c6dbf0", // periwinkle blue
                end: "#ff4500"    // orangered
            },
            tooltipBg: "rgba(0,0,0,0.8)",
            borderWhite: "#fff",
            borderDark: "#333",
            textDark: "#333",
            textMuted: "#666",
            textLight: "#999",
            futureCell: "#e6e6e6"
        },
        FONTS: {
            axisLabelSize: 14,
            axisTitleSize: 14,
            legendLabelSize: 15,
            legendTitleSize: 13,
            heatmapLabelSize: 12,
            heatmapSubtitleSize: 11,
            timeIndicatorSize: 10,
            channelLabelSize: 13
        },
        SPACING: {
            titlePadding: 15,
            labelPadding: 8,
            legendPadding: 10,
            legendSymbolSize: 100
        },
        DIMENSIONS: {
            chartHeight: 320,
            commandChartSize: 220,
            channelChartWidth: 450,
            channelChartHeight: 280,
            heatmapCellHeight: 80,
            heatmapSvgHeight: 165
        }
    };

    // Common chart configurations
    static getBaseConfig() {
        const { FONTS, SPACING } = this.CHART_CONSTANTS;
        return {
            "axis": {
                "grid": true, 
                "gridOpacity": 0.3,
                "labelFontSize": FONTS.axisLabelSize,
                "titleFontSize": FONTS.axisTitleSize,
                "titlePadding": SPACING.titlePadding,
                "labelPadding": SPACING.labelPadding
            },
            "legend": {
                "labelFontSize": FONTS.legendLabelSize,
                "titleFontSize": FONTS.legendTitleSize,
                "symbolSize": SPACING.legendSymbolSize,
                "padding": SPACING.legendPadding
            },
            "view": {"stroke": null}
        };
    }

    static getColorScale() {
        return {"scheme": this.CHART_CONSTANTS.COLORS.scheme};
    }

    static createTimelineChart(data, isUpdate = false) {
        
        // Use channel-specific data if available, otherwise fall back to aggregated
        let timeSeriesData = data.timeSeriesByChannel || [];
        let isChannelData = timeSeriesData.length > 0;
        
        // Fallback to aggregated data if no channel data
        if (!isChannelData) {
            timeSeriesData = data.timeSeriesHourly || [];
            isChannelData = false;
        }
        
        
        // If still no data, show empty state
        if (timeSeriesData.length === 0) {
            document.getElementById('timelineChart').innerHTML = '<p style="text-align: center; color: #666; padding: 50px;">No message data available</p>';
            return;
        }

        // For channel data, filter to top 10 channels and enrich with display names
        let processedData = timeSeriesData;
        if (isChannelData) {
            // Get top 10 channels by total message count
            const channelTotals = {};
            timeSeriesData.forEach(d => {
                channelTotals[d.channel_id] = (channelTotals[d.channel_id] || 0) + d.count;
            });
            const topChannels = Object.entries(channelTotals)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10)
                .map(([channelId]) => channelId);
            
            // Filter and enrich data
            const filteredData = timeSeriesData.filter(d => topChannels.includes(d.channel_id));
            processedData = filteredData.map(d => ({
                ...d,
                channel_display: d.channel_name ? `#${d.channel_name}` : `#${d.channel_id.slice(-8)}`
            }));
        }

        const spec = {
            "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
            "data": {"values": processedData},
            "transform": isChannelData ? [
                {
                    "impute": "count",
                    "key": "time",
                    "groupby": ["channel_display"],
                    "value": 0
                }
            ] : [],
            "mark": {
                "type": "line",
                "strokeWidth": 2,
                "point": {"filled": true, "size": 30},
                "interpolate": "cardinal"
            },
            "encoding": {
                "x": {
                    "field": "time",
                    "type": "temporal",
                    "title": "Time",
                    "axis": {"format": "%H:%M", "labelAngle": -45}
                },
                "y": {
                    "field": "count",
                    "type": "quantitative",
                    "title": "Messages",
                    "scale": {"nice": true, "zero": true}
                },
                "color": isChannelData ? {
                    "field": "channel_display",
                    "type": "nominal",
                    "title": "Channel",
                    "scale": this.getColorScale(),
                    "sort": {"field": "count", "op": "sum", "order": "descending"},
                    "legend": {
                        "title": "Channel",
                        "labelFontSize": this.CHART_CONSTANTS.FONTS.legendLabelSize,
                    }
                } : {"value": CONFIG.CHART_COLORS.primary},
                "tooltip": isChannelData ? [
                    {"field": "time", "type": "temporal", "format": "%Y-%m-%d %H:%M"},
                    {"field": "count", "type": "quantitative", "title": "Messages"},
                    {"field": "channel_display", "type": "nominal", "title": "Channel"}
                ] : [
                    {"field": "time", "type": "temporal", "format": "%Y-%m-%d %H:%M"},
                    {"field": "count", "type": "quantitative", "title": "Messages"}
                ]
            },
            "width": "container",
            "height": this.CHART_CONSTANTS.DIMENSIONS.chartHeight,
            "config": this.getBaseConfig()
        };
        
        const embedOptions = { actions: false, renderer: 'svg' };
        
        if (isUpdate) {
            this._animateChartUpdate('#timelineChart', spec, embedOptions);
        } else {
            vegaEmbed('#timelineChart', spec, embedOptions);
        }
    }

    static createChannelChart(data, isUpdate = false) {
        const channelData = (data.channelActivity || []).slice(0, 8);
        const container = d3.select('#channelChart');
        
        if (!isUpdate) {
            container.html('');
        }
        
        const { DIMENSIONS } = this.CHART_CONSTANTS;
        const margin = {top: 25, right: 40, bottom: 50, left: 180};
        const width = DIMENSIONS.channelChartWidth - margin.left - margin.right;
        const height = DIMENSIONS.channelChartHeight - margin.top - margin.bottom;
        
        // Create or update SVG
        let svg = container.select('svg');
        if (svg.empty()) {
            svg = container.append('svg')
                .attr('width', DIMENSIONS.channelChartWidth)
                .attr('height', DIMENSIONS.channelChartHeight);
                
            svg.append('g')
                .attr('class', 'chart-group')
                .attr('transform', `translate(${margin.left},${margin.top})`);
        }
        
        const g = svg.select('.chart-group');
        
        // Scales
        const x = d3.scaleLinear()
            .domain([0, d3.max(channelData, d => d.count) || 1])
            .range([0, width]);
            
        const y = d3.scaleBand()
            .domain(channelData.map(d => d.channel_id))
            .range([0, height])
            .padding(0.1);
        
        const colorScale = d3.scaleOrdinal()
            .domain(channelData.map(d => d.channel_id))
            .range(d3.schemeCategory10);
        
        this._updateBars(g, channelData, x, y, colorScale);
        this._updateLabels(g, channelData, y);
    }

    static createTimelineStackedChart(data, isUpdate = false) {
        const timeSeriesData = data.timeSeriesByChannel || [];
        
        if (timeSeriesData.length === 0) {
            document.getElementById('timelineStackedChart').innerHTML = '<p style="text-align: center; color: #666; padding: 50px;">No channel data available</p>';
            return;
        }

        // Get top 10 channels by total message count
        const channelTotals = {};
        timeSeriesData.forEach(d => {
            channelTotals[d.channel_id] = (channelTotals[d.channel_id] || 0) + d.count;
        });
        const topChannels = Object.entries(channelTotals)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([channelId]) => channelId);
        
        // Filter data to only include top channels
        const filteredData = timeSeriesData.filter(d => topChannels.includes(d.channel_id));

        // Ensure we have display names for channels
        const enrichedData = filteredData.map(d => ({
            ...d,
            channel_display: d.channel_name ? `#${d.channel_name}` : `#${d.channel_id.slice(-8)}`
        }));

        const spec = {
            "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
            "data": {"values": enrichedData},
            "transform": [
                {
                    "impute": "count",
                    "key": "time",
                    "groupby": ["channel_id"],
                    "value": 0
                },
                {
                    "joinaggregate": [{"op": "sum", "field": "count", "as": "total_count"}],
                    "groupby": ["channel_display"]
                }
            ],
            "mark": {
                "type": "area",
                "interpolate": "cardinal"
            },
            "encoding": {
                "x": {
                    "field": "time",
                    "type": "temporal",
                    "title": "Time",
                    "axis": {
                        "tickCount": 24,
                        "labelExpr": "hours(datum.value) == 0 || hours(datum.value) == 12 ? timeFormat(datum.value, '%m/%d %H:%M') : timeFormat(datum.value, '%H:%M')",
                        "labelAngle": -45
                    }
                },
                "y": {
                    "field": "count",
                    "type": "quantitative",
                    "title": "Messages",
                    "scale": {"nice": true, "zero": true}
                },
                "color": {
                    "field": "channel_display",
                    "type": "nominal",
                    "title": "Channel",
                    "scale": this.getColorScale(),
                    "sort": {"field": "total_count", "order": "descending"},
                    "legend": {
                        "title": "Channel",
                        "orient": "right",
                        "labelFontSize": this.CHART_CONSTANTS.FONTS.legendLabelSize,
                    }
                },
                "tooltip": [
                    {"field": "time", "type": "temporal", "format": "%Y-%m-%d %H:%M"},
                    {"field": "count", "type": "quantitative", "title": "Messages"},
                    {"field": "channel_display", "type": "nominal", "title": "Channel"}
                ]
            },
            "width": "container",
            "height": this.CHART_CONSTANTS.DIMENSIONS.chartHeight,
            "config": this.getBaseConfig()
        };

        const embedOptions = { actions: false, renderer: 'svg' };
        
        if (isUpdate) {
            this._animateChartUpdate('#timelineStackedChart', spec, embedOptions);
        } else {
            vegaEmbed('#timelineStackedChart', spec, embedOptions);
        }
    }

    static createCommandChart(data, isUpdate = false) {
        const commandData = (data.commandStats || []).slice(0, 8);
        const { DIMENSIONS, COLORS, FONTS, SPACING } = this.CHART_CONSTANTS;
        
        const spec = {
            "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
            "data": {"values": commandData},
            "mark": {
                "type": "arc", 
                "outerRadius": 100,
                "stroke": COLORS.borderWhite,
                "strokeWidth": 2
            },
            "encoding": {
                "theta": {
                    "field": "count", 
                    "type": "quantitative"
                },
                "color": {
                    "field": "full_command",
                    "type": "nominal",
                    "scale": this.getColorScale(),
                    "legend": {
                        "title": "Commands", 
                        "orient": "left",
                        "labelFontSize": FONTS.legendLabelSize,
                        "titleFontSize": FONTS.legendTitleSize,
                        "symbolSize": SPACING.legendSymbolSize,
                        "padding": SPACING.legendPadding
                    }
                },
                "tooltip": [
                    {"field": "full_command", "title": "Command"},
                    {"field": "count", "title": "Uses"}
                ]
            },
            "width": DIMENSIONS.commandChartSize,
            "height": DIMENSIONS.commandChartSize
        };
        
        if (isUpdate) {
            this._animateChartScale('#commandChart', spec);
        } else {
            vegaEmbed('#commandChart', spec, {actions: false});
        }
    }

    static createHeatmap(data, isUpdate = false) {
        const container = d3.select('#heatmapChart');
        
        if (!isUpdate) {
            container.html('');
        }
        
        const hourlyData = data.hourlyMessages || [];
        const now = new Date();
        const currentLocalHour = now.getHours();
        const currentUtcHour = now.getUTCHours();
        
        // display hours in local time (0-23), lookup is in UTC
        const hours = Array.from({length: 24}, (_, localHour) => {
            // Convert local hour to UTC hour
            const utcHour = ((localHour + (now.getTimezoneOffset() / 60)) % 24 + 24) % 24;
            const utcHourStr = utcHour.toString().padStart(2, '0');
            const found = hourlyData.find(h => h.hour === utcHourStr);
            const isCurrent = localHour === currentLocalHour;
            const isFuture = localHour > currentLocalHour;
            
            return {
                hour: localHour.toString().padStart(2, '0'),
                count: found ? found.count : 0,
                isCurrent,
                isFuture
            };
        });
        
        this._renderHeatmapCells(container, hours, isUpdate);
    }

    // Private helper methods
    static _animateChartUpdate(selector, spec, options) {
        const container = document.querySelector(selector);
        container.style.transition = 'opacity 800ms ease';
        container.style.opacity = '0.7';
        
        setTimeout(() => {
            vegaEmbed(selector, spec, options).then(() => {
                container.style.opacity = '1';
            });
        }, 100);
    }

    static _animateChartScale(selector, spec) {
        const container = document.querySelector(selector);
        container.style.transition = `transform ${CONFIG.ANIMATION_DURATION}ms ease`;
        container.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            vegaEmbed(selector, spec, {actions: false}).then(() => {
                container.style.transform = 'scale(1)';
            });
        }, 100);
    }

    static _updateBars(g, data, x, y, colorScale) {
        const bars = g.selectAll('.bar').data(data, d => d.channel_id);
        
        bars.enter()
            .append('rect')
            .attr('class', 'bar')
            .attr('x', 0)
            .attr('y', d => y(d.channel_id))
            .attr('height', y.bandwidth())
            .attr('width', 0)
            .attr('fill', d => colorScale(d.channel_id))
            .attr('rx', 3)
            .transition()
            .duration(CONFIG.ANIMATION_DURATION)
            .attr('width', d => x(d.count));
        
        bars.transition()
            .duration(CONFIG.ANIMATION_DURATION)
            .attr('width', d => x(d.count))
            .attr('fill', d => colorScale(d.channel_id));
        
        bars.exit()
            .transition()
            .duration(CONFIG.ANIMATION_DURATION)
            .attr('width', 0)
            .remove();
    }

    static _updateLabels(g, data, y) {
        const { FONTS, COLORS } = this.CHART_CONSTANTS;
        
        // Helper function to truncate channel names
        const truncateChannelName = (channelName, maxLength = 15) => {
            if (!channelName) return 'Unknown';
            const name = channelName.startsWith('#') ? channelName.slice(1) : channelName;
            return name.length > maxLength ? `#${name.slice(0, maxLength)}...` : `#${name}`;
        };
        
        const labels = g.selectAll('.label').data(data, d => d.channel_id);
            
        labels.enter()
            .append('text')
            .attr('class', 'label')
            .attr('x', -170)
            .attr('y', d => y(d.channel_id) + y.bandwidth()/2)
            .attr('dy', '0.35em')
            .attr('text-anchor', 'start')
            .attr('font-size', `${FONTS.channelLabelSize}px`)
            .attr('font-weight', '500')
            .attr('fill', COLORS.textDark)
            .text(d => d.channel_name ? truncateChannelName(d.channel_name) : `Channel ${d.channel_id.slice(-6)}`);
            
        labels.text(d => d.channel_name ? truncateChannelName(d.channel_name) : `Channel ${d.channel_id.slice(-6)}`);
        labels.exit().remove();
    }

    static _renderHeatmapCells(container, hours, isUpdate) {
        const { COLORS, DIMENSIONS } = this.CHART_CONSTANTS;
        const maxCount = d3.max(hours, d => d.count) || 1;
        
        // Reddit-style color scale: periwinkle blue to orangered
        const colorScale = d3.scaleSequential()
            .domain([0, maxCount])
            .interpolator(d3.interpolateRgb(COLORS.heatmapRange.start, COLORS.heatmapRange.end))
            .clamp(true);
        
        // Get container width for responsive sizing
        const containerWidth = container.node().getBoundingClientRect().width;
        const cellWidth = Math.max(15, Math.floor((containerWidth - 100) / 24)); // Responsive cell width
        const cellHeight = DIMENSIONS.heatmapCellHeight;
        const svgWidth = containerWidth;
        
        let svg = container.select('svg');
        if (svg.empty()) {
            svg = container.append('svg')
                .attr('width', svgWidth)
                .attr('height', DIMENSIONS.heatmapSvgHeight);
        } else {
            svg.attr('width', svgWidth);
        }
        
        const cells = svg.selectAll('rect').data(hours, d => d.hour);
        
        // Enter new cells with staggered animation
        cells.enter()
            .append('rect')
            .attr('x', (d, i) => i * (cellWidth + 2))
            .attr('y', 25)
            .attr('width', cellWidth)
            .attr('height', cellHeight)
            .attr('fill', COLORS.heatmapRange.start)  // Start with periwinkle blue
            .attr('stroke', d => d.isCurrent ? COLORS.currentTimeIndicator : COLORS.borderWhite)
            .attr('stroke-width', d => d.isCurrent ? 3 : 1)
            .attr('rx', 3)
            .attr('opacity', d => d.isFuture ? 0.3 : 0)
            .transition()
            .duration(CONFIG.ANIMATION_DURATION)
            .delay((d, i) => i * 50)
            .attr('opacity', d => d.isFuture ? 0.3 : 1)
            .attr('fill', d => d.isFuture ? COLORS.futureCell : colorScale(d.count));
        
        // Update existing cells
        cells.transition()
            .duration(CONFIG.ANIMATION_DURATION)
            .attr('fill', d => d.isFuture ? COLORS.futureCell : colorScale(d.count))
            .attr('stroke', d => d.isCurrent ? COLORS.currentTimeIndicator : COLORS.borderWhite)
            .attr('stroke-width', d => d.isCurrent ? 3 : 1)
            .attr('opacity', d => d.isFuture ? 0.3 : 1);
        
        // Add current time indicator
        this._addCurrentTimeIndicator(svg, hours, cellWidth, cellHeight);
        
        // Add interactivity
        this._addHeatmapInteractions(cells, container);
        this._addHeatmapLabels(svg, hours, cellWidth, cellHeight);
    }

    static _addHeatmapInteractions(cells, container) {
        const { COLORS } = this.CHART_CONSTANTS;
        cells.on('mouseover', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('stroke-width', 3)
                .attr('stroke', COLORS.borderDark);
                
            // Show tooltip
            let tooltip = container.select('.tooltip');
            if (tooltip.empty()) {
                tooltip = container.append('div')
                    .attr('class', 'tooltip')
                    .style('position', 'absolute')
                    .style('background', COLORS.tooltipBg)
                    .style('color', 'white')
                    .style('padding', '8px')
                    .style('border-radius', '4px')
                    .style('font-size', '12px')
                    .style('pointer-events', 'none')
                    .style('opacity', 0);
            }
            
            tooltip
                .style('opacity', 1)
                .style('left', (event.offsetX + 10) + 'px')
                .style('top', (event.offsetY - 30) + 'px')
                .html(`
                    <strong>${d.hour}:00</strong><br/>
                    ${d.count} messages<br/>
                    <small>${d.isCurrent ? '(current hour)' : d.isFuture ? '(future)' : '(past 24h)'}</small>
                `);
        })
        .on('mouseout', function() {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('stroke-width', 1)
                .attr('stroke', COLORS.borderWhite);
                
            container.select('.tooltip').style('opacity', 0);
        });
    }

    static _addCurrentTimeIndicator(svg, hours, cellWidth, cellHeight) {
        const { COLORS, FONTS } = this.CHART_CONSTANTS;
        const currentHour = new Date().getHours();
        const currentHourData = hours.find(h => parseInt(h.hour) === currentHour);
        
        if (currentHourData) {
            const x = currentHour * (cellWidth + 2) + cellWidth/2;

            // Add "NOW" label above current hour
            svg.selectAll('.current-time-label').remove();
            svg.append('text')
                .attr('class', 'current-time-label')
                .attr('x', x)
                .attr('y', 18)
                .attr('text-anchor', 'middle')
                .attr('font-size', `${FONTS.timeIndicatorSize}px`)
                .attr('font-weight', 'bold')
                .attr('fill', COLORS.currentTimeIndicator)
                .text('NOW');
        }
    }

    static _addHeatmapLabels(svg, hours, cellWidth, cellHeight) {
        const { FONTS, COLORS } = this.CHART_CONSTANTS;
        const labels = svg.selectAll('.hour-label')
            .data(hours.filter((d, i) => i % 3 === 0), d => d.hour);
            
        labels.enter()
            .append('text')
            .attr('class', 'hour-label')
            .attr('x', (d, i) => (hours.indexOf(d)) * (cellWidth + 2) + cellWidth/2)
            .attr('y', cellHeight + 55)
            .attr('text-anchor', 'middle')
            .attr('font-size', `${FONTS.heatmapLabelSize}px`)
            .attr('font-weight', '500')
            .attr('fill', d => d.isCurrent ? COLORS.currentTimeIndicator : COLORS.textMuted)
            .text(d => {
                const hour = parseInt(d.hour);
                return hour === 0 ? '12AM' : hour === 12 ? '12PM' : hour > 12 ? `${hour-12}PM` : `${hour}AM`;
            });
    }
}
