import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';

const ClubDetail = () => {
  const { id } = useParams();
  const [club, setClub] = useState(null);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  const cleanName = (name) => {
    if (!name) return '?';
    return name.replace(/ \(\d+\)/, '').replace(/\s+\(\d+\)$/, '').trim();
  };

  const loadClubData = useCallback(async () => {
    try {
      const [clubRes, playersRes] = await Promise.all([
        axios.get(`http://localhost:8080/api/live/teams/teams/by-id/${id}`),
        axios.get(`http://localhost:8080/api/live/teams/${id}/players`)
      ]);
      
      setClub(clubRes.data);
      
      const playersWithValues = await Promise.all(
        (playersRes.data || []).map(async (player) => {
          try {
            const valueRes = await axios.get(`http://localhost:8080/api/sofifa/player/${player.id}/market-value`);
            return { ...player, market_value: valueRes.data.market_value };
          } catch {
            return { ...player, market_value: '?' };
          }
        })
      );

      setPlayers(playersWithValues || []);
    } catch (err) {
      console.error('Fehler:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadClubData();
  }, [loadClubData]);

  const totalMarketValue = useMemo(() => {
    if (!players || players.length === 0) return 0;
    
    return players.reduce((sum, p) => {
      if (!p.market_value || p.market_value === '?') return sum;
      
      const match = p.market_value.match(/[\d.,]+/);
      if (!match) return sum;
      
      let number = parseFloat(match[0].replace(',', '.'));
      if (isNaN(number)) return sum;
      
      if (p.market_value.includes('Mrd')) {
        number = number * 1000;
      }
      
      return sum + number;
    }, 0);
  }, [players]);

  const formatTotalValue = (val) => {
    if (val >= 1000) return `${(val / 1000).toFixed(1)} Mrd €`;
    return `${Math.round(val)} Mio €`;
  };

  const getPositionGroup = useCallback((position) => {
    if (!position) return 'Andere';
    const pos = position.toLowerCase();
    if (pos.includes('goalkeeper')) return 'Torwart';
    if (pos.includes('defender')) return 'Abwehr';
    if (pos.includes('midfield')) return 'Mittelfeld';
    if (pos.includes('attack')) return 'Stürmer';
    return 'Andere';
  }, []);

  const sortedPlayers = useMemo(() => {
    if (!players || players.length === 0) return [];
    
    const order = { Torwart: 1, Abwehr: 2, Mittelfeld: 3, Stürmer: 4, Andere: 5 };
    
    return [...players].sort((a, b) => {
      const groupA = order[getPositionGroup(a.position)] || 5;
      const groupB = order[getPositionGroup(b.position)] || 5;
      if (groupA !== groupB) return groupA - groupB;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [players, getPositionGroup]);

  const groupedPlayers = useMemo(() => {
    const groups = {
      Torwart: [],
      Abwehr: [],
      Mittelfeld: [],
      Stürmer: [],
      Andere: []
    };
    
    if (!sortedPlayers || sortedPlayers.length === 0) return groups;
    
    sortedPlayers.forEach(player => {
      const group = getPositionGroup(player.position);
      if (groups[group]) {
        groups[group].push(player);
      } else {
        groups.Andere.push(player);
      }
    });
    
    return groups;
  }, [sortedPlayers, getPositionGroup]);

  const getMainPosition = (position) => {
    return position?.split(' - ')[0] || '?';
  };

  if (loading) {
    return <div style={{ padding: '2rem', color: 'white', textAlign: 'center' }}>Lade...</div>;
  }
  
  if (!club) {
    return <div style={{ padding: '2rem', color: '#ef4444', textAlign: 'center' }}>Verein nicht gefunden</div>;
  }

  const positionGroups = ['Torwart', 'Abwehr', 'Mittelfeld', 'Stürmer', 'Andere'];

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <Link 
        to="/clubs" 
        style={{ color: '#6666ff', textDecoration: 'none', display: 'inline-block', marginBottom: '1rem' }}
      >
        ← Zurück zu den Ligen
      </Link>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        marginBottom: '2rem',
        backgroundColor: '#1a1a2a',
        padding: '1.5rem',
        borderRadius: '1rem'
      }}>
        {club.logo && (
          <img 
            src={club.logo} 
            alt={club.name} 
            style={{ width: '80px', height: '80px', objectFit: 'contain' }} 
          />
        )}
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'white', margin: 0 }}>
            {cleanName(club.name)}
          </h1>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
            <span style={{ color: '#b8baff' }}>📋 {players.length} Spieler</span>
            <span style={{ color: '#b8baff' }}>💰 {formatTotalValue(totalMarketValue)}</span>
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: '#1a1a2a', borderRadius: '1rem', overflow: 'hidden' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr 1.5fr',
          backgroundColor: '#0c0c16',
          padding: '0.75rem 1rem',
          fontWeight: 'bold',
          color: '#b8baff'
        }}>
          <div>Spieler</div>
          <div>Position</div>
          <div>Alter</div>
          <div>Nationalität</div>
          <div>Marktwert</div>
        </div>

        {positionGroups.map((groupName) => {
          const groupPlayers = groupedPlayers[groupName];
          if (!groupPlayers || groupPlayers.length === 0) return null;
          
          return (
            <div key={groupName}>
              <div style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#0c0c16',
                color: '#6666ff',
                fontWeight: 'bold',
                borderBottom: '1px solid #2a2a3a'
              }}>
                {groupName} ({groupPlayers.length})
              </div>
              {groupPlayers.map((player) => (
                <Link 
                  key={player.id} 
                  to={`/players/${player.id}`} 
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1.5fr 1fr 1.5fr 1.5fr',
                    padding: '0.75rem 1rem',
                    borderTop: '1px solid #2a2a3a',
                    color: 'white',
                    alignItems: 'center'
                  }}>
                    <div>{cleanName(player.name)}</div>
                    <div style={{ color: '#b8baff', fontSize: '0.875rem' }}>
                      {getMainPosition(player.position)}
                    </div>
                    <div style={{ color: '#b8baff', fontSize: '0.875rem' }}>
                      {player.age || '?'}
                    </div>
                    <div style={{ color: '#b8baff', fontSize: '0.875rem' }}>
                      {player.nationality || '?'}
                    </div>
                    <div style={{ color: '#b8baff', fontSize: '0.875rem' }}>
                      {player.market_value || '?'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ClubDetail;