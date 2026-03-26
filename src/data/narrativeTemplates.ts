/**
 * 전투 묘사 템플릿 시스템
 *
 * 구조: default (성격/클래스/상황 기반) → overrides (서번트 ID별)
 * {A} = 공격자, {B} = 방어자, {무기} = 클래스 무기, {동사} = 클래스 동사
 * {보구명} = NP 이름, {스킬명} = 스킬 이름, {특성} = 특공 대상 trait
 */

// ─── 조우 ───

export const ENCOUNTER_TEMPLATES = {
  default: {
    hunt_hunt: [
      "{A}(와)과 {B}의 시선이 마주쳤다. 살기가 부딪힌다.",
      "두 영령의 마력이 충돌한다. 전투는 피할 수 없다.",
    ],
    hunt_guard: [
      "{B}(이)가 {A}의 접근을 감지했다. 방어 태세를 취한다.",
      "{A}(이)가 다가온다. {B}(은)는 이미 준비되어 있었다.",
    ],
    ambush: [
      "기척도 없이 — {A}의 {무기}(이)가 어둠을 갈랐다.",
      "암살자의 {무기}(이)가 번뜩인다. 기습이다.",
    ],
    detected: [
      "숨어 있던 {B}의 마력이 흔들렸다. 들켰다.",
      "{A}(이)가 {B}의 은신을 간파했다!",
    ],
  },
  overrides: {} as Record<number, string[]>,
};

// ─── 교전 ───

export const CLASH_TEMPLATES = {
  default: {
    even: [
      "{A}의 {무기}(이)가 {B}를 스쳐지나간다. 반격이 즉시 이어진다.",
      "호각의 전투. 양자의 {무기}(이)가 불꽃을 튀긴다.",
    ],
    advantage: [
      "{B}(이)가 {A}의 공격을 겨우 막아내고 있다.",
      "{A}의 {동사} 공격이 {B}를 몰아붙인다.",
    ],
    overwhelming: [
      "상대가 되지 않는다. {B}(이)가 필사적으로 방어하고 있지만...",
      "{A}의 일방적인 공세. {B}에게는 반격할 틈조차 없다.",
    ],
    disadvantage: [
      "{A}(은)는 {B}의 공격을 겨우 회피하고 있다.",
      "불리하다. {A}(이)가 밀리고 있다.",
    ],
  },
  overrides: {} as Record<number, Record<string, string[]>>,
};

// ─── 스킬 발동 ───

export const SKILL_TEMPLATES = {
  default: {
    atk_boost: [
      "{A}의 '{스킬명}'(이)가 발동! {무기}에 마력이 집중된다.",
      "전투 의지가 타오른다. '{스킬명}'!",
    ],
    def_boost: [
      "'{스킬명}'(으)로 적의 공격 궤도를 읽어냈다.",
      "{A}의 방어가 강화된다. '{스킬명}'.",
    ],
    survival: [
      "치명상이다 — 하지만 {A}(은)는 쓰러지지 않았다. '{스킬명}'.",
      "'{스킬명}'(이)가 {A}를 죽음의 문턱에서 끌어올렸다.",
    ],
    charm: [
      "{A}의 '{스킬명}'(이)가 적을 현혹한다!",
    ],
    anti_magic: [
      "{B}의 대마력이 마술을 무력화한다.",
    ],
    mad_enhancement: [
      "{A}(이)가 포효한다! 이성 따위 남아있지 않다!",
    ],
  },
  overrides: {} as Record<number, Record<string, string[]>>,
};

// ─── 보구 발동 ───

export const NP_TEMPLATES = {
  default: [
    "마력이 폭발적으로 상승한다 —",
    "진명 해방 ——『{보구명}』!!",
  ],
  sealFullPower: [
    "마스터가 영주를 사용한다! 한계를 넘어선 일격!",
  ],
  overrides: {} as Record<number, string[]>,
};

// ─── 특공 발동 ───

export const SPECIAL_ATTACK_TEMPLATES = {
  default: [
    "{보구명}(이)가 {B}의 {특성}에 반응한다 — 위력이 증폭!",
  ],
  specific: {
    servant: ["영웅왕의 보구가 영령이라는 존재 자체를 부정한다."],
    divine: ["신을 두려워하지 않는 자의 화염이 신의 피를 태운다."],
    female: ["안개 속에서 칼날이 번뜩인다. 이 보구 앞에서 {B}(은)는 무력하다."],
    dragon: ["용살의 성검이 용의 피를 감지했다!"],
    male: ["{보구명}(이)가 {B}를 관통한다! 남성에 대한 절대적 우위!"],
  } as Record<string, string[]>,
  resist: [
    "특공 직격 — 그러나 {B}(은)는 아직 서 있다.",
  ],
  overrides: {} as Record<number, string[]>,
};

// ─── 결과 ───

export const RESULT_TEMPLATES = {
  default: {
    decisive: [
      "{A}의 승리. {B}(이)가 소멸했다.",
      "승부가 결정되었다. {B}의 형상이 흐려진다.",
    ],
    close: [
      "혈전 끝에 승부가 갈렸다.",
      "아슬아슬한 승리. {A}(도) 무사하지는 않다.",
    ],
    draw: [
      "양자 모두 물러났다. 결착은 다음으로.",
      "대치가 이어진다. 오늘은 여기까지.",
    ],
    quiet: [
      "후유키 시에 고요한 밤이 찾아왔다.",
      "아무 일도 일어나지 않았다. ...그렇게 보일 뿐이다.",
    ],
  },
  overrides: {} as Record<number, Record<string, string[]>>,
};

// ─── TRPG 유저 개입 ───

export const INTERVENTION_TEMPLATES = {
  disadvantage: [
    "{서번트}(이)가 밀리고 있다 — 후퇴를 지시할까?",
  ],
  even: [
    "승부는 다음 일격에 갈린다 — 영주로 밀어붙일까?",
  ],
  advantage: [
    "지금이 기회다 — 보구로 결판을 낼까?",
  ],
  ambushed: [
    "뒤를 잡혔다 — ! 즉시 반응해야 한다.",
  ],
};

// ─── 유틸리티: 오버라이드 우선 조회 ───

export function pickTemplate(
  pool: string[],
  overrides: Record<number, string[]>,
  servantId: number,
): string {
  const overridePool = overrides[servantId];
  if (overridePool?.length) {
    return overridePool[Math.floor(Math.random() * overridePool.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}
