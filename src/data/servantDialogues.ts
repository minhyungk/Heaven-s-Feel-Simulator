/**
 * 서번트 대사 시스템
 * Atlas Academy에서 크롤링한 대사 데이터를 로드하고 조회한다.
 * - 소환(summon), 배틀 개시(battleStart), 보구 영창(npChant),
 *   전투 불능(defeat), 승리(victory)
 */

// ─── 타입 ───

export interface ServantDialogueData {
  summon: string[];
  battleStart: string[];
  npChant: string[];
  defeat: string[];
  victory: string[];
}

export type DialogueType = keyof ServantDialogueData;

// ─── 데이터 로드 ───

// 기본 한국어 데이터 (정적 임포트)
import dialoguesKo from "./dialogues-ko.json";

const dialogueCache = new Map<string, Record<string, ServantDialogueData>>();
dialogueCache.set("ko", dialoguesKo as unknown as Record<string, ServantDialogueData>);

/** 언어별 대사 데이터 동적 로드 */
export async function loadDialogues(lang: string): Promise<Record<string, ServantDialogueData>> {
  if (dialogueCache.has(lang)) return dialogueCache.get(lang)!;

  try {
    let mod: { default: Record<string, ServantDialogueData> };
    if (lang === "en") {
      mod = await import("./dialogues-en.json");
    } else if (lang === "ja") {
      mod = await import("./dialogues-ja.json");
    } else {
      return dialogueCache.get("ko")!;
    }
    dialogueCache.set(lang, mod.default);
    return mod.default;
  } catch {
    return dialogueCache.get("ko")!;
  }
}

// ─── 조회 API ───

/** 서번트 ID로 대사 데이터 조회 (기본: 한국어) */
export function getDialogue(servantId: number, lang = "ko"): ServantDialogueData | null {
  const data = dialogueCache.get(lang) ?? dialogueCache.get("ko");
  if (!data) return null;
  return data[String(servantId)] ?? null;
}

/** [image ...] 태그 제거 (버서커 언어 등 Atlas Academy 메타데이터) */
function cleanDialogueText(text: string): string {
  return text.replace(/\[image [^\]]+\]/g, "").trim();
}

/** 특정 타입의 대사 중 랜덤 하나 선택 */
export function pickDialogue(servantId: number, type: DialogueType, lang = "ko"): string | null {
  const d = getDialogue(servantId, lang);
  if (!d) return null;
  const pool = d[type];
  if (!pool || pool.length === 0) return null;
  const raw = pool[Math.floor(Math.random() * pool.length)];
  const cleaned = cleanDialogueText(raw);
  return cleaned.length > 0 ? cleaned : null;
}
