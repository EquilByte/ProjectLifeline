/**
 * Project Lifeline - Leaflet Map Integration
 */

class MapSystem {
    constructor(containerId) {
        this.mapboxToken = 'pk.eyJ1IjoiZXF1aWxieXRlIiwiYSI6ImNtcHZodHJ4bDI5Y3gycW9uOWtkYWlscmcifQ.B6dPZdr7geBciVinbyu-7w';

        const hcmcBounds = [
            [12, 106],
            [8, 108]
        ];

        this.map = L.map(containerId, {
            maxBounds: hcmcBounds,
            maxBoundsViscosity: 1.0,
            minZoom: 8
        }).setView([10.762622, 106.660172], 12);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.map);

        this.marker = null;
        this.applyHcmcMask();
    }

    async applyHcmcMask() {
        try {
            // Fetch HCMC boundary from Nominatim
            const response = await fetch('https://nominatim.openstreetmap.org/search?q=Ho+Chi+Minh+City,+Vietnam&format=geojson&polygon_geojson=1&limit=1');
            const data = await response.json();

            if (data && data.features && data.features.length > 0) {
                const hcmcFeature = data.features[0];
                const hcmcGeometry = hcmcFeature.geometry;

                // Create a giant world polygon
                const worldCoords = [
                    [
                        [180, 90],
                        [-180, 90],
                        [-180, -90],
                        [180, -90],
                        [180, 90]
                    ]
                ];

                let coordinates = [...worldCoords];

                // Append HCMC boundaries as holes in the world polygon
                if (hcmcGeometry.type === 'Polygon') {
                    coordinates.push(hcmcGeometry.coordinates[0]);
                } else if (hcmcGeometry.type === 'MultiPolygon') {
                    hcmcGeometry.coordinates.forEach(poly => {
                        coordinates.push(poly[0]);
                    });
                }

                const maskGeoJson = {
                    "type": "Feature",
                    "properties": {},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": coordinates
                    }
                };

                L.geoJSON(maskGeoJson, {
                    style: {
                        fillColor: '#808080',
                        fillOpacity: 0.6,
                        color: '#555555', // Border color for HCMC
                        weight: 2
                    }
                }).addTo(this.map);
            }
        } catch (error) {
            console.error("Failed to apply HCMC mask:", error);
        }
    }

    async updateLocation(locationData) {
        if (!locationData) return;
        const hasTextAddress = locationData.street || locationData.ward_district || locationData.landmark || locationData.intersection;
        if (!hasTextAddress && !locationData.plus_code && !locationData.w3w && !locationData.latitude) return;

        if (window.updateLogicCanvas) window.updateLogicCanvas('gis', 'active');

        // 1. Plus Code Decoding
        if (locationData.plus_code && typeof OpenLocationCode !== 'undefined') {
            try {
                const code = locationData.plus_code.replace(/^plus code /i, '').trim();
                const decoded = OpenLocationCode.decode(code);
                locationData.latitude = decoded.latitudeCenter;
                locationData.longitude = decoded.longitudeCenter;
                locationData.landmark = locationData.landmark || `Plus Code: ${code}`;
            } catch (e) {
                console.error("Failed to decode Plus Code:", e);
                locationData.plus_code = null;
            }
        }

        // 2. What3Words Decoding
        if (locationData.w3w && !locationData.latitude) {
            try {
                const w3wKey = "W0Y0EQ0S";
                const w3wWord = locationData.w3w.replace(/\//g, '').trim();
                const res = await fetch(`https://api.what3words.com/v3/convert-to-coordinates?words=${encodeURIComponent(w3wWord)}&key=${w3wKey}`);
                const data = await res.json();

                if (data.coordinates) {
                    locationData.latitude = data.coordinates.lat;
                    locationData.longitude = data.coordinates.lng;
                    locationData.landmark = locationData.landmark || `W3W: ${locationData.w3w}`;
                } else {
                    console.error("W3W API Error:", data);
                    locationData.w3w = null;
                }
            } catch (e) {
                console.error("Failed to decode W3W:", e);
                locationData.w3w = null;
            }
        }

        // 3. If we have exact coordinates (from AI GIS, Plus Code, or W3W), bypass text geocoding
        if (locationData.latitude && locationData.longitude) {
            const lat = parseFloat(locationData.latitude);
            const lon = parseFloat(locationData.longitude);
            if (!isNaN(lat) && !isNaN(lon)) {
                this.map.setView([lat, lon], 17);
                if (this.marker) {
                    this.marker.setLatLng([lat, lon]);
                } else {
                    this.marker = L.marker([lat, lon]).addTo(this.map);
                }
                const label = locationData.landmark || locationData.osm_query || locationData.street || "Vị trí khẩn cấp";
                this.marker.bindPopup(`<b>Incident Location</b><br>${label}`).openPopup();
                if (window.updateLogicCanvas) window.updateLogicCanvas('gis', 'completed');
                return;
            }
        }

        // Build search queries from most specific to least specific
        const queries = [];

        // Always try the pure landmark first to get exact building pins instead of street centers
        if (locationData.landmark) queries.push(`${locationData.landmark}, Ho Chi Minh`);

        if (locationData.osm_query) queries.push(locationData.osm_query);

        const fullAddress = [];
        if (locationData.house_number) fullAddress.push(locationData.house_number);
        if (locationData.street) fullAddress.push(locationData.street);
        if (locationData.ward_district) fullAddress.push(locationData.ward_district);

        if (fullAddress.length === 3) queries.push(fullAddress.join(", ") + ", Ho Chi Minh City");
        if (locationData.street && locationData.landmark) queries.push(`${locationData.landmark}, ${locationData.street}, Ho Chi Minh City`);
        if (locationData.intersection) queries.push(`${locationData.intersection}, Ho Chi Minh City`);
        if (fullAddress.length > 0) queries.push(fullAddress.join(", ") + ", Ho Chi Minh City");
        if (locationData.street && locationData.ward_district) queries.push(`${locationData.street}, ${locationData.ward_district}, Ho Chi Minh City`);
        if (locationData.street) queries.push(`${locationData.street}, Ho Chi Minh City`);
        if (locationData.ward_district) queries.push(`${locationData.ward_district}, Ho Chi Minh City`);

        for (const query of queries) {
            try {
                // Photon Geocoding API (ElasticSearch on OSM data)
                const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`;
                const response = await fetch(url);
                const data = await response.json();

                if (data && data.features && data.features.length > 0) {
                    // Photon returns coordinates in GeoJSON format [lon, lat]
                    const lon = parseFloat(data.features[0].geometry.coordinates[0]);
                    const lat = parseFloat(data.features[0].geometry.coordinates[1]);

                    this.map.setView([lat, lon], 16);

                    if (this.marker) {
                        this.marker.setLatLng([lat, lon]);
                    } else {
                        this.marker = L.marker([lat, lon]).addTo(this.map);
                    }

                    // Add popup to marker
                    this.marker.bindPopup(`<b>Incident Location</b><br>${query}`).openPopup();
                    if (window.updateLogicCanvas) window.updateLogicCanvas('gis', 'completed');
                    return; // Stop once we find a match
                }
            } catch (e) {
                console.warn(`Geocoding failed for query: ${query}`, e);
            }
        }
        if (window.updateLogicCanvas) window.updateLogicCanvas('gis', 'completed');
    }
}
