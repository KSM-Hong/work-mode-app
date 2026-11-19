/** A tree that grows from seed (g=0) to a large tree (g=1). */
export function Tree({ g, className }: { g: number; className?: string }) {
  const trunkH = 8 + g * 120;
  const trunkW = 2 + g * 16;
  const baseY = 200;
  const topY = baseY - trunkH;
  const crown = g < 0.03 ? 0 : 6 + g * 70;
  const blobs = ([
    [0, 0, 1], [-0.7, 0.3, 0.75], [0.7, 0.3, 0.75], [-0.4, -0.5, 0.7], [0.45, -0.45, 0.7], [0, 0.55, 0.6],
  ] as [number, number, number][]).slice(0, 1 + Math.floor(g * 6));
  return (
    <svg viewBox="-25 -30 250 250" className={className} role="img" aria-label={`Tree at ${Math.round(g * 100)}% growth`}>
      <ellipse cx="100" cy="204" rx="70" ry="10" className="fill-soil" opacity="0.85" />
      {g < 0.01 ? (
        <ellipse cx="100" cy="198" rx="7" ry="5" className="fill-bark" />
      ) : (
        <g className="animate-sway">
          <path
            d={`M${100 - trunkW / 2} ${baseY} Q${100 - trunkW / 3} ${topY + trunkH / 2} ${100 - trunkW / 5} ${topY} L${100 + trunkW / 5} ${topY} Q${100 + trunkW / 3} ${topY + trunkH / 2} ${100 + trunkW / 2} ${baseY} Z`}
            className="fill-bark"
          />
          {g < 0.03 && (
            <>
              <ellipse cx="94" cy={topY} rx="6" ry="3" className="fill-leaf" transform={`rotate(-25 94 ${topY})`} />
              <ellipse cx="106" cy={topY} rx="6" ry="3" className="fill-leaf-light" transform={`rotate(25 106 ${topY})`} />
            </>
          )}
          {blobs.map(([dx, dy, s], i) => (
            <circle
              key={i}
              cx={100 + dx * crown}
              cy={topY + dy * crown * 0.8}
              r={crown * s}
              className={i % 2 ? "fill-leaf-light" : "fill-leaf"}
              opacity="0.95"
            />
          ))}
        </g>
      )}
    </svg>
  );
}
