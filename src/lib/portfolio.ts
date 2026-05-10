import type { ImageMetadata } from 'astro';
import projectsData from '../data/projects.json';
import siteData from '../data/site.json';

type Category = 'branding' | 'web' | 'creative';
type GridSize = 'hero' | 'standard';
type MediaType = 'image' | 'video';
type ResolvedAsset = ImageMetadata | string;

interface RawSocialLink {
  label: string;
  value: string;
  url?: string;
}

interface RawMediaItem {
  type: MediaType;
  src?: string;
  url?: string;
  alt: string;
  caption?: string;
  animated?: boolean;
  poster?: string;
}

interface RawProject {
  slug: string;
  title: string;
  category: Category;
  gridSize: GridSize;
  client?: string;
  year?: string;
  thumbnail?: string;
  description?: string;
  body?: string;
  gallery: RawMediaItem[];
}

interface RawProjectsFile {
  workIntro?: string;
  items: RawProject[];
}

interface RawSiteData {
  name: string;
  role: string;
  location: string;
  description: string;
  about: string;
  headshot: string;
  selectedClients: string[];
  socials: RawSocialLink[];
}

export interface ResolvedSocialLink extends RawSocialLink {
  url: string;
}

export interface ResolvedMediaItem extends Omit<RawMediaItem, 'src' | 'poster'> {
  src?: string;
  asset?: ResolvedAsset;
  poster?: string;
  posterAsset?: ResolvedAsset;
}

export interface ResolvedProject extends Omit<RawProject, 'thumbnail' | 'gallery'> {
  thumbnail?: string;
  thumbnailAsset?: ResolvedAsset;
  gallery: ResolvedMediaItem[];
}

export interface ResolvedSiteData extends Omit<RawSiteData, 'headshot' | 'socials'> {
  headshot: string;
  headshotAsset?: ResolvedAsset;
  socials: ResolvedSocialLink[];
}

const assetModules = import.meta.glob('/src/assets/**/*.{avif,gif,jpeg,jpg,mov,mp4,png,webm,webp}', {
  eager: true,
});

function getModuleValue(moduleValue: unknown): ResolvedAsset | undefined {
  if (!moduleValue) return undefined;
  if (typeof moduleValue === 'object' && moduleValue !== null && 'default' in moduleValue) {
    return (moduleValue as { default: ResolvedAsset }).default;
  }

  return moduleValue as ResolvedAsset;
}

function resolveAsset(assetPath?: string): ResolvedAsset | undefined {
  if (!assetPath) return undefined;

  const normalizedPath = assetPath.startsWith('/src/')
    ? assetPath
    : assetPath.startsWith('src/')
      ? `/${assetPath}`
      : `/src/assets/${assetPath.replace(/^\/+/, '')}`;

  const moduleValue = assetModules[normalizedPath];
  return getModuleValue(moduleValue);
}

export function assetUrl(asset?: ResolvedAsset): string {
  if (!asset) return '';
  return typeof asset === 'string' ? asset : asset.src;
}

export function isImageMetadata(asset?: ResolvedAsset): asset is ImageMetadata {
  return Boolean(asset && typeof asset !== 'string' && 'src' in asset && 'width' in asset);
}

function resolveMediaItem(item: RawMediaItem): ResolvedMediaItem {
  const asset = resolveAsset(item.src);
  const posterAsset = resolveAsset(item.poster);

  return {
    ...item,
    src: item.src ? assetUrl(asset) : item.url,
    asset,
    poster: item.poster ? assetUrl(posterAsset) : undefined,
    posterAsset,
  };
}

function resolveProject(project: RawProject): ResolvedProject {
  const thumbnailAsset = resolveAsset(project.thumbnail);

  return {
    ...project,
    thumbnail: project.thumbnail ? assetUrl(thumbnailAsset) : undefined,
    thumbnailAsset,
    gallery: project.gallery.map(resolveMediaItem),
  };
}

export function getProjects(): ResolvedProject[] {
  return (projectsData as RawProjectsFile).items.map(resolveProject);
}

export function getWorkIntro(): string {
  return (projectsData as RawProjectsFile).workIntro ?? '';
}

export function getProjectBySlug(slug: string): ResolvedProject | undefined {
  return getProjects().find((project) => project.slug === slug);
}

export function getSiteData(): ResolvedSiteData {
  const data = siteData as RawSiteData;
  const headshotAsset = resolveAsset(data.headshot);

  return {
    ...data,
    headshot: assetUrl(headshotAsset),
    headshotAsset,
    socials: data.socials.map((social) => ({
      ...social,
      url: social.url ?? '',
    })),
  };
}
