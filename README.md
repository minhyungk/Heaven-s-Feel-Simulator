# Heaven-s-Feel-Simulator

성배전쟁을 시뮬레이션합니다.

https://holy-grail-war-simulator.vercel.app/

## How to run

### Prerequisite
- [Node.js](https://nodejs.org/) 18 or higher

### Run

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

Connect to `http://localhost:5173`

### Build Production

```bash
npm run build
```

`dist/` 폴더에 정적 파일이 생성됩니다.

### Contents

- **무촉매 소환** — 7개 기본 클래스에서 랜덤 서번트 소환 (가챠 연출 포함)
- **촉매 소환** — 원하는 서번트를 지정하여 소환
- **엑스트라 클래스 난입** — 15% 확률로 Ruler, Avenger 등 이질적인 서번트가 난입
- **전쟁 시뮬레이션** — 7일간 라운드별 의도(사냥/경계/은신) 기반 전투, Elo 승률 판정
  - 어새신 기습 (기척 차단 랭크 기반)
  - 대 마력 보정 (3기사 vs 캐스터)
  - 무승부 / 7일차 강제 사냥 시스템
- **승률 계산** — 스탯 합산 기반 Elo 승률 및 우승 확률 표시
- **결과 공유** — 전쟁 결과 이미지 저장 및 SNS 공유 (X/Instagram)

### Others
Issue, PR 환영