// Theme guide pages (rendered by views/theme.ejs).
// Each guide is written for its own theme: prompts by age, the questions people ask about that
// theme, and facts with sources. Inline markup in text: [label](href) and **bold**.
// Facts from outside sources carry a link in `sources`, checked on `checked`.
// `updated` feeds the sitemap <lastmod>; change it whenever the page content changes.

const THEME_GUIDES = {

'halloween-coloring-pages': {
  updated: '2026-10-09',
  checked: '9 October 2026',
  title: 'Halloween Coloring Pages From Cute to Spooky (Free Generator)',
  description: 'Make Halloween coloring pages at the right scare level: smiling pumpkins for ages 3 to 5, haunted houses for older kids, Victorian mansions for adults. Free, no signup.',
  eyebrow: 'Halloween coloring page generator',
  h1: 'Halloween coloring pages, from cute to spooky',
  lead: `Describe the Halloween page you want and print it as a PDF in under a minute. The prompts below are sorted by age, because the haunted house a nine-year-old loves can be too much for a three-year-old.`,
  name: 'Halloween coloring page',
  topic: 'Halloween coloring pages',
  recipesHeading: 'Halloween prompts by age',
  toolHeading: 'Describe your Halloween page',
  defaultStyle: 'simple',
  presetPrompt: `a smiling jack-o'-lantern with a friendly ghost beside it, big simple shapes, no background`,
  chips: ['cute bat hanging from a branch', 'black cat in a witch hat, drawn in outline', 'pumpkin patch with a scarecrow', 'friendly monster holding a candy bucket'],
  recipes: [
    { who: 'Ages 3 to 5', style: 'simple', prompt: `a smiling jack-o'-lantern with a friendly ghost beside it, big simple shapes, no background`, why: `Big closed shapes are easy to stay inside, and “smiling” and “friendly” keep the faces soft.` },
    { who: 'Ages 6 to 9', style: 'medium', prompt: `three kids in costumes trick-or-treating at a front door with a bowl of candy, full moon drawn as an outline`, why: `Several characters hold attention longer, and an outlined moon keeps the sky white.` },
    { who: 'Ages 10 to 12', style: 'medium', prompt: `a crooked haunted house on a hill with bats, cobwebs and a black cat drawn in outline`, why: `Real spookiness for older kids. “In outline” stops the cat printing as a solid black shape.` },
    { who: 'Teens and adults', style: 'detailed', prompt: `an ornate Victorian haunted mansion with patterned roof tiles, a wrought-iron gate and twisted trees`, why: `Architecture gives the dense, repeating detail adults like, without gore.` },
    { who: 'History lesson', style: 'medium', prompt: `a carved turnip lantern glowing on the windowsill of an old Irish cottage`, why: `The first jack-o'-lanterns were turnips (see below), which gives a class something to talk about.` }
  ],
  sections: [
    { h2: 'Choose the scare level first', blocks: [
      { p: `The theme stays the same from preschool to adulthood. What changes is how frightening the picture may be, and the words in your prompt set that more than the subject does: a skeleton can be a cartoon in a party hat or a grinning figure in a graveyard.` },
      { table: { head: ['Mood', 'Words to use', 'Ages'], rows: [
        ['Friendly', 'smiling, cute, round, cartoon, party hat', '3 to 5'],
        ['Playful', 'costumes, trick-or-treat, candy, pumpkin patch', '6 to 9'],
        ['Spooky', 'crooked, moonlit, cobwebs, haunted, owls', '10 and up'],
        ['Gothic', 'Victorian, wrought iron, ornate, gargoyles', 'Teens, adults']
      ] } },
      { p: `Words such as zombie, blood, fangs or creepy push a page past what most young children enjoy. Look at the page on screen before you print a stack for a class.` }
    ] },
    { h2: 'Keep the night sky white', blocks: [
      { p: `Halloween is full of black: night skies, black cats, bats, witch hats. On a coloring page a large solid black area is ink with nothing left to color, and heavy ink can wrinkle plain printer paper. The generator already asks the image model for black outlines on white, but a prompt that says “dark night” or “silhouette” pulls the other way.` },
      { ul: [
        `Write “full moon and stars drawn as outlines” instead of “dark night sky”.`,
        `Write “black cat drawn in outline” so the cat becomes a shape to color.`,
        `If a page still comes back with a filled sky, generate it again with “white background, outline only” at the end of the prompt.`
      ] }
    ] },
    { h2: 'Pages for a class party', blocks: [
      { p: `Halloween falls on a Saturday this year (31 October 2026), so check whether your school marks it on Friday the 30th. Two set-ups work well:` },
      { ul: [
        `**One design for everyone.** Generate one page, check it and photocopy it. This is also the fair choice for a coloring contest, because every entry starts from the same picture.`,
        `**A different page per table.** Six table groups need six designs. On the free plan (2 pages a day) that takes three days, so start early in the week, or make them in one sitting with Pro.`
      ] }
    ] },
    { h2: 'Día de los Muertos is a separate holiday', blocks: [
      { p: `The Day of the Dead, as practiced in Mexico, welcomes back the souls of relatives who have died. It runs from the end of October into early November (UNESCO), which is why its decorated skulls, the calaveras, often turn up next to Halloween pages.` },
      { p: `If you make calavera pages, present them as part of that tradition, with flowers, candles and an ofrenda (the home altar with offerings for the family's dead), rather than as a Halloween monster. For a lesson, a page with a family ofrenda gives students more to talk about than a skull on its own.` }
    ] },
    { h2: `The first jack-o'-lanterns were turnips`, blocks: [
      { p: `In Ireland, lanterns were carved from turnips, because pumpkins are not native there. Irish immigrants carried the custom to North America, where pumpkins were plentiful, and the orange jack-o'-lantern took over (Clemson University Home & Garden Information Center). The last prompt in the table above draws a turnip lantern; make a pumpkin version too and let children compare.` }
    ] }
  ],
  faq: [
    { q: 'Are Halloween coloring pages too scary for young children?', a: `They don't have to be. For ages 3 to 5, describe smiling characters with round shapes and leave out skeletons, teeth and anything “creepy”. Check the page on screen before printing; if something looks sharp, generate again with “cute” and “friendly” added.` },
    { q: 'Why did my Halloween page print with a big black sky?', a: `The prompt probably asked for night or darkness. Describe the moon, stars and cat as outlines, and add “white background, outline only” if it happens again.` },
    { q: 'Can I make Halloween pages for adults?', a: `Yes. Choose Detailed and pick a subject with lots of structure: a Victorian mansion, a wrought-iron cemetery gate, an owl on a carved pumpkin. See [adult coloring pages](/adult-coloring-pages) for paper and detail tips.` },
    { q: 'Is the Day of the Dead the same as Halloween?', a: `No. Día de los Muertos is a Mexican tradition that honors relatives who have died, observed from the end of October into early November (UNESCO). Its symbols are best colored in that context.` },
    { q: 'Can I sell Halloween coloring pages I make here?', a: `With Pro, yes: it includes commercial use. Leave film and TV characters out of anything you sell. Our [Etsy guide](/sell-coloring-books-on-etsy) covers fees, file size limits and Etsy's rule that AI-made items must say so.` }
  ],
  sources: [
    { text: 'UNESCO: Indigenous festivity dedicated to the dead (Mexico)', href: 'https://ich.unesco.org/en/RL/indigenous-festivity-dedicated-to-the-dead-00054' },
    { text: `Clemson University HGIC: The origins of the jack-o'-lantern`, href: 'https://hgic.clemson.edu/the-origins-of-the-jack-olantern/' }
  ],
  cta: `Six table groups, six designs: that is three days on the free plan. Pro makes up to 150 pages a day with no watermark and a commercial license, for $9 once.`,
  related: [
    { href: '/christmas-coloring-pages', label: 'Christmas coloring pages', note: 'with a 24-day Advent plan' },
    { href: '/animal-coloring-pages', label: 'Animal coloring pages', note: 'bats, owls and black cats drawn as outlines' },
    { href: '/adult-coloring-pages', label: 'Adult coloring pages', note: 'detailed pages and paper tips' },
    { href: '/coloring-pages-for-classroom-teachers', label: 'Coloring pages for teachers', note: 'planning pages around a lesson' }
  ]
},

'christmas-coloring-pages': {
  updated: '2026-10-09',
  checked: '9 October 2026',
  title: 'Christmas Coloring Pages Generator, With a 24-Day Advent Plan',
  description: 'Generate Christmas coloring pages for toddlers to adults, follow a 24-day Advent coloring plan that fits the free tier, and print pages as cards or ornaments.',
  eyebrow: 'Christmas coloring page generator',
  h1: 'Christmas coloring pages and an Advent calendar plan',
  lead: `Type a Christmas scene and print it: Santa on a rooftop, a nativity, a snowman in your child's own scarf. Below are prompts by age, an Advent calendar with one page for each day from 1 to 24 December, and ways to print pages as cards and ornaments.`,
  name: 'Christmas coloring page',
  topic: 'Christmas coloring pages',
  recipesHeading: 'Christmas prompts by age',
  toolHeading: 'Describe your Christmas page',
  defaultStyle: 'simple',
  presetPrompt: 'one big Christmas tree with round ornaments and a star on top, big simple shapes, no background',
  chips: ['snowman with a scarf and a top hat', 'gingerbread house with candy windows', 'reindeer with bells on its harness', 'stocking full of toys'],
  recipes: [
    { who: 'Ages 2 to 5', style: 'simple', prompt: 'one big Christmas tree with round ornaments and a star on top, big simple shapes, no background', why: 'One object with large shapes: the easiest Christmas page there is.' },
    { who: 'Ages 6 to 9', style: 'medium', prompt: `Santa's sleigh and reindeer flying over snowy rooftops, moon and stars drawn as outlines`, why: 'The classic scene, with the night sky kept white so it is still a coloring page.' },
    { who: 'Ages 9 to 12', style: 'medium', prompt: 'a living room on Christmas Eve with stockings over the fireplace, a decorated tree and presents', why: 'Many separate objects, so the page can last several sittings.' },
    { who: 'Church groups', style: 'medium', prompt: 'nativity scene in a stable with Mary, Joseph, baby Jesus in the manger, shepherds, a donkey and a star above', why: 'Name each figure you want, so none is left out.' },
    { who: 'Teens and adults', style: 'detailed', prompt: 'an ornate Christmas wreath of holly, pine cones, berries and ribbon with patterned ornaments', why: 'Dense natural detail for a long evening of coloring.' }
  ],
  sections: [
    { h2: 'A 24-day Advent coloring calendar', blocks: [
      { p: `One page a day from 1 to 24 December. Making 24 pages takes 12 days on the free plan (2 a day), so start by 19 November; with Pro you can make all of them in one sitting. Every prompt works on Simple for younger children and Medium for older ones.` },
      { groups: [
        { title: 'Week 1', start: 1, items: ['a front door with a wreath and a bow', 'a snowman with a scarf and a top hat', 'mittens and a scarf drying by the fire', 'a gingerbread house with candy windows', 'a pile of wrapped presents with bows', `St Nicholas in a bishop's hat holding a staff`] },
        { title: 'Week 2', start: 7, items: ['a robin on a snowy branch', 'Christmas cookies on a baking tray', 'a reindeer wearing a harness with bells', 'a candle ringed with holly', 'children building a snowman', 'a polar bear in a knitted scarf'] },
        { title: 'Week 3', start: 13, items: ['an angel playing a trumpet', 'a sleigh piled with presents', 'a Christmas tree in a town square', 'a nutcracker soldier', 'carol singers under a street lamp', 'a stocking full of toys'] },
        { title: 'Week 4', start: 19, items: ['an elf wrapping presents in a workshop', 'a snowy village with a church', 'a child ice skating on a frozen pond', 'a toy train with presents on its cars', 'Santa checking his list', 'a decorated tree with presents beneath it'] }
      ] },
      { p: `Day 6 is St Nicholas, whose feast day falls on 6 December. For a church or family calendar, swap days 20 to 24 for the nativity story: the journey to Bethlehem, the stable, the shepherds, the star and the manger.` }
    ] },
    { h2: 'Print a page as a card, ornament or tag', blocks: [
      { p: `Each page downloads as a letter-size PDF. Your printer's “pages per sheet” setting shrinks it without any editing:` },
      { ul: [
        `**Card:** print at 2 pages per sheet and cut the sheet in half. Each half is 5.5 by 8.5 inches; glue it to the front of a letter sheet folded in half.`,
        `**Ornament:** print at 4 pages per sheet on cardstock. Each picture comes out just under 4 inches across; color it, cut around the outline, punch a hole and add ribbon.`,
        `**Gift tag:** 6 pages per sheet gives pictures about 2.5 inches across. Simple designs read best that small.`
      ] }
    ] },
    { h2: 'For a classroom with mixed traditions', blocks: [
      { p: `Not every family in a class celebrates Christmas. Winter pages work for everyone: snowmen, mittens, sledding, a snowy forest, animals in scarves. Keep nativity scenes for church groups, religious schools and home, where they are expected.` }
    ] }
  ],
  faq: [
    { q: 'Which Christmas coloring pages suit toddlers?', a: `One large object on Simple: a tree, a stocking, a snowman, a present with a bow. Leave busy scenes until ages 5 or 6.` },
    { q: 'When should I start an Advent coloring calendar?', a: `On the free plan, by 19 November: 24 pages at 2 a day takes 12 days. With Pro you can make all 24 in one sitting.` },
    { q: 'Can I make a nativity scene?', a: `Yes. Name every figure you want (Mary, Joseph, the baby in the manger, shepherds, animals, the star) so the generator includes them all.` },
    { q: 'How do I turn a coloring page into a Christmas card?', a: `Print it at 2 pages per sheet, cut the sheet in half and glue one half to a letter sheet folded in half. Cardstock makes a sturdier card.` },
    { q: 'Are there Christmas coloring pages for adults?', a: `Choose Detailed and ask for pattern-heavy subjects: a wreath, a snowy village street, a patterned bauble, a knitted sweater pattern. [Adult coloring pages](/adult-coloring-pages) has more on detail levels.` }
  ],
  sources: [
    { text: 'St Nicholas Center: Who is St Nicholas? (feast day 6 December)', href: 'https://www.stnicholascenter.org/who-is-st-nicholas' }
  ],
  cta: `Twenty-four Advent pages take 12 days on the free plan. Pro makes them in one sitting, with no watermark and a commercial license, for $9 once.`,
  related: [
    { href: '/halloween-coloring-pages', label: 'Halloween coloring pages', note: 'from cute to spooky' },
    { href: '/animal-coloring-pages', label: 'Animal coloring pages', note: 'reindeer, robins and polar bears' },
    { href: '/adult-coloring-pages', label: 'Adult coloring pages', note: 'intricate wreaths and villages' },
    { href: '/coloring-pages-for-classroom-teachers', label: 'Coloring pages for teachers', note: 'building a year of themed pages' }
  ]
},

'dinosaur-coloring-pages': {
  updated: '2026-10-09',
  checked: '9 October 2026',
  title: 'Dinosaur Coloring Pages With the Science Right (Free Generator)',
  description: 'Make dinosaur coloring pages that pair species that really lived together, with a feathered Velociraptor and a scaly T. rex. Dates from the Natural History Museum.',
  eyebrow: 'Dinosaur coloring page generator',
  h1: 'Dinosaur coloring pages that get the science right',
  lead: `Ask for any dinosaur and print it. If your young paleontologist cares about accuracy, the notes below help: which dinosaurs lived at the same time, which famous “dinosaurs” were not dinosaurs, and how big Velociraptor really was.`,
  name: 'dinosaur coloring page',
  topic: 'dinosaur coloring pages',
  recipesHeading: 'Dinosaur prompts by age',
  toolHeading: 'Describe your dinosaur page',
  defaultStyle: 'simple',
  presetPrompt: 'a smiling baby Triceratops hatching from an egg, big simple shapes, no background',
  chips: ['Ankylosaurus with a club tail', 'dinosaur eggs in a nest', 'Parasaurolophus in a swamp', 'paleontologist digging up a fossil'],
  recipes: [
    { who: 'Ages 3 to 5', style: 'simple', prompt: 'a smiling baby Triceratops hatching from an egg, big simple shapes, no background', why: 'One animal, large spaces, and a baby face keeps it friendly.' },
    { who: 'Ages 6 to 9', style: 'medium', prompt: 'a Brachiosaurus eating leaves from a tall tree while a Stegosaurus grazes below, Late Jurassic plants', why: 'Both lived in the Late Jurassic in what is now the USA, so this scene could have happened.' },
    { who: 'Ages 6 to 9', style: 'medium', prompt: 'a Tyrannosaurus rex with scaly skin facing a Triceratops in a forest of ferns', why: 'They lived at the same time and place, and preserved skin shows T. rex had scales.' },
    { who: 'Ages 10 to 12', style: 'medium', prompt: 'a small feathered Velociraptor standing on a rock in a Mongolian desert', why: 'Velociraptor was about 1.8 m long and is now thought to have had a feather-like covering.' },
    { who: 'Teens and adults', style: 'detailed', prompt: 'a Stegosaurus skeleton in a museum hall, every bone and back plate outlined', why: 'A skeleton gives older children precise, countable detail.' }
  ],
  sections: [
    { h2: 'Which dinosaurs lived at the same time', blocks: [
      { p: `Most dinosaur pictures mix animals that lived millions of years apart. If accuracy matters to your child, pair dinosaurs from the same period and place. Dates and finds below are from the Natural History Museum's Dino Directory.` },
      { table: { head: ['Dinosaur', 'When it lived', 'Fossils found in', 'Good scene partners'], rows: [
        ['Tyrannosaurus', 'Late Cretaceous, 68–66 million years ago', 'USA, Canada', 'Triceratops'],
        ['Triceratops', 'Late Cretaceous, 68–66 million years ago', 'USA', 'Tyrannosaurus'],
        ['Velociraptor', 'Late Cretaceous, 74–70 million years ago', 'Mongolia', 'Not T. rex: different time and continent'],
        ['Stegosaurus', 'Late Jurassic, 152–145 million years ago', 'USA', 'Brachiosaurus, Allosaurus'],
        ['Brachiosaurus', 'Late Jurassic, 152–145 million years ago', 'USA', 'Stegosaurus, Brontosaurus']
      ] } },
      { p: `One surprise for children: more time separates Stegosaurus from Tyrannosaurus (at least 77 million years) than separates Tyrannosaurus from us (about 66 million years). A page with both is fun, but it is fantasy.` }
    ] },
    { h2: 'Famous animals that were not dinosaurs', blocks: [
      { p: `Three favorites appear in almost every dinosaur coloring book, and none of them is a dinosaur:` },
      { ul: [
        `**Pterosaurs** such as Pteranodon were flying reptiles, related to dinosaurs but a separate group, and the first animals with backbones to fly.`,
        `**Marine reptiles** such as plesiosaurs, ichthyosaurs and mosasaurs were not dinosaurs either.`,
        `**Dimetrodon**, the one with a sail on its back, belongs to a group once called mammal-like reptiles and now called synapsids.`
      ] },
      { p: `They still make good pages. For a class display, call the set “prehistoric reptiles” rather than “dinosaurs”.` }
    ] },
    { h2: 'How scientists picture them now', blocks: [
      { ul: [
        `**Velociraptor** was about 1.8 m long and weighed about 7 kg, half the size of the film version, and is now thought to have had a fine feather-like covering. Ask for “a small feathered Velociraptor”.`,
        `**Tyrannosaurus** skin found so far shows scales, and there is no direct evidence of feathers. Ask for “scaly skin” for the current view.`,
        `**Film dinosaurs**, the designs from the Jurassic Park and Jurassic World films, belong to the studio. Ask for the real animal by name instead.`
      ] }
    ] }
  ],
  faq: [
    { q: 'Are the dinosaurs on these pages scientifically accurate?', a: `The generator draws what you describe, so accuracy comes from the prompt. Name a real species, pair it with dinosaurs from the same period (see the table) and add details such as feathers or scales. Treat the result as an illustration, not a museum reconstruction.` },
    { q: 'Is a pterodactyl a dinosaur?', a: `No. Pterosaurs, the group that includes Pteranodon, were flying reptiles. They were related to dinosaurs but are a separate group (Natural History Museum).` },
    { q: 'Can I make pages of the dinosaurs from Jurassic World?', a: `The film designs belong to the studio, so this page is for real species and your own inventions. Ask for the real animal by name, or invent a new dinosaur and give it a name of its own.` },
    { q: 'Which dinosaur pages work best for toddlers?', a: `One dinosaur, large shapes and no background, on Simple. Baby dinosaurs and eggs are easy wins, and a long-necked Brachiosaurus is a simple shape to fill.` },
    { q: 'How can I use dinosaur pages in a science lesson?', a: `Make one page per animal in the table and have students sort them into Late Jurassic and Late Cretaceous. Add a pterosaur and a plesiosaur as a challenge round: which ones are not dinosaurs?` }
  ],
  sources: [
    { text: 'Natural History Museum: Tyrannosaurus', href: 'https://www.nhm.ac.uk/discover/dino-directory/tyrannosaurus.html' },
    { text: 'Natural History Museum: Triceratops', href: 'https://www.nhm.ac.uk/discover/dino-directory/triceratops.html' },
    { text: 'Natural History Museum: Velociraptor', href: 'https://www.nhm.ac.uk/discover/dino-directory/velociraptor.html' },
    { text: 'Natural History Museum: Stegosaurus', href: 'https://www.nhm.ac.uk/discover/dino-directory/stegosaurus.html' },
    { text: 'Natural History Museum: Brachiosaurus', href: 'https://www.nhm.ac.uk/discover/dino-directory/brachiosaurus.html' },
    { text: 'Natural History Museum: What are dinosaurs?', href: 'https://www.nhm.ac.uk/discover/what-are-dinosaurs.html' },
    { text: 'Natural History Museum: The truth about pterosaurs', href: 'https://www.nhm.ac.uk/discover/the-truth-about-pterosaurs.html' }
  ],
  cta: `A page for each animal in a class unit adds up: eight pages is four days on the free plan. Pro makes up to 150 pages a day with no watermark, for $9 once.`,
  related: [
    { href: '/animal-coloring-pages', label: 'Animal coloring pages', note: 'life cycles and habitats for science class' },
    { href: '/coloring-pages-for-classroom-teachers', label: 'Coloring pages for teachers', note: 'matching pages to a unit' },
    { href: '/unicorn-coloring-pages', label: 'Unicorn coloring pages', note: 'from baby unicorns to the narwhal' }
  ]
},

'adult-coloring-pages': {
  updated: '2026-10-09',
  checked: '9 October 2026',
  title: 'Adult Coloring Pages, Intricate or Bold and Easy (AI Generator)',
  description: 'Generate adult coloring pages at the detail you enjoy: intricate zentangle and botanical pages, or bold-and-easy pages with large spaces. Paper tips for pencils and markers.',
  eyebrow: 'Adult coloring page generator',
  h1: 'Adult coloring pages at the detail you enjoy',
  lead: `Some people want a page that lasts a week. Others want large, calm shapes after a long day, or a page an older parent can see clearly. Pick the level below, describe a subject you like, and print it.`,
  name: 'adult coloring page',
  topic: 'adult coloring pages',
  recipesHeading: 'Prompts by level',
  toolHeading: 'Describe your page',
  defaultStyle: 'detailed',
  presetPrompt: 'an owl made of zentangle patterns, each feather filled with a different pattern, fine but unbroken lines',
  chips: ['botanical peony with buds and leaves', 'harbor with sailboats and rope coils', 'koi pond with lily pads', 'library shelves full of books and plants'],
  recipes: [
    { who: 'Bold and easy', style: 'simple', prompt: 'a cozy café table with a cup of coffee, a croissant and a vase of tulips, bold lines, large spaces', why: 'An adult subject with child-sized spaces: good for markers, tired eyes or an unsteady hand.' },
    { who: 'Relaxed', style: 'medium', prompt: 'a cottage garden with foxgloves, a watering can and a wooden gate', why: 'Enough detail for an evening without a sharpened pencil for every space.' },
    { who: 'Intricate', style: 'detailed', prompt: 'an owl made of zentangle patterns, each feather filled with a different pattern, fine but unbroken lines', why: 'Patterns inside one clear outline keep a dense page readable.' },
    { who: 'Intricate scene', style: 'detailed', prompt: 'a row of tall Amsterdam canal houses with bicycles, window boxes and detailed brickwork', why: 'Repeating architecture rewards long sessions.' },
    { who: 'Botanical', style: 'detailed', prompt: 'a botanical illustration of a single peony with buds and leaves, fine but unbroken lines', why: 'One large subject keeps the detail at a printable scale.' }
  ],
  sections: [
    { h2: 'Three kinds of adult page', blocks: [
      { p: `“Adult” covers very different needs. Decide which of these you want before you write the prompt:` },
      { table: { head: ['Kind', 'What it looks like', 'Good for', 'Setting'], rows: [
        ['Bold and easy', 'Thick lines, large spaces, grown-up subjects', 'Markers, short sessions, low vision, older relatives', 'Simple'],
        ['Relaxed', 'Medium detail, a clear picture', 'An evening with pencils or gel pens', 'Medium'],
        ['Intricate', 'Dense patterns and small spaces', 'Sharp colored pencils, several sittings', 'Detailed']
      ] } },
      { p: `Bold-and-easy pages are not children's pages. Ask for adult subjects (a kitchen shelf of jars, a sailboat in a harbor, a vintage bicycle) and add “bold lines, large spaces”. Leave out words like cute and cartoon if you want the page to feel grown-up.` }
    ] },
    { h2: 'How fine the detail can get', blocks: [
      { p: `Every page is 1024 by 1024 pixels. Printed 7.5 inches wide, one pixel is about 0.19 mm, so lines only a pixel or two wide can print faint or broken, and spaces smaller than a pencil tip are frustrating to fill. Two prompt habits help:` },
      { ul: [
        `Ask for “fine but unbroken lines” rather than “ultra fine” or “microscopic detail”.`,
        `Ask for many medium shapes (“each feather filled with a pattern”) rather than texture everywhere.`
      ] },
      { p: `If you need very fine detail at full-page size, for example for a printed book, compare tools that output larger files. Our [comparison of AI coloring page generators](/best-ai-coloring-page-generators-2026) lists which ones state 300 DPI or 4K output.` }
    ] },
    { h2: 'Paper for pencils, markers and paint', blocks: [
      { ul: [
        `**Colored pencils:** ordinary copy paper works. A smoother, heavier paper takes more layers.`,
        `**Alcohol markers:** they soak through copy paper. Print on cardstock and keep a spare sheet behind the page.`,
        `**Watercolor or brush pens:** thin paper wrinkles when wet. Use the heaviest paper your printer is rated to feed (check its manual).`
      ] }
    ] },
    { h2: 'What the research says about coloring and stress', blocks: [
      { p: `Small experiments found anxiety dropped after about 20 minutes of coloring, but a 2022 meta-analysis found mandala coloring was not clearly better than free drawing, and most studies only measure the minutes right after a session. Our [summary of the studies](/adult-coloring-mental-health-benefits) links each one. Coloring is a pleasant, low-cost habit, not a treatment.` }
    ] }
  ],
  faq: [
    { q: 'Are detailed pages too hard for a beginner?', a: `They can take several sittings, which some people enjoy and others find a chore. Start with a Relaxed page in a subject you like, and move to Detailed once you know how long you want a page to last.` },
    { q: 'Can I make large-print coloring pages for an older parent?', a: `Yes. Choose Simple, describe an adult subject (a garden bench, a teapot and cups, a harbor with boats) and add “bold lines, large spaces”. Print one at full letter size to check it before you make a set.` },
    { q: 'What paper should I print adult coloring pages on?', a: `Copy paper for colored pencils, cardstock for alcohol markers, and the heaviest paper your printer accepts for anything wet.` },
    { q: 'How is this different from the mandala page?', a: `The [mandala page](/mandala-coloring-pages) is for round, symmetrical designs. This page is for any subject at adult detail: animals, buildings, plants, interiors.` },
    { q: 'Can I sell adult coloring books made with this generator?', a: `Pro includes commercial use. For a printed book, note that Amazon KDP asks for images of at least 300 DPI, which these 1024-pixel pages reach only at about 3.4 inches across. Our [KDP guide](/coloring-pages-for-self-publishing-kdp) explains the options.` }
  ],
  sources: [
    { text: 'Amazon KDP: paperback submission guidelines (300 DPI minimum)', href: 'https://kdp.amazon.com/en_US/help/topic/G201857950' }
  ],
  cta: `A 30-page book takes 15 days on the free plan. Pro makes up to 150 pages a day, removes the watermark and includes commercial use, for $9 once.`,
  related: [
    { href: '/mandala-coloring-pages', label: 'Mandala coloring pages', note: 'symmetrical, round designs' },
    { href: '/flower-coloring-pages', label: 'Flower coloring pages', note: 'bouquets and botanical line art' },
    { href: '/adult-coloring-mental-health-benefits', label: 'Adult coloring and anxiety', note: 'what four studies found' },
    { href: '/coloring-pages-for-self-publishing-kdp', label: 'Publishing a coloring book on KDP', note: 'trim size, bleed and the 300 DPI rule' }
  ]
},

'princess-coloring-pages': {
  updated: '2026-10-09',
  checked: '9 October 2026',
  title: 'Princess Coloring Pages: Original Princesses Your Child Describes',
  description: `Build a princess coloring page from your child's answers: hair, outfit, pet, castle. Plus fairy-tale scenes from Perrault and the Grimms that are free to draw.`,
  eyebrow: 'Princess coloring page generator',
  h1: 'Princess coloring pages your child designs',
  lead: `Children rarely ask for just “a princess”. They want a princess with a pet fox, a braid down to the floor and a castle on a cloud. Describe exactly that and print it. This page also covers which fairy-tale princesses are free to draw, and why studio princesses are not.`,
  name: 'princess coloring page',
  topic: 'princess coloring pages',
  recipesHeading: 'Princess prompts by age',
  toolHeading: 'Describe your princess',
  defaultStyle: 'simple',
  presetPrompt: 'a smiling princess with a big crown and a puffy dress holding a flower, big simple shapes, no background',
  chips: ['princess knight with a shield', 'princess reading in a tower library', 'two sisters building a snow castle', 'princess baking a cake with her cat'],
  recipes: [
    { who: 'Ages 3 to 5', style: 'simple', prompt: 'a smiling princess with a big crown and a puffy dress holding a flower, big simple shapes, no background', why: 'A single figure with large areas of dress to fill.' },
    { who: 'Ages 6 to 9', style: 'medium', prompt: 'a princess riding a friendly dragon over a castle with flags', why: 'Action and an animal companion give the page a story.' },
    { who: 'Ages 6 to 9', style: 'medium', prompt: 'a princess in a lab coat over her gown looking through a telescope in a castle tower', why: 'A princess with a job. Swap in any job your child likes.' },
    { who: 'Ages 10 to 12', style: 'medium', prompt: `Rapunzel's stone tower in a forest with a very long braid hanging from the window, storybook style`, why: 'A scene from the 1812 Grimm tale rather than a film costume.' },
    { who: 'Teens and adults', style: 'detailed', prompt: 'portrait of a princess with an ornate lace collar, a jeweled crown and a brocade gown with repeating patterns', why: 'Lace and brocade give dense pattern work.' }
  ],
  sections: [
    { h2: 'Build the princess your child describes', blocks: [
      { p: `Ask your child five questions and put the answers into one sentence:` },
      { table: { head: ['Ask about', 'Answers children give'], rows: [
        ['Hair', 'a long braid, curls, a bob, two buns, a ponytail'],
        ['Outfit', 'a ball gown, armor, explorer clothes, a space suit, pajamas'],
        ['Companion', 'a fox, a horse, a dragon, a cat, a pet frog'],
        ['Place', 'a castle, an ice palace, a treehouse, under the sea, the moon'],
        ['Doing', 'dancing, reading, riding, sword practice, baking']
      ] } },
      { p: `For example: “a princess with two buns and glasses, wearing explorer clothes and a crown, riding a horse through a jungle with a fox beside her.” Glasses, a hearing aid or a wheelchair are easy to include if your child wants a princess like them.` }
    ] },
    { h2: 'Fairy-tale princesses that are free to draw', blocks: [
      { p: `The stories below are old enough to be in the public domain, so their scenes are yours to draw. Studio films based on them are a different matter: Disney's character designs are protected, and its 1937 Snow White film stays under US copyright until the end of 2032 (95 years from publication). Describe the scene from the book, not a costume from a film.` },
      { table: { head: ['Tale', 'First published', 'A scene to ask for'], rows: [
        ['Cinderella', 'Charles Perrault, 1697', 'a pumpkin turning into a coach at midnight'],
        ['Sleeping Beauty', 'Charles Perrault, 1697', 'a castle wrapped in thorny briars'],
        ['Snow White', 'Brothers Grimm, 1812', `the seven dwarfs' cottage in a forest clearing`],
        ['Rapunzel', 'Brothers Grimm, 1812', 'a stone tower with a long braid hanging down'],
        ['The Frog King', 'Brothers Grimm, 1812', 'a princess at a well with a golden ball and a frog']
      ] } }
    ] },
    { h2: 'A page for every party guest', blocks: [
      { p: `For a princess party, ask each guest one question in advance (what pet their princess has, say) and make one page per guest. Eight guests take four days on the free plan, or one sitting with Pro. Print a couple of spares for siblings and late arrivals.` }
    ] }
  ],
  faq: [
    { q: 'Can I make Disney princess coloring pages here?', a: `This generator is for original designs. Disney's princesses are protected by copyright and trademark, so the safe route is your own princess or a scene from the original fairy tale. Never sell copies of studio characters.` },
    { q: 'Can the princess look like my daughter?', a: `Describe what she would describe: hairstyle, glasses, a favorite dress, a pet. The generator works from text, not photos, so it draws a character inspired by her rather than a portrait.` },
    { q: 'What ages are princess coloring pages for?', a: `Mostly 3 to 10. Use Simple for ages 3 to 6 (one figure, large dress shapes) and Medium for older children who want a castle, animals and other characters. Teens and adults like Detailed portraits with lace and patterns.` },
    { q: 'Can I make a prince or a knight instead?', a: `Yes. Change the word: a prince, a knight in armor, two princesses sharing a castle, a princess and her dragon at a tournament. The generator draws whichever character you name.` },
    { q: 'Can I sell princess coloring pages?', a: `With Pro, yes, as long as the princesses are your own or come from public-domain tales. Our [Etsy guide](/sell-coloring-books-on-etsy) covers Etsy's rule that AI-made items must say so.` }
  ],
  sources: [
    { text: 'D. L. Ashliman, University of Pittsburgh: Perrault, Cinderella (1697)', href: 'https://sites.pitt.edu/~dash/perrault06.html' },
    { text: 'D. L. Ashliman: Sleeping Beauty tales, including Perrault (1697)', href: 'https://sites.pitt.edu/~dash/type0410.html' },
    { text: 'D. L. Ashliman: Grimm, Little Snow-White (first edition 1812)', href: 'https://sites.pitt.edu/~dash/grimm053.html' },
    { text: 'D. L. Ashliman: Grimm, Rapunzel (1812 and 1857 versions)', href: 'https://sites.pitt.edu/~dash/grimm012.html' },
    { text: 'D. L. Ashliman: Grimm, The Frog King (1812 to 1857 editions)', href: 'https://sites.pitt.edu/~dash/grimm001.html' },
    { text: 'Cornell University: Copyright term and the public domain in the United States', href: 'https://copyright.cornell.edu/publicdomain' }
  ],
  cta: `Eight party guests take four days on the free plan. Pro makes up to 150 pages a day, with no watermark, for $9 once.`,
  related: [
    { href: '/unicorn-coloring-pages', label: 'Unicorn coloring pages', note: 'winged unicorns and party pages' },
    { href: '/animal-coloring-pages', label: 'Animal coloring pages', note: 'companions for your princess' },
    { href: '/coloring-pages-for-classroom-teachers', label: 'Coloring pages for teachers', note: 'trademarked characters and school use' },
    { href: '/sell-coloring-books-on-etsy', label: 'Selling coloring books on Etsy', note: 'fees, file limits and AI rules' }
  ]
},

'animal-coloring-pages': {
  updated: '2026-10-09',
  checked: '9 October 2026',
  title: 'Animal Coloring Pages for Any Animal, Pet or Science Unit',
  description: 'Generate a coloring page of any animal: a pet portrait, a frog life cycle, a habitat scene. How to keep zebras, pandas and penguins from printing as black blobs.',
  eyebrow: 'Animal coloring page generator',
  h1: 'Animal coloring pages for any animal you can name',
  lead: `Printable galleries stock the popular animals. Here you can ask for an axolotl, a pangolin or your own dog with one floppy ear, in the habitat and at the level of detail you need.`,
  name: 'animal coloring page',
  topic: 'animal coloring pages',
  recipesHeading: 'Animal prompts by age and use',
  toolHeading: 'Describe your animal page',
  defaultStyle: 'medium',
  presetPrompt: 'a mother kangaroo with a joey peeking out of her pouch, Australian outback',
  chips: ['axolotl in a pond', 'sloth hanging from a branch', 'hedgehog in autumn leaves', 'sea turtle over a coral reef'],
  recipes: [
    { who: 'Ages 3 to 5', style: 'simple', prompt: 'one smiling cartoon elephant, big simple shapes, no background', why: 'One animal filling the page is the easiest start.' },
    { who: 'Ages 6 to 9', style: 'medium', prompt: 'a mother kangaroo with a joey peeking out of her pouch, Australian outback', why: 'A parent and baby, with a habitat to color around them.' },
    { who: 'Science class', style: 'medium', prompt: 'butterfly life cycle in four stages arranged in a circle: eggs on a leaf, caterpillar, chrysalis, butterfly, with an empty label box under each stage', why: 'Empty boxes let students write the stage names themselves.' },
    { who: 'Pet portrait', style: 'medium', prompt: 'a pug with a curly tail and a red collar asleep on a round cushion', why: `Describe your own pet's features the same way.` },
    { who: 'Teens and adults', style: 'detailed', prompt: 'realistic tiger portrait with detailed fur and the stripes drawn as outlines', why: 'Outlined stripes turn the markings into spaces to color.' }
  ],
  sections: [
    { h2: 'Animals with black markings', blocks: [
      { p: `Zebras, pandas, penguins, orcas and dalmatians are favorites, and they share a problem: in life, large parts of them are black. Drawn that way, the page has little left to color and uses a lot of ink. Ask for the markings as outlines and the child chooses the colors, black or otherwise.` },
      { table: { head: ['Animal', 'Add to the prompt'], rows: [
        ['Zebra', 'stripes drawn as outlines, not filled'],
        ['Giant panda', 'eye patches, ears and legs drawn as outlined shapes'],
        ['Penguin', 'back and head outlined, white front'],
        ['Orca', 'black areas outlined, white eye patch'],
        ['Dalmatian', 'spots drawn as outlined circles'],
        ['Black cat', 'drawn in outline, white background']
      ] } }
    ] },
    { h2: 'Life cycles and habitats for science lessons', blocks: [
      { p: `Butterflies go through four stages: egg, larva (the caterpillar), pupa (the chrysalis) and adult (Florida Museum of Natural History). Frogs go from eggs to tadpole to froglet to adult, and tadpoles grow their back legs before their front legs (The Nature Conservancy). Ask for the stages in a circle with an empty label box under each, so students write the names.` },
      { p: `For a habitat unit, make one page per habitat:` },
      { ul: [
        'Arctic: a polar bear, an Arctic fox and a snowy owl on sea ice',
        'Rainforest: a sloth, a toucan and a tree frog in the canopy',
        'Savanna: a giraffe and zebras under an acacia tree',
        'Coral reef: a sea turtle, an octopus and clownfish among coral',
        'Desert: a camel and a fennec fox by a date palm oasis'
      ] }
    ] },
    { h2: 'Pet portraits from a description', blocks: [
      { p: `The generator works from words, not photos, so describe your pet the way you would to someone who has never met it: breed or mix, ear shape, tail, coat pattern (as outlines), collar or bandana, a favorite toy, where it sleeps. “A scruffy terrier mix with one ear up and one ear down, wearing a striped bandana, sitting by a red ball” gives the generator far more to go on than “a dog”.` }
    ] }
  ],
  faq: [
    { q: 'Can I get any animal?', a: `Any animal you can name, living or extinct, plus invented ones. For dinosaurs, [dinosaur coloring pages](/dinosaur-coloring-pages) has prompts that keep the science straight.` },
    { q: 'Why did my zebra come out mostly black?', a: `The stripes were drawn filled in, the way they look in life. Add “stripes drawn as outlines” to the prompt and generate again.` },
    { q: 'Should I ask for realistic or cartoon animals?', a: `Cartoon with Simple suits ages 3 to 6. Realistic with Detailed suits older children and adults, and works well for animals with strong patterns such as tigers, owls and giraffes.` },
    { q: 'Can I make a page from a photo of my pet?', a: `Not here: this generator works from text only. Describe the pet in detail instead (see above), or use a photo-to-line-art tool; our [comparison of generators](/best-ai-coloring-page-generators-2026) notes which tools take photos.` },
    { q: 'Do animal coloring pages work for a science unit?', a: `Yes, if you plan the set: one page per life-cycle stage or one per habitat, with label boxes for students to fill in.` }
  ],
  sources: [
    { text: 'Florida Museum of Natural History: Butterfly life cycle (PDF)', href: 'https://www.floridamuseum.ufl.edu/wp-content/uploads/sites/16/2022/08/Butterfly-Life-Cycle.pdf' },
    { text: 'The Nature Conservancy: Frog and toad life cycle guide (PDF)', href: 'https://origin-www.nature.org/content/dam/tnc/nature/en/documents/frog-toad-lifecycle-guide-FL-CCI.pdf' }
  ],
  cta: `A habitat unit of five pages takes three days on the free plan. Pro makes up to 150 pages a day with no watermark, for $9 once.`,
  related: [
    { href: '/dinosaur-coloring-pages', label: 'Dinosaur coloring pages', note: 'species that really lived together' },
    { href: '/halloween-coloring-pages', label: 'Halloween coloring pages', note: 'bats, owls and black cats' },
    { href: '/unicorn-coloring-pages', label: 'Unicorn coloring pages', note: 'including the narwhal' },
    { href: '/coloring-pages-for-classroom-teachers', label: 'Coloring pages for teachers', note: 'subject-aligned page ideas' }
  ]
},

'unicorn-coloring-pages': {
  updated: '2026-10-09',
  checked: '9 October 2026',
  title: 'Unicorn Coloring Pages, From Baby Unicorns to Heraldry',
  description: `Generate unicorn coloring pages for toddlers to adults: baby unicorns, winged unicorns, a narwhal and Scotland's heraldic unicorn, with party and naming tips.`,
  eyebrow: 'Unicorn coloring page generator',
  h1: 'Unicorn coloring pages for every age',
  lead: `Ask for the unicorn your child describes, with the mane, wings and setting they want. Below: prompts by age, what to call a unicorn with wings, two real-world unicorns worth coloring, and how to make a page for every party guest.`,
  name: 'unicorn coloring page',
  topic: 'unicorn coloring pages',
  recipesHeading: 'Unicorn prompts by age',
  toolHeading: 'Describe your unicorn',
  defaultStyle: 'simple',
  presetPrompt: 'a baby unicorn with a short horn sitting in a meadow with three big flowers, big simple shapes',
  chips: ['unicorn with a braided mane', 'unicorn and a fox in a forest', 'unicorn sleeping on a cloud', 'unicorn family by a waterfall'],
  recipes: [
    { who: 'Ages 3 to 5', style: 'simple', prompt: 'a baby unicorn with a short horn sitting in a meadow with three big flowers, big simple shapes', why: 'Everything is large enough for crayons.' },
    { who: 'Ages 6 to 9', style: 'medium', prompt: 'a unicorn with a long wavy mane jumping over a rainbow, clouds and stars drawn as outlines', why: 'The rainbow bands and mane give many separate spaces for colors.' },
    { who: 'Ages 6 to 9', style: 'medium', prompt: 'a unicorn with feathered wings flying above a castle on a hill', why: 'Say “with feathered wings” instead of relying on the word alicorn.' },
    { who: 'Ages 10 to 12', style: 'medium', prompt: 'a narwhal swimming under Arctic sea ice with a school of fish', why: 'The real animal that gets compared to a unicorn.' },
    { who: 'Teens and adults', style: 'detailed', prompt: 'a unicorn resting inside a small round fence in a garden full of tiny flowers, in the style of a medieval tapestry', why: 'A dense flower background makes a long, absorbing page.' }
  ],
  sections: [
    { h2: 'What to call a unicorn with wings', blocks: [
      { p: `In fantasy books and fandoms a winged unicorn is usually called an alicorn, sometimes a pegacorn. The older meaning of alicorn is the horn of a unicorn itself (Wiktionary). For the generator, plain words are clearer: “a unicorn with feathered wings”.` }
    ] },
    { h2: 'Unicorns outside the storybook', blocks: [
      { ul: [
        `**Scotland's national animal** is the unicorn, and it first appeared on Scotland's royal coat of arms around the 12th century (scotland.org). Try “a heraldic unicorn standing on its hind legs beside a shield” for an older child or an adult.`,
        `**The narwhal** is the real animal behind the comparison. In males a tooth, normally the left one, grows forward through the front of the jaw into a long spiral tusk (NOAA Fisheries). It makes a good bridge from a unicorn page to an ocean lesson.`
      ] }
    ] },
    { h2: 'Unicorn party pages', blocks: [
      { p: `Make one page per guest: ask each child in advance what their unicorn has (wings or not, a mane style, a pet, a castle) and generate their page. Eight guests take four days on the free plan, or one sitting with Pro.` },
      { p: `To add a name, put it in the prompt (“a banner that says Maya”) and check the spelling on screen. If it comes out wrong, generate the page without the banner and write the name in by hand.` }
    ] }
  ],
  faq: [
    { q: 'What is a unicorn with wings called?', a: `Usually an alicorn or a pegacorn in fantasy fandom; the older meaning of alicorn is the unicorn's horn (Wiktionary). In a prompt, write “unicorn with feathered wings”.` },
    { q: `Why is the unicorn Scotland's national animal?`, a: `It has been a Scottish symbol for centuries, first appearing on the royal coat of arms around the 12th century, and in Celtic mythology it stands for purity and power (scotland.org).` },
    { q: `Can I put my child's name on a unicorn page?`, a: `You can ask for it in the prompt. Check the spelling before you print, and if it is wrong, generate the page without the name and write it in by hand.` },
    { q: 'Are unicorn pages only for young children?', a: `No. On Detailed, ask for a tapestry-style unicorn in a flower garden, a heraldic unicorn, or a unicorn made of zentangle patterns.` },
    { q: 'Can my child color a unicorn page on a tablet?', a: `Download the PNG and open it in any drawing app with a fill tool. The black outlines on white give the fill tool clean edges.` }
  ],
  sources: [
    { text: 'Wiktionary: alicorn', href: 'https://en.wiktionary.org/wiki/alicorn' },
    { text: `Scotland.org: The unicorn, Scotland's national animal`, href: 'https://www.scotland.org/inspiration/what-is-the-national-animal-of-scotland' },
    { text: 'NOAA Fisheries: Narwhal', href: 'https://www.fisheries.noaa.gov/species/narwhal' }
  ],
  cta: `Eight party pages take four days on the free plan. Pro makes up to 150 pages a day, with no watermark, for $9 once.`,
  related: [
    { href: '/princess-coloring-pages', label: 'Princess coloring pages', note: 'princesses your child designs' },
    { href: '/animal-coloring-pages', label: 'Animal coloring pages', note: 'real animals, pets and habitats' },
    { href: '/adult-coloring-pages', label: 'Adult coloring pages', note: 'detailed and bold-and-easy pages' }
  ]
}

};

module.exports = THEME_GUIDES;
