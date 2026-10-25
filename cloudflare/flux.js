// The free drawing model and the prompt it gets. Shared by the Worker (pages drawn for visitors, worker.js) and the
// daily job that draws the printable pages for Pinterest (autopin/tick.js), so both draw with the same words.
export const FLUX_MODEL = '@cf/black-forest-labs/flux-1-schnell';

const FLUX_STYLE = {
  simple: 'Simple shapes with thick bold outlines and very few details, for young children ages 3 to 6',
  medium: 'Medium detail with clear bold outlines, for kids ages 6 to 12',
  detailed: 'Adult coloring page with many elements and repeating patterns, bold clean outlines, no tiny details'
};
export const fluxPrompt = (p, level) => `Black and white coloring book page, line art of ${p}. ${FLUX_STYLE[level]}. Pure white background, black outlines only, uncolored and unshaded, flat white areas ready to color. Clean printable line drawing.`;

// Workers AI refuses a call with error 4006 once the account has used its 10,000 free neurons of the UTC day (the Free
// plan never bills). The allowance is shared by everything in the account, so the message tells nothing about this site's
// own counters. Both the visitors' drawing (worker.js) and the daily job (autopin/tick.js) recognize it here.
const NO_FREE_NEURONS = /4006|daily free allocation|used up/i;
export function noFreeNeurons(e) {
  if (!e) return false;
  if (e.code === 4006 || e.code === '4006') return true;
  return NO_FREE_NEURONS.test(String(e.message || e));
}
// What a visitor is told when it happens (the site is in English only). The allowance comes back at 00:00 UTC.
export const DAILY_POOL_MESSAGE = "Today's free drawings are used up. They reset at midnight UTC (03:00 Turkey time).";
