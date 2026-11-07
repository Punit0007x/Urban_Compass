const fs = require('fs');
const https = require('https');
const path = require('path');

const query = `[out:json][timeout:25];
area["name:en"="Karnataka"]["admin_level"="4"]->.searchArea;
(
  node["place"~"city|town"](area.searchArea);
);
out 400;`;

const req = https.request('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      const elements = parsed.elements || [];
      const places = elements.map(e => ({
        name: (e.tags && (e.tags['name:en'] || e.tags.name)) || 'Unknown',
        lat: e.lat,
        lng: e.lon
      })).filter(p => p.name !== 'Unknown');
      
      let existing = [];
      const placesPath = path.join(__dirname, 'public', 'places.json');
      if (fs.existsSync(placesPath)) {
        existing = JSON.parse(fs.readFileSync(placesPath));
      }
      
      const allPlaces = [...existing, ...places];
      const uniquePlaces = Array.from(new Map(allPlaces.map(item => [item.name, item])).values());
      
      fs.writeFileSync(placesPath, JSON.stringify(uniquePlaces));
      console.log('Total places combined:', uniquePlaces.length);
    } catch(e) {
      console.error('Error parsing response:', e.message);
      process.exit(1);
    }
  });
});
req.write('data=' + encodeURIComponent(query));
req.end();
