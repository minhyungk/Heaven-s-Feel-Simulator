/**
 * Combat narration templates — English
 *
 * {A} = attacker, {B} = defender, {무기} = class weapon, {동사} = class verb
 * {보구명} = NP name, {스킬명} = skill name, {특성} = anti-trait target
 */

// ─── Encounter ───

export const ENCOUNTER_TEMPLATES = {
  default: {
    hunt_hunt: [
      "{A} and {B} lock eyes. Killing intent collides.",
      "The magical energy of two Heroic Spirits clashes. Battle is inevitable.",
      "Two Heroic Spirits meet in the darkness. Without a word, they ready themselves for combat.",
      "{A}'s magical energy surges. {B} rests a hand upon their {무기}.",
      "There is no avoiding it. Both have already recognized the other as an enemy.",
      "The quiet of the night shatters. The auras of two Heroic Spirits collide.",
    ],
    hunt_guard: [
      "{B} senses {A}'s approach. A defensive stance is taken.",
      "{A} draws near. {B} was already prepared.",
      "{B}, standing guard, draws a blade to meet {A}.",
      "{A}'s presence is detected. {B} is already in a combat stance.",
      "{B} turns silently toward {A}. It seems they were expecting this.",
    ],
    ambush: [
      "Without a trace — {A}'s {무기} cleaves through the darkness.",
      "The assassin's {무기} flashes. An ambush.",
      "A shadow moves — too late. {A} strikes first!",
      "Without a sound, {A} has closed to striking distance.",
      "From behind the unguarded {B}, {A}'s {무기} aims for a killing blow!",
    ],
    detected: [
      "The hidden {B}'s magical energy wavers. They've been discovered.",
      "{A} sees through {B}'s concealment!",
      "A magical signature detected — {A} has pinpointed {B}'s exact location.",
      "Discovered. {B} abandons concealment and reveals themselves.",
      "{A}'s detection pierces {B}'s stealth. There is nowhere left to hide.",
    ],
  },
  overrides: {} as Record<number, string[]>,
};

// ─── Combat ───

export const CLASH_TEMPLATES = {
  default: {
    even: [
      "{A}'s {무기} grazes {B}. A counterattack follows immediately.",
      "An even match. Both {무기} send sparks into the night.",
      "Offense and defense intertwine. Neither Heroic Spirit yields a single step.",
      "{B} blocks {A}'s strike. The impact shakes the night air.",
      "A fierce exchange. The outcome remains unseen.",
      "The {무기} of both Heroic Spirits clash in midair. The shockwave ripples outward.",
      "So this is the measure of the enemy — both acknowledge the other's skill as the exchange continues.",
    ],
    advantage: [
      "{B} barely manages to block {A}'s assault.",
      "{A}'s relentless {동사} attacks drive {B} back.",
      "{B}'s defense falters. {A} closes the distance.",
      "The offensive belongs to {A}. {B} can only focus on defense.",
      "{B} cannot keep pace with {A}'s speed.",
      "A step too late. {B} is being drawn into {A}'s rhythm.",
    ],
    overwhelming: [
      "There is no contest. {B} defends desperately, but...",
      "A one-sided assault by {A}. {B} has no room to counterattack.",
      "Overwhelming. Before {A}'s {무기}, {B} is utterly helpless.",
      "A league apart in combat power. {B}'s defense crumbles to pieces.",
      "{A} has completely dominated {B}. The outcome may already be decided.",
    ],
    disadvantage: [
      "{A} barely dodges {B}'s strikes.",
      "The situation is dire. {A} is being pushed back.",
      "{B}'s pressure is immense. {A} must find an opening.",
      "{A}'s counterattacks are repelled time and again. The matchup is unfavorable.",
      "{A} has been drawn completely into {B}'s rhythm. They are barely holding on.",
      "This cannot continue. {A} desperately maintains the defensive line.",
    ],
  },
  overrides: {} as Record<number, Record<string, string[]>>,
};

// ─── Skill Activation ───

export const SKILL_TEMPLATES = {
  default: {
    atk_boost: [
      "{A}'s '{스킬명}' activates! Magical energy concentrates in their {무기}.",
      "The will to fight blazes forth. '{스킬명}'!",
      "'{스킬명}' — {A}'s combat power surges!",
      "{A} deploys a skill. The power of '{스킬명}' dwells within their {무기}.",
      "Magical energy envelops {A}'s body. '{스킬명}' activated.",
      "{A}'s gaze sharpens. '{스킬명}' — combat power that transcends all limits.",
    ],
    def_boost: [
      "'{스킬명}' reads the trajectory of the enemy's attack.",
      "{A}'s defenses are fortified. '{스킬명}'.",
      "{A} activates a skill. '{스킬명}' — the enemy's attacks are laid bare.",
      "'{스킬명}'. {A}'s kinetic vision is honed to its very limit.",
      "Defensive skill activated. {A} will not falter. '{스킬명}'.",
      "'{스킬명}' — {A} has already read the enemy's next move.",
    ],
    survival: [
      "A fatal wound — but {A} does not fall. '{스킬명}'.",
      "'{스킬명}' pulls {A} back from the brink of death.",
      "It seemed to be over — '{스킬명}' activates!",
      "On the verge of a lethal blow — '{스킬명}'! The Heroic Spirit's life force blazes.",
      "Violent magical energy erupts from {A}'s body. '{스킬명}' — it is not over yet.",
    ],
    charm: [
      "{A}'s '{스킬명}' beguiles the enemy!",
      "'{스킬명}' — {A}'s allure becomes a weapon.",
      "{A} smiles. In that instant, '{스킬명}' activates.",
      "Reason grows hazy. Before {A}'s '{스킬명}', the enemy is rendered powerless.",
    ],
    anti_magic: [
      "{A}'s Magic Resistance nullifies the magecraft.",
      "Magecraft? It does not reach. {A}'s Magic Resistance repels it.",
      "All spells scatter before {A}'s Magic Resistance.",
      "Magic Resistance activates from within {A}. The enemy's magecraft loses its effect.",
    ],
    mad_enhancement: [
      "{A} roars! Not a shred of reason remains!",
      "Mad Enhanced {A} unleashes tremendous combat power!",
      "In place of reason, only raw power remains. {A}'s Mad Enhancement activates!",
      "Primal violence incarnate. The Mad Enhanced {A} exists only to destroy the enemy.",
    ],
    territory: [
      "{A}'s Territory Creation activates! This domain belongs to {A}.",
      "Within the territory, {A}'s combat power far exceeds normal limits. Territory Creation activated.",
      "The territory {A} has constructed gleams with light. Offense and defense efficiency rises.",
    ],
    presence_concealment: [
      "{A}'s presence fades. Their location becomes unknowable.",
      "Presence Concealment — {A}'s magical signature vanishes entirely.",
    ],
    independent_action: [
      "{A} operates independently, even without a Master. Independent Action activated.",
      "Even if the connection with the Master is severed — {A} does not waver.",
    ],
    divinity: [
      "{A}'s Divinity shines forth. The blood of gods elevates their combat power.",
      "Core of a divine spirit. {A}'s Divinity intervenes in the battle.",
    ],
  },
  overrides: {} as Record<number, Record<string, string[]>>,
};

// ─── Noble Phantasm Activation ───

export const NP_TEMPLATES = {
  default: [
    "Magical energy surges explosively —",
    "True Name release ——『{보구명}』!!",
  ],
  sealFullPower: [
    "The Master uses a Command Seal! A blow that exceeds all limits!",
  ],
  overrides: {} as Record<number, string[]>,
};

// ─── Special Attack ───

export const SPECIAL_ATTACK_TEMPLATES = {
  default: [
    "{보구명} reacts to {B}'s {특성} — its power amplifies!",
  ],
  specific: {
    servant: ["The King of Heroes' Noble Phantasm denies the very existence of Heroic Spirits."],
    divine: ["The flames of one who fears no gods burn the blood of divinity."],
    female: ["A blade gleams in the mist. Before this Noble Phantasm, {B} is helpless."],
    dragon: ["The dragon-slaying holy sword senses dragon blood!"],
    male: ["{보구명} pierces through {B}! An absolute advantage against males!"],
  } as Record<string, string[]>,
  resist: [
    "A direct anti-trait hit — yet {B} still stands.",
  ],
  overrides: {} as Record<number, string[]>,
};

// ─── Results ───

export const RESULT_TEMPLATES = {
  default: {
    decisive: [
      "{A}'s victory. {B} has been vanquished.",
      "The contest is decided. {B}'s form begins to fade.",
      "A one-sided victory. {B}'s Spirit Core shatters to pieces.",
      "{B} falls. {A}'s {무기} delivered the decisive blow.",
      "Overwhelming. {B} could not rise again.",
      "{A}'s relentless assault has completely subdued {B}. The battle is over.",
    ],
    close: [
      "After a bloody struggle, a victor emerges.",
      "A narrow victory. Even {A} did not escape unscathed.",
      "The margin was paper-thin. But {A} survived.",
      "A fierce contest to the last. In the final moment, {A}'s will surpassed {B}'s.",
      "{B} falls. {A} is wounded as well, but the victor is {A}.",
      "A battle with no quarter given. By the narrowest margin, {A} claims victory.",
    ],
    close_loss: [
      "It was close — but {A} was defeated by {B}. {B} does not seem unscathed either.",
      "The outcome was decided by the thinnest margin. {A} has fallen, but {B} bears deep wounds as well.",
      "Their skill was evenly matched. But today, {A}'s fortune ran out.",
      "A defeat by a hair's breadth. {A} refused to give in until the very end, but...",
      "{A}'s magical energy is spent. {B} does not appear at ease, either.",
    ],
    draw: [
      "Both withdraw. The conclusion is deferred.",
      "The standoff continues. For today, this is where it ends.",
      "Acknowledging each other's strength, both retreat. The decisive battle will come another day.",
      "There is no separating their skill. The two Heroic Spirits withdraw in silence.",
      "Combat has ceased. Neither side achieved a decisive advantage.",
    ],
    quiet: [
      "A quiet night settles over Fuyuki City.",
      "Nothing happened. ...Or so it appears.",
      "Tonight ends without battle.",
      "Silence. No trace of the enemy can be felt.",
    ],
  },
  overrides: {} as Record<number, Record<string, string[]>>,
};

// ─── Defeat Crisis ───

export const DEFEAT_CRISIS_TEMPLATES = {
  phase1: [
    "{B} bears down on {A}.",
    "{B}'s attacks press {A} hard.",
    "{B}'s momentum does not falter. {A} begins to be pushed back.",
    "The engagement intensifies. {B} has seized the initiative.",
    "{A}'s counterattack is repelled. {B}'s defense is ironclad.",
  ],
  phase2: [
    "{A} is struggling.",
    "{A} is being overwhelmed...",
    "{A} can barely manage a defense.",
    "Magical energy is draining. {A}'s movements grow sluggish.",
    "{A}'s evasions reach their limit. Blows begin to land.",
    "{B}'s consecutive strikes dismantle {A}'s defense, piece by piece.",
  ],
  phase3: [
    "{A}'s defense is crumbling. Defeat seems unavoidable.",
    "At this rate, {A} will fall.",
    "{B}'s overwhelming assault. {A} has been driven to the brink.",
    "The battle line has already collapsed. {A} is running out of time.",
    "{A}'s body staggers. Endurance has reached its limit.",
    "A critical blow lands. {A} is on the verge of collapse.",
  ],
};

// ─── Escape Attempt ───

export const ESCAPE_ATTEMPT_TEMPLATES = {
  try: [
    "The order to retreat is given to {A}.",
    "{A} attempts to withdraw at the Master's command...",
    "{A} tries to disengage from the battlefield...",
    "The retreat order is issued. {A} opens distance and attempts to break away.",
    "Now is the time to fall back. {A} searches for a route of retreat.",
  ],
  success_easy: [
    "{A} shakes off the enemy's pursuit with ease and successfully retreats.",
    "{A}'s swift mobility allows for an effortless escape.",
    "{B}'s pursuit is easily evaded. {A} has already vanished into the distance.",
    "This level of pursuit poses no challenge. {A} withdraws at leisure.",
  ],
  success_normal: [
    "Evading the enemy Servant's eyes, a hard-fought escape succeeds.",
    "{A} shakes off the enemy's pursuit and successfully retreats.",
    "The pursuers are lost. {A} narrowly breaks free of the front line.",
    "After a fierce chase — {A} manages to disengage.",
  ],
  success_hard: [
    "Miraculous — {A} evades {B}'s relentless pursuit by a hair's breadth!",
    "Running with the resolve to die, survival is barely secured. {A} is on the verge of collapse.",
    "It seemed impossible. Yet {A} has done it. Escape, by the narrowest of margins.",
    "{B}'s hand was about to reach — in that instant, {A} changes direction. A nearly divine evasion.",
  ],
  success: [
    "Success. {A} has shaken off the enemy's pursuit and retreated safely.",
    "{A}'s quick judgment proves correct. They have slipped from the enemy's grasp.",
  ],
  success_seal: [
    "The Command Seal forcibly teleports {A}! A safe withdrawal is secured.",
    "The Master uses a Command Seal! {A} vanishes in a flash of magical light.",
    "Command Seal activated — magical energy envelops {A}'s body and they disappear from the battlefield in an instant.",
  ],
  fail: [
    "Failed — {B}'s tenacious pursuit blocks the retreat!",
    "{A}'s escape route is cut off! {B} has caught them!",
    "{B}'s speed outpaces {A}. Surrounded.",
    "There is no path of retreat. {B} has already sealed off the escape route.",
  ],
  refused: [
    "{A} refuses to retreat and continues the fight! (Master trust: Low)",
    "... {A} ignores the Master's command, showing the will to fight to the bitter end.",
    "{A} defies the Master's order. There is no intention of leaving this battlefield.",
  ],
  forcedDefeat: [
    "In the end, {A}'s Spirit Core is pierced by {B}... They fade into nothing.",
    "{A}'s form dissolves into motes of light. This is the end.",
    "{B}'s final strike pierces {A}'s heart. {A} slowly fades into light and disappears.",
    "{A} drops to their knees. The light of the Spirit Core gutters out.",
  ],
};

// ─── Area Exploration ───

export const AREA_EXPLORATION_TEMPLATES: Record<string, string[]> = {
  ryuudou: [
    "Scouting Ryuudou Temple with caution. The ley line pulses with dense magical energy.",
    "Exploring the grounds of Ryuudou Temple. A thick aura of magical energy hangs in the air.",
  ],
  miyama: [
    "Patrolling the residential streets of Miyama with vigilance.",
    "Moving quietly through the alleyways of the Miyama district.",
  ],
  school: [
    "Exploring the school. The proximity to the ley line makes magical energy abundant here.",
    "The school at night. Footsteps echo through the deserted corridors.",
  ],
  forest: [
    "Wandering the forest in search of the enemy.",
    "Moving cautiously between the dark silhouettes of the forest trees.",
  ],
  bridge: [
    "Scouting atop Fuyuki Bridge. The open terrain makes encounters likely.",
    "Fuyuki Bridge, swept by the river wind. The enemy could appear from anywhere.",
  ],
  downtown: [
    "Scouting the urban district with vigilance.",
    "Moving between the buildings of the downtown area, alert for threats.",
  ],
  port: [
    "Exploring the darkness of the harbor. The terrain favors concealment.",
    "Moving silently among the harbor containers.",
  ],
  church: [
    "Scouting the area around the church. As neutral ground, combat is unlikely here.",
    "The sacred aura of the church can be felt. A domain of peace.",
  ],
  park: [
    "Scouting the riverside park. Scarce cover makes concealment difficult.",
    "The open riverside park. Clear sightlines favor an Archer.",
  ],
};

export const AREA_EXPLORATION_HIDE: Record<string, string[]> = {
  ryuudou: ["Taking cover behind the main hall of Ryuudou Temple."],
  miyama: ["Concealing oneself in a shadowed alley of the Miyama district."],
  school: ["Slipping into an empty classroom to hide."],
  forest: ["Retreating deep into the forest to suppress all presence."],
  bridge: ["Hiding beneath the bridge, though the terrain makes concealment difficult."],
  downtown: ["Taking cover between the buildings of the downtown area."],
  port: ["Hiding behind the harbor containers, erasing all trace of presence."],
  church: ["Concealing oneself quietly in the shadow of the church."],
  park: ["Hiding in the riverside park. With so little cover, discovery seems inevitable."],
};

export const AREA_EXPLORATION_GUARD: Record<string, string[]> = {
  ryuudou: ["Maintaining a defensive posture at the Ryuudou Temple ley line."],
  miyama: ["Standing guard in the Miyama residential area, alert on all sides."],
  school: ["Keeping watch from the school rooftop, scanning in every direction."],
  forest: ["Standing watch among the trees of the forest."],
  bridge: ["Guarding against enemy approach on Fuyuki Bridge."],
  downtown: ["Observing the surroundings at a downtown intersection."],
  port: ["Surveying the area at the harbor, maintaining a defensive posture."],
  church: ["Standing guard quietly around the church."],
  park: ["Keeping watch across the open ground of the riverside park."],
};

export const TERRITORY_CREATION_NARRATION: Record<string, string[]> = {
  low: [
    "{A} constructs a somewhat crude territory with Territory Creation ({rank}). Better than nothing, at least.",
  ],
  mid: [
    "{A} is establishing a solid stronghold with Territory Creation ({rank}).",
  ],
  high: [
    "{A} is constructing an exceptional territory with Territory Creation ({rank}).",
  ],
  ex: [
    "{A} is deploying an overwhelming stronghold with Territory Creation ({rank})!",
  ],
};

export const TERRITORY_CREATION_OVERRIDES: Record<number, string> = {};

export const ENCOUNTER_DETAIL_TEMPLATES: Record<string, Record<string, string[]>> = {
  hunt_hunt: {
    default: [
      "A Servant has been spotted.",
      "An enemy magical signature detected!",
    ],
  },
  hunt_guard: {
    default: [
      "Encountered {B}, who was standing guard!",
      "{B} was on alert for our approach!",
    ],
  },
  guard_hunt: {
    default: [
      "Enemy {B} has spotted us and approaches in a combat stance!",
      "{B} is advancing toward our position!",
    ],
  },
  detected: {
    default: [
      "Spotted by enemy {B}!",
      "Our concealment has been compromised! {B} is closing in!",
    ],
    park: [
      "The lack of cover makes discovery all but certain. Spotted by enemy {B}!",
    ],
  },
  ambush: {
    default: [
      "Without a trace — an ambush!",
    ],
  },
};

export const COUNTER_SEAL_COMBAT_TEMPLATES = {
  phase1: [
    "{A} presses the attack against {B}.",
    "The battle between {A} and {B} intensifies.",
    "{A} is locked in fierce combat with {B}.",
  ],
  phase2: [
    "The enemy Master is about to use a Command Seal!",
  ],
};

export const INTERVENTION_TEMPLATES = {
  disadvantage: [
    "{서번트} is being pushed back — order a retreat?",
  ],
  even: [
    "The next strike will decide it — press the advantage with a Command Seal?",
  ],
  advantage: [
    "Now is the chance — finish it with a Noble Phantasm?",
  ],
  ambushed: [
    "They have the drop on us — ! Immediate response required.",
  ],
};

// ─── fallback strings ───

export const FALLBACK_HIDE = "Concealing oneself, suppressing all presence.";
export const FALLBACK_GUARD = "Standing guard, alert for threats.";
export const FALLBACK_EXPLORE = "Scouting the surroundings.";
