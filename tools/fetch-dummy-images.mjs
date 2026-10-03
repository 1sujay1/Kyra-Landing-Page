// Downloads DUMMY placeholder images (picsum.photos / pravatar.cc) into src/assets/images.
// Replace these files with real photos before launch — keep the same file names,
// or change the names in src/content/*.ts.
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';

const jobs = [
  ['hero.jpg', 'https://picsum.photos/seed/kyra-hero/1920/1080'],
  ['about-1.jpg', 'https://picsum.photos/seed/kyra-about1/900/1100'],
  ['about-2.jpg', 'https://picsum.photos/seed/kyra-about2/800/600'],
  ['map-facade.jpg', 'https://picsum.photos/seed/kyra-map/1200/800'],
  ['video-placeholder.jpg', 'https://picsum.photos/seed/kyra-video/1280/720'],
  ['og-image.jpg', 'https://picsum.photos/seed/kyra-hero/1200/630', 'public'],
];
for (let i = 1; i <= 12; i++) {
  const tall = [2, 5, 7, 10].includes(i);
  jobs.push([`gallery/g${i}.jpg`, `https://picsum.photos/seed/kyra-g${i}/${tall ? '600/800' : '800/600'}`]);
}
for (let i = 1; i <= 5; i++) {
  jobs.push([`testimonials/t${i}.jpg`, `https://i.pravatar.cc/240?img=${[12, 47, 33, 45, 68][i - 1]}`]);
}

for (const [name, url, dir = 'src/assets/images'] of jobs) {
  const out = `${dir}/${name}`;
  if (existsSync(out) && !process.argv.includes('--force')) continue;
  mkdirSync(out.substring(0, out.lastIndexOf('/')), { recursive: true });
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  console.log(`image: ${out}`);
}
