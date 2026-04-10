#!/usr/bin/env node

/**
 * Generate sample puzzles for the web app (no API key needed).
 * Uses data/dictionary.json as the word pool.
 * Produces symmetric 15x15 puzzles for three themes.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildSymmetric } from './solver.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '..', 'data');
const PUBLIC_DIR = resolve(__dirname, '..', 'public');

function loadJSON(path) {
  if (!existsSync(path)) return [];
  try { return JSON.parse(readFileSync(path, 'utf-8')); } catch { return []; }
}

// Theme word lists — curated subsets of the dictionary biased toward each theme.
// The builder will also pull from the full dictionary for crossing fill.
const THEME_KEYWORDS = {
  nature: [
    // trees
    'OAK', 'ELM', 'ASH', 'FIR', 'YEW', 'PINE', 'CEDAR', 'BIRCH', 'MAPLE',
    'ALDER', 'ASPEN', 'BEECH', 'LARCH', 'WILLOW', 'SPRUCE', 'POPLAR', 'WALNUT',
    'HICKORY', 'CYPRESS', 'HEMLOCK', 'SEQUOIA', 'REDWOOD', 'SYCAMORE',
    // flowers
    'LILY', 'IRIS', 'ROSE', 'DAISY', 'TULIP', 'ASTER', 'PANSY', 'PEONY',
    'POPPY', 'ORCHID', 'VIOLET', 'DAHLIA', 'CROCUS', 'ZINNIA', 'AZALEA',
    'JASMINE', 'MAGNOLIA', 'DAFFODIL', 'LAVENDER', 'MARIGOLD', 'PRIMROSE',
    'HIBISCUS', 'BLUEBELL', 'FOXGLOVE', 'BUTTERCUP',
    // animals — mammals
    'EWE', 'RAM', 'ELK', 'FOX', 'APE', 'BAT', 'YAK', 'GNU',
    'DEER', 'BEAR', 'WOLF', 'MOOSE', 'OTTER', 'BISON', 'STOAT', 'SHREW',
    'LLAMA', 'PANDA', 'LEMUR', 'HYENA', 'LYNX', 'MINK', 'HARE', 'MOLE',
    'VOLE', 'BADGER', 'BEAVER', 'JAGUAR', 'COYOTE', 'BOBCAT', 'WEASEL',
    'MUSKRAT', 'OPOSSUM', 'GAZELLE', 'CARIBOU', 'BUFFALO', 'ANTELOPE',
    // birds
    'OWL', 'JAY', 'EMU', 'WREN', 'HAWK', 'LARK', 'DOVE', 'IBIS', 'KITE',
    'ROBIN', 'FINCH', 'HERON', 'CRANE', 'STORK', 'EAGLE', 'RAVEN', 'SWIFT',
    'QUAIL', 'EGRET', 'GROUSE', 'OSPREY', 'FALCON', 'PARROT', 'THRUSH',
    'PELICAN', 'SPARROW', 'WARBLER', 'PENGUIN', 'CONDOR', 'ORIOLE',
    // fish and marine
    'COD', 'EEL', 'RAY', 'BASS', 'CARP', 'PIKE', 'TROUT', 'SHARK', 'WHALE',
    'SALMON', 'PERCH', 'CORAL', 'SQUID', 'CLAM', 'CRAB', 'SHRIMP',
    'MARLIN', 'MINNOW', 'WALLEYE', 'DOLPHIN', 'LOBSTER', 'JELLYFISH',
    // insects and small creatures
    'ANT', 'BEE', 'FLY', 'MOTH', 'WASP', 'TICK', 'FLEA', 'GNAT', 'SLUG',
    'SNAIL', 'BEETLE', 'CRICKET', 'MANTIS', 'CICADA', 'FIREFLY', 'LADYBUG',
    'MONARCH', 'CATERPILLAR', 'DRAGONFLY', 'BUTTERFLY',
    // reptiles and amphibians
    'NEWT', 'TOAD', 'FROG', 'VIPER', 'GECKO', 'COBRA', 'TURTLE', 'IGUANA',
    'LIZARD', 'PYTHON', 'SALAMANDER', 'CHAMELEON', 'ALLIGATOR',
    // weather
    'FOG', 'DEW', 'ICE', 'HAIL', 'GUST', 'GALE', 'SLEET', 'RAIN', 'WIND',
    'SNOW', 'CLOUD', 'STORM', 'FROST', 'BREEZE', 'SQUALL', 'THUNDER',
    'TORNADO', 'CYCLONE', 'MONSOON', 'DROUGHT', 'RAINBOW', 'BLIZZARD',
    'LIGHTNING', 'HUMIDITY', 'SUNSHINE',
    // landforms and geology
    'HILL', 'CAVE', 'MESA', 'DUNE', 'CRAG', 'BUTTE', 'BLUFF', 'GORGE',
    'CLIFF', 'RIDGE', 'PLAIN', 'BASIN', 'DELTA', 'CANYON', 'VALLEY', 'RAVINE',
    'PLATEAU', 'VOLCANO', 'CALDERA', 'CAVERN', 'BOULDER', 'GRAVEL',
    'GRANITE', 'BASALT', 'QUARTZ', 'SHALE', 'SLATE', 'CHALK', 'FLINT',
    'STONE', 'SAND', 'SOIL', 'CLAY', 'LOAM', 'SILT', 'PEAT',
    'MINERAL', 'CRYSTAL', 'EROSION', 'BEDROCK', 'TERRAIN', 'FOSSIL',
    // water features
    'BAY', 'BOG', 'FEN', 'COVE', 'POND', 'LAKE', 'GULF', 'REEF',
    'CREEK', 'BROOK', 'MARSH', 'RIVER', 'OCEAN', 'SHORE', 'SWAMP',
    'STREAM', 'LAGOON', 'HARBOR', 'ISLAND', 'RAPIDS', 'SPRING',
    'CASCADE', 'ESTUARY', 'WETLAND', 'CHANNEL', 'CURRENT', 'WATERFALL',
    // seasons and time
    'DAWN', 'DUSK', 'NOON', 'THAW', 'AUTUMN', 'WINTER', 'SUMMER',
    'SUNRISE', 'SUNSET', 'SOLSTICE', 'EQUINOX',
    // ecosystems
    'FOREST', 'DESERT', 'TUNDRA', 'JUNGLE', 'PRAIRIE', 'GLACIER', 'SAVANNA',
    'TAIGA', 'STEPPE', 'GROVE', 'MEADOW', 'CANOPY', 'THICKET', 'HABITAT',
    'WOODLAND', 'WETLANDS', 'MANGROVE', 'CHAPARRAL',
    // plants, fungi, and plant parts
    'IVY', 'HAY', 'RYE', 'FERN', 'MOSS', 'VINE', 'KELP', 'REED', 'RUSH',
    'WEED', 'HERB', 'BULB', 'ROOT', 'BARK', 'LEAF', 'SEED', 'STEM', 'TWIG',
    'BUD', 'SAP', 'BLOOM', 'PETAL', 'GRASS', 'HEDGE', 'TRUNK', 'ROOTS',
    'FROND', 'SHRUB', 'SPORE', 'LICHEN', 'FUNGUS', 'MILDEW',
    'POLLEN', 'TIMBER', 'BRANCH', 'FLOWER', 'GARDEN', 'PEBBLE',
    'TOADSTOOL', 'MUSHROOM', 'SEEDLING', 'SAPLING',
    // general nature
    'TIDE', 'WAVE', 'DEN', 'NEST', 'HIVE', 'BURROW', 'WARREN',
  ],
  city: [
    // 3-letter words
    'HUB', 'BUS', 'CAB', 'CAR', 'VAN', 'BAR', 'PUB', 'INN', 'LOT', 'ROW',
    'GYM', 'RIG', 'JAM', 'TAX', 'COP', 'GAS', 'KEY', 'MAP', 'RUN', 'WAY',
    // 4-letter words — roads, structures, vehicles
    'CURB', 'PARK', 'CAFE', 'TAXI', 'LANE', 'ROAD', 'GATE', 'WALL', 'SIGN',
    'LAMP', 'DOCK', 'PIER', 'MALL', 'BANK', 'SHOP', 'LOFT', 'FLAT', 'ROOF',
    'STEP', 'RAIL', 'PAVE', 'ARCH', 'HALL', 'DOME', 'WARD', 'PORT', 'TRAM',
    'BIKE', 'WALK', 'SMOG', 'NEON', 'GRID', 'ZONE', 'SLAB', 'VENT', 'DUCT',
    'EXIT', 'RAMP', 'STOP', 'MILE', 'MAIN', 'FARE', 'RIDE', 'POLE', 'SHED',
    'LIFT', 'PUMP', 'PIPE', 'WIRE', 'HONK', 'BUZZ', 'RIOT', 'DUSK', 'GRIT',
    'SOOT', 'TILE', 'BEAM', 'WELD', 'BOLT', 'STUD', 'SPAN', 'KERB', 'KILN',
    'SIREN', 'DEED', 'RENT', 'TOLL', 'CREW',
    // 5-letter words — neighborhoods, commerce, transit
    'TOWER', 'PLAZA', 'METRO', 'BLOCK', 'ALLEY', 'URBAN', 'CIVIC', 'CROWD',
    'NOISE', 'WHARF', 'FERRY', 'ROUTE', 'BOOTH', 'BENCH', 'FENCE', 'GRILL',
    'DINER', 'STORE', 'VENUE', 'ARENA', 'HOTEL', 'MOTEL', 'VILLA', 'MANOR',
    'DEPOT', 'CRANE', 'TRUCK', 'SEDAN', 'COUPE', 'CYCLE', 'MOPED', 'TRAIN',
    'STEEL', 'BRICK', 'GLASS', 'STAIR', 'LEDGE', 'DRAIN', 'SEWER', 'VALVE',
    'METER', 'KIOSK', 'STAND', 'STALL', 'AISLE', 'LOBBY', 'ATTIC', 'PATIO',
    'STOOP', 'PORCH', 'GUILD', 'MAYOR', 'UNION', 'LEASE', 'CONDO', 'SUITE',
    'STORY', 'FLOOR', 'LEVEL', 'STRIP', 'TRACT', 'FOYER', 'MURAL', 'DWELL',
    'BYLAW', 'SPIRE', 'MORTAR',
    // 6-letter words — buildings, dining, utilities
    'BRIDGE', 'AVENUE', 'STREET', 'CORNER', 'MARKET', 'SQUARE', 'SUBWAY',
    'TUNNEL', 'MUSEUM', 'CHURCH', 'STATUE', 'OFFICE', 'CINEMA', 'BISTRO',
    'CELLAR', 'GARAGE', 'CANOPY', 'AWNING', 'GUTTER', 'CEMENT', 'GIRDER',
    'PILLAR', 'COLUMN', 'SOFFIT', 'LINTEL', 'BAZAAR', 'PARLOR', 'LOUNGE',
    'TAVERN', 'DUPLEX', 'BELFRY', 'TURRET', 'ARCADE', 'PIAZZA', 'PAGODA',
    'GAZEBO', 'ZONING', 'PERMIT', 'TENANT', 'UPTOWN', 'CABANA', 'MEDIAN',
    'ANNEXE', 'STUCCO', 'TARMAC', 'MANHOLE', 'RAFTER', 'ALCOVE', 'THRIFT',
    // 7-letter words — skyline, transit, architecture
    'SKYLINE', 'TRAFFIC', 'PARKING', 'BOROUGH', 'THEATER', 'GALLERY',
    'LIBRARY', 'FACTORY', 'STATION', 'TRANSIT', 'COMMUTE', 'EXPRESS',
    'FREIGHT', 'TERRACE', 'BALCONY', 'STEEPLE', 'CHIMNEY', 'STADIUM',
    'TROLLEY', 'TRAMWAY', 'VIADUCT', 'ASPHALT', 'GRANITE', 'MASONRY',
    'CORNICE', 'PARAPET', 'MANSION', 'COMPLEX', 'QUARTER', 'UTILITY',
    'HYDRANT', 'CISTERN', 'POTHOLE', 'BOLLARD', 'WALKWAY', 'HALLWAY',
    'ROOFTOP', 'SIGNAGE', 'VILLAGE', 'OUTLOOK', 'PRECINCT', 'LAUNDRY',
    'HANDRAIL', 'GUARDRAIL',
    // 8-letter words — districts, infrastructure
    'DISTRICT', 'SIDEWALK', 'BUILDING', 'DOWNTOWN', 'ELEVATED', 'MONORAIL',
    'PAVEMENT', 'TOWNHOME', 'MONUMENT', 'CORRIDOR', 'SCAFFOLD', 'HIGHRISE',
    'LANDMARK', 'OVERPASS', 'UNDERPASS', 'JUNCTION', 'TERMINUS', 'DISPATCH',
    'GRIDLOCK', 'COMMUTER', 'MOTORIST', 'CROSSING', 'CURBSIDE', 'ALLEYWAY',
    'TENEMENT', 'BUNGALOW', 'PAVILION', 'SHOWROOM', 'WORKSHOP', 'EMPORIUM',
    'BOUTIQUE', 'PHARMACY', 'PIZZERIA', 'BARRACKS', 'LAMPPOST', 'PENTHOUSE',
    // 9+ letter words — metropolis, cityscape
    'APARTMENT', 'PROMENADE', 'BOULEVARD', 'WAREHOUSE', 'SKYSCRAPER',
    'METROPOLIS', 'PEDESTRIAN', 'STREETCAR', 'TOLLBOOTH', 'CROSSROADS',
    'NIGHTCLUB', 'NIGHTLIFE', 'BOOKSTORE', 'BROWNSTONE', 'TOWNSCAPE',
    'CITYSCAPE', 'RESIDENCE', 'ESPLANADE', 'COLONNADE', 'BOARDWALK',
    'WATERFRONT', 'STOREFRONT', 'FOOTBRIDGE', 'CLOCKTOWER', 'COURTYARD',
    'CROSSWALK', 'CATHEDRAL', 'MUNICIPAL', 'TOWNHOUSE', 'ESCALATOR',
    'BRICKWORK', 'SPRAWL', 'SUBURB',
  ],
  space: [
    // 3-letter words (20)
    'ION', 'ARC', 'ORB', 'SUN', 'GAS', 'JET', 'RAY', 'RED', 'DIM', 'SKY',
    'ERA', 'GAP', 'HUB', 'RIM', 'TIP', 'ARM', 'BOW', 'DOT', 'LAP', 'TAU',
    // 4-letter words (50)
    'STAR', 'MOON', 'MARS', 'NOVA', 'VOID', 'DUST', 'RING', 'AXIS', 'CORE',
    'BEAM', 'GLOW', 'WARP', 'SPIN', 'DARK', 'VAST', 'DEEP', 'DISC', 'LENS',
    'APEX', 'BURN', 'CONE', 'FUEL', 'HAZE', 'IRON', 'LOBE', 'MASS', 'POLE',
    'TANK', 'VEIL', 'WAKE', 'ZERO', 'BELT', 'FLUX', 'HALO', 'KNOT', 'NEON',
    'TAIL', 'VOLT', 'ZINC', 'BAND', 'EMIT', 'FADE', 'GRID', 'LEAP', 'NODE',
    'SLAB', 'TIER', 'MESH', 'DOCK', 'MUON',
    // 5-letter words (52)
    'ORBIT', 'COMET', 'LUNAR', 'SOLAR', 'FLARE', 'PHASE', 'LIGHT', 'PROBE',
    'CRAFT', 'TITAN', 'VENUS', 'PLUTO', 'EARTH', 'OZONE', 'GAMMA', 'ALPHA',
    'QUARK', 'DWARF', 'GIANT', 'PULSE', 'FIELD', 'FORCE', 'DRIFT', 'TRAIL',
    'ARGON', 'BORON', 'CERES', 'DELTA', 'EPOCH', 'FOCUS', 'HELIX', 'INERT',
    'LASER', 'MASER', 'NADIR', 'OMEGA', 'RADAR', 'SIGMA', 'THETA', 'XENON',
    'DIODE', 'EJECT', 'GLUON', 'LUMEN', 'OPTIC', 'PRISM', 'RELAY', 'SPACE',
    'TIDAL', 'VAPOR', 'METAL', 'DECAY',
    // 6-letter words (56)
    'NEBULA', 'GALAXY', 'PULSAR', 'QUASAR', 'METEOR', 'ROCKET', 'LAUNCH',
    'CRATER', 'COSMIC', 'PHOTON', 'PLASMA', 'FUSION', 'ZENITH', 'APOGEE',
    'CORONA', 'BINARY', 'SIGNAL', 'THRUST', 'MODULE', 'DEBRIS', 'CARBON',
    'COPPER', 'DIPOLE', 'ENERGY', 'GEMINI', 'HALLEY', 'HUBBLE', 'IMPACT',
    'KELVIN', 'LEPTON', 'MAGNET', 'NUCLEI', 'OXYGEN', 'PARSEC', 'SATURN',
    'SPHERE', 'URANUS', 'VECTOR', 'ALBEDO', 'BARYON', 'CHARGE', 'DEGREE',
    'EUROPA', 'FLIGHT', 'HELIUM', 'JOVIAN', 'KEPLER', 'LANDER', 'PERIOD',
    'SODIUM', 'TAURUS', 'VACUUM', 'ZODIAC', 'BOLIDE', 'CYGNUS', 'VORTEX',
    // 7-letter words (42)
    'ECLIPSE', 'GRAVITY', 'CLUSTER', 'NEUTRON', 'CAPSULE', 'SHUTTLE',
    'MISSION', 'HORIZON', 'ANTENNA', 'PERIGEE', 'THERMAL', 'SPECTRA',
    'ANGULAR', 'AZIMUTH', 'DENSITY', 'ELEMENT', 'FISSION', 'IONIZER',
    'LATTICE', 'MERCURY', 'NEPTUNE', 'ORBITAL', 'PAYLOAD', 'QUANTUM',
    'REACTOR', 'SCANNER', 'TRITIUM', 'URANIUM', 'VOYAGER', 'ANOMALY',
    'CIRCUIT', 'DESCENT', 'GALILEO', 'LANDING', 'NUCLEUS', 'OUTPOST',
    'PIONEER', 'RADIANT', 'TRACKER', 'VOLTAGE', 'CHAMBER', 'EXHAUST',
    // 8-letter words (28)
    'ASTEROID', 'UNIVERSE', 'MAGNETISM', 'REDSHIFT', 'ELECTRON', 'FIREBALL',
    'GRADIENT', 'HYDROGEN', 'ISOTOPES', 'LATITUDE', 'NITROGEN', 'PARALLAX',
    'SOLSTICE', 'SPECTRUM', 'VELOCITY', 'WORMHOLE', 'BLACKOUT', 'CENTAURI',
    'CRESCENT', 'EMISSION', 'FUSELAGE', 'GRAPHITE', 'IMPACTOR', 'OBSERVER',
    'POLARITY', 'ROTATION', 'THRUSTER', 'UNSTABLE',
    // 9-letter words (18)
    'TELESCOPE', 'SATELLITE', 'SUPERNOVA', 'RADIATION', 'STARLIGHT',
    'ASTRONAUT', 'CELESTIAL', 'COSMOLOGY', 'EXOPLANET', 'MAGNETRON',
    'PLANETARY', 'STARGAZER', 'CHROMATIC', 'GYROSCOPE', 'MICROWAVE',
    'RESONANCE', 'SPACETIME', 'PERIAPSIS',
    // 10+ letter words (16)
    'ATMOSPHERE', 'COMBUSTION', 'HEMISPHERE', 'LABORATORY', 'NAVIGATION',
    'PROPULSION', 'REFRACTION', 'TRAJECTORY', 'WAVELENGTH', 'ASTRONOMER',
    'CONVECTION', 'EXPERIMENT', 'LUMINOSITY', 'RELATIVITY', 'SPACECRAFT',
    'RETROGRADE',
  ],
};

function buildPool(themeWords, maxLen) {
  const dict = loadJSON(resolve(DATA_DIR, 'dictionary.json'));
  const seen = new Set();
  const pool = [];

  // Add theme words first (priority)
  for (const word of themeWords) {
    if (word.length < 3 || word.length > maxLen || !/^[A-Z]+$/.test(word)) continue;
    if (seen.has(word)) continue;
    seen.add(word);
    // Find clue from dictionary, or use a placeholder
    const dictEntry = dict.find(e => e.word === word);
    pool.push({ word, clue: dictEntry ? dictEntry.clue : `Related to the theme` });
  }

  // Add full dictionary
  for (const entry of dict) {
    if (!entry.word || entry.word.length < 3 || entry.word.length > maxLen) continue;
    if (!/^[A-Z]+$/.test(entry.word)) continue;
    if (seen.has(entry.word)) continue;
    seen.add(entry.word);
    pool.push(entry);
  }

  return pool;
}

async function generatePuzzle(theme, size) {
  const themeWords = THEME_KEYWORDS[theme] || [];
  const pool = buildPool(themeWords, size);
  console.log(`  ${theme}: ${pool.length} words (${themeWords.length} themed)`);

  const result = await buildSymmetric(pool, size, {
    minWords: 45, maxAttempts: 2000, symmetryTolerance: 5
  });

  if (!result) {
    console.log(`  ${theme}: FAILED to find symmetric layout`);
    return null;
  }

  console.log(`  ${theme}: ${result.placements.length} words, symmetric ✓`);

  const puzzle = {
    theme: theme.charAt(0).toUpperCase() + theme.slice(1),
    size: result.size,
    level: 'adult',
    grid: result.grid,
    numbers: result.numbers,
    clues: { across: [], down: [] },
    generated: new Date().toISOString()
  };

  for (const p of result.placements) {
    const num = result.numbers[p.row][p.col];
    const entry = { number: num, clue: p.clue, answer: p.word };
    if (p.dir === 'across') puzzle.clues.across.push(entry);
    else puzzle.clues.down.push(entry);
  }
  puzzle.clues.across.sort((a, b) => a.number - b.number);
  puzzle.clues.down.sort((a, b) => a.number - b.number);

  return puzzle;
}

async function main() {
  const size = 15;
  const themes = ['nature', 'city', 'space'];

  mkdirSync(PUBLIC_DIR, { recursive: true });
  mkdirSync(DATA_DIR, { recursive: true });

  console.log(`Generating ${size}x${size} symmetric puzzles...\n`);

  const manifest = [];

  for (const theme of themes) {
    const puzzle = await generatePuzzle(theme, size);
    if (!puzzle) continue;

    const slug = theme;
    const filename = `${slug}.json`;

    writeFileSync(resolve(PUBLIC_DIR, filename), JSON.stringify(puzzle, null, 2));
    writeFileSync(resolve(DATA_DIR, filename), JSON.stringify(puzzle, null, 2));
    manifest.push({ file: filename, name: puzzle.theme });

    // Print grid
    console.log(`\n  ${puzzle.theme} (${puzzle.clues.across.length}A + ${puzzle.clues.down.length}D):`);
    console.log(puzzle.grid.map(r =>
      '  ' + r.map(c => c === '#' ? '.' : c).join(' ')
    ).join('\n'));
    console.log();
  }

  writeFileSync(resolve(PUBLIC_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('Wrote manifest.json with', manifest.length, 'puzzles.');
}

main().catch(err => { console.error(err); process.exit(1); });
