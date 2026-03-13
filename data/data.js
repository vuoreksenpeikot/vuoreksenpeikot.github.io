// Turnausdata - Peikot Padel Tour 2026
let TOURS = [];
let M = [];
let PLAYERS = [];
let ELO_RATINGS = {};

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
function computeElo() {
  const K = 32;
  const ratings = {};
  PLAYERS.forEach(p => { ratings[p] = 1000; });

  const ordered = [...M].sort((a, b) => a.t !== b.t ? a.t - b.t : a.r - b.r);

  ordered.forEach(m => {
    const rA = m.a.reduce((s, p) => s + ratings[p], 0) / m.a.length;
    const rB = m.b.reduce((s, p) => s + ratings[p], 0) / m.b.length;
    const eA = 1 / (1 + Math.pow(10, (rB - rA) / 400));
    const eB = 1 - eA;
    const total = m.sa + m.sb;
    const sA = total > 0 ? m.sa / total : 0.5;
    const sB = 1 - sA;
    const deltaA = K * (sA - eA);
    const deltaB = K * (sB - eB);
    m.a.forEach(p => { ratings[p] += deltaA; });
    m.b.forEach(p => { ratings[p] += deltaB; });
  });

  PLAYERS.forEach(p => { ratings[p] = Math.round(ratings[p]); });
  ELO_RATINGS = ratings;
}



