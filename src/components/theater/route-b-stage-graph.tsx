"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Presentational, no-provider stage graph for the Route B theater rehearsal page.
 *
 * The Route B handoff relationship contract (`TheaterRouteBRelation`) only carries a
 * descriptive `summary` — it has no source/target character ids — so we deliberately do
 * NOT invent edges between arbitrary people. Instead we render a deterministic "stage"
 * layout: the focus client sits at the centre and the supporting NPCs orbit around them,
 * with hairline connector lines back to the focus. Clicking a person switches the advisor
 * composer to a private lane. This component renders nothing that calls a provider, writes
 * a CRM fact, or persists state.
 */
export type RouteBStageGraphCharacter = {
  /** Route B logical character id (stable across session re-creation). */
  id: string;
  displayName: string;
  roleLabel: string;
  isFocus: boolean;
  knownCount: number;
  inferenceCount: number;
  unknownCount: number;
  statePatchCount: number;
  isLatestSpeaker: boolean;
  isLatestAddressee: boolean;
};

type PositionedCharacter = RouteBStageGraphCharacter & {
  /** Percentage coordinates inside the graph canvas (0–100). */
  leftPct: number;
  topPct: number;
  isCenter: boolean;
};

function positionCharacters(
  characters: RouteBStageGraphCharacter[],
): PositionedCharacter[] {
  if (characters.length === 0) return [];

  const centerIndex = Math.max(
    0,
    characters.findIndex((character) => character.isFocus),
  );
  const center = characters[centerIndex];
  const peripheral = characters.filter((_, index) => index !== centerIndex);

  const radius = 34;
  const positioned: PositionedCharacter[] = [
    { ...center, leftPct: 50, topPct: 50, isCenter: true },
  ];

  peripheral.forEach((character, index) => {
    // Single peripheral node reads better placed to the side than directly above.
    const angle =
      peripheral.length === 1
        ? 0
        : (-90 + (index * 360) / peripheral.length) * (Math.PI / 180);
    positioned.push({
      ...character,
      leftPct: 50 + radius * Math.cos(angle),
      topPct: 50 + radius * Math.sin(angle),
      isCenter: false,
    });
  });

  return positioned;
}

function StageNode({
  character,
  isSelected,
  onSelect,
}: {
  character: RouteBStageGraphCharacter;
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(character.id)}
      aria-label={`與 ${character.displayName} 私聊`}
      aria-pressed={isSelected}
      data-route-b-stage-person={character.id}
      data-route-b-private-chat-target={character.id}
      data-route-b-fact-count={character.knownCount}
      data-route-b-inference-count={character.inferenceCount}
      data-route-b-unknown-count={character.unknownCount}
      data-route-b-state-patch-count={character.statePatchCount}
      className={cn(
        "w-full rounded-lg border border-hairline bg-paper p-3 text-left transition-colors hover:border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        isSelected && "border-ink bg-background",
        character.isFocus && "ring-1 ring-ink/10",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">
            {character.displayName}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {character.roleLabel}
          </p>
        </div>
        <Badge
          variant={character.isFocus ? "default" : "outline"}
          className="shrink-0 rounded-full text-[10px]"
        >
          {character.isFocus ? "焦點" : "NPC"}
        </Badge>
      </div>

      <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>
          已知 <strong className="font-mono text-ink">{character.knownCount}</strong>
        </span>
        <span>
          推論 <strong className="font-mono text-ink">{character.inferenceCount}</strong>
        </span>
        <span>
          未知 <strong className="font-mono text-ink">{character.unknownCount}</strong>
        </span>
      </div>

      {(character.isLatestSpeaker || character.isLatestAddressee) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {character.isLatestSpeaker && (
            <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] text-paper">
              發言中
            </span>
          )}
          {character.isLatestAddressee && (
            <span className="rounded-full border border-hairline bg-background px-2 py-0.5 text-[10px] text-ink">
              被點名
            </span>
          )}
        </div>
      )}
    </button>
  );
}

export function RouteBStageGraph({
  characters,
  focusCharacterId,
  onSelect,
}: {
  characters: RouteBStageGraphCharacter[];
  focusCharacterId: string | null;
  onSelect: (id: string) => void;
}) {
  if (characters.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-hairline bg-background p-6 text-center text-sm leading-6 text-muted-foreground">
        交接包尚未包含可演練的人物；先完成劇場建場，焦點客戶與 NPC 會出現在舞台上。
      </div>
    );
  }

  const positioned = positionCharacters(characters);
  const center = positioned.find((node) => node.isCenter) ?? positioned[0];
  const peripheral = positioned.filter((node) => !node.isCenter);

  return (
    <div
      className="space-y-3"
      data-route-b-stage-graph="relationship-map"
      data-provider-call-attempted="false"
      data-ai-usage-log-written="false"
      data-writes-confirmed-crm-fact="false"
    >
      {/* Visual stage graph — desktop / tablet only, to guarantee no mobile overflow. */}
      <div
        className="relative hidden aspect-[4/3] w-full overflow-hidden rounded-lg border border-hairline bg-background md:block"
        role="group"
        aria-label="客戶關係舞台地圖"
        data-route-b-stage-map="desktop"
      >
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full text-hairline"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {peripheral.map((node) => (
            <line
              key={`stage-edge-${node.id}`}
              x1={center.leftPct}
              y1={center.topPct}
              x2={node.leftPct}
              y2={node.topPct}
              stroke="currentColor"
              strokeWidth={0.4}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>

        {positioned.map((node) => (
          <div
            key={`stage-node-${node.id}`}
            className="absolute w-[clamp(150px,22%,200px)] -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${node.leftPct}%`, top: `${node.topPct}%` }}
          >
            <StageNode
              character={node}
              isSelected={focusCharacterId === node.id}
              onSelect={onSelect}
            />
          </div>
        ))}
      </div>

      {/* Stacked fallback — always available, primary layout on mobile. */}
      <div
        className="grid gap-3 sm:grid-cols-2 md:hidden"
        data-route-b-stage-map="mobile-stack"
      >
        {characters.map((character) => (
          <StageNode
            key={`stage-stack-${character.id}`}
            character={character}
            isSelected={focusCharacterId === character.id}
            onSelect={onSelect}
          />
        ))}
      </div>

      <p className="text-[11px] leading-5 text-muted-foreground">
        點選任一人物即可把發話範圍切到私聊；焦點客戶置中，NPC 環繞並以髮絲線連回焦點。此地圖只呈現交接包證據，不呼叫 AI、不寫回 CRM 既成事實。
      </p>
    </div>
  );
}
