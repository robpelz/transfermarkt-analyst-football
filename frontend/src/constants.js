// src/constants.js
export const SCOUTING_CONSTANTS = {
  DEFAULT_VALUES: {
    TALENT: 70,
    SPEED: 70,
    TACTICS: 70,
    PASSING: 70,
    TECHNIQUE: 70,
    FITNESS: 70,
    TACKLING: 30,
    RATING: 3,
  },
  THRESHOLDS: {
    STRONG: 65,
    AVERAGE: 40,
    TOP_SCORE: 80,
    WATCH_SCORE: 60,
  },
  SCORE_WEIGHTS: {
    STRENGTH: 0.7,
    WEAKNESS: 0.3,
  },
  POSITION_MAPPING: {
    goalkeeper: 'Torwart',
    defender: 'Abwehr',
    midfield: 'Mittelfeld',
    attack: 'Stürmer',
  },
};

export const COLORS = {
  STRONG: '#10b981',
  AVERAGE: '#eab308',
  WEAK: '#ef4444',
  PRIMARY: '#6666ff',
  BACKGROUND: '#1a1a2a',
  TEXT: '#b8baff',
};