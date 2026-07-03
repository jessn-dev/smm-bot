import fs from 'fs';

/**
 * Per-item, per-platform publish state persisted to a file.
 *
 * Format: one line per id, "id<TAB>platformA,platformB".
 * A platform listed for an id means that id was successfully published there.
 * Retries only target platforms still missing from the set.
 *
 * Backward compatible: a legacy line with no TAB (bare id) is treated as
 * "fully published to every platform" so old items are never re-posted.
 */

const ALL_PLATFORMS = ['facebook', 'linkedin'];

const readMap = (file: string): Map<string, Set<string>> => {
  const map = new Map<string, Set<string>>();
  if (!fs.existsSync(file)) return map;

  const contents = fs.readFileSync(file, 'utf-8');
  for (const raw of contents.split('\n')) {
    const line = raw.trimEnd();
    if (line.trim().length === 0) continue;

    const tab = line.indexOf('\t');
    if (tab === -1) {
      // Legacy bare id -> assume published everywhere.
      map.set(line.trim(), new Set(ALL_PLATFORMS));
      continue;
    }

    const id = line.slice(0, tab);
    const platforms = line
      .slice(tab + 1)
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);
    map.set(id, new Set(platforms));
  }
  return map;
};

const writeMap = (file: string, map: Map<string, Set<string>>): void => {
  const lines = Array.from(map.entries()).map(
    ([id, platforms]) => `${id}\t${Array.from(platforms).join(',')}`
  );
  fs.writeFileSync(file, lines.join('\n') + '\n', 'utf-8');
};

export const getPublishedPlatforms = (file: string, id: string): Set<string> => {
  return readMap(file).get(id) ?? new Set();
};

export const markPlatformPublished = (file: string, id: string, platform: string): void => {
  const map = readMap(file);
  const platforms = map.get(id) ?? new Set<string>();
  if (platforms.has(platform)) return;
  platforms.add(platform);
  map.set(id, platforms);
  writeMap(file, map);
};
