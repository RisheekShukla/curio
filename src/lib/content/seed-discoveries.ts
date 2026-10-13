import { CURATED_MEDIA } from "./curated-media.ts";
import type { Category, Discovery } from "../types.ts";

interface SeedEntry {
  slug: string;
  title: string;
  summary: string;
  category: Category;
  tags: string[];
  imageAlt: string;
  starterQuestions: string[];
  readingMinutes: number;
}

// Summaries are written for this app. Sources and images are resolved by scripts/curate-images.mjs;
// entries without a verified free image fall back to a local illustration.
const ENTRIES: SeedEntry[] = [
  {
    slug: "kpg-extinction",
    title: "Why the non-avian dinosaurs disappeared",
    summary:
      "About 66 million years ago, roughly three-quarters of plant and animal species vanished, including every non-avian dinosaur. The leading explanation is the impact of an asteroid around 10 kilometres wide at Chicxulub, on Mexico's Yucatán Peninsula. A worldwide layer of iridium-rich clay marks the event. Massive volcanic eruptions in India's Deccan Traps were also under way, and researchers still debate how much they contributed. Birds, the surviving dinosaur lineage, made it through.",
    category: "science",
    tags: ["dinosaurs", "extinction", "paleontology", "asteroids", "earth-history"],
    imageAlt: "Artist's impression of a large asteroid striking the early Earth",
    starterQuestions: [
      "How did scientists find the Chicxulub crater?",
      "Why did birds survive when other dinosaurs did not?",
      "What role might the Deccan Traps eruptions have played?",
      "What happened to life in the oceans during the extinction?",
    ],
    readingMinutes: 3,
  },
  {
    slug: "fastest-dinosaurs",
    title: "How fast could the fastest dinosaurs run?",
    summary:
      "Ostrich-like ornithomimids, with long legs and light builds, are often proposed as the fastest dinosaurs, with some estimates comparable to a modern ostrich. But nobody has clocked a dinosaur. Speeds are inferred from fossil trackways, using stride length and hip height, and from computer models of muscles and bones. Different assumptions about posture and muscle mass produce very different numbers, so published top speeds are informed estimates rather than measurements.",
    category: "science",
    tags: ["dinosaurs", "biomechanics", "paleontology", "fossils"],
    imageAlt: "Fossil skeleton of an ornithomimid dinosaur",
    starterQuestions: [
      "How do trackways reveal a dinosaur's speed?",
      "Why are speed estimates for large dinosaurs so uncertain?",
      "How fast could Tyrannosaurus rex move?",
      "What makes ostriches such fast runners today?",
    ],
    readingMinutes: 2,
  },
  {
    slug: "hypercar-engineering",
    title: "What makes a multimillion-euro hypercar so hard to build",
    summary:
      "The Bugatti Chiron uses an 8.0-litre W16 engine with four turbochargers, rated at about 1,500 metric horsepower. Containing that power requires a carbon-fibre monocoque, enormous cooling capacity with multiple radiators, tyres engineered for extreme speeds and active aerodynamics that adjust downforce and drag on the move. Low production volumes and extensive hand assembly mean development costs are spread across relatively few cars, which helps explain the price.",
    category: "engineering",
    tags: ["cars", "engineering", "materials", "aerodynamics"],
    imageAlt: "A Bugatti Chiron hypercar",
    starterQuestions: [
      "Why does a hypercar need so many radiators?",
      "What makes carbon fibre useful for a car chassis?",
      "How do tyres cope with speeds above 400 km/h?",
      "How does active aerodynamics work?",
    ],
    readingMinutes: 2,
  },
  {
    slug: "black-hole-formation",
    title: "How black holes are born",
    summary:
      "When a very massive star exhausts its nuclear fuel, its core can no longer support itself against gravity and collapses. If enough mass is squeezed into a small enough region, not even light can escape: a black hole forms, bounded by an event horizon. Stellar black holes typically weigh a few to tens of solar masses. The supermassive black holes in galaxy centres are far heavier, and how they grew so large so early is still an open question.",
    category: "space",
    tags: ["black-holes", "stars", "gravity", "astrophysics"],
    imageAlt: "Event Horizon Telescope image of the black hole at the centre of galaxy M87, a glowing orange ring around a dark centre",
    starterQuestions: [
      "What exactly is an event horizon?",
      "How was the first image of a black hole made?",
      "Why do some dying stars become neutron stars instead?",
      "How might supermassive black holes have formed?",
    ],
    readingMinutes: 3,
  },
  {
    slug: "roman-concrete",
    title: "Why Roman concrete has lasted two thousand years",
    summary:
      "Roman builders mixed lime with volcanic ash, known as pozzolana, creating concrete that survives in structures such as the Pantheon's dome and in ancient harbour walls. In seawater, reactions with the ash help grow durable minerals within the material. Research published in 2023 suggested that lime clasts, small white lumps once dismissed as poor mixing, may let cracks heal when water seeps in. Engineers are studying these ideas for more sustainable concrete.",
    category: "history",
    tags: ["rome", "materials", "engineering", "chemistry", "architecture"],
    imageAlt: "The Pantheon in Rome, whose unreinforced concrete dome still stands",
    starterQuestions: [
      "What is pozzolana and why does it matter?",
      "How could concrete heal its own cracks?",
      "Is Roman concrete actually stronger than modern concrete?",
      "How was the Pantheon's dome built?",
    ],
    readingMinutes: 3,
  },
  {
    slug: "silk-road",
    title: "The Silk Road was a network, not a road",
    summary:
      "The Silk Road describes a web of overland and maritime routes connecting China, Central Asia, South Asia, the Middle East and Europe from roughly the second century BCE. Few traders travelled its entire length; goods passed through many hands and markets. Silk, spices, paper, glass and horses moved along it, and so did religions, technologies, languages and diseases. The name was popularised in the nineteenth century by the German geographer Ferdinand von Richthofen.",
    category: "history",
    tags: ["trade", "china", "central-asia", "ancient-world"],
    imageAlt: "A Bactrian camel, long used to carry goods across Central Asian trade routes",
    starterQuestions: [
      "Which goods were most valuable on the Silk Road?",
      "How did Buddhism spread along these routes?",
      "Why did the overland routes decline?",
      "How did diseases travel along the Silk Road?",
    ],
    readingMinutes: 3,
  },
  {
    slug: "psychology-of-memory",
    title: "Memory is reconstruction, not playback",
    summary:
      "Psychologists distinguish short-term working memory, which holds a few items for seconds, from long-term memory, which stores facts, events and skills. The hippocampus is essential for forming new memories of events. Remembering is an active rebuilding process: each recall can subtly change a memory, and research by Elizabeth Loftus and others has shown that misleading information can produce confident but false recollections.",
    category: "psychology",
    tags: ["memory", "brain", "cognition", "neuroscience"],
    imageAlt: "Anatomical illustration showing the hippocampus in the human brain",
    starterQuestions: [
      "How can false memories feel so real?",
      "What did patient H.M. teach scientists about memory?",
      "Does sleep help consolidate memories?",
      "Why do we forget most of our dreams?",
    ],
    readingMinutes: 2,
  },
  {
    slug: "mountain-formation",
    title: "How mountains are made",
    summary:
      "Most great mountain ranges form where tectonic plates converge. When India collided with Eurasia, beginning roughly 50 million years ago, the crust crumpled and thickened to raise the Himalayas, which are still rising today. Volcanic chains form where one plate sinks beneath another, and some ranges rise as blocks of crust are pulled apart. Meanwhile erosion by rivers and glaciers constantly wears mountains down, sculpting their peaks and valleys.",
    category: "geography",
    tags: ["plate-tectonics", "geology", "mountains", "earth-history"],
    imageAlt: "Satellite view of the Himalayas and neighbouring ranges",
    starterQuestions: [
      "Why are the Himalayas still getting taller?",
      "How do geologists know where ancient mountains once stood?",
      "How fast does erosion wear mountains down?",
      "Why do volcanoes often form in chains?",
    ],
    readingMinutes: 2,
  },
  {
    slug: "origins-of-writing",
    title: "Writing was invented more than once",
    summary:
      "Writing appears to have been invented independently several times. In Mesopotamia, accounting marks developed into cuneiform by around 3200 BCE, and Egyptian hieroglyphs emerged at a similar time. Writing arose separately in China and in Mesoamerica. Early writing was often used for administration, such as recording grain and livestock, long before it was used for literature, law or letters.",
    category: "culture",
    tags: ["writing", "language", "mesopotamia", "ancient-world", "archaeology"],
    imageAlt: "A cuneiform inscription carved into a rock face",
    starterQuestions: [
      "How was cuneiform deciphered?",
      "Did Egyptian writing borrow from Mesopotamia?",
      "How did the alphabet develop from earlier scripts?",
      "Why was early writing mostly accounting?",
    ],
    readingMinutes: 2,
  },
  {
    slug: "exoplanet-discovery",
    title: "Finding planets around other stars",
    summary:
      "In 1995, Michel Mayor and Didier Queloz announced 51 Pegasi b, the first planet found orbiting a Sun-like star; planets had been detected around a pulsar in 1992. Most exoplanets are found indirectly: by the slight wobble a planet induces in its star, or by the tiny dip in starlight when it passes in front. Missions such as Kepler and TESS have helped confirm thousands, many unlike anything in our Solar System.",
    category: "space",
    tags: ["exoplanets", "astronomy", "telescopes", "stars"],
    imageAlt: "Model of the Kepler space telescope, which searched for planets by watching stars dim",
    starterQuestions: [
      "How does the transit method detect planets?",
      "What is a 'hot Jupiter'?",
      "Could we detect signs of life on an exoplanet?",
      "Why are so many exoplanets unlike the planets we know?",
    ],
    readingMinutes: 3,
  },
  {
    slug: "deep-sea-vents",
    title: "Life without sunlight at hydrothermal vents",
    summary:
      "In 1977, scientists in the submersible Alvin found thriving communities around hydrothermal vents on the Galápagos Rift. There, seawater heated by volcanic activity gushes out rich in dissolved minerals. Instead of sunlight, microbes harvest chemical energy from compounds such as hydrogen sulfide, a process called chemosynthesis. They support tubeworms, clams, shrimp and crabs. Some scientists think environments like these may resemble where life first arose.",
    category: "nature",
    tags: ["ocean", "deep-sea", "ecosystems", "microbes", "origin-of-life"],
    imageAlt: "A black smoker hydrothermal vent releasing dark, mineral-rich water on the sea floor",
    starterQuestions: [
      "How does chemosynthesis work?",
      "How do giant tubeworms survive without a mouth?",
      "Could life on other moons rely on vents?",
      "How hot is the water at a black smoker?",
    ],
    readingMinutes: 3,
  },
  {
    slug: "encryption-mathematics",
    title: "The mathematics that keeps secrets",
    summary:
      "Public-key cryptography lets two strangers communicate securely without first sharing a secret. It relies on mathematical problems that are easy to compute in one direction and very hard to reverse. RSA, published in 1977, depends on how difficult it is to factor the product of two large prime numbers. Elliptic-curve methods offer similar security with smaller keys. Large quantum computers could break these schemes, so post-quantum algorithms are being standardised.",
    category: "mathematics",
    tags: ["cryptography", "prime-numbers", "computing", "security"],
    imageAlt: "The Lorenz SZ42 cipher machine from the Second World War, a mechanical forerunner of mathematical cryptography",
    starterQuestions: [
      "Why is factoring large numbers so hard?",
      "How does a public key differ from a private key?",
      "How would quantum computers threaten encryption?",
      "What is a digital signature?",
    ],
    readingMinutes: 3,
  },
  {
    slug: "printing-press",
    title: "Gutenberg's press and the information revolution",
    summary:
      "Around 1440, Johannes Gutenberg in Mainz combined movable metal type, an oil-based ink and an adapted screw press into a system for printing books efficiently. Movable type had existed earlier in East Asia, but Gutenberg's approach suited alphabetic scripts and spread rapidly. By 1500, presses operated in hundreds of European towns, lowering the cost of books and accelerating the spread of ideas during the Reformation and the Scientific Revolution.",
    category: "technology",
    tags: ["printing", "books", "inventions", "renaissance"],
    imageAlt: "A historical wooden printing press",
    starterQuestions: [
      "How did movable type work?",
      "Why did printing spread so quickly in Europe?",
      "How did Chinese and Korean movable type differ?",
      "How did printing affect the Reformation?",
    ],
    readingMinutes: 2,
  },
  {
    slug: "language-evolution",
    title: "How did human language begin?",
    summary:
      "No one knows exactly when or how language began, because speech leaves no fossils. Researchers combine clues from anatomy, genetics, archaeology, child development and animal communication. Some argue language emerged gradually from gestures or vocal calls; others propose a more sudden change in cognitive abilities. Estimates of when fully modern language existed vary widely. Brain regions involved in language, such as Broca's area, offer hints, but the question remains one of science's hardest.",
    category: "culture",
    tags: ["language", "evolution", "linguistics", "brain"],
    imageAlt: "Diagram of the human brain highlighting Broca's area",
    starterQuestions: [
      "Did gesture come before speech?",
      "What can animal communication tell us about language origins?",
      "What role does the FOXP2 gene play in speech?",
      "Why can't we date the origin of language precisely?",
    ],
    readingMinutes: 3,
  },
  {
    slug: "science-of-sleep",
    title: "Why we spend a third of our lives asleep",
    summary:
      "Sleep cycles through stages roughly every 90 minutes, alternating between non-REM sleep and REM sleep, when most vivid dreaming occurs. During sleep the brain consolidates memories, and studies in mice suggest it clears metabolic waste more efficiently. Lack of sleep impairs attention, mood and immune function. Yet why sleep evolved at all is still debated, since nearly every animal studied shows some form of sleep despite its risks.",
    category: "science",
    tags: ["sleep", "brain", "health", "neuroscience"],
    imageAlt: "Domenico Fetti's painting Sleeping Girl",
    starterQuestions: [
      "What happens in the brain during REM sleep?",
      "Why do teenagers tend to sleep later?",
      "Do all animals sleep?",
      "How does sleep help memory?",
    ],
    readingMinutes: 2,
  },
  {
    slug: "tardigrades",
    title: "Tardigrades: the toughest animals on Earth",
    summary:
      "Tardigrades, or water bears, are eight-legged animals usually less than a millimetre long. When their surroundings dry out, many species curl into a dormant state called a tun, drastically slowing their metabolism. In this state some have survived extreme cold, high doses of radiation and even exposure to space during a 2007 satellite experiment. They are not invincible, though: active tardigrades are fairly fragile, and prolonged heat kills them.",
    category: "nature",
    tags: ["animals", "extremophiles", "microscopic-life", "survival"],
    imageAlt: "Scanning electron microscope image of a tardigrade, a plump eight-legged micro-animal",
    starterQuestions: [
      "How does a tardigrade survive drying out?",
      "What happened to tardigrades exposed to space?",
      "Are tardigrades really indestructible?",
      "What proteins protect tardigrade cells?",
    ],
    readingMinutes: 2,
  },
  {
    slug: "octopus-intelligence",
    title: "The alien intelligence of the octopus",
    summary:
      "Octopuses solve puzzles, open jars and carry coconut shells to use as shelters. Their nervous system is unusual: a large share of their neurons sits in their arms, which respond to touch and taste with considerable independence. Because our last common ancestor lived more than 500 million years ago, octopus intelligence evolved largely separately from ours, making it a valuable comparison for understanding how minds arise.",
    category: "nature",
    tags: ["animals", "intelligence", "ocean", "evolution"],
    imageAlt: "An octopus on the sea floor",
    starterQuestions: [
      "How do octopus arms 'think' independently?",
      "How do octopuses change colour so quickly?",
      "Why do octopuses live such short lives?",
      "How do scientists test animal intelligence?",
    ],
    readingMinutes: 2,
  },
  {
    slug: "auroras",
    title: "What makes the sky glow green and red",
    summary:
      "Auroras occur when charged particles from the Sun, carried by the solar wind, are funnelled by Earth's magnetic field toward the polar regions. There they collide with oxygen and nitrogen in the upper atmosphere, exciting atoms and molecules that then release light. Oxygen typically produces green and red, while nitrogen contributes blue and purple hues. Strong solar storms can push auroras to much lower latitudes than usual.",
    category: "space",
    tags: ["sun", "atmosphere", "magnetism", "astronomy"],
    imageAlt: "Green aurora glowing over a night landscape",
    starterQuestions: [
      "Why are auroras mostly seen near the poles?",
      "Why is green the most common aurora colour?",
      "Do other planets have auroras?",
      "How can scientists forecast auroras?",
    ],
    readingMinutes: 2,
  },
  {
    slug: "antikythera-mechanism",
    title: "The ancient Greek computer",
    summary:
      "In 1901, sponge divers recovered corroded bronze fragments from a shipwreck near the Greek island of Antikythera. Decades of study, including X-ray imaging, revealed a hand-cranked device with at least 30 interlocking gears, made around the second or first century BCE. It modelled the movements of the Sun and Moon, predicted eclipses and tracked calendar cycles, including the timing of athletic games. Nothing comparably complex is known for many centuries afterwards.",
    category: "technology",
    tags: ["ancient-world", "astronomy", "inventions", "greece", "archaeology"],
    imageAlt: "Corroded bronze fragment of the Antikythera mechanism showing gear wheels",
    starterQuestions: [
      "How did the gears predict eclipses?",
      "Who might have built the mechanism?",
      "How did researchers read its hidden inscriptions?",
      "Why did similar technology seemingly disappear?",
    ],
    readingMinutes: 3,
  },
  {
    slug: "voyager-golden-record",
    title: "A message for whoever finds it",
    summary:
      "Each of the two Voyager spacecraft, launched in 1977, carries a gold-plated copper phonograph record. A committee chaired by Carl Sagan chose sounds and images to represent Earth, including greetings in 55 languages, music from many cultures, natural sounds and encoded photographs. The cover shows how to play it and where Earth is, relative to pulsars. The chance of it ever being found is extremely small, which is part of its poetry.",
    category: "space",
    tags: ["space-exploration", "music", "communication", "nasa"],
    imageAlt: "The Voyager Golden Record, a gold-coloured disc",
    starterQuestions: [
      "How would an alien know how to play the record?",
      "What music was chosen for the record?",
      "Where are the Voyager spacecraft now?",
      "How does the pulsar map show Earth's location?",
    ],
    readingMinutes: 2,
  },
  {
    slug: "placebo-effect",
    title: "The puzzling power of placebos",
    summary:
      "A placebo is a treatment with no active ingredient, yet people taking one sometimes report real improvements, especially for symptoms such as pain and nausea. Expectation, conditioning and the natural ups and downs of illness all contribute; some apparent placebo effects are simply recovery that would have happened anyway. Placebos are central to clinical trials, where comparison against them helps reveal whether a treatment truly works.",
    category: "psychology",
    tags: ["medicine", "brain", "expectations", "research-methods"],
    imageAlt: "Tablets of the kind used as placebos in trials",
    starterQuestions: [
      "Can placebos work even when people know they are placebos?",
      "What is the nocebo effect?",
      "Why are double-blind trials important?",
      "Which symptoms respond most to placebos?",
    ],
    readingMinutes: 2,
  },
  {
    slug: "mirror-test",
    title: "Can animals recognise themselves?",
    summary:
      "In the mirror test, devised by psychologist Gordon Gallup Jr. in 1970, an animal is marked somewhere it can only see in a reflection. If it investigates the mark on its own body, that suggests it recognises the reflection as itself. Chimpanzees, orangutans, some dolphins, an Asian elephant and Eurasian magpies have passed versions of the test. Critics note it favours vision-oriented species, so failing does not prove a lack of self-awareness.",
    category: "psychology",
    tags: ["animals", "intelligence", "cognition", "self-awareness"],
    imageAlt: "A baboon looking at its reflection in a mirror",
    starterQuestions: [
      "Why might dogs fail the mirror test?",
      "At what age do human children pass the test?",
      "Did cleaner fish really pass the mirror test?",
      "Does passing mean an animal is self-aware?",
    ],
    readingMinutes: 2,
  },
  {
    slug: "mycorrhizal-networks",
    title: "The underground fungal web",
    summary:
      "Most land plants partner with mycorrhizal fungi, whose fine threads extend far beyond the roots and trade water and minerals for sugars. Where fungal threads link several plants, they form common mycorrhizal networks. Popular accounts describe a 'wood wide web' through which trees share food and warnings. Researchers agree the networks exist, but how much moves between trees through them, and whether it benefits forests broadly, is actively debated.",
    category: "nature",
    tags: ["fungi", "plants", "forests", "ecosystems"],
    imageAlt: "Fly agaric mushrooms, the fruiting bodies of a fungus that forms mycorrhizal partnerships with trees",
    starterQuestions: [
      "What do plants and fungi gain from each other?",
      "Why are claims about tree communication debated?",
      "How old is the partnership between plants and fungi?",
      "How do scientists trace nutrients between trees?",
    ],
    readingMinutes: 3,
  },
  {
    slug: "bird-migration",
    title: "How birds navigate across continents",
    summary:
      "Billions of birds migrate every year, some crossing oceans and deserts. Bar-tailed godwits have been tracked flying more than 11,000 kilometres non-stop from Alaska to New Zealand. Birds navigate using several cues: the Sun's position, star patterns, landmarks, smells and Earth's magnetic field. How birds sense magnetism is still being worked out, with leading hypotheses involving light-sensitive proteins in the eye.",
    category: "nature",
    tags: ["birds", "animals", "navigation", "magnetism"],
    imageAlt: "A bar-tailed godwit, a long-billed shorebird famous for non-stop migration",
    starterQuestions: [
      "How might birds sense Earth's magnetic field?",
      "How do birds fly for days without stopping?",
      "How do scientists track small migrating birds?",
      "Why do some birds migrate while others stay put?",
    ],
    readingMinutes: 2,
  },
  {
    slug: "green-sahara",
    title: "When the Sahara was green",
    summary:
      "Between roughly 11,000 and 5,000 years ago, much of the Sahara held grasslands, lakes and wetlands, a period called the African Humid Period. Slow, cyclical changes in Earth's orbit strengthened the West African monsoon, carrying rain far north. Rock art showing cattle, giraffes and swimmers records the people who lived there. The return to desert happened at different speeds in different places, a timing scientists still investigate.",
    category: "geography",
    tags: ["climate", "deserts", "africa", "earth-history", "archaeology"],
    imageAlt: "Satellite image of the Sahara Desert",
    starterQuestions: [
      "How do changes in Earth's orbit affect rainfall?",
      "What does Saharan rock art reveal?",
      "How quickly did the Sahara dry out?",
      "Could the Sahara become green again?",
    ],
    readingMinutes: 2,
  },
  {
    slug: "mariana-trench",
    title: "The deepest place on Earth",
    summary:
      "The Challenger Deep, at the southern end of the Mariana Trench in the western Pacific, reaches nearly 11,000 metres below sea level, deeper than Mount Everest is tall. The trench forms where the Pacific Plate sinks beneath the Mariana Plate. Pressure at the bottom is over a thousand times that at the surface. Even so, crewed dives, first made in 1960, and robotic expeditions have found life there, including amphipods and microbes.",
    category: "geography",
    tags: ["ocean", "deep-sea", "plate-tectonics", "exploration"],
    imageAlt: "Map showing the location of the Mariana Trench in the western Pacific",
    starterQuestions: [
      "How did the first crewed dive reach the bottom?",
      "What animals live in the deepest trenches?",
      "How is the depth of the trench measured?",
      "How do deep-sea creatures cope with the pressure?",
    ],
    readingMinutes: 2,
  },
  {
    slug: "library-of-alexandria",
    title: "The real story of the Library of Alexandria",
    summary:
      "Founded under the early Ptolemies, probably in the third century BCE, the Library of Alexandria became a leading centre of scholarship in the ancient world, supporting work in mathematics, astronomy, geography and literature. Popular stories describe a single catastrophic fire, but historians think the library declined gradually over centuries through reduced funding, political turmoil and several destructive events. How many scrolls it held is unknown; ancient figures vary enormously.",
    category: "history",
    tags: ["ancient-world", "books", "egypt", "scholarship"],
    imageAlt: "Nineteenth-century artistic depiction of the ancient Library of Alexandria",
    starterQuestions: [
      "Did Julius Caesar really burn the library?",
      "Which famous scholars worked at Alexandria?",
      "How were books collected for the library?",
      "What knowledge might have been lost?",
    ],
    readingMinutes: 3,
  },
  {
    slug: "fibonacci-in-nature",
    title: "Fibonacci numbers in sunflowers and pine cones",
    summary:
      "The Fibonacci sequence runs 0, 1, 1, 2, 3, 5, 8, 13, each number the sum of the two before it. The numbers of spirals on sunflower heads and pine cones are often consecutive Fibonacci numbers. One explanation is that new seeds or scales grow at a fixed angle of about 137.5 degrees, the 'golden angle', which packs them efficiently. Claims that the golden ratio appears everywhere, however, are frequently exaggerated.",
    category: "mathematics",
    tags: ["numbers", "patterns", "plants", "golden-ratio"],
    imageAlt: "A spiral built from squares whose sides follow the Fibonacci sequence",
    starterQuestions: [
      "Why does the golden angle pack seeds efficiently?",
      "How is the Fibonacci sequence related to the golden ratio?",
      "Which golden ratio claims are myths?",
      "Who was Fibonacci?",
    ],
    readingMinutes: 2,
  },
  {
    slug: "invention-of-zero",
    title: "The surprisingly late invention of zero",
    summary:
      "Babylonian scribes used a placeholder symbol to mark empty positions in numbers, and the Maya developed a zero independently. Treating zero as a number in its own right, with rules for arithmetic, was formalised in India; Brahmagupta described such rules in 628 CE. Through scholars writing in Arabic, the Indian numeral system reached Europe, where Fibonacci promoted it in 1202. Zero made place-value notation, and much of modern mathematics, possible.",
    category: "mathematics",
    tags: ["numbers", "history-of-science", "india", "ancient-world"],
    imageAlt: "Historical representation of the numeral zero",
    starterQuestions: [
      "Why did the Romans manage without zero?",
      "What rules for zero did Brahmagupta propose?",
      "How did Indian numerals reach Europe?",
      "Why is dividing by zero undefined?",
    ],
    readingMinutes: 2,
  },
  {
    slug: "monty-hall-problem",
    title: "The game-show puzzle that fooled mathematicians",
    summary:
      "You pick one of three doors; one hides a car, two hide goats. The host, who knows where the car is, opens another door to reveal a goat and offers you a switch. Switching wins two-thirds of the time, because your first pick was right only one-third of the time. When Marilyn vos Savant explained this in a 1990 magazine column, many readers, including people with doctorates, insisted she was wrong.",
    category: "mathematics",
    tags: ["probability", "puzzles", "statistics", "decision-making"],
    imageAlt: "Diagram of three doors, one open to reveal a goat, illustrating the Monty Hall problem",
    starterQuestions: [
      "Why doesn't the chance become 50:50 after a door opens?",
      "What if the host opened a door at random?",
      "How could I simulate the Monty Hall problem?",
      "Why do our intuitions about probability fail?",
    ],
    readingMinutes: 2,
  },
  {
    slug: "the-transistor",
    title: "The switch that built the digital world",
    summary:
      "In 1947, John Bardeen and Walter Brattain, working in William Shockley's group at Bell Labs, demonstrated the first working transistor. Transistors use semiconductors to amplify signals or act as tiny switches, replacing bulky, power-hungry vacuum tubes. Packing them onto integrated circuits transformed computing. Modern processors contain billions of transistors, each far smaller than a bacterium, though further miniaturisation is increasingly difficult and expensive.",
    category: "technology",
    tags: ["electronics", "computing", "inventions", "semiconductors"],
    imageAlt: "Assorted discrete transistors in different packages",
    starterQuestions: [
      "How does a transistor act as a switch?",
      "What is Moore's law, and is it ending?",
      "Why are semiconductors like silicon so useful?",
      "How are chips manufactured at such tiny scales?",
    ],
    readingMinutes: 2,
  },
  {
    slug: "gps-and-relativity",
    title: "Your phone's map depends on Einstein",
    summary:
      "GPS receivers calculate position by timing signals from several satellites, so the satellites' atomic clocks must be extraordinarily precise. Relativity matters: because the satellites move fast, special relativity makes their clocks run slightly slow, while weaker gravity at their altitude makes them run fast, as general relativity predicts. The net effect is about 38 microseconds per day. Left uncorrected, position errors would quickly grow to kilometres.",
    category: "technology",
    tags: ["satellites", "relativity", "physics", "navigation"],
    imageAlt: "Illustration of a GPS Block IIIA satellite",
    starterQuestions: [
      "How does a receiver use timing to find its position?",
      "Why does weaker gravity make clocks tick faster?",
      "How accurate are atomic clocks?",
      "How do systems like Galileo compare with GPS?",
    ],
    readingMinutes: 2,
  },
  {
    slug: "flying-buttresses",
    title: "How flying buttresses filled cathedrals with light",
    summary:
      "Tall Gothic stone vaults push outward on their walls. Flying buttresses are arched supports that carry part of that thrust through open air to massive piers outside the building. By moving support outward, medieval builders could make walls thinner and fill them with large stained-glass windows, as at Chartres and Notre-Dame de Paris. They worked largely from experience and geometric rules, long before modern structural engineering existed.",
    category: "engineering",
    tags: ["architecture", "medieval", "structures", "gothic"],
    imageAlt: "Flying buttresses on St. Mary's Church in Lübeck",
    starterQuestions: [
      "How did medieval masons design without modern engineering?",
      "Why are pointed arches useful in tall buildings?",
      "How was medieval stained glass made?",
      "How was Notre-Dame stabilised after the 2019 fire?",
    ],
    readingMinutes: 2,
  },
  {
    slug: "panama-canal-locks",
    title: "Lifting ships over a continent",
    summary:
      "The Panama Canal, opened in 1914, connects the Atlantic and Pacific without the long voyage around South America. Rather than cutting down to sea level, engineers built locks that raise ships about 26 metres to Gatun Lake and lower them on the other side. Each transit uses large volumes of fresh water from the lake system. Expanded locks, opened in 2016, take much larger ships and include basins that reuse part of the water.",
    category: "engineering",
    tags: ["canals", "infrastructure", "ships", "water"],
    imageAlt: "Map of the Panama Canal showing its locks and Gatun Lake",
    starterQuestions: [
      "How do canal locks raise a ship?",
      "Why was the French attempt to build the canal abandoned?",
      "How do droughts affect the canal?",
      "How was disease controlled during construction?",
    ],
    readingMinutes: 2,
  },
  {
    slug: "terracotta-army",
    title: "An army made for the afterlife",
    summary:
      "In 1974, farmers digging a well near Xi'an, China, uncovered fragments of what proved to be thousands of life-sized clay soldiers. They were buried near the tomb of Qin Shi Huang, the first emperor of a unified China, who died in 210 BCE. Faces and details vary, and the figures were originally brightly painted. Much of the site, including the emperor's burial chamber itself, has not been excavated.",
    category: "history",
    tags: ["china", "archaeology", "ancient-world", "art"],
    imageAlt: "Rows of terracotta warrior statues in an excavation pit",
    starterQuestions: [
      "How were thousands of figures made?",
      "Why hasn't the emperor's tomb been opened?",
      "What happened to the original paint?",
      "Who was Qin Shi Huang?",
    ],
    readingMinutes: 2,
  },
  {
    slug: "tyrian-purple",
    title: "The ancient dye reserved for the powerful",
    summary:
      "Tyrian purple was produced in the ancient Mediterranean from secretions of predatory sea snails. Thousands of snails were needed for small amounts of dye, and the process was notoriously smelly. Because it was costly and colourfast, the colour became associated with power and status, and Roman laws at times restricted who could wear it. The dye takes its name from Tyre, a Phoenician city in what is now Lebanon.",
    category: "culture",
    tags: ["colour", "ancient-world", "chemistry", "fashion"],
    imageAlt: "A sample of deep Tyrian purple colour",
    starterQuestions: [
      "How was Tyrian purple extracted from snails?",
      "Why did purple come to signify royalty?",
      "How did synthetic dyes change fashion?",
      "Who were the Phoenicians?",
    ],
    readingMinutes: 2,
  },
  {
    slug: "bioluminescence",
    title: "Living light",
    summary:
      "Bioluminescence is light produced by a chemical reaction inside a living organism, typically when an enzyme called luciferase acts on a molecule called luciferin. It has evolved many separate times. In the open ocean, a large proportion of animals can make light, using it to find mates, lure prey or confuse predators. On land, fireflies flash coded signals and some fungi glow faintly. Glowing waves on beaches usually come from dinoflagellates.",
    category: "nature",
    tags: ["ocean", "animals", "chemistry", "deep-sea"],
    imageAlt: "A firefly glowing in the dark",
    starterQuestions: [
      "Why has bioluminescence evolved so many times?",
      "How do fireflies control their flashes?",
      "What makes some beaches glow blue at night?",
      "How do scientists use luciferase in research?",
    ],
    readingMinutes: 2,
  },
  {
    slug: "year-without-a-summer",
    title: "1816: the year without a summer",
    summary:
      "In April 1815, Mount Tambora in Indonesia erupted in one of the largest eruptions in recorded history. Its sulphur aerosols spread through the stratosphere, reflecting sunlight and cooling much of the Northern Hemisphere. In 1816, snow fell in New England in June, harvests failed across Europe and food prices soared. Kept indoors by gloomy weather near Lake Geneva, Mary Shelley began the story that became Frankenstein.",
    category: "history",
    tags: ["volcanoes", "climate", "europe", "literature"],
    imageAlt: "The caldera of Mount Tambora in Indonesia",
    starterQuestions: [
      "How can a volcano cool the whole planet?",
      "What happened to people in Indonesia after the eruption?",
      "How did the cold summer inspire Frankenstein?",
      "Could a similar eruption happen today?",
    ],
    readingMinutes: 2,
  },
  {
    slug: "crispr",
    title: "CRISPR: editing genes with a bacterial tool",
    summary:
      "CRISPR began as part of a bacterial immune system that stores snippets of viral DNA and uses them to recognise invaders. In 2012, Jennifer Doudna and Emmanuelle Charpentier showed that the Cas9 enzyme could be programmed to cut chosen DNA sequences, work recognised with the 2020 Nobel Prize in Chemistry. CRISPR tools are now widely used in research, and the first CRISPR-based therapy was approved in 2023, raising medical hopes and ethical questions.",
    category: "science",
    tags: ["genetics", "biotechnology", "medicine", "microbes"],
    imageAlt: "Illustration of the Cas9 protein bound to DNA",
    starterQuestions: [
      "How does Cas9 find the right place in DNA?",
      "What was the first approved CRISPR therapy for?",
      "Why is editing human embryos so controversial?",
      "How do bacteria use CRISPR against viruses?",
    ],
    readingMinutes: 3,
  },
  {
    slug: "great-wave",
    title: "The Great Wave off Kanagawa",
    summary:
      "Katsushika Hokusai's woodblock print, made around 1831, shows a towering wave about to crash over three boats, with Mount Fuji small in the distance. It belongs to the series Thirty-six Views of Mount Fuji. Because woodblocks allowed many impressions, thousands of copies were printed. The print used imported Prussian blue pigment and later influenced European artists as Japanese prints circulated widely in the nineteenth century.",
    category: "culture",
    tags: ["art", "japan", "printmaking", "ocean"],
    imageAlt: "Hokusai's The Great Wave off Kanagawa: a huge curling wave over boats with Mount Fuji behind",
    starterQuestions: [
      "How were Japanese woodblock prints made?",
      "Why was Prussian blue so important to Hokusai?",
      "How did Japanese prints influence Impressionism?",
      "Who was Hokusai?",
    ],
    readingMinutes: 2,
  },
  {
    slug: "moai",
    title: "How the moai of Rapa Nui were moved",
    summary:
      "The people of Rapa Nui (Easter Island) carved nearly a thousand moai, mostly from volcanic tuff at the Rano Raraku quarry, and moved many of them kilometres across the island. Oral traditions say the moai 'walked', and experiments have shown that teams using ropes can rock an upright statue forward. Researchers continue to debate the island's history, including older claims of a self-inflicted ecological collapse that more recent work has challenged.",
    category: "culture",
    tags: ["archaeology", "pacific-islands", "sculpture", "engineering"],
    imageAlt: "A row of moai statues on Rapa Nui (Easter Island)",
    starterQuestions: [
      "How could teams make the moai 'walk'?",
      "Why were the moai built?",
      "What really happened to Rapa Nui's population?",
      "How were the statues carved?",
    ],
    readingMinutes: 2,
  },
  {
    slug: "atacama-desert",
    title: "The driest place outside the poles",
    summary:
      "Chile's Atacama Desert is among the driest places on Earth; some locations have recorded almost no rain for long periods. It sits between the Andes and a cold ocean current, which together block and suppress rainfall. Its soils are so dry that NASA researchers have used them to test methods for detecting life on Mars. High altitude and clear skies also make it home to major astronomical observatories.",
    category: "geography",
    tags: ["deserts", "climate", "astronomy", "south-america"],
    imageAlt: "Satellite view of the Atacama Desert in Chile",
    starterQuestions: [
      "Why is the Atacama so dry?",
      "How do plants and microbes survive there?",
      "Why build telescopes in the Atacama?",
      "What happens when rare rain falls?",
    ],
    readingMinutes: 2,
  },
];

export const SEED_DISCOVERIES: Discovery[] = ENTRIES.map((e) => {
  const media = CURATED_MEDIA[e.slug];
  return {
    id: e.slug,
    slug: e.slug,
    title: e.title,
    summary: e.summary,
    category: e.category,
    tags: e.tags,
    image: media?.image
      ? {
          url: media.image.url,
          alt: e.imageAlt,
          credit: media.image.credit,
          license: media.image.license,
          licenseUrl: media.image.licenseUrl,
          sourcePageUrl: media.image.pageUrl,
        }
      : null,
    starterQuestions: e.starterQuestions,
    source: media?.source,
    readingMinutes: e.readingMinutes,
    status: "published",
  };
});
