/**
 * Atlas Academy API에서 서번트 데이터를 크롤링하여 JSON으로 저장합니다.
 * 실행: node scripts/fetch-servants.mjs
 */

const API_BASE = "https://api.atlasacademy.io";

// 기본 7클래스 + 엑스트라 클래스에 해당하는 서번트 ID 목록
// Atlas Academy의 collectionNo 기준
const TARGET_SERVANTS = [
  // Saber
  2,    // 알트리아 펜드래곤
  8,    // 알테라
  6,    // 지크프리트
  5,    // 네로 클라우디우스
  123,  // 가웨인
  76,   // 모드레드
  68,   // 오키타 소우지

  // Archer
  12,   // 길가메시
  11,   // 에미야
  14,   // 아탈란테
  84,   // 아르주나
  16,   // 아라쉬

  // Lancer
  17,   // 쿠 훌린
  18,   // 엘리자베트 바토리
  70,   // 스카사하
  85,   // 카르나
  71,   // 디어뮈드 오 디나

  // Rider
  23,   // 메두사
  108,  // 이스칸다르
  206,  // 아킬레우스
  27,   // 우시와카마루
  24,   // 게오르기우스

  // Caster
  31,   // 메데이아
  37,   // 제갈공명 (엘멜로이 2세)
  62,   // 타마모노마에
  150,  // 멀린
  34,   // 쿠 훌린 (캐스터)

  // Assassin
  40,   // 주완의 하산
  39,   // 사사키 코지로
  75,   // 잭 더 리퍼
  154,  // "산의 노인"
  45,   // 마타 하리

  // Berserker
  47,   // 헤라클레스
  48,   // 랜슬롯
  49,   // 여포 봉선
  55,   // 다리우스 3세
  98,   // 쿠 훌린(얼터)
  56,   // 키요히메
];

async function fetchServant(collectionNo) {
  const url = `${API_BASE}/nice/KR/servant/${collectionNo}?lore=true`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error(`Failed to fetch servant ${collectionNo}: ${res.status}`);
    return null;
  }
  return res.json();
}

function mapClassName(cls) {
  const map = {
    saber: "Saber",
    archer: "Archer",
    lancer: "Lancer",
    rider: "Rider",
    caster: "Caster",
    assassin: "Assassin",
    berserker: "Berserker",
    ruler: "Ruler",
    avenger: "Avenger",
    moonCancer: "MoonCancer",
    alterEgo: "AlterEgo",
    foreigner: "Foreigner",
  };
  return map[cls] || cls;
}

function transformServant(raw) {
  const stats = raw.profile?.stats || {};

  // 보구: 마지막 noblePhantasm (강화 후 버전)
  const npList = raw.noblePhantasms || [];
  const np = npList[npList.length - 1] || {};

  // 스킬: 마지막 강화 버전
  const skillMap = new Map();
  for (const s of raw.skills || []) {
    skillMap.set(s.num, s);
  }
  const skills = [...skillMap.values()].map(s => ({
    name: s.name,
    detail: (s.detail || "").replace(/<[^>]*>/g, ""),
  }));

  // 클래스 스킬
  const classSkills = (raw.classPassive || []).map(s => ({
    name: s.name,
    detail: (s.detail || "").replace(/<[^>]*>/g, ""),
  }));

  // 프로필 텍스트 (첫 번째 코멘트)
  const comments = raw.profile?.comments || [];
  const profileText = comments[0]?.comment || "";

  // 얼굴 이미지 (1재림)
  const faces = raw.extraAssets?.faces?.ascension || {};
  const faceUrl = faces["1"] || faces["2"] || Object.values(faces)[0] || "";

  return {
    id: raw.collectionNo,
    name: raw.name,
    class: mapClassName(raw.className),
    stats: {
      strength: stats.strength || "?",
      endurance: stats.endurance || "?",
      agility: stats.agility || "?",
      mana: stats.magic || "?",
      luck: stats.luck || "?",
      np: stats.np || "?",
    },
    classSkills,
    personalSkills: skills,
    noblePhantasm: {
      name: np.name || "",
      ruby: np.ruby || "",
      rank: np.rank || "?",
      type: np.type || "",
      detail: (np.detail || "").replace(/<[^>]*>/g, ""),
    },
    imageUrl: faceUrl,
    profile: profileText.replace(/<[^>]*>/g, ""),
  };
}

async function main() {
  console.log(`Fetching ${TARGET_SERVANTS.length} servants from Atlas Academy API...`);

  const results = [];
  for (const id of TARGET_SERVANTS) {
    console.log(`  Fetching collectionNo ${id}...`);
    const raw = await fetchServant(id);
    if (raw) {
      const transformed = transformServant(raw);
      results.push(transformed);
      console.log(`    ✓ ${transformed.name} (${transformed.class})`);
    }
    // 약간의 딜레이
    await new Promise(r => setTimeout(r, 200));
  }

  // JSON 저장
  const { writeFileSync } = await import("fs");
  const outPath = "src/data/servants.json";
  writeFileSync(outPath, JSON.stringify(results, null, 2), "utf-8");
  console.log(`\nDone! ${results.length} servants saved to ${outPath}`);
}

main().catch(console.error);
