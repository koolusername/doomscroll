const gallery = document.getElementById('gallery');
const IMAGES_PER_PAGE = 10;
let page = 0;
let loading = false;
let doomImages = [];
let redditAfter = null;

// Fetch Doom images from Wikimedia, Wikipedia, or Reddit
async function fetchDoomImages(page, limit) {
  // 1. Wikimedia Commons
  try {
    const commonsApi = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=doom%20game&gsrlimit=${limit}&gsroffset=${page * limit}&prop=imageinfo&iiprop=url&format=json&origin=*`;
    const res = await fetch(commonsApi);
    const data = await res.json();
    if (data.query?.pages) {
      const commonsImages = Object.values(data.query.pages)
        .map(p => p.imageinfo?.[0]?.url)
        .filter(Boolean);
      if (commonsImages.length > 0) return commonsImages;
    }
  } catch (e) {
    console.warn('Wikimedia fetch error:', e);
  }

  // 2. Wikipedia
  try {
    const wikiApi = 'https://en.wikipedia.org/w/api.php?action=query&titles=Doom_(1993_video_game)&prop=images&format=json&origin=*';
    const res = await fetch(wikiApi);
    const data = await res.json();
    const pageObj = Object.values(data.query?.pages ?? {})[0];
    const imageTitles = pageObj?.images?.map(img => img.title) ?? [];

    const urls = await Promise.all(imageTitles.map(async title => {
      try {
        const urlApi = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&format=json&origin=*`;
        const res = await fetch(urlApi);
        const data = await res.json();
        const page = Object.values(data.query?.pages ?? {})[0];
        return page?.imageinfo?.[0]?.url || null;
      } catch {
        return null;
      }
    }));

    const wikiImages = urls.filter(Boolean).slice(0, limit);
    if (wikiImages.length > 0) return wikiImages;
  } catch (e) {
    console.warn('Wikipedia fetch error:', e);
  }

  // 3. Reddit (r/Doom)
  try {
    const redditApi = `https://www.reddit.com/r/Doom.json?limit=${limit}${redditAfter ? `&after=${redditAfter}` : ''}`;
    const res = await fetch(redditApi);
    const data = await res.json();
    redditAfter = data.data?.after || null;

    if (data.data?.children) {
      const redditImages = data.data.children
        .map(post => post.data?.url)
        .filter(url => url && /\.(jpg|jpeg|png|gif)$/i.test(url));
      if (redditImages.length > 0) return redditImages;
    }
  } catch (e) {
    console.warn('Reddit fetch error:', e);
  }

  return [];
}

// Render images
function renderImages(images) {
  images.forEach(imgUrl => {
    const card = document.createElement('div');
    card.className = 'img-card';
    const img = document.createElement('img');
    img.src = imgUrl;
    img.alt = 'Doom screenshot';
    img.loading = 'lazy';
    card.appendChild(img);
    gallery.appendChild(card);
  });
}

// Show/hide spinner
function setLoadingSpinner(visible) {
  const spinner = document.getElementById('loading');
  spinner.style.display = visible ? 'block' : 'none';
}

// Load images and handle fallback
async function loadImages() {
  if (loading) return;
  loading = true;
  setLoadingSpinner(true);

  let newImages = await fetchDoomImages(page, IMAGES_PER_PAGE);

  // Static fallback
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

  if (newImages.length > 0) {
    renderImages(newImages);
    page++;
  }

  setLoadingSpinner(false);
  loading = false;
}

// Infinite scroll trigger
function handleScroll() {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 300) {
    loadImages();
  }
}

window.addEventListener('scroll', handleScroll);

// Initial load
loadImages();
