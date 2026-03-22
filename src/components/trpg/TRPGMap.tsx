import { useTranslation } from "react-i18next";
import type { TRPGGameState, TileId } from "../../engine/types";
import { TILES, getTileNames, getAreaEffect } from "../../engine/map";
import { useServantResolver } from "../../contexts/ServantDataContext";
import MapTile from "./MapTile";
import i18n from "../../i18n";

interface Props {
  state: TRPGGameState;
  highlightTiles?: TileId[];
  onTileClick?: (tileId: TileId) => void;
}

export default function TRPGMap({ state, highlightTiles, onTileClick }: Props) {
  const { t } = useTranslation("trpg");
  const tileNames = getTileNames(i18n.language);
  const resolve = useServantResolver();

  // Get player image URL
  const playerServant = state.servantMap[state.playerServantId];
  const resolvedPlayer = resolve(playerServant);
  const playerImageUrl = resolvedPlayer.imageUrl ?? undefined;

  // Build occupancy map (player perspective)
  const tileOccupants = new Map<TileId, { isPlayer: boolean; classes: string[] }>();
  for (const m of state.masters) {
    if (!m.isAlive) continue;
    const existing = tileOccupants.get(m.position) ?? { isPlayer: false, classes: [] };
    if (m.isPlayer) {
      existing.isPlayer = true;
      existing.classes.push(state.servantMap[m.servantId].class);
    } else {
      // 모든 적 위치 표시: 정보 공개 수준에 따라 클래스명 또는 ???
      const info = state.enemyInfo[m.servantId];
      if (info && (info.fogLevel === "statsRevealed" || info.fogLevel === "fullyRevealed") && info.knownClass) {
        existing.classes.push(info.knownClass);
      } else {
        existing.classes.push("???");
      }
    }
    tileOccupants.set(m.position, existing);
  }

  return (
    <div className="w-full max-w-2xl mb-4">
      <p className="text-xs text-gray-500 text-center mb-2 uppercase tracking-wider">{t("map.title")}</p>
      <div className="grid grid-cols-3 gap-1.5">
        {TILES.map(tile => {
          const occupant = tileOccupants.get(tile.id);
          const effect = getAreaEffect(tile.id);
          const isHighlighted = highlightTiles?.includes(tile.id) ?? false;
          const playerMaster = state.masters.find(m => m.isPlayer);
          const isPlayerHere = playerMaster?.position === tile.id;

          return (
            <MapTile
              key={tile.id}
              tileId={tile.id}
              name={tileNames[tile.id]}
              effect={effect}
              isPlayerHere={isPlayerHere}
              playerImageUrl={isPlayerHere ? playerImageUrl : undefined}
              occupantClasses={occupant?.classes ?? []}
              isHighlighted={isHighlighted}
              onClick={onTileClick ? () => onTileClick(tile.id) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
