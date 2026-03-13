// Turnausdata - Peikot Padel Tour 2026
let TOURS = [];
let M = [];
let PLAYERS = [];

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



