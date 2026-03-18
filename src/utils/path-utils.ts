// backend/src/utils/path-utils.ts
import { fileURLToPath } from 'url';
import { dirname } from 'path';

export function getDirname(importMetaUrl: string) {
  return dirname(fileURLToPath(importMetaUrl));
}