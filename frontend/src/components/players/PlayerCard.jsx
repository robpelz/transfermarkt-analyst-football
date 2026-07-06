// src/components/scouting/PlayerCard.jsx
import { COLORS, SCOUTING_CONSTANTS } from '../../constants';
import ScoreBar from './ScoreBar';
import { memo } from 'react';

const PlayerCard = memo(({ player, onEdit, onDelete, cleanName }) => {
  const calculateTotalScore = (p) => {
    const strengths = [
      p.talent || SCOUTING_CONSTANTS.DEFAULT_VALUES.TALENT,
      p.speed || SCOUTING_CONSTANTS.DEFAULT_VALUES.SPEED,
      p.tactics || SCOUTING_CONSTANTS.DEFAULT_VALUES.TACTICS,
      p.passing || SCOUTING_CONSTANTS.DEFAULT_VALUES.PASSING,
      p.technique || SCOUTING_CONSTANTS.DEFAULT_VALUES.TECHNIQUE,
      p.fitness || SCOUTING_CONSTANTS.DEFAULT_VALUES.FITNESS,
    ];
    const weakness = p.tackling || SCOUTING_CONSTANTS.DEFAULT_VALUES.TACKLING;
    const avgStrength = strengths.reduce((a, b) => a + b, 0) / strengths.length;
    const total = avgStrength * SCOUTING_CONSTANTS.SCORE_WEIGHTS.STRENGTH + 
                  (100 - weakness) * SCOUTING_CONSTANTS.SCORE_WEIGHTS.WEAKNESS;
    return Math.min(100, Math.max(0, Math.round(total)));
  };

  const totalScore = calculateTotalScore(player);
  
  const getScoreColor = (value) => {
    if (value >= SCOUTING_CONSTANTS.THRESHOLDS.STRONG) return COLORS.STRONG;
    if (value >= SCOUTING_CONSTANTS.THRESHOLDS.AVERAGE) return COLORS.AVERAGE;
    return COLORS.WEAK;
  };

  return (
    <div style={{ backgroundColor: COLORS.BACKGROUND, border: `1px solid #2a2a3a`, borderRadius: '0.75rem', padding: '1rem' }}>
      {/* Header mit Name, Rating, Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
          {/* Player Image */}
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: `linear-gradient(135deg, ${COLORS.PRIMARY}, ${COLORS.TEXT})`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <img 
              src={`https://tmssl.akamaized.net/images/portrait/header/${player.playerId}.png`}
              alt={player.playerName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => { 
                e.target.onerror = null; 
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.playerName)}&background=6666ff&color=fff&size=48`; 
              }}
            />
          </div>
          
          {/* Player Info */}
          <div>
            <div style={{ fontWeight: '600', color: 'white' }}>{cleanName(player.playerName)}</div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.875rem', color: COLORS.TEXT }}>
              <div style={{ display: 'flex', gap: '0.125rem' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <span key={star} style={{ color: star <= player.rating ? '#fbbf24' : '#2a2a3a' }}>★</span>
                ))}
              </div>
              {player.note && <span>• {player.note}</span>}
              <span>• {player.position?.split(' - ')[0] || '?'}</span>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => onEdit(player)} style={{ padding: '0.5rem', background: '#2a2a3a', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>✏️</button>
          <button onClick={() => onDelete(player.id, player.playerName)} style={{ padding: '0.5rem', background: '#2a2a3a', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', color: COLORS.WEAK }}>🗑️</button>
        </div>
      </div>
      
      {/* Score Bars */}
      <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #2a2a3a' }}>
        <div style={{ fontSize: '0.75rem', color: COLORS.TEXT, marginBottom: '0.5rem' }}>📊 Meine Scouting-Bewertung</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
          {['talent', 'speed', 'tactics', 'passing', 'technique', 'fitness'].map(attr => (
            <div key={attr}>
              <div style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
                <span>{attr.charAt(0).toUpperCase() + attr.slice(1)}</span>
                <span style={{ color: getScoreColor(player[attr] || SCOUTING_CONSTANTS.DEFAULT_VALUES[attr.toUpperCase()]) }}>
                  {player[attr] || SCOUTING_CONSTANTS.DEFAULT_VALUES[attr.toUpperCase()]}%
                </span>
              </div>
              <ScoreBar value={player[attr] || SCOUTING_CONSTANTS.DEFAULT_VALUES[attr.toUpperCase()]} />
            </div>
          ))}
          <div>
            <div style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>Zweikampf</span>
              <span style={{ color: getScoreColor(player.tackling || SCOUTING_CONSTANTS.DEFAULT_VALUES.TACKLING) }}>
                {player.tackling || SCOUTING_CONSTANTS.DEFAULT_VALUES.TACKLING}%
              </span>
            </div>
            <ScoreBar value={player.tackling || SCOUTING_CONSTANTS.DEFAULT_VALUES.TACKLING} />
          </div>
        </div>
      </div>
      
      {/* Total Score */}
      <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #2a2a3a', display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: getScoreColor(totalScore) }}>{totalScore}%</div>
          <div style={{ fontSize: '0.7rem', color: COLORS.TEXT }}>
            {totalScore >= SCOUTING_CONSTANTS.THRESHOLDS.TOP_SCORE ? 'Top-Talent' : 
             totalScore >= SCOUTING_CONSTANTS.THRESHOLDS.WATCH_SCORE ? 'Beobachten' : 'Entwicklung nötig'}
          </div>
        </div>
      </div>
    </div>
  );
});

PlayerCard.displayName = 'PlayerCard';

export default PlayerCard;