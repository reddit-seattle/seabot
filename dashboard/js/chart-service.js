// Chart creation utilities
class ChartService {
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
        
        const spec = {
            "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
            "data": {"values": timeSeriesData},
            "transform": isChannelData ? [
                {
                    "impute": "count",
                    "key": "time",
                    "groupby": ["channel_name"],
                    "value": 0
                }
            ] : [],
            "mark": {
                "type": "line",
                "strokeWidth": 2,
                "point": {"filled": true, "size": 30},
                "interpolate": "linear"
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
                    "field": "channel_name",
                    "type": "nominal",
                    "title": "Channel",
                    "scale": {
                        "scheme": "category20"
                    },
                    "legend": {
                        "title": "Channels",
                        "labelExpr": "datum.label ? '#' + datum.label : '#unknown'"
                    }
                } : {"value": CONFIG.CHART_COLORS.primary},
                "tooltip": isChannelData ? [
                    {"field": "time", "type": "temporal", "format": "%Y-%m-%d %H:%M"},
                    {"field": "count", "type": "quantitative", "title": "Messages"},
                    {"field": "channel_name", "type": "nominal", "title": "Channel"}
                ] : [
                    {"field": "time", "type": "temporal", "format": "%Y-%m-%d %H:%M"},
                    {"field": "count", "type": "quantitative", "title": "Messages"}
                ]
            },
            "width": "container",
            "height": 300,
            "config": {
                "axis": {"grid": true, "gridOpacity": 0.3},
                "view": {"stroke": null}
            }
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
        
        const margin = {top: 20, right: 30, bottom: 40, left: 150};
        const width = 400 - margin.left - margin.right;
        const height = 250 - margin.top - margin.bottom;
        
        // Create or update SVG
        let svg = container.select('svg');
        if (svg.empty()) {
            svg = container.append('svg')
                .attr('width', 400)
                .attr('height', 250);
                
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

    static createDistributionChart(data, isUpdate = false) {
        const timeSeriesData = data.timeSeriesByChannel || [];
        
        if (timeSeriesData.length === 0) {
            document.getElementById('distributionChart').innerHTML = '<p style="text-align: center; color: #666; padding: 50px;">No channel distribution data available</p>';
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
                }
            ],
            "mark": {
                "type": "area",
                "interpolate": "monotone"
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
                    "scale": {"scheme": "category20"},
                    "legend": {
                        "title": "Channel",
                        "orient": "right"
                    }
                },
                "tooltip": [
                    {"field": "time", "type": "temporal", "format": "%Y-%m-%d %H:%M"},
                    {"field": "count", "type": "quantitative", "title": "Messages"},
                    {"field": "channel_display", "type": "nominal", "title": "Channel"}
                ]
            },
            "width": "container",
            "height": 300,
            "config": {
                "axis": {"grid": true, "gridOpacity": 0.3},
                "view": {"stroke": null}
            }
        };

        const embedOptions = { actions: false, renderer: 'svg' };
        
        if (isUpdate) {
            this._animateChartUpdate('#distributionChart', spec, embedOptions);
        } else {
            vegaEmbed('#distributionChart', spec, embedOptions);
        }
    }

    static createCommandChart(data, isUpdate = false) {
        const commandData = (data.commandStats || []).slice(0, 8);
        
        const spec = {
            "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
            "data": {"values": commandData},
            "mark": {
                "type": "arc", 
                "outerRadius": 100,
                "stroke": "#fff",
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
                    "scale": {"scheme": "category20"},
                    "legend": {"title": "Commands", "orient": "right"}
                },
                "tooltip": [
                    {"field": "full_command", "title": "Command"},
                    {"field": "count", "title": "Uses"}
                ]
            },
            "width": 200,
            "height": 200
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
        const hours = Array.from({length: 24}, (_, i) => {
            const hour = i.toString().padStart(2, '0');
            const found = hourlyData.find(h => h.hour === hour);
            return {
                hour: hour,
                count: found ? found.count : 0
            };
        });
        
        this._renderHeatmapCells(container, hours, isUpdate);
    }

    // Private helper methods
    static _animateChartUpdate(selector, spec, options) {
        const container = document.querySelector(selector);
        container.style.transition = `opacity ${CONFIG.ANIMATION_DURATION}ms ease`;
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
        const labels = g.selectAll('.label').data(data, d => d.channel_id);
            
        labels.enter()
            .append('text')
            .attr('class', 'label')
            .attr('x', -5)
            .attr('y', d => y(d.channel_id) + y.bandwidth()/2)
            .attr('dy', '0.35em')
            .attr('text-anchor', 'end')
            .attr('font-size', '11px')
            .attr('fill', '#333')
            .text(d => d.channel_name ? `#${d.channel_name}` : `Channel ${d.channel_id.slice(-6)}`);
            
        labels.text(d => d.channel_name ? `#${d.channel_name}` : `Channel ${d.channel_id.slice(-6)}`);
        labels.exit().remove();
    }

    static _renderHeatmapCells(container, hours, isUpdate) {
        const maxCount = d3.max(hours, d => d.count) || 1;
        
        // Reddit-style color scale: periwinkle blue (#c6dbf0) to orangered (#ff4500)
        const colorScale = d3.scaleSequential()
            .domain([0, maxCount])
            .interpolator(d3.interpolateRgb("#c6dbf0", "#ff4500"))
            .clamp(true);
        
        // Get container width for responsive sizing
        const containerWidth = container.node().getBoundingClientRect().width;
        const cellWidth = Math.max(15, Math.floor((containerWidth - 100) / 24)); // Responsive cell width
        const cellHeight = 80;
        const svgWidth = containerWidth;
        
        let svg = container.select('svg');
        if (svg.empty()) {
            svg = container.append('svg')
                .attr('width', svgWidth)
                .attr('height', 120);
        } else {
            svg.attr('width', svgWidth);
        }
        
        const cells = svg.selectAll('rect').data(hours, d => d.hour);
        
        // Enter new cells with staggered animation
        cells.enter()
            .append('rect')
            .attr('x', (d, i) => i * (cellWidth + 2))
            .attr('y', 10)
            .attr('width', cellWidth)
            .attr('height', cellHeight)
            .attr('fill', '#c6dbf0')  // Start with periwinkle blue
            .attr('stroke', '#fff')
            .attr('stroke-width', 1)
            .attr('rx', 3)
            .attr('opacity', 0)
            .transition()
            .duration(CONFIG.ANIMATION_DURATION)
            .delay((d, i) => i * 50)
            .attr('opacity', 1)
            .attr('fill', d => colorScale(d.count));
        
        // Update existing cells
        cells.transition()
            .duration(CONFIG.ANIMATION_DURATION)
            .attr('fill', d => colorScale(d.count));
        
        // Add interactivity
        this._addHeatmapInteractions(cells, container);
        this._addHeatmapLabels(svg, hours, cellWidth, cellHeight);
    }

    static _addHeatmapInteractions(cells, container) {
        cells.on('mouseover', function(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('stroke-width', 3)
                .attr('stroke', '#333');
                
            // Show tooltip
            let tooltip = container.select('.tooltip');
            if (tooltip.empty()) {
                tooltip = container.append('div')
                    .attr('class', 'tooltip')
                    .style('position', 'absolute')
                    .style('background', 'rgba(0,0,0,0.8)')
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
                .text(`${d.hour}:00 - ${d.count} messages`);
        })
        .on('mouseout', function() {
            d3.select(this)
                .transition()
                .duration(200)
                .attr('stroke-width', 1)
                .attr('stroke', '#fff');
                
            container.select('.tooltip').style('opacity', 0);
        });
    }

    static _addHeatmapLabels(svg, hours, cellWidth, cellHeight) {
        const labels = svg.selectAll('text')
            .data(hours.filter((d, i) => i % 3 === 0), d => d.hour);
            
        labels.enter()
            .append('text')
            .attr('x', (d, i) => (hours.indexOf(d)) * (cellWidth + 2) + cellWidth/2)
            .attr('y', cellHeight + 35)
            .attr('text-anchor', 'middle')
            .attr('font-size', '10px')
            .attr('fill', '#666')
            .text(d => d.hour);
    }
}
