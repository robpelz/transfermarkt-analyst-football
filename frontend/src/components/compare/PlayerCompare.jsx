import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import playerService from '../../services/playerService';
import api from '../../services/api';

const PlayerCompare = () => {
  const [player1Search, setPlayer1Search] = useState('');
  const [player2Search, setPlayer2Search] = useState('');
  const [player1Results, setPlayer1Results] = useState([]);
  const [player2Results, setPlayer2Results] = useState([]);
  const [player1, setPlayer1] = useState(null);
  const [player2, setPlayer2] = useState(null);
  const [player1Score, setPlayer1Score] = useState(null);
  const [player2Score, setPlayer2Score] = useState(null);
  const [winner, setWinner] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [searching1, setSearching1] = useState(false);
  const [searching2, setSearching2] = useState(false);
  const [showResults1, setShowResults1] = useState(false);
  const [showResults2, setShowResults2] = useState(false);
  const [addingToScouting, setAddingToScouting] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [loadingDetails1, setLoadingDetails1] = useState(false);
  const [loadingDetails2, setLoadingDetails2] = useState(false);
  
  const resultsRef1 = useRef(null);
  const resultsRef2 = useRef(null);
  const inputRef1 = useRef(null);
  const inputRef2 = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (resultsRef1.current && !resultsRef1.current.contains(event.target) && !inputRef1.current.contains(event.target)) {
        setShowResults1(false);
      }
      if (resultsRef2.current && !resultsRef2.current.contains(event.target) && !inputRef2.current.contains(event.target)) {
        setShowResults2(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (player1Search.length < 2) {
      setPlayer1Results([]);
      setShowResults1(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching1(true);
      try {
        let searchTerm = player1Search;
        if (searchTerm === 'mbappe') searchTerm = 'Mbappé';
        if (searchTerm === 'Mbappe') searchTerm = 'Mbappé';
        const results = await playerService.searchPlayers(searchTerm);
        const filtered = results.filter(p => p.id !== player2?.id);
        setPlayer1Results(filtered.slice(0, 5));
        setShowResults1(true);
      } catch (error) {
        console.error('Fehler:', error);
      } finally {
        setSearching1(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [player1Search, player2]);

  useEffect(() => {
    if (player2Search.length < 2) {
      setPlayer2Results([]);
      setShowResults2(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching2(true);
      try {
        let searchTerm = player2Search;
        if (searchTerm === 'mbappe') searchTerm = 'Mbappé';
        if (searchTerm === 'Mbappe') searchTerm = 'Mbappé';
        const results = await playerService.searchPlayers(searchTerm);
        const filtered = results.filter(p => p.id !== player1?.id);
        setPlayer2Results(filtered.slice(0, 5));
        setShowResults2(true);
      } catch (error) {
        console.error('Fehler:', error);
      } finally {
        setSearching2(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [player2Search, player1]);

  const selectPlayer1 = async (player) => {
    setPlayer1(player);
    setPlayer1Search('');
    setPlayer1Results([]);
    setShowResults1(false);
    setLoadingDetails1(true);
    try {
      const scoreData = await playerService.getTransferScore(player.id);
      setPlayer1Score(scoreData);
    } catch (error) {
      console.error('Fehler:', error);
    } finally {
      setLoadingDetails1(false);
    }
  };

  const selectPlayer2 = async (player) => {
    setPlayer2(player);
    setPlayer2Search('');
    setPlayer2Results([]);
    setShowResults2(false);
    setLoadingDetails2(true);
    try {
      const scoreData = await playerService.getTransferScore(player.id);
      setPlayer2Score(scoreData);
    } catch (error) {
      console.error('Fehler:', error);
    } finally {
      setLoadingDetails2(false);
    }
  };

  const clearPlayer1 = () => {
    setPlayer1(null);
    setPlayer1Search('');
    setPlayer1Score(null);
    setPlayer1Results([]);
    setShowResults1(false);
    setWinner(null);
  };

  const clearPlayer2 = () => {
    setPlayer2(null);
    setPlayer2Search('');
    setPlayer2Score(null);
    setPlayer2Results([]);
    setShowResults2(false);
    setWinner(null);
  };

  const resetComparison = () => {
    clearPlayer1();
    clearPlayer2();
    setWinner(null);
    setShowConfetti(false);
  };

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const addToScoutingList = async (player, score) => {
    setAddingToScouting(player.id);
    try {
      // 🔥 KORRIGIERT: JSON-Body statt Query-Parameter
      const requestBody = {
        playerName: player.name,
        rating: Math.min(5, Math.max(1, Math.floor(score?.totalScore / 20))),
        note: `Aus dem Vergleich hinzugefügt. Score: ${score?.totalScore || 0}`,
        talent: score?.positionScore || 70,
        speed: score?.priceScore || 70,
        tactics: score?.ageScore || 70,
        passing: score?.experienceScore || 70,
        technique: score?.competitionScore || 70,
        fitness: 70,
        tackling: 30
      };
      
      await api.post(`/scouting/${player.id}`, requestBody);
      showToast(`${player.name} wurde zur Scout-Liste hinzugefügt!`);
    } catch (error) {
      console.error('Fehler beim Hinzufügen:', error);
      showToast(`Fehler beim Hinzufügen von ${player.name}`);
    } finally {
      setAddingToScouting(null);
    }
  };

  const handleCompare = () => {
    if (!player1 || !player2) return;
    
    setWinner(null);
    setShowConfetti(false);
    
    const winnerScore = player1Score?.totalScore > player2Score?.totalScore ? 'player1' 
                      : player2Score?.totalScore > player1Score?.totalScore ? 'player2' 
                      : 'tie';
    setWinner(winnerScore);
    
    if (winnerScore !== 'tie') {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 70) return '#10b981';
    if (score >= 50) return '#eab308';
    return '#ef4444';
  };

  const renderPlayerColumn = (player, score, isLoading, isWinner, onClear, searchTerm, setSearchTerm, results, showResults, setShowResults, searching, selectPlayer) => {
    return (
      <div style={{ flex: 1 }}>
        <div style={{ position: 'relative', marginBottom: '20px' }}>
          <input
            ref={selectPlayer === selectPlayer1 ? inputRef1 : inputRef2}
            type="text"
            placeholder="Spieler suchen (z.B. Wirtz, Haaland)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => results.length > 0 && setShowResults(true)}
            style={{
              width: '100%',
              padding: '12px 16px',
              backgroundColor: '#1a1a2a',
              border: '1px solid #2a2a3a',
              borderRadius: '8px',
              color: 'white',
              fontSize: '16px',
              boxSizing: 'border-box'
            }}
          />
          {searching && <div style={{ color: '#b8baff', fontSize: '12px', marginTop: '4px' }}>Suche...</div>}
          {showResults && results.length > 0 && (
            <div
              ref={selectPlayer === selectPlayer1 ? resultsRef1 : resultsRef2}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                backgroundColor: '#1a1a2a',
                border: '1px solid #2a2a3a',
                borderRadius: '8px',
                zIndex: 100,
                maxHeight: '250px',
                overflow: 'auto',
                marginTop: '4px'
              }}
            >
              {results.map(p => (
                <div
                  key={p.id}
                  onClick={() => selectPlayer(p)}
                  style={{
                    padding: '10px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #2a2a3a'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a2a3a'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ color: 'white', fontSize: '14px' }}>{p.name}</div>
                  <div style={{ color: '#b8baff', fontSize: '12px' }}>{p.club} | {p.position}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {player ? (
          <div>
            <div style={{
              backgroundColor: isWinner ? 'rgba(234, 179, 8, 0.15)' : '#1a1a2a',
              border: isWinner ? '2px solid #eab308' : '1px solid #2a2a3a',
              borderRadius: '8px',
              padding: '16px',
              position: 'relative',
              marginBottom: '20px'
            }}>
              <button
                onClick={onClear}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  color: '#b8baff',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                ✕
              </button>
              {isWinner && <div style={{ position: 'absolute', top: '12px', left: '12px', fontSize: '22px' }}>🏆</div>}
              <Link to={`/players/${player.id}`} style={{ textDecoration: 'none' }}>
                <h3 style={{ color: isWinner ? '#eab308' : 'white', fontSize: '18px', marginBottom: '6px', marginTop: '4px' }}>
                  {player.name}
                </h3>
              </Link>
              <div style={{ color: '#b8baff', fontSize: '13px', marginBottom: '12px' }}>
                {player.club || '?'} | {player.position || '?'}
              </div>
              
              {isLoading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <div style={{ color: '#b8baff', fontSize: '14px' }}>Lade Details...</div>
                </div>
              ) : score ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontSize: '28px', fontWeight: 'bold', color: getScoreColor(score.totalScore || 0) }}>
                        {score.totalScore || 0}
                      </div>
                      <div style={{ fontSize: '11px', color: '#b8baff' }}>Score</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', color: '#b8baff', marginBottom: '4px' }}>Detailanalyse</div>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', color: '#6666ff' }}>P:{score.positionScore || 0}</span>
                        <span style={{ fontSize: '11px', color: '#10b981' }}>PR:{score.priceScore || 0}</span>
                        <span style={{ fontSize: '11px', color: '#eab308' }}>A:{score.ageScore || 0}</span>
                        <span style={{ fontSize: '11px', color: '#f97316' }}>E:{score.experienceScore || 0}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', color: '#b8baff' }}>Alter</div>
                      <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'white' }}>{player.age || '?'}</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', color: '#b8baff' }}>Marktwert</div>
                      <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'white' }}>{player.value || '?'}</div>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => addToScoutingList(player, score)}
                    disabled={addingToScouting === player.id}
                    style={{
                      width: '100%',
                      padding: '8px',
                      backgroundColor: addingToScouting === player.id ? '#4a4a6a' : '#6666ff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: addingToScouting === player.id ? 'not-allowed' : 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    {addingToScouting === player.id ? '⏳ Wird hinzugefügt...' : '📋 Zur Scout-Liste hinzufügen'}
                  </button>
                </>
              ) : null}
            </div>
            
            {score && (
              <div style={{
                backgroundColor: '#0c0c16',
                borderRadius: '8px',
                padding: '16px'
              }}>
                <div style={{ fontSize: '13px', color: 'white', marginBottom: '12px' }}>⚡ Leistungsdaten</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#b8baff' }}>Position</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#6666ff' }}>{score.positionScore || 0}%</div>
                    <div style={{ height: '3px', background: '#2a2a3a', marginTop: '4px', borderRadius: '2px' }}>
                      <div style={{ width: `${score.positionScore || 0}%`, height: '3px', background: '#6666ff', borderRadius: '2px' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#b8baff' }}>Preis</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#10b981' }}>{score.priceScore || 0}%</div>
                    <div style={{ height: '3px', background: '#2a2a3a', marginTop: '4px', borderRadius: '2px' }}>
                      <div style={{ width: `${score.priceScore || 0}%`, height: '3px', background: '#10b981', borderRadius: '2px' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#b8baff' }}>Alter</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#eab308' }}>{score.ageScore || 0}%</div>
                    <div style={{ height: '3px', background: '#2a2a3a', marginTop: '4px', borderRadius: '2px' }}>
                      <div style={{ width: `${score.ageScore || 0}%`, height: '3px', background: '#eab308', borderRadius: '2px' }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#b8baff' }}>Erfahrung</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#f97316' }}>{score.experienceScore || 0}%</div>
                    <div style={{ height: '3px', background: '#2a2a3a', marginTop: '4px', borderRadius: '2px' }}>
                      <div style={{ width: `${score.experienceScore || 0}%`, height: '3px', background: '#f97316', borderRadius: '2px' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{
            backgroundColor: '#1a1a2a',
            border: '1px solid #2a2a3a',
            borderRadius: '8px',
            padding: '40px 20px',
            textAlign: 'center',
            color: '#b8baff',
            fontSize: '14px'
          }}>
            Kein Spieler ausgewählt
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ background: '#0c0c16', minHeight: '100vh', padding: '24px' }}>
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
        }
        .confetti {
          position: fixed;
          pointer-events: none;
          z-index: 1000;
          animation: confetti-fall 3s ease-out forwards;
        }
        @keyframes toast-fade {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          15% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          85% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
        }
      `}</style>
      
      {showConfetti && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 999, overflow: 'hidden' }}>
          {[...Array(150)].map((_, i) => {
            const colors = ['#6666ff', '#10b981', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#ec489a'];
            return (
              <div
                key={i}
                className="confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  animationDuration: `${1 + Math.random() * 2}s`,
                  width: `${6 + Math.random() * 8}px`,
                  height: `${6 + Math.random() * 8}px`,
                  backgroundColor: colors[Math.floor(Math.random() * colors.length)],
                  borderRadius: Math.random() > 0.5 ? '50%' : '0'
                }}
              />
            );
          })}
        </div>
      )}
      
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: '#1a1a2a',
          border: '1px solid #6666ff',
          borderRadius: '10px',
          padding: '12px 24px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5), 0 0 10px rgba(102,102,255,0.3)',
          zIndex: 2000,
          animation: 'toast-fade 3s ease forwards',
          textAlign: 'center',
          minWidth: '280px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>✅</span>
            <span style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>{toastMessage}</span>
          </div>
        </div>
      )}
      
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <Link to="/" style={{ color: '#b8baff', textDecoration: 'none', fontSize: '14px' }}>
            ← Zurück
          </Link>
          {(player1 || player2) && (
            <button
              onClick={resetComparison}
              style={{
                padding: '6px 14px',
                backgroundColor: '#2a2a3a',
                color: '#b8baff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              Neuer Vergleich
            </button>
          )}
        </div>
        
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', marginBottom: '24px' }}>Spielervergleich</h1>
        
        <div style={{ display: 'flex', gap: '20px' }}>
          {renderPlayerColumn(
            player1, player1Score, loadingDetails1, winner === 'player1', clearPlayer1,
            player1Search, setPlayer1Search, player1Results, showResults1, setShowResults1, searching1, selectPlayer1
          )}
          
          <button
            onClick={handleCompare}
            disabled={!player1 || !player2}
            style={{
              alignSelf: 'flex-start',
              padding: '12px 28px',
              backgroundColor: !player1 || !player2 ? '#4a4a6a' : '#6666ff',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: !player1 || !player2 ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              marginTop: '80px'
            }}
          >
            VS
          </button>
          
          {renderPlayerColumn(
            player2, player2Score, loadingDetails2, winner === 'player2', clearPlayer2,
            player2Search, setPlayer2Search, player2Results, showResults2, setShowResults2, searching2, selectPlayer2
          )}
        </div>
        
        {winner && winner !== 'tie' && (
          <div style={{
            textAlign: 'center',
            marginTop: '24px',
            padding: '12px',
            backgroundColor: 'rgba(234, 179, 8, 0.1)',
            borderRadius: '8px',
            border: '1px solid #eab308'
          }}>
            <span style={{ fontSize: '20px', marginRight: '6px' }}>🏆</span>
            <span style={{ color: '#eab308', fontWeight: 'bold', fontSize: '16px' }}>
              {winner === 'player1' ? player1.name : player2.name} gewinnt den Vergleich!
            </span>
            <span style={{ fontSize: '20px', marginLeft: '6px' }}>🏆</span>
          </div>
        )}
        
        {winner === 'tie' && (
          <div style={{
            textAlign: 'center',
            marginTop: '24px',
            padding: '12px',
            backgroundColor: '#1a1a2a',
            borderRadius: '8px',
            border: '1px solid #2a2a3a'
          }}>
            <span style={{ fontSize: '18px', marginRight: '6px' }}>🤝</span>
            <span style={{ color: '#b8baff', fontSize: '16px' }}>Unentschieden! Beide Spieler sind gleich gut.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerCompare;