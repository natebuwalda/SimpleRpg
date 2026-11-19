export function getSaveKeys(baseUrl: string) {
  const prefix = baseUrl.startsWith('/SimpleRpg/acceptance/') ? 'simple-rpg.acceptance' : 'simple-rpg';
  return { current: `${prefix}.save.v5`, v4: `${prefix}.save.v4`, v3: `${prefix}.save.v3`, v2: `${prefix}.save.v2`, v1: `${prefix}.save.v1` };
}
