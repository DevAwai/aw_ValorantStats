const { API } = require("vandal.js");

class ExtendedAPI extends API {
    constructor(username, tag) {
        super(username, tag);
    }

    async matches(options = {}) {
        const { type = 'competitive', season = '', agent = 'all', map = 'all', raw = false } = options;

        const url = `https://api.tracker.gg/api/v2/valorant/standard/matches/riot/${this.username}%23${this.tag}?type=${type}&season=${season}&agent=${agent}&map=${map}`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Chrome/121',
            },
        });

        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();

        if (raw) {
            return data.data.matches;
        }

        const matches = data.data.matches.map((match) => ({
            id: match.attributes.id,
            map: match.attributes.mapId,
            timestamp: match.attributes.timestamp,
            mode: match.metadata.mode,
            duration: match.metadata.duration,
            stats: match.segments[0]?.stats || {},
        }));

        return matches;
    }
}

module.exports = { ExtendedAPI };