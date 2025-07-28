// Doom Infinite Scroll Gallery
// Fetches images from Wikimedia Commons, falls back to static images if needed

const gallery = document.getElementById('gallery');
const IMAGES_PER_PAGE = 10;
let page = 0;
let loading = false;
let doomImages = [];

// Fetch Doom images from Wikimedia Commons, Wikipedia, or Reddit
async function fetchDoomImages(page, limit) {
  // 1. Try Wikimedia Commons
  const commonsApi = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=doom%20game&gsrlimit=${limit}&gsroffset=${page * limit}&prop=imageinfo&iiprop=url&format=json&origin=*`;
  try {
    const res = await fetch(commonsApi);
    const data = await res.json();
    if (data.query && data.query.pages) {
      const commonsImages = Object.values(data.query.pages)
        .map(page => page.imageinfo && page.imageinfo[0].url)
        .filter(Boolean);
      if (commonsImages.length > 0) return commonsImages;
    }
  } catch {}

  // 2. Try Wikipedia
  try {
    const wikiApi = 'https://en.wikipedia.org/w/api.php?action=query&titles=Doom_(1993_video_game)&prop=images&format=json&origin=*';
    const res = await fetch(wikiApi);
    const data = await res.json();
    const pageObj = data.query && data.query.pages && Object.values(data.query.pages)[0];
    if (pageObj && pageObj.images) {
      const imageTitles = pageObj.images.map(img => img.title);
      const urls = await Promise.all(imageTitles.map(async title => {
        const urlApi = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&format=json&origin=*`;
        try {
          const res = await fetch(urlApi);
          const data = await res.json();
          const page = data.query && data.query.pages && Object.values(data.query.pages)[0];
          return page && page.imageinfo && page.imageinfo[0].url;
        } catch {
          return null;
        }
      }));
      const wikiImages = urls.filter(Boolean).slice(page * limit, (page + 1) * limit);
      if (wikiImages.length > 0) return wikiImages;
    }
  } catch {}

  // 3. Try Reddit (r/Doom)
  try {
    const redditApi = `https://www.reddit.com/r/Doom.json?limit=${limit}&after=${page * limit}`;
    const res = await fetch(redditApi);
    const data = await res.json();
    if (data.data && data.data.children) {
      const redditImages = data.data.children
        .map(post => post.data && post.data.url)
        .filter(url => url && (url.endsWith('.jpg') || url.endsWith('.png') || url.endsWith('.jpeg')));
      if (redditImages.length > 0) return redditImages;
    }
  } catch {}

  return [];
}

// Render images to the gallery
function renderImages(images) {
  images.forEach(imgUrl => {
    const card = document.createElement('div');
    card.className = 'img-card';
    const img = document.createElement('img');
    img.src = imgUrl;
    img.alt = 'Doom screenshot';
    card.appendChild(img);
    gallery.appendChild(card);
  });
}

// Show/hide loading spinner
function setLoadingSpinner(visible) {
  const spinner = document.getElementById('loading');
  if (spinner) spinner.style.display = visible ? 'block' : 'none';
}

// Load next batch of images
async function loadImages() {
  if (loading) return;
  loading = true;
  setLoadingSpinner(true);

  let newImages = await fetchDoomImages(page, IMAGES_PER_PAGE);

  // Always fallback to static images if API returns zero images
  if (newImages.length === 0) {
    if (doomImages.length === 0) {
      doomImages = [
        'https://upload.wikimedia.org/wikipedia/en/5/57/Doom_cover_art.jpg',
        'https://static.wikia.nocookie.net/doom/images/2/2e/Doom1.png',
        'https://static.wikia.nocookie.net/doom/images/7/7e/Doom2.png',
        'https://static.wikia.nocookie.net/doom/images/3/3c/Doom3.png',
        'https://static.wikia.nocookie.net/doom/images/6/6e/Doom4.png',
        'https://static.wikia.nocookie.net/doom/images/8/8e/Doom5.png',
        'https://static.wikia.nocookie.net/doom/images/9/9e/Doom6.png',
        'https://static.wikia.nocookie.net/doom/images/1/1e/Doom7.png',
        'https://static.wikia.nocookie.net/doom/images/2/2e/Doom8.png',
        'https://static.wikia.nocookie.net/doom/images/3/3e/Doom9.png',
      ];
    }
    const start = page * IMAGES_PER_PAGE;
    const end = start + IMAGES_PER_PAGE;
    newImages = doomImages.slice(start, end);
  }

  // Only render if there are images
  if (newImages.length > 0) {
    renderImages(newImages);
    page++;
  }
  loading = false;
  setLoadingSpinner(false);
}

// Infinite scroll handler
async function handleScroll() {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
    await loadImages();
  }
}

window.addEventListener('scroll', handleScroll);

// Initial load
loadImages();
loadImages();
