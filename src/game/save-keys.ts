export function getSaveKeys(baseUrl: string) {
  const prefix = baseUrl.startsWith('/SimpleRpg/acceptance/') ? 'simple-rpg.acceptance' : 'simple-rpg';
  return { current: `${prefix}.save.v7` };
}
