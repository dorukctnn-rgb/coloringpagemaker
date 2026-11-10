// The written text of the printable pages, read by the landing page (page.js).
//
// A page has a note when somebody wrote one for it (halloween-seeds.js, halloween-auto.js, season.js: the 78 pages that were
// live on 10 November 2026). A page the daily job draws later has no note yet: pageNotes() then builds one from the page's
// own subject (what the picture shows, its level, its season), so no page goes out with only the shared skeleton. To give such
// a page a real note, add an entry to one of the files above; it takes the place of the built text at once.
//
// Fields of a note (the five texts add up to 120 to 200 words):
//   m  one line for the meta description     a  what is in the picture     l  level, age and time
//   p  a printing or paper tip               c  coloring ideas             u  one way to use the finished page
//   r  slugs of three related pages
import { HALLOWEEN_SEEDS } from './halloween-seeds.js';
import { HALLOWEEN_AUTO } from './halloween-auto.js';
import { FALL_AND_WINTER } from './season.js';
import { LEVELS, hash } from '../topics.js';

export const NOTES = { ...HALLOWEEN_SEEDS, ...HALLOWEEN_AUTO, ...FALL_AND_WINTER };
export const NOTE_TEXTS = ['a', 'l', 'p', 'c', 'u'];
export const META_TAIL = ' Free PNG and letter PDF.';
export const wordCount = s => String(s).trim().split(/\s+/).filter(Boolean).length;
export const noteWords = n => NOTE_TEXTS.reduce((t, k) => t + wordCount(n[k] || ''), 0);

// --- text for a page that has no written note: built from its subject ---
const pick = (list, seed) => list[hash(seed) % list.length];
// "a squirrel sitting on a log and holding an acorn, big simple shapes" -> "a squirrel sitting on a log and holding an acorn"
const drawOf = prompt => String(prompt || '').replace(/,? (big simple shapes|clear shapes|many small patterns|no background|white background|friendly and not scary)\b.*$/i, '').replace(/[.\s]+$/, '');

const COMPOSITION = {
  simple: [
    'The outlines are thick, the shapes are large and there is no busy background to fill.',
    'Everything is drawn in big, closed shapes with thick lines, so small hands can stay inside them.',
    'The subject sits on its own with thick outlines and plenty of white space around it.'
  ],
  medium: [
    'The subject is clear and has a simple setting around it, with a few small details for variety.',
    'Clean outlines and a handful of small details give the page enough to do without crowding it.',
    'The main shapes are easy to read, and the setting adds some smaller areas to color.'
  ],
  detailed: [
    'The scene is drawn with fine lines and many small areas, with patterns that repeat across the page.',
    'Fine outlines and small repeating shapes fill the page, so there is something to color in every corner.',
    'Dense detail and repeated patterns make this a page to take slowly, one area at a time.'
  ]
};
const LEVEL_TEXT = {
  simple: [
    'This is an easy page for ages 3 to 6. The areas are big enough for a chunky crayon, and a first page like this is usually done in 10 to 20 minutes.',
    'Made for toddlers and preschoolers, ages 3 to 6. Big shapes mean a child can finish the page alone, in about 15 minutes.',
    'A gentle page for ages 3 to 6. Older children can use it as a quick warm-up, and a grown-up can help with the few small parts.'
  ],
  medium: [
    'This is a medium page for ages 6 to 12. The shapes are clear, and the small details keep a longer session interesting. Plan on 25 to 45 minutes.',
    'Suited to ages 6 to 12 and to adults who want something relaxed. It takes about half an hour with pencil crayons or markers.',
    'A middle-of-the-range page for ages 6 to 12: easy to start, with enough small areas to reward some patience.'
  ],
  detailed: [
    'This is a detailed page for teens and adults. Plan on an hour or more, and work from the largest areas to the smallest.',
    'Made for teens and adults who like a long, quiet session. The small shapes ask for fine pencil crayons or fine-tip pens.',
    'A page for patient colorists, teens and adults. It is best done over an evening, a few areas at a time.'
  ]
};
const PRINT_TEXT = {
  simple: [
    'A thick crayon or a washable marker covers the big shapes fast. Put a spare sheet under the page if you use markers.',
    'Print at 100 percent on plain white paper. Crayons are enough here, and the lines are dark enough to survive a draft setting.',
    'Standard copy paper works well. If the page will be cut out, print it on white cardstock instead.'
  ],
  medium: [
    'Pencil crayons give the cleanest result on the small details, and markers are best kept for the large areas.',
    'Print on regular paper for crayons and pencils, or on heavier paper, around 24 lb or 90 gsm, if you want to use markers.',
    'Print at 100 percent. Fine-tip markers keep the thin lines readable, and a spare sheet underneath protects the table.'
  ],
  detailed: [
    'Print on smooth, heavier paper and use sharpened pencil crayons or a fine liner of 0.3 to 0.5 mm for the small areas.',
    'Smooth paper of 24 lb or 90 gsm or more holds up to layered pencil work. Print a second copy to test your colors first.',
    'Print at 100 percent, never smaller, because the fine lines blur when a detailed page is scaled down.'
  ]
};
const COLOR_TEXT = {
  halloween: [
    'Orange, purple, black and a little green suit a Halloween page. A white gel pen adds moonlight and sparkles on dark colors.',
    'A dark blue or purple night, a pale yellow moon and bright orange for anything that glows keep the mood spooky but friendly.',
    'Try a limited palette of orange, purple and one bright accent, then repeat those colors across the page for a bold, poster-like look.'
  ],
  fall: [
    'Rust red, golden yellow, brown and a little olive green give the page the look of fall leaves.',
    'Blend two or three autumn colors inside one shape, red into orange or yellow into green, the way real leaves change.',
    'Warm browns for the ground, bright reds and golds for the leaves and a pale blue sky keep the page clear and seasonal.'
  ],
  thanksgiving: [
    'Warm browns, deep reds and golden yellows work well for a Thanksgiving page, with a little green for leaves and stems.',
    'Use the colors of the harvest table: pumpkin orange, cranberry red, corn yellow and a rich brown.',
    'Color the large areas in earthy tones first, then add one bright accent color to make the main subject stand out.'
  ],
  christmas: [
    'Red, green and gold are the classic Christmas colors, and glitter or metallic pens look good on ornaments and stars.',
    'A deep green and red base with gold highlights looks festive, and a white crayon on blue paper makes snow.',
    'Try a limited palette of red, green and silver. Leave a few areas white so the page still feels like winter.'
  ],
  hanukkah: [
    'Blue, silver and white suit a Hanukkah page, and yellow or gold makes candle flames glow.',
    'A deep blue night sky with silver stars and warm yellow candlelight gives the page a calm festival look.',
    'Use blue and white for the large areas and keep gold for the flames, the gifts and the small details.'
  ],
  newyear: [
    'Deep blue and purple make a good night sky, and a white gel pen or a gold marker adds the fireworks and stars.',
    'Bright confetti colors on a dark background feel like midnight: pink, gold, teal and silver.',
    'Keep the background dark and the party details bright, so every ribbon and star stands out.'
  ],
  winter: [
    'Cool blues and silvers suit a winter page, and white crayon on blue paper makes snow.',
    'Soft blues, grays and a touch of red for scarves and hats keep a winter page crisp and cheerful.',
    'Shade the shadows in pale blue or lilac, and keep the snow white for the strongest contrast.'
  ],
  evergreen: [
    'Any colors work. Start with the biggest shapes and keep the small details for last.',
    'Pick three colors you like and repeat them across the page, then add one surprising color for fun.',
    'Natural colors make a calm page, while bright, unexpected ones turn it into a playful picture. Both are fine.'
  ]
};
const USE_TEXT = {
  halloween: [
    'Hang the finished page in a window or on a door for Halloween week, or use it as a party table activity.',
    'Use it as an activity for a Halloween party or a rainy October afternoon, then display the finished pages on a wall.',
    'A good page for a classroom Halloween day. Let each child color one copy and make a gallery of the results.'
  ],
  fall: [
    'Use it for a fall classroom activity, a nature walk follow-up or a quiet afternoon indoors.',
    'Color it after a walk in the leaves and display it with real leaves you collected.',
    'A good page for a rainy fall weekend, and a calm activity while the family cooks or bakes.'
  ],
  thanksgiving: [
    'Put it at a child place setting for Thanksgiving, so the youngest guests have something to do while the meal is prepared.',
    'Use it as a table activity or a place card, or send it home with children from a class Thanksgiving party.',
    'Color it in the week before Thanksgiving and talk with children about what they are thankful for.'
  ],
  christmas: [
    'Use it for a holiday card, a gift tag or a countdown activity in December.',
    'A good page for a December afternoon, and the finished picture can be glued onto folded card paper as a handmade card.',
    'Color it while you wrap gifts or decorate the tree, and keep the finished page with the holiday decorations.'
  ],
  hanukkah: [
    'Use it during the eight nights of Hanukkah as a calm activity for the family table.',
    'Color it before lighting the candles, or give it to children as a quiet activity while the family gathers.',
    'A good page for a classroom Hanukkah lesson, followed by a short talk about the story and the traditions.'
  ],
  newyear: [
    'Use it as a New Year party activity, or color it while you wait for midnight.',
    'A good page for a quiet family evening on the last night of the year.',
    'Print it for a New Year class party and let each child color a page to take home.'
  ],
  winter: [
    'A calm activity for a snowy day, a winter break or a classroom after recess.',
    'Color it on a cold afternoon, then hang it in a window as a winter decoration.',
    'Use it for a winter unit in class, followed by a short talk about how animals and people stay warm.'
  ],
  evergreen: [
    'A good activity for a rainy afternoon, a quiet corner of the classroom or a long car ride.',
    'Use it as a calm break between lessons, or as a relaxing evening activity for adults.',
    'Print a few copies so friends or siblings can color the same page and compare the results.'
  ]
};
// A small table of extra coloring hints for kinds of pictures, matched on the words of the subject.
const KIND_HINTS = [
  [/mandala|zentangle|pattern/, 'Color a pattern ring by ring and repeat the same colors all the way around, so the symmetry shows.'],
  [/owl|bird|cardinal|hummingbird|peacock|parrot|toucan|chickadee/, 'Feathers look best with short strokes that follow the direction of the feather.'],
  [/cat|kitten|puppy|dog|fox|bear|wolf|rabbit|bunny|squirrel|hedgehog|deer|moose|sloth|lion|monkey/, 'For the fur, use short strokes in the direction the hair grows, and keep the nose and eyes for the end.'],
  [/castle|cottage|cabin|house|village|barn|farm|lighthouse|treehouse|market/, 'Work from the sky down to the ground, and color the roofs and walls before the small windows and doors.'],
  [/cake|pie|cookie|cupcake|candy|doughnut|latke|cocoa|cider|bread|apple|cranberr|corn/, 'Food looks best in warm, true-to-life colors, with a darker shade where one piece sits behind another.'],
  [/tree|forest|leaf|leaves|wreath|holly|flower|tulip|daisy|sunflower|garden|poinsettia/, 'Use two greens, one light and one dark, and blend the colors where leaves overlap.']
];

const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
const clip = (s, n) => (s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, ''));
const sentence = s => { const t = String(s).replace(/\s+/g, ' ').trim().replace(/[.,;:\s]+$/, ''); return t ? t[0].toUpperCase() + t.slice(1) + '.' : ''; };

// The text of a page without a written note. v: a view (feed.js).
export function builtNotes(v) {
  const level = LEVELS[v.level] ? v.level : 'medium';
  const draw = drawOf(v.prompt);
  const seed = v.slug;
  const theme = COLOR_TEXT[v.theme] ? v.theme : 'evergreen';
  const kind = KIND_HINTS.find(([re]) => re.test(String(draw).toLowerCase()));
  const a = `${sentence('The page shows ' + draw)} ${pick(COMPOSITION[level], seed + '|a')}`;
  const c = `${pick(COLOR_TEXT[theme], seed + '|c')}${kind ? ' ' + kind[1] : ''}`;
  const word = { simple: 'An easy', medium: 'A medium', detailed: 'A detailed' }[level];
  return {
    built: true,
    m: `${clip(cap(draw), 80)}. ${word} page for ${LEVELS[level].audience}.`,
    a,
    l: pick(LEVEL_TEXT[level], seed + '|l'),
    p: pick(PRINT_TEXT[level], seed + '|p'),
    c,
    u: pick(USE_TEXT[theme], seed + '|u'),
    r: []
  };
}

// The note of a view: the written one when there is one, otherwise the built one.
export function pageNotes(v) {
  const n = NOTES[v.slug];
  return n ? { built: false, ...n } : builtNotes(v);
}

// Three related pages for a view, from the released views (feed.js). The written note names them; a page without a note, or a
// named page that is not released (hidden or unknown), is filled up by closeness: the same landing page of the site first, then
// the same theme, the same group and the same level, and a stable pseudo-random order among equals.
export function relatedViews(v, views, n = 3) {
  const bySlug = new Map(views.map(x => [x.slug, x]));
  const out = [];
  const note = NOTES[v.slug];
  for (const s of (note && note.r) || []) { const x = bySlug.get(s); if (x && x.slug !== v.slug && !out.includes(x)) out.push(x); }
  if (out.length < n) {
    const score = x => (x.site && x.site === v.site ? 8 : 0) + (x.theme === v.theme ? 4 : 0) + (x.group === v.group ? 2 : 0) + (x.level === v.level ? 1 : 0);
    const rest = views.filter(x => x.slug !== v.slug && !out.includes(x))
      .sort((a, b) => score(b) - score(a) || hash(v.slug + '|' + a.slug) - hash(v.slug + '|' + b.slug));
    for (const x of rest) { if (out.length >= n) break; out.push(x); }
  }
  return out.slice(0, n);
}
