const gallery = document.getElementById('gallery');
const IMAGES_PER_PAGE = 20;
let page = 0;
let loading = false;

const DOOM_SUBREDDITS = ['Doom', 'classicdoom', 'DoomMods', 'DoomModding', 'BrutalDoom'];
const redditCursors = {}; // Tracks `after` per subreddit

const doomImagesStatic = [
  'https://upload.wikimedia.org/wikipedia/en/5/57/Doom_cover_art.jpg',
];

// --- Fetch from Reddit (bulk across subs) ---
async function fetchRedditImages(limitPerSub = 20) {
  const fetches = DOOM_SUBREDDITS.map(async sub => {
    const after = redditCursors[sub] ? `&after=${redditCursors[sub]}` : '';
    const url = `https://www.reddit.com/r/${sub}.json?limit=${limitPerSub}${after}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      redditCursors[sub] = data.data?.after || null;

      return data.data?.children
        .map(p => p.data?.url)
        .filter(url => url && /\.(jpe?g|png|gif)$/i.test(url)) || [];
    } catch (e) {
      console.warn(`Error fetching from r/${sub}:`, e);
      return [];
    }
  });

  const results = await Promise.all(fetches);
  const merged = results.flat();

  // Optional: de-duplicate
  const unique = [...new Set(merged)];

  return unique;
}

// --- Fetch from Wikimedia/Wikipedia ---
async function fetchWikimediaImages(limit) {
  try {
    const commonsApi = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=doom%20game&gsrlimit=${limit}&prop=imageinfo&iiprop=url&format=json&origin=*`;
    const res = await fetch(commonsApi);
    const data = await res.json();
    if (data.query?.pages) {
      const images = Object.values(data.query.pages)
        .map(p => p.imageinfo?.[0]?.url)
        .filter(Boolean);
      if (images.length) return images;
    }
  } catch {}

  try {
    const wikiApi = 'https://en.wikipedia.org/w/api.php?action=query&titles=Doom_(1993_video_game)&prop=images&format=json&origin=*';
    const res = await fetch(wikiApi);
    const data = await res.json();
    const pageObj = Object.values(data.query?.pages || {})[0];
    const imageTitles = pageObj?.images?.map(img => img.title) || [];

    const urls = await Promise.all(imageTitles.map(async title => {
      try {
        const urlApi = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&format=json&origin=*`;
        const res = await fetch(urlApi);
        const d = await res.json();
        const pg = Object.values(d.query?.pages || {})[0];
        return pg?.imageinfo?.[0]?.url || null;
      } catch {
        return null;
      }
    }));

    return urls.filter(Boolean).slice(0, limit);
  } catch {}

  return [];
}

// --- Master image fetcher ---
async function fetchDoomImages(limit) {
  const redditImgs = await fetchRedditImages(limit);
  if (redditImgs.length > 0) return redditImgs;

  const wikiImgs = await fetchWikimediaImages(limit);
  if (wikiImgs.length > 0) return wikiImgs;

  const start = page * IMAGES_PER_PAGE;
  return doomImagesStatic.slice(start, start + limit);
}

// --- Render images ---
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

// --- Show/hide loading spinner ---
function setSpinner(show) {
  document.getElementById('loading').style.display = show ? 'block' : 'none';
}

// --- Load next batch ---
async function loadImages() {
  if (loading) return;
  loading = true;
  setSpinner(true);

  const images = await fetchDoomImages(IMAGES_PER_PAGE);
  if (images.length) {
    renderImages(images);
    page++;
  }

  loading = false;
  setSpinner(false);
}

// --- Infinite scroll trigger ---
const observer = new IntersectionObserver(entries => {
  if (entries[0].isIntersecting) loadImages();
}, { root: null, threshold: 0.1 });

observer.observe(document.getElementById('loading'));

// --- Initial load ---
loadImages();
