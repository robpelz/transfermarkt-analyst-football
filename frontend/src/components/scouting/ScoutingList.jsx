import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { Plus, X } from 'lucide-react';
import playerService from '../../services/playerService';

// ==================== KONSTANTEN ====================

const API_BASE_URL = 'http://localhost:8080/api';

const DEFAULTS = {
  TALENT: 70,
  SPEED: 70,
  TACTICS: 70,
  PASSING: 70,
  TECHNIQUE: 70,
  FITNESS: 70,
  TACKLING: 30,
  RATING: 3,
};

const THRESHOLDS = {
  STRONG: 65,
  AVERAGE: 40,
  TOP_SCORE: 80,
  WATCH_SCORE: 60,
};

const POSITION_MAP = {
  goalkeeper: 'Torwart',
  torwart: 'Torwart',
  defender: 'Abwehr',
  abwehr: 'Abwehr',
  back: 'Abwehr',
  midfield: 'Mittelfeld',
  mittelfeld: 'Mittelfeld',
  attack: 'Stürmer',
  sturm: 'Stürmer',
  forward: 'Stürmer',
};

const POSITION_ORDER = ['Torwart', 'Abwehr', 'Mittelfeld', 'Stürmer', 'Andere'];

// ==================== CUSTOM HOOKS ====================

const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
};

// ==================== KLEINE KOMPONENTEN ====================

const StarRating = ({ value, onChange }) => (
  <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem' }}>
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        onClick={() => onChange(star)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.5rem' }}
      >
        <span style={{ color: star <= value ? '#fbbf24' : '#2a2a3a' }}>★</span>
      </button>
    ))}
  </div>
);

const ScoreBar = ({ value }) => {
  const getColor = (val) => {
    if (val >= THRESHOLDS.STRONG) return '#10b981';
    if (val >= THRESHOLDS.AVERAGE) return '#eab308';
    return '#ef4444';
  };
  
  return (
    <div style={{ marginTop: '0.25rem' }}>
      <div style={{ backgroundColor: '#2a2a3a', borderRadius: '0.25rem', height: '4px', overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, backgroundColor: getColor(value), height: '100%' }} />
      </div>
    </div>
  );
};

const SliderInput = ({ label, value, onChange }) => {
  const getColor = (val) => {
    if (val >= THRESHOLDS.STRONG) return '#10b981';
    if (val >= THRESHOLDS.AVERAGE) return '#eab308';
    return '#ef4444';
  };
  
  const getLabel = (val) => {
    if (val >= THRESHOLDS.STRONG) return 'Stärke';
    if (val >= THRESHOLDS.AVERAGE) return 'Durchschnitt';
    return 'Schwäche';
  };
  
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <span style={{ color: '#b8baff', fontSize: '0.875rem' }}>{label}</span>
        <span style={{ color: getColor(value), fontWeight: 'bold' }}>{getLabel(value)} ({value}%)</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.7rem', color: '#ef4444' }}>0%</span>
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          style={{ flex: 1, accentColor: getColor(value) }}
        />
        <span style={{ fontSize: '0.7rem', color: '#10b981' }}>100%</span>
      </div>
    </div>
  );
};

// ==================== HAUPTKOMPONENTE ====================

const ScoutingList = () => {
  // State
  const [scoutingList, setScoutingList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState({ id: null, name: '' });
  const [toastMessage, setToastMessage] = useState(null);
  
  // Form State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [rating, setRating] = useState(DEFAULTS.RATING);
  const [note, setNote] = useState('');
  const [formValues, setFormValues] = useState({
    talent: DEFAULTS.TALENT,
    speed: DEFAULTS.SPEED,
    tactics: DEFAULTS.TACTICS,
    passing: DEFAULTS.PASSING,
    technique: DEFAULTS.TECHNIQUE,
    fitness: DEFAULTS.FITNESS,
    tackling: DEFAULTS.TACKLING,
  });

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // ==================== HELFER ====================
  
  const cleanName = useCallback((name) => name?.replace(/ \(\d+\)/, '') || '?', []);
  
  const showToast = useCallback((message, isError = false) => {
    setToastMessage({ text: message, isError });
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  /**
   * Prüft ob ein Spieler bereits in der Liste ist
   * Verwendet wird für Duplikatschutz
   */
  const isPlayerInList = useCallback((playerId) => {
    return scoutingList.some(item => item.playerId === playerId);
  }, [scoutingList]);

  /**
   * Übersetzt englische Positionen in deutsche Gruppen
   */
  const getPositionGroup = useCallback((position) => {
    if (!position) return 'Andere';
    const pos = position.toLowerCase();
    
    for (const [key, value] of Object.entries(POSITION_MAP)) {
      if (pos.includes(key)) return value;
    }
    return 'Andere';
  }, []);

  /**
   * Berechnet Gesamtscore aus Stärken und Schwächen
   * Formel: (Ø Stärken × 0.7) + (100 - Schwäche) × 0.3
   */
  const calculateTotalScore = useCallback((player) => {
    const strengths = [
      player.talent ?? DEFAULTS.TALENT,
      player.speed ?? DEFAULTS.SPEED,
      player.tactics ?? DEFAULTS.TACTICS,
      player.passing ?? DEFAULTS.PASSING,
      player.technique ?? DEFAULTS.TECHNIQUE,
      player.fitness ?? DEFAULTS.FITNESS,
    ];
    const weakness = player.tackling ?? DEFAULTS.TACKLING;
    const avgStrength = strengths.reduce((a, b) => a + b, 0) / strengths.length;
    const total = avgStrength * 0.7 + (100 - weakness) * 0.3;
    return Math.min(100, Math.max(0, Math.round(total)));
  }, []);

  const getScoreColor = useCallback((value) => {
    if (value >= THRESHOLDS.STRONG) return '#10b981';
    if (value >= THRESHOLDS.AVERAGE) return '#eab308';
    return '#ef4444';
  }, []);

  const getTotalScoreLabel = useCallback((score) => {
    if (score >= THRESHOLDS.TOP_SCORE) return 'Top-Talent';
    if (score >= THRESHOLDS.WATCH_SCORE) return 'Beobachten';
    return 'Entwicklung nötig';
  }, []);

  // ==================== API CALLS ====================

  /**
   * Lädt die Scouting-Liste mit Positionen
   * Performance: N+1 Queries (akzeptabel für typische Listen <100 Einträge)
   */
  const loadScoutingList = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/scouting`);
      const scoutingData = response.data.content || [];
      
      const withPositions = await Promise.all(
        scoutingData.map(async (item) => {
          try {
            const playerRes = await axios.get(`${API_BASE_URL}/sofifa/player/${item.playerId}`);
            return { ...item, position: playerRes.data.position };
          } catch {
            return { ...item, position: null };
          }
        })
      );
      setScoutingList(withPositions);
    } catch (error) {
      console.error('Fehler beim Laden:', error);
      showToast('Fehler beim Laden der Scout-Liste', true);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const resetForm = useCallback(() => {
    setSelectedPlayer(null);
    setSearchQuery('');
    setSearchResults([]);
    setRating(DEFAULTS.RATING);
    setNote('');
    setFormValues({
      talent: DEFAULTS.TALENT,
      speed: DEFAULTS.SPEED,
      tactics: DEFAULTS.TACTICS,
      passing: DEFAULTS.PASSING,
      technique: DEFAULTS.TECHNIQUE,
      fitness: DEFAULTS.FITNESS,
      tackling: DEFAULTS.TACKLING,
    });
    setEditingId(null);
  }, []);

  /**
   * Fügt einen Spieler zur Scouting-Liste hinzu
   * Enthält Duplikatschutz
   */
  const addScouting = useCallback(async () => {
    if (!selectedPlayer) return;
    
    // Duplikatschutz
    if (isPlayerInList(selectedPlayer.id)) {
      showToast(`${selectedPlayer.name} ist bereits in deiner Scout-Liste!`, true);
      setShowModal(false);
      resetForm();
      return;
    }
    
    try {
      await axios.post(`${API_BASE_URL}/scouting/${selectedPlayer.id}`, {
        playerName: selectedPlayer.name,
        rating,
        note,
        ...formValues,
      });
      setShowModal(false);
      resetForm();
      await loadScoutingList();
      showToast(`${selectedPlayer.name} wurde zur Scout-Liste hinzugefügt!`);
    } catch (error) {
      console.error('Fehler beim Hinzufügen:', error);
      showToast('Fehler beim Hinzufügen', true);
    }
  }, [selectedPlayer, rating, note, formValues, isPlayerInList, showToast, resetForm, loadScoutingList]);

  /**
   * Aktualisiert einen bestehenden Scouting-Eintrag
   */
  const updateScouting = useCallback(async () => {
    if (!editingId) return;
    
    try {
      await axios.put(`${API_BASE_URL}/scouting/${editingId}`, {
        playerName: selectedPlayer?.name,
        rating,
        note,
        ...formValues,
      });
      setEditingId(null);
      setShowModal(false);
      resetForm();
      await loadScoutingList();
      showToast('Änderungen gespeichert!');
    } catch (error) {
      console.error('Fehler beim Aktualisieren:', error);
      showToast('Fehler beim Speichern', true);
    }
  }, [editingId, selectedPlayer, rating, note, formValues, resetForm, loadScoutingList, showToast]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget.id) return;
    
    try {
      await axios.delete(`${API_BASE_URL}/scouting/${deleteTarget.id}`);
      setShowDeleteModal(false);
      setDeleteTarget({ id: null, name: '' });
      await loadScoutingList();
      showToast('Spieler wurde entfernt');
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      showToast('Fehler beim Löschen', true);
    }
  }, [deleteTarget, loadScoutingList, showToast]);

  // ==================== SUCHE ====================

  /**
   * Sucht Spieler und filtert bereits vorhandene aus
   */
  useEffect(() => {
    const searchPlayers = async (query) => {
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }
      
      try {
        const results = await playerService.searchPlayers(query);
        // Filtere bereits hinzugefügte Spieler aus den Suchergebnissen
        const filteredResults = results.filter(p => !isPlayerInList(p.id));
        setSearchResults(filteredResults.slice(0, 5));
      } catch (error) {
        console.error('Fehler bei Suche:', error);
      }
    };
    
    searchPlayers(debouncedSearchQuery);
  }, [debouncedSearchQuery, isPlayerInList]);

  // ==================== INIT ====================

  useEffect(() => {
    loadScoutingList();
  }, [loadScoutingList]);

  // ==================== RENDER ====================

  /**
   * Gruppiert Spieler nach Position für die UI
   */
  const groupedPlayers = useMemo(() => {
    const groups = { Torwart: [], Abwehr: [], Mittelfeld: [], Stürmer: [], Andere: [] };
    
    scoutingList.forEach(player => {
      const group = getPositionGroup(player.position);
      groups[group].push(player);
    });
    
    return groups;
  }, [scoutingList, getPositionGroup]);

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem', color: 'white' }}>Laden...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Toast Nachricht */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          backgroundColor: toastMessage.isError ? '#ef4444' : '#10b981',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          zIndex: 2000,
        }}>
          {toastMessage.text}
        </div>
      )}
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: 'white' }}>📋 Meine Scout-Liste</h1>
        <button 
          onClick={() => setShowModal(true)} 
          style={{ padding: '0.5rem 1rem', backgroundColor: '#6666ff', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={20} /> Spieler hinzufügen
        </button>
      </div>

      {/* Empty State */}
      {scoutingList.length === 0 && (
        <div style={{ backgroundColor: '#1a1a2a', border: '1px solid #2a2a3a', borderRadius: '0.75rem', padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: '#b8baff' }}>Keine Spieler in deiner Scout-Liste</p>
        </div>
      )}

      {/* Spieler nach Position gruppiert */}
      {POSITION_ORDER.map((groupName) => {
        const players = groupedPlayers[groupName];
        if (players.length === 0) return null;
        
        return (
          <div key={groupName} style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#6666ff', marginBottom: '1rem', borderBottom: '1px solid #2a2a3a', paddingBottom: '0.5rem' }}>
              {groupName} ({players.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {players.map((item) => {
                const totalScore = calculateTotalScore(item);
                return (
                  <div key={item.id} style={{ backgroundColor: '#1a1a2a', border: '1px solid #2a2a3a', borderRadius: '0.75rem', padding: '1rem' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #6666ff, #b8baff)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          <img 
                            src={`https://tmssl.akamaized.net/images/portrait/header/${item.playerId}.png`}
                            alt={item.playerName}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { 
                              e.target.onerror = null; 
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.playerName)}&background=6666ff&color=fff&size=48`; 
                            }}
                          />
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: 'white' }}>{cleanName(item.playerName)}</div>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.875rem', color: '#b8baff' }}>
                            <div style={{ display: 'flex', gap: '0.125rem' }}>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span key={star} style={{ color: star <= item.rating ? '#fbbf24' : '#2a2a3a' }}>★</span>
                              ))}
                            </div>
                            {item.note && <span>• {item.note}</span>}
                            <span>• {item.position?.split(' - ')[0] || '?'}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          onClick={() => {
                            setEditingId(item.id);
                            setSelectedPlayer({ id: item.playerId, name: item.playerName });
                            setRating(item.rating);
                            setNote(item.note || '');
                            setFormValues({
                              talent: item.talent ?? DEFAULTS.TALENT,
                              speed: item.speed ?? DEFAULTS.SPEED,
                              tactics: item.tactics ?? DEFAULTS.TACTICS,
                              passing: item.passing ?? DEFAULTS.PASSING,
                              technique: item.technique ?? DEFAULTS.TECHNIQUE,
                              fitness: item.fitness ?? DEFAULTS.FITNESS,
                              tackling: item.tackling ?? DEFAULTS.TACKLING,
                            });
                            setShowModal(true);
                          }}
                          style={{ padding: '0.5rem', background: '#2a2a3a', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => setDeleteTarget({ id: item.id, name: item.playerName }) || setShowDeleteModal(true)}
                          style={{ padding: '0.5rem', background: '#2a2a3a', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', color: '#ef4444' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    
                    {/* Score Bars */}
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #2a2a3a' }}>
                      <div style={{ fontSize: '0.75rem', color: '#b8baff', marginBottom: '0.5rem' }}>📊 Meine Scouting-Bewertung</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                        <div>
                          <div style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Talent</span>
                            <span style={{ color: getScoreColor(item.talent ?? DEFAULTS.TALENT) }}>{item.talent ?? DEFAULTS.TALENT}%</span>
                          </div>
                          <ScoreBar value={item.talent ?? DEFAULTS.TALENT} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Speed</span>
                            <span style={{ color: getScoreColor(item.speed ?? DEFAULTS.SPEED) }}>{item.speed ?? DEFAULTS.SPEED}%</span>
                          </div>
                          <ScoreBar value={item.speed ?? DEFAULTS.SPEED} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Taktik</span>
                            <span style={{ color: getScoreColor(item.tactics ?? DEFAULTS.TACTICS) }}>{item.tactics ?? DEFAULTS.TACTICS}%</span>
                          </div>
                          <ScoreBar value={item.tactics ?? DEFAULTS.TACTICS} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Passen</span>
                            <span style={{ color: getScoreColor(item.passing ?? DEFAULTS.PASSING) }}>{item.passing ?? DEFAULTS.PASSING}%</span>
                          </div>
                          <ScoreBar value={item.passing ?? DEFAULTS.PASSING} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Technik</span>
                            <span style={{ color: getScoreColor(item.technique ?? DEFAULTS.TECHNIQUE) }}>{item.technique ?? DEFAULTS.TECHNIQUE}%</span>
                          </div>
                          <ScoreBar value={item.technique ?? DEFAULTS.TECHNIQUE} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Fitness</span>
                            <span style={{ color: getScoreColor(item.fitness ?? DEFAULTS.FITNESS) }}>{item.fitness ?? DEFAULTS.FITNESS}%</span>
                          </div>
                          <ScoreBar value={item.fitness ?? DEFAULTS.FITNESS} />
                        </div>
                        <div>
                          <div style={{ fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Zweikampf</span>
                            <span style={{ color: getScoreColor(item.tackling ?? DEFAULTS.TACKLING) }}>{item.tackling ?? DEFAULTS.TACKLING}%</span>
                          </div>
                          <ScoreBar value={item.tackling ?? DEFAULTS.TACKLING} />
                        </div>
                      </div>
                    </div>
                    
                    {/* Total Score */}
                    <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid #2a2a3a', display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: getScoreColor(totalScore) }}>{totalScore}%</div>
                        <div style={{ fontSize: '0.7rem', color: '#b8baff' }}>{getTotalScoreLabel(totalScore)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
        }}>
          <div style={{
            backgroundColor: '#1a1a2a',
            border: '1px solid #2a2a3a',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            maxWidth: '400px',
            width: '90%',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🗑️</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white', marginBottom: '0.5rem' }}>Spieler entfernen</h3>
            <p style={{ color: '#b8baff', marginBottom: '1.5rem' }}>
              Möchtest du <strong style={{ color: '#6666ff' }}>{cleanName(deleteTarget.name)}</strong> wirklich aus deiner Scout-Liste entfernen?
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                style={{ padding: '0.5rem 1.5rem', backgroundColor: '#2a2a3a', color: '#b8baff', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
              >
                Abbrechen
              </button>
              <button
                onClick={() => { confirmDelete(); setShowDeleteModal(false); }}
                style={{ padding: '0.5rem 1.5rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
              >
                Löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: '#1a1a2a',
            border: '1px solid #2a2a3a',
            borderRadius: '0.75rem',
            padding: '1.5rem',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            overflow: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white' }}>
                {editingId ? 'Meine Bewertung bearbeiten' : 'Spieler zu meiner Scout-Liste hinzufügen'}
              </h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} style={{ background: 'none', border: 'none', color: '#b8baff', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            {/* Spielersuche (nur bei neu) */}
            {!selectedPlayer && !editingId && (
              <div style={{ marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="Spieler suchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 1rem', backgroundColor: '#0c0c16', border: '1px solid #2a2a3a', borderRadius: '0.5rem', color: 'white' }}
                />
                {searchResults.length === 0 && debouncedSearchQuery.length >= 2 && (
                  <div style={{ padding: '0.75rem', color: '#b8baff', textAlign: 'center' }}>
                    Keine weiteren Spieler gefunden
                  </div>
                )}
                {searchResults.map(p => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedPlayer(p)}
                    style={{ padding: '0.75rem', cursor: 'pointer', borderBottom: '1px solid #2a2a3a' }}
                  >
                    <div style={{ fontWeight: '500', color: 'white' }}>{cleanName(p.name)}</div>
                    <div style={{ fontSize: '0.875rem', color: '#b8baff' }}>{p.club}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Ausgewählter Spieler */}
            {selectedPlayer && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#0c0c16', borderRadius: '0.5rem' }}>
                <div style={{ fontWeight: '500', color: 'white' }}>{cleanName(selectedPlayer.name)}</div>
                <div style={{ fontSize: '0.75rem', color: '#b8baff' }}>Hier kannst du deine persönliche Einschätzung abgeben</div>
              </div>
            )}

            {/* Formular */}
            <StarRating value={rating} onChange={setRating} />
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows="2"
              placeholder="Meine Notiz zum Spieler..."
              style={{ width: '100%', padding: '0.5rem 1rem', backgroundColor: '#0c0c16', border: '1px solid #2a2a3a', borderRadius: '0.5rem', color: 'white', marginBottom: '1rem' }}
            />

            <h3 style={{ color: 'white', fontSize: '0.875rem', marginBottom: '0.5rem' }}>💪 Meine Einschätzung - Stärken & ⚠️ Schwächen</h3>
            <SliderInput label="Talent" value={formValues.talent} onChange={(v) => setFormValues(prev => ({ ...prev, talent: v }))} />
            <SliderInput label="Speed" value={formValues.speed} onChange={(v) => setFormValues(prev => ({ ...prev, speed: v }))} />
            <SliderInput label="Taktik" value={formValues.tactics} onChange={(v) => setFormValues(prev => ({ ...prev, tactics: v }))} />
            <SliderInput label="Passen" value={formValues.passing} onChange={(v) => setFormValues(prev => ({ ...prev, passing: v }))} />
            <SliderInput label="Technik" value={formValues.technique} onChange={(v) => setFormValues(prev => ({ ...prev, technique: v }))} />
            <SliderInput label="Fitness" value={formValues.fitness} onChange={(v) => setFormValues(prev => ({ ...prev, fitness: v }))} />
            <SliderInput label="Zweikampf" value={formValues.tackling} onChange={(v) => setFormValues(prev => ({ ...prev, tackling: v }))} />

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button 
                onClick={() => { setShowModal(false); resetForm(); }} 
                style={{ flex: 1, padding: '0.5rem', backgroundColor: '#2a2a3a', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
              >
                Abbrechen
              </button>
              <button 
                onClick={editingId ? updateScouting : addScouting} 
                style={{ flex: 1, padding: '0.5rem', backgroundColor: '#6666ff', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
              >
                {editingId ? 'Meine Bewertung speichern' : 'Zu meiner Liste hinzufügen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoutingList;