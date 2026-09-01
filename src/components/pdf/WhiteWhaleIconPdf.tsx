import { Svg, Path, Circle } from "@react-pdf/renderer";

/** PDF sibling of WhiteWhaleIcon.tsx. */
export function WhiteWhaleIconPdf({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Path
        d="M4 18c0-6 5-11 12-11 6 0 10 3 12 7-1 4-5 8-11 8-3 0-5-1-7-2-2 3-5 4-8 3 1-2 2-3 2-5z"
        fill="#efe9dd"
        stroke="#6b5a3e"
        strokeWidth={1.5}
      />
      <Circle cx={21} cy={14} r={1} fill="#6b5a3e" />
    </Svg>
  );
}
