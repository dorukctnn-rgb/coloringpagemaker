// What the daily job draws, and every word of text that goes with a page.
//
// The calendar picks a theme for the day (Halloween until 31 October, then Thanksgiving and fall with the first Christmas
// pins, Christmas with Hanukkah and winter, New Year, and evergreen subjects whenever no season is on). Each theme has a bank of subjects: a short name, the phrase
// the image model draws and the detail level. Titles, descriptions, alt text and the on-pin lines are built from those
// three, so a new subject is one line. Nothing here needs a network, a clock or a database.

export const SITE = 'https://www.coloringpagemaker.app';

export const LEVELS = {
  simple: {
    word: 'easy', audience: 'toddlers and preschoolers', ages: 'ages 3 to 6',
    hint: 'big simple shapes, no background',
    sub: 'Big, easy shapes for little hands',
    line: 'Thick outlines and big shapes, made for small hands and young colorists'
  },
  medium: {
    word: '', audience: 'kids', ages: 'ages 6 to 12',
    hint: 'clear shapes and a simple background',
    sub: 'Clear lines and room to color, ages 6 to 12',
    line: 'Clear outlines with some detail, a good fit for kids ages 6 to 12'
  },
  detailed: {
    word: 'detailed', audience: 'adults and teens', ages: 'teens and adults',
    hint: 'many small patterns, a detailed scene',
    sub: 'Fine detail for teens and adults',
    line: 'Fine detail and repeating patterns for teens and adults who like a longer coloring session'
  }
};
const LEVEL_OF = { s: 'simple', m: 'medium', d: 'detailed' };

// Where a page goes on the hub and which Pinterest board group it belongs to.
export const GROUPS = {
  halloween: { label: 'Halloween coloring pages', short: 'Halloween' },
  autumn: { label: 'Fall and Thanksgiving coloring pages', short: 'Fall and Thanksgiving' },
  winter: { label: 'Winter and Christmas coloring pages', short: 'Winter and Christmas' },
  evergreen: { label: 'Animals, fantasy and everyday coloring pages', short: 'Animals and more' }
};

// theme -> group, site theme page ("make your own" link) and the pin colors it can use (see pin.js SKINS).
// holiday: the pins of this theme carry the holiday2026 campaign link (feed.js). adultsSite: the page a detailed drawing of
// the theme links to instead of `site`. Hanukkah and New Year pins go to the winter group, so they reach the board that
// is already connected to that feed.
export const THEMES = {
  halloween: { group: 'halloween', label: 'Halloween', site: 'halloween-coloring-pages', skins: ['orange', 'plum', 'mist'] },
  fall: { group: 'autumn', label: 'fall', site: 'fall-coloring-pages', skins: ['rust', 'wheat', 'forest'], holiday: true },
  thanksgiving: { group: 'autumn', label: 'Thanksgiving', site: 'thanksgiving-coloring-pages', skins: ['harvest', 'cranberry', 'cream'], holiday: true },
  christmas: { group: 'winter', label: 'Christmas', site: 'christmas-coloring-pages', adultsSite: 'christmas-coloring-pages-for-adults', skins: ['pine', 'berry', 'snow'], holiday: true },
  hanukkah: { group: 'winter', label: 'Hanukkah', site: 'hanukkah-coloring-pages', skins: ['night', 'ice', 'frost'], holiday: true },
  newyear: { group: 'winter', label: 'New Year', site: 'new-year-coloring-pages', skins: ['plum', 'night', 'sun', 'lilac'], holiday: true },
  winter: { group: 'winter', label: 'winter', site: 'winter-coloring-pages', skins: ['ice', 'night', 'frost'], holiday: true },
  evergreen: { group: 'evergreen', label: '', site: null, skins: ['sky', 'meadow', 'sun', 'lilac', 'coral'] }
};

// --- calendar ---
const DAY_MS = 86400000;
const ymd = (y, m, d) => Date.UTC(y, m - 1, d);
// US Thanksgiving: the fourth Thursday of November.
export function thanksgiving(year) {
  const first = new Date(Date.UTC(year, 10, 1)).getUTCDay();
  return new Date(Date.UTC(year, 10, 1 + ((4 - first + 7) % 7) + 21));
}
// The first evening of Hanukkah (25 Kislev starts at sundown the day before), as UTC midnight of that date. The table is
// checked against the Hebrew calendar of the runtime in the tests; a later year is worked out from it.
const HANUKKAH_START = { 2026: '12-04', 2027: '12-24', 2028: '12-12', 2029: '12-01', 2030: '12-20', 2031: '12-09', 2032: '11-27', 2033: '12-16', 2034: '12-06', 2035: '12-25', 2036: '12-13' };
export function hanukkahStart(year) {
  if (HANUKKAH_START[year]) { const [m, d] = HANUKKAH_START[year].split('-').map(Number); return ymd(year, m, d); }
  try {
    const f = new Intl.DateTimeFormat('en-u-ca-hebrew-nu-latn', { day: 'numeric', month: 'long', timeZone: 'UTC' });
    for (let t = ymd(year, 11, 15); t < ymd(year, 12, 31); t += DAY_MS) {
      const p = Object.fromEntries(f.formatToParts(new Date(t)).map(x => [x.type, x.value]));
      if (/Kislev/i.test(p.month) && p.day === '25') return t - DAY_MS;
    }
  } catch (e) { /* no Hebrew calendar in this runtime */ }
  return null;
}

// The season windows of a year, in order: [id, from (UTC ms), to (UTC ms, exclusive), mix]. A mix is { theme: weight }; the
// weights are shares of the day's pages (4 a day), so a weight of 3 next to a 1 is three pages in four. A key can also be
// "theme>kids" or "theme>adults" for the easy and medium drawings or the detailed ones of a theme.
//   1 to 14 Nov    Thanksgiving 2, fall 1, Christmas 1 (the first Christmas pins go out early: Christmas searches start in early November)
//   15 Nov to Thanksgiving   Thanksgiving 1, Christmas 3
//   after Thanksgiving to 25 Dec   Christmas 3 and Hanukkah 1 from 7 days before the first evening to its last day
//                         (27 Nov to 12 Dec in 2026), otherwise Christmas 3 and winter 1; from 13 Dec a third of the Christmas pins are detailed (adults)
//   26 Dec to 5 Jan   New Year 2, winter 2
//   6 Jan to 31 Jan  winter 2, evergreen 1 (the rest of the year is evergreen)
function windows(y) {
  const tg = thanksgiving(y).getTime();
  const out = [
    ['halloween', ymd(y, 9, 15), ymd(y, 11, 1), { halloween: 1 }],
    ['fall-thanksgiving', ymd(y, 11, 1), ymd(y, 11, 15), { thanksgiving: 2, fall: 1, christmas: 1 }],
    ['thanksgiving-christmas', ymd(y, 11, 15), tg + DAY_MS, { thanksgiving: 1, christmas: 3 }]
  ];
  // After Thanksgiving: cut the stretch at the edges of the Hanukkah window and at 13 December, then join equal neighbors.
  const from = tg + DAY_MS, end = ymd(y, 12, 26), late = ymd(y, 12, 13);
  const hk = hanukkahStart(y);
  const hkFrom = hk === null ? null : hk - 7 * DAY_MS, hkTo = hk === null ? null : hk + 9 * DAY_MS;
  const cuts = [from, end, late, hkFrom, hkTo].filter(t => t !== null && t >= from && t <= end);
  const pts = [...new Set(cuts)].sort((a, b) => a - b);
  const parts = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i];
    const inHk = hk !== null && a >= hkFrom && a < hkTo;
    const id = inHk ? 'christmas-hanukkah' : a >= late ? 'christmas-late' : 'christmas';
    const mix = inHk ? { christmas: 3, hanukkah: 1 } : a >= late ? { 'christmas>kids': 2, 'christmas>adults': 1, winter: 1 } : { christmas: 3, winter: 1 };
    if (parts.length && parts[parts.length - 1][0] === id) parts[parts.length - 1][2] = pts[i + 1];
    else parts.push([id, a, pts[i + 1], mix]);
  }
  out.push(...parts);
  out.push(['newyear', end, ymd(y + 1, 1, 6), { newyear: 2, winter: 2 }]);
  out.push(['winter', ymd(y + 1, 1, 6), ymd(y + 1, 2, 1), { winter: 2, evergreen: 1 }]);
  return out;
}

// The season of a day: { id, mix, since }. since is when the window started (UTC ms): the job counts the pages it made since
// then to keep the mix, so a theme that was drawn more in an earlier window does not hold back its share in this one.
export function phaseFor(date) {
  const t = (date instanceof Date ? date : new Date(date)).getTime();
  const y = new Date(t).getUTCFullYear();
  for (const yy of [y, y - 1]) {
    for (const [id, from, to, mix] of windows(yy)) if (t >= from && t < to) return { id, mix, since: from };
  }
  return { id: 'evergreen', mix: { evergreen: 1 }, since: 0 };
}

// --- the banks: [name, what to draw, levels (s, m, d), site theme page for evergreen subjects] ---
// A name carries its theme word (Halloween, Thanksgiving, Christmas, fall, winter) so the pin title and the page URL
// hold the words people search for. No trademarked character names (the site tests list them).
const HALLOWEEN = [
  ['Halloween skeleton', 'a friendly cartoon skeleton waving hello, with a round skull and simple bones', 's'],
  ['Halloween vampire', 'a cute little vampire with a cape, tiny fangs and a big smile', 's'],
  ['Halloween bat tree', 'a bare twisted tree with bats flying around a big full moon', 'm'],
  ['Halloween candy bowl', 'a big bowl heaped with wrapped candies, lollipops and a pumpkin pail beside it', 's'],
  ['Halloween ghost balloons', 'a smiling ghost holding three balloons on strings', 's'],
  ['Halloween pumpkin witch', 'a round pumpkin wearing a pointed witch hat with a buckle', 's'],
  ['Halloween witch owl', 'an owl in a witch hat sitting on a branch with leaves and stars', 'm'],
  ['Halloween frog', 'a happy frog in a witch hat sitting on a toadstool with small mushrooms', 'm'],
  ['Halloween spider', 'a cute smiling spider hanging from a thread, with a small pumpkin below', 's'],
  ['Halloween hilltop pumpkin', 'a carved jack-o\'-lantern on a grassy hill under a crescent moon with bats', 'm'],
  ['Halloween broomstick and cat', 'a witch broomstick with a black cat riding on it, stars behind', 'm'],
  ['Halloween potion shelf', 'a shelf of potion bottles with bubbles, a small skull and a bubbling cauldron', 'm'],
  ['Halloween costume parade', 'three children in Halloween costumes walking down a street with pumpkin buckets', 'm'],
  ['Halloween barn owl', 'an owl on a branch in front of a full moon with leaves and tiny bats, intricate feather patterns', 'd'],
  ['Halloween zentangle bat', 'a bat with wide open wings, the wings filled with zentangle patterns', 'd'],
  ['Halloween cat mandala', 'a round mandala made of black cats, crescent moons and stars', 'd'],
  ['Halloween sugar skull', 'a decorative sugar skull with flowers, swirls and tiny hearts', 'd'],
  ['Halloween haunted forest', 'a haunted forest with twisted trees, a winding path and hidden bats', 'd'],
  ['Halloween castle', 'a tall castle on a cliff with bats and a big full moon behind', 'md'],
  ['Halloween spider web mandala', 'a round spider web mandala with small spiders and tiny pumpkins', 'd'],
  ['Halloween pumpkin wreath', 'a wreath made of small pumpkins, leaves and bats', 'm'],
  ['Halloween ghost patch', 'a smiling ghost floating over a pumpkin patch at night', 'm'],
  ['Halloween witch cottage', 'a crooked witch cottage with a smoking chimney and a pumpkin by the door', 'm'],
  ['Halloween baby dragon', 'a baby dragon wearing a pumpkin costume', 's'],
  ['Halloween dinosaur ghost', 'a little dinosaur wearing a ghost sheet costume with two eye holes', 's'],
  ['Halloween bunny witch', 'a sweet bunny wearing a witch hat and holding a tiny broom', 's'],
  ['Halloween puppy pumpkin', 'a puppy dressed in a pumpkin costume', 's'],
  ['Halloween teddy bear', 'a teddy bear holding a candy bucket and wearing a bat costume', 's'],
  ['Halloween cauldron bats', 'a big bubbling cauldron with bats flying out and a long spoon', 'm'],
  ['Halloween moon cat', 'a black cat sitting under a crescent moon with stars', 's'],
  ['Halloween cat face', 'a big black cat face with large round eyes and whiskers', 's'],
  ['Halloween dancing skeleton', 'a cartoon skeleton dancing and wearing a top hat', 'm'],
  ['Halloween spooky tree house', 'a tree house in a big old tree with lanterns and bats around it', 'm'],
  ['Halloween pumpkin cat', 'a kitten curled up inside a hollowed pumpkin', 's'],
  ['Halloween owl and pumpkins', 'an owl perched between three pumpkins of different sizes', 'sd']
];

const FALL = [
  ['fall maple leaf', 'one large maple leaf with clear veins', 's'],
  ['fall acorns', 'three acorns with caps and two oak leaves', 's'],
  ['fall hedgehog', 'a cute hedgehog walking through fallen leaves', 's'],
  ['fall squirrel', 'a squirrel sitting on a log and holding an acorn', 's'],
  ['fall fox', 'a fox walking through an autumn forest with falling leaves', 'm'],
  ['fall owl', 'an owl on a branch with autumn leaves around it', 'm'],
  ['fall scarecrow garden', 'a friendly scarecrow with a patched hat standing in a field of sunflowers', 'm'],
  ['fall harvest basket', 'a harvest basket full of apples, small pumpkins and ears of corn', 'm'],
  ['fall apple picking', 'a child picking apples from a tree and holding a basket', 'm'],
  ['fall bear', 'a bear walking through an autumn forest with leaves falling', 'm'],
  ['fall tree', 'a big tree with round leaves falling to the ground', 's'],
  ['fall rain boots', 'a pair of rain boots next to an umbrella and a puddle with floating leaves', 's'],
  ['fall mushrooms', 'a cluster of forest mushrooms with fallen leaves around them', 's'],
  ['fall reading nook', 'a cozy armchair with a blanket, a mug and a pile of books by a window', 'm'],
  ['fall scarf and mug', 'a warm scarf, mittens and a steaming mug of cocoa', 's'],
  ['fall leaf mandala', 'a round mandala made of maple, oak and birch leaves', 'd'],
  ['fall owl zentangle', 'an owl made of zentangle patterns sitting on a branch with leaves', 'd'],
  ['fall sunflower', 'a big sunflower with a round center and large petals', 's'],
  ['fall harvest moon', 'a big harvest moon over a red barn and a field of pumpkins', 'm'],
  ['fall deer', 'a deer standing in an autumn forest with falling leaves', 'm'],
  ['fall hay ride', 'a hay bale with pumpkins and a small wooden wagon', 's'],
  ['fall campfire', 'a campfire with marshmallows on sticks and two logs', 'm'],
  ['fall cottage', 'a cozy cottage in the woods surrounded by autumn trees', 'd'],
  ['fall pumpkin and leaves', 'a pumpkin with a curly vine sitting among fallen leaves', 's'],
  ['fall wreath', 'a round wreath of autumn leaves, acorns and small pumpkins', 'm']
];

// Rows can name a site page as a fourth value: the page the pin links to when it is not the theme's own page.
const THANKSGIVING = [
  ['Thanksgiving turkey', 'a cartoon turkey with big fanned tail feathers and a friendly face', 's', 'turkey-coloring-pages'],
  ['Thanksgiving turkey feathers', 'a turkey with large tail feathers made of different leaf and feather shapes', 'm', 'turkey-coloring-pages'],
  ['Thanksgiving pilgrim hat', 'a wide-brimmed felt hat with a plain band', 's'],
  ['Thanksgiving cornucopia', 'a cornucopia overflowing with pumpkins, apples, grapes and corn', 'm'],
  ['Thanksgiving pumpkin pie', 'a slice of pumpkin pie with a dollop of whipped cream', 's'],
  ['Thanksgiving thankful tree', 'a tree with many round leaves and a few acorns at its roots', 's'],
  ['Thanksgiving dinner table', 'a long table set with a roast turkey, pies, corn and candles', 'm'],
  ['Thanksgiving chef turkey', 'a turkey wearing a tall chef hat and holding a wooden spoon', 's', 'turkey-coloring-pages'],
  ['Thanksgiving dinner plate', 'a plate with turkey, corn, potatoes and a roll', 's'],
  ['Thanksgiving corn', 'two ears of corn with husks and a few kernels', 's'],
  ['Thanksgiving handprint turkey', 'a turkey made from a hand outline with five feathers and a small face', 's', 'turkey-coloring-pages'],
  ['Thanksgiving heart', 'a big heart made of autumn leaves with a small acorn', 's'],
  ['Thanksgiving turkey mandala', 'a round mandala shaped like a turkey with patterned feathers', 'd', 'turkey-coloring-pages'],
  ['Thanksgiving cornucopia pattern', 'a cornucopia with detailed fruit, leaves and vines, intricate patterns', 'd'],
  ['Thanksgiving apple pie', 'a whole apple pie with a lattice crust and two apples beside it', 's'],
  ['Thanksgiving squirrel pie', 'a squirrel hugging a pumpkin pie', 's'],
  ['Thanksgiving farm', 'a small farm with a barn, a scarecrow and a field of pumpkins', 'm'],
  ['Thanksgiving baby turkey', 'a fluffy baby turkey with a small wattle standing in a pile of leaves', 's', 'turkey-coloring-pages'],
  ['Thanksgiving turkey and pumpkin', 'a turkey sitting next to a big pumpkin with a leafy vine', 's', 'turkey-coloring-pages'],
  ['Thanksgiving harvest wagon', 'a wooden wagon full of pumpkins, squash and corn', 'm'],
  ['Thanksgiving friends', 'a turkey, a squirrel and a deer sharing a picnic blanket with pie', 'm'],
  ['Thanksgiving pumpkin', 'a big round pumpkin with a leafy vine', 's'],
  ['Thanksgiving leaves border', 'a page full of overlapping autumn leaves in many shapes', 'd'],
  ['Thanksgiving bread basket', 'a basket of rolls and corn bread with a napkin', 's'],
  // Added for the 2026 season
  ['Thanksgiving turkey face', 'a big turkey face with a beak, a red wattle and a ring of feathers behind it', 's', 'turkey-coloring-pages'],
  ['Thanksgiving reading turkey', 'a turkey in round glasses and a bow tie reading a big book', 's', 'turkey-coloring-pages'],
  ['Thanksgiving roast platter', 'a roast turkey on a platter with a bowl of cranberries and a basket of rolls', 'm'],
  ['Thanksgiving gratitude jar', 'a glass jar full of paper leaves with a ribbon and a few leaves beside it', 's'],
  ['Thanksgiving cranberries', 'a bowl of cranberries with a spoon and a few leaves', 's'],
  ['Thanksgiving Mayflower ship', 'a wooden sailing ship with three masts on the waves, with seagulls overhead', 'm'],
  ['Thanksgiving pilgrim children', 'a pilgrim boy in a wide-brimmed felt hat and a girl in a linen cap and apron sharing a basket of corn', 'm'],
  ['Thanksgiving pumpkin patch', 'a pumpkin patch with a scarecrow, a wagon and rows of pumpkins', 'm'],
  ['Thanksgiving apple cider', 'a jug of apple cider next to two mugs and a few apples', 's'],
  ['Thanksgiving acorns', 'a big acorn with a patterned cap next to a small oak leaf', 's'],
  ['Thanksgiving feast mandala', 'a round mandala made of pumpkins, corn, leaves and turkey feathers', 'd'],
  ['Thanksgiving village', 'a quiet farm village in autumn with a steeple, a barn, pumpkins and falling leaves', 'd'],
  // The 40 pages of the Thanksgiving run (2 a day until 14 November, 1 a day to Thanksgiving Day) need 40 first-pass drawings
  ['Thanksgiving turkey parade', 'three turkeys walking in a row with fanned tails and falling leaves', 's', 'turkey-coloring-pages'],
  ['Thanksgiving turkey scarf', 'a turkey wearing a knitted scarf and mittens walking through fallen leaves', 's', 'turkey-coloring-pages'],
  ['Thanksgiving turkey zentangle', 'a turkey with tail feathers filled with zentangle patterns and small leaves', 'd', 'turkey-coloring-pages'],
  ['Thanksgiving place card', 'a folded place card with a small turkey, a border of leaves and an empty space for a name', 's'],
  ['Thanksgiving door wreath', 'a front door with a wreath of autumn leaves and small pumpkins and a welcome mat', 'm'],
  ['Thanksgiving family walk', 'a family walking through a park of autumn trees with a dog and a basket of leaves', 'm']
];

const CHRISTMAS = [
  ['Christmas tree and presents', 'a decorated Christmas tree with a star on top and presents underneath', 's', 'christmas-tree-coloring-pages'],
  ['Santa Claus face', 'a smiling Santa Claus face with a big beard and a fluffy hat', 's', 'santa-coloring-pages'],
  ['Santa and sleigh', 'Santa Claus in a sleigh full of presents pulled by two reindeer over rooftops', 'm', 'santa-coloring-pages'],
  ['Christmas reindeer', 'a cute reindeer with big antlers and a round nose wearing a scarf', 's', 'reindeer-coloring-pages'],
  ['Christmas gingerbread man', 'a gingerbread man with a big smile, icing buttons and a bow tie', 's', 'gingerbread-coloring-pages'],
  ['Christmas gingerbread house', 'a gingerbread house with candy canes, gumdrops and a frosted roof', 'm', 'gingerbread-coloring-pages'],
  ['Christmas stocking', 'a big Christmas stocking with a candy cane and small toys peeking out', 's'],
  ['Christmas snow globe', 'a snow globe with a little house, a tree and falling snow', 'm'],
  ['Christmas wreath', 'a Christmas wreath with a big bow, holly leaves and berries', 's'],
  ['Christmas ornaments', 'five round Christmas ornaments with stripes, stars and swirls hanging from a branch', 's', 'christmas-ornament-coloring-pages'],
  ['Christmas elf', 'a cheerful Christmas elf with pointed ears and a striped hat holding a present', 's'],
  ['Christmas cat tree', 'a cat sitting under a Christmas tree and batting at an ornament', 'm', 'christmas-tree-coloring-pages'],
  ['Christmas puppy', 'a puppy wearing a Santa hat and sitting next to a present', 's'],
  ['Christmas polar bear', 'a polar bear in a scarf and a Santa hat holding a candy cane', 's'],
  ['Christmas village', 'a snowy Christmas village with small houses, a church, lamp posts and a tree', 'd'],
  ['Christmas ornament mandala', 'a round mandala made of ornaments, stars, holly and candy canes', 'd', 'christmas-ornament-coloring-pages'],
  ['Christmas bells and holly', 'two big bells tied with a bow and holly leaves with berries', 's'],
  ['Christmas star', 'a big star with a swirling tail and small stars around it', 's'],
  ['Christmas fireplace', 'a fireplace with a burning log, hanging stockings and a garland on the mantel', 'm'],
  ['Christmas presents', 'a pile of wrapped presents with ribbons, bows and tags', 's'],
  ['Christmas penguin', 'a penguin in a Santa hat holding a small present', 's'],
  ['Christmas cookies and milk', 'a plate of Christmas cookies next to a glass of milk', 'm', 'santa-coloring-pages'],
  ['Christmas workshop', 'a busy toy workshop with elves, toy trains, a rocking horse and a shelf of dolls', 'md'],
  ['Christmas lights house', 'a house covered with string lights, a wreath on the door and a snowman out front', 'm'],
  ['Christmas poinsettia', 'a poinsettia flower with large pointed leaves in a pot with a bow', 'm'],
  ['Christmas nutcracker', 'a toy nutcracker soldier with a tall hat and a sword', 'm'],
  ['Christmas snowflake ornaments', 'four ornaments each with a different snowflake pattern', 's', 'christmas-ornament-coloring-pages'],
  ['Christmas candy cane lane', 'a candy cane village with gumdrop trees and a lollipop fence', 'm'],
  ['Christmas tree zentangle', 'a tall Christmas tree filled with zentangle patterns and ornaments', 'd', 'christmas-tree-coloring-pages'],
  ['Christmas wreath pattern', 'a round wreath filled with fine holly, pinecone and berry patterns', 'd'],
  ['Christmas snowman gifts', 'a snowman holding a present with a scarf and a top hat', 's', 'snowman-coloring-pages'],
  ['Christmas sleigh ride', 'a horse pulling a sleigh through snowy hills with children on board', 'm'],
  ['Christmas angel', 'a smiling angel with wings and a star in the sky', 's'],
  ['Christmas cabin', 'a log cabin with a snowy roof, smoke from the chimney and a lit tree outside', 'd'],
  ['Christmas teddy bear', 'a teddy bear in a Christmas sweater hugging a present', 's'],
  ['Christmas bird', 'a cardinal bird on a branch of holly with berries and snow', 'm'],
  // Added for the 2026 season: more drawings for the new pages (Santa, reindeer, tree, ornament, snowflake, adults) and the
  // subjects of the keyword scan (candy cane, elf, card, carolers)
  ['Santa hat', 'a red Santa hat with a fluffy white trim and a pom-pom', 's', 'santa-coloring-pages'],
  ['Santa in the chimney', 'Santa Claus climbing down a brick chimney with a sack of presents and snow on the roof', 'm', 'santa-coloring-pages'],
  ['Santa reading his list', 'Santa Claus in an armchair holding a long scroll and a feather pen, a cat asleep at his feet', 'm', 'santa-coloring-pages'],
  ['Santa and a puppy', 'Santa Claus sitting on a log with a happy puppy holding a small present', 's', 'santa-coloring-pages'],
  ['Mrs. Claus baking', 'Mrs. Claus in an apron and round glasses baking cookies in a cozy kitchen', 'm', 'santa-coloring-pages'],
  ['Santa on the rooftop', 'Santa Claus waving from a snowy rooftop beside a chimney with a reindeer behind him', 'm', 'santa-coloring-pages'],
  ['Santa mandala', 'a round mandala with a Santa face in the center and holly, stars and snowflakes around it', 'd', 'santa-coloring-pages'],
  ['Christmas tree star', 'a tall Christmas tree with a big star on top and round ornaments', 's', 'christmas-tree-coloring-pages'],
  ['Christmas tree lights', 'a Christmas tree wrapped in string lights with a few ornaments and a bow', 'm', 'christmas-tree-coloring-pages'],
  ['Christmas tree window', 'a decorated Christmas tree seen through a window with frost patterns on the glass and snow outside', 'm', 'christmas-tree-coloring-pages'],
  ['Christmas tree farm', 'rows of small Christmas trees on a snowy farm with a red truck', 'm', 'christmas-tree-coloring-pages'],
  ['Christmas tree decorating', 'a child hanging an ornament on a Christmas tree while a parent holds up a star', 'm', 'christmas-tree-coloring-pages'],
  ['Christmas mini trees', 'three small Christmas trees of different sizes with simple ornaments', 's', 'christmas-tree-coloring-pages'],
  ['Christmas ornament ball', 'one big round Christmas ornament with a ribbon on the cap and a swirl pattern', 's', 'christmas-ornament-coloring-pages'],
  ['Christmas ornament star', 'a star shaped ornament hanging from a ribbon with dots and stripes', 's', 'christmas-ornament-coloring-pages'],
  ['Christmas ornament box', 'an open box of Christmas ornaments nested in tissue paper', 'm', 'christmas-ornament-coloring-pages'],
  ['Christmas ornament branch', 'a pine branch with hanging ornaments of different shapes: a ball, a star, a heart and a bell', 'm', 'christmas-ornament-coloring-pages'],
  ['Christmas ornament patterns', 'a set of six large ornaments each filled with a different zentangle pattern', 'd', 'christmas-ornament-coloring-pages'],
  ['Christmas snowflake', 'one big six pointed snowflake with simple branches and a small star in the center', 's', 'snowflake-coloring-pages'],
  ['Christmas snowflake window', 'a window with frost patterns on the glass, big snowflakes and a candle on the sill', 'm', 'snowflake-coloring-pages'],
  ['Christmas reindeer team', 'two reindeer with harnesses and bells pulling a small sleigh through the snow', 'm', 'reindeer-coloring-pages'],
  ['Christmas baby reindeer', 'a baby reindeer with tiny antlers wearing a red scarf in the snow', 's', 'reindeer-coloring-pages'],
  ['Christmas reindeer head', 'a reindeer head with big antlers hung with small ornaments and a bow', 'm', 'reindeer-coloring-pages'],
  ['Christmas reindeer family', 'a mother reindeer and her calf walking through a snowy forest under the stars', 'm', 'reindeer-coloring-pages'],
  ['Christmas reindeer mandala', 'a round mandala of reindeer heads, antlers, snowflakes and stars', 'd', 'reindeer-coloring-pages'],
  ['Christmas gingerbread cookies', 'a tray of gingerbread cookies shaped like a man, a star, a heart and a tree with icing', 's', 'gingerbread-coloring-pages'],
  ['Christmas gingerbread village', 'a village of gingerbread houses with candy fences, icing roofs and gumdrop trees', 'd', 'gingerbread-coloring-pages'],
  ['Christmas candy canes', 'two big candy canes crossed together with a bow', 's'],
  ['Christmas elf child', 'a child in an elf costume with a pointed hat and striped tights holding a present', 's'],
  ['Christmas card frame', 'a Christmas card frame with a border of holly, bells and a bow and an empty middle', 'm'],
  ['Christmas hot cocoa', 'a mug of hot cocoa with marshmallows and a candy cane stirrer', 's'],
  ['Christmas carolers', 'four children in scarves and hats singing carols under a lamp post in the snow', 'm'],
  ['Christmas sweater', 'a cozy Christmas sweater with a reindeer and snowflake pattern', 's'],
  ['Christmas toy train', 'a toy train carrying presents around a small Christmas tree', 'm'],
  ['Christmas holly', 'a sprig of holly leaves and berries tied with a bow', 's'],
  ['Christmas front door', 'a front door with a wreath, string lights and a doormat with snow on the steps', 'm'],
  ['Christmas mouse', 'a tiny mouse in a Santa hat holding a candy cane', 's'],
  ['Christmas mandala', 'a large round mandala made of holly leaves, snowflakes, stars and bells', 'd'],
  ['Christmas stained glass', 'a stained glass style window with a star, a tree and an angel in separate sections', 'd'],
  // More detailed drawings for the adult page: from 13 December a third of the Christmas pins are for adults
  ['Christmas winter forest', 'a snowy pine forest with a fox, an owl and a deer and ornaments on the branches, intricate patterns', 'd'],
  ['Christmas gift boxes pattern', 'a heap of gift boxes with patterned wrapping paper, ribbons and bows', 'd'],
  ['Christmas stocking pattern', 'a big stocking filled with fine holly, star and snowflake patterns', 'd'],
  ['Christmas market', 'a Christmas market street with striped stalls, lanterns, a tree and snow, many small details', 'd'],
  ['Christmas angel pattern', 'an angel with wide wings filled with swirling patterns and small stars', 'd'],
  ['Christmas candy cane mandala', 'a round mandala made of candy canes, peppermints, ribbons and holly', 'd']
];

// Hanukkah (first evening 4 December 2026, last day 12 December). Facts kept plain: a menorah with nine branches (the tall one
// in the middle lights the others), a dreidel with four sides (drawn blank, the image model cannot write Hebrew letters),
// latkes and jelly doughnuts fried in oil, chocolate gelt.
const HANUKKAH = [
  ['Hanukkah menorah', 'a menorah with nine branches, the tall center candle higher than the other eight, each candle with a small flame', 'm'],
  ['Hanukkah dreidel', 'a spinning top dreidel with four blank sides, a pointed bottom and a small handle', 's'],
  ['Hanukkah latkes', 'a plate of potato latkes with a small bowl of applesauce', 's'],
  ['Hanukkah doughnuts', 'three jelly doughnuts dusted with powdered sugar on a plate', 's'],
  ['Hanukkah star', 'a six pointed star with a swirling border and small dots', 's'],
  ['Hanukkah candles', 'a row of nine candles in a simple holder, each with a small flame', 's'],
  ['Hanukkah gelt', 'a pile of round chocolate coins with a small dreidel on top', 's'],
  ['Hanukkah window', 'a window with a menorah on the sill, snow outside and a night sky with stars', 'm'],
  ['Hanukkah table', 'a family table set with a menorah, latkes, a dreidel and wrapped gifts', 'm'],
  ['Hanukkah gifts', 'a stack of wrapped gifts with ribbons and a small star on top', 's'],
  ['Hanukkah oil jar', 'a small clay jar of oil with an olive branch and a little flame', 's'],
  ['Hanukkah cookies', 'star shaped and dreidel shaped cookies with icing on a tray', 's'],
  ['Hanukkah teddy bear', 'a teddy bear holding a dreidel and a small gift', 's'],
  ['Hanukkah garland', 'a garland of stars and dreidels hanging across a window', 's'],
  ['Hanukkah snowy street', 'a cozy snowy street with lit windows and a menorah in one window, stars above', 'm'],
  ['Hanukkah pattern', 'dreidels, stars, candles and gifts in a repeating border pattern', 'd'],
  ['Hanukkah menorah mandala', 'a round mandala with a menorah in the center and stars and swirls around it', 'd']
];

// New Year (26 December to 5 January). No year in a name: a date would be out of date next season, and no alcohol or
// sparklers in a child's hand.
const NEWYEAR = [
  ['New Year fireworks', 'colorful fireworks bursting over a city skyline at night with stars', 'm'],
  ['New Year countdown clock', 'a big round clock with both hands pointing at twelve, surrounded by stars and confetti', 's'],
  ['New Year party hat', 'a cone party hat with stripes, dots and a pom-pom on top', 's'],
  ['New Year balloons', 'a bunch of party balloons with ribbons, stars and streamers', 's'],
  ['New Year confetti', 'falling confetti, streamers and stars over a big celebration', 'm'],
  ['New Year noisemaker', 'a party horn noisemaker with a curly streamer and confetti', 's'],
  ['New Year goals notebook', 'an open notebook with a pencil, checkboxes and small star stickers', 'm'],
  ['New Year penguin', 'a penguin wearing a party hat and holding a balloon', 's'],
  ['New Year teddy bear', 'a teddy bear in a party hat with a noisemaker and a small cake', 's'],
  ['New Year snowman', 'a snowman wearing a party hat and a scarf with fireworks behind', 's'],
  ['New Year family', 'a family counting down together at a window with fireworks outside', 'm'],
  ['New Year party table', 'a party table with a cake, party hats, balloons and streamers', 'm'],
  ['New Year disco ball', 'a sparkling disco ball with stars and streamers', 's'],
  ['New Year cat', 'a cat wearing a party hat next to a balloon', 's'],
  ['New Year puppy', 'a puppy in a party hat chasing confetti', 's'],
  ['New Year moon and stars', 'a crescent moon with big stars and a ribbon', 's'],
  ['New Year snow globe', 'a snow globe with a clock inside and falling confetti', 'm'],
  ['New Year cupcakes', 'cupcakes with swirled frosting and star toppers', 's'],
  ['New Year owl', 'an owl in a party hat on a branch with stars', 's'],
  ['New Year clock tower', 'a tall clock tower in a snowy city at midnight with fireworks', 'd'],
  ['New Year fireworks mandala', 'a round mandala made of fireworks bursts and stars', 'd'],
  ['New Year clock zentangle', 'a clock face filled with zentangle patterns and stars', 'd']
];

const WINTER = [
  ['winter snowman', 'a snowman with a top hat, a scarf and a carrot nose', 's', 'snowman-coloring-pages'],
  ['winter snowflakes', 'six big snowflakes, each with a different pattern', 's', 'snowflake-coloring-pages'],
  ['winter penguin', 'a penguin sliding on ice with a small scarf', 's'],
  ['winter polar bear', 'a polar bear cub playing in the snow', 's'],
  ['winter arctic fox', 'an arctic fox in the snow with a fluffy tail', 'm'],
  ['winter owl', 'an owl sitting in a snowy pine tree', 'm'],
  ['winter mittens', 'a pair of knitted mittens with a patterned hat', 's'],
  ['winter sledding', 'two children sledding down a hill with snowy trees behind', 'm'],
  ['winter ice skates', 'a pair of ice skates with a scarf', 's'],
  ['winter cabin', 'a snowy cabin in the woods with smoke from the chimney', 'm'],
  ['winter cardinal', 'a cardinal sitting on a snowy branch', 's'],
  ['winter reindeer forest', 'a reindeer standing in a snowy pine forest', 'm', 'reindeer-coloring-pages'],
  ['winter hot cocoa', 'a mug of hot cocoa with marshmallows next to a knitted blanket', 's'],
  ['winter igloo', 'an igloo with a fishing hole and a small penguin beside it', 's'],
  ['winter pine trees', 'snow covered pine trees on a hill with a big moon', 'm'],
  ['winter ski mountain', 'a mountain with ski tracks, a lift and tiny skiers', 'm'],
  ['winter snowflake mandala', 'a round snowflake mandala with fine crystal patterns', 'd', 'snowflake-coloring-pages'],
  ['winter penguin family', 'a family of penguins huddled together on the ice', 's'],
  ['winter baby seal', 'a baby seal resting on an ice floe', 's'],
  ['winter snow angel', 'a child making a snow angel next to a small snowman', 's', 'snowman-coloring-pages'],
  ['winter village', 'a cozy winter village with houses, lamp posts, skaters on a pond and snowy hills', 'd'],
  ['winter husky sled', 'a husky dog team pulling a sled across the snow', 'm'],
  ['winter fireplace cat', 'a cat sleeping by a fireplace on a rug with a blanket', 'm'],
  ['winter wolf', 'a wolf howling at a moon on a snowy hill with pine trees', 'm'],
  ['winter snowman family', 'a snowman family with a big, a medium and a small snowman', 's', 'snowman-coloring-pages'],
  ['winter birds', 'three small birds on a snowy branch with berries', 'm'],
  ['winter moose', 'a moose standing in a snowy forest', 'm'],
  ['winter owl mandala', 'a round mandala with an owl in the center and snowflakes around it', 'd'],
  // The winter pages run from 13 December to the end of January next to Christmas, New Year and evergreen drawings: more first-pass subjects
  ['winter fox den', 'a fox curled up asleep in a snowy den under tree roots with falling snow', 's'],
  ['winter snow fort', 'two children building a snow fort with a flag and a small snowman beside it', 'm', 'snowman-coloring-pages'],
  ['winter hockey pond', 'children playing ice hockey on a frozen pond with snowy trees around it', 'm'],
  ['winter deer in snow', 'a deer with antlers standing in a snowy meadow with falling snowflakes', 'm'],
  ['winter hedgehog nest', 'a hedgehog sleeping in a nest of leaves under a blanket of snow', 's'],
  ['winter snowshoes', 'a pair of snowshoes, a walking stick and a woolly hat in the snow', 's'],
  ['winter lantern path', 'a snowy path lined with lanterns, bare trees and a small bridge over a frozen stream', 'd'],
  ['winter bird feeder', 'a bird feeder with chickadees and a cardinal hanging from a snowy branch', 'm'],
  ['winter pine mandala', 'a round mandala of pine branches, snowflakes and pinecones', 'd', 'snowflake-coloring-pages'],
  ['winter skating pond', 'skaters gliding on a frozen pond with snowy pine trees and a small warming hut', 'd']
];

// Evergreen: [name, draw, levels, site theme page]
const EVERGREEN = [
  ['unicorn with rainbow mane', 'a cute unicorn with a long wavy mane and a spiral horn standing in a meadow', 's', 'unicorn-coloring-pages'],
  ['flying unicorn', 'a unicorn with wings flying over clouds and stars', 'm', 'unicorn-coloring-pages'],
  ['unicorn castle', 'a unicorn standing in front of a tall fairytale castle with flags', 'm', 'unicorn-coloring-pages'],
  ['baby unicorn', 'a baby unicorn lying down with flowers in its mane', 's', 'unicorn-coloring-pages'],
  ['unicorn mandala', 'a round mandala with a unicorn head in the center and flowers around it', 'd', 'unicorn-coloring-pages'],
  ['T. rex dinosaur', 'a friendly cartoon T. rex with a big head and small arms', 's', 'dinosaur-coloring-pages'],
  ['triceratops', 'a triceratops with three horns walking past ferns', 'm', 'dinosaur-coloring-pages'],
  ['dinosaur family', 'a dinosaur family with a mother and two babies near a volcano', 'm', 'dinosaur-coloring-pages'],
  ['baby dinosaur hatching', 'a baby dinosaur hatching from a big egg', 's', 'dinosaur-coloring-pages'],
  ['dinosaur skeleton', 'a dinosaur skeleton standing in a museum with a few visitors', 'm', 'dinosaur-coloring-pages'],
  ['sleeping kitten', 'a kitten curled up asleep on a soft pillow', 's', 'cat-coloring-pages'],
  ['cat with yarn', 'a cat playing with a ball of yarn next to a basket', 'm', 'cat-coloring-pages'],
  ['cat in a window', 'a cat sitting in a window with plants and a view of the moon', 'm', 'cat-coloring-pages'],
  ['cat face', 'a big cat face with whiskers and large eyes', 's', 'cat-coloring-pages'],
  ['cat mandala', 'a round mandala with a cat in the center and flowers around it', 'd', 'cat-coloring-pages'],
  ['happy puppy', 'a happy puppy with floppy ears and a wagging tail', 's', 'dog-coloring-pages'],
  ['dog with a bone', 'a dog sitting next to a big bone and a bowl', 's', 'dog-coloring-pages'],
  ['dog at the park', 'a dog chasing a ball in a park with a tree and a bench', 'm', 'dog-coloring-pages'],
  ['golden retriever', 'a golden retriever sitting with its tongue out', 'm', 'dog-coloring-pages'],
  ['dog mandala', 'a round mandala with a dog in the center and paw prints around it', 'd', 'dog-coloring-pages'],
  ['baby dragon', 'a baby dragon with small wings sitting on a pile of coins', 's', 'dragon-coloring-pages'],
  ['dragon castle', 'a big dragon flying over a castle on a mountain', 'm', 'dragon-coloring-pages'],
  ['friendly dragon', 'a friendly dragon with a long tail and a smile holding a flower', 's', 'dragon-coloring-pages'],
  ['dragon scales pattern', 'a coiled dragon with detailed scales and swirling patterns', 'd', 'dragon-coloring-pages'],
  ['mermaid with a shell', 'a mermaid sitting on a rock and holding a seashell', 'm', 'mermaid-coloring-pages'],
  ['little mermaid', 'a little mermaid with long hair swimming among small fish', 's', 'mermaid-coloring-pages'],
  ['mermaid castle', 'an underwater castle with a mermaid, seahorses and bubbles', 'd', 'mermaid-coloring-pages'],
  ['mermaid tail', 'a mermaid tail with big scales and a starfish', 's', 'mermaid-coloring-pages'],
  ['fairy in a flower', 'a tiny fairy with wings sitting inside a large flower', 's', 'fairy-coloring-pages'],
  ['fairy house', 'a fairy house in a tree stump with a round door, mushrooms and a lantern', 'm', 'fairy-coloring-pages'],
  ['fairy garden', 'a fairy flying over a garden of flowers and butterflies', 'm', 'fairy-coloring-pages'],
  ['fairy mandala', 'a round mandala with a fairy in the center and leaves and flowers around her', 'd', 'fairy-coloring-pages'],
  ['butterfly', 'a big butterfly with symmetrical patterned wings', 's', 'butterfly-coloring-pages'],
  ['butterfly garden', 'three butterflies flying around flowers in a garden', 'm', 'butterfly-coloring-pages'],
  ['butterfly mandala', 'a round mandala shaped like a butterfly with detailed wing patterns', 'd', 'butterfly-coloring-pages'],
  ['caterpillar and leaf', 'a smiling caterpillar on a big leaf', 's', 'butterfly-coloring-pages'],
  ['bouquet of flowers', 'a bouquet of roses, daisies and tulips tied with a ribbon', 'm', 'flower-coloring-pages'],
  ['sunflower field', 'a field of sunflowers under a bright sun with a small bee', 'm', 'flower-coloring-pages'],
  ['daisy', 'one big daisy with a long stem and two leaves', 's', 'flower-coloring-pages'],
  ['flower pot', 'a flower pot with tulips and a watering can', 's', 'flower-coloring-pages'],
  ['rose garden', 'a garden arch covered in roses with a winding path', 'd', 'flower-coloring-pages'],
  ['whale', 'a big whale with a spout swimming among small fish', 's', 'ocean-coloring-pages'],
  ['sea turtle', 'a sea turtle swimming over a coral reef', 'm', 'ocean-coloring-pages'],
  ['octopus', 'a smiling octopus with curly arms holding a bubble', 's', 'ocean-coloring-pages'],
  ['coral reef', 'a coral reef with fish, a starfish, shells and a seahorse', 'd', 'ocean-coloring-pages'],
  ['dolphin', 'a dolphin jumping over waves with a small sun', 's', 'ocean-coloring-pages'],
  ['seahorse and shells', 'a seahorse with seashells and a starfish on sand', 'm', 'ocean-coloring-pages'],
  ['astronaut', 'an astronaut floating in space with planets and stars', 'm', 'space-coloring-pages'],
  ['rocket ship', 'a rocket ship flying past the moon and stars', 's', 'space-coloring-pages'],
  ['solar system', 'the eight planets in a row around a big sun', 'm', 'space-coloring-pages'],
  ['alien and ufo', 'a friendly alien waving next to a small flying saucer', 's', 'space-coloring-pages'],
  ['planet mandala', 'a round mandala of planets, stars and rings', 'd', 'space-coloring-pages'],
  ['princess castle', 'a princess in a long dress standing in front of a castle', 'm', 'princess-coloring-pages'],
  ['princess crown', 'a princess crown with jewels and a small wand', 's', 'princess-coloring-pages'],
  ['princess and pony', 'a princess with a small pony in a flower field', 'm', 'princess-coloring-pages'],
  ['fairytale carriage', 'a pumpkin shaped carriage pulled by two horses at a gate', 'm', 'princess-coloring-pages'],
  ['galloping horse', 'a horse galloping through a meadow with its mane flying', 'm', 'horse-coloring-pages'],
  ['pony and foal', 'a pony with a small foal standing in a field', 's', 'horse-coloring-pages'],
  ['horse head', 'a horse head with a flowing mane and a halter', 'd', 'horse-coloring-pages'],
  ['barn and horses', 'a red barn with two horses and a fence', 'm', 'horse-coloring-pages'],
  ['race car', 'a race car with big wheels and a number on the door', 's', 'car-coloring-pages'],
  ['fire truck', 'a fire truck with a ladder and a hose', 's', 'car-coloring-pages'],
  ['monster truck', 'a monster truck with huge wheels jumping a ramp', 'm', 'car-coloring-pages'],
  ['vintage car', 'a vintage convertible car parked on a road with a small tree', 'm', 'car-coloring-pages'],
  ['mandala with petals', 'a round symmetrical mandala with rings of petals and small circles', 'd', 'mandala-coloring-pages'],
  ['sun and moon mandala', 'a round mandala with a sun and a moon face and stars', 'd', 'mandala-coloring-pages'],
  ['lotus mandala', 'a lotus flower mandala with layered petals and a dotted border', 'd', 'mandala-coloring-pages'],
  ['easy mandala', 'a simple mandala with one ring of big petals and a circle in the center', 's', 'mandala-coloring-pages'],
  ['elephant', 'a baby elephant with big ears spraying water with its trunk', 's', 'animal-coloring-pages'],
  ['giraffe', 'a giraffe with a long neck eating leaves from a tree', 'm', 'animal-coloring-pages'],
  ['lion', 'a lion with a big mane sitting on a rock', 'm', 'animal-coloring-pages'],
  ['panda', 'a panda sitting and eating bamboo', 's', 'animal-coloring-pages'],
  ['monkey', 'a monkey hanging from a branch with a banana', 's', 'animal-coloring-pages'],
  ['fox', 'a fox with a bushy tail sitting in tall grass', 'm', 'animal-coloring-pages'],
  ['owl', 'an owl on a branch with a crescent moon and stars', 'm', 'animal-coloring-pages'],
  ['bunny', 'a bunny with long ears sitting in a garden with carrots', 's', 'animal-coloring-pages'],
  ['farm animals', 'a farm scene with a cow, a pig, a sheep and a chicken near a barn', 'm', 'animal-coloring-pages'],
  ['safari animals', 'a safari scene with a zebra, a giraffe and an elephant under a big sun', 'm', 'animal-coloring-pages'],
  ['jungle animals', 'a jungle with a parrot, a monkey, a toucan and big leaves', 'd', 'animal-coloring-pages'],
  ['bear in the forest', 'a bear standing next to a river with fish and pine trees', 'm', 'animal-coloring-pages'],
  ['peacock', 'a peacock with a big fanned tail made of patterned feathers', 'd', 'animal-coloring-pages'],
  ['hummingbird', 'a hummingbird hovering next to a flower', 'm', 'animal-coloring-pages'],
  ['sloth', 'a smiling sloth hanging from a branch', 's', 'animal-coloring-pages'],
  ['cute robot', 'a friendly robot with a square head, round eyes and a small antenna', 's', 'adult-coloring-pages'],
  ['hot air balloon', 'a big hot air balloon with patterns floating over hills', 'm', 'adult-coloring-pages'],
  ['treehouse', 'a treehouse with a rope ladder, a slide and a lantern', 'm', 'adult-coloring-pages'],
  ['lighthouse', 'a lighthouse on a rocky shore with waves and seagulls', 'm', 'adult-coloring-pages'],
  ['cozy cottage', 'a cozy cottage with a flower garden, a winding path and a small pond', 'd', 'adult-coloring-pages'],
  ['mountain landscape', 'a mountain landscape with a lake, pine trees and a small boat', 'd', 'adult-coloring-pages'],
  ['ice cream cones', 'three big ice cream cones with different scoops and sprinkles', 's', 'adult-coloring-pages'],
  ['cupcakes', 'four cupcakes with swirled frosting, sprinkles and cherries', 's', 'adult-coloring-pages'],
  ['tea party', 'a tea party table with a teapot, cups, a cake and flowers', 'm', 'adult-coloring-pages'],
  ['bicycle with flowers', 'a bicycle with a basket full of flowers leaning on a fence', 'm', 'adult-coloring-pages']
];

// --- bank assembly ---
export const slugify = s => String(s).toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
export { cap };

// A small deterministic hash (FNV-1a) used for the stable "shuffled" order and for choosing among wordings.
export function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
}

// The word that tells a second drawing of a subject apart from the first in the page address.
const VARIANT_WORD = { simple: 'easy', medium: 'classic', detailed: 'detailed' };

// A row lists the levels it was written for (first pass). Every other level of the same subject is a second pass: the
// same subject drawn another way, used only when the first pass of the whole theme is used up.
function expand(theme, rows) {
  const out = [];
  for (const [name, draw, levels, site] of rows) {
    const primary = [...levels];
    const order = [...primary, ...['s', 'm', 'd'].filter(c => !primary.includes(c))];
    order.forEach((c, i) => {
      const level = LEVEL_OF[c];
      const word = i === 0 ? '' : VARIANT_WORD[level];
      const base = slugify(name) + (word ? '-' + word : '');
      const themed = theme !== 'evergreen' && !base.startsWith(slugify(THEMES[theme].label || theme));
      out.push({
        id: `${theme}:${base}`, theme, name, draw, level,
        slug: (themed ? slugify(THEMES[theme].label) + '-' : '') + base + '-coloring-page',
        // A detailed drawing of a theme that has a page for adults links to that page (Christmas).
        site: (level === 'detailed' && THEMES[theme].adultsSite) || site || THEMES[theme].site || null,
        variant: word, pass: i < primary.length ? 1 : 2
      });
    });
  }
  return out;
}

const RAW = { halloween: HALLOWEEN, fall: FALL, thanksgiving: THANKSGIVING, christmas: CHRISTMAS, hanukkah: HANUKKAH, newyear: NEWYEAR, winter: WINTER, evergreen: EVERGREEN };

// Which landing page a subject belongs to decides when it is drawn within its holiday theme. The first pass goes round the
// pages in the order below, one subject of each page per round, so the first pins of a season already cover the new pages
// instead of one page's drawings in a row. The order puts the pages whose queries the keyword scan of 27 October 2026 showed
// as the strongest first (short typed prefix and a high place in Google's list: Santa, Thanksgiving, Hanukkah, Christmas) and
// the six pages that went live that day before the older ones, so they get their first links early. A theme that is not a
// holiday (Halloween, every evergreen page) keeps the plain shuffled order.
export const QUERY_ORDER = [
  'santa-coloring-pages', 'christmas-tree-coloring-pages', 'reindeer-coloring-pages', 'christmas-ornament-coloring-pages', 'snowflake-coloring-pages',
  'thanksgiving-coloring-pages', 'turkey-coloring-pages', 'hanukkah-coloring-pages', 'christmas-coloring-pages', 'gingerbread-coloring-pages',
  'snowman-coloring-pages', 'new-year-coloring-pages', 'winter-coloring-pages', 'fall-coloring-pages', 'christmas-coloring-pages-for-adults'
];
const orderOf = site => { const i = QUERY_ORDER.indexOf(site); return i < 0 ? QUERY_ORDER.length : i; };
const shuffled = (a, b) => a.pass - b.pass || hash('cpm-order|' + a.slug) - hash('cpm-order|' + b.slug);
function ordered(theme, subjects) {
  // First pass before second pass, each in a stable pseudo-random order (a theme does not run through its subjects in the
  // order they were typed).
  const list = subjects.sort(shuffled);
  if (!THEMES[theme].holiday) return list;
  const round = new Map(), seen = {};
  for (const x of list) { const k = x.pass + '|' + x.site; round.set(x, seen[k] || 0); seen[k] = (seen[k] || 0) + 1; }
  return list.sort((a, b) => a.pass - b.pass || round.get(a) - round.get(b) || orderOf(a.site) - orderOf(b.site) || shuffled(a, b));
}

let bankCache = null;
export function bank() {
  if (bankCache) return bankCache;
  bankCache = {};
  for (const [theme, rows] of Object.entries(RAW)) bankCache[theme] = ordered(theme, expand(theme, rows));
  return bankCache;
}
export const allSubjects = () => Object.values(bank()).flat();
// The subjects a mix key stands for: a theme, or "theme>kids" (easy and medium drawings) or "theme>adults" (detailed ones).
const poolCache = new Map();
export function pool(key) {
  const [theme, side] = String(key).split('>');
  if (!side) return bank()[theme] || [];
  if (!poolCache.has(key)) poolCache.set(key, (bank()[theme] || []).filter(x => (side === 'adults') === (x.level === 'detailed')));
  return poolCache.get(key);
}

// The next subject to draw. used: Set of slugs already made; counts: { key: pages made so far in this season window } (auto
// pages only; keys are themes and "theme>kids" / "theme>adults", see PinCore.themeCounts(since)).
// Within the day's mix the key that is furthest behind its weight goes first, so a mixed season stays mixed.
export function pickSubject({ date, used, counts = {} }) {
  const phase = phaseFor(date);
  const b = bank();
  let best = null;
  for (const [key, w] of Object.entries(phase.mix)) {
    const cand = pool(key).find(s => !used.has(s.slug));
    if (!cand) continue;
    const ratio = (counts[key] || 0) / w;
    if (!best || ratio < best.ratio) best = { ratio, cand };
  }
  if (best) return { subject: best.cand, phase: phase.id };
  // Every subject of the season is made: fall back to evergreen, then to anything left.
  const rest = b.evergreen.find(s => !used.has(s.slug)) || allSubjects().find(s => !used.has(s.slug));
  return rest ? { subject: rest, phase: phase.id, fallback: true } : null;
}

// --- text ---
const TITLE_WORDINGS = {
  simple: [
    n => `Free printable ${n} coloring page for toddlers and preschoolers`,
    n => `${cap(n)} coloring page for kids with big, easy shapes to color`,
    n => `Easy ${n} coloring page, a free printable for little hands`
  ],
  medium: [
    n => `Free printable ${n} coloring page for kids ages 6 to 12`,
    n => `${cap(n)} coloring page with clear lines for kids to color`,
    n => `${cap(n)} coloring page: free to print at home`
  ],
  detailed: [
    n => `${cap(n)} coloring page for adults and teens, a detailed free printable`,
    n => `Detailed ${n} coloring page for adults to print and color`,
    n => `Free ${n} coloring page for adults with fine detail to color`
  ]
};
// The strongest modifier in the Google suggestions of each landing page's query (keyword scan of 27 October 2026, notes in
// takip/devir/coloringpagemaker-sezon-NOTLAR.md), put before the noun in a holiday pin title and used in its description:
// "printable" leads almost everywhere, "free" for Thanksgiving and Hanukkah, "free printable" for ornaments, and "printable PDF"
// where people type the PDF (turkey, New Year). The audience words (for kids, for adults) come from the detail level.
export const QUERY_MODIFIER = {
  'santa-coloring-pages': 'printable', 'christmas-coloring-pages': 'printable', 'reindeer-coloring-pages': 'printable',
  'christmas-tree-coloring-pages': 'printable', 'christmas-ornament-coloring-pages': 'free printable', 'snowflake-coloring-pages': 'printable',
  'christmas-coloring-pages-for-adults': 'printable', 'thanksgiving-coloring-pages': 'free', 'turkey-coloring-pages': 'printable PDF',
  'fall-coloring-pages': 'printable', 'winter-coloring-pages': 'printable', 'hanukkah-coloring-pages': 'free',
  'new-year-coloring-pages': 'printable PDF', 'gingerbread-coloring-pages': 'printable', 'snowman-coloring-pages': 'printable'
};
const HOLIDAY_TITLES = {
  simple: [
    (n, m) => `${cap(m)} ${n} coloring page for toddlers and preschoolers`,
    (n, m) => `Easy ${m} ${n} coloring page for kids to color`,
    (n, m) => `${cap(m)} ${n} coloring page with big shapes for little hands`
  ],
  medium: [
    (n, m) => `${cap(m)} ${n} coloring page for kids ages 6 to 12`,
    (n, m) => `${cap(m)} ${n} coloring page for kids with clear lines to color`,
    (n, m) => `${cap(m)} ${n} coloring page for kids, ready to print at home`
  ],
  detailed: [
    (n, m) => `${cap(m)} ${n} coloring page for adults and teens, fine detail`,
    (n, m) => `Detailed ${m} ${n} coloring page for adults to print and color`,
    (n, m) => `${cap(m)} ${n} coloring page for adults with fine detail to color`
  ]
};
// "christmas-coloring-pages-for-adults" -> "Christmas coloring pages for adults"
const PROPER_WORDS = ['Santa', 'Christmas', 'Thanksgiving', 'Hanukkah', 'New Year'];
export function queryLabel(site) {
  let q = String(site).replace(/-/g, ' ');
  for (const w of PROPER_WORDS) q = q.replace(new RegExp('\\b' + w + '\\b', 'i'), w);
  return q;
}
// Words that stay capitalized in the middle of a sentence.
const PROPER = /^(Halloween|Thanksgiving|Christmas|Hanukkah|New Year|Santa|Mrs\.|T\.)/;
export const midName = name => (PROPER.test(name) ? name : name[0].toLowerCase() + name.slice(1));
const sentence = s => cap(s.replace(/\s+/g, ' ').trim()).replace(/[.,;:\s]+$/, '') + '.';
// "a friendly ghost with ..." -> alt text for the page.
const altOf = draw => `Black line art coloring page of ${draw}, on white paper.`;

// Everything written about one subject. level and name come from the subject; pick is a number that chooses among
// the wordings (the subject hash, so the same page always gets the same words).
export function describe(subject) {
  const L = LEVELS[subject.level];
  const mid = midName(subject.name);
  const pick = hash('cpm-words|' + subject.slug);
  const wordings = TITLE_WORDINGS[subject.level];
  const theme = THEMES[subject.theme];
  const headline = `${cap(subject.name)} coloring page`;
  const blurb = sentence(subject.draw);
  // A holiday pin is worded with the query of the landing page it links to; every other pin keeps the general wording.
  const holiday = theme.holiday && subject.site;
  const mod = holiday ? QUERY_MODIFIER[subject.site] || 'free printable' : '';
  const label = holiday ? queryLabel(subject.site) : '';
  const forWho = !holiday || / for adults$/.test(label) ? '' : subject.level === 'detailed' ? ' for adults' : ' for kids';
  const pinTitle = holiday ? HOLIDAY_TITLES[subject.level][pick % 3](mid, mod) : wordings[pick % wordings.length](mid);
  const pinDescription = (holiday ? [
    blurb,
    `${L.line}.`,
    `Print it free at home as a PNG or a letter-size PDF. More ${mod} ${label}${forWho} at ColoringPageMaker, where you can also draw your own page: 2 free pages a day, no signup.`
  ] : [
    blurb,
    `${L.line}.`,
    `Print it free at home as a PNG or a letter-size PDF, or draw your own page with ColoringPageMaker: 2 free pages a day, no signup.`
  ]).join(' ');
  const pageTitle = `${headline}, Free Printable`;
  const intro = [
    blurb,
    `${L.line}.`
  ].join(' ');
  return {
    headline, sub: L.sub, pinTitle, pinDescription, alt: altOf(subject.draw), pageTitle, h1: headline, intro,
    metaDescription: `${headline}: a free printable page for ${L.audience}. ${blurb} Download the PNG or a letter-size PDF and print it at home.`,
    typedPrompt: `${subject.draw}, ${L.hint}`,
    themeLabel: theme.label,
    group: theme.group,
    prompt: subject.draw
  };
}
