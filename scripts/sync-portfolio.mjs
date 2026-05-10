import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';

const repoRoot = '/Users/theo/Desktop/theoolesen.com';
const portfolioRoot = '/Users/theo/Desktop/theoolesen portfolio';
const headshotSource = '/Users/theo/Documents/2024/Ultimate Chad Pics/olesenheadshot.jpg';

const assetsRoot = path.join(repoRoot, 'src/assets');
const portfolioAssetsRoot = path.join(assetsRoot, 'portfolio');
const siteAssetsRoot = path.join(assetsRoot, 'site');
const dataRoot = path.join(repoRoot, 'src/data');
const projectsDataPath = path.join(dataRoot, 'projects.json');
const siteDataPath = path.join(dataRoot, 'site.json');

const MAX_DIMENSION = 3200;
const execFileAsync = promisify(execFile);

const projectBlueprints = [
  {
    source: 'plus_ultra',
    slug: 'plus-ultra',
    title: 'Plus Ultra Window Cleaning',
    category: 'branding',
    gridSize: 'hero',
  },
  {
    source: 'violet_vendetta',
    slug: 'violet-vendetta',
    title: 'Violet Vendetta',
    category: 'branding',
    gridSize: 'standard',
  },
  {
    source: 'album_covers',
    slug: 'album-covers',
    title: 'Album Covers',
    category: 'branding',
    gridSize: 'standard',
  },
  {
    source: 'BSW',
    slug: 'beautiful-swear-words',
    title: 'Beautiful Swear Words',
    category: 'web',
    gridSize: 'hero',
  },
  {
    source: 'BSW T Shirts',
    slug: 'beautiful-swear-words-t-shirts',
    title: 'Beautiful Swear Words T-Shirts',
    category: 'branding',
    gridSize: 'standard',
  },
  {
    source: 'murals',
    slug: 'murals',
    title: 'Murals',
    category: 'creative',
    gridSize: 'hero',
  },
  {
    source: 'cv_youth_compass',
    slug: 'cv-youth-compass',
    title: 'CV Youth Compass',
    category: 'branding',
    gridSize: 'standard',
  },
  {
    source: 'rhino_snot.png',
    slug: 'rhino-snot',
    title: 'Rhino Snot',
    category: 'branding',
    gridSize: 'standard',
  },
  {
    source: 'storyboards',
    slug: 'storyboards',
    title: 'Storyboards',
    category: 'creative',
    gridSize: 'standard',
  },
];

function sentenceCaseCategory(category) {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function buildDescription(project) {
  return `Placeholder copy for ${project.title}. This ${project.category} project will be updated with final context, process, and outcomes.`;
}

function buildBody(project) {
  const label = sentenceCaseCategory(project.category);
  return `${project.title} is a ${label.toLowerCase()} project in Theo Olesen's portfolio.\n\nThis placeholder text can be replaced in Pages CMS with the final story, scope, and any launch details.`;
}

function sanitizeBaseName(fileName) {
  return path
    .parse(fileName)
    .name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function isGif(filePath) {
  return path.extname(filePath).toLowerCase() === '.gif';
}

function isSkippable(fileName) {
  return fileName === '.DS_Store';
}

function basenameFromAssetPath(assetPath = '') {
  return path.basename(assetPath);
}

async function readJson(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function ensureCleanDirectory(dir) {
  await fs.rm(dir, { recursive: true, force: true });
  await fs.mkdir(dir, { recursive: true });
}

async function listProjectFiles(source) {
  const sourcePath = path.join(portfolioRoot, source);
  const stat = await fs.stat(sourcePath);

  if (stat.isFile()) {
    return [sourcePath];
  }

  const entries = await fs.readdir(sourcePath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && !isSkippable(entry.name))
    .map((entry) => path.join(sourcePath, entry.name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

async function transformStaticImage(inputPath, outputPath) {
  const sourcePath = await prepareStaticSource(inputPath);

  await sharp(sourcePath)
    .rotate()
    .resize({
      width: MAX_DIMENSION,
      height: MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 84, effort: 5 })
    .toFile(outputPath);

  if (sourcePath !== inputPath) {
    await fs.rm(sourcePath, { force: true });
  }
}

async function copyAnimatedGif(inputPath, outputPath) {
  await fs.copyFile(inputPath, outputPath);
}

async function prepareStaticSource(inputPath) {
  const ext = path.extname(inputPath).toLowerCase();

  if (ext !== '.heic' && ext !== '.heif') {
    return inputPath;
  }

  const tempPath = path.join(
    os.tmpdir(),
    `theoolesen-${Date.now()}-${Math.random().toString(36).slice(2)}.png`,
  );

  await execFileAsync('sips', ['-s', 'format', 'png', inputPath, '--out', tempPath]);
  return tempPath;
}

async function importMediaFile(inputPath, projectDir, index) {
  const ext = path.extname(inputPath).toLowerCase();
  const baseName = sanitizeBaseName(path.basename(inputPath));
  const fileStem = `${String(index + 1).padStart(2, '0')}-${baseName}`;
  const animated = ext === '.gif';
  const outputFileName = `${fileStem}${animated ? '.gif' : '.webp'}`;
  const outputPath = path.join(projectDir, outputFileName);

  if (animated) {
    await copyAnimatedGif(inputPath, outputPath);
  } else {
    await transformStaticImage(inputPath, outputPath);
  }

  return outputFileName;
}

async function syncProject(project) {
  const existingProjectsFile = await readJson(projectsDataPath);
  const existingProject = existingProjectsFile?.items?.find((item) => item.slug === project.slug) ?? null;
  const sourceFiles = await listProjectFiles(project.source);
  const projectOutputDir = path.join(portfolioAssetsRoot, project.slug);
  await ensureCleanDirectory(projectOutputDir);

  const gallery = [];

  for (const [index, inputPath] of sourceFiles.entries()) {
    const importedFileName = await importMediaFile(inputPath, projectOutputDir, index);
    const publicPath = `/src/assets/portfolio/${project.slug}/${importedFileName}`;
    gallery.push({
      type: 'image',
      src: publicPath,
      alt: `${project.title} image ${index + 1}`,
      animated: importedFileName.endsWith('.gif'),
    });
  }

  const orderedGallery = mergeGallery(existingProject?.gallery, gallery);
  const persistedThumbnail = resolveThumbnail(existingProject?.thumbnail, orderedGallery);

  return {
    slug: project.slug,
    title: existingProject?.title || project.title,
    category: existingProject?.category || project.category,
    gridSize: existingProject?.gridSize || project.gridSize,
    client: existingProject?.client || '',
    year: existingProject?.year || '',
    thumbnail: persistedThumbnail,
    description: existingProject?.description || buildDescription(project),
    body: existingProject?.body || buildBody(project),
    gallery: orderedGallery,
  };
}

function mergeGallery(existingGallery = [], incomingGallery = []) {
  const incomingByName = new Map(
    incomingGallery.map((item) => [basenameFromAssetPath(item.src), item]),
  );

  const merged = [];
  const seen = new Set();

  for (const existingItem of existingGallery) {
    const key = basenameFromAssetPath(existingItem.src);
    const incomingItem = incomingByName.get(key);
    if (!incomingItem) continue;

    merged.push({
      ...incomingItem,
      alt: existingItem.alt || incomingItem.alt,
      caption: existingItem.caption || '',
      type: existingItem.type || incomingItem.type,
      animated: existingItem.animated ?? incomingItem.animated,
      url: existingItem.url || incomingItem.url,
      poster: existingItem.poster || incomingItem.poster,
    });
    seen.add(key);
  }

  for (const incomingItem of incomingGallery) {
    const key = basenameFromAssetPath(incomingItem.src);
    if (seen.has(key)) continue;
    merged.push(incomingItem);
  }

  return merged;
}

function resolveThumbnail(existingThumbnail, gallery) {
  const existingName = basenameFromAssetPath(existingThumbnail);
  if (existingName) {
    const matched = gallery.find((item) => basenameFromAssetPath(item.src) === existingName);
    if (matched?.src) return matched.src;
  }

  return gallery.find((item) => !item.animated)?.src ?? gallery[0]?.src ?? '';
}

async function syncHeadshot() {
  await fs.mkdir(siteAssetsRoot, { recursive: true });
  const outputPath = path.join(siteAssetsRoot, 'olesenheadshot.webp');

  await sharp(headshotSource)
    .rotate()
    .resize({
      width: 1800,
      height: 1800,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .grayscale()
    .webp({ quality: 88, effort: 5 })
    .toFile(outputPath);

  return '/src/assets/site/olesenheadshot.webp';
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function main() {
  await fs.mkdir(portfolioAssetsRoot, { recursive: true });
  const existingProjectsFile = await readJson(projectsDataPath);
  const existingSiteData = await readJson(siteDataPath);

  const projects = [];
  for (const project of projectBlueprints) {
    projects.push(await syncProject(project));
  }

  const headshot = await syncHeadshot();

  const projectData = {
    workIntro: existingProjectsFile?.workIntro || 'A selection of branding, web, and creative work.',
    items: projects,
  };

  const siteData = {
    name: existingSiteData?.name || 'Theo Olesen',
    role: existingSiteData?.role || 'Designer',
    location: existingSiteData?.location || 'Palm Desert, CA',
    description:
      existingSiteData?.description ||
      'Theo Olesen is a designer in Palm Desert, CA, working across branding, creative, and the web.',
    about:
      existingSiteData?.about ||
      "Theo Olesen is a designer in Palm Desert, CA. He works across branding, creative direction, and web projects, building identity systems and visual worlds that feel sharp, memorable, and human.",
    headshot,
    selectedClients: existingSiteData?.selectedClients || [],
    socials: existingSiteData?.socials || [
      {
        label: 'Handle',
        value: '@dudebrotheo',
        url: '',
      },
      {
        label: 'LinkedIn',
        value: 'linkedin.com/in/theoolesen',
        url: 'https://www.linkedin.com/in/theoolesen',
      },
    ],
  };

  await writeJson(path.join(dataRoot, 'projects.json'), projectData);
  await writeJson(path.join(dataRoot, 'site.json'), siteData);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
