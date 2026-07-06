import api from './api';

const playerService = {
  getById: async (id) => {
    if (!id) return null;
    
    try {
      const response = await api.get(`/sofifa/player/${id}`);
      const player = response.data;
      
      console.log('🔍 Raw player data from backend:', player);
      
      return {
        id: player.id,
        name: player.name?.replace(/ \(\d+\)/, '') || '?',
        age: player.age || '?',
        nationality: player.nationality || '?',
        club: player.club || '?',
        position: player.position || player.positions?.[0] || '?',
        value: player.value || player.market_value || '?',
        imageUrl: player.imageUrl || null,
        positions: player.positions || []
      };
    } catch (error) {
      console.error('❌ Fehler bei getById:', error.message);
      return null;
    }
  },

  getTransferScore: async (id) => {
    if (!id) return null;
    
    try {
      const response = await api.get(`/sofifa/player/${id}/score`);
      return response.data;
    } catch (error) {
      console.error('❌ Fehler bei getTransferScore:', error.message);
      return {
        totalScore: 0,
        positionScore: 0,
        priceScore: 0,
        ageScore: 0,
        experienceScore: 0,
        competitionScore: 0,
        recommendation: 'Keine Daten verfügbar'
      };
    }
  },

  searchPlayers: async (query) => {
    if (!query || query.length < 2) return [];
    
    try {
      const response = await api.get(`/sofifa/full-search?query=${encodeURIComponent(query)}`);
      const players = response.data || [];
      
      return players.map(player => ({
        id: player.player_id,
        name: player.player_name?.replace(/ \(\d+\)/, '') || '?',
        position: player.position || '?',
        nationality: player.citizenship || '?',
        club: player.current_club_name || '?',
        value: player.market_value || '?',
        age: player.age || '?',
        imageUrl: null
      }));
    } catch (error) {
      console.error('❌ Fehler bei searchPlayers:', error.message);
      return [];
    }
  },

  getRandomPlayers: async () => {
    const randomNames = ['Wirtz', 'Haaland', 'Musiala', 'Bellingham', 'Kane', 'Saka'];
    
    try {
      const results = await Promise.all(
        randomNames.map(async (name) => {
          const players = await playerService.searchPlayers(name);
          return players.length > 0 ? players[0] : null;
        })
      );
      
      return results.filter(p => p !== null).slice(0, 6);
    } catch (error) {
      console.error('❌ Fehler bei getRandomPlayers:', error.message);
      return [];
    }
  },

  getMarketValue: async (id) => {
    if (!id) return '?';
    
    try {
      const response = await api.get(`/sofifa/player/${id}/market-value`);
      return response.data?.market_value || '?';
    } catch (error) {
      console.error('❌ Fehler bei getMarketValue:', error.message);
      return '?';
    }
  }
};

export default playerService;