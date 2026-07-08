// The Deep Delvers: 300 souls went down. This is what's left of them.
// Pages are placed in depth order — the story reads as you descend.

export interface PageDef { title: string; text: string; }

export const PAGES: PageDef[] = [
  { title: 'Day 1', text: 'The Consortium pays triple for depth. Three hundred souls, one mountain, one contract. The survey says the mountain is hollow. Surveys never say why. — Foreman Hale' },
  { title: 'Day 9', text: 'Coal and copper enough to gild a city. The men sing. Barlow swears the echoes answer half a second late. Barlow also swears the moon owes him money.' },
  { title: 'Day 22', text: 'Doc says the thumping is our own blood in our ears. I asked why we all hear it at the same time. Doc has stopped eating with us.' },
  { title: 'Day 30', text: 'A chasm. No bottom that our lamps could find. We dropped a lantern down. It did not go out. It went AWAY. Hale says the quota does not care about geology. We build rails.' },
  { title: 'Day 41', text: 'Iron in fat veins, sulfur stinking like the devil\'s breakfast. Priya jokes that the mountain is rotten inside. Nobody laughs twice.' },
  { title: 'Day 48', text: 'Lost two men to the dark. Not to falls — to the dark. They walked past their torchlight and did not come back. We plant torches like crops now.' },
  { title: 'Day 60', text: 'The thumping is louder at depth. Sixty beats a minute. I counted mine. Sixty beats a minute. I am trying not to think about it. — Hale' },
  { title: 'Day 71', text: 'Found glowing mushrooms in a cavern like a blue-green chapel. First light down here we didn\'t have to carry. Some of the men just stood in it awhile.' },
  { title: 'Day 77', text: 'Priya boiled a glowshroom and bottled the light. Burns cold, never dies. She calls them everglows. She is a genius and I have told her so in writing.' },
  { title: 'Day 85', text: 'Silver. The Consortium men in clean coats came down, took samples, went up fast. They left their coats.' },
  { title: 'Day 92', text: 'Barlow found a door. Not a cave. A DOOR. Older than the Consortium, older than maps. We did not build the first mine here. We are not the first anything.' },
  { title: 'Day 98', text: 'The old ones left gifts in little stone rooms. A pendulum that pulls toward treasure. Boots that make the miles short. We take them. They wanted us to. Why do I know that?' },
  { title: 'Day 110', text: 'Doc speaks again, finally. Only one sentence. "It is not an echo if it answers first." We sent him up with the silver.' },
  { title: 'Day 124', text: 'Gold. Crystal. Enough wealth to buy the Consortium and burn its receipts. Half the men want to stop here. Half already dream in the mountain\'s rhythm. Hale keeps digging.' },
  { title: 'Day 139', text: 'The heartbeat is not under us. It is around us. Priya\'s instruments agree with the men\'s nightmares. We are inside the chest of something.' },
  { title: 'Day 151', text: 'It dreams. That is what the deep crew says. It has slept since before rivers, and its dreams leak up through the rock, and that is what a mine is. A leak.' },
  { title: 'Day 158', text: 'Ando walked into the obsidian face without his pick and came back with plans. Beautiful, precise, impossible plans. A device. A cradle to hold it. He was down there nine minutes.' },
  { title: 'Day 170', text: 'The vote was calm. That was the worst part. Three hundred hands raised, one question: if it wakes, does anything else get to exist? We are miners. We know how to end a mountain.' },
  { title: 'Day 184', text: 'We cannot build Ando\'s device. Uranium we have, and hands, and courage — but not the craft. The device needs a maker who arrives already knowing how to blast and smelt and survive. So: the walls.' },
  { title: 'Day 200', text: 'Three seals, three tests. Fire, iron, and gold. If you cannot cook powder, you have no business here. If you cannot break the third wall, you could never build the payload. The mine itself will interview you.' },
  { title: 'Day 233', text: 'We built the Cradle around Ando\'s plans, at the very floor of the world. It hums when you feed it nothing. It is patient. We were not built patient, but we learned.' },
  { title: 'Day 260', text: 'Most of the men have gone up to scatter the story as rumor — riches in the deep, tell everyone, tell no one why. Greed digs faster than duty. Whoever you are: you came for treasure. Good. That was the plan.' },
  { title: 'Day 311', text: 'It knows, I think. The rumbles are closer together. It talks in the men\'s sleep now, offers them things. If it speaks to you, remember: mountains do not love. They rehearse.' },
  { title: 'Day 400', text: 'Last page, so: the truth. The device ends everything — the mountain, the world it would have eaten, and you, and the memory of us. We weighed it all against one waking. Feed the Cradle. Do not listen to the heart. Do not hesitate. — Foreman Hale, at the bottom' },
];

export interface RelicDef {
  id: number;
  name: string;
  desc: string;     // mechanical effect
  flavor: string;
  color: number;
}

export const RELICS: RelicDef[] = [
  { id: 1, name: 'Ember Heart', color: 0xff8a4d,
    desc: 'Your lamp burns brighter (+2 light radius).',
    flavor: 'Warm like a coal that refuses to become ash.' },
  { id: 2, name: "Delver's Boots", color: 0xb08a5a,
    desc: 'You move 15% faster.',
    flavor: 'Three hundred years of hurrying, still in working order.' },
  { id: 3, name: 'Dowsing Pendulum', color: 0xd9c46a,
    desc: 'Senses treasure — marks pockets and vaults near you on the map, and tugs toward them.',
    flavor: 'It does not point at what you want. It points at what wants you.' },
  { id: 4, name: 'Featherweight Charm', color: 0xa8e0ff,
    desc: '+60 satchel capacity.',
    flavor: 'The ore is exactly as heavy. You simply stop being told about it.' },
  { id: 5, name: 'Ghost Pick', color: 0xc9f0e8,
    desc: 'Mining is 25% faster.',
    flavor: 'It swings itself, mostly. Try not to notice.' },
  { id: 6, name: 'Demolition Manual', color: 0xff6a6a,
    desc: 'All bombs gain +1 blast radius.',
    flavor: 'The margin notes are in four handwritings. The last one is very confident.' },
];

export const relicById = (id: number): RelicDef => RELICS[id - 1];

// Whispered at random in the deep. The mountain is a bad roommate.
export const DEEP_WHISPERS: string[] = [
  'Something shifts in the dark below. Then it politely stops.',
  'You hear digging, far off. You stop to listen. It does not.',
  'The heartbeat skips once. You feel briefly, horribly noticed.',
  'Warm air breathes up the tunnel. There is no weather down here.',
  'A rock falls somewhere. Then another, closer. Then a long courtesy of silence.',
  'For one step, the floor feels like it is breathing. You decide it is not. Good decision.',
  'Your torchlight bends, very slightly, toward the depths.',
  'You could swear the tunnel behind you is shorter than it was.',
];
