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
    detailCardOpen: false,

    demoData: [
        {
            type: 'volunteers', lat: 43.3020, lng: 68.2520,
            title: 'Amit K.',
            location: 'Available • 1.2 km',
            severity: null, icon: 'user-check', time: 'Online',
            photo: 'images/map/volunteer_amit.png',
            description: 'Certified first-aid responder and community volunteer with 3 years of experience in disaster relief coordination. Specializes in flood rescue operations and evacuation assistance.',
            rating: 4.8,
            slogan: '"Ready to serve, anytime, anywhere"'
        },
        {
            type: 'volunteers', lat: 43.2980, lng: 68.2460,
            title: 'Priya M.',
            location: 'Available • 0.8 km',
            severity: null, icon: 'user', time: 'Online',
            photo: 'images/map/volunteer_priya.png',
            description: 'Environmental activist and trained community health worker. Experienced in organizing neighborhood clean-up drives, first-aid support, and elderly assistance programs.',
            rating: 4.9,
            slogan: '"Building stronger communities, one step at a time"'
        },
        {
            type: 'volunteers', lat: 43.3060, lng: 68.2580,
            title: 'Raj S.',
            location: 'On Task • 2.5 km',
            severity: null, icon: 'person-standing', time: 'Busy',
            photo: 'images/map/volunteer_raj.png',
            description: 'Construction safety specialist and emergency response volunteer. Currently assisting with fallen tree clearance. Skilled in operating heavy equipment and structural damage assessment.',
            rating: 4.6,
            slogan: '"No task too big when lives are at stake"'
        },
        {
            type: 'services', lat: 43.3080, lng: 68.2420,
            title: 'Fire Station #12',
            location: 'Turkestan Central',
            severity: null, icon: 'flame', time: '24/7',
            photo: 'images/map/fire_station.png',
            description: 'Turkestan Central Fire Station serves the entire metropolitan area. Equipped with 4 fire engines, 2 ladder trucks, and a hazmat response unit. Average response time: 6 minutes. Handles fire emergencies, gas leaks, building collapses, and rescue operations.'
        },
        {
            type: 'services', lat: 43.2940, lng: 68.2620,
            title: 'Police Station - Central',
            location: 'Esim Khan Ave, Turkestan',
            severity: null, icon: 'shield', time: '24/7',
            photo: 'images/map/police_station.png',
            description: 'Central Police Station covers Turkestan city districts. Staffed with rapid response units. Handles law enforcement, traffic management, and community safety programs. Emergency dial: 102.'
        },
        {
            type: 'services', lat: 43.3010, lng: 68.2380,
            title: 'City Hospital',
            location: 'Tauke Khan Ave, Turkestan',
            severity: null, icon: 'cross', time: 'Open',
            photo: 'images/map/city_hospital.png',
            description: 'Turkestan City Hospital is a multi-specialty facility with a Level-2 trauma center. Services include 24/7 emergency care, ICU, surgery, orthopedics, and pediatrics. Ambulance fleet of 6 vehicles.'
        },
    ],

    // Light theme: clean, minimal, hides all POI noise
    lightTheme: [
        { featureType: "poi", stylers: [{ visibility: "off" }] },
        { featureType: "poi.park", stylers: [{ visibility: "simplified" }] },
        { featureType: "poi.park", elementType: "labels", stylers: [{ visibility: "off" }] },
        { featureType: "transit", stylers: [{ visibility: "off" }] },
        { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9e8f7" }] },
        { featureType: "road.highway", elementType: "geometry.fill", stylers: [{ color: "#e8e8e8" }] },
        { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#d4d4d4" }] },
        { featureType: "landscape.man_made", elementType: "geometry.fill", stylers: [{ color: "#f5f5f5" }] },
    ],

    darkTheme: [
        { elementType: "geometry", stylers: [{ color: "#111827" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#111827" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
        { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d1d5db" }] },
        // Hide all POI noise
        { featureType: "poi", stylers: [{ visibility: "off" }] },
        { featureType: "poi.park", stylers: [{ visibility: "simplified" }] },
        { featureType: "poi.park", elementType: "labels", stylers: [{ visibility: "off" }] },
        { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#064e3b" }] },
        // Hide transit
        { featureType: "transit", stylers: [{ visibility: "off" }] },
        // Road styling
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#1f2937" }] },
        { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#374151" }] },
        { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
        { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
        { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#374151" }] },
        { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#4b5563" }] },
        { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#d1d5db" }] },
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
            center: { lat: 43.3000, lng: 68.2500 },
            zoom: 13,
            disableDefaultUI: true,
            styles: isDark ? this.darkTheme : this.lightTheme
        });

        // "You are here" marker - only show if permission is granted
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const pos = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    
                    this.youMarker = new google.maps.Marker({
                        position: pos,
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
                        this.showLocationTooltip('📍 You are here', 'Your current location');
                    });
                    
                    // Optionally center map on user
                    this.map.setCenter(pos);
                },
                (error) => {
                    console.log('Geolocation permission denied or failed:', error.message);
                    // Do not create the marker
                }
            );
        }

        this.loadAllMarkers();

        console.log('  🗺️ Live Map initialized (Google Maps)');
    },

    show: function() {
        if (!this.map) {
            this.init();
        } else {
            setTimeout(() => {
                google.maps.event.trigger(this.map, 'resize');
                this.map.setCenter({ lat: 43.3000, lng: 68.2500 });
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
                        fromDB: true,
                        photo: r.image_url || '',
                        description: r.description || 'Report submitted by a community member. Details are being verified by the response team.'
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

            // Highlight the clicked marker with a bounce
            const marker = this.markers.find(m => m._dataIndex === index);
            if (marker) {
                marker.setAnimation(google.maps.Animation.BOUNCE);
                setTimeout(() => marker.setAnimation(null), 1500);
            }

            // Show the beautiful detail card
            this.showDetailCard(d);

            if (window.innerWidth < 1024) {
                const panel = document.getElementById('map-incident-panel');
                if (panel) panel.classList.add('collapsed');
            }
        }
    },

    showDetailCard: function(d) {
        const card = document.getElementById('map-detail-card');
        if (!card) return;

        // Set photo
        const photoEl = document.getElementById('mdc-photo');
        if (d.photo) {
            photoEl.src = d.photo;
            photoEl.style.display = 'block';
            document.querySelector('.mdc-photo-wrap').style.display = 'block';
        } else {
            document.querySelector('.mdc-photo-wrap').style.display = 'none';
        }

        // Set type badge
        const typeBadge = document.getElementById('mdc-type-badge');
        const typeLabels = { incidents: 'Incident', volunteers: 'Volunteer', services: 'Service' };
        const typeIcons = { incidents: 'alert-triangle', volunteers: 'heart-handshake', services: 'building-2' };
        typeBadge.innerHTML = `<i data-lucide="${typeIcons[d.type] || 'info'}"></i> ${typeLabels[d.type] || 'Info'}`;
        typeBadge.className = `mdc-type-badge mdc-type-${d.type}`;

        // Set title
        document.getElementById('mdc-title').textContent = d.title;

        // Set severity
        const sevEl = document.getElementById('mdc-severity');
        if (d.severity) {
            sevEl.textContent = d.severity;
            sevEl.className = `mdc-severity mdc-sev-${d.severity.toLowerCase()}`;
            sevEl.style.display = 'inline-flex';
        } else {
            sevEl.style.display = 'none';
        }

        // Set location
        const locEl = document.getElementById('mdc-location');
        locEl.querySelector('span').textContent = d.location;

        // Set description
        const descEl = document.getElementById('mdc-description');
        let descText = d.description || '';
        if (d.slogan) {
            descText = d.slogan + '\n\n' + descText;
        }
        descEl.textContent = descText;

        // Set time
        document.getElementById('mdc-time').textContent = d.time;

        // Set rating (for volunteers)
        const ratingItem = document.getElementById('mdc-rating-item');
        if (d.rating) {
            ratingItem.style.display = 'flex';
            document.getElementById('mdc-rating').textContent = `${d.rating} / 5.0`;
        } else {
            ratingItem.style.display = 'none';
        }

        // Show card with animation
        card.style.display = 'flex';
        requestAnimationFrame(() => {
            card.classList.add('active');
        });
        this.detailCardOpen = true;

        // Re-render lucide icons inside the card
        if (window.lucide) lucide.createIcons();
    },

    closeDetailCard: function() {
        const card = document.getElementById('map-detail-card');
        if (!card) return;
        card.classList.remove('active');
        setTimeout(() => {
            card.style.display = 'none';
        }, 350);
        this.detailCardOpen = false;
    },

    showLocationTooltip: function(title, subtitle) {
        // Simple non-intrusive tooltip for "you are here" etc.
        const card = document.getElementById('map-detail-card');
        if (!card) return;

        document.querySelector('.mdc-photo-wrap').style.display = 'none';
        document.getElementById('mdc-title').textContent = title;
        document.getElementById('mdc-severity').style.display = 'none';
        document.getElementById('mdc-location').querySelector('span').textContent = subtitle;
        document.getElementById('mdc-description').textContent = '';
        document.getElementById('mdc-time').textContent = 'Now';
        document.getElementById('mdc-rating-item').style.display = 'none';
        
        const typeBadge = document.getElementById('mdc-type-badge');
        typeBadge.innerHTML = '<i data-lucide="navigation"></i> Location';
        typeBadge.className = 'mdc-type-badge mdc-type-services';

        card.style.display = 'flex';
        requestAnimationFrame(() => {
            card.classList.add('active');
        });
        this.detailCardOpen = true;
        if (window.lucide) lucide.createIcons();
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
            this.map.setOptions({ styles: isDark ? this.darkTheme : this.lightTheme });
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
            icon: iconMap[reportData.category] || 'alert-circle', time: 'Just now', fromDB: true,
            photo: '',
            description: reportData.description || 'New incident report submitted by a community member.'
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
