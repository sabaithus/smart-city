// public/js/map.js
// ============================================================
// ISOLATED MAP MODULE — Smart City Live Map (Google Maps)
// ============================================================

const SmartCityMap = {

    map: null,
    markers: [],
    markerData: [],
    currentFilter: 'all',
    youMarker: null,
    infoWindow: null,

    demoData: [
        { type: 'incidents', lat: 12.9750, lng: 77.5890, title: 'Flooding near Main St.', location: 'MG Road, Central Mall', severity: 'HIGH', icon: 'droplets', time: '10 min ago' },
        { type: 'incidents', lat: 12.9620, lng: 77.6010, title: 'Fallen Tree Blocking Road', location: 'Indiranagar Park', severity: 'MED', icon: 'tree-pine', time: '45 min ago' },
        { type: 'incidents', lat: 12.9510, lng: 77.5760, title: 'Gas Leak Reported', location: 'Jayanagar 5th Block', severity: 'HIGH', icon: 'alert-triangle', time: '5 min ago' },
        { type: 'incidents', lat: 12.9830, lng: 77.5950, title: 'Pothole on Highway', location: 'Bellary Road', severity: 'LOW', icon: 'alert-circle', time: '2 hrs ago' },
        { type: 'volunteers', lat: 12.9710, lng: 77.5960, title: 'Amit K.', location: 'Available • 1.2 km', severity: null, icon: 'user-check', time: 'Online' },
        { type: 'volunteers', lat: 12.9680, lng: 77.5830, title: 'Priya M.', location: 'Available • 0.8 km', severity: null, icon: 'user', time: 'Online' },
        { type: 'volunteers', lat: 12.9560, lng: 77.5910, title: 'Raj S.', location: 'On Task • 2.5 km', severity: null, icon: 'person-standing', time: 'Busy' },
        { type: 'services', lat: 12.9790, lng: 77.5720, title: 'Fire Station #12', location: 'Rajajinagar', severity: null, icon: 'flame', time: '24/7' },
        { type: 'services', lat: 12.9600, lng: 77.6100, title: 'Police Station - HAL', location: 'HAL Airport Road', severity: null, icon: 'shield', time: '24/7' },
        { type: 'services', lat: 12.9550, lng: 77.5680, title: 'City Hospital', location: 'BSK 2nd Stage', severity: null, icon: 'cross', time: 'Open' },
    ],

    darkTheme: [
        { elementType: "geometry", stylers: [{ color: "#111827" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#111827" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
        { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d1d5db" }] },
        { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
        { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#064e3b" }] },
        { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#34d399" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#1f2937" }] },
        { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#374151" }] },
        { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
        { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#374151" }] },
        { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#4b5563" }] },
        { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#d1d5db" }] },
        { featureType: "transit", elementType: "geometry", stylers: [{ color: "#1f2937" }] },
        { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#030712" }] },
        { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#4b5563" }] },
        { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#030712" }] }
    ],

    init: function() {
        const mapEl = document.getElementById('smart-map');
        if (!mapEl || !window.google || !window.google.maps) return;

        if (this.map) {
            google.maps.event.trigger(this.map, 'resize');
            return;
        }

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        
        this.map = new google.maps.Map(mapEl, {
            center: { lat: 12.9716, lng: 77.5946 },
            zoom: 13,
            disableDefaultUI: true,
            styles: isDark ? this.darkTheme : []
        });

        this.infoWindow = new google.maps.InfoWindow();

        // "You are here" marker
        this.youMarker = new google.maps.Marker({
            position: { lat: 12.9716, lng: 77.5946 },
            map: this.map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                fillColor: '#8b5cf6',
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: 'white',
                scale: 8
            },
            title: 'You are here'
        });

        this.youMarker.addListener('click', () => {
            this.infoWindow.setContent('<div class="custom-popup" style="color:black;padding:5px;"><h4>📍 You are here</h4><p>Bengaluru, Karnataka</p></div>');
            this.infoWindow.open(this.map, this.youMarker);
        });

        this.loadAllMarkers();

        console.log('  🗺️ Live Map initialized (Google Maps)');
    },

    show: function() {
        if (!this.map) {
            this.init();
        } else {
            setTimeout(() => {
                google.maps.event.trigger(this.map, 'resize');
                this.map.setCenter({ lat: 12.9716, lng: 77.5946 });
                this.map.setZoom(13);
            }, 100);
        }
    },

    loadAllMarkers: async function() {
        this.markerData = [...this.demoData];
        try {
            const res = await fetch('/api/map/markers');
            if (res.ok) {
                const reports = await res.json();
                const iconMap = {
                    fire: 'flame', flooding: 'droplets', 'road hazard': 'construction',
                    accident: 'car', 'power outage': 'zap', medical: 'cross',
                    crime: 'shield-alert', other: 'alert-circle'
                };
                reports.forEach(r => {
                    this.markerData.push({
                        type: 'incidents', lat: r.latitude, lng: r.longitude,
                        title: r.title || r.category, location: r.location || 'Reported location',
                        severity: r.severity === 'high' ? 'HIGH' : r.severity === 'medium' ? 'MED' : 'LOW',
                        icon: iconMap[r.category] || 'alert-circle', time: SmartCityMap.formatTime(r.created_at),
                        fromDB: true
                    });
                });
            }
        } catch (e) {}

        this.addMarkers();
        this.populatePanel();
    },

    addMarkers: function() {
        if (!this.map) return;
        
        this.markers.forEach(m => m.setMap(null));
        this.markers = [];
        if (this.infoWindow) this.infoWindow.close();

        const colorMap = { incidents: '#ef4444', volunteers: '#10b981', services: '#3b82f6' };

        this.markerData.forEach((d, index) => {
            if (this.currentFilter !== 'all' && d.type !== this.currentFilter) return;

            const color = colorMap[d.type] || '#3b82f6';
            
            const marker = new google.maps.Marker({
                position: { lat: d.lat, lng: d.lng },
                map: this.map,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: color,
                    fillOpacity: 0.9,
                    strokeWeight: 2,
                    strokeColor: 'white',
                    scale: 8
                }
            });

            marker.addListener('click', () => {
                this.focusMarker(index);
            });

            marker._dataIndex = index;
            this.markers.push(marker);
        });
    },

    filterMap: function(filter, btnEl) {
        document.querySelectorAll('.map-filter').forEach(b => b.classList.remove('active'));
        if (btnEl) btnEl.classList.add('active');
        this.currentFilter = filter;
        this.addMarkers();
        this.populatePanel();
    },

    populatePanel: function() {
        const list = document.getElementById('map-panel-list');
        const count = document.getElementById('map-panel-count');
        if (!list) return;

        const filtered = this.markerData.filter(d => this.currentFilter === 'all' || d.type === this.currentFilter);
        if (count) count.textContent = `${filtered.length} events`;

        list.innerHTML = filtered.map((d, i) => {
            const originalIndex = this.markerData.indexOf(d);
            const iconClass = d.type === 'incidents' ? 'mpi-icon-red' : d.type === 'volunteers' ? 'mpi-icon-teal' : 'mpi-icon-blue';
            const badgeClass = d.severity === 'HIGH' ? 'mpi-badge-high' : d.severity === 'MED' ? 'mpi-badge-medium' : d.severity === 'LOW' ? 'mpi-badge-low' : '';
            return `<div class="map-panel-item" onclick="SmartCityMap.focusMarker(${originalIndex})">
                <div class="mpi-icon ${iconClass}"><i data-lucide="${d.icon}"></i></div>
                <div class="mpi-info"><h5>${d.title}</h5><p>${d.location}</p></div>
                ${d.severity ? `<span class="mpi-badge ${badgeClass}">${d.severity}</span>` : `<span style="font-size:0.7rem;color:var(--text-gray);">${d.time}</span>`}
            </div>`;
        }).join('');

        if (window.lucide) lucide.createIcons();
    },

    focusMarker: function(index) {
        const d = this.markerData[index];
        if (d && this.map) {
            this.map.setCenter({ lat: d.lat, lng: d.lng });
            this.map.setZoom(16);
            
            const severityHtml = d.severity ? `<span style="background:${d.severity === 'HIGH' ? '#ef4444' : d.severity === 'MED' ? '#f97316' : '#22c55e'};color:white;padding:2px 6px;border-radius:4px;font-size:0.7rem;font-weight:700;">${d.severity}</span>` : '';
            const popupHtml = `<div class="custom-popup" style="color:black;padding:5px;min-width:180px;">
                <h4 style="margin:0 0 5px;font-size:0.95rem;">${d.title}</h4>
                <p style="margin:0 0 8px;font-size:0.8rem;color:#6b7280;">${d.location}</p>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-size:0.75rem;color:#9ca3af;">${d.time}</span>
                    ${severityHtml}
                </div>
            </div>`;

            // Find the specific marker
            const marker = this.markers.find(m => m._dataIndex === index);
            if (marker) {
                this.infoWindow.setContent(popupHtml);
                this.infoWindow.open(this.map, marker);
            }

            if (window.innerWidth < 1024) {
                const panel = document.getElementById('map-incident-panel');
                if (panel) panel.classList.add('collapsed');
            }
        }
    },

    togglePanel: function() {
        const panel = document.getElementById('map-incident-panel');
        if (panel) panel.classList.toggle('collapsed');
    },

    searchLocation: async function() {
        const input = document.getElementById('map-search-input');
        const query = input ? input.value.trim() : '';
        if (!query || !this.map) return;

        const btn = document.querySelector('.map-search .search-btn');
        if (btn) { btn.textContent = '...'; btn.disabled = true; }

        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
            const data = await res.json();
            
            if (btn) { btn.textContent = 'Go'; btn.disabled = false; }
            
            if (data && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                const loc = { lat, lng };
                
                this.map.setCenter(loc);
                this.map.setZoom(14);
                
                if (this.youMarker) {
                    this.youMarker.setPosition(loc);
                    this.infoWindow.setContent('<div class="custom-popup" style="color:black;padding:5px;"><h4>📍 Searched Location</h4><p style="font-size:11px;">' + data[0].display_name + '</p></div>');
                    this.infoWindow.open(this.map, this.youMarker);
                }

                // Update demo markers to reflect the new city
                this.markerData.forEach(d => {
                    if (!d.fromDB) {
                        d.lat = lat + (Math.random() - 0.5) * 0.05;
                        d.lng = lng + (Math.random() - 0.5) * 0.05;
                        const cityName = data[0].name || data[0].display_name.split(',')[0];
                        d.location = "Near " + cityName;
                    }
                });
                this.addMarkers();
                this.populatePanel();
            } else {
                alert('Location not found. Try a different search term.');
            }
        } catch (e) {
            if (btn) { btn.textContent = 'Go'; btn.disabled = false; }
            alert('Search failed. Please check your connection.');
        }
    },

    zoomIn: function() {
        if (this.map) this.map.setZoom(this.map.getZoom() + 1);
    },

    zoomOut: function() {
        if (this.map) this.map.setZoom(this.map.getZoom() - 1);
    },

    updateTheme: function() {
        if (this.map) {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            this.map.setOptions({ styles: isDark ? this.darkTheme : [] });
        }
    },

    addReportMarker: function(reportData) {
        if (!reportData || !reportData.lat || !reportData.lng) return;
        const iconMap = { fire: 'flame', flooding: 'droplets', 'road hazard': 'construction', accident: 'car', 'power outage': 'zap', other: 'alert-circle' };
        this.markerData.push({
            type: 'incidents', lat: reportData.lat, lng: reportData.lng,
            title: reportData.title || reportData.category || 'New Report',
            location: reportData.address || 'Reported location',
            severity: reportData.severity === 'high' ? 'HIGH' : reportData.severity === 'medium' ? 'MED' : 'LOW',
            icon: iconMap[reportData.category] || 'alert-circle', time: 'Just now', fromDB: true
        });
        if (this.map) {
            this.addMarkers();
            this.populatePanel();
        }
    },

    formatTime: function(isoString) {
        if (!isoString) return 'Unknown';
        const date = new Date(isoString);
        const diffMin = Math.floor((new Date() - date) / 60000);
        if (diffMin < 1) return 'Just now';
        if (diffMin < 60) return `${diffMin} min ago`;
        const diffHrs = Math.floor(diffMin / 60);
        if (diffHrs < 24) return `${diffHrs} hr${diffHrs > 1 ? 's' : ''} ago`;
        return date.toLocaleDateString();
    }
};

window.SmartCityMap = SmartCityMap;
