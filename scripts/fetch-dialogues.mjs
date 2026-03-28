/**
 * Atlas Academy API에서 서번트 대사 데이터를 크롤링하여 JSON으로 저장합니다.
 * - 소환 대사, 배틀 개시, 보구 영창, 전투 불능, 승리 대사만 추출
 * - Ascension 1 (voicePrefix=0) 기준
 * - 음성 데이터(audioAssets) 절대 포함하지 않음
 *
 * 실행: node scripts/fetch-dialogues.mjs [--region=KR|EN|JP]
 */

const API_BASE = "https://api.atlasacademy.io";

// CLI 인자에서 --region 파싱
const regionArg = process.argv.find(a => a.startsWith("--region="));
const REGION = regionArg ? regionArg.split("=")[1].toUpperCase() : "KR";

const API_REGION_MAP = { KR: "KR", EN: "NA", JP: "JP" };
const apiRegion = API_REGION_MAP[REGION] ?? "KR";

const LANG_MAP = { KR: "ko", EN: "en", JP: "ja" };
const lang = LANG_MAP[REGION] ?? "ko";

const VALID_CLASSES = new Set([
  "saber", "archer", "lancer", "rider", "caster", "assassin", "berserker",
  "ruler", "avenger", "moonCancer", "alterEgo", "foreigner", "pretender", "shielder",
]);

/**
 * subtitle 또는 text 배열에서 대사 텍스트를 추출
 * 줄바꿈을 정리하고 빈 문자열은 제외
 */
function extractText(vl) {
  // subtitle이 있으면 우선, 없으면 text 배열의 첫 요소
  let t = vl.subtitle || (vl.text && vl.text[0]) || "";
  if (!t || t.trim() === "") return null;
  // 줄바꿈 정리 (여러 줄을 한 줄로)
  t = t.replace(/\n+/g, " ").trim();
  return t;
}

/**
 * 서번트의 voice 데이터에서 필요한 대사만 추출
 * Ascension 1 = voicePrefix 0 (기본)
 */
function extractDialogues(voices) {
  const result = {
    summon: [],      // 소환 대사
    battleStart: [], // 배틀 개시
    npChant: [],     // 보구 영창
    defeat: [],      // 전투 불능
    victory: [],     // 승리
  };

  for (const vg of voices) {
    // Ascension 1 기준: voicePrefix 0 또는 undefined
    if (vg.voicePrefix && vg.voicePrefix !== 0) continue;

    if (vg.type === "firstGet") {
      // 소환 대사
      for (const vl of vg.voiceLines) {
        const text = extractText(vl);
        if (text) result.summon.push(text);
      }
    }

    if (vg.type === "battle") {
      for (const vl of vg.voiceLines) {
        const name = vl.name || "";
        const text = extractText(vl);
        if (!text) continue;

        if (/개시|開始|start/i.test(name)) {
          result.battleStart.push(text);
        } else if (/전투불능|戦闘不能|defeated|불능/i.test(name)) {
          result.defeat.push(text);
        } else if (/승리|勝利|victory/i.test(name)) {
          result.victory.push(text);
        }
      }
    }

    if (vg.type === "treasureDevice") {
      // 보구 영창 대사
      for (const vl of vg.voiceLines) {
        const text = extractText(vl);
        if (text) result.npChant.push(text);
      }
    }
  }

  return result;
}

async function main() {
  console.log(`Fetching servant dialogues from Atlas Academy (region: ${REGION}, API: ${apiRegion})...`);

  const listRes = await fetch(`${API_BASE}/export/${apiRegion}/basic_servant.json`);
  const basicList = await listRes.json();

  const playable = basicList.filter(s =>
    VALID_CLASSES.has(s.className) && s.collectionNo > 0
  );

  console.log(`Found ${playable.length} playable servants. Fetching voice data...`);

  const dialogueMap = {};
  let successCount = 0;
  let emptyCount = 0;

  for (let i = 0; i < playable.length; i++) {
    const { collectionNo, name } = playable[i];
    process.stdout.write(`  [${i + 1}/${playable.length}] ${name}...`);

    try {
      const res = await fetch(`${API_BASE}/nice/${apiRegion}/servant/${collectionNo}?lore=true`);
      if (res.ok) {
        const raw = await res.json();
        const voices = raw.profile?.voices || [];
        const dialogues = extractDialogues(voices);

        // 하나라도 대사가 있으면 저장
        const hasAny = Object.values(dialogues).some(arr => arr.length > 0);
        if (hasAny) {
          dialogueMap[collectionNo] = dialogues;
          successCount++;
          console.log(` ✓ (${dialogues.summon.length}s ${dialogues.battleStart.length}b ${dialogues.npChant.length}np ${dialogues.defeat.length}d ${dialogues.victory.length}v)`);
        } else {
          emptyCount++;
          console.log(` - (no dialogues)`);
        }
      } else {
        console.log(` ✗ (${res.status})`);
      }
    } catch (e) {
      console.log(` ✗ (${e.message})`);
    }

    // Rate limiting
    if (i % 10 === 9) await new Promise(r => setTimeout(r, 500));
  }

  const { writeFileSync } = await import("fs");
  const outPath = `src/data/dialogues-${lang}.json`;
  writeFileSync(outPath, JSON.stringify(dialogueMap, null, 2), "utf-8");

  console.log(`\nDone! ${successCount} servants with dialogues saved to ${outPath}`);
  console.log(`${emptyCount} servants had no dialogue data.`);
  console.log(`Total entries: ${Object.keys(dialogueMap).length}`);
}

main().catch(console.error);
