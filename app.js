// ── CONFIG ────────────────────────────────────────────────────
const CONFIG = {
  lat:      39.9526,
  lon:      -75.1652,
  timezone: 'America/New_York',

  events: [
    { title: 'Memorial Day (Holiday)', date: 'May 25' },
    { title: 'Faculty Dev & Closing',  date: 'Jun 8'  },
    { title: 'Commencement',           date: 'Jun 11' },
  ],

  compliments: [
    "You're doing great.",
    "Stay curious.",
    "Make today count.",
    "Keep building.",
    "One step at a time.",
    "You've got this.",
    "Make it happen.",
    "Sharp mind, sharp work.",
  ],

  newsFeeds: [
    { name: 'BBC',  url: 'https://feeds.bbci.co.uk/news/rss.xml'                   },
    { name: 'ESPN', url: 'https://www.espn.com/espn/rss/news'                      },
    { name: 'EA',   url: 'https://www.episcopalacademy.org/fs/rss/news'            },
  ],
};

// ── WMO code → emoji + label ──────────────────────────────────
function wmoInfo(code) {
  if (code === 0)  return { icon: '☀️',  label: 'Clear' };
  if (code <= 2)   return { icon: '🌤️',  label: 'Partly Cloudy' };
  if (code === 3)  return { icon: '☁️',  label: 'Overcast' };
  if (code <= 48)  return { icon: '🌫️',  label: 'Fog' };
  if (code <= 57)  return { icon: '🌦️',  label: 'Drizzle' };
  if (code <= 67)  return { icon: '🌧️',  label: 'Rain' };
  if (code <= 77)  return { icon: '❄️',  label: 'Snow' };
  if (code <= 82)  return { icon: '🌦️',  label: 'Showers' };
  if (code <= 99)  return { icon: '⛈️',  label: 'Thunderstorm' };
  return { icon: '🌡️', label: 'Unknown' };
}

// ── Clock ─────────────────────────────────────────────────────
function updateClock() {
  const now  = new Date();
  let h      = now.getHours();
  const m    = String(now.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'pm' : 'am';
  h = h % 12 || 12;

  const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const MONTHS = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);

  document.getElementById('clock-hm').textContent   = `${h}:${m}`;
  document.getElementById('clock-ampm').textContent  = ampm;
  document.getElementById('clock-date').textContent  =
    `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}`;
  document.getElementById('clock-week').textContent  = `Week ${week}`;
}
setInterval(updateClock, 1000);
updateClock();

// ── Weather — Open-Meteo (free, no API key) ───────────────────
async function loadWeather() {
  try {
    const url = `https://api.open-meteo.com/v1/forecast`
      + `?latitude=${CONFIG.lat}&longitude=${CONFIG.lon}`
      + `&current=temperature_2m,apparent_temperature,weather_code`
      + `&daily=weather_code,temperature_2m_max,temperature_2m_min`
      + `&temperature_unit=fahrenheit`
      + `&timezone=${CONFIG.timezone}`
      + `&forecast_days=5`;

    const data  = await fetch(url).then(r => r.json());
    const cur   = data.current;
    const daily = data.daily;
    const { icon, label } = wmoInfo(cur.weather_code);

    document.getElementById('weather-icon').textContent  = icon;
    document.getElementById('weather-temp').textContent  = `${Math.round(cur.temperature_2m)}°F`;
    document.getElementById('weather-desc').textContent  = label;
    document.getElementById('weather-feels').textContent = `Feels like ${Math.round(cur.apparent_temperature)}°`;

    document.getElementById('forecast').innerHTML = daily.time.map((t, i) => {
      const d   = new Date(t + 'T12:00:00');
      const day = i === 0 ? 'Today' : i === 1 ? 'Tomorrow'
                : d.toLocaleDateString('en-US', { weekday: 'short' });
      const { icon: fi } = wmoInfo(daily.weather_code[i]);
      const hi  = Math.round(daily.temperature_2m_max[i]);
      return `<div class="forecast-row">
        <span class="forecast-day">${day}</span>
        <span class="forecast-icon">${fi}</span>
        <span class="forecast-temp">${hi}°</span>
      </div>`;
    }).join('');
  } catch (e) {
    console.error('Weather error:', e);
  }
}
loadWeather();
setInterval(loadWeather, 10 * 60 * 1000);

// ── MLB team ID → abbreviation (abbreviation not in schedule API) ─
const TEAM_ABBR = {
  108:'LAA', 109:'ARI', 110:'BAL', 111:'BOS', 112:'CHC',
  113:'CIN', 114:'CLE', 115:'COL', 116:'DET', 117:'HOU',
  118:'KC',  119:'LAD', 120:'WSH', 121:'NYM', 133:'OAK',
  134:'PIT', 135:'SD',  136:'SEA', 137:'SF',  138:'STL',
  139:'TB',  140:'TEX', 141:'TOR', 142:'MIN', 143:'PHI',
  144:'ATL', 145:'CWS', 146:'MIA', 147:'NYY', 158:'MIL',
};

// ── Phillies — past 5 game results ───────────────────────────
async function loadPhillies() {
  try {
    const today = new Date();
    const fmt   = d => d.toISOString().slice(0, 10);

    const past10 = new Date(today); past10.setDate(past10.getDate() - 10);
    const ahead2 = new Date(today); ahead2.setDate(ahead2.getDate() + 2);

    const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&teamId=143`
      + `&startDate=${fmt(past10)}&endDate=${fmt(ahead2)}`
      + `&hydrate=linescore&gameType=R`;

    const data     = await fetch(url).then(r => r.json());
    const allDates = data.dates || [];
    const allGames = allDates.flatMap(d => d.games.map(g => ({ ...g, dateStr: d.date })));

    const todayStr   = fmt(today);
    const completed  = allGames
      .filter(g => {
        const s = g.status?.detailedState || '';
        return (s.includes('Final') || s.includes('Game Over')) && g.dateStr < todayStr;
      })
      .slice(-5)
      .reverse();

    const tonightGame = allGames.find(g =>
      g.dateStr === todayStr &&
      (g.status?.detailedState === 'Scheduled' || g.status?.detailedState === 'Preview' || g.status?.detailedState === 'In Progress')
    );

    // Extract record from most recent completed game
    let record = '';
    if (completed.length > 0) {
      const g   = completed[0];
      const phi = g.teams?.home?.team?.id === 143 ? g.teams.home : g.teams.away;
      const lr  = phi?.leagueRecord;
      if (lr) record = `${lr.wins}–${lr.losses}`;
    }

    const recent3 = completed.slice(0, 3);

    const cardsHtml = recent3.map(g => {
      const isHome  = g.teams?.home?.team?.id === 143;
      const phi     = isHome ? g.teams.home : g.teams.away;
      const opp     = isHome ? g.teams.away : g.teams.home;
      const phiS    = phi?.score ?? '?';
      const oppS    = opp?.score ?? '?';
      const won     = Number(phiS) > Number(oppS);
      const oppId   = opp?.team?.id;
      const oppAbbr = TEAM_ABBR[oppId] || '???';

      const dateLabel = new Date(g.gameDate || g.dateStr + 'T00:00:00')
        .toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: CONFIG.timezone });

      return `<div class="score-card ${won ? 'win' : ''}">
        <div class="card-badge ${won ? 'w' : 'l'}">${won ? 'WIN' : 'LOSS'}</div>
        <div class="card-matchup">
          <div class="card-side">
            <span class="card-num ${won ? 'hi' : 'lo'}">${phiS}</span>
            <img class="card-logo" src="https://www.mlbstatic.com/team-logos/143.svg"
                 onerror="this.style.visibility='hidden'" alt="PHI">
            <span class="card-abbr">PHI</span>
          </div>
          <span class="card-sep">–</span>
          <div class="card-side">
            <span class="card-num">${oppS}</span>
            <img class="card-logo" src="https://www.mlbstatic.com/team-logos/${oppId}.svg"
                 onerror="this.style.visibility='hidden'" alt="${oppAbbr}">
            <span class="card-abbr">${oppAbbr}</span>
          </div>
        </div>
        <div class="card-date">${dateLabel}</div>
      </div>`;
    }).join('');

    let tonightHtml = '';
    if (tonightGame) {
      const isHome    = tonightGame.teams?.home?.team?.id === 143;
      const opp       = isHome ? tonightGame.teams.away : tonightGame.teams.home;
      const oppAbbr   = TEAM_ABBR[opp?.team?.id] || '???';
      const isLive    = tonightGame.status?.detailedState === 'In Progress';

      if (isLive) {
        const phi       = isHome ? tonightGame.teams.home : tonightGame.teams.away;
        const oppTeam   = isHome ? tonightGame.teams.away : tonightGame.teams.home;
        const inning    = tonightGame.linescore?.currentInning || '';
        const half      = tonightGame.linescore?.inningHalf || '';
        const inningStr = inning ? `${half === 'Top' ? '▲' : '▼'}${inning}` : 'Live';
        tonightHtml = `<div class="score-tonight">${inningStr} &nbsp; PHI ${phi?.score ?? '–'} · ${oppAbbr} ${oppTeam?.score ?? '–'}</div>`;
      } else {
        const gameTime = tonightGame.gameDate
          ? new Date(tonightGame.gameDate).toLocaleTimeString('en-US',
              { hour: 'numeric', minute: '2-digit', timeZone: CONFIG.timezone })
          : '';
        tonightHtml = `<div class="score-tonight">Tonight vs ${oppAbbr} · ${gameTime}</div>`;
      }
    }

    document.getElementById('phillies').innerHTML = `
      ${record ? `<div class="score-record">${record}</div>` : ''}
      <div class="score-cards">${cardsHtml || '<div class="score-record">No recent results</div>'}</div>
      ${tonightHtml}`;
  } catch (e) {
    console.error('Phillies error:', e);
    document.getElementById('phillies').innerHTML = '<div class="score-record">—</div>';
  }
}

// ── Season detection ─────────────────────────────────────────
const SEASONS = {
  eagles:  { start: { m: 9,  d: 1 }, end: { m: 1, d: 31 } }, // Sep-Jan
  sixers:  { start: { m: 10, d: 1 }, end: { m: 4, d: 30 } }, // Oct-Apr
  phillies: { start: { m: 3, d: 1 }, end: { m: 10, d: 31 } }, // Mar-Oct
  union:   { start: { m: 2, d: 1 }, end: { m: 11, d: 30 } }, // Feb-Nov
};

function isTeamInSeason(team) {
  const now = new Date();
  const m = now.getMonth() + 1; // 1-12
  const d = now.getDate();      // 1-31
  const season = SEASONS[team];
  if (!season) return false;

  const { start, end } = season;
  if (start.m <= end.m) {
    return m >= start.m && m <= end.m && (m > start.m || d >= start.d) && (m < end.m || d <= end.d);
  } else {
    return (m >= start.m && (m > start.m || d >= start.d)) || (m <= end.m && (m < end.m || d <= end.d));
  }
}

function populateSportsGrid() {
  const teams = ['eagles', 'sixers', 'phillies', 'union'];
  for (const team of teams) {
    const card = document.getElementById(`${team}-card`);
    if (card) {
      if (isTeamInSeason(team)) {
        card.classList.add('visible');
      } else {
        card.classList.remove('visible');
      }
    }
  }
}

// ── Eagles — NFL (via ESPN feed) ───────────────────────────
async function loadEagles() {
  try {
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent('https://www.espn.com/espn/rss/nfl/news?tc=nfl')}`;
    const data = await fetch(proxy).then(r => r.json());
    const xml = new DOMParser().parseFromString(data.contents, 'text/xml');

    let eaglesScore = '';
    xml.querySelectorAll('item').forEach(item => {
      const title = item.querySelector('title')?.textContent || '';
      if (title.toLowerCase().includes('eagles')) {
        eaglesScore = title;
      }
    });

    document.getElementById('eagles').innerHTML = eaglesScore
      ? `<div style="font-size: 12px; color: var(--text-muted);">${eaglesScore.substring(0, 80)}...</div>`
      : '<div style="color: var(--text-dim);">No recent updates</div>';
  } catch (e) {
    console.error('Eagles error:', e);
    document.getElementById('eagles').innerHTML = '<div style="color: var(--text-dim);">—</div>';
  }
}

// ── Sixers — NBA (via ESPN feed) ────────────────────────
async function loadSixers() {
  try {
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent('https://www.espn.com/espn/rss/nba/news')}`;
    const data = await fetch(proxy).then(r => r.json());
    const xml = new DOMParser().parseFromString(data.contents, 'text/xml');

    let sixersScore = '';
    xml.querySelectorAll('item').forEach(item => {
      const title = item.querySelector('title')?.textContent || '';
      if (title.toLowerCase().includes('76ers') || title.toLowerCase().includes('sixers')) {
        sixersScore = title;
      }
    });

    document.getElementById('sixers').innerHTML = sixersScore
      ? `<div style="font-size: 12px; color: var(--text-muted);">${sixersScore.substring(0, 80)}...</div>`
      : '<div style="color: var(--text-dim);">No recent updates</div>';
  } catch (e) {
    console.error('Sixers error:', e);
    document.getElementById('sixers').innerHTML = '<div style="color: var(--text-dim);">—</div>';
  }
}

// ── Union — MLS (via ESPN feed) ────────────────────────────
async function loadUnion() {
  try {
    const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent('https://www.espn.com/espn/rss/soccer/news?tc=mls')}`;
    const data = await fetch(proxy).then(r => r.json());
    const xml = new DOMParser().parseFromString(data.contents, 'text/xml');

    let unionScore = '';
    xml.querySelectorAll('item').forEach(item => {
      const title = item.querySelector('title')?.textContent || '';
      if (title.toLowerCase().includes('philadelphia union') || title.toLowerCase().includes('union')) {
        unionScore = title;
      }
    });

    document.getElementById('union').innerHTML = unionScore
      ? `<div style="font-size: 12px; color: var(--text-muted);">${unionScore.substring(0, 80)}...</div>`
      : '<div style="color: var(--text-dim);">No recent updates</div>';
  } catch (e) {
    console.error('Union error:', e);
    document.getElementById('union').innerHTML = '<div style="color: var(--text-dim);">—</div>';
  }
}

// ── Load all sports and show based on season ────────────────
function loadAllSports() {
  populateSportsGrid();
  if (isTeamInSeason('eagles'))   loadEagles();
  if (isTeamInSeason('sixers'))   loadSixers();
  if (isTeamInSeason('phillies')) loadPhillies();
  if (isTeamInSeason('union'))    loadUnion();
}

loadAllSports();
setInterval(loadAllSports, 5 * 60 * 1000);

// ── Compliments ───────────────────────────────────────────────
function updateCompliment() {
  const el = document.getElementById('compliment');
  el.style.opacity = 0;
  setTimeout(() => {
    const list = CONFIG.compliments;
    el.textContent = list[Math.floor(Math.random() * list.length)];
    el.style.opacity = 1;
  }, 1000);
}
updateCompliment();
setInterval(updateCompliment, 30 * 1000);

// ── Calendar ──────────────────────────────────────────────────
document.getElementById('calendar').innerHTML = CONFIG.events.map(e => `
  <div class="cal-row">
    <span class="cal-title">${e.title}</span>
    <span class="cal-date">${e.date}</span>
  </div>`).join('');

// ── News — via allorigins CORS proxy ──────────────────────────
async function loadNews() {
  const items = [];
  for (const feed of CONFIG.newsFeeds) {
    try {
      const proxy = `https://api.allorigins.win/get?url=${encodeURIComponent(feed.url)}`;
      const data  = await fetch(proxy).then(r => r.json());
      const xml   = new DOMParser().parseFromString(data.contents, 'text/xml');
      xml.querySelectorAll('item').forEach((item, i) => {
        if (i < 2) items.push({
          title:  item.querySelector('title')?.textContent || '',
          source: feed.name,
        });
      });
    } catch (e) {
      console.error(`News error (${feed.name}):`, e);
    }
  }
  document.getElementById('news').innerHTML = items.map(item => `
    <div class="news-item">
      <div class="news-title">${item.title}</div>
      <div class="news-source">${item.source}</div>
    </div>`).join('');
}
loadNews();
setInterval(loadNews, 15 * 60 * 1000);

// ── Auto-reload every 5 min (picks up GitHub Pages deploys) ───
setInterval(() => location.reload(), 5 * 60 * 1000);
