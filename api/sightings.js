const { put, list } = require('@vercel/blob');

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        if (req.method === 'GET') {
            const sightings = await readSightings();
            return res.status(200).json(sightings);
        }

        if (req.method === 'POST') {
            const sighting = req.body;
            sighting.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
            sighting.createdAt = new Date().toISOString();

            const sightings = await readSightings();
            sightings.unshift(sighting);

            await put('sightings.json', JSON.stringify(sightings), {
                access: 'public',
                addRandomSuffix: false,
            });

            return res.status(201).json(sighting);
        }

        return res.status(405).json({ error: 'Método não permitido' });
    } catch (error) {
        console.error('API error:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
};

async function readSightings() {
    try {
        const { blobs } = await list({ prefix: 'sightings.json' });
        if (blobs.length === 0) return [];
        const response = await fetch(blobs[0].url);
        return await response.json();
    } catch {
        return [];
    }
}
