/** 보구 특공 데이터 (서번트 ID → 대상 특성 + 배율) */
export const NP_SPECIAL_ATTACKS: Record<number, { targetTraits: string[]; multiplier: number }> = {
  // 지크프리트: 용 특공
  6:   { targetTraits: ["dragon"], multiplier: 1.5 },
  // 길가메쉬: 서번트 특공
  12:  { targetTraits: ["servant"], multiplier: 1.5 },
  // 에우리알레: 남성 특공
  15:  { targetTraits: ["male"], multiplier: 2.5 },
  // 잭 더 리퍼: 여성 특공
  75:  { targetTraits: ["female"], multiplier: 1.5 },
  // 카르나: 신성 특공
  85:  { targetTraits: ["divine"], multiplier: 1.5 },
  // 오다 노부나가: 신성 특공 + 기승 특공 (divine으로 대표)
  69:  { targetTraits: ["divine"], multiplier: 1.5 },
  // 모드레드 (Saber): 아서 왕 특공 (artoria)
  76:  { targetTraits: ["artoria"], multiplier: 1.5 },
  // 라마: 마성 특공
  101: { targetTraits: ["demon"], multiplier: 1.5 },
  // 스카사하: 신성 특공
  70:  { targetTraits: ["divine"], multiplier: 1.5 },
  // 브륀힐드: brynhild_beloved 특공
  88:  { targetTraits: ["brynhild_beloved"], multiplier: 1.5 },
  // 수수께끼의 히로인 X: saberface 특공
  86: { targetTraits: ["saberface"], multiplier: 1.5 },
  // 세예라자드: 왕 특공
  169: { targetTraits: ["king"], multiplier: 1.5 },
  // 오키타 소지 (Saber): saberface 관련 없이 특공 없음
  // 아르주나(얼터): 인류의 위협 (servant 특공으로 표현)
  247: { targetTraits: ["servant"], multiplier: 1.3 },
  // 오리온: 남성 특공
  60: { targetTraits: ["male"], multiplier: 1.5 },
  // 슈텐도지: 마성 특공 없음, 일반
  // 시구르드: dragon 특공
  213: { targetTraits: ["dragon"], multiplier: 1.5 },
  // 카이니스: divine 특공
  279: { targetTraits: ["divine"], multiplier: 1.5 },
  // 로물루스=퀴리누스: roman 특공
  280: { targetTraits: ["roman"], multiplier: 1.5 },
  // 엘리자베트 바토리(할로윈): 인류의 위협 관련 아님
  // 산의 노인: 즉사 효과 (특공이 아닌 별도 메커니즘으로 → 여기선 제외)
  // 카마(Avenger): divine 특공
  321: { targetTraits: ["divine"], multiplier: 1.5 },
  // 오카다 이조: humanoid 특공 (약함)
  210: { targetTraits: ["humanoid"], multiplier: 1.5 },
};
