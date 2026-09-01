import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatCurrentSupport } from "@/lib/currentSupportLabels";
import { whatThisMeansCopy, actionCopy, withLevel } from "@/lib/executiveSupportArchitectureCopy";
import { HemisphereIconPdf } from "@/components/pdf/HemisphereIconPdf";
import { WhiteWhaleIconPdf } from "@/components/pdf/WhiteWhaleIconPdf";
import { DelegationBeliefBarsPdf } from "@/components/pdf/DelegationBeliefBarsPdf";
import { ArchitecturePyramidPdf } from "@/components/pdf/ArchitecturePyramidPdf";
import {
  LEVEL_TAGLINE,
  LEVEL_ROLES,
  CHARACTER_FIT_CARDS,
  CHARACTER_FIT_MARKER,
  WHITE_WHALE_SUPPORTING_COPY,
  BLUEPRINT_FOOTER_PRIMARY,
  BLUEPRINT_FOOTER_SECONDARY,
} from "@/lib/blueprintCopy";
import type { BlueprintData } from "@/lib/data/blueprint";
import type { ArchitectureRecommendationView } from "@/lib/data/architecture";
import type { ExecutiveSupportArchitectureConfigInput } from "@/lib/actions/executiveSupportArchitectureConfig";
import type { LeverageLevel } from "@/types/database";

const INK = "#1c1f26";
const INK_MUTED = "#5b6270";
const ACCENT = "#6b5a3e";
const HAIRLINE = "#e4e1da";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9, color: INK, fontFamily: "Helvetica" },
  eyebrow: { fontSize: 9, color: INK_MUTED, marginBottom: 4, fontStyle: "italic" },
  title: { fontSize: 20, marginBottom: 4 },
  subtitle: { fontSize: 9, color: INK_MUTED, marginBottom: 16 },
  sectionTitle: { fontSize: 12, marginTop: 14, marginBottom: 8, color: INK },
  card: { borderWidth: 1, borderColor: HAIRLINE, borderRadius: 6, padding: 10 },
  label: { fontSize: 8, color: INK_MUTED, marginBottom: 2, textTransform: "uppercase" },
  value: { fontSize: 9, color: INK, marginBottom: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  levelPill: { fontSize: 8, color: ACCENT },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, fontSize: 7, color: INK_MUTED },
  colsRow: { flexDirection: "row", gap: 10 },
  col: { flex: 1 },
  grid4: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  gridCard4: { width: "23.5%", borderWidth: 1, borderColor: HAIRLINE, borderRadius: 6, padding: 8 },
  gridCard3: { width: "31.5%", borderWidth: 1, borderColor: HAIRLINE, borderRadius: 6, padding: 8 },
});

const LEVEL_LABEL: Record<string, string> = {
  execution: "Execution",
  orchestration: "Orchestration",
  strategic: "Strategic",
  systems: "Systems",
};

export function BlueprintPdfDocument({
  data,
  participantName,
}: {
  data: BlueprintData;
  participantName: string;
}) {
  const sortedOpportunities = [...data.delegation.priorityOpportunities].sort((a, b) => a.selectionOrder - b.selectionOrder);

  return (
    <Document title={`${participantName} — Yutori Method Executive Leverage Blueprint`}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.eyebrow}>Yutori Method™ Executive Leverage Blueprint</Text>
        <Text style={styles.title}>{participantName}</Text>
        <Text style={styles.subtitle}>
          {data.session.name}
          {data.session.organization ? ` · ${data.session.organization}` : ""}
          {data.participant.currentRoleTitle || data.participant.companyName
            ? `\n${[data.participant.currentRoleTitle, data.participant.companyName].filter(Boolean).join(" · ")}`
            : ""}
          {`\nCurrent executive support: ${formatCurrentSupport(data.participant.currentSupport)}`}
        </Text>

        {/* 01 -- Your Operating Altitude */}
        {data.executiveLeverageProfile || data.leadershipWiring || data.capacityMap || data.delegationBeliefs ? (
          <>
            <Text style={styles.sectionTitle}>01 · Your Operating Altitude</Text>
            <View style={styles.grid4}>
              {data.executiveLeverageProfile ? (
                <View style={styles.gridCard4}>
                  <Text style={styles.label}>Executive Leverage Profile</Text>
                  <Text style={styles.value}>{data.executiveLeverageProfile.profileLabel}</Text>
                  {data.executiveLeverageProfile.profileDescription ? (
                    <Text style={styles.label}>{data.executiveLeverageProfile.profileDescription}</Text>
                  ) : null}
                </View>
              ) : null}

              {data.leadershipWiring ? (
                <View style={styles.gridCard4}>
                  <Text style={styles.label}>Leadership Wiring</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <HemisphereIconPdf wiring={data.leadershipWiring.wiring} size={22} />
                    <Text style={styles.value}>
                      {data.leadershipWiring.wiring.charAt(0).toUpperCase() + data.leadershipWiring.wiring.slice(1)}
                    </Text>
                  </View>
                  <Text style={styles.label}>{data.leadershipWiring.patternInsight}</Text>
                </View>
              ) : null}

              {data.capacityMap ? (
                <View style={styles.gridCard4}>
                  <Text style={styles.label}>Leadership Capacity Map</Text>
                  <Text style={styles.value}>Investment {data.capacityMap.investmentPct}%</Text>
                  <Text style={styles.value}>Ambiguity {data.capacityMap.ambiguityPct}%</Text>
                  <Text style={styles.value}>Vulnerability {data.capacityMap.vulnerabilityPct}%</Text>
                  <Text style={styles.label}>{data.capacityMap.patternInsight}</Text>
                </View>
              ) : null}

              {data.delegationBeliefs ? (
                <View style={styles.gridCard4}>
                  <Text style={styles.label}>Delegation Beliefs</Text>
                  <DelegationBeliefBarsPdf dimensions={data.delegationBeliefs.dimensions} />
                  <Text style={{ ...styles.value, marginTop: 4 }}>{data.delegationBeliefs.biggestImpediment.headline}</Text>
                  <Text style={styles.label}>{data.delegationBeliefs.biggestImpediment.interpretation}</Text>
                  {data.delegation.priorityOwnershipTransferOpportunity ? (
                    <>
                      <Text style={{ ...styles.label, marginTop: 4 }}>Priority Ownership Transfer Opportunity</Text>
                      <Text style={styles.value}>{data.delegation.priorityOwnershipTransferOpportunity.label}</Text>
                    </>
                  ) : null}
                </View>
              ) : null}
            </View>
          </>
        ) : null}

        {/* 02 -- The Ownership to Transfer */}
        {sortedOpportunities.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>02 · The Ownership to Transfer</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {sortedOpportunities.map((o) => (
                <View key={o.selectionOrder} style={styles.gridCard3}>
                  <Text style={styles.label}>{o.selectionOrder}</Text>
                  <Text style={styles.value}>{o.label}</Text>
                  {o.blueprintDescription ? <Text style={styles.label}>{o.blueprintDescription}</Text> : null}
                  {o.leverageLevel ? <Text style={{ ...styles.levelPill, marginTop: 4 }}>{LEVEL_LABEL[o.leverageLevel]}</Text> : null}
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* 03 -- Your Office of the CEO */}
        <Text style={styles.sectionTitle}>03 · Your Office of the CEO</Text>
        <View style={styles.card}>
          {data.architecture.revealed && data.architecture.recommendation && data.architectureConfig ? (
            <ArchitectureSummary rec={data.architecture.recommendation} config={data.architectureConfig} />
          ) : (
            <Text style={styles.label}>Awaiting facilitator reveal.</Text>
          )}
        </View>

        {/* 04 -- What This Makes Possible */}
        {data.reflections.whiteWhale || data.highestValueFocus.items.length > 0 || data.reflections.successVision ? (
          <>
            <Text style={styles.sectionTitle}>04 · What This Makes Possible</Text>
            <View style={styles.colsRow}>
              {data.reflections.whiteWhale ? (
                <View style={{ ...styles.card, ...styles.col }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <WhiteWhaleIconPdf size={16} />
                    <Text style={styles.label}>White Whale</Text>
                  </View>
                  <Text style={styles.value}>{data.reflections.whiteWhale}</Text>
                  <Text style={styles.label}>{WHITE_WHALE_SUPPORTING_COPY}</Text>
                </View>
              ) : null}
              {data.highestValueFocus.items.length > 0 ? (
                <View style={{ ...styles.card, ...styles.col }}>
                  <Text style={styles.label}>Highest Value Focus — Zone of Investment {data.highestValueFocus.investmentPct}%</Text>
                  {data.highestValueFocus.items.map((item) => (
                    <View key={item.responsibilityId} style={{ marginTop: 4 }}>
                      <Text style={styles.value}>{item.label}</Text>
                      {item.blueprintDescription ? <Text style={styles.label}>{item.blueprintDescription}</Text> : null}
                    </View>
                  ))}
                </View>
              ) : null}
              {data.reflections.successVision ? (
                <View style={{ ...styles.card, ...styles.col }}>
                  <Text style={styles.label}>Success Vision</Text>
                  <Text style={styles.value}>With greater capacity, I will:</Text>
                  <Text style={styles.value}>{data.reflections.successVision}</Text>
                  {data.reflections.successVisionFollowup ? <Text style={styles.value}>{data.reflections.successVisionFollowup}</Text> : null}
                </View>
              ) : null}
            </View>
          </>
        ) : null}

        {/* 05 -- Character Profile & Future Fit */}
        <Text style={styles.sectionTitle}>05 · Character Profile & Future Fit</Text>
        <View style={styles.grid4}>
          {CHARACTER_FIT_CARDS.map((c) => (
            <View key={c.title} style={styles.gridCard4}>
              <Text style={{ ...styles.label, color: ACCENT }}>{c.title}</Text>
              <Text style={styles.value}>{c.body}</Text>
            </View>
          ))}
        </View>
        <Text style={{ ...styles.label, marginTop: 6 }}>{CHARACTER_FIT_MARKER}</Text>

        <Text style={styles.footer}>
          {BLUEPRINT_FOOTER_PRIMARY}
          {"   "}
          {BLUEPRINT_FOOTER_SECONDARY}
        </Text>
      </Page>
    </Document>
  );
}

function ArchitectureSummary({
  rec,
  config,
}: {
  rec: ArchitectureRecommendationView;
  config: ExecutiveSupportArchitectureConfigInput;
}) {
  const headlineLevel = rec.primaryLeverageNeed ?? rec.leadingLeverageNeed;
  const highlighted = new Set<LeverageLevel>(
    [rec.primaryLeverageNeed, rec.leadingLeverageNeed, ...rec.multiLayerLevels].filter((l): l is LeverageLevel => !!l),
  );
  const secondaryHighlighted = new Set<LeverageLevel>(rec.secondaryLeverageNeeds);
  const isMultiLayer = rec.signalType === "multi_layer" || (rec.signalType === "audit_only" && !headlineLevel);

  return (
    <View style={{ flexDirection: "row", gap: 16 }}>
      <ArchitecturePyramidPdf highlighted={highlighted} secondaryHighlighted={secondaryHighlighted} />
      <View style={{ flex: 1 }}>
        {isMultiLayer ? (
          <>
            <Text style={styles.label}>Primary</Text>
            <Text style={styles.value}>{rec.multiLayerLevels.map((l) => LEVEL_LABEL[l]).join(" · ")} Leverage</Text>
            {rec.leadingLeverageNeed ? <Text style={styles.label}>{withLevel(config.leadingNeedBody, rec.leadingLeverageNeed)}</Text> : null}
          </>
        ) : (
          <>
            <Text style={styles.label}>Primary</Text>
            <Text style={styles.value}>
              {LEVEL_LABEL[headlineLevel!]} — {LEVEL_TAGLINE[headlineLevel!]}
            </Text>
            {rec.secondaryLeverageNeeds.length > 0 ? (
              <>
                <Text style={{ ...styles.label, marginTop: 4 }}>Secondary</Text>
                <Text style={styles.value}>
                  {rec.secondaryLeverageNeeds.map((l) => `${LEVEL_LABEL[l]} — ${LEVEL_TAGLINE[l]}`).join(" · ")}
                </Text>
              </>
            ) : null}
            <Text style={{ ...styles.label, marginTop: 4 }}>Recommended Architecture</Text>
            <Text style={styles.label}>{whatThisMeansCopy(headlineLevel!, config)}</Text>
            <Text style={styles.value}>{LEVEL_ROLES[headlineLevel!].join(" · ")}</Text>
            {rec.primaryRecommendedAction ? (
              <>
                <Text style={{ ...styles.label, marginTop: 4 }}>Next Move</Text>
                <Text style={styles.value}>{actionCopy(rec.primaryRecommendedAction, config)}</Text>
              </>
            ) : null}
            {rec.auditCorroboration === "strong" && rec.primaryLeverageNeed ? (
              <Text style={{ ...styles.label, marginTop: 4 }}>{withLevel(config.corroborationStrongBody, rec.primaryLeverageNeed)}</Text>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}
