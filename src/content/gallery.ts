// Gallery items. To replace an image: drop a new file into src/assets/images/gallery/
// and set `file` to its name (.jpg / .png / .webp). Astro converts it to AVIF/WebP at build time.
// DUMMY — replace before launch

export type GalleryCategory = 'land' | 'amenities' | 'visits' | 'events';

export const galleryFilters: { value: 'all' | GalleryCategory; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'land', label: 'Land view' },
  { value: 'amenities', label: 'Amenities' },
  { value: 'visits', label: 'Site visits' },
  { value: 'events', label: 'Events' },
];

export const gallery: { file: string; alt: string; caption: string; category: GalleryCategory }[] = [
  { file: 'g1.jpg', alt: 'Farmland view with hills in the background', caption: 'Morning view towards the Western Ghats', category: 'land' },
  { file: 'g2.jpg', alt: 'Coconut grove along the plot boundary', caption: 'Coconut grove on the eastern side', category: 'land' },
  { file: 'g3.jpg', alt: 'Entrance gate with fencing', caption: 'Gated entrance with fencing', category: 'amenities' },
  { file: 'g4.jpg', alt: 'Family walking through the plot during a site visit', caption: 'Weekend site visit', category: 'visits' },
  { file: 'g5.jpg', alt: 'Borewell and water storage on site', caption: 'Borewell and storage', category: 'amenities' },
  { file: 'g6.jpg', alt: 'Customers at the plot registration ceremony', caption: 'Registration day celebration', category: 'events' },
  { file: 'g7.jpg', alt: 'Internal road leading through the farmland', caption: 'Internal approach road', category: 'amenities' },
  { file: 'g8.jpg', alt: 'Wide open farmland under a clear sky', caption: 'Open plots ready for planting', category: 'land' },
  { file: 'g9.jpg', alt: 'Team explaining documents to visitors', caption: 'Document walkthrough with our team', category: 'visits' },
  { file: 'g10.jpg', alt: 'Sapling planting event with customers', caption: 'Sapling planting drive', category: 'events' },
  { file: 'g11.jpg', alt: 'Sunset over the farmland', caption: 'Golden hour at the site', category: 'land' },
  { file: 'g12.jpg', alt: 'Visitors having lunch at the site', caption: 'Lunch after the site tour', category: 'visits' },
];
