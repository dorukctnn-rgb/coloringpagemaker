// Theme guide pages (rendered by views/theme.ejs).
// Each guide is written for its own theme: prompts by age, the questions people ask about that
// theme, and facts with sources. Inline markup in text: [label](href) and **bold**.
// Facts from outside sources carry a link in `sources`, checked on `checked`.
// `updated` feeds the sitemap <lastmod>; change it whenever the page content changes.

const THEME_GUIDES = {

'halloween-coloring-pages': {
  updated: '2026-10-15',
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
    { href: '/coloring-pages-for-classroom-teachers', label: 'Coloring pages for teachers', note: 'planning pages around a lesson' },
    { href: '/fall-coloring-pages', label: 'Fall coloring pages', note: 'leaves, scarecrows and pumpkin patches' }
  ]
},

'christmas-coloring-pages': {
  updated: '2026-10-27',
  checked: '9 October 2026',
  title: 'Christmas Coloring Pages: Free Printable PDFs, With an Advent Plan',
  description: 'Free printable Christmas coloring pages for toddlers to adults, a 24-day Advent plan that fits the free tier, and ways to print pages as cards or ornaments.',
  eyebrow: 'Christmas coloring page generator',
  h1: 'Christmas coloring pages for kids, with a 24-day Advent plan',
  lead: `Print free Christmas coloring pages for kids and adults, or type a Christmas scene and have it drawn: Santa on a rooftop, a nativity, a snowman in your child's own scarf. Below are prompts by age, an Advent calendar with one page for each day from 1 to 24 December, and ways to print pages as cards and ornaments.`,
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
    { h2: 'Christmas pages by subject', blocks: [
      { p: `The generator above draws any Christmas scene. These guides each add three finished pages to download and facts for that subject:` },
      { ul: [
        `**[Santa coloring pages](/santa-coloring-pages)**: a smiling face for toddlers, Santa with milk and cookies, Santa with his sack in the snow.`,
        `**[Reindeer coloring pages](/reindeer-coloring-pages)**: harness bells, a striped scarf and a stag in a snowy forest.`,
        `**[Christmas tree coloring pages](/christmas-tree-coloring-pages)**: a tree with presents, a garland, and a bare tree to decorate.`,
        `**[Christmas ornament coloring pages](/christmas-ornament-coloring-pages)**: a blank ball to design, a snowflake bauble and three patterned ornaments.`,
        `**[Snowflake coloring pages](/snowflake-coloring-pages)**: four simple snowflakes up to one with fern-like arms.`,
        `**[Christmas coloring pages for adults](/christmas-coloring-pages-for-adults)**: a holly wreath, a village street and an ornament mandala.`,
        `**[Gingerbread](/gingerbread-coloring-pages), [snowman](/snowman-coloring-pages) and [nativity](/nativity-coloring-pages) pages** have guides of their own.`
      ] }
    ] },
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
    { q: 'Are these Christmas coloring pages free to print?', a: `The example pages on this page download as PNG files for personal use, with no account and no watermark. The generator makes 2 free pages a day; its free PDF carries a watermark, and [Pro](https://dorukctn.gumroad.com/l/uynqt) removes it for $9 once.` },
    { q: 'Which Christmas coloring pages suit toddlers?', a: `One large object on Simple: a tree, a stocking, a snowman, a present with a bow. Leave busy scenes until ages 5 or 6.` },
    { q: 'When should I start an Advent coloring calendar?', a: `On the free plan, by 19 November: 24 pages at 2 a day takes 12 days. With Pro you can make all 24 in one sitting.` },
    { q: 'Can I make a nativity scene?', a: `Yes. Name every figure you want (Mary, Joseph, the baby in the manger, shepherds, animals, the star) so the generator includes them all.` },
    { q: 'How do I turn a coloring page into a Christmas card?', a: `Print it at 2 pages per sheet, cut the sheet in half and glue one half to a letter sheet folded in half. Cardstock makes a sturdier card.` },
    { q: 'Are there Christmas coloring pages for adults?', a: `Choose Detailed and ask for pattern-heavy subjects: a wreath, a snowy village street, a patterned bauble, a knitted sweater pattern. [Christmas coloring pages for adults](/christmas-coloring-pages-for-adults) has three detailed examples, and [adult coloring pages](/adult-coloring-pages) has more on detail levels.` }
  ],
  sources: [
    { text: 'St Nicholas Center: Who is St Nicholas? (feast day 6 December)', href: 'https://www.stnicholascenter.org/who-is-st-nicholas' }
  ],
  cta: `Twenty-four Advent pages take 12 days on the free plan. Pro makes them in one sitting, with no watermark and a commercial license, for $9 once.`,
  related: [
    { href: '/halloween-coloring-pages', label: 'Halloween coloring pages', note: 'from cute to spooky' },
    { href: '/animal-coloring-pages', label: 'Animal coloring pages', note: 'reindeer, robins and polar bears' },
    { href: '/adult-coloring-pages', label: 'Adult coloring pages', note: 'intricate wreaths and villages' },
    { href: '/coloring-pages-for-classroom-teachers', label: 'Coloring pages for teachers', note: 'building a year of themed pages' },
    { href: '/winter-coloring-pages', label: 'Winter coloring pages', note: 'snowmen, snow days and polar animals' },
    { href: '/nativity-coloring-pages', label: 'Nativity coloring pages', note: 'the manger, the shepherds and the star' },
    { href: '/santa-coloring-pages', label: 'Santa coloring pages', note: 'a smiling face to a sack in the snow' },
    { href: '/reindeer-coloring-pages', label: 'Reindeer coloring pages', note: 'which reindeer still have antlers in December' },
    { href: '/christmas-tree-coloring-pages', label: 'Christmas tree coloring pages', note: 'a tree to decorate' },
    { href: '/christmas-ornament-coloring-pages', label: 'Christmas ornament coloring pages', note: 'blank baubles to design and cut out' },
    { href: '/snowflake-coloring-pages', label: 'Snowflake coloring pages', note: 'the snow crystal types and a paper snowflake' },
    { href: '/christmas-coloring-pages-for-adults', label: 'Christmas coloring pages for adults', note: 'wreaths, a village street and a mandala' },
    { href: '/elf-coloring-pages', label: 'Elf coloring pages', note: 'tested prompts for a Christmas elf' },
    { href: '/custom-christmas-coloring-book', label: 'Custom Christmas coloring book', note: 'a 12-page homemade gift' }
  ]
},

'dinosaur-coloring-pages': {
  updated: '2026-10-15',
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
  updated: '2026-10-15',
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
  updated: '2026-10-15',
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
  updated: '2026-10-15',
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
    { href: '/coloring-pages-for-classroom-teachers', label: 'Coloring pages for teachers', note: 'subject-aligned page ideas' },
    { href: '/cat-coloring-pages', label: 'Cat coloring pages', note: 'kittens, cozy cats and real breeds' },
    { href: '/dog-coloring-pages', label: 'Dog coloring pages', note: 'puppies and the seven dog groups' },
    { href: '/horse-coloring-pages', label: 'Horse coloring pages', note: 'ponies, foals and galloping horses' },
    { href: '/butterfly-coloring-pages', label: 'Butterfly coloring pages', note: `a monarch's real colors and life cycle` }
  ]
},

'unicorn-coloring-pages': {
  updated: '2026-10-15',
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
},

'fall-coloring-pages': {
  updated: '2026-10-27',
  checked: '15 October 2026',
  title: 'Fall Coloring Pages: Free Printable PDFs for Kids and Adults',
  description: 'Free printable fall coloring pages for kids and adults: leaves and acorns for toddlers, scarecrows and pumpkin patches for kids, harvest scenes for adults.',
  eyebrow: 'Fall coloring page generator',
  h1: 'Fall and autumn coloring pages',
  lead: `Print free fall coloring pages for kids and adults, or describe an autumn scene and print it: one big maple leaf for a toddler, a scarecrow in a pumpkin patch for a first grader, a harvest crate of apples for an adult. Below are prompts by age, a leaf walk that ends in coloring pages, and why leaves turn yellow and red.`,
  name: 'fall coloring page',
  topic: 'fall coloring pages',
  recipesHeading: 'Fall prompts by age',
  toolHeading: 'Describe your fall page',
  defaultStyle: 'simple',
  presetPrompt: `a maple leaf, an oak leaf and an acorn, big simple shapes, no background`,
  chips: ['hedgehog curled up in a pile of leaves', 'squirrel holding an acorn on a branch', 'basket of apples under an apple tree', 'owl on a branch with falling leaves'],
  recipes: [
    { who: 'Ages 2 to 5', style: 'simple', prompt: `a maple leaf, an oak leaf and an acorn, big simple shapes, no background`, why: `Three things children pick up on a walk, each one a single large shape.` },
    { who: 'Ages 6 to 9', style: 'medium', prompt: `a friendly scarecrow in a pumpkin patch with a wheelbarrow of pumpkins and leaves falling, crows drawn as outlines`, why: `A busy farm scene with a friendly face. Outlined crows stay white instead of printing as black shapes.` },
    { who: 'Ages 6 to 9', style: 'medium', prompt: `a hedgehog and a squirrel gathering acorns under an oak tree`, why: `Two animals getting ready for winter, which gives a science lesson something to color.` },
    { who: 'Ages 9 to 12', style: 'medium', prompt: `five different tree leaves in a row: maple, oak, ginkgo, birch and sweetgum, each with an empty label box under it`, why: `A leaf identification sheet. Children write the names in the boxes, so the generator never has to spell them.` },
    { who: 'Teens and adults', style: 'medium', prompt: `a wooden crate full of apples with pumpkins, gourds and maple leaves around it, clean bold outlines`, why: `A harvest still life with dozens of separate shapes to fill.` }
  ],
  sections: [
    { h2: 'Fall pages by age', blocks: [
      { table: { head: ['Ages', 'Subjects that work', 'Level'], rows: [
        ['2 to 5', 'one leaf, an acorn, a pumpkin, an apple', 'Simple'],
        ['6 to 9', 'scarecrows, pumpkin patches, animals storing food', 'Medium'],
        ['9 to 12', 'leaf identification sheets, orchards, a hayride', 'Medium'],
        ['Teens and adults', 'harvest still lifes, porches, leaf mandalas', 'Medium']
      ] } },
      { p: `Fall pages also bridge the season's holidays. Pumpkins without faces work from September to the end of November, while [Halloween pages](/halloween-coloring-pages) and [Thanksgiving pages](/thanksgiving-coloring-pages) each have their own few weeks.` }
    ] },
    { h2: 'A leaf walk that ends in coloring pages', blocks: [
      { p: `Collecting leaves gives children a reason to look closely before they color.` },
      { ul: [
        `**Collect.** On a walk, each child picks three or four leaves of different shapes. Flat, dry leaves keep best.`,
        `**Match.** Print the leaf identification prompt above, let children find their leaves on the sheet and write the names in the boxes.`,
        `**Color from life.** Lay the real leaves next to the page and copy their colors, including the spots and the edges that turned first.`,
        `**Rub.** Very young children can put a leaf under thin paper and rub a crayon over it, then color a page of the same leaf.`
      ] }
    ] },
    { h2: 'Why leaves turn yellow, orange and red', blocks: [
      { p: `Leaves are green because of chlorophyll. Before they fall, trees break the chlorophyll down and take back much of the nitrogen in it. Yellow and orange pigments, the carotenoids, are in the leaf too, and some of them stay after the green has gone. Red is different: it comes from anthocyanins, which many trees make just before their leaves fall. At the Harvard Forest in Massachusetts, about 70 percent of the shrubs and trees produce them (Harvard Forest).` },
      { p: `That makes a good coloring lesson: hand out only yellow and orange first, then add red and purple once children have heard where those colors come from.` }
    ] },
    { h2: 'When fall starts and ends', blocks: [
      { p: `Weather forecasters count fall as September, October and November. Astronomers start it at the September equinox, when the sun passes directly over the equator, and end it at the winter solstice in December (NOAA). Either way, fall pages stay in season until December, when [winter coloring pages](/winter-coloring-pages) take over.` }
    ] }
  ],
  faq: [
    { q: 'Are these fall coloring pages free to print?', a: `The example pages on this page download as PNG files for personal use, with no account and no watermark. The generator makes 2 free pages a day; its free PDF carries a watermark, and [Pro](https://dorukctn.gumroad.com/l/uynqt) removes it for $9 once.` },
    { q: 'Which fall coloring pages suit toddlers?', a: `One large object on Simple: a maple leaf, an acorn, a pumpkin or an apple. Leave scarecrows and pumpkin patches until ages 5 or 6, when children can stay inside smaller shapes.` },
    { q: 'Is there a difference between fall and autumn coloring pages?', a: `No. “Fall” is the usual word in the United States and “autumn” in Britain. Both work in a prompt, and the pages come out the same.` },
    { q: 'Can I make fall coloring pages for adults?', a: `Yes. Ask for a scene with many separate shapes, such as a harvest crate of apples and gourds, a porch with pumpkins, or a mandala made of oak and maple leaves. See [adult coloring pages](/adult-coloring-pages) for paper and detail tips.` },
    { q: 'How do I print a fall page without a gray sky?', a: `Describe the weather as outlines: “clouds drawn as outlines”, “leaves falling, drawn in outline”. Words such as dusk, sunset or silhouette pull the generator toward dark areas.` },
    { q: 'Can I sell fall coloring pages I make here?', a: `With Pro, yes: it includes commercial use. Our [Etsy guide](/sell-coloring-books-on-etsy) covers fees, file limits and Etsy's rule that AI-made items must say so.` }
  ],
  sources: [
    { text: 'Harvard Forest: The process of leaf color change', href: 'https://harvardforest.fas.harvard.edu/leaf-process' },
    { text: 'NOAA NCEI: Meteorological versus astronomical seasons', href: 'https://www.ncei.noaa.gov/news/meteorological-versus-astronomical-seasons' }
  ],
  cta: `One leaf sheet photocopied covers a class, but 24 different autumn scenes take 12 days on the free plan. Pro makes them in one sitting, with no watermark and a commercial license, for $9 once.`,
  related: [
    { href: '/thanksgiving-coloring-pages', label: 'Thanksgiving coloring pages', note: 'pies, cornucopias and a thankful tree' },
    { href: '/turkey-coloring-pages', label: 'Turkey coloring pages', note: 'cartoon, realistic or without feathers' },
    { href: '/halloween-coloring-pages', label: 'Halloween coloring pages', note: 'from cute to spooky' },
    { href: '/coloring-pages-for-classroom-teachers', label: 'Coloring pages for teachers', note: 'planning pages around a lesson' },
    { href: '/thankful-coloring-pages', label: 'Thankful coloring pages', note: 'five fill-in activities for kids' },
    { href: '/turkey-disguise-template', label: 'Turkey disguise template', note: 'a plain turkey and 18 disguise ideas' }
  ]
},

'thanksgiving-coloring-pages': {
  updated: '2026-10-27',
  checked: '27 October 2026',
  title: 'Thanksgiving Coloring Pages: Free Printable for Kids and Adults',
  description: 'Free printable Thanksgiving coloring pages for kids and adults: pumpkin pie for toddlers, a cornucopia for kids, a dinner table for adults, and a thankful tree.',
  eyebrow: 'Thanksgiving coloring page generator',
  h1: 'Thanksgiving coloring pages for kids and adults',
  lead: `Print free Thanksgiving coloring pages for kids and adults, or describe a Thanksgiving page and print it: a pumpkin pie for a toddler, a cornucopia for a first grader, a whole dinner table for an adult. Thanksgiving falls on Thursday 26 November 2026. Below are prompts by age, a plan for the kids' table, a thankful tree, what happened at the 1621 harvest and what the Pilgrims wore.`,
  name: 'Thanksgiving coloring page',
  topic: 'Thanksgiving coloring pages',
  recipesHeading: 'Thanksgiving prompts by age',
  toolHeading: 'Describe your Thanksgiving page',
  defaultStyle: 'simple',
  presetPrompt: `a pumpkin pie on a plate with one slice cut out, big simple shapes, no background`,
  chips: ['basket of corn, squash and apples', 'turkey in a pumpkin patch', 'harvest wagon with hay bales', 'apple pie cooling on a windowsill'],
  recipes: [
    { who: 'Ages 2 to 5', style: 'simple', prompt: `a pumpkin pie on a plate with one slice cut out, big simple shapes, no background`, why: `One food every child at the table knows, in a few large shapes.` },
    { who: 'Ages 6 to 9', style: 'medium', prompt: `a cornucopia overflowing with pumpkins, apples, corn, pears and grapes`, why: `The horn of plenty is full of separate fruits, so a child can color it one piece at a time.` },
    { who: 'Ages 6 to 9', style: 'medium', prompt: `a harvest wagon full of pumpkins, corn and hay bales on a farm road, clean bold outlines`, why: `A farm scene with no people, which keeps the page about the harvest.` },
    { who: 'Class activity', style: 'simple', prompt: `a bare tree with a thick trunk and ten empty leaf shapes on its branches, big simple shapes, no background`, why: `A thankful tree: each child writes one thing they are thankful for in a leaf (see below).` },
    { who: 'History lesson', style: 'medium', prompt: `a Pilgrim family in plain wool coats, linen caps and wide-brimmed felt hats standing beside a pumpkin patch, clean bold outlines`, why: `Everyday clothes from the colony, which a child can color in many colors (see below).` },
    { who: 'Teens and adults', style: 'medium', prompt: `a Thanksgiving table with a roast turkey on a platter, a pumpkin pie and a bowl of corn, clean bold outlines, no people`, why: `A full table gives adults dishes, textures and table linen to fill.` }
  ],
  sections: [
    { h2: `Coloring pages for the kids' table`, blocks: [
      { p: `A coloring page at each place keeps younger guests busy while the food is carved and passed. Plan it like the seating:` },
      { ul: [
        `**One page per child, by age.** A pie or a single turkey for the under-fives, a cornucopia or a harvest wagon for six- to nine-year-olds.`,
        `**Tape it down.** A piece of tape at two corners stops the page from sliding, and it works as a place card if you write the child's name at the top.`,
        `**Start a few days early.** Eight different pages take four days on the free plan (2 a day). Or make one page and photocopy it.`
      ] }
    ] },
    { h2: 'A thankful tree for a class or a family', blocks: [
      { p: `Print the bare tree with empty leaves from the prompts above. Each child writes or draws one thing they are thankful for in a leaf, then colors the tree. For a class display, give every child a copy and pin the trees up together. For a family, pass one copy around the table and let everyone fill a leaf.` }
    ] },
    { h2: 'What happened in 1621', blocks: [
      { p: `In the fall of 1621, after their first harvest, the English colonists at Plymouth held a harvest celebration. Massasoit, a leader of the Wampanoag, came with about 90 of his men, and they joined the English for three days of feasting and entertainment. It took place sometime between 21 September and 9 November 1621, and only in the 19th century did it become known as the “First Thanksgiving” (Plimoth Patuxet Museums).` },
      { p: `For a history lesson, a page of the harvest itself, with corn, squash and beans, teaches more than a page of costumes.` }
    ] },
    { h2: 'What the Pilgrims wore', blocks: [
      { p: `A Pilgrim page does not have to be black and white. Plimoth Patuxet Museums notes that in the 1620s people's best clothes were often black, and that portraits were painted of people in their best clothes. Black dye was costly, though, so everyday clothes were made in many colors.` },
      { p: `Everyone wore something on the head: men and boys wore wool caps or felt hats, and women wore linen caps under felt hats. The felt hats had wide brims to shade the face from the sun and keep it dry (Plimoth Patuxet Museums). The Pilgrim prompt above asks for exactly those clothes.` }
    ] },
    { h2: 'Why it is always a Thursday in November', blocks: [
      { p: `President Lincoln's 1863 proclamation made Thanksgiving a yearly holiday on the last Thursday of November. In 1941 Congress fixed it on the fourth Thursday instead, because some Novembers have five Thursdays (National Archives). In 2026 that is Thursday 26 November, a federal holiday in the United States (OPM).` }
    ] }
  ],
  faq: [
    { q: 'What did the Pilgrims wear?', a: `Wool caps or felt hats for men and boys, linen caps under felt hats for women, and everyday clothes in many colors, because black dye was costly (Plimoth Patuxet Museums). Use the Pilgrim prompt above to draw them.` },
    { q: 'Are there Thanksgiving coloring pages for adults?', a: `Choose Medium or Detailed and ask for a full dinner table, a cornucopia with detailed fruit and vines, or a page of overlapping autumn leaves. For more detail levels see [adult coloring pages](/adult-coloring-pages).` },
    { q: 'Are these Thanksgiving coloring pages free to print?', a: `The example pages on this page download as PNG files for personal use, with no account and no watermark. The generator makes 2 free pages a day; its free PDF carries a watermark, and [Pro](https://dorukctn.gumroad.com/l/uynqt) removes it for $9 once.` },
    { q: 'When is Thanksgiving in 2026?', a: `In the United States, on Thursday 26 November 2026. It is always the fourth Thursday of November (National Archives, OPM).` },
    { q: 'Which Thanksgiving coloring pages suit toddlers?', a: `One large object on Simple: a pumpkin pie, a single pumpkin, an apple or a [cartoon turkey](/turkey-coloring-pages). Leave full tables and cornucopias for children of 6 and up.` },
    { q: 'Can I make Thanksgiving pages for church or Sunday school?', a: `Yes. Describe the scene, for example a harvest of wheat sheaves, grapes and bread, and write the verse in by hand. The generator draws pictures and cannot be relied on to spell words.` },
    { q: `How many pages do I need for the kids' table?`, a: `One per child plus two spare. The free plan makes two different pages a day, so start four days ahead for eight children, or photocopy one design.` },
    { q: 'Can I sell Thanksgiving coloring pages I make here?', a: `With Pro, yes: it includes commercial use. Leave cartoon and film characters out of anything you sell. Our [Etsy guide](/sell-coloring-books-on-etsy) covers fees and Etsy's rules for AI-made items.` }
  ],
  sources: [
    { text: 'OPM: Federal holidays (2026 schedule)', href: 'https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/' },
    { text: 'National Archives: Congress establishes Thanksgiving', href: 'https://www.archives.gov/legislative/features/thanksgiving' },
    { text: 'Plimoth Patuxet Museums: Thanksgiving history', href: 'https://plimoth.org/for-students/homework-help/thanksgiving-history' },
    { text: 'Plimoth Patuxet Museums: What to wear', href: 'https://plimoth.org/for-students/homework-help/what-to-wear' }
  ],
  cta: `A different page for each of eight children takes four days on the free plan. Pro makes up to 150 pages a day with no watermark and a commercial license, for $9 once.`,
  related: [
    { href: '/turkey-coloring-pages', label: 'Turkey coloring pages', note: 'cartoon, realistic or without feathers' },
    { href: '/fall-coloring-pages', label: 'Fall coloring pages', note: 'leaves, scarecrows and pumpkin patches' },
    { href: '/christmas-coloring-pages', label: 'Christmas coloring pages', note: 'with a 24-day Advent plan' },
    { href: '/coloring-pages-for-classroom-teachers', label: 'Coloring pages for teachers', note: 'planning pages around a lesson' },
    { href: '/turkey-disguise-template', label: 'Turkey disguise template', note: 'a plain turkey and 18 disguise ideas' },
    { href: '/thankful-coloring-pages', label: 'Thankful coloring pages', note: 'five fill-in activities for kids' }
  ]
},

'turkey-coloring-pages': {
  updated: '2026-10-27',
  checked: '15 October 2026',
  title: 'Turkey Coloring Pages: Free Printable PDFs for Kids and Adults',
  description: 'Free printable turkey coloring pages for kids and adults: a cartoon turkey for toddlers, a turkey without feathers for the craft, a wild turkey for older kids.',
  eyebrow: 'Turkey coloring page generator',
  h1: 'Turkey coloring pages, with or without feathers',
  lead: `Print free turkey coloring pages for kids and adults, or make one for any age: a round cartoon turkey for preschool, a turkey body without tail feathers for the add-your-own-feathers craft, or a wild turkey strutting with its tail fanned. Below are prompts, the feather craft step by step and a few true facts about wild turkeys.`,
  name: 'turkey coloring page',
  topic: 'turkey coloring pages',
  recipesHeading: 'Turkey prompts by age',
  toolHeading: 'Describe your turkey page',
  defaultStyle: 'simple',
  presetPrompt: `a smiling cartoon turkey with a big fan of rounded tail feathers, big simple shapes, black outlines only, no background`,
  chips: ['turkey wearing a scarf and boots', 'mother turkey with three chicks', 'turkey hiding behind a pumpkin', 'turkey in a pumpkin patch'],
  recipes: [
    { who: 'Ages 2 to 5', style: 'simple', prompt: `a smiling cartoon turkey with a big fan of rounded tail feathers, big simple shapes, black outlines only, no background`, why: `Each tail feather is one big shape, so even a three-year-old can give every feather its own color.` },
    { who: 'Fill-in feathers', style: 'simple', prompt: `a smiling cartoon turkey with six big empty feathers fanned out behind it, each feather a plain blank shape, big simple shapes, no background`, why: `Every feather is an empty shape for a word, a drawing or a color. For a bare turkey body to add paper feathers to, use the example on this page: the generator draws a tail even when you ask for none.` },
    { who: 'Ages 6 to 9', style: 'medium', prompt: `a mother turkey and three chicks walking through tall grass, clean bold outlines`, why: `A family scene, and a chance to show that a turkey hen looks quite different from a male.` },
    { who: 'Ages 9 to 12', style: 'medium', prompt: `a wild turkey strutting on grass with its tail feathers fanned out, each feather a separate outline, clean bold lines, white background`, why: `Closer to the real bird, with every feather drawn as its own shape.` },
    { who: 'Teens and adults', style: 'medium', prompt: `a wild turkey at the edge of a forest in autumn, each feather on its wings and fanned tail drawn as a separate outline, clean bold lines`, why: `Hundreds of feathers to fill with bronze, copper and brown.` }
  ],
  sections: [
    { h2: 'The add-your-own-feathers turkey', blocks: [
      { p: `Many families and classes make a turkey in November by starting from a bare turkey body and adding the feathers themselves. The page without feathers above is made for that.` },
      { ul: [
        `**Paper feathers.** Cut feather shapes from colored paper and glue them in a fan behind the body.`,
        `**Handprint feathers.** Trace each child's hand on colored paper, cut the hands out and use the fingers as feathers.`,
        `**Thankful feathers.** Write one thing to be thankful for on each feather before gluing it on. It pairs well with the [thankful tree](/thanksgiving-coloring-pages).`,
        `**Disguise a turkey.** Some schools send home a turkey to disguise as something else, so it will not be eaten at Thanksgiving. Start from the same page, printed at full size, and dress it as a pumpkin, a firefighter or a scarecrow.`
      ] }
    ] },
    { h2: 'Cartoon or realistic', blocks: [
      { table: { head: ['Style', 'Words to use', 'Ages'], rows: [
        ['Cartoon', 'smiling, round, big tail feathers, simple shapes', '2 to 6'],
        ['Storybook', 'turkey family, pumpkin patch, scarf and boots', '5 to 9'],
        ['Realistic', 'wild turkey, strutting, each feather as a separate outline', '9 and up']
      ] } },
      { p: `For realistic pages, ask for each feather “as a separate outline”. Words such as texture or shading pull the drawing toward gray strokes that print muddy.` }
    ] },
    { h2: 'Wild turkey facts for the classroom', blocks: [
      { ul: [
        `Turkeys are native to North America. Indigenous people in southern Mexico and Central America domesticated them about 2,000 years ago (Missouri Department of Conservation).`,
        `Adult males have a bare red and blue head with red wattles on the throat and neck, and bronze, shiny feathers. Males, and some females, have a tuft of hairlike feathers on the breast called a beard.`,
        `In spring, males gobble and strut for females, spreading their tails like a peacock. In winter, turkeys gather in flocks.`
      ] },
      { p: `Those colors make a good color-by-fact page: red and blue for the head, bronze and copper for the feathers, and a dark tuft for the beard.` }
    ] }
  ],
  faq: [
    { q: 'Are these turkey coloring pages free to print?', a: `The example pages on this page download as PNG files for personal use, with no account and no watermark. The generator makes 2 free pages a day; its free PDF carries a watermark, and [Pro](https://dorukctn.gumroad.com/l/uynqt) removes it for $9 once.` },
    { q: 'Where can I get a turkey coloring page without feathers?', a: `Download the example on this page. The generator tends to draw a full fan of tail feathers even when you ask for none: we asked six times on 29 October 2026 and every page had a tail. For feathers that are empty shapes to fill in, use the fill-in feathers prompt above.` },
    { q: 'Which turkey pages suit toddlers?', a: `A cartoon turkey on Simple with a few big tail feathers. Leave realistic turkeys for older children: the feathers are too small to color at this age.` },
    { q: `What is the red part on a turkey's head?`, a: `The red flaps of skin on the throat and neck are wattles. The head itself is bare skin, red and blue on an adult male (Missouri Department of Conservation).` },
    { q: 'Can I make a page for a disguise-a-turkey project?', a: `Yes. Print the turkey without feathers at full size so there is room for the disguise, and make a second copy if your child wants to try two ideas.` },
    { q: 'Can I sell turkey coloring pages I make here?', a: `With Pro, yes: it includes commercial use. Our [Etsy guide](/sell-coloring-books-on-etsy) covers fees, file limits and Etsy's rule that AI-made items must say so.` }
  ],
  sources: [
    { text: 'Missouri Department of Conservation: Wild turkey', href: 'https://mdc.mo.gov/discover-nature/field-guide/wild-turkey' }
  ],
  cta: `One turkey photocopied covers a class, but six different turkeys for six tables take three days on the free plan. Pro makes them in one sitting, with no watermark and a commercial license, for $9 once.`,
  related: [
    { href: '/thanksgiving-coloring-pages', label: 'Thanksgiving coloring pages', note: 'pies, cornucopias and a thankful tree' },
    { href: '/fall-coloring-pages', label: 'Fall coloring pages', note: 'leaves, scarecrows and pumpkin patches' },
    { href: '/animal-coloring-pages', label: 'Animal coloring pages', note: 'real animals, pets and habitats' },
    { href: '/coloring-pages-for-classroom-teachers', label: 'Coloring pages for teachers', note: 'planning pages around a lesson' },
    { href: '/turkey-disguise-template', label: 'Turkey disguise template', note: 'a plain turkey and 18 disguise ideas' }
  ]
},

'winter-coloring-pages': {
  updated: '2026-10-27',
  checked: '15 October 2026',
  title: 'Winter Coloring Pages: Free Printable PDFs for Kids and Adults',
  description: 'Free printable winter coloring pages for kids and adults: snowmen for toddlers, sledding hills and polar bear cubs for kids, snowflake patterns for adults.',
  eyebrow: 'Winter coloring page generator',
  h1: 'Winter coloring pages for kids and adults',
  lead: `Print free winter coloring pages for kids and adults, or describe a winter scene and print it: a snowman for a toddler, a polar bear cub sliding down a hill for a first grader, a six-sided snowflake pattern for an adult. Below are prompts by age, a snow-day plan, why snowflakes have six sides and why polar bears never meet penguins.`,
  name: 'winter coloring page',
  topic: 'winter coloring pages',
  recipesHeading: 'Winter prompts by age',
  toolHeading: 'Describe your winter page',
  defaultStyle: 'simple',
  presetPrompt: `a smiling snowman with a scarf, a top hat and stick arms, big simple shapes, no background`,
  chips: ['mittens, a wool hat and a scarf', 'mug of hot cocoa with marshmallows', 'penguin family on the ice', 'cardinal on a snowy branch'],
  recipes: [
    { who: 'Ages 2 to 5', style: 'simple', prompt: `a smiling snowman with a scarf, a top hat and stick arms, big simple shapes, no background`, why: `Three circles and a hat: the first winter page most children can color on their own.` },
    { who: 'Ages 2 to 5', style: 'simple', prompt: `a pair of mittens, a wool hat and a scarf, big simple shapes, no background`, why: `Clothes children wear every day, so they can copy their own colors.` },
    { who: 'Ages 6 to 9', style: 'medium', prompt: `a polar bear cub sliding down a snowy slope with pine trees behind it, snowflakes drawn as outlines, clean bold lines`, why: `A playful animal and a whole landscape, with the snowflakes kept as outlines so the sky stays white.` },
    { who: 'Ages 9 to 12', style: 'medium', prompt: `a log cabin in a snowy pine forest with smoke curling from the chimney, clean bold outlines`, why: `A quiet scene of logs, snow and trees that takes longer to color.` },
    { who: 'Teens and adults', style: 'medium', prompt: `a large snowflake with six identical arms made of simple geometric shapes, bold clean lines, white background`, why: `A winter mandala: six identical arms for anyone who likes symmetrical patterns.` }
  ],
  sections: [
    { h2: 'A snow-day plan', blocks: [
      { p: `When school is called off, a short plan keeps the day from turning into one long screen session. Make the pages the night before: two on the free plan, or the whole set with Pro.` },
      { ul: [
        `**Morning:** a snowman page for the youngest and a cabin or polar bear scene for older children.`,
        `**After lunch:** go outside, then color a page of what you saw: tracks in the snow, a bird at the feeder, the snowman you built.`,
        `**Afternoon:** a snowflake pattern to color slowly, with a mug of cocoa.`
      ] }
    ] },
    { h2: 'Why snowflakes have six sides', blocks: [
      { p: `Every snowflake is a crystal of ice. As water freezes, its molecules bond into six-sided rings, and that hexagonal pattern carries on as the crystal grows, which is why snowflakes have six sides or six arms (Smithsonian Magazine). That gives a quick lesson for a snowflake page: count the arms before coloring, and color the same part of every arm the same way.` }
    ] },
    { h2: 'Polar bears and penguins never meet', blocks: [
      { p: `Polar bears live on the sea ice of the Arctic, where they hunt seals (Polar Bears International). Penguins are found only in the Southern Hemisphere, most of them on Antarctic coasts and islands (Australian Antarctic Program). A page with a polar bear and a penguin side by side shows a pair that only meets in zoos and picture books.` },
      { p: `For a science lesson, make two pages, one Arctic and one Antarctic, and let children sort the animals: polar bears, walruses and Arctic foxes on one, penguins on the other.` }
    ] },
    { h2: 'Winter pages after the holidays', blocks: [
      { p: `Weather forecasters count winter as December, January and February (NOAA), so snowmen, mittens and snow days stay in season long after the [Christmas pages](/christmas-coloring-pages) are put away. Pages without Christmas symbols also suit classrooms where not every child celebrates it.` }
    ] }
  ],
  faq: [
    { q: 'Are these winter coloring pages free to print?', a: `The example pages on this page download as PNG files for personal use, with no account and no watermark. The generator makes 2 free pages a day; its free PDF carries a watermark, and [Pro](https://dorukctn.gumroad.com/l/uynqt) removes it for $9 once.` },
    { q: 'Which winter coloring pages suit toddlers?', a: `One large object on Simple: a snowman, a mitten, a hat or a mug of cocoa. Leave forests and busy snow scenes until children can stay inside smaller shapes, around age 5.` },
    { q: 'How do I keep a snowy night page from printing black?', a: `Describe the night as outlines: “moon and stars drawn as outlines”, “snowflakes drawn as outlines”. Words such as dark night or silhouette push the page toward large black areas.` },
    { q: 'Can I make winter pages without Christmas?', a: `Yes. Snowmen, mittens, sledding, cabins and polar animals have nothing to do with the holiday, which makes them easy to use in mixed classrooms and in January and February.` },
    { q: 'Can I make winter coloring pages for adults?', a: `Yes. Ask for a snowflake with six identical arms made of geometric shapes, a cabin in a snowy forest, or a winter bird on a branch with each feather outlined. See [adult coloring pages](/adult-coloring-pages) for paper tips.` },
    { q: 'Can I sell winter coloring pages I make here?', a: `With Pro, yes: it includes commercial use. Our [Etsy guide](/sell-coloring-books-on-etsy) covers fees, file limits and Etsy's rule that AI-made items must say so.` }
  ],
  sources: [
    { text: 'Smithsonian Magazine: Snowflakes always have six sides', href: 'https://www.smithsonianmag.com/smart-news/snowflakes-may-have-different-designs-but-they-always-have-six-sides-172052136/' },
    { text: 'Polar Bears International: Polar bear facts', href: 'https://polarbearsinternational.org/polar-bears-changing-arctic/polar-bear-facts/' },
    { text: 'Australian Antarctic Program: Penguins', href: 'https://www.antarctica.gov.au/about-antarctica/animals/penguins/' },
    { text: 'NOAA NCEI: Meteorological versus astronomical seasons', href: 'https://www.ncei.noaa.gov/news/meteorological-versus-astronomical-seasons' }
  ],
  cta: `A snow-day set of five pages takes three days on the free plan. Pro makes up to 150 pages a day with no watermark and a commercial license, for $9 once.`,
  related: [
    { href: '/christmas-coloring-pages', label: 'Christmas coloring pages', note: 'with a 24-day Advent plan' },
    { href: '/animal-coloring-pages', label: 'Animal coloring pages', note: 'polar bears, penguins and pets' },
    { href: '/adult-coloring-pages', label: 'Adult coloring pages', note: 'detailed and bold-and-easy pages' },
    { href: '/coloring-pages-for-classroom-teachers', label: 'Coloring pages for teachers', note: 'planning pages around a lesson' },
    { href: '/snowman-coloring-pages', label: 'Snowman coloring pages', note: 'snow families, forest friends and snow science' },
    { href: '/snowflake-coloring-pages', label: 'Snowflake coloring pages', note: 'the snow crystal types and a paper snowflake' },
    { href: '/reindeer-coloring-pages', label: 'Reindeer coloring pages', note: 'which reindeer still have antlers in December' }
  ]
},

'nativity-coloring-pages': {
  updated: '2026-10-15',
  checked: '15 October 2026',
  title: 'Nativity Coloring Pages: Free Printables and a Generator',
  description: 'Free printable nativity coloring pages and a generator for more: the baby in the manger for toddlers, shepherds and the star for kids, a full stable scene for Sunday school.',
  eyebrow: 'Nativity coloring page generator',
  h1: 'Nativity coloring pages for home, church and Sunday school',
  lead: `Describe a nativity page and print it: the baby asleep in the manger for a toddler, a shepherd and his sheep for a first grader, the whole stable for a Sunday school class. Christmas Day falls on Friday 25 December 2026. Below are prompts by age, the story in six pages, and where the ox, the donkey and the three kings come from.`,
  name: 'nativity coloring page',
  topic: 'nativity coloring pages',
  recipesHeading: 'Nativity prompts by age',
  toolHeading: 'Describe your nativity page',
  defaultStyle: 'simple',
  presetPrompt: `baby Jesus asleep in a wooden manger filled with hay, a bright star above, big simple shapes, no background`,
  chips: ['donkey, ox and sheep beside an empty manger', 'shepherd with a staff and two sheep under a star', 'angel with wide wings above a stable', 'three wise men carrying gifts, seen from a distance'],
  recipes: [
    { who: 'Ages 2 to 5', style: 'simple', prompt: `baby Jesus asleep in a wooden manger filled with hay, a bright star above, big simple shapes, no background`, why: `One gentle figure, the hay and a star: the story on a single page.` },
    { who: 'Ages 3 to 6', style: 'simple', prompt: `the stable at Bethlehem with an empty manger full of hay, a donkey, an ox and a sheep, a star above the roof, big simple shapes`, why: `Animals young children can name, each one a large shape to color.` },
    { who: 'Ages 6 to 9', style: 'medium', prompt: `shepherds with their sheep on a hillside at night, an angel above them, moon and stars drawn as outlines`, why: `Luke's Gospel puts the shepherds in the fields at night (Luke 2:8). Outlined stars keep the sky white.` },
    { who: 'Sunday school', style: 'medium', prompt: `a nativity scene in a stable: Mary and Joseph beside baby Jesus in the manger, a donkey, an ox, two shepherds with a lamb and a star above the roof, gentle faces, clean bold outlines`, why: `Every figure is named, so none is left out. Look at the faces on screen before you print a class set.` },
    { who: 'Ages 9 and up', style: 'medium', prompt: `three wise men on camels crossing the desert toward a bright star, seen from a distance, clean bold outlines, white sky`, why: `Figures seen from a distance have small, simple faces, and the camels and dunes give older children plenty to color.` }
  ],
  sections: [
    { h2: 'The story in six pages', blocks: [
      { p: `The nativity story comes from two Gospels. Luke tells of the journey to Bethlehem, the manger and the shepherds (Luke 2), and Matthew of the star, the magi and their gifts (Matthew 2). These six scenes follow both in order. Choose one to put it in the generator, on Simple for younger children and Medium for older ones.` },
      { groups: [
        { title: 'From Luke 2', start: 1, items: ['Mary and Joseph on the road to Bethlehem', 'baby Jesus wrapped in cloth, asleep in a manger of hay', 'shepherds and their sheep in a field at night, an angel above them', 'shepherds visiting the baby in the manger, with Mary and Joseph'] },
        { title: 'From Matthew 2', start: 5, items: ['wise men following a bright star', 'wise men offering gifts of gold, frankincense and myrrh'] }
      ] },
      { p: `Six pages take three days on the free plan (2 a day), so a family can start on a weekend in December and finish well before Christmas. For one page a day from 1 to 24 December, use the Advent plan on the [Christmas coloring pages](/christmas-coloring-pages).` }
    ] },
    { h2: 'Where the ox and the donkey come from', blocks: [
      { p: `Neither Luke nor Matthew mentions an ox or a donkey in the nativity story. Luke says that Mary wrapped the baby in swaddling clothes and laid him in a manger, “because there was no room for them in the inn” (Luke 2:7), and a manger is a feeding trough for animals (USCCB notes on Luke 2).` },
      { p: `The animals came into the scene through Saint Francis of Assisi. For Christmas 1223 he prepared a nativity scene in Greccio, a small town in Italy, and when he arrived he “found a manger full of hay, an ox and a donkey”. There were no statues: the people who were there enacted the scene themselves. Pope Francis tells the story in his 2019 letter on the nativity scene, and adds that its Italian name, presepe, comes from the Latin praesepium, meaning manger (Admirabile signum).` }
    ] },
    { h2: 'Three gifts, and how many wise men?', blocks: [
      { p: `Matthew writes that magi from the east followed a star to the place where the child was and, on entering the house, offered him gifts of gold, frankincense and myrrh (Matthew 2:9 to 11). He names three gifts but does not say how many magi there were. Old Testament verses later led readers to think of them as kings (USCCB notes on Matthew 2), and Pope Francis's letter speaks of placing the statues of the Three Kings in the crèche as the feast of Epiphany approaches.` },
      { p: `That makes a good question for a class to color around: draw the three gifts on one page, and ask the children how many visitors they think brought them.` }
    ] },
    { h2: 'Keep the faces gentle', blocks: [
      { p: `When we made the examples on this page, the faces were what most often went wrong. On a nativity page they matter most, so a few habits help:` },
      { ul: [
        `Add “gentle faces” or “peaceful faces” to any prompt with people in it.`,
        `For scenes with many people, ask for figures “seen from a distance”, so each face is small and simple.`,
        `Look at every face on screen before you print. If one looks odd, generate the page again rather than printing it for a class.`
      ] }
    ] }
  ],
  faq: [
    { q: 'Which nativity coloring pages suit toddlers?', a: `One figure or one object on Simple: the baby in the manger, a sheep, a donkey or the star. Leave the full stable with many figures until ages 5 or 6.` },
    { q: 'Do the Gospels mention the ox and the donkey?', a: `Not in the nativity story. Luke tells of the manger and the shepherds, and Matthew of the star, the magi and their gifts. The ox and the donkey come from tradition: they were part of the nativity scene Saint Francis prepared at Greccio in 1223 (Admirabile signum).` },
    { q: 'How many wise men were there?', a: `Matthew's Gospel does not say. It names three gifts, gold, frankincense and myrrh (Matthew 2:11), and later tradition speaks of three kings.` },
    { q: 'How do I add a Bible verse to a nativity page?', a: `Print the page and write the verse by hand, or add it in a document before printing. The generator draws pictures and cannot be relied on to spell words.` },
    { q: 'Can I sell nativity coloring pages I make here?', a: `With Pro, yes: it includes commercial use. Our [Etsy guide](/sell-coloring-books-on-etsy) covers fees, file limits and Etsy's rule that AI-made items must say so.` }
  ],
  sources: [
    { text: 'USCCB: Luke, chapter 2, with notes', href: 'https://bible.usccb.org/bible/luke/2' },
    { text: 'USCCB: Matthew, chapter 2, with notes', href: 'https://bible.usccb.org/bible/matthew/2' },
    { text: 'Vatican: Apostolic Letter Admirabile signum on the nativity scene (1 December 2019)', href: 'https://www.vatican.va/content/francesco/en/apost_letters/documents/papa-francesco-lettera-ap_20191201_admirabile-signum.html' },
    { text: 'OPM: Federal holidays (2026 schedule)', href: 'https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/' }
  ],
  cta: `Six nativity pages take three days on the free plan. Pro makes them in one sitting, with no watermark and a commercial license, for $9 once.`,
  related: [
    { href: '/christmas-coloring-pages', label: 'Christmas coloring pages', note: 'with a 24-day Advent plan' },
    { href: '/gingerbread-coloring-pages', label: 'Gingerbread coloring pages', note: 'gingerbread men, houses and cookies' },
    { href: '/winter-coloring-pages', label: 'Winter coloring pages', note: 'snowmen, snow days and polar animals' },
    { href: '/coloring-pages-for-classroom-teachers', label: 'Coloring pages for teachers', note: 'planning pages around a lesson' }
  ]
},

'new-year-coloring-pages': {
  updated: '2026-10-27',
  checked: '15 October 2026',
  title: 'New Year Coloring Pages: Free Printable PDFs for Kids and Adults',
  description: 'Free printable New Year coloring pages for kids and adults: party hats for toddlers, fireworks and a countdown clock for kids, and a goals page for January.',
  eyebrow: 'New Year coloring page generator',
  h1: `New Year coloring pages for kids, New Year's Eve and January`,
  lead: `Print free New Year coloring pages for kids and adults, or describe a New Year page and print it: a party hat and balloons for a toddler, fireworks over a row of houses for a first grader, a countdown clock for an older child. New Year's Day falls on Friday 1 January 2027. Below are prompts by age, how to add the year without spelling mistakes, a plan for the evening and why a ball drops in Times Square.`,
  name: 'New Year coloring page',
  topic: 'New Year coloring pages',
  recipesHeading: 'New Year prompts by age',
  toolHeading: 'Describe your New Year page',
  defaultStyle: 'simple',
  presetPrompt: `a party hat, a noisemaker and balloons with confetti, big simple shapes, no background`,
  chips: ['snowman in a party hat with confetti', 'party table with a cake and paper hats', 'owl in a party hat holding a noisemaker', 'fireworks over a lake, drawn as outlines'],
  recipes: [
    { who: 'Ages 2 to 5', style: 'simple', prompt: `a party hat, a noisemaker and balloons with confetti, big simple shapes, no background`, why: `Three party things in big shapes, with confetti small enough to dot with a marker.` },
    { who: 'Ages 5 to 8', style: 'simple', prompt: `fireworks bursting in the sky above a row of three small houses, big simple shapes, white sky`, why: `Each burst is an outline on a white sky, so every firework can get its own colors.` },
    { who: 'Ages 6 to 9', style: 'medium', prompt: `a round clock with tick marks and no numbers, surrounded by party hats, streamers and balloons, clean bold outlines`, why: `With no numbers on the clock, none can come out wrong: children write in 1 to 12 themselves, a time lesson for the last day of the year.` },
    { who: 'Class activity', style: 'simple', prompt: `a wide empty banner across the middle of the page with stars, confetti and streamers around the edges, big simple shapes`, why: `Room for the year or a wish for January, written by hand (see below).` },
    { who: 'Teens and adults', style: 'medium', prompt: `firework bursts and stars filling the whole page in a symmetrical pattern, each burst a separate outline, clean bold lines`, why: `A page of separate bursts to fill slowly, like a mandala made of fireworks.` }
  ],
  sections: [
    { h2: 'Write the year by hand', blocks: [
      { p: `The generator draws pictures and cannot be relied on to write words or numbers, so a prompt that asks for “2027” or “Happy New Year” can come back with letters that are wrong or not letters at all. Leave the words out of the prompt and add them yourself:` },
      { ul: [
        `Ask for “an empty banner” or “an empty sign” where the words should go, as in the class activity prompt above.`,
        `Write 2027 in pencil on one copy before you photocopy it, so every child's page has it.`,
        `Let older children draw the year in bubble letters and color it as part of the page.`
      ] }
    ] },
    { h2: `A plan for New Year's Eve`, blocks: [
      { p: `Midnight is late for young children, so pick an earlier time to count down if you need to. Make the pages a day or two ahead: two on the free plan, or the whole set with Pro.` },
      { ul: [
        `**Early evening:** the party hat page for the youngest, fireworks or the clock for older children.`,
        `**An hour before your countdown:** children draw the clock hands at the time you will count down, and hang the page up.`,
        `**At the countdown:** everyone holds up a finished page for a photo.`,
        `**On 1 January:** a goals page from the banner prompt, for the year ahead.`
      ] }
    ] },
    { h2: 'Why a ball drops in Times Square', blocks: [
      { p: `People were celebrating New Year's Eve in Times Square by 1904, and in 1907 the first New Year's Eve Ball was lowered from the flagpole on top of One Times Square. It was made of iron and wood, lit by one hundred 25-watt bulbs, 5 feet across and 700 pounds in weight. The ball has been lowered every year since, except in 1942 and 1943, when the wartime “dimout” of New York's lights stopped it; the crowds still came and greeted the new year with a minute of silence and chimes (Times Square Alliance).` },
      { p: `The idea is older than the party. In 1833 a “time-ball” was put up on the Royal Observatory at Greenwich, in England. It dropped at one o'clock every afternoon, so that captains of ships nearby could set their chronometers (Times Square Alliance). That makes a good page for a history lesson: a ball on a mast above an old observatory, drawn as outlines.` }
    ] }
  ],
  faq: [
    { q: 'Are these New Year coloring pages free to print?', a: `The example pages on this page download as PNG files for personal use, with no account and no watermark. The generator makes 2 free pages a day; its free PDF carries a watermark, and [Pro](https://dorukctn.gumroad.com/l/uynqt) removes it for $9 once.` },
    { q: `When is New Year's Day 2027?`, a: `On Friday 1 January 2027, a federal holiday in the United States (OPM). New Year's Eve is Thursday 31 December 2026.` },
    { q: 'Can the generator write “2027” or “Happy New Year” on a page?', a: `Not reliably. It draws pictures and can turn letters and numbers into shapes that are neither. Ask for an empty banner and write the words by hand.` },
    { q: 'Which New Year pages suit toddlers?', a: `One or two big objects on Simple: a party hat, balloons or a noisemaker. Fireworks suit children of 5 and up, who can stay inside thinner shapes.` },
    { q: 'How do I keep a fireworks page from printing a black sky?', a: `Ask for “fireworks drawn as outlines on a white sky”. Words such as night sky, dark or glowing pull the page toward large black areas that use up ink and leave little to color.` },
    { q: 'Can I sell New Year coloring pages I make here?', a: `With Pro, yes: it includes commercial use. Our [Etsy guide](/sell-coloring-books-on-etsy) covers fees, file limits and Etsy's rule that AI-made items must say so.` }
  ],
  sources: [
    { text: 'OPM: Federal holidays (2027 schedule)', href: 'https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/' },
    { text: `Times Square Alliance: History of New Year's Eve and the Times Square Ball`, href: 'https://www.timessquarenyc.org/nye/nye-history-times-square-ball' }
  ],
  cta: `A party set of five pages takes three days on the free plan. Pro makes up to 150 pages a day with no watermark and a commercial license, for $9 once.`,
  related: [
    { href: '/winter-coloring-pages', label: 'Winter coloring pages', note: 'snowmen, snow days and polar animals' },
    { href: '/snowman-coloring-pages', label: 'Snowman coloring pages', note: 'snow families, forest friends and snow science' },
    { href: '/christmas-coloring-pages', label: 'Christmas coloring pages', note: 'with a 24-day Advent plan' },
    { href: '/coloring-pages-for-classroom-teachers', label: 'Coloring pages for teachers', note: 'planning pages around a lesson' }
  ]
},

'gingerbread-coloring-pages': {
  updated: '2026-10-27',
  checked: '15 October 2026',
  title: 'Gingerbread Coloring Pages: Free Printable PDFs, Men and Houses',
  description: 'Free printable gingerbread coloring pages: a gingerbread man for toddlers, a candy house and a cookie tray for kids, a plain house to decorate.',
  eyebrow: 'Gingerbread coloring page generator',
  h1: 'Gingerbread coloring pages, from cookies to candy houses',
  lead: `Print free gingerbread coloring pages for kids, or describe a gingerbread page and print it: a gingerbread man with icing buttons for a toddler, a tray of cookie shapes for a first grader, a plain house that children decorate themselves. Below are prompts by age, a fractions lesson from the Gingerbread Boy of 1875, and what the house in Hansel and Gretel was made of.`,
  name: 'gingerbread coloring page',
  topic: 'gingerbread coloring pages',
  recipesHeading: 'Gingerbread prompts by age',
  toolHeading: 'Describe your gingerbread page',
  defaultStyle: 'simple',
  presetPrompt: `a smiling gingerbread man with icing buttons and a bow tie, big simple shapes, no background`,
  chips: ['gingerbread girl with a heart on her dress', 'gingerbread train with candy wheels', 'mug of cocoa next to a gingerbread man', 'gingerbread house with a snowy roof'],
  recipes: [
    { who: 'Ages 2 to 5', style: 'simple', prompt: `a smiling gingerbread man with icing buttons and a bow tie, big simple shapes, no background`, why: `One big cookie with a few icing details: buttons, a bow tie and wavy lines.` },
    { who: 'Ages 3 to 6', style: 'simple', prompt: `a gingerbread house with icing on the roof, candy buttons and a candy cane by the door, big simple shapes, no background`, why: `Round candies and a striped cane, each a shape of its own.` },
    { who: 'Ages 6 to 9', style: 'medium', prompt: `a baking tray of gingerbread cookies: a star, a heart, a tree, a gingerbread man and a gingerbread woman, decorated with icing, clean bold outlines`, why: `Five cookies on one tray, so a child can color one at a time.` },
    { who: 'Fractions lesson', style: 'simple', prompt: `four identical gingerbread men standing in a row, big simple shapes, no background`, why: `For the 1875 story below: color a quarter of the first, half of the second, three quarters of the third and all of the fourth.` },
    { who: 'Teens and adults', style: 'medium', prompt: `a large gingerbread house covered in patterned icing: scalloped roof tiles, candy windows, a wreath on the door and a path of round candies, clean bold outlines`, why: `Every roof tile and candy is its own shape, which makes a long, slow page.` }
  ],
  sections: [
    { h2: 'Gingerbread pages by age', blocks: [
      { table: { head: ['Ages', 'Subjects that work', 'Level'], rows: [
        ['2 to 5', 'one gingerbread man, a single cookie, a candy cane', 'Simple'],
        ['6 to 9', 'cookie trays, a decorated house, a gingerbread family', 'Medium'],
        ['9 to 12', 'a gingerbread village, a bakery window, the 1875 story in scenes', 'Medium'],
        ['Teens and adults', 'houses covered in patterned icing, cookie wreaths', 'Medium']
      ] } }
    ] },
    { h2: 'Decorate a gingerbread house on paper', blocks: [
      { p: `A paper house needs no icing bag. Ask the generator for a plain one, “a gingerbread house outline with an empty roof and plain walls, no decorations, big simple shapes”, and let children add the sweets themselves:` },
      { ul: [
        `**Draw them.** Icing along the roof, candy windows and a path, drawn in pencil and then colored.`,
        `**Glue them on.** Circles and stripes cut from colored paper make candies and canes; stickers work too.`,
        `**Build a street.** Every child decorates one house, and the houses go up side by side on a wall as a gingerbread village.`
      ] },
      { p: `A paper house also works in classrooms where real candy is not allowed in craft projects.` }
    ] },
    { h2: 'The Gingerbread Boy of 1875', blocks: [
      { p: `In May 1875, St. Nicholas Magazine printed a story called “The Gingerbread Boy”. Its author wrote that a servant girl from Maine had told it to the author's children, and that it might have been in print before (University of Pittsburgh folktexts). In this version the boy never says “Run, run, as fast as you can.” He calls out to everyone he passes: “I've run away from a little old woman, a little old man... and I can run away from you, I can!”` },
      { p: `The ending is a ready-made fractions lesson. As the fox eats him, the gingerbread boy says “I'm quarter gone!”, then “I'm half gone!”, then “I'm three-quarters gone!” and at last “I'm all gone!” Print the fractions prompt above, read the ending aloud and let children color each gingerbread man to match.` }
    ] },
    { h2: 'The house in Hansel and Gretel', blocks: [
      { p: `In the Grimm brothers' tale (1857 edition), a snow-white bird leads the children to a little house that is “built entirely from bread with a roof made of cake, and the windows were made of clear sugar” (Grimm, translated by D. L. Ashliman). Ask the generator for that house just as the tale describes it, then for a gingerbread house, and let children compare the two.` }
    ] }
  ],
  faq: [
    { q: 'Are these gingerbread coloring pages free to print?', a: `The example pages on this page download as PNG files for personal use, with no account and no watermark. The generator makes 2 free pages a day; its free PDF carries a watermark, and [Pro](https://dorukctn.gumroad.com/l/uynqt) removes it for $9 once.` },
    { q: 'Which gingerbread pages suit toddlers?', a: `A single gingerbread man or one cookie on Simple: a big shape with a few icing details. Houses covered in candies suit children of 5 and up.` },
    { q: 'Can I get a plain gingerbread house to decorate?', a: `Yes. Ask for “a gingerbread house outline with an empty roof and plain walls, no decorations” and let children draw or glue on their own icing and candies.` },
    { q: 'Where does the Gingerbread Man story come from?', a: `A version called “The Gingerbread Boy” was printed in St. Nicholas Magazine in May 1875. Its author said a servant girl from Maine had told it to the author's children (University of Pittsburgh folktexts).` },
    { q: 'Is the house in Hansel and Gretel made of gingerbread?', a: `Not in the Grimms' text. The little house is built of bread, with a roof of cake and windows of clear sugar.` },
    { q: 'Can I sell gingerbread coloring pages I make here?', a: `With Pro, yes: it includes commercial use. Leave film and TV characters out of anything you sell. Our [Etsy guide](/sell-coloring-books-on-etsy) covers fees, file limits and Etsy's rule that AI-made items must say so.` }
  ],
  sources: [
    { text: 'University of Pittsburgh folktexts (D. L. Ashliman): The Gingerbread Boy, St. Nicholas Magazine, May 1875', href: 'https://sites.pitt.edu/~dash/type2025.html#gingerbread' },
    { text: 'University of Pittsburgh folktexts (D. L. Ashliman): Hansel and Gretel, Grimm', href: 'https://sites.pitt.edu/~dash/grimm015.html' }
  ],
  cta: `One gingerbread man photocopied covers a class, but a different page for each of six tables takes three days on the free plan. Pro makes them in one sitting, with no watermark and a commercial license, for $9 once.`,
  related: [
    { href: '/christmas-coloring-pages', label: 'Christmas coloring pages', note: 'with a 24-day Advent plan' },
    { href: '/snowman-coloring-pages', label: 'Snowman coloring pages', note: 'snow families, forest friends and snow science' },
    { href: '/nativity-coloring-pages', label: 'Nativity coloring pages', note: 'the manger, the shepherds and the star' },
    { href: '/coloring-pages-for-classroom-teachers', label: 'Coloring pages for teachers', note: 'planning pages around a lesson' },
    { href: '/christmas-tree-coloring-pages', label: 'Christmas tree coloring pages', note: 'a tree to decorate' },
    { href: '/christmas-ornament-coloring-pages', label: 'Christmas ornament coloring pages', note: 'blank baubles to design and cut out' }
  ]
},

'snowman-coloring-pages': {
  updated: '2026-10-27',
  checked: '15 October 2026',
  title: 'Snowman Coloring Pages: Free Printable PDFs for Kids and Adults',
  description: 'Free printable snowman coloring pages for kids and adults: a snowman family for toddlers, a blank snowman to dress, forest friends and the best snowman snow.',
  eyebrow: 'Snowman coloring page generator',
  h1: 'Snowman coloring pages, from three circles to a snowy forest',
  lead: `Print free snowman coloring pages for kids and adults, or describe a snowman and print it: a big and a little snowman holding hands for a toddler, a blank snowman to dress for a preschool class, a snowman with a fox and a rabbit in a pine forest for a first grader. Below are prompts by age, a build-a-snowman activity, which snow makes the best snowman and how tall the tallest one stood.`,
  name: 'snowman coloring page',
  topic: 'snowman coloring pages',
  recipesHeading: 'Snowman prompts by age',
  toolHeading: 'Describe your snowman page',
  defaultStyle: 'simple',
  presetPrompt: `a big snowman and a little snowman holding hands, both with scarves and hats, big simple shapes, no background`,
  chips: ['snowman with earmuffs and a carrot nose', 'snowman holding a broom by a fence', 'snowman with a bird on its hat', 'snowman sledding down a hill'],
  recipes: [
    { who: 'Ages 2 to 5', style: 'simple', prompt: `a big snowman and a little snowman holding hands, both with scarves and hats, big simple shapes, no background`, why: `Two friendly figures made of big circles, easy to stay inside.` },
    { who: 'Ages 3 to 6', style: 'simple', prompt: `a snowman made of three plain circles with no face, no hat and no scarf, big simple shapes, no background`, why: `A blank snowman: children draw the face, hat and scarf, then color them (see below).` },
    { who: 'Ages 6 to 9', style: 'medium', prompt: `a snowman in a snowy pine forest with a fox and a rabbit, clean bold outlines`, why: `Two animals and a forest behind them, so the page lasts longer.` },
    { who: 'Ages 9 to 12', style: 'medium', prompt: `children rolling three big snowballs to build a snowman in a backyard, clean bold outlines`, why: `The building steps in one picture, which pairs with the snow science below.` },
    { who: 'Teens and adults', style: 'medium', prompt: `a row of five snowmen in different hats and scarves, each scarf with its own stripe or zigzag pattern, clean bold outlines`, why: `Five scarves and five hats, each one a separate pattern to fill.` }
  ],
  sections: [
    { h2: 'Build a snowman on paper', blocks: [
      { p: `The blank snowman prompt above gives every child the same three circles. What goes on them is up to the child:` },
      { ul: [
        `**A face.** A carrot nose, coal eyes, a smile of small stones: drawn in pencil first, then colored.`,
        `**Clothes.** A hat, a scarf, mittens on stick arms. Scraps of fabric or yarn glued on make a scarf that stands out from the page.`,
        `**A crowd.** Print at 4 pages per sheet in your printer settings for four small snowmen, and line them up along a wall.`
      ] }
    ] },
    { h2: 'Which snow makes the best snowman', blocks: [
      { p: `Snow scientists sort snow into five classes by how much liquid water it holds, from dry to slush. Moist to wet snow is best for a snowman, according to a snow scientist at Montana State University: dry snow is like a loose powder that does not stick together, and slush is too fluid to hold a shape. Wet and moist snow falls at around 32°F (0°C), and the best storms for it are a degree or two either side of freezing (Smithsonian Magazine).` },
      { p: `On a cold, dry day, build the snowman on paper instead, and try outside again when the temperature rises toward freezing.` }
    ] },
    { h2: 'The tallest snowman on record', blocks: [
      { p: `Guinness World Records lists a snow woman built by residents of Bethel, Maine, and the towns around it. She stood 37.21 meters (122 feet 1 inch) tall, took a month to build and was finished on 26 February 2008 (Guinness World Records). Measure your own snowman, on paper or outside, and work out how many of them would have to stand on each other's heads to reach her.` }
    ] }
  ],
  faq: [
    { q: 'Are these snowman coloring pages free to print?', a: `The example pages on this page download as PNG files for personal use, with no account and no watermark. The generator makes 2 free pages a day; its free PDF carries a watermark, and [Pro](https://dorukctn.gumroad.com/l/uynqt) removes it for $9 once.` },
    { q: 'Which snowman pages suit toddlers?', a: `One snowman, or a big and a little one, on Simple. Big round shapes are easy to stay inside; save forests and busy snow scenes for children of 5 and up.` },
    { q: 'Can I get a blank snowman for children to dress?', a: `Yes. Ask for “a snowman made of three plain circles with no face, no hat and no scarf”. If a face or a hat appears anyway, generate the page again.` },
    { q: 'What snow is best for building a snowman?', a: `Moist to wet snow, which falls at around 32°F. Dry powder does not stick together, and slush cannot hold a shape (Smithsonian Magazine).` },
    { q: 'How tall is the tallest snowman?', a: `Guinness World Records lists a snow woman 37.21 meters (122 feet 1 inch) tall, built by residents of Bethel, Maine, and nearby towns and finished on 26 February 2008.` },
    { q: 'Can I sell snowman coloring pages I make here?', a: `With Pro, yes: it includes commercial use. Leave film and TV characters out of anything you sell. Our [Etsy guide](/sell-coloring-books-on-etsy) covers fees, file limits and Etsy's rule that AI-made items must say so.` }
  ],
  sources: [
    { text: 'Smithsonian Magazine: Do You Want To Build a Snowman? Physics Can Help', href: 'https://www.smithsonianmag.com/science-nature/do-you-want-build-snowman-physics-180954024/' },
    { text: 'Guinness World Records: Tallest snowperson', href: 'https://www.guinnessworldrecords.com/world-records/tallest-snowman' }
  ],
  cta: `A blank snowman photocopied covers a class, but five different snowman pages take three days on the free plan. Pro makes them in one sitting, with no watermark and a commercial license, for $9 once.`,
  related: [
    { href: '/winter-coloring-pages', label: 'Winter coloring pages', note: 'snow days, snowflakes and polar animals' },
    { href: '/christmas-coloring-pages', label: 'Christmas coloring pages', note: 'with a 24-day Advent plan' },
    { href: '/new-year-coloring-pages', label: 'New Year coloring pages', note: 'party hats, fireworks and a countdown clock' },
    { href: '/coloring-pages-for-classroom-teachers', label: 'Coloring pages for teachers', note: 'planning pages around a lesson' },
    { href: '/snowflake-coloring-pages', label: 'Snowflake coloring pages', note: 'the snow crystal types and a paper snowflake' },
    { href: '/santa-coloring-pages', label: 'Santa coloring pages', note: 'a smiling face to a sack in the snow' }
  ]
},

'diwali-coloring-pages': {
  updated: '2026-10-15',
  checked: '15 October 2026',
  title: 'Diwali Coloring Pages: Diyas, Rangoli and Lanterns',
  description: 'Free printable Diwali coloring pages for Sunday 8 November 2026: a diya for toddlers, rangoli patterns for kids and adults, and a doorway lit with lanterns.',
  eyebrow: 'Diwali coloring page generator',
  h1: 'Diwali coloring pages: diyas, rangoli and lanterns',
  lead: `Describe a Diwali page and print it: one lit diya for a toddler, a round rangoli for an older child, a doorway with lanterns and lamps for a class display. In 2026, Diwali falls on Sunday 8 November. Below are prompts by age, how to color a rangoli, a row-of-lamps display and what the festival of lights celebrates.`,
  name: 'Diwali coloring page',
  topic: 'Diwali coloring pages',
  recipesHeading: 'Diwali prompts by age',
  toolHeading: 'Describe your Diwali page',
  defaultStyle: 'simple',
  presetPrompt: `a lit diya, a small clay oil lamp with one flame, on a simple flower pattern, big simple shapes, no background`,
  chips: ['plate of sweets next to a lit diya', 'hanging paper lantern with a star pattern', 'string of marigold flowers over a door', 'family lighting a row of diyas on the steps'],
  recipes: [
    { who: 'Ages 2 to 5', style: 'simple', prompt: `a lit diya, a small clay oil lamp with one flame, on a simple flower pattern, big simple shapes, no background`, why: `One lamp on a flower: a first Diwali page with only a few shapes.` },
    { who: 'Ages 5 to 8', style: 'simple', prompt: `a row of five lit diyas on a step, each lamp with a different simple pattern, big simple shapes, no background`, why: `A row of lamps, as in the name Diwali (see below), each with a pattern of its own.` },
    { who: 'Ages 6 to 9', style: 'medium', prompt: `a round rangoli design of flower petals, leaves and small diyas, symmetrical, clean bold outlines`, why: `A symmetrical design that children color ring by ring.` },
    { who: 'Ages 9 to 12', style: 'medium', prompt: `a doorway decorated for Diwali with hanging paper lanterns, a string of marigold flowers above the door and diyas on the steps, no people, clean bold outlines`, why: `A whole doorway to decorate: lanterns, flowers, lamps and the door itself.` },
    { who: 'Teens and adults', style: 'medium', prompt: `a kolam pattern of dots joined by looping lines into a symmetrical design, white background, clean bold outlines`, why: `Kolam, the dot-and-line floor art of Tamil Nadu, makes a calm page with many small shapes (see below).` }
  ],
  sections: [
    { h2: 'How to color a rangoli', blocks: [
      { p: `Rangoli is floor art made at the doorways of homes, and in more elaborate forms for festivals, across India. The word comes from the Sanskrit rangavali, “line of color”, and rangolis are made with colored powders, rice flour, flowers, chalk or colored sand. For Diwali they are especially elaborate, with lit lamps set among the colored lines. In Tamil Nadu the same art is called kolam, and it is mostly white, made with rice flour or chalk (Britannica).` },
      { ul: [
        `**Work from the center out.** Give each ring its own color before moving to the next, so the symmetry shows.`,
        `**Repeat the colors.** Color one petal, then every matching petal the same way, as in a mandala.`,
        `**Try a kolam in white.** Color the space around the pattern in one dark color and leave the pattern white, like rice flour on a doorstep.`
      ] }
    ] },
    { h2: 'A row of lamps for a class display', blocks: [
      { p: `The name Diwali comes from the Sanskrit dipavali, “row of lights”. Diyas, small earthenware lamps filled with oil, are lit and set in rows along the parapets of temples and houses (Britannica). A class display can follow the name: every child colors a diya page, and the pages go up side by side in one long row along a wall or a window.` }
    ] },
    { h2: 'What Diwali celebrates', blocks: [
      { p: `Diwali is one of the major festivals of Hinduism, Jainism and Sikhism. It lasts five days, usually in late October or November, and generally symbolizes the victory of light over darkness. Homes are decorated and floors inside and out are covered with rangolis. For Jains the festival commemorates the liberation of Mahavira, and since the 18th century Sikhs have celebrated it as the time of Guru Hargobind's return to Amritsar from captivity (Britannica).` },
      { p: `Many people clean their homes before Diwali, wear new clothes and give gifts of sweets to family and friends (timeanddate.com). Each of those makes a page: a plate of sweets, a family lighting lamps on the steps, a freshly decorated doorway.` }
    ] },
    { h2: 'Diwali 2026: Sunday 8 November', blocks: [
      { p: `The Government of India's list of holidays for 2026 puts Diwali (Deepavali) on Sunday 8 November, and so does timeanddate.com. The date can differ by region, because traditional lunar calendars are read in different ways; in Tamil Nadu, for example, Deepavali falls in the Tamil month of Aipasi (timeanddate.com). In 2027, Diwali falls on Friday 29 October.` }
    ] }
  ],
  faq: [
    { q: 'When is Diwali in 2026?', a: `On Sunday 8 November 2026, according to the Government of India's 2026 holiday list and timeanddate.com. Some regions mark it on a different day, because traditional lunar calendars are read in different ways.` },
    { q: 'What is a diya?', a: `A small earthenware lamp filled with oil. Rows of lit diyas give Diwali its name, from the Sanskrit dipavali, “row of lights” (Britannica).` },
    { q: 'What is a rangoli made of?', a: `Colored powders, rice flour, flowers, chalk or colored sand, laid out on the floor, often at a doorway. In Tamil Nadu it is called kolam and is mostly white (Britannica).` },
    { q: 'Why are there no gods or goddesses on these pages?', a: `The prompts here stick to lamps, rangoli, lanterns, sweets and family scenes. The generator does not know the details each tradition cares about, so for a page with a deity, ask someone who knows the tradition and check the drawing carefully before sharing it.` },
    { q: 'Can I sell Diwali coloring pages I make here?', a: `With Pro, yes: it includes commercial use. Our [Etsy guide](/sell-coloring-books-on-etsy) covers fees, file limits and Etsy's rule that AI-made items must say so.` }
  ],
  sources: [
    { text: 'timeanddate.com: Diwali/Deepavali 2026 in India', href: 'https://www.timeanddate.com/holidays/india/diwali' },
    { text: 'Government of India (DoPT order of 3 July 2025): gazetted holidays for 2026, as listed by the Directorate of Forest Education (PDF)', href: 'https://dfe.gov.in/uploads/documents/list-of-gazetted-holidays-2026.pdf' },
    { text: 'Britannica: Diwali', href: 'https://www.britannica.com/topic/Diwali-Hindu-festival' },
    { text: 'Britannica: Rangoli', href: 'https://www.britannica.com/art/rangoli' }
  ],
  cta: `A diya for every child photocopied makes a class display, but five different Diwali pages take three days on the free plan. Pro makes them in one sitting, with no watermark and a commercial license, for $9 once.`,
  related: [
    { href: '/mandala-coloring-pages', label: 'Mandala coloring pages', note: 'symmetrical designs for a quiet evening' },
    { href: '/hanukkah-coloring-pages', label: 'Hanukkah coloring pages', note: 'menorahs, dreidels and latkes' },
    { href: '/fall-coloring-pages', label: 'Fall coloring pages', note: 'leaves, scarecrows and pumpkin patches' },
    { href: '/coloring-pages-for-classroom-teachers', label: 'Coloring pages for teachers', note: 'planning pages around a lesson' }
  ]
},

'hanukkah-coloring-pages': {
  updated: '2026-10-27',
  checked: '15 October 2026',
  title: 'Hanukkah Coloring Pages: Free Printable PDFs for Kids and Adults',
  description: 'Free printable Hanukkah coloring pages for 4 to 12 December 2026: a nine-branch menorah, latkes, sufganiyot, a blank dreidel and a candle-counting page.',
  eyebrow: 'Hanukkah coloring page generator',
  h1: 'Hanukkah coloring pages: menorahs, dreidels and latkes',
  lead: `Print free Hanukkah coloring pages for kids, or describe a Hanukkah page and print it: a menorah with all nine candles for a toddler, latkes or sufganiyot for a first grader, a dreidel with blank sides for an older child to letter. Hanukkah 2026 begins at sundown on Friday 4 December and ends at nightfall on Saturday 12 December. Below are prompts by age, how to check the menorah before you print, a candle-counting page for the eight nights and the dreidel letters.`,
  name: 'Hanukkah coloring page',
  topic: 'Hanukkah coloring pages',
  recipesHeading: 'Hanukkah prompts by age',
  toolHeading: 'Describe your Hanukkah page',
  defaultStyle: 'simple',
  presetPrompt: `a Hanukkah menorah with exactly nine candle holders: four on the left, four on the right and one raised holder in the middle, all nine candles lit, big simple shapes, no background`,
  chips: ['dreidel with four blank sides, no letters', 'latkes with sour cream and applesauce', 'cat batting a dreidel across the floor', 'wrapped gifts with ribbons and a dreidel'],
  recipes: [
    { who: 'Ages 2 to 5', style: 'simple', prompt: `a Hanukkah menorah with exactly nine candle holders: four on the left, four on the right and one raised holder in the middle, all nine candles lit, big simple shapes, no background`, why: `Spelling out four, four and one in the middle helps the generator get all nine branches right (see below).` },
    { who: 'Ages 3 to 6', style: 'simple', prompt: `a plate of potato latkes with a small bowl of applesauce, big simple shapes, no background`, why: `Round latkes and a bowl: a few big shapes for small hands.` },
    { who: 'Ages 5 to 8', style: 'simple', prompt: `round jelly doughnuts dusted with sugar on a plate, big simple shapes, no background`, why: `Sufganiyot, the jelly doughnuts of Hanukkah, with sugar dots to color.` },
    { who: 'Ages 6 to 9', style: 'simple', prompt: `a dreidel with four blank sides and no letters, next to a few round coins, big simple shapes, no background`, why: `Blank sides, so children write the Hebrew letters themselves (see below).` },
    { who: 'Teens and adults', style: 'medium', prompt: `a Hanukkah menorah with exactly nine candle holders, four on each side and one raised in the middle, standing in a window with a border of Stars of David drawn as outlines, clean bold outlines`, why: `A window scene with a patterned border. A menorah in a window facing the street publicizes the miracle (My Jewish Learning).` }
  ],
  sections: [
    { h2: 'Count the branches before you print', blocks: [
      { p: `A Hanukkah menorah, or hanukkiah, has room for nine candles: one for each of the eight nights and the shamash, the helper candle used to light the others. The eight stand at the same height, and the shamash is often placed higher or set off to the side. A menorah with seven branches is a different lamp, the one used in the ancient Temple in Jerusalem (My Jewish Learning).` },
      { p: `When we made the examples on this page, the generator drew seven branches until the prompt spelled out four on each side and one raised in the middle. Count them on screen before you print a class set.` }
    ] },
    { h2: 'A candle-counting page for the eight nights', blocks: [
      { p: `On the first night, two candles go in the menorah: the shamash and one candle at the far right. One more is added each night, until all nine burn on the eighth night. Candles are placed from right to left and lit from left to right, and the whole holiday takes 44 candles for one menorah (My Jewish Learning).` },
      { ul: [
        `**One page, eight nights.** Print the menorah once and color one more candle each night, plus the shamash.`,
        `**A counting sheet.** Print eight copies and number them 1 to 8; children color the right number of candles on each.`,
        `**The 44 question.** Ask older children to work out why one menorah needs 44 candles for the whole holiday.`
      ] }
    ] },
    { h2: 'Write the dreidel letters by hand', blocks: [
      { p: `A dreidel is a spinning top with four sides, each marked with a Hebrew letter: nun, gimel, hey and shin. Together they stand for a Hebrew phrase meaning “a great miracle happened there”; in Israel, a peh replaces the shin, for “a great miracle happened here” (My Jewish Learning).` },
      { p: `The generator cannot be relied on to draw Hebrew letters: in our tests it drew shapes that looked like letters but were not. Ask for blank sides, copy the four letters from a real dreidel, and play a round once the page is colored: nun, nothing; gimel, take the whole pot; hey, take half; shin, put one in.` }
    ] },
    { h2: 'Foods fried in oil', blocks: [
      { p: `Hanukkah, the festival of rededication, recalls the rededication of the Temple in Jerusalem in 164 BCE. Much later rabbinic tradition tells of a small amount of oil that burned for eight days, and in memory of it, foods fried in oil are traditional: potato pancakes, or latkes, and jelly doughnuts, or sufganiyot (My Jewish Learning). Both are among the example pages above.` }
    ] }
  ],
  faq: [
    { q: 'Are these Hanukkah coloring pages free to print?', a: `The example pages on this page download as PNG files for personal use, with no account and no watermark. The generator makes 2 free pages a day; its free PDF carries a watermark, and [Pro](https://dorukctn.gumroad.com/l/uynqt) removes it for $9 once.` },
    { q: 'When is Hanukkah in 2026?', a: `It begins at sundown on Friday 4 December 2026 and ends at nightfall on Saturday 12 December 2026: eight nights, starting on the 25th of Kislev (Hebcal).` },
    { q: 'How many candles does a Hanukkah menorah have?', a: `Nine: eight for the nights and the shamash, the helper candle, which is often set higher or to the side. A seven-branched menorah is the lamp of the ancient Temple, a different object (My Jewish Learning).` },
    { q: 'Why does the dreidel page have blank sides?', a: `The generator cannot be relied on to draw Hebrew letters. Blank sides let children write nun, gimel, hey and shin themselves, copied from a real dreidel.` },
    { q: 'Which Hanukkah pages suit toddlers?', a: `One object on Simple: the menorah, a dreidel or a plate of latkes. Scenes with a table or a window suit children of 6 and up.` },
    { q: 'Can I sell Hanukkah coloring pages I make here?', a: `With Pro, yes: it includes commercial use. Our [Etsy guide](/sell-coloring-books-on-etsy) covers fees, file limits and Etsy's rule that AI-made items must say so.` }
  ],
  sources: [
    { text: 'Hebcal: Chanukah 2026', href: 'https://www.hebcal.com/holidays/hanukkah-2026' },
    { text: 'My Jewish Learning: Hanukkah 101', href: 'https://www.myjewishlearning.com/article/hanukkah-101/' },
    { text: 'My Jewish Learning: The hanukkiah (menorah)', href: 'https://www.myjewishlearning.com/article/the-hanukkiyah-menorah/' },
    { text: 'My Jewish Learning: How to light the Hanukkah menorah', href: 'https://www.myjewishlearning.com/article/hanukkah-candle-lighting-ceremony/' },
    { text: 'My Jewish Learning: How to play dreidel', href: 'https://www.myjewishlearning.com/article/how-to-play-dreidel/' }
  ],
  cta: `Eight different Hanukkah pages, one for each night, take four days on the free plan. Pro makes them in one sitting, with no watermark and a commercial license, for $9 once.`,
  related: [
    { href: '/winter-coloring-pages', label: 'Winter coloring pages', note: 'snow days, snowflakes and polar animals' },
    { href: '/diwali-coloring-pages', label: 'Diwali coloring pages', note: 'diyas, rangoli and lanterns' },
    { href: '/new-year-coloring-pages', label: 'New Year coloring pages', note: 'party hats, fireworks and a countdown clock' },
    { href: '/coloring-pages-for-classroom-teachers', label: 'Coloring pages for teachers', note: 'planning pages around a lesson' }
  ]
},

'dragon-coloring-pages': {
  updated: '2026-10-16',
  checked: '16 October 2026',
  title: 'Dragon Coloring Pages: From Baby Dragons to Castle Towers',
  description: 'Free printable dragon coloring pages: a baby dragon hatching for toddlers, a dragon on a castle tower for older kids, and the two kinds of dragon in legend.',
  eyebrow: 'Dragon coloring page generator',
  h1: 'Dragon coloring pages, from baby dragons to castle towers',
  lead: `Describe a dragon and print it: a baby dragon hatching from its egg for a toddler, a dragon flying over the clouds for a first grader, a dragon guarding a castle tower for an older child. Below are prompts by age, the difference between European and East Asian dragons, and the real lizard that carries the name.`,
  name: 'dragon coloring page',
  topic: 'dragon coloring pages',
  recipesHeading: 'Dragon prompts by age',
  toolHeading: 'Describe your dragon page',
  defaultStyle: 'simple',
  presetPrompt: `a friendly baby dragon hatching from a cracked egg, small horns and little wings, big simple shapes, no background`,
  chips: ['dragon reading a book under a tree', 'dragon and a knight sharing a picnic', 'dragon curled around a pile of gold coins', 'baby dragon asleep in a nest'],
  recipes: [
    { who: 'Ages 2 to 5', style: 'simple', prompt: `a friendly baby dragon hatching from a cracked egg, small horns and little wings, big simple shapes, no background`, why: `A round, smiling face and a cracked egg: a dragon with nothing scary about it.` },
    { who: 'Ages 4 to 7', style: 'simple', prompt: `a friendly dragon flying with its wings spread wide above a few clouds, big simple shapes, no background`, why: `Two big wings to color, each one a separate shape.` },
    { who: 'Ages 6 to 9', style: 'medium', prompt: `a dragon with large bat-like wings, horns and spikes along its back, perched on a castle tower, clean bold outlines, white sky`, why: `A storybook scene with bricks, battlements and spikes for an older child to work through.` },
    { who: 'Ages 9 to 12', style: 'medium', prompt: `a long wingless East Asian dragon curling through clouds, with a flowing mane and scales drawn as outlines, clean bold outlines`, why: `The other kind of dragon (see below): long, wingless and at home among the clouds.` },
    { who: 'Teens and adults', style: 'medium', prompt: `a dragon coiled around a tall rock, every scale on its body drawn as a separate outline, clean bold lines`, why: `Hundreds of scales, each one its own shape, for a long evening of coloring.` }
  ],
  sections: [
    { h2: 'Two kinds of dragon', blocks: [
      { p: `Dragons in legend come in two broad kinds. In medieval Europe they were usually shown with wings and a barbed tail, breathing fire. In East Asian mythologies the dragon is a beneficent creature, and Chinese and Japanese dragons, though regarded as powers of the air, are usually wingless (Britannica). The English word comes from the Greek drakōn, which first meant any large serpent.` },
      { ul: [
        `**A European dragon:** “a dragon with bat-like wings, horns and a barbed tail”.`,
        `**An East Asian dragon:** “a long wingless dragon with a flowing mane curling through clouds”.`
      ] },
      { p: `Norse warriors painted dragons on their shields and carved dragon heads on the prows of their ships (Britannica). A dragon-prow ship makes a good page for a history lesson.` }
    ] },
    { h2: 'Choose how fierce the dragon is', blocks: [
      { table: { head: ['Mood', 'Words to use', 'Ages'], rows: [
        ['Friendly', 'baby, smiling, round, little wings', '2 to 5'],
        ['Adventurous', 'flying, castle, knight, treasure', '6 to 9'],
        ['Fierce', 'spikes, horns, scales, smoke drawn as outlines', '10 and up']
      ] } },
      { p: `Fire and smoke print best as outlines. Write “flames drawn as outlines” so they stay white to color; words such as glowing or dark pull the page toward large black areas.` }
    ] },
    { h2: 'The real dragon: the Komodo', blocks: [
      { p: `One dragon is real. The Komodo dragon is the largest living lizard in the world: the largest verified one reached 10.3 feet (3.13 meters) and weighed 366 pounds, and wild Komodo dragons live only on a few islands in Indonesia (Smithsonian's National Zoo). Make one page of a dragon from legend and one of the Komodo, and let children compare.` }
    ] }
  ],
  faq: [
    { q: 'Which dragon coloring pages suit toddlers?', a: `A baby dragon on Simple: a round face, small horns and little wings, or a dragon hatching from an egg. Leave spikes, scales and castles until ages 5 or 6.` },
    { q: 'Do all dragons have wings?', a: `No. Dragons from medieval Europe usually have wings, but Chinese and Japanese dragons are usually wingless (Britannica). Ask for “a long wingless dragon” to draw the East Asian kind.` },
    { q: 'How do I draw fire without a black page?', a: `Ask for “flames drawn as outlines” or “a small puff of smoke drawn as an outline”. Words like dark, glowing or silhouette push the page toward large black areas.` },
    { q: 'Is the Komodo dragon a real dragon?', a: `It is a real lizard that carries the name: the largest living lizard in the world, found only on a few Indonesian islands (Smithsonian's National Zoo).` },
    { q: 'Can I sell dragon coloring pages I make here?', a: `With Pro, yes: it includes commercial use. Leave film and game characters out of anything you sell. Our [Etsy guide](/sell-coloring-books-on-etsy) covers fees, file limits and Etsy's rule that AI-made items must say so.` }
  ],
  sources: [
    { text: 'Britannica: Dragon', href: 'https://www.britannica.com/topic/dragon-mythological-creature' },
    { text: `Smithsonian's National Zoo: Komodo dragon`, href: 'https://nationalzoo.si.edu/animals/komodo-dragon' }
  ],
  cta: `A different dragon for each of six tables takes three days on the free plan. Pro makes them in one sitting, with no watermark and a commercial license, for $9 once.`,
  related: [
    { href: '/unicorn-coloring-pages', label: 'Unicorn coloring pages', note: 'winged unicorns and party pages' },
    { href: '/fairy-coloring-pages', label: 'Fairy coloring pages', note: 'fairy houses, wings and gardens' },
    { href: '/dinosaur-coloring-pages', label: 'Dinosaur coloring pages', note: 'species that really lived together' },
    { href: '/princess-coloring-pages', label: 'Princess coloring pages', note: 'fairy tales that are free to draw' }
  ]
},

'cat-coloring-pages': {
  updated: '2026-10-16',
  checked: '16 October 2026',
  title: 'Cat Coloring Pages: Kittens, Cozy Cats and Real Breeds',
  description: 'Free printable cat coloring pages: a kitten with yarn for toddlers, a cat asleep on a windowsill for kids, and real breeds to color, from the Siamese to the Manx.',
  eyebrow: 'Cat coloring page generator',
  h1: 'Cat coloring pages: kittens, cozy cats and real breeds',
  lead: `Describe a cat and print it: a cat with a ball of yarn for a toddler, kittens in a basket for a first grader, a cat asleep on a windowsill for an older child. Below are prompts by age, six breeds that are easy to tell apart on paper, and how to color a Siamese the way the breed really looks.`,
  name: 'cat coloring page',
  topic: 'cat coloring pages',
  recipesHeading: 'Cat prompts by age',
  toolHeading: 'Describe your cat page',
  defaultStyle: 'simple',
  presetPrompt: `a cat sitting next to a ball of yarn, big simple shapes, no background`,
  chips: ['cat playing in a cardboard box', 'cat watching a fish bowl', 'two cats sharing a cushion', 'cat chasing a butterfly in the grass'],
  recipes: [
    { who: 'Ages 2 to 5', style: 'simple', prompt: `a cat sitting next to a ball of yarn, big simple shapes, no background`, why: `One cat and one ball of yarn: two big shapes, easy to stay inside.` },
    { who: 'Ages 4 to 7', style: 'simple', prompt: `a kitten peeking out of a cardboard box, big simple shapes, no background`, why: `A kitten and a box, both made of big simple shapes.` },
    { who: 'Ages 6 to 9', style: 'medium', prompt: `three kittens playing in a wicker basket with a blanket, clean bold outlines`, why: `Three kittens to color three ways: one striped, one spotted, one plain.` },
    { who: 'Ages 9 to 12', style: 'medium', prompt: `a cat curled up asleep on a windowsill with potted plants and curtains, clean bold outlines`, why: `A whole cozy corner: curtains, plants and a sleeping cat.` },
    { who: 'Teens and adults', style: 'medium', prompt: `a long-haired cat sitting in a garden of flowers, every lock of fur drawn as a separate outline, clean bold lines`, why: `Long fur in separate locks gives adults many small shapes to fill.` }
  ],
  sections: [
    { h2: 'Six breeds that are easy to tell apart on paper', blocks: [
      { p: `The Cat Fanciers' Association recognizes over 40 breeds (CFA). These six each have one feature a drawing can show. Ask the generator for the breed by name and its feature, for example “a Manx cat with no tail”, then color it from the table.` },
      { table: { head: ['Breed', 'What makes it different'], rows: [
        ['Siamese', 'a “pointed” cat: color on the head, ears, legs and tail, and always blue eyes'],
        ['Manx', 'usually no tail, and back legs longer than the front legs'],
        ['American Curl', 'ears that curl backwards'],
        ['Selkirk Rex', 'naturally curly fur, and even curly whiskers'],
        ['Egyptian Mau', 'the only natural spotted breed of domestic cat'],
        ['Maine Coon', 'often called the biggest domestic cat, up to 20 pounds full grown']
      ] } }
    ] },
    { h2: 'Color a Siamese the way it really looks', blocks: [
      { p: `Because a Siamese keeps its color on the points, the head, ears, legs and tail, it is a good first lesson in coloring with a plan: leave the body pale, color the points dark, and save the blue for the eyes (CFA). White Persians can have copper eyes, blue eyes, or one of each, called odd-eyed (CFA): another chance to color with a plan.` }
    ] }
  ],
  faq: [
    { q: 'Which cat coloring pages suit toddlers?', a: `One cat on Simple, sitting or lying down, with one toy such as a ball of yarn. Leave baskets of kittens and window scenes for children of 5 and up.` },
    { q: 'How many cat breeds are there?', a: `The Cat Fanciers' Association recognizes over 40 breeds (CFA). The table above lists six that are easy to draw.` },
    { q: 'Can I make a coloring page of my own cat?', a: `Describe it: the coat (“a fluffy long-haired cat”, “a cat with one white paw”), the pose and its favorite spot. The generator draws a new picture from your words, so the page shows your cat's type rather than a copy of a photo.` },
    { q: 'Can I make cat coloring pages for adults?', a: `Yes. Ask for long fur drawn in separate locks, a cat among flowers or a pattern of cats, and choose Medium or Detailed. See [adult coloring pages](/adult-coloring-pages) for paper tips.` },
    { q: 'Can I sell cat coloring pages I make here?', a: `With Pro, yes: it includes commercial use. Leave comic-strip and film cats out of anything you sell. Our [Etsy guide](/sell-coloring-books-on-etsy) covers fees, file limits and Etsy's rule that AI-made items must say so.` }
  ],
  sources: [
    { text: `The Cat Fanciers' Association: Breeds and colors (for kids)`, href: 'https://cfa.org/kids/breeds-and-colors/' }
  ],
  cta: `Six kittens for six tables take three days on the free plan. Pro makes them in one sitting, with no watermark and a commercial license, for $9 once.`,
  related: [
    { href: '/dog-coloring-pages', label: 'Dog coloring pages', note: 'puppies and the seven dog groups' },
    { href: '/animal-coloring-pages', label: 'Animal coloring pages', note: 'black markings, life cycles, pet portraits' },
    { href: '/halloween-coloring-pages', label: 'Halloween coloring pages', note: 'black cats drawn as outlines' },
    { href: '/coloring-pages-for-classroom-teachers', label: 'Coloring pages for teachers', note: 'planning pages around a lesson' }
  ]
},

'car-coloring-pages': {
  updated: '2026-10-16',
  checked: '16 October 2026',
  title: 'Car Coloring Pages: Classic Cars, Race Cars and Road Trips',
  description: 'Free printable car coloring pages: a classic car for toddlers, a race car and a camper van for kids, the Model T story and a buckle-up page for young passengers.',
  eyebrow: 'Car coloring page generator',
  h1: 'Car coloring pages: classic cars, race cars and road trips',
  lead: `Describe a car and print it: a classic car in big shapes for a toddler, a race car at the checkered flag for a first grader, a camper van by a lake for a family road trip. Below are prompts by age, how the Model T put families on the road, and a back-seat safety page for young passengers.`,
  name: 'car coloring page',
  topic: 'car coloring pages',
  recipesHeading: 'Car prompts by age',
  toolHeading: 'Describe your car page',
  defaultStyle: 'simple',
  presetPrompt: `a classic car seen from the side with round headlights and big wheels, no face, no letters, big simple shapes, no background`,
  chips: ['fire truck with a ladder, no letters', 'tow truck pulling a small car', 'tractor in a field', 'ice cream truck by a park, no letters'],
  recipes: [
    { who: 'Ages 2 to 5', style: 'simple', prompt: `a classic car seen from the side with round headlights and big wheels, no face, no letters, big simple shapes, no background`, why: `Round wheels and headlights in big shapes. “No face” keeps it a real car rather than a cartoon character.` },
    { who: 'Ages 4 to 7', style: 'simple', prompt: `a fire truck with a long ladder and big wheels, no letters, big simple shapes, no background`, why: `A favorite vehicle for small children, with ladder rungs to count.` },
    { who: 'Ages 6 to 9', style: 'medium', prompt: `a race car speeding on a track with a checkered flag, no numbers or letters on the car, no face, clean bold outlines`, why: `The car comes without numbers, so each child can paint on a race number of their own.` },
    { who: 'Ages 9 to 12', style: 'medium', prompt: `a camper van parked by a lake with pine trees and mountains behind, no letters, clean bold outlines`, why: `A road-trip scene with a whole landscape to color.` },
    { who: 'Teens and adults', style: 'medium', prompt: `a vintage car from the 1920s with spoked wheels, a folding roof and running boards, no letters, clean bold outlines`, why: `Spokes, lamps and running boards give older children and adults plenty of detail.` }
  ],
  sections: [
    { h2: 'Keep the car a car', blocks: [
      { p: `If you want a real car rather than a cartoon character, two habits keep the page clean:` },
      { ul: [
        `Add “no face” to the prompt, so the headlights stay headlights.`,
        `Add “no letters” or “no numbers”. The generator cannot be relied on to spell, so a race number or a name on the door is best written in by hand.`
      ] }
    ] },
    { h2: 'The car that put families on the road', blocks: [
      { p: `Ford Motor Company introduced the Model T on 1 October 1908, at $850, cheap for its day. The 15 millionth Model T came off the Highland Park assembly line on 26 May 1927, and by then Model Ts were being made in 19 other countries (The Henry Ford). A page of a car from the 1920s next to a modern car makes a good before-and-after lesson.` }
    ] },
    { h2: 'A buckle-up page for young passengers', blocks: [
      { p: `NHTSA, the US road safety agency, advises keeping children in the back seat at least through age 12, and in a booster seat until the seat belt fits: the lap belt across the upper thighs, not the stomach, and the shoulder belt across the shoulder and chest, not the neck or face (NHTSA).` },
      { p: `Color a car seen from the side with its windows showing the back seat, and let children draw themselves in it, buckled up the right way.` }
    ] }
  ],
  faq: [
    { q: 'Which car coloring pages suit toddlers?', a: `One vehicle from the side on Simple: a car, a fire truck or a tractor. Big round wheels are easy to color. Leave busy road scenes until ages 5 or 6.` },
    { q: 'How do I stop the car from getting a face?', a: `Add “no face” to the prompt. If a face appears anyway, generate the page again.` },
    { q: 'Can the generator write a race number or a name on the car?', a: `Not reliably. It draws pictures and can turn letters and numbers into shapes that are neither. Ask for “no numbers or letters” and write them in by hand.` },
    { q: 'When was the Model T made?', a: `Ford introduced it on 1 October 1908, and the 15 millionth came off the line on 26 May 1927 (The Henry Ford).` },
    { q: 'Can I sell car coloring pages I make here?', a: `With Pro, yes: it includes commercial use. Leave car brands, logos and film characters out of anything you sell. Our [Etsy guide](/sell-coloring-books-on-etsy) covers fees, file limits and Etsy's rule that AI-made items must say so.` }
  ],
  sources: [
    { text: `The Henry Ford: Ford's Model T, a car for the great multitude`, href: 'https://www.thehenryford.org/collections/explore/articles/fords-model-t' },
    { text: 'NHTSA: Car seats and booster seats', href: 'https://www.nhtsa.gov/vehicle-safety/car-seats-and-booster-seats' }
  ],
  cta: `A fire truck, a race car and a camper van for three children take two days on the free plan. Pro makes them in one sitting, with no watermark and a commercial license, for $9 once.`,
  related: [
    { href: '/space-coloring-pages', label: 'Space coloring pages', note: 'rockets, planets and astronauts' },
    { href: '/dinosaur-coloring-pages', label: 'Dinosaur coloring pages', note: 'species that really lived together' },
    { href: '/dog-coloring-pages', label: 'Dog coloring pages', note: 'puppies and the seven dog groups' },
    { href: '/coloring-pages-for-classroom-teachers', label: 'Coloring pages for teachers', note: 'planning pages around a lesson' }
  ]
},

'dog-coloring-pages': {
  updated: '2026-10-16',
  checked: '16 October 2026',
  title: 'Dog Coloring Pages: Puppies, Breeds and the Seven Dog Groups',
  description: 'Free printable dog coloring pages: a puppy with a bone for toddlers, a dog in the bath for kids, and the seven AKC dog groups with a breed to draw from each.',
  eyebrow: 'Dog coloring page generator',
  h1: 'Dog coloring pages: puppies, breeds and the seven dog groups',
  lead: `Describe a dog and print it: a puppy with a bone for a toddler, a dog in a bubble bath for a first grader, a breed from each of the seven dog groups for an older child. Below are prompts by age, the groups that dog shows use, and how to draw your own dog.`,
  name: 'dog coloring page',
  topic: 'dog coloring pages',
  recipesHeading: 'Dog prompts by age',
  toolHeading: 'Describe your dog page',
  defaultStyle: 'simple',
  presetPrompt: `a happy puppy sitting with a bone, floppy ears, big simple shapes, no background`,
  chips: ['dog wearing a raincoat in the rain', 'puppy asleep with a teddy bear', 'dog carrying a stick in a park', 'two puppies sharing a big bone'],
  recipes: [
    { who: 'Ages 2 to 5', style: 'simple', prompt: `a happy puppy sitting with a bone, floppy ears, big simple shapes, no background`, why: `A round puppy and a bone: big shapes and a friendly face.` },
    { who: 'Ages 4 to 7', style: 'medium', prompt: `a dog asleep in a round dog bed with a blanket and a chew toy beside it, clean bold outlines`, why: `A calm page: one dog, one bed, one toy.` },
    { who: 'Ages 6 to 9', style: 'medium', prompt: `a dog in a bathtub full of bubbles with a rubber duck and a towel, clean bold outlines`, why: `Bubbles, a duck and a towel: lots of small shapes around one big dog.` },
    { who: 'Ages 9 to 12', style: 'medium', prompt: `a Border Collie herding sheep across a field, clean bold outlines`, why: `A dog at work, from the Herding Group (see below).` },
    { who: 'Teens and adults', style: 'medium', prompt: `a portrait of a long-haired dog with every lock of fur drawn as a separate outline, clean bold lines`, why: `A pet portrait with fur in separate locks to fill slowly.` }
  ],
  sections: [
    { h2: 'Seven dog groups, a breed from each', blocks: [
      { p: `At American Kennel Club dog shows, breeds are shown in seven groups, each organized by the work its breeds were developed to do (AKC). One page per group makes a set of seven, a week of coloring.` },
      { table: { head: ['Group', 'Bred for', 'Breeds to draw'], rows: [
        ['Sporting', 'helping hunters find and retrieve birds', 'Labrador Retriever, Cocker Spaniel, German Shorthaired Pointer'],
        ['Hound', 'chasing by sight or trailing by scent', 'Bloodhound, Dachshund, Greyhound'],
        ['Working', 'pulling sleds and carts, guarding flocks and homes', 'Boxer, Great Dane, Rottweiler'],
        ['Terrier', 'going after rodents and other vermin', 'Bull Terrier, Scottish Terrier, West Highland White Terrier'],
        ['Toy', 'being a companion small enough to sit on a lap', 'Chihuahua, Pug, Shih Tzu'],
        ['Non-Sporting', 'jobs that fit none of the other groups', 'Bulldog, Dalmatian, Poodle'],
        ['Herding', 'moving livestock such as sheep and cattle', 'Border Collie, German Shepherd Dog, Pembroke Welsh Corgi']
      ] } }
    ] },
    { h2: 'Draw your own dog', blocks: [
      { p: `To make a page that looks like your dog, describe it: the breed or the mix, the ears (floppy or pointed), the coat (curly, long or smooth), and one thing it always does, like carrying a ball. Print two copies: one to color as the dog really looks, and one in any colors your child likes.` }
    ] }
  ],
  faq: [
    { q: 'Which dog coloring pages suit toddlers?', a: `One puppy on Simple, sitting or lying down, with one toy. Leave parks, herding scenes and breed portraits for children of 5 and up.` },
    { q: 'What are the seven dog groups?', a: `Sporting, Hound, Working, Terrier, Toy, Non-Sporting and Herding: the groups breeds are shown in at American Kennel Club dog shows (AKC).` },
    { q: 'Can I make a coloring page of my own dog?', a: `Describe it in the prompt: breed or mix, ears, coat and a favorite toy. The generator draws a new picture from your words, so the page shows your dog's type rather than a copy of a photo.` },
    { q: 'Can I make dog coloring pages for adults?', a: `Yes: a pet portrait with fur drawn in separate locks, a dog in a detailed garden, or a pattern of paw prints. Choose Medium or Detailed; [adult coloring pages](/adult-coloring-pages) has paper tips.` },
    { q: 'Can I sell dog coloring pages I make here?', a: `With Pro, yes: it includes commercial use. Leave comic-strip, TV and film dogs out of anything you sell. Our [Etsy guide](/sell-coloring-books-on-etsy) covers fees, file limits and Etsy's rule that AI-made items must say so.` }
  ],
  sources: [
    { text: 'American Kennel Club: The seven AKC breed groups explained', href: 'https://www.akc.org/expert-advice/lifestyle/7-akc-dog-breed-groups-explained/' }
  ],
  cta: `Seven dog groups, seven pages: four days on the free plan. Pro makes them in one sitting, with no watermark and a commercial license, for $9 once.`,
  related: [
    { href: '/cat-coloring-pages', label: 'Cat coloring pages', note: 'kittens, cozy cats and real breeds' },
    { href: '/animal-coloring-pages', label: 'Animal coloring pages', note: 'black markings, life cycles, pet portraits' },
    { href: '/horse-coloring-pages', label: 'Horse coloring pages', note: 'ponies, foals and galloping horses' },
    { href: '/coloring-pages-for-classroom-teachers', label: 'Coloring pages for teachers', note: 'planning pages around a lesson' }
  ]
},

'mermaid-coloring-pages': {
  updated: '2026-10-16',
  checked: '16 October 2026',
  title: 'Mermaid Coloring Pages: Free Printables and a Generator',
  description: 'Free printable mermaid coloring pages: a mermaid on a rock for toddlers, an underwater reef for kids, and the sea animals some people link to the legend.',
  eyebrow: 'Mermaid coloring page generator',
  h1: 'Mermaid coloring pages, on the rocks and under the sea',
  lead: `Describe a mermaid and print it: a smiling mermaid on a rock for a toddler, a mermaid with a seagull by the waves for a first grader, a mermaid swimming through a coral reef for an older child. Below are prompts by age, how to color a tail scale by scale, and where the legend may have come from.`,
  name: 'mermaid coloring page',
  topic: 'mermaid coloring pages',
  recipesHeading: 'Mermaid prompts by age',
  toolHeading: 'Describe your mermaid page',
  defaultStyle: 'simple',
  presetPrompt: `a smiling mermaid with long wavy hair and a simple top, sitting on a rock holding a seashell, big simple shapes, no background`,
  chips: ['mermaid riding a dolphin', 'mermaid reading a book on a rock', 'merman with a trident and a sea turtle', 'mermaid and a manatee under the sea'],
  recipes: [
    { who: 'Ages 2 to 5', style: 'simple', prompt: `a smiling mermaid with long wavy hair and a simple top, sitting on a rock holding a seashell, big simple shapes, no background`, why: `One figure with a big tail and a shell: simple shapes and a happy face.` },
    { who: 'Ages 4 to 7', style: 'medium', prompt: `a mermaid with long wavy hair and a plain short-sleeved top sitting on a rock, waves and a seagull around her, clean bold outlines`, why: `Waves and a seagull add a seaside scene around one figure.` },
    { who: 'Ages 6 to 9', style: 'medium', prompt: `a mermaid with long braided hair and a simple top swimming among coral and seaweed with small fish and a starfish, clean bold outlines`, why: `An underwater scene with coral and fish to fill around the mermaid.` },
    { who: 'Ages 9 to 12', style: 'medium', prompt: `a mermaid and a manatee swimming side by side through seagrass, clean bold outlines`, why: `A legend next to one of the sea animals some people link it to (see below).` },
    { who: 'Teens and adults', style: 'medium', prompt: `a mermaid's tail curled on a rock, every scale drawn as a separate outline, with shells and starfish around it, clean bold lines`, why: `Hundreds of scales to color one by one, in two or three shades.` }
  ],
  sections: [
    { h2: 'Color the tail scale by scale', blocks: [
      { ul: [
        `**Rows of color.** Give each row of scales a slightly different shade, light at the waist and darker toward the fin.`,
        `**A pattern.** Repeat two colors across the scales, like a checkerboard.`,
        `**The fin last.** Color the fin in long strokes along its lines, so it looks as if it is moving.`
      ] }
    ] },
    { h2: 'Where the legend may have come from', blocks: [
      { p: `In European folklore, mermaids had the head and upper body of a human and the tail of a fish, and they loved music and often sang. Some people think sea mammals such as the dugong and the manatee, which nurse their young above water, lie behind the legend (Britannica). NOAA's answer to “are mermaids real?” is plain: no evidence of aquatic humanoids has ever been found (NOAA).` },
      { p: `A bronze Little Mermaid by Edvard Eriksen, made in 1913 after Hans Christian Andersen's fairy tale, is in Copenhagen harbor (Britannica).` }
    ] }
  ],
  faq: [
    { q: 'Which mermaid coloring pages suit toddlers?', a: `One mermaid on Simple, sitting on a rock or holding a shell. Leave reefs full of fish and coral for children of 5 and up.` },
    { q: 'Are mermaids real?', a: `No. NOAA says no evidence of aquatic humanoids has ever been found. Mermaids belong to folklore, and some people think manatees and dugongs helped the legend along (NOAA, Britannica).` },
    { q: 'How do I make a mermaid that is not a film character?', a: `Describe your own: the hair (braided, curly, short), the top, the tail and the setting. Leaving out film characters' names also keeps any page you sell free of trademarks.` },
    { q: 'Can I make a merman?', a: `Yes. Mermen appear alongside mermaids in European folklore (Britannica). Try “a merman with a trident and a sea turtle”.` },
    { q: 'Can I sell mermaid coloring pages I make here?', a: `With Pro, yes: it includes commercial use. Leave film characters out of anything you sell. Our [Etsy guide](/sell-coloring-books-on-etsy) covers fees, file limits and Etsy's rule that AI-made items must say so.` }
  ],
  sources: [
    { text: 'Britannica: Mermaid', href: 'https://www.britannica.com/topic/mermaid' },
    { text: 'NOAA Ocean Service: Are mermaids real?', href: 'https://oceanservice.noaa.gov/facts/mermaids.html' }
  ],
  cta: `Five mermaids for a party table take three days on the free plan. Pro makes them in one sitting, with no watermark and a commercial license, for $9 once.`,
  related: [
    { href: '/ocean-coloring-pages', label: 'Ocean coloring pages', note: 'sea turtles, reefs and whales' },
    { href: '/fairy-coloring-pages', label: 'Fairy coloring pages', note: 'fairy houses, wings and gardens' },
    { href: '/princess-coloring-pages', label: 'Princess coloring pages', note: 'fairy tales that are free to draw' },
    { href: '/unicorn-coloring-pages', label: 'Unicorn coloring pages', note: 'winged unicorns and party pages' }
  ]
},

'horse-coloring-pages': {
  updated: '2026-10-16',
  checked: '16 October 2026',
  title: 'Horse Coloring Pages: Ponies, Foals and Galloping Horses',
  description: 'Free printable horse coloring pages: a pony for toddlers, a galloping horse for kids, a saddled horse for young riders, and how horses are measured in hands.',
  eyebrow: 'Horse coloring page generator',
  h1: 'Horse coloring pages: ponies, foals and galloping horses',
  lead: `Describe a horse and print it: a pony in a meadow for a toddler, a horse galloping across a field for a first grader, a saddled horse at the stable door for a young rider. Below are prompts by age, how horses are measured, and how soon a newborn foal gets to its feet.`,
  name: 'horse coloring page',
  topic: 'horse coloring pages',
  recipesHeading: 'Horse prompts by age',
  toolHeading: 'Describe your horse page',
  defaultStyle: 'simple',
  presetPrompt: `a pony standing in a meadow with flowers, a long mane and tail, big simple shapes, no background`,
  chips: ['horse eating hay in a stable', 'pony with a braided mane and ribbons', 'horse and foal by a pond', 'cowboy boots and a horseshoe'],
  recipes: [
    { who: 'Ages 2 to 5', style: 'simple', prompt: `a pony standing in a meadow with flowers, a long mane and tail, big simple shapes, no background`, why: `A short pony with a big mane, easy to color in a few strokes.` },
    { who: 'Ages 6 to 9', style: 'medium', prompt: `a horse galloping across a field with its mane and tail flowing, clean bold outlines`, why: `Four legs in motion and a flowing mane: a page that feels fast.` },
    { who: 'Ages 7 to 10', style: 'medium', prompt: `a mare and her newborn foal standing in straw in a stable, clean bold outlines`, why: `For the foal facts below: a healthy foal is on its feet within an hour.` },
    { who: 'Ages 9 to 12', style: 'medium', prompt: `a horse wearing a saddle and bridle standing in front of a stable door, no signs or letters, clean bold outlines`, why: `The tack gives young riders parts to name while they color: saddle, bridle and reins.` },
    { who: 'Teens and adults', style: 'medium', prompt: `a horse's head in profile with a braided mane, every braid and strand drawn as a separate outline, clean bold lines`, why: `A detailed portrait with braids to fill one by one.` }
  ],
  sections: [
    { h2: 'How horses are measured', blocks: [
      { p: `Horses are measured at the highest point of the withers, in hands of four inches each (The Horse), so a horse of 15 hands stands 60 inches tall at the withers. Miniature Horses are measured at the withers too: to be registered with the American Miniature Horse Association, a horse cannot be taller than 34 inches (AMHA).` },
      { p: `That makes a quick math page: measure each child in inches, divide by four to get their height in hands, and write it on the horse page they color.` }
    ] },
    { h2: 'A newborn foal stands within an hour', blocks: [
      { p: `A healthy newborn foal should stand on its own within 1 hour of birth and start nursing within 2 hours, and after that foals nurse about every 30 minutes (Colorado State University Equine Reproduction Laboratory). The mare and foal prompt above makes a page to go with it.` }
    ] }
  ],
  faq: [
    { q: 'Which horse coloring pages suit toddlers?', a: `A pony on Simple: short legs, a big mane and a few flowers. Galloping horses, with four legs in motion, suit children of 6 and up.` },
    { q: 'How many inches is a hand?', a: `Four inches. Horses are measured in hands at the highest point of the withers (The Horse).` },
    { q: 'How small is a Miniature Horse?', a: `To be registered with the American Miniature Horse Association, no taller than 34 inches at the withers (AMHA).` },
    { q: 'How soon can a foal stand?', a: `A healthy foal should stand on its own within an hour of birth and nurse within two hours (Colorado State University).` },
    { q: 'Can I sell horse coloring pages I make here?', a: `With Pro, yes: it includes commercial use. Leave toy-brand and film characters out of anything you sell. Our [Etsy guide](/sell-coloring-books-on-etsy) covers fees, file limits and Etsy's rule that AI-made items must say so.` }
  ],
  sources: [
    { text: 'The Horse: How to measure a horse', href: 'https://thehorse.com/148636/how-to-measure-a-horse/' },
    { text: 'American Miniature Horse Association: About AMHA', href: 'https://www.amha.org/about-amha' },
    { text: 'Colorado State University Equine Reproduction Laboratory: Foaling out, easy as 1-2-3 (2024)', href: 'https://vetmedbiosci.colostate.edu/erl/2024/02/15/foaling-1-2-3/' }
  ],
  cta: `A pony, a foal and a galloping horse for three riders take two days on the free plan. Pro makes them in one sitting, with no watermark and a commercial license, for $9 once.`,
  related: [
    { href: '/unicorn-coloring-pages', label: 'Unicorn coloring pages', note: 'winged unicorns and party pages' },
    { href: '/animal-coloring-pages', label: 'Animal coloring pages', note: 'black markings, life cycles, pet portraits' },
    { href: '/dog-coloring-pages', label: 'Dog coloring pages', note: 'puppies and the seven dog groups' },
    { href: '/coloring-pages-for-classroom-teachers', label: 'Coloring pages for teachers', note: 'planning pages around a lesson' }
  ]
},

'fairy-coloring-pages': {
  updated: '2026-10-16',
  checked: '16 October 2026',
  title: 'Fairy Coloring Pages: Fairies, Fairy Houses and Gardens',
  description: 'Free printable fairy coloring pages: a fairy on a mushroom for toddlers, a fairy house in a tree stump for kids, and the plants folklore says fairies hold dear.',
  eyebrow: 'Fairy coloring page generator',
  h1: 'Fairy coloring pages: fairies, fairy houses and gardens',
  lead: `Describe a fairy and print it: a little fairy on a mushroom for a toddler, a fairy house in a tree stump for a first grader, a fairy flying through a flower garden for an older child. Below are prompts by age, a fairy garden to plan on paper, and what folklore says fairies are like.`,
  name: 'fairy coloring page',
  topic: 'fairy coloring pages',
  recipesHeading: 'Fairy prompts by age',
  toolHeading: 'Describe your fairy page',
  defaultStyle: 'simple',
  presetPrompt: `a little fairy with butterfly wings sitting on a mushroom, big simple shapes, no background`,
  chips: ['fairy asleep inside a tulip', 'fairy riding a snail', 'fairy door at the foot of a tree', 'fairy holding a lantern in a garden'],
  recipes: [
    { who: 'Ages 2 to 5', style: 'simple', prompt: `a little fairy with butterfly wings sitting on a mushroom, big simple shapes, no background`, why: `Butterfly wings and a spotted mushroom: big shapes for small hands.` },
    { who: 'Ages 4 to 7', style: 'medium', prompt: `a fairy house built into a tree stump with a round door, tiny windows, mushrooms and flowers around it, clean bold outlines`, why: `A house with nobody home yet, so children can draw their own fairy at the door.` },
    { who: 'Ages 6 to 9', style: 'medium', prompt: `a fairy with long hair and petal-shaped wings flying among tall flowers and butterflies, clean bold outlines`, why: `A flying figure among flowers, with wings to color like petals.` },
    { who: 'Ages 9 to 12', style: 'medium', prompt: `a fairy garden with foxgloves, a hawthorn tree, a tiny bridge and a fairy door, clean bold outlines`, why: `The plants folklore says fairies hold dear (see below).` },
    { who: 'Teens and adults', style: 'medium', prompt: `a fairy sitting on a crescent of leaves, her wings patterned like stained glass, clean bold outlines`, why: `Stained-glass wings give adults dozens of small shapes.` }
  ],
  sections: [
    { h2: 'Plan a fairy garden on paper', blocks: [
      { ul: [
        `**Start with the house.** Print the tree-stump house and draw a path to its door.`,
        `**Add the plants.** Folklore holds that hawthorn trees, foxglove and groundsel are so dear to fairies that harming them may anger the fairies (Britannica), so draw them around the house and keep them safe.`,
        `**Finish with a fairy.** Children draw their own fairy at the door, or color the flying fairy and cut it out.`
      ] }
    ] },
    { h2: 'What folklore says fairies are like', blocks: [
      { p: `In folklore a fairy can be many things: a small creature with green clothes and hair living underground, a delicate winged figure in white who lives in fairyland, or a tiny protective sprite by the household hearth. Fairies were said to be anything from human size down to 3 inches (7.5 cm) tall, and fairy lore is especially strong in Ireland, Cornwall, Wales and Scotland (Britannica).` },
      { p: `That gives three different pages to make: describe each kind and see which one children like best.` }
    ] }
  ],
  faq: [
    { q: 'Which fairy coloring pages suit toddlers?', a: `One fairy on Simple, sitting on a mushroom or a flower. Leave gardens full of flowers and butterflies for children of 5 and up.` },
    { q: 'How big are fairies in folklore?', a: `Anything from human size down to about 3 inches (7.5 cm), according to the legends Britannica describes.` },
    { q: 'How do I make a fairy that is not a film character?', a: `Describe your own fairy: the hair, the wings, the clothes and the setting. Leaving out film and toy characters' names also keeps any page you sell free of trademarks.` },
    { q: 'Can I make fairy coloring pages for adults?', a: `Yes: wings patterned like stained glass, a detailed fairy garden, or a fairy house with every shingle drawn. Choose Medium or Detailed; see [adult coloring pages](/adult-coloring-pages).` },
    { q: 'Can I sell fairy coloring pages I make here?', a: `With Pro, yes: it includes commercial use. Our [Etsy guide](/sell-coloring-books-on-etsy) covers fees, file limits and Etsy's rule that AI-made items must say so.` }
  ],
  sources: [
    { text: 'Britannica: Fairy', href: 'https://www.britannica.com/topic/fairy' }
  ],
  cta: `A fairy, a fairy house and a garden for three children take two days on the free plan. Pro makes them in one sitting, with no watermark and a commercial license, for $9 once.`,
  related: [
    { href: '/unicorn-coloring-pages', label: 'Unicorn coloring pages', note: 'winged unicorns and party pages' },
    { href: '/princess-coloring-pages', label: 'Princess coloring pages', note: 'fairy tales that are free to draw' },
    { href: '/butterfly-coloring-pages', label: 'Butterfly coloring pages', note: `a monarch's real colors` },
    { href: '/mermaid-coloring-pages', label: 'Mermaid coloring pages', note: 'on the rocks and under the sea' }
  ]
},

'butterfly-coloring-pages': {
  updated: '2026-10-16',
  checked: '16 October 2026',
  title: 'Butterfly Coloring Pages: Monarchs, Caterpillars and Gardens',
  description: 'Free printable butterfly coloring pages: spotted wings for toddlers, a caterpillar to butterfly page for kids, and how to color a monarch like the real thing.',
  eyebrow: 'Butterfly coloring page generator',
  h1: 'Butterfly coloring pages: monarchs, caterpillars and gardens',
  lead: `Describe a butterfly and print it: big spotted wings for a toddler, a caterpillar, a chrysalis and a butterfly for a first grader, a butterfly on a flower for an older child. Below are prompts by age, a monarch's real colors, and its life on milkweed.`,
  name: 'butterfly coloring page',
  topic: 'butterfly coloring pages',
  recipesHeading: 'Butterfly prompts by age',
  toolHeading: 'Describe your butterfly page',
  defaultStyle: 'simple',
  presetPrompt: `a butterfly with big symmetrical wings decorated with circles and dots, big simple shapes, no background`,
  chips: ['butterfly on a sunflower', 'caterpillar eating a leaf', 'butterfly with heart-shaped spots', 'butterflies around a watering can'],
  recipes: [
    { who: 'Ages 2 to 5', style: 'simple', prompt: `a butterfly with big symmetrical wings decorated with circles and dots, big simple shapes, no background`, why: `Both wings match, so children can copy each color from one side to the other.` },
    { who: 'Ages 4 to 7', style: 'simple', prompt: `a striped caterpillar on a leaf, a chrysalis hanging from a twig and a butterfly, no words, big simple shapes, no background`, why: `Three stages of the life cycle, to color in order.` },
    { who: 'Ages 6 to 9', style: 'medium', prompt: `a butterfly resting on a large flower with its wings open, each wing with a pattern of veins and spots, clean bold outlines`, why: `Veins divide the wings into many small shapes.` },
    { who: 'Ages 9 to 12', style: 'medium', prompt: `a monarch butterfly with its wings open, black veins and white spots along the wing edges drawn as outlines, clean bold outlines`, why: `Ready to color like a real monarch (see below).` },
    { who: 'Teens and adults', style: 'medium', prompt: `butterflies arranged in a circle like a mandala, each with a different wing pattern, clean bold outlines`, why: `A mandala made of butterflies, with every wing its own pattern.` }
  ],
  sections: [
    { h2: 'Color it like a real monarch', blocks: [
      { p: `Monarch wings are deep orange with black borders and veins and white spots along the edges, and males have two black spots on the hind wings. The caterpillar is striped with yellow, black and white bands, and the chrysalis is seafoam green with tiny yellow spots (National Wildlife Federation).` },
      { p: `The bright orange is a warning. Monarch caterpillars eat milkweed and store its toxins, which makes them taste bad to predators, and the protection lasts into the butterfly (NWF).` }
    ] },
    { h2: 'From egg to butterfly on milkweed', blocks: [
      { ul: [
        `**Egg:** laid on milkweed, the only plant monarch caterpillars eat. It hatches in three to five days.`,
        `**Caterpillar:** eats milkweed and grows for about two weeks.`,
        `**Chrysalis:** about two more weeks of change inside.`,
        `**Butterfly:** most adults live only a few weeks, but the generation that hatches in late summer migrates and can live upward of eight months (NWF).`
      ] },
      { p: `The caterpillar page above shows three of the four stages; children can add the egg themselves, a tiny dot on a leaf.` }
    ] }
  ],
  faq: [
    { q: 'Which butterfly coloring pages suit toddlers?', a: `One butterfly on Simple with big spots on matching wings. Gardens full of flowers suit children of 5 and up.` },
    { q: 'What do monarch caterpillars eat?', a: `Only milkweed. Monarchs lay their eggs on milkweed, the caterpillars' only host plant (National Wildlife Federation).` },
    { q: 'What colors is a monarch butterfly?', a: `Deep orange wings with black borders and veins and white spots along the edges, and a black body with white markings (NWF).` },
    { q: 'Where do monarchs go in winter?', a: `The eastern population migrates to the cool, high mountains of central Mexico, and the western population to coastal California (NWF).` },
    { q: 'Can I sell butterfly coloring pages I make here?', a: `With Pro, yes: it includes commercial use. Our [Etsy guide](/sell-coloring-books-on-etsy) covers fees, file limits and Etsy's rule that AI-made items must say so.` }
  ],
  sources: [
    { text: 'National Wildlife Federation: Monarch butterfly', href: 'https://www.nwf.org/Educational-Resources/Wildlife-Guide/Invertebrates/Monarch-Butterfly' }
  ],
  cta: `Four stages of the life cycle, one page each, take two days on the free plan. Pro makes them in one sitting, with no watermark and a commercial license, for $9 once.`,
  related: [
    { href: '/animal-coloring-pages', label: 'Animal coloring pages', note: 'black markings, life cycles, pet portraits' },
    { href: '/flower-coloring-pages', label: 'Flower coloring pages', note: 'roses, sunflowers and bouquets' },
    { href: '/fairy-coloring-pages', label: 'Fairy coloring pages', note: 'fairy houses, wings and gardens' },
    { href: '/coloring-pages-for-classroom-teachers', label: 'Coloring pages for teachers', note: 'planning pages around a lesson' }
  ]
},

'space-coloring-pages': {
  updated: '2026-10-16',
  checked: '16 October 2026',
  title: 'Space Coloring Pages: Rockets, Planets and Astronauts',
  description: 'Free printable space coloring pages: a rocket for toddlers, the Sun and eight planets for kids, an astronaut near the Moon, and NASA facts to color along with.',
  eyebrow: 'Space coloring page generator',
  h1: 'Space coloring pages: rockets, planets and astronauts',
  lead: `Describe a space scene and print it: a rocket passing the Moon for a toddler, the Sun and its eight planets for a first grader, an astronaut floating near the Moon for an older child. Below are prompts by age, the planets in order, and the first Moon landing.`,
  name: 'space coloring page',
  topic: 'space coloring pages',
  recipesHeading: 'Space prompts by age',
  toolHeading: 'Describe your space page',
  defaultStyle: 'simple',
  presetPrompt: `a rocket flying past the Moon and a ringed planet with stars, no letters, big simple shapes, no background`,
  chips: ['astronaut planting a garden on Mars', 'friendly alien waving from a flying saucer', 'Moon with craters and footprints', 'space station with solar panels'],
  recipes: [
    { who: 'Ages 2 to 5', style: 'simple', prompt: `a rocket flying past the Moon and a ringed planet with stars, no letters, big simple shapes, no background`, why: `A rocket, the Moon and a ringed planet: three big shapes and a few stars.` },
    { who: 'Ages 4 to 7', style: 'simple', prompt: `the Sun and the eight planets of the solar system arranged in a curved line across the whole page, Saturn with rings, no labels, big simple shapes`, why: `Count the planets before coloring, then write their names underneath (see below).` },
    { who: 'Ages 6 to 9', style: 'medium', prompt: `an astronaut floating in space near the Moon with Earth in the distance, stars drawn as outlines, no logos or letters, clean bold outlines, white background`, why: `Stars as outlines keep the sky white, and “no logos” keeps the suit plain.` },
    { who: 'Ages 9 to 12', style: 'medium', prompt: `a lunar lander standing on the Moon's surface with footprints in the dust and Earth in the sky, no flags or letters, clean bold outlines`, why: `A page to go with the Apollo 11 story below.` },
    { who: 'Teens and adults', style: 'medium', prompt: `a space station orbiting Earth with solar panels, modules and docking ports, no letters, clean bold outlines`, why: `Panels and modules in many small shapes.` }
  ],
  sections: [
    { h2: 'Color the planets in order', blocks: [
      { p: `Our solar system has eight planets: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus and Neptune. The first four have solid surfaces; Jupiter and Saturn are gas giants, and Uranus and Neptune are ice giants. Jupiter is the largest (NASA).` },
      { p: `Pluto counted as a planet until 2006, when astronomers agreed on a new definition and Pluto became a dwarf planet (NASA). Ask a class how many planets their parents learned.` },
      { p: `The generator cannot be relied on to write names, so print the solar system page and let children write each name under its planet.` }
    ] },
    { h2: 'The first Moon landing', blocks: [
      { p: `Apollo 11 launched on 16 July 1969 with Neil Armstrong, Buzz Aldrin and Michael Collins. Its goal, set by President John F. Kennedy in 1961, was to land a crew on the Moon and bring it home; the lunar module Eagle landed on the Moon, and the crew splashed down on 24 July 1969 (NASA).` },
      { p: `The lunar lander prompt above makes a page to go with the story. Leave flags and mission patches out of the prompt and draw them in by hand if you want them.` }
    ] }
  ],
  faq: [
    { q: 'Which space coloring pages suit toddlers?', a: `A rocket, the Moon or a single planet on Simple. Astronauts and space stations, with many small parts, suit children of 6 and up.` },
    { q: 'How many planets are there?', a: `Eight: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus and Neptune. Pluto has been a dwarf planet since 2006 (NASA).` },
    { q: 'Which planet is the biggest?', a: `Jupiter, the fifth planet from the Sun (NASA).` },
    { q: 'How do I keep a space page from printing black?', a: `Ask for a “white background” and “stars drawn as outlines”. A night sky or “dark space” turns most of the page black.` },
    { q: 'Can I sell space coloring pages I make here?', a: `With Pro, yes: it includes commercial use. Leave agency logos, mission patches and film characters out of anything you sell. Our [Etsy guide](/sell-coloring-books-on-etsy) covers fees, file limits and Etsy's rule that AI-made items must say so.` }
  ],
  sources: [
    { text: 'NASA Science: About the planets', href: 'https://science.nasa.gov/solar-system/planets/' },
    { text: 'NASA: Apollo 11', href: 'https://www.nasa.gov/mission/apollo-11/' }
  ],
  cta: `Eight planets, one page each, take four days on the free plan. Pro makes them in one sitting, with no watermark and a commercial license, for $9 once.`,
  related: [
    { href: '/ocean-coloring-pages', label: 'Ocean coloring pages', note: 'sea turtles, reefs and whales' },
    { href: '/car-coloring-pages', label: 'Car coloring pages', note: 'classic cars, race cars and road trips' },
    { href: '/dinosaur-coloring-pages', label: 'Dinosaur coloring pages', note: 'species that really lived together' },
    { href: '/coloring-pages-for-classroom-teachers', label: 'Coloring pages for teachers', note: 'planning pages around a lesson' }
  ]
},

'ocean-coloring-pages': {
  updated: '2026-10-16',
  checked: '16 October 2026',
  title: 'Ocean Coloring Pages: Sea Turtles, Coral Reefs and Whales',
  description: 'Free printable ocean coloring pages: a sea turtle for toddlers, an octopus by a treasure chest for kids, a whale with dolphins, and NOAA facts about the deep sea.',
  eyebrow: 'Ocean coloring page generator',
  h1: 'Ocean coloring pages: sea turtles, reefs and whales',
  lead: `Describe an ocean scene and print it: a sea turtle for a toddler, an octopus beside a treasure chest for a first grader, a whale and two dolphins for an older child. Below are prompts by age, the biggest animal that has ever lived, and how little of the deep ocean anyone has seen.`,
  name: 'ocean coloring page',
  topic: 'ocean coloring pages',
  recipesHeading: 'Ocean prompts by age',
  toolHeading: 'Describe your ocean page',
  defaultStyle: 'simple',
  presetPrompt: `a sea turtle swimming with bubbles, big simple shapes, no background`,
  chips: ['jellyfish with long trailing tentacles', 'crab on a sandy beach', 'shark swimming past coral', 'seahorse holding seagrass with its tail'],
  recipes: [
    { who: 'Ages 2 to 5', style: 'simple', prompt: `a sea turtle swimming with bubbles, big simple shapes, no background`, why: `A turtle with a patterned shell: each shell plate is its own shape.` },
    { who: 'Ages 4 to 7', style: 'medium', prompt: `an octopus waving its arms next to a treasure chest on the sea floor with shells and seaweed, clean bold outlines`, why: `Eight arms to count and color.` },
    { who: 'Ages 6 to 9', style: 'medium', prompt: `a whale and two dolphins swimming in the ocean below the waves, clean bold outlines`, why: `Big shapes and waves: a calm page for a quiet afternoon.` },
    { who: 'Ages 9 to 12', style: 'medium', prompt: `a coral reef with branching coral, sea anemones, an angelfish, a seahorse and a starfish, clean bold outlines`, why: `A busy reef with many separate animals.` },
    { who: 'Teens and adults', style: 'medium', prompt: `a cross-section of the ocean from the waves down to the deep sea floor, with a different animal at each depth, clean bold outlines`, why: `A page in layers, from sunlit water to the deep (see below).` }
  ],
  sections: [
    { h2: 'One ocean, five basins', blocks: [
      { p: `There is really one global ocean. It covers 71 percent of Earth and is divided into five named basins: the Arctic, Atlantic, Indian, Pacific and Southern (NOAA). Write the five names on the board and let each child choose the ocean their page shows.` }
    ] },
    { h2: 'The biggest animal that has ever lived', blocks: [
      { p: `Blue whales are the largest animals ever to live on our planet. In the Antarctic they can reach about 110 feet long and weigh more than 330,000 pounds, and they feed almost entirely on krill, tiny shrimp-like animals (NOAA Fisheries). Measure 110 feet across a playground or a gym, then color the whale page.` }
    ] },
    { h2: 'Most of the deep ocean is unseen', blocks: [
      { p: `More than 90 percent of the ocean is deep ocean, below 200 meters (656 feet), and explorers have seen less than 0.001 percent of the deep seafloor. As of April 2026, 28.7 percent of the global seafloor had been mapped with modern high-resolution sonar (NOAA Ocean Exploration).` },
      { p: `That leaves room for imagination: ask children to invent a deep-sea animal nobody has seen yet and draw it on the back of their page.` }
    ] }
  ],
  faq: [
    { q: 'Which ocean coloring pages suit toddlers?', a: `One sea animal on Simple: a turtle, a fish, a crab or a starfish. Reefs with many animals suit children of 6 and up.` },
    { q: 'How much of Earth does the ocean cover?', a: `About 71 percent (NOAA).` },
    { q: 'What is the biggest animal in the ocean?', a: `The blue whale, the largest animal ever to live on Earth (NOAA Fisheries).` },
    { q: 'How much of the ocean has been explored?', a: `Very little of the deep ocean: explorers have seen less than 0.001 percent of the deep seafloor (NOAA Ocean Exploration).` },
    { q: 'Can I sell ocean coloring pages I make here?', a: `With Pro, yes: it includes commercial use. Leave film characters out of anything you sell. Our [Etsy guide](/sell-coloring-books-on-etsy) covers fees, file limits and Etsy's rule that AI-made items must say so.` }
  ],
  sources: [
    { text: 'NOAA: Ocean and coasts', href: 'https://www.noaa.gov/education/resource-collections/ocean-coasts' },
    { text: 'NOAA Fisheries: Blue whale', href: 'https://www.fisheries.noaa.gov/species/blue-whale' },
    { text: 'NOAA Ocean Exploration: How much of the ocean has been explored?', href: 'https://oceanexplorer.noaa.gov/ocean-fact/explored/' }
  ],
  cta: `A turtle, an octopus, a whale and a reef for four tables take two days on the free plan. Pro makes them in one sitting, with no watermark and a commercial license, for $9 once.`,
  related: [
    { href: '/mermaid-coloring-pages', label: 'Mermaid coloring pages', note: 'on the rocks and under the sea' },
    { href: '/space-coloring-pages', label: 'Space coloring pages', note: 'rockets, planets and astronauts' },
    { href: '/animal-coloring-pages', label: 'Animal coloring pages', note: 'black markings, life cycles, pet portraits' },
    { href: '/coloring-pages-for-classroom-teachers', label: 'Coloring pages for teachers', note: 'planning pages around a lesson' }
  ]
},

// Christmas and winter guides added on 27 October 2026. Each title, heading and first sentence follows what people type
// into Google (suggest scan of 27 October 2026, notes in takip/devir/coloringpagemaker-sezon-NOTLAR.md).

'santa-coloring-pages': {
  updated: '2026-10-27',
  checked: '27 October 2026',
  title: 'Santa Coloring Pages: Free Printable PDFs for Kids and Adults',
  description: 'Free printable Santa coloring pages: a smiling face for toddlers, Santa with milk and cookies, Santa with his sack. Download a PNG or make your own.',
  eyebrow: 'Santa coloring page generator',
  h1: 'Santa coloring pages for kids and adults',
  lead: `Print free Santa coloring pages as a PNG or PDF, or describe your own Santa and have it drawn in under a minute. Three finished pages are below, from a smiling face for a toddler to Santa with his sack in the snow, and the prompts by age work for a Santa nobody has drawn yet.`,
  name: 'Santa coloring page',
  topic: 'Santa coloring pages',
  recipesHeading: 'Santa prompts by age',
  toolHeading: 'Describe your Santa page',
  defaultStyle: 'simple',
  presetPrompt: `a smiling Santa face with rosy cheeks, a round nose, a fluffy beard and a hat with a pom-pom, big simple shapes, no background`,
  chips: ['Santa waving from a chimney', 'Santa reading his list with a pencil', 'Santa on a rooftop with a sack of presents', 'Santa hat with a pom-pom and holly leaves'],
  recipes: [
    { who: 'Ages 2 to 5', style: 'simple', prompt: `a smiling Santa face with rosy cheeks, a round nose, a fluffy beard and a hat with a pom-pom, big simple shapes, no background`, why: `One big face, no body and no scene. The beard is a large shape that is easy to stay inside.` },
    { who: 'Ages 3 to 6', style: 'simple', prompt: `Santa standing next to a small Christmas tree and holding one wrapped present, big simple shapes, no background`, why: `Two objects and one person, all with thick outlines.` },
    { who: 'Ages 6 to 9', style: 'medium', prompt: `Santa standing by a fireplace holding a glass of milk and a plate of cookies, stockings above the fire, clean bold outlines`, why: `The glass and the cookies are small separate things to color, and the fire gives the page a warm corner.` },
    { who: 'Ages 9 to 12', style: 'medium', prompt: `Santa loading presents into a sleigh in front of a snowy barn, moon and stars drawn as outlines`, why: `A scene with a job in it. Outlined stars keep the sky white.` },
    { who: 'Teens and adults', style: 'detailed', prompt: `Santa Claus in a coat patterned with holly leaves and snowflakes, with an ornate scrollwork border around him`, why: `Pattern on the coat and a border turn a simple figure into a long page.` }
  ],
  sections: [
    { h2: 'Pick the page for the child', blocks: [
      { p: `Santa is easier to color than most people expect, because his shapes are big and round: the hat, the face, the beard, the belly. The part that decides how long a page lasts is the background.` },
      { table: { head: ['Page', 'What it asks of a child', 'Ages'], rows: [
        ['Santa face', 'Four or five big areas, no background', '2 to 5'],
        ['Santa and one object', 'A person, a tree or a present, thick lines', '3 to 6'],
        ['Santa with milk and cookies', 'Small separate details and a fire', '6 to 9'],
        ['Santa with a sack in the snow', 'Furry trim, a tree, snow hills', '6 to 12']
      ] } },
      { p: `The examples above are the face, the milk-and-cookies page and the sack in the snow. Download the one that matches the child, or use a prompt from the table to make a new one.` }
    ] },
    { h2: 'A letter to Santa on a coloring page', blocks: [
      { p: `Print the Santa face, have the child color it, then use the white space around it for a letter. The generator draws pictures and cannot be relied on to spell words, so write the words by hand. A page with the child's own writing on it also keeps well in a card or a box of Christmas keepsakes.` }
    ] },
    { h2: 'Where Santa comes from', blocks: [
      { p: `The story of Santa Claus begins with Saint Nicholas, a bishop of Myra whose feast day is 6 December (St Nicholas Center). His gift-giving stories are tied to the custom of children hanging up stockings for presents (St Nicholas Center).` },
      { p: `One Santa tradition in the United States started with a typo. In 1955 a Sears ad listed a phone number for children to call Santa, with a typo. The number reached the Continental Air Defense Command in Colorado, where Colonel Harry Shoup and his staff played along and told the children where Santa was. In 1958 Shoup organized a Santa-tracking program, and NORAD has kept the tradition going every year since (Smithsonian Magazine).` }
    ] }
  ],
  faq: [
    { q: 'Are these Santa coloring pages free to print?', a: `The three example pages download as PNG files for personal use, with no account and no watermark. The generator makes 2 free pages a day; its free PDF carries a watermark, and [Pro](https://dorukctn.gumroad.com/l/uynqt) removes it for $9 once.` },
    { q: 'Which Santa page suits a toddler?', a: `The smiling Santa face on Simple: one big shape for the hat, one for the face and one for the beard, with no background to color around.` },
    { q: 'Is there a Santa coloring page for adults?', a: `Choose Detailed and ask for pattern: a coat with holly or snowflakes, a scrollwork border. The [Christmas coloring pages for adults](/christmas-coloring-pages-for-adults) page has more detailed examples.` },
    { q: 'Who was Saint Nicholas?', a: `A bishop of Myra, remembered on 6 December, whose gift-giving stories are where the Santa Claus story starts (St Nicholas Center).` },
    { q: 'Can I sell Santa coloring pages I make here?', a: `With Pro, yes: it includes commercial use. Leave film, TV and brand characters out of anything you sell. Our [Etsy guide](/sell-coloring-books-on-etsy) covers fees, file limits and Etsy's rule that AI-made items must say so.` }
  ],
  sources: [
    { text: 'St Nicholas Center: Who is St Nicholas?', href: 'https://www.stnicholascenter.org/who-is-st-nicholas' },
    { text: 'Smithsonian Magazine: How NORAD got into the business of tracking Santa', href: 'https://www.smithsonianmag.com/smart-news/how-the-north-american-aerospace-defense-command-got-into-the-business-of-tracking-santa-180948196/' }
  ],
  cta: `A Santa page for each of eight children takes four days on the free plan. Pro makes them in one sitting, with no watermark and a commercial license, for $9 once.`,
  related: [
    { href: '/christmas-coloring-pages', label: 'Christmas coloring pages', note: 'with a 24-day Advent plan' },
    { href: '/reindeer-coloring-pages', label: 'Reindeer coloring pages', note: 'which reindeer still have antlers in December' },
    { href: '/christmas-tree-coloring-pages', label: 'Christmas tree coloring pages', note: 'a tree to decorate' },
    { href: '/christmas-coloring-pages-for-adults', label: 'Christmas coloring pages for adults', note: 'wreaths, a village street and a mandala' },
    { href: '/snowman-coloring-pages', label: 'Snowman coloring pages', note: 'a blank snowman to dress' },
    { href: '/gingerbread-coloring-pages', label: 'Gingerbread coloring pages', note: 'cookies and candy houses' },
    { href: '/elf-coloring-pages', label: 'Elf coloring pages', note: 'tested prompts for a Christmas elf' },
    { href: '/custom-christmas-coloring-book', label: 'Custom Christmas coloring book', note: 'a 12-page homemade gift' }
  ]
},

'reindeer-coloring-pages': {
  updated: '2026-10-27',
  checked: '27 October 2026',
  title: 'Reindeer Coloring Pages: Free Printable PDFs for Kids and Adults',
  description: 'Free printable reindeer coloring pages: harness bells, a striped scarf, a stag in a snowy forest, and which reindeer keep their antlers in December.',
  eyebrow: 'Reindeer coloring page generator',
  h1: 'Reindeer coloring pages for kids and adults',
  lead: `Print free reindeer coloring pages as a PNG or PDF, or describe your own reindeer and have it drawn in under a minute. The three pages below run from a reindeer with harness bells for a toddler to a big stag in a snowy pine forest, and the section on antlers tells you what a December reindeer really looks like.`,
  name: 'reindeer coloring page',
  topic: 'reindeer coloring pages',
  recipesHeading: 'Reindeer prompts by age',
  toolHeading: 'Describe your reindeer page',
  defaultStyle: 'simple',
  presetPrompt: `a cute reindeer standing, with big branching antlers, a round nose and a bell on its collar, big simple shapes, no background`,
  chips: ['two reindeer pulling a sleigh over rooftops', 'baby reindeer with small antlers in the snow', 'reindeer wearing a knitted hat and mittens', 'reindeer head with antlers wrapped in a garland'],
  recipes: [
    { who: 'Ages 2 to 5', style: 'simple', prompt: `a cute reindeer standing, with big branching antlers, a round nose and a bell on its collar, big simple shapes, no background`, why: `One animal in a plain stance. The antlers are the only complicated part, and they stay large.` },
    { who: 'Ages 3 to 6', style: 'simple', prompt: `a reindeer face with big antlers and a striped scarf, big simple shapes, no background`, why: `A face and a scarf: the scarf stripes give a young child something to choose colors for.` },
    { who: 'Ages 6 to 9', style: 'medium', prompt: `a mother reindeer and her calf walking through snow between pine trees, clean bold outlines`, why: `Two animals of different sizes, and a calf's antlers are small, so there are fewer branches to draw.` },
    { who: 'Ages 9 to 12', style: 'medium', prompt: `two reindeer pulling a sleigh full of presents over snowy rooftops, moon and stars drawn as outlines`, why: `The classic scene. Outlined stars keep the sky white.` },
    { who: 'Teens and adults', style: 'detailed', prompt: `a reindeer with antlers made of swirling patterns, snowflakes and stars filling the space around it`, why: `Pattern in the antlers is the point of the page, and the snowflakes give a long, repeating background.` }
  ],
  sections: [
    { h2: 'Which reindeer have antlers in December', blocks: [
      { p: `Cows keep their antlers longer than the biggest bulls do, which matters for a Christmas picture. According to the Alaska Department of Fish and Game, the largest bulls shed their antlers in late October. Small bulls and cows that are not pregnant shed theirs in April, and pregnant cows usually keep theirs until their calves are born in late May.` },
      { p: `So a reindeer wearing antlers in December is, in real life, most likely a cow or a small bull. Alaska's own page on Santa's reindeer says it is not known when or if Santa's reindeer shed theirs. For a coloring page the antlers stay on.` }
    ] },
    { h2: 'Reindeer or caribou', blocks: [
      { p: `Reindeer and caribou are the same species, Rangifer tarandus. The names follow geography and domestication: in Europe and Asia the animal is a reindeer, and in North America it is a caribou, with “reindeer” kept in Alaska and Canada for the semi-domesticated form (University of Alaska Fairbanks; Alaska Department of Fish and Game).` },
      { p: `For a class, print the reindeer in the snowy forest and ask children to write which of the two names they would use in their own country.` }
    ] },
    { h2: 'Antlers are the hard part', blocks: [
      { p: `Branching antlers are where line art goes wrong, with branches that merge into a blob. Three words help the prompt: “big”, “branching” and “with a few points each”. If the antlers come back as a tangle, generate the page again, or ask for “a reindeer head, front view”, where the antlers are symmetrical.` }
    ] }
  ],
  faq: [
    { q: 'Are these reindeer coloring pages free to print?', a: `The three example pages download as PNG files for personal use, with no account and no watermark. The generator makes 2 free pages a day; its free PDF carries a watermark, and [Pro](https://dorukctn.gumroad.com/l/uynqt) removes it for $9 once.` },
    { q: 'Which reindeer page suits a toddler?', a: `A single reindeer on Simple, standing, with a bell or a scarf for color. Keep antlers big and leave forests and sleighs until 5 or 6.` },
    { q: 'Do reindeer have antlers in winter?', a: `Many do. The largest bulls shed theirs in late October, but small bulls and cows that are not pregnant keep them until April, and pregnant cows keep theirs until calving in late May (Alaska Department of Fish and Game).` },
    { q: 'Are reindeer and caribou the same animal?', a: `Yes, one species, Rangifer tarandus. Europe and Asia say reindeer and North America says caribou (University of Alaska Fairbanks).` },
    { q: 'Can I sell reindeer coloring pages I make here?', a: `With Pro, yes: it includes commercial use. Leave film, TV and song characters out of anything you sell. Our [Etsy guide](/sell-coloring-books-on-etsy) covers fees, file limits and Etsy's rule that AI-made items must say so.` }
  ],
  sources: [
    { text: 'Alaska Department of Fish and Game: Santa\'s reindeer species profile', href: 'https://www.adfg.alaska.gov/index.cfm?adfg=santasreindeer.main' },
    { text: 'University of Alaska Fairbanks: Reindeer', href: 'https://www.uaf.edu/lars/animals/reindeer.php' }
  ],
  cta: `A reindeer page for each of eight children takes four days on the free plan. Pro makes them in one sitting, with no watermark and a commercial license, for $9 once.`,
  related: [
    { href: '/santa-coloring-pages', label: 'Santa coloring pages', note: 'a smiling face to a sack in the snow' },
    { href: '/christmas-coloring-pages', label: 'Christmas coloring pages', note: 'with a 24-day Advent plan' },
    { href: '/winter-coloring-pages', label: 'Winter coloring pages', note: 'snow days, snowflakes and polar animals' },
    { href: '/animal-coloring-pages', label: 'Animal coloring pages', note: 'life cycles and pet portraits' },
    { href: '/christmas-coloring-pages-for-adults', label: 'Christmas coloring pages for adults', note: 'wreaths, a village street and a mandala' },
    { href: '/elf-coloring-pages', label: 'Elf coloring pages', note: 'tested prompts for a Christmas elf' }
  ]
},

'christmas-tree-coloring-pages': {
  updated: '2026-10-27',
  checked: '27 October 2026',
  title: 'Christmas Tree Coloring Pages: Free Printable PDFs for Kids',
  description: 'Free printable Christmas tree coloring pages: a tree with three presents for toddlers, a tree with a garland, a tree by the window. Download or make your own.',
  eyebrow: 'Christmas tree coloring page generator',
  h1: 'Christmas tree coloring pages for kids and adults',
  lead: `Print free Christmas tree coloring pages as a PNG or PDF, or describe your own tree and have it drawn in under a minute. The three pages below go from a tree with three presents for a toddler to a decorated tree by a window, and one prompt makes a bare tree for children to decorate themselves.`,
  name: 'Christmas tree coloring page',
  topic: 'Christmas tree coloring pages',
  recipesHeading: 'Christmas tree prompts by age',
  toolHeading: 'Describe your Christmas tree page',
  defaultStyle: 'simple',
  presetPrompt: `one big Christmas tree with round ornaments and a star on top, three wrapped presents at its base, big simple shapes, no background`,
  chips: ['Christmas tree with a train circling the base', 'tree with a cat sitting under it', 'tiny table-top tree in a pot', 'tree seen through a snowy window'],
  recipes: [
    { who: 'Ages 2 to 5', style: 'simple', prompt: `one big Christmas tree with round ornaments and a star on top, three wrapped presents at its base, big simple shapes, no background`, why: `One tree, a few big circles and three boxes: the easiest Christmas page there is.` },
    { who: 'Ages 3 to 6', style: 'simple', prompt: `a Christmas tree with no ornaments, only a star on top and a thick trunk, big simple shapes, no background`, why: `A bare tree. Children draw the ornaments and lights themselves, then color them (see below).` },
    { who: 'Ages 6 to 9', style: 'medium', prompt: `a Christmas tree with round ornaments, a swirling garland and a star, standing on a round tree stand`, why: `The garland is one long shape that winds through the whole page.` },
    { who: 'Ages 9 to 12', style: 'medium', prompt: `a living room with a decorated Christmas tree, a fireplace with stockings and presents on the floor, clean bold outlines`, why: `Many separate objects, so the page can last more than one sitting.` },
    { who: 'Teens and adults', style: 'detailed', prompt: `a tall Christmas tree filled with zentangle patterns, with a different pattern in each ornament and a patterned star`, why: `Every ornament is a separate pattern to fill, and the tree shape holds the page together.` }
  ],
  sections: [
    { h2: 'Draw the ornaments yourself', blocks: [
      { p: `The bare tree prompt above gives every child the same green shape. What goes on it is up to the child:` },
      { ul: [
        `**Ornaments.** Circles, stars, bells, candy canes. Draw them in pencil first, then color.`,
        `**Lights.** A string of small circles zigzagging down from the star. Count them: a page with 20 lights is also a counting exercise.`,
        `**Presents.** Rectangles with a ribbon and a bow under the tree, each one a different size.`
      ] },
      { p: `For a class, print one bare tree for each child and hang the finished trees in a row. No two will look alike.` }
    ] },
    { h2: 'The first Rockefeller Center tree', blocks: [
      { p: `The famous tree in New York began small. In December 1931, construction workers at Rockefeller Center pooled their money for a 20-foot balsam fir, decorated it with handmade garlands from their families and raised it on Christmas Eve. Two years later, in 1933, the tree became an annual tradition (Rockefeller Center).` },
      { p: `Measure 20 feet along a wall or a hallway with a tape measure. Then ask children how many of them would have to stand on each other's shoulders to reach the top of that first tree.` }
    ] },
    { h2: 'Print the tree as a card or a tag', blocks: [
      { p: `Print at 4 pages per sheet in your printer settings for four small trees on one letter page. Cut them apart, color them and glue each to a folded piece of card for a Christmas card, or punch a hole at the top for a gift tag.` }
    ] }
  ],
  faq: [
    { q: 'Are these Christmas tree coloring pages free to print?', a: `The three example pages download as PNG files for personal use, with no account and no watermark. The generator makes 2 free pages a day; its free PDF carries a watermark, and [Pro](https://dorukctn.gumroad.com/l/uynqt) removes it for $9 once.` },
    { q: 'Which Christmas tree page suits a toddler?', a: `One tree with a few big ornaments and presents on Simple. Leave rooms, fireplaces and garlands until 6 or older.` },
    { q: 'Can I get a bare tree for children to decorate?', a: `Yes. Ask for “a Christmas tree with no ornaments, only a star on top and a thick trunk”. If ornaments appear anyway, generate the page again.` },
    { q: 'Are there Christmas tree coloring pages for adults?', a: `Choose Detailed and ask for pattern: a tree filled with zentangle designs, or a tree inside a wreath. [Christmas coloring pages for adults](/christmas-coloring-pages-for-adults) has detailed examples.` },
    { q: 'How tall was the first Rockefeller Center Christmas tree?', a: `About 20 feet: a balsam fir that construction workers bought together and raised on Christmas Eve in 1931 (Rockefeller Center).` }
  ],
  sources: [
    { text: 'Rockefeller Center: Christmas tree', href: 'https://www.rockefellercenter.com/holidays/rockefeller-center-christmas-tree/' }
  ],
  cta: `A different tree for each of eight children takes four days on the free plan. Pro makes them in one sitting, with no watermark and a commercial license, for $9 once.`,
  related: [
    { href: '/christmas-coloring-pages', label: 'Christmas coloring pages', note: 'with a 24-day Advent plan' },
    { href: '/christmas-ornament-coloring-pages', label: 'Christmas ornament coloring pages', note: 'blank baubles to design and cut out' },
    { href: '/santa-coloring-pages', label: 'Santa coloring pages', note: 'a smiling face to a sack in the snow' },
    { href: '/gingerbread-coloring-pages', label: 'Gingerbread coloring pages', note: 'cookies and candy houses' },
    { href: '/christmas-coloring-pages-for-adults', label: 'Christmas coloring pages for adults', note: 'wreaths, a village street and a mandala' }
  ]
},

'christmas-ornament-coloring-pages': {
  updated: '2026-10-27',
  checked: '27 October 2026',
  title: 'Christmas Ornament Coloring Pages: Free Printable PDFs for Kids',
  description: 'Free printable Christmas ornament coloring pages: a blank ball to design, a snowflake bauble and three patterned ornaments. Color, cut out and hang them.',
  eyebrow: 'Christmas ornament coloring page generator',
  h1: 'Christmas ornament coloring pages for kids and adults',
  lead: `Print free Christmas ornament coloring pages as a PNG or PDF, then color, cut out and hang them on the tree. One page is a blank ball for children to design, one has a snowflake in the middle, and one has three patterned ornaments for older colorists.`,
  name: 'Christmas ornament coloring page',
  topic: 'Christmas ornament coloring pages',
  recipesHeading: 'Christmas ornament prompts by age',
  toolHeading: 'Describe your Christmas ornament page',
  defaultStyle: 'simple',
  presetPrompt: `one big round Christmas ornament with a bow at the top and nothing drawn on the ball, big simple shapes, no background`,
  chips: ['star ornament with a ribbon loop', 'bell ornament with a bow', 'ornament shaped like a gingerbread man', 'five ornaments hanging from one garland'],
  recipes: [
    { who: 'Ages 2 to 5', style: 'simple', prompt: `one big round Christmas ornament with a bow at the top and nothing drawn on the ball, big simple shapes, no background`, why: `An empty ball. The child draws the pattern and colors it, so no two ornaments match.` },
    { who: 'Ages 3 to 6', style: 'simple', prompt: `three round ornaments hanging from a branch, each with a different stripe or dot pattern, big simple shapes`, why: `Three balls with simple patterns, each one a separate area to color.` },
    { who: 'Ages 6 to 9', style: 'medium', prompt: `a round Christmas ornament with a big snowflake in the center ringed by small dots, hanging from a bow`, why: `One clear design with a ring of dots, which gives careful colorers something to do.` },
    { who: 'Ages 9 to 12', style: 'medium', prompt: `five ornaments hanging from a garland: a ball, a star, a bell, a candy cane and a gingerbread man`, why: `Five different shapes, so the page can become a set of tree decorations.` },
    { who: 'Teens and adults', style: 'detailed', prompt: `three round Christmas ornaments with ornate flower and swirl patterns hanging from a pine branch`, why: `Dense pattern inside round shapes, the same kind of page as a mandala.` }
  ],
  sections: [
    { h2: 'From coloring page to tree ornament', blocks: [
      { p: `Every page downloads as a letter-size PDF, and your printer's “pages per sheet” setting shrinks it without any editing:` },
      { ul: [
        `**Print on cardstock.** Plain paper goes limp on a tree. Cardstock keeps its shape.`,
        `**Four to a sheet.** At 4 pages per sheet each picture comes out just under 4 inches across, a good size for a tree.`,
        `**Cut around the outline, punch a hole and tie on ribbon.** Color the back too, or glue two pages back to back so the ornament has no blank side.`
      ] },
      { p: `Print the blank ornament for a whole class. Each child's ball is different, and the finished set looks like a real tree of glass baubles.` }
    ] },
    { h2: 'Where glass ornaments come from', blocks: [
      { p: `Mold-blown glass ornaments were first made in Lauscha, a small glassmaking town in Germany. F. W. Woolworth's stores began selling Lauscha ornaments in the United States in 1880 (Wikipedia, “Christmas ornament”). Sources differ on the exact years.` }
    ] },
    { h2: 'Coloring a mandala-style ornament', blocks: [
      { p: `The patterned ornaments are round, so they color like mandalas. In a 2005 experiment, 84 students who had been made briefly anxious colored a mandala, a plaid pattern or a blank sheet for 20 minutes. Anxiety fell about the same after the mandala and the plaid, and more than after the blank sheet (Curry and Kasser, Art Therapy). One small study is not a treatment, which our [article on adult coloring and anxiety](/adult-coloring-mental-health-benefits) explains.` }
    ] }
  ],
  faq: [
    { q: 'Are these Christmas ornament coloring pages free to print?', a: `The three example pages download as PNG files for personal use, with no account and no watermark. The generator makes 2 free pages a day; its free PDF carries a watermark, and [Pro](https://dorukctn.gumroad.com/l/uynqt) removes it for $9 once.` },
    { q: 'How do I turn a coloring page into an ornament?', a: `Print it on cardstock at 4 pages per sheet, color it, cut around the outline, punch a hole at the top and tie on a ribbon.` },
    { q: 'Can I get a blank ornament for children to design?', a: `Yes. Ask for “one big round Christmas ornament with a bow at the top and nothing drawn on the ball”. If a pattern appears anyway, generate the page again.` },
    { q: 'Are there Christmas ornament coloring pages for adults?', a: `Choose Detailed and ask for pattern inside round shapes: flowers, swirls, snowflakes. [Christmas coloring pages for adults](/christmas-coloring-pages-for-adults) has an ornament mandala.` },
    { q: 'Can I sell ornament coloring pages I make here?', a: `With Pro, yes: it includes commercial use. Our [Etsy guide](/sell-coloring-books-on-etsy) covers fees, file limits and Etsy's rule that AI-made items must say so.` }
  ],
  sources: [
    { text: 'Wikipedia: Christmas ornament', href: 'https://en.wikipedia.org/wiki/Christmas_ornament' },
    { text: 'Curry and Kasser (2005), Can coloring mandalas reduce anxiety? Art Therapy 22(2)', href: 'https://doi.org/10.1080/07421656.2005.10129441' }
  ],
  cta: `A blank ornament for every child in a class is one page and a photocopier. Pro makes a different set for each table in one sitting, with no watermark and a commercial license, for $9 once.`,
  related: [
    { href: '/christmas-tree-coloring-pages', label: 'Christmas tree coloring pages', note: 'a tree to decorate' },
    { href: '/christmas-coloring-pages', label: 'Christmas coloring pages', note: 'with a 24-day Advent plan, cards and ornaments' },
    { href: '/snowflake-coloring-pages', label: 'Snowflake coloring pages', note: 'the snow crystal types and a paper snowflake' },
    { href: '/mandala-coloring-pages', label: 'Mandala coloring pages', note: 'symmetrical designs for a quiet evening' },
    { href: '/christmas-coloring-pages-for-adults', label: 'Christmas coloring pages for adults', note: 'wreaths, a village street and a mandala' },
    { href: '/custom-christmas-coloring-book', label: 'Custom Christmas coloring book', note: 'a 12-page homemade gift' }
  ]
},

'snowflake-coloring-pages': {
  updated: '2026-10-27',
  checked: '27 October 2026',
  title: 'Snowflake Coloring Pages: Free Printable PDFs for Kids and Adults',
  description: 'Free printable snowflake coloring pages: four simple snowflakes, a window of snowflakes and one fern-armed snowflake, with the real snow crystal types.',
  eyebrow: 'Snowflake coloring page generator',
  h1: 'Snowflake coloring pages for kids and adults',
  lead: `Print free snowflake coloring pages as a PNG or PDF, or describe your own and have it drawn in under a minute. The three pages below go from four simple snowflakes for a toddler to one large snowflake with fern-like arms, and the guide shows which real snow crystal each one looks like.`,
  name: 'snowflake coloring page',
  topic: 'snowflake coloring pages',
  recipesHeading: 'Snowflake prompts by age',
  toolHeading: 'Describe your snowflake page',
  defaultStyle: 'simple',
  presetPrompt: `four snowflakes of different sizes with six short arms each, spaced apart with small dots between them, big simple shapes, no background`,
  chips: ['one big snowflake with a star in the center', 'snowflakes falling over a snowy village', 'a snowflake made of six small leaves', 'a hexagonal snow crystal with a hole pattern'],
  recipes: [
    { who: 'Ages 2 to 5', style: 'simple', prompt: `four snowflakes of different sizes with six short arms each, spaced apart with small dots between them, big simple shapes, no background`, why: `Four separate shapes with plain arms. Each is small enough to finish in one go.` },
    { who: 'Ages 3 to 6', style: 'simple', prompt: `one big snowflake with six thick arms and a star in the center, big simple shapes, no background`, why: `One snowflake filling the page, with thick arms that are easy to stay inside.` },
    { who: 'Ages 6 to 9', style: 'medium', prompt: `a window with curtains at both sides and snowflakes of different sizes on the glass, clean bold outlines`, why: `A frame to color first, then snowflakes of different sizes.` },
    { who: 'Ages 9 to 12', style: 'medium', prompt: `a large flat hexagonal snow crystal with a ring pattern and six arms, clean bold outlines`, why: `A plate-type crystal, which pairs with the crystal types below.` },
    { who: 'Teens and adults', style: 'detailed', prompt: `one large snowflake with six long branching arms and many small side branches like a fern`, why: `A branching snowflake gives long lines to color along, with symmetry to keep the eye moving.` }
  ],
  sections: [
    { h2: 'Not every snowflake is a six-pointed star', blocks: [
      { p: `A snow crystal grows from a hexagonal ice prism, but not every one ends up looking like a star. SnowCrystals.com, run by the Caltech physicist Kenneth Libbrecht, names several basic forms. Each of them makes a different coloring page:` },
      { table: { head: ['Crystal', 'What it looks like', 'Ask for'], rows: [
        ['Stellar dendrite', 'A star with branches and side branches, the most recognizable snow crystal', '“six long branching arms with small side branches like a fern”'],
        ['Stellar plate', 'A flat star with broad, plate-like arms', '“a flat six-sided snowflake with a pattern in each arm”'],
        ['Column', 'A hexagonal prism, small and easy to miss', '“a six-sided column with flat ends”'],
        ['Needle', 'A column grown long and thin', '“thin ice needles in a cluster”'],
        ['Capped column', 'A column with a plate on each end', '“a six-sided column with a flat disc at each end”']
      ] } },
      { p: `SnowCrystals.com also notes that not all snowflakes look like six-pointed stars, though many do, and that fernlike stellar dendrites are not perfectly symmetrical. For why so many have six, see [winter coloring pages](/winter-coloring-pages).` }
    ] },
    { h2: 'The man who photographed snowflakes first', blocks: [
      { p: `Guinness World Records lists Wilson Bentley as the first person to photograph a single snow crystal. He took the picture on 15 January 1885 on his family's farm near Jericho, Vermont (Guinness World Records). Print the fern-armed snowflake and ask children to compare its branches with a photograph of a stellar dendrite online.` }
    ] },
    { h2: 'Fold a six-point paper snowflake', blocks: [
      { p: `A snowflake on paper has six arms because you fold the paper into six layers:` },
      { ul: [
        `Start with a round sheet of paper: trace a plate and cut it out.`,
        `Fold it in half, then fold the half into thirds, like a fan.`,
        `Cut small shapes out of the edges, then unfold it.`
      ] },
      { p: `Color the printed snowflake pages first, then cut out the snowflakes along the outline and hang them in a window.` }
    ] }
  ],
  faq: [
    { q: 'Are these snowflake coloring pages free to print?', a: `The three example pages download as PNG files for personal use, with no account and no watermark. The generator makes 2 free pages a day; its free PDF carries a watermark, and [Pro](https://dorukctn.gumroad.com/l/uynqt) removes it for $9 once.` },
    { q: 'Do all snowflakes have six points?', a: `No. Many do, but snow crystals also grow as columns, needles, triangles and twelve-branched forms, and the fernlike ones are not perfectly symmetrical (SnowCrystals.com).` },
    { q: 'Which snowflake page suits a toddler?', a: `Four or five snowflakes with short, thick arms on Simple, like the first example. Leave fern-like detail for 9 and older.` },
    { q: 'Who took the first photograph of a snowflake?', a: `Wilson Bentley, on 15 January 1885, near Jericho, Vermont (Guinness World Records).` },
    { q: 'Are there snowflake coloring pages for adults?', a: `Choose Detailed and ask for branching arms with many small side branches, or a snowflake mandala with a pattern in every arm.` }
  ],
  sources: [
    { text: 'SnowCrystals.com: Snowflake and snow crystal guide (Kenneth Libbrecht, Caltech)', href: 'https://www.snowcrystals.com/guide/guide.html' },
    { text: 'Guinness World Records: First photograph of a snowflake', href: 'https://www.guinnessworldrecords.com/world-records/606626-first-photograph-of-a-snowflake' }
  ],
  cta: `A different snowflake page for each of eight children takes four days on the free plan. Pro makes them in one sitting, with no watermark and a commercial license, for $9 once.`,
  related: [
    { href: '/winter-coloring-pages', label: 'Winter coloring pages', note: 'snow days, snowflakes and polar animals' },
    { href: '/snowman-coloring-pages', label: 'Snowman coloring pages', note: 'a blank snowman to dress' },
    { href: '/christmas-ornament-coloring-pages', label: 'Christmas ornament coloring pages', note: 'blank baubles to design and cut out' },
    { href: '/mandala-coloring-pages', label: 'Mandala coloring pages', note: 'symmetrical designs for a quiet evening' },
    { href: '/christmas-coloring-pages', label: 'Christmas coloring pages', note: 'with a 24-day Advent plan' }
  ]
},

'christmas-coloring-pages-for-adults': {
  updated: '2026-10-27',
  checked: '27 October 2026',
  title: 'Christmas Coloring Pages for Adults: Free Printable PDFs',
  description: 'Free printable Christmas coloring pages for adults: a holly wreath, a snowy village street and an ornament mandala, plus prompts to make more.',
  eyebrow: 'Adult Christmas coloring page generator',
  h1: 'Christmas coloring pages for adults',
  lead: `Print free Christmas coloring pages for adults as a PNG or PDF, or describe your own and have a detailed page drawn in under a minute. The three pages below are a holly wreath, a snowy village street and a mandala made of ornaments, each with enough pattern for an evening.`,
  name: 'adult Christmas coloring page',
  topic: 'Christmas coloring pages for adults',
  recipesHeading: 'Adult Christmas prompts',
  toolHeading: 'Describe your Christmas page',
  defaultStyle: 'detailed',
  presetPrompt: `a round Christmas wreath filled with holly leaves, berries, pine cones and a ribbon bow, with patterned ornaments`,
  chips: ['a knitted Christmas sweater pattern with reindeer and snowflakes', 'a snowy cabin with a wreath on the door', 'a poinsettia with patterned petals', 'a row of nutcrackers with patterned uniforms'],
  recipes: [
    { who: 'Pattern lovers', style: 'detailed', prompt: `a round Christmas wreath filled with holly leaves, berries, pine cones and a ribbon bow, with patterned ornaments`, why: `Dense natural detail in a round frame. Every leaf and berry is a separate area.` },
    { who: 'Scene lovers', style: 'detailed', prompt: `a snowy Christmas village street with small houses, a church, lamp posts, wreaths on the doors and a decorated tree in the square`, why: `Architecture gives the dense, repeating detail adults like, with a sky left white for snowflakes.` },
    { who: 'Mandala fans', style: 'detailed', prompt: `a round mandala made of Christmas ornaments, stars, holly leaves and candy canes`, why: `A symmetrical page where one pattern repeats around the center.` },
    { who: 'Knitters', style: 'detailed', prompt: `a pattern of reindeer, snowflakes and pine trees in rows, like the yoke of a knitted Christmas sweater`, why: `Rows of repeating shapes that look good in two or three colors.` },
    { who: 'Calm and easy', style: 'medium', prompt: `a single large poinsettia with big petals and a ribbon bow, clean bold outlines`, why: `Bold outlines and large areas, for an easy evening or for eyes that tire quickly.` }
  ],
  sections: [
    { h2: 'Choose a pattern, not just a scene', blocks: [
      { p: `Detailed pages are not all the same. The three examples above show three kinds, and the words in your prompt choose between them:` },
      { table: { head: ['Kind', 'Words to use', 'Example above'], rows: [
        ['Natural detail', 'holly, berries, pine cones, ribbon', 'Holly wreath'],
        ['Architecture', 'village, church, lamp posts, wreaths on doors', 'Snowy village street'],
        ['Repeating pattern', 'mandala, ornaments, stars, symmetrical', 'Ornament mandala']
      ] } },
      { p: `Leave out “dark night” and “silhouette”, which pull the page toward solid black. Write “snow and stars drawn as outlines” and the sky stays white.` }
    ] },
    { h2: 'Print and paper', blocks: [
      { p: `Pages download as 1024-pixel images, about 136 dots per inch on a letter sheet. That is fine for pencils and pens at home. Plain printer paper wrinkles under wet markers, so use heavier paper for markers, or put a spare sheet behind the page.` },
      { ul: [
        `**Pencils.** Print on plain paper and work from light to dark.`,
        `**Gel pens and fine markers.** Heavier paper stops ink showing through to the back.`,
        `**Whole sets.** Print the wreath, the village and the mandala together and color one a night through December.`
      ] }
    ] },
    { h2: 'What the research on adult coloring shows', blocks: [
      { p: `Adult coloring is often sold as stress relief. In a 2005 experiment, 84 students who had been made briefly anxious colored a mandala, a plaid pattern or a blank sheet for 20 minutes. Anxiety fell about the same after the mandala and the plaid, and more than after the blank sheet (Curry and Kasser, Art Therapy). The research is small, and our [article on adult coloring and anxiety](/adult-coloring-mental-health-benefits) covers what it cannot show.` }
    ] }
  ],
  faq: [
    { q: 'Are these Christmas coloring pages for adults free to print?', a: `The three example pages download as PNG files for personal use, with no account and no watermark. The generator makes 2 free pages a day; its free PDF carries a watermark, and [Pro](https://dorukctn.gumroad.com/l/uynqt) removes it for $9 once.` },
    { q: 'What detail level do adult Christmas pages need?', a: `Choose Detailed for dense pattern, or Medium for bold outlines and big areas. [Adult coloring pages](/adult-coloring-pages) explains both levels.` },
    { q: 'Can I make a Christmas mandala?', a: `Yes. Ask for “a round mandala made of Christmas ornaments, stars, holly leaves and candy canes”. The third example above was made that way.` },
    { q: 'How do I stop a page printing with big black areas?', a: `Avoid “dark”, “night” and “silhouette” in the prompt, and write “drawn as outlines” for skies and shadows. If a page still comes back filled, generate it again.` },
    { q: 'Can I sell Christmas coloring pages I make here?', a: `With Pro, yes: it includes commercial use. Leave film, TV and brand characters out of anything you sell. Our [Etsy guide](/sell-coloring-books-on-etsy) covers fees, file limits and Etsy's rule that AI-made items must say so.` }
  ],
  sources: [
    { text: 'Curry and Kasser (2005), Can coloring mandalas reduce anxiety? Art Therapy 22(2)', href: 'https://doi.org/10.1080/07421656.2005.10129441' }
  ],
  cta: `A page a night through December means 24 different pages. The free plan makes 2 a day, so start early, or make them all in one sitting with Pro, with no watermark and a commercial license, for $9 once.`,
  related: [
    { href: '/christmas-coloring-pages', label: 'Christmas coloring pages', note: 'with a 24-day Advent plan' },
    { href: '/adult-coloring-pages', label: 'Adult coloring pages', note: 'intricate or bold and easy' },
    { href: '/mandala-coloring-pages', label: 'Mandala coloring pages', note: 'symmetrical designs for a quiet evening' },
    { href: '/christmas-ornament-coloring-pages', label: 'Christmas ornament coloring pages', note: 'blank baubles to design and cut out' },
    { href: '/winter-coloring-pages', label: 'Winter coloring pages', note: 'snow days, snowflakes and polar animals' },
    { href: '/adult-coloring-mental-health-benefits', label: 'Adult coloring and anxiety', note: 'what four studies found' }
  ]
}

};

module.exports = THEME_GUIDES;
