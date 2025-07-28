// script.js

const gallery = document.getElementById('gallery');
const IMAGES_PER_PAGE = 10;
let page = 0;
let loading = false;
const doomImagesStatic = [
  // (static fallback URLs)
  'https://upload.wikimedia.org/wikipedia/en/5/57/Doom_cover_art.jpg',
  /* ...other URLs... */
];

const DOOM_SUBREDDITS = ['Doom', 'classicdoom', 'DoomMods', 'DoomModding', 'BrutalDoom'];
const redditCursors = {};
let currentSubIndex = 0;

// 1. Fetch from Wikimedia Commons or Wikipedia
async function fetchFromWikimedia(limit) {
  const commonsApi = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=doom%20game&gsrlimit=${limit}&prop=imageinfo&iiprop=url&format=json&origin=*`;
  try {
    const res = await fetch(commonsApi);
    const data = await res.json();
    if (data.query?.pages) {
      const images = Object.values(data.query.pages)
        .map(p => p.imageinfo?.[0]?.url)
        .filter(Boolean);
      if (images.length) return images;
    }
  } catch (e) {
    console.warn('Wikimedia error', e);
  }

  try {
    const wikiApi = `https://en.wikipedia.org/w/api.php?action=query&titles=Doom_(1993_video_game)&prop=images&format=json&origin=*`;
    const res = await fetch(wikiApi);
    const data = await res.json();
    const pageObj = Object.values(data.query?.pages || {})[0];
    const titles = pageObj?.images?.map(img => img.title) || [];

    const urls = await Promise.all(titles.map(async title => {
      try {
        const resp2 = await fetch(`https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&format=json&origin=*`);
        const d2 = await resp2.json();
        const pg = Object.values(d2.query?.pages || {})[0];
        return pg?.imageinfo?.[0]?.url || null;
      } catch {
        return null;
      }
    }));

    const wikiImages = urls.filter(Boolean).slice(0, limit);
    if (wikiImages.length) return wikiImages;
  } catch (e) {
    console.warn('Wikipedia error', e);
  }

  return [];
}

// 2. Fetch from multiple Reddit subreddits
async function fetchRedditImages(limit) {
  const startIdx = currentSubIndex;
  for (let i = 0; i < DOOM_SUBREDDITS.length; i++) {
    const idx = (startIdx + i) % DOOM_SUBREDDITS.length;
    const sub = DOOM_SUBREDDITS[idx];
    const after = redditCursors[sub] ? `&after=${redditCursors[sub]}` : '';
    const url = `https://www.reddit.com/r/${sub}.json?limit=${limit}${after}`;

    try {
      const res = await fetch(url);
      const json = await res.json();
      redditCursors[sub] = json.data?.after || null;

      const images = json.data?.children
        .map(c => c.data?.url)
        .filter(u => u && /\.(jpe?g|png|gif)$/i.test(u));
      if (images.length) {
        currentSubIndex = (idx + 1) % DOOM_SUBREDDITS.length;
        return images;
      }
    } catch (e) {
      console.warn(`r/${sub} fetch error`, e);
    }
  }
  return [];
}

// Main fetch logic
async function fetchDoomImages(limit) {
  const sources = [
    fetchFromWikimedia(limit),
    fetchRedditImages(limit)
  ];

  for (const src of sources) {
    const imgs = await src;
    if (imgs?.length) return imgs;
  }
  return [];
}

// Render images
function renderImages(images) {
  images.forEach(url => {
    const card = document.createElement('div');
    card.className = 'img-card';
    const img = document.createElement('img');
    img.src = url;
    img.alt = 'Doom screenshot';
    img.loading = 'lazy';
    card.appendChild(img);
    gallery.appendChild(card);
  });
}

function setSpinner(show) {
  document.getElementById('loading').style.display = show ? 'block' : 'none';
}

async function loadImages() {
  if (loading) return;
  loading = true;
  setSpinner(true);

  let images = await fetchDoomImages(IMAGES_PER_PAGE);
  if (!images.length) {
    const start = page * IMAGES_PER_PAGE;
    images = doomImagesStatic.slice(start, start + IMAGES_PER_PAGE) || [];
  }

  if (images.length) {
    renderImages(images);
    page++;
  }

  setSpinner(false);
  loading = false;
}

// Infinite scroll trigger
const observer = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) loadImages();
}, { root: null, threshold: 0.1 });

const loadingEl = document.getElementById('loading');
observer.observe(loadingEl);

// Initial load
loadImages();
