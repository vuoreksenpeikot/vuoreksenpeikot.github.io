// Turnausdata - Peikot Padel Tour 2026
let TOURS = [];
let M = [];
let PLAYERS = [];
let ELO_RATINGS = {};
let ELO_PREV_RATINGS = {};
let ELO_HISTORY = {}; // {player: [{ti, elo}, ...]} — snapshot Elo-arvo jokaisen turnauksen jälkeen

// Lataa turnausdata yhdestä JSON-tiedostosta
async function loadData() {
  try {
    // Lataa kaikki data yhdestä tiedostosta
    const res = await fetch('data/all-matches.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    // Hae turnaukset
    TOURS = data.tours;
    
    // Muuta ottelut oikeaan muotoon: tourId -> t-indeksi
    M = data.matches.map(m => {
      const tourIndex = TOURS.findIndex(t => t.id === m.tourId);
      return {
        t: tourIndex,
        r: m.r,
        a: m.a,
        b: m.b,
        sa: m.sa,
        sb: m.sb
      };
    });
    
    // Generoi pelaajat
    PLAYERS = [...new Set(M.flatMap(m => [...m.a, ...m.b]))].sort();

    // Laske Elo-pisteet
    computeElo();

    console.log('Turnausdata ladattu:', `${TOURS.length} turnausta, ${M.length} ottelua, ${PLAYERS.length} pelaajaa`);
    
    // Alusta sivu kun data on ladattu
    if (typeof init === 'function') {
      init();
    }
  } catch (error) {
    console.error('Virhe ladattaessa turnaustietoja:', error);
    document.body.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:monospace;color:#e85040;background:#071a0d;text-align:center;padding:40px"><div><div style="font-size:40px;margin-bottom:12px">⚠️</div><div style="font-size:18px;font-weight:700;margin-bottom:8px">Dataa ei voitu ladata</div><div style="font-size:13px;color:#6a9e78">${error.message}</div></div></div>`;
  }
}

// Aloita lataus kun sivu on ladattu
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadData);
} else {
  loadData();
}

// Elo-rating laskenta
// Tiimin vahvuus = parin pelaajien Elo-arvojen keskiarvo
// Voiton/häviön paino määräytyy pistemäärän mukaan (suuri voittomarginaali = suurempi muutos)
// Muutos 1: dynaaminen K-faktor — uudella pelaajalla suurempi K, tasaantuu kokemuksen myötä
// Muutos 2: saman kierroksen ottelut käsitellään samanaikaisesti (ei järjestysharha)
function computeElo() {
  const ratings = {};
  const matchCount = {};
  PLAYERS.forEach(p => { ratings[p] = 1000; matchCount[p] = 0; ELO_HISTORY[p] = []; });

  // K pienenee kokemuksen myötä: uusi pelaaja <10 ottelua → 40, 10–20 → 32, 20+ → 24
  const getK = n => n < 10 ? 40 : n < 20 ? 32 : 24;

  // Ryhmitä ottelut (turnaus, kierros) -pareittain samanaikaista käsittelyä varten
  const ordered = [...M].sort((a, b) => a.t !== b.t ? a.t - b.t : a.r - b.r);
  const rounds = [];
  ordered.forEach(m => {
    const last = rounds[rounds.length - 1];
    if (!last || last.t !== m.t || last.r !== m.r) rounds.push({ t: m.t, r: m.r, matches: [m] });
    else last.matches.push(m);
  });

  const maxT = rounds.length > 0 ? Math.max(...rounds.map(r => r.t)) : -1;
  let prevSnapped = false;

  rounds.forEach((round, ri) => {
    // Ota snapshot ennen viimeistä turnausta
    if (!prevSnapped && round.t === maxT) {
      PLAYERS.forEach(p => { ELO_PREV_RATINGS[p] = Math.round(ratings[p]); });
      prevSnapped = true;
    }
    // Laske kaikki deltat ensin vanhoilla ratingeilla
    const deltas = {};
    round.matches.forEach(m => {
      const rA = m.a.reduce((s, p) => s + ratings[p], 0) / m.a.length;
      const rB = m.b.reduce((s, p) => s + ratings[p], 0) / m.b.length;
      const eA = 1 / (1 + Math.pow(10, (rB - rA) / 400));
      const eB = 1 - eA;
      const total = m.sa + m.sb;
      const sA = total > 0 ? m.sa / total : 0.5;
      const sB = 1 - sA;
      // Jokainen pelaaja käyttää omaa K:taan ottelumäärän perusteella
      m.a.forEach(p => { deltas[p] = (deltas[p] || 0) + getK(matchCount[p]) * (sA - eA); });
      m.b.forEach(p => { deltas[p] = (deltas[p] || 0) + getK(matchCount[p]) * (sB - eB); });
    });
    // Päivitä kaikki ratingit ja ottelumäärät samanaikaisesti
    Object.entries(deltas).forEach(([p, d]) => { ratings[p] += d; });
    round.matches.forEach(m => { [...m.a, ...m.b].forEach(p => { matchCount[p]++; }); });
    // Tallenna Elo-snapshot viimeisen erän jälkeen joka turnauksessa
    const isLastRoundOfTour = (ri === rounds.length - 1) || rounds[ri + 1].t !== round.t;
    if (isLastRoundOfTour) { PLAYERS.forEach(p => { ELO_HISTORY[p].push({ ti: round.t, elo: Math.round(ratings[p]) }); }); }
  });

  if (!prevSnapped) {
    PLAYERS.forEach(p => { ELO_PREV_RATINGS[p] = 1000; });
  }
  PLAYERS.forEach(p => { ratings[p] = Math.round(ratings[p]); });
  ELO_RATINGS = ratings;
}



