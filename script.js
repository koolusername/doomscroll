// Doom Infinite Scroll Gallery
// Fetches images from Wikimedia Commons, falls back to static images if needed

const gallery = document.getElementById('gallery');
const IMAGES_PER_PAGE = 10;
let page = 0;
let loading = false;
let doomImages = [];

// Fetch Doom images from Wikimedia Commons API
async function fetchDoomImages(page, limit) {
  const apiUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=doom%20game&gsrlimit=${limit}&gsroffset=${page * limit}&prop=imageinfo&iiprop=url&format=json&origin=*`;
  try {
    const res = await fetch(apiUrl);
    const data = await res.json();
    if (data.query && data.query.pages) {
      return Object.values(data.query.pages)
        .map(page => page.imageinfo && page.imageinfo[0].url)
        .filter(Boolean);
    }
    return [];
  } catch {
    return [];
  }
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

  // If API returns less than requested, try to fetch more until IMAGES_PER_PAGE is filled
  if (newImages.length < IMAGES_PER_PAGE && doomImages.length === 0) {
    // Fallback to static images
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
    // Fill up to IMAGES_PER_PAGE
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
