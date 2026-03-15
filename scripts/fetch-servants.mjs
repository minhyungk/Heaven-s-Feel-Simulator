/**
 * Atlas Academy API에서 전체 서번트 데이터를 크롤링하여 JSON으로 저장합니다.
 * 실행: node scripts/fetch-servants.mjs
 */

const API_BASE = "https://api.atlasacademy.io";
const VALID_CLASSES = new Set([
  "saber", "archer", "lancer", "rider", "caster", "assassin", "berserker",
  "ruler", "avenger", "moonCancer", "alterEgo", "foreigner", "pretender", "shielder",
]);

function mapClassName(cls) {
  const map = {
    saber: "Saber", archer: "Archer", lancer: "Lancer", rider: "Rider",
    caster: "Caster", assassin: "Assassin", berserker: "Berserker",
    ruler: "Ruler", avenger: "Avenger", moonCancer: "MoonCancer",
    alterEgo: "AlterEgo", foreigner: "Foreigner",
    pretender: "Pretender", shielder: "Shielder",
  };
  return map[cls] || cls;
}

function transformServant(raw) {
  const stats = raw.profile?.stats || {};
  const npList = raw.noblePhantasms || [];
  const np = npList[npList.length - 1] || {};

  const skillMap = new Map();
  for (const s of raw.skills || []) {
    skillMap.set(s.num, s);
  }
  const skills = [...skillMap.values()].map(s => ({
    name: s.name,
  }));

  const classSkills = (raw.classPassive || []).map(s => ({
    name: s.name,
  }));

  const comments = raw.profile?.comments || [];
  const profileText = comments[0]?.comment || "";

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
  console.log("Fetching full servant list from Atlas Academy...");

  // 기본 리스트 가져오기
  const listRes = await fetch(`${API_BASE}/export/KR/basic_servant.json`);
  const basicList = await listRes.json();

  // 유효한 클래스의 플레이어블 서번트만 필터
  const playable = basicList.filter(s =>
    VALID_CLASSES.has(s.className) && s.collectionNo > 0
  );

  console.log(`Found ${playable.length} playable servants. Fetching details...`);

  const results = [];
  for (let i = 0; i < playable.length; i++) {
    const { collectionNo, name } = playable[i];
    process.stdout.write(`  [${i + 1}/${playable.length}] ${name}...`);
    try {
      const res = await fetch(`${API_BASE}/nice/KR/servant/${collectionNo}?lore=true`);
      if (res.ok) {
        const raw = await res.json();
        results.push(transformServant(raw));
        console.log(` ✓`);
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
  const outPath = "src/data/servants.json";
  writeFileSync(outPath, JSON.stringify(results, null, 2), "utf-8");

  // Class distribution
  const dist = {};
  results.forEach(s => { dist[s.class] = (dist[s.class] || 0) + 1; });
  console.log(`\nDone! ${results.length} servants saved to ${outPath}`);
  console.log("Class distribution:", dist);
}

main().catch(console.error);
