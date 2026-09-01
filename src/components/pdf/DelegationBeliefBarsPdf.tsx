import { View, Text, StyleSheet } from "@react-pdf/renderer";
import { DOMAIN_LABEL, type DelegationDomain } from "@/lib/delegationBeliefsConstants";
import { DOMAIN_CAPTION, type DelegationStatusLabel } from "@/lib/blueprintCopy";

const SCALE_MAX = 5;
const DOMAIN_ORDER: DelegationDomain[] = ["trust_control", "team_outcomes", "workload_resources"];

const ACCENT = "#6b5a3e";
const ACCENT_SOFT = "#efe9dd";
const INK = "#1c1f26";
const INK_MUTED = "#5b6270";

const styles = StyleSheet.create({
  row: { marginBottom: 8 },
  labelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  domainLabel: { fontSize: 8, color: INK, textTransform: "uppercase" },
  statusLabel: { fontSize: 8, color: INK_MUTED, textTransform: "uppercase" },
  track: { height: 4, borderRadius: 2, backgroundColor: ACCENT_SOFT },
  fill: { height: 4, borderRadius: 2, backgroundColor: ACCENT },
  caption: { fontSize: 7, color: INK_MUTED, marginTop: 3 },
});

/** PDF sibling of DelegationBeliefBars.tsx -- same never-render-the-avg-as-
 * text rule, View-width percentage bars instead of Tailwind. */
export function DelegationBeliefBarsPdf({
  dimensions,
}: {
  dimensions: { domain: DelegationDomain; avg: number; statusLabel: DelegationStatusLabel | null }[];
}) {
  const byDomain = new Map(dimensions.map((d) => [d.domain, d]));

  return (
    <View>
      {DOMAIN_ORDER.map((domain) => {
        const entry = byDomain.get(domain);
        if (!entry) return null;
        const pct = Math.max(0, Math.min(100, (entry.avg / SCALE_MAX) * 100));
        return (
          <View key={domain} style={styles.row}>
            <View style={styles.labelRow}>
              <Text style={styles.domainLabel}>{DOMAIN_LABEL[domain]}</Text>
              {entry.statusLabel ? <Text style={styles.statusLabel}>{entry.statusLabel}</Text> : null}
            </View>
            <View style={styles.track}>
              <View style={{ ...styles.fill, width: `${pct}%` }} />
            </View>
            <Text style={styles.caption}>{DOMAIN_CAPTION[domain]}</Text>
          </View>
        );
      })}
    </View>
  );
}
