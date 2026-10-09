export const EXPRESSIONS = {
  neutral:   { lidO: 0.12, lidI: 0.12, pr: 17, dx: 0, dy: 2,  happy: 0, mw: 32, mc: 8,   mo: 0,    blush: 0.25, tilt: 0 },
  happy:     { lidO: 0,    lidI: 0,    pr: 17, dx: 0, dy: 0,  happy: 1, mw: 42, mc: 26,  mo: 0.35, blush: 0.65, tilt: 0 },
  sad:       { lidO: 0.42, lidI: 0.16, pr: 16, dx: 0, dy: 5,  happy: 0, mw: 22, mc: -10, mo: 0,    blush: 0.08, tilt: 0 },
  surprised: { lidO: 0,    lidI: 0,    pr: 12, dx: 0, dy: 0,  happy: 0, mw: 13, mc: 0,   mo: 0.55, blush: 0.3,  tilt: 0 },
  thinking:  { lidO: 0.3,  lidI: 0.3,  pr: 15, dx: 8, dy: -9, happy: 0, mw: 18, mc: -2,  mo: 0,    blush: 0.15, tilt: -3 },
  listening: { lidO: 0.02, lidI: 0.02, pr: 18, dx: 0, dy: 0,  happy: 0, mw: 26, mc: 10,  mo: 0,    blush: 0.3,  tilt: 3 },
};

export const EMOTION_LABELS = {
  neutral: 'Bình thường',
  happy: 'Vui',
  sad: 'Buồn',
  surprised: 'Ngạc nhiên',
  thinking: 'Suy nghĩ',
};
