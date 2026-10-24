// What the daily job draws, and every word of text that goes with a page.
//
// The calendar picks a theme for the day (Halloween until 31 October, then fall and Thanksgiving, then Christmas and
// winter, and evergreen subjects whenever no season is on). Each theme has a bank of subjects: a short name, the phrase
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
export const THEMES = {
  halloween: { group: 'halloween', label: 'Halloween', site: 'halloween-coloring-pages', skins: ['orange', 'plum', 'mist'] },
  fall: { group: 'autumn', label: 'fall', site: 'fall-coloring-pages', skins: ['rust', 'wheat', 'forest'] },
  thanksgiving: { group: 'autumn', label: 'Thanksgiving', site: 'thanksgiving-coloring-pages', skins: ['harvest', 'cranberry', 'cream'] },
  christmas: { group: 'winter', label: 'Christmas', site: 'christmas-coloring-pages', skins: ['pine', 'berry', 'snow'] },
  winter: { group: 'winter', label: 'winter', site: 'winter-coloring-pages', skins: ['ice', 'night', 'frost'] },
  evergreen: { group: 'evergreen', label: '', site: null, skins: ['sky', 'meadow', 'sun', 'lilac', 'coral'] }
};

// --- calendar ---
// US Thanksgiving: the fourth Thursday of November.
export function thanksgiving(year) {
  const first = new Date(Date.UTC(year, 10, 1)).getUTCDay();
  return new Date(Date.UTC(year, 10, 1 + ((4 - first + 7) % 7) + 21));
}
const md = d => String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');

// The theme mix of a day: { id, mix: { theme: weight } }. A theme with weight 2 is drawn twice as often as weight 1.
export function phaseFor(date) {
  const d = date instanceof Date ? date : new Date(date);
  const day = md(d);
  const tg = md(thanksgiving(d.getUTCFullYear()));
  if (day >= '09-15' && day <= '10-31') return { id: 'halloween', mix: { halloween: 1 } };
  if (day >= '11-01' && day <= tg) return { id: 'fall', mix: { fall: 1, thanksgiving: 1 } };
  if (day > tg && day <= '12-25') return { id: 'christmas', mix: { christmas: 3, winter: 2, evergreen: 0.5 } };
  if (day >= '12-26' || day <= '01-31') return { id: 'winter', mix: { winter: 2, evergreen: 1 } };
  return { id: 'evergreen', mix: { evergreen: 1 } };
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

const THANKSGIVING = [
  ['Thanksgiving turkey', 'a cartoon turkey with big fanned tail feathers and a friendly face', 's'],
  ['Thanksgiving turkey feathers', 'a turkey with large tail feathers made of different leaf and feather shapes', 'm'],
  ['Thanksgiving pilgrim hat', 'a pilgrim hat with a wide buckle', 's'],
  ['Thanksgiving cornucopia', 'a cornucopia overflowing with pumpkins, apples, grapes and corn', 'm'],
  ['Thanksgiving pumpkin pie', 'a slice of pumpkin pie with a dollop of whipped cream', 's'],
  ['Thanksgiving thankful tree', 'a tree with many round leaves and a few acorns at its roots', 's'],
  ['Thanksgiving dinner table', 'a long table set with a roast turkey, pies, corn and candles', 'm'],
  ['Thanksgiving chef turkey', 'a turkey wearing a tall chef hat and holding a wooden spoon', 's'],
  ['Thanksgiving dinner plate', 'a plate with turkey, corn, potatoes and a roll', 's'],
  ['Thanksgiving corn', 'two ears of corn with husks and a few kernels', 's'],
  ['Thanksgiving handprint turkey', 'a turkey made from a hand outline with five feathers and a small face', 's'],
  ['Thanksgiving heart', 'a big heart made of autumn leaves with a small acorn', 's'],
  ['Thanksgiving turkey mandala', 'a round mandala shaped like a turkey with patterned feathers', 'd'],
  ['Thanksgiving cornucopia pattern', 'a cornucopia with detailed fruit, leaves and vines, intricate patterns', 'd'],
  ['Thanksgiving apple pie', 'a whole apple pie with a lattice crust and two apples beside it', 's'],
  ['Thanksgiving squirrel pie', 'a squirrel hugging a pumpkin pie', 's'],
  ['Thanksgiving farm', 'a small farm with a barn, a scarecrow and a field of pumpkins', 'm'],
  ['Thanksgiving baby turkey', 'a fluffy baby turkey with a small wattle standing in a pile of leaves', 's'],
  ['Thanksgiving turkey and pumpkin', 'a turkey sitting next to a big pumpkin with a leafy vine', 's'],
  ['Thanksgiving harvest wagon', 'a wooden wagon full of pumpkins, squash and corn', 'm'],
  ['Thanksgiving friends', 'a turkey, a squirrel and a deer sharing a picnic blanket with pie', 'm'],
  ['Thanksgiving pumpkin', 'a big round pumpkin with a leafy vine', 's'],
  ['Thanksgiving leaves border', 'a page full of overlapping autumn leaves in many shapes', 'd'],
  ['Thanksgiving bread basket', 'a basket of rolls and corn bread with a napkin', 's']
];

const CHRISTMAS = [
  ['Christmas tree and presents', 'a decorated Christmas tree with a star on top and presents underneath', 's'],
  ['Santa Claus face', 'a smiling Santa Claus face with a big beard and a fluffy hat', 's'],
  ['Santa and sleigh', 'Santa Claus in a sleigh full of presents pulled by two reindeer over rooftops', 'm'],
  ['Christmas reindeer', 'a cute reindeer with big antlers and a round nose wearing a scarf', 's'],
  ['Christmas gingerbread man', 'a gingerbread man with a big smile, icing buttons and a bow tie', 's'],
  ['Christmas gingerbread house', 'a gingerbread house with candy canes, gumdrops and a frosted roof', 'm'],
  ['Christmas stocking', 'a big Christmas stocking with a candy cane and small toys peeking out', 's'],
  ['Christmas snow globe', 'a snow globe with a little house, a tree and falling snow', 'm'],
  ['Christmas wreath', 'a Christmas wreath with a big bow, holly leaves and berries', 's'],
  ['Christmas ornaments', 'five round Christmas ornaments with stripes, stars and swirls hanging from a branch', 's'],
  ['Christmas elf', 'a cheerful Christmas elf with pointed ears and a striped hat holding a present', 's'],
  ['Christmas cat tree', 'a cat sitting under a Christmas tree and batting at an ornament', 'm'],
  ['Christmas puppy', 'a puppy wearing a Santa hat and sitting next to a present', 's'],
  ['Christmas polar bear', 'a polar bear in a scarf and a Santa hat holding a candy cane', 's'],
  ['Christmas village', 'a snowy Christmas village with small houses, a church, lamp posts and a tree', 'd'],
  ['Christmas ornament mandala', 'a round mandala made of ornaments, stars, holly and candy canes', 'd'],
  ['Christmas bells and holly', 'two big bells tied with a bow and holly leaves with berries', 's'],
  ['Christmas star', 'a big star with a swirling tail and small stars around it', 's'],
  ['Christmas fireplace', 'a fireplace with a burning log, hanging stockings and a garland on the mantel', 'm'],
  ['Christmas presents', 'a pile of wrapped presents with ribbons, bows and tags', 's'],
  ['Christmas penguin', 'a penguin in a Santa hat holding a small present', 's'],
  ['Christmas cookies and milk', 'a plate of Christmas cookies next to a glass of milk', 'm'],
  ['Christmas workshop', 'a busy toy workshop with elves, toy trains, a rocking horse and a shelf of dolls', 'md'],
  ['Christmas lights house', 'a house covered with string lights, a wreath on the door and a snowman out front', 'm'],
  ['Christmas poinsettia', 'a poinsettia flower with large pointed leaves in a pot with a bow', 'm'],
  ['Christmas nutcracker', 'a toy nutcracker soldier with a tall hat and a sword', 'm'],
  ['Christmas snowflake ornaments', 'four ornaments each with a different snowflake pattern', 's'],
  ['Christmas candy cane lane', 'a candy cane village with gumdrop trees and a lollipop fence', 'm'],
  ['Christmas tree zentangle', 'a tall Christmas tree filled with zentangle patterns and ornaments', 'd'],
  ['Christmas wreath pattern', 'a round wreath filled with fine holly, pinecone and berry patterns', 'd'],
  ['Christmas snowman gifts', 'a snowman holding a present with a scarf and a top hat', 's'],
  ['Christmas sleigh ride', 'a horse pulling a sleigh through snowy hills with children on board', 'm'],
  ['Christmas angel', 'a smiling angel with wings and a star in the sky', 's'],
  ['Christmas cabin', 'a log cabin with a snowy roof, smoke from the chimney and a lit tree outside', 'd'],
  ['Christmas teddy bear', 'a teddy bear in a Christmas sweater hugging a present', 's'],
  ['Christmas bird', 'a cardinal bird on a branch of holly with berries and snow', 'm']
];

const WINTER = [
  ['winter snowman', 'a snowman with a top hat, a scarf and a carrot nose', 's'],
  ['winter snowflakes', 'six big snowflakes, each with a different pattern', 's'],
  ['winter penguin', 'a penguin sliding on ice with a small scarf', 's'],
  ['winter polar bear', 'a polar bear cub playing in the snow', 's'],
  ['winter arctic fox', 'an arctic fox in the snow with a fluffy tail', 'm'],
  ['winter owl', 'an owl sitting in a snowy pine tree', 'm'],
  ['winter mittens', 'a pair of knitted mittens with a patterned hat', 's'],
  ['winter sledding', 'two children sledding down a hill with snowy trees behind', 'm'],
  ['winter ice skates', 'a pair of ice skates with a scarf', 's'],
  ['winter cabin', 'a snowy cabin in the woods with smoke from the chimney', 'm'],
  ['winter cardinal', 'a cardinal sitting on a snowy branch', 's'],
  ['winter reindeer forest', 'a reindeer standing in a snowy pine forest', 'm'],
  ['winter hot cocoa', 'a mug of hot cocoa with marshmallows next to a knitted blanket', 's'],
  ['winter igloo', 'an igloo with a fishing hole and a small penguin beside it', 's'],
  ['winter pine trees', 'snow covered pine trees on a hill with a big moon', 'm'],
  ['winter ski mountain', 'a mountain with ski tracks, a lift and tiny skiers', 'm'],
  ['winter snowflake mandala', 'a round snowflake mandala with fine crystal patterns', 'd'],
  ['winter penguin family', 'a family of penguins huddled together on the ice', 's'],
  ['winter baby seal', 'a baby seal resting on an ice floe', 's'],
  ['winter snow angel', 'a child making a snow angel next to a small snowman', 's'],
  ['winter village', 'a cozy winter village with houses, lamp posts, skaters on a pond and snowy hills', 'd'],
  ['winter husky sled', 'a husky dog team pulling a sled across the snow', 'm'],
  ['winter fireplace cat', 'a cat sleeping by a fireplace on a rug with a blanket', 'm'],
  ['winter wolf', 'a wolf howling at a moon on a snowy hill with pine trees', 'm'],
  ['winter snowman family', 'a snowman family with a big, a medium and a small snowman', 's'],
  ['winter birds', 'three small birds on a snowy branch with berries', 'm'],
  ['winter moose', 'a moose standing in a snowy forest', 'm'],
  ['winter owl mandala', 'a round mandala with an owl in the center and snowflakes around it', 'd']
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
        site: site || THEMES[theme].site || null,
        variant: word, pass: i < primary.length ? 1 : 2
      });
    });
  }
  return out;
}

const RAW = { halloween: HALLOWEEN, fall: FALL, thanksgiving: THANKSGIVING, christmas: CHRISTMAS, winter: WINTER, evergreen: EVERGREEN };
let bankCache = null;
export function bank() {
  if (bankCache) return bankCache;
  bankCache = {};
  for (const [theme, rows] of Object.entries(RAW)) {
    // First pass before second pass, each in a stable pseudo-random order (a theme does not run through its subjects in the order they were typed).
    bankCache[theme] = expand(theme, rows).sort((a, b) => a.pass - b.pass || hash('cpm-order|' + a.slug) - hash('cpm-order|' + b.slug));
  }
  return bankCache;
}
export const allSubjects = () => Object.values(bank()).flat();

// The next subject to draw. used: Set of slugs already made; counts: { theme: pages made so far } (auto pages only).
// Within the day's mix the theme that is furthest behind its weight goes first, so a mixed season stays mixed.
export function pickSubject({ date, used, counts = {} }) {
  const phase = phaseFor(date);
  const b = bank();
  let best = null;
  for (const [theme, w] of Object.entries(phase.mix)) {
    const cand = b[theme].find(s => !used.has(s.slug));
    if (!cand) continue;
    const ratio = (counts[theme] || 0) / w;
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
// Words that stay capitalized in the middle of a sentence.
const PROPER = /^(Halloween|Thanksgiving|Christmas|Santa|T\.)/;
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
  const pinTitle = wordings[pick % wordings.length](mid);
  const blurb = sentence(subject.draw);
  const pinDescription = [
    blurb,
    `${L.line}.`,
    `Print it free at home as a PNG or a letter-size PDF, or draw your own page with ColoringPageMaker: 2 free pages a day, no signup.`
  ].join(' ');
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
