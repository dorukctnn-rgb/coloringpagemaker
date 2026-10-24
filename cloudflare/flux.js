// The free drawing model and the prompt it gets. Shared by the Worker (pages drawn for visitors, worker.js) and the
// daily job that draws the printable pages for Pinterest (autopin/tick.js), so both draw with the same words.
export const FLUX_MODEL = '@cf/black-forest-labs/flux-1-schnell';

const FLUX_STYLE = {
  simple: 'Simple shapes with thick bold outlines and very few details, for young children ages 3 to 6',
  medium: 'Medium detail with clear bold outlines, for kids ages 6 to 12',
  detailed: 'Adult coloring page with many elements and repeating patterns, bold clean outlines, no tiny details'
};
export const fluxPrompt = (p, level) => `Black and white coloring book page, line art of ${p}. ${FLUX_STYLE[level]}. Pure white background, black outlines only, uncolored and unshaded, flat white areas ready to color. Clean printable line drawing.`;
