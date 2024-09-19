export function generateRandomName(): string {
  const firstNames = [
    "Captain",
    "Agent",
    "Professor",
    "Dr.",
    "Commander",
    "Major",
    "Chief",
    "Master",
    "Sir",
    "Lady",
    "Admiral",
    "Guardian",
    "Shadow",
    "Ninja",
    "Cosmic",
    "Quantum",
    "Rogue",
    "Turbo",
    "Phantom",
    "Lord",
    "General",
    "Rebel",
    "Cyber",
    "Mystic",
    "Neon",
    "Blaze",
    "Nova",
    "Titan",
    "Specter",
    "Vortex",
  ];
  const lastNames = [
    "Bear",
    "Falcon",
    "Lynx",
    "Otter",
    "Panther",
    "Stark",
    "Skywalker",
    "Mystic",
    "Voyager",
    "Phoenix",
    "Wolf",
    "Dragon",
    "Lion",
    "Maverick",
    "Thunder",
    "Blade",
    "Viper",
    "Kraken",
    "Griffin",
    "Cobra",
    "Rocket",
    "Jet",
    "Hawk",
    "Fox",
    "Shadow",
    "Bolt",
    "Titan",
    "Frost",
    "Saber",
    "Ghost",
    "Eclipse",
    "Ranger",
    "Hydra",
    "Blaze",
  ];

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

  return `${firstName} ${lastName}`;
}