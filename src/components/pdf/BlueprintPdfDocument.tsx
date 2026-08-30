import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatCurrentSupport } from "@/lib/currentSupportLabels";
import { whatThisMeansCopy, actionCopy, withLevel } from "@/lib/executiveSupportArchitectureCopy";
import type { BlueprintData } from "@/lib/data/blueprint";
import type { ArchitectureRecommendationView } from "@/lib/data/architecture";
import type { ExecutiveSupportArchitectureConfigInput } from "@/lib/actions/executiveSupportArchitectureConfig";

const INK = "#1c1f26";
const INK_MUTED = "#5b6270";
const ACCENT = "#6b5a3e";
const HAIRLINE = "#e4e1da";

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 10, color: INK, fontFamily: "Helvetica" },
  eyebrow: { fontSize: 9, color: INK_MUTED, marginBottom: 4, fontStyle: "italic" },
  title: { fontSize: 22, marginBottom: 4 },
  subtitle: { fontSize: 10, color: INK_MUTED, marginBottom: 24 },
  sectionTitle: { fontSize: 14, marginTop: 20, marginBottom: 8, color: INK },
  card: { borderWidth: 1, borderColor: HAIRLINE, borderRadius: 6, padding: 12, marginBottom: 8 },
  label: { fontSize: 8, color: INK_MUTED, marginBottom: 2, textTransform: "uppercase" },
  value: { fontSize: 10, color: INK, marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  levelPill: { fontSize: 8, color: ACCENT },
  characterGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  characterChip: {
    borderWidth: 1,
    borderColor: HAIRLINE,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 8,
    color: "#c9c5bc",
  },
  footer: { position: "absolute", bottom: 32, left: 48, right: 48, fontSize: 8, color: INK_MUTED },
});

const LEVEL_LABEL: Record<string, string> = {
  execution: "Execution",
  orchestration: "Orchestration",
  strategic: "Strategic",
  systems: "Systems",
};

const CHARACTER_DIMENSIONS = [
  "Stress Tolerance",
  "Dependability",
  "Cooperation",
  "Openness",
  "Sociability",
  "Cognition",
];

export function BlueprintPdfDocument({
  data,
  participantName,
}: {
  data: BlueprintData;
  participantName: string;
}) {
  return (
    <Document title={`${participantName} — Yutori Method Executive Leverage Blueprint`}>
      <Page size="A4" style={styles.page}>
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

        <Text style={styles.sectionTitle}>Fit</Text>
        {data.selfIdentification ? (
          <Text style={{ ...styles.value, marginBottom: 4 }}>
            Leadership Wiring: {data.selfIdentification.charAt(0).toUpperCase() + data.selfIdentification.slice(1)}
          </Text>
        ) : null}
        <Text style={{ ...styles.label, marginBottom: 6 }}>Unlocked in the live workshop</Text>
        <View style={styles.characterGrid}>
          {CHARACTER_DIMENSIONS.map((dim) => (
            <Text key={dim} style={styles.characterChip}>
              {dim}
            </Text>
          ))}
        </View>

        {data.executiveLeverageProfile ? (
          <>
            <Text style={styles.sectionTitle}>Executive Leverage Profile</Text>
            <View style={styles.card}>
              <Text style={styles.value}>{data.executiveLeverageProfile.profileLabel}</Text>
              {data.executiveLeverageProfile.profileDescription ? (
                <Text style={styles.label}>{data.executiveLeverageProfile.profileDescription}</Text>
              ) : null}
              {data.executiveLeverageProfile.strongestConstraints.map((c) => (
                <View key={c.label} style={{ marginTop: 6 }}>
                  <Text style={styles.value}>{c.label}</Text>
                  <Text style={styles.label}>{c.interpretation}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {data.zone.personalizedPlacements.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Investment</Text>
            <View style={styles.card}>
              {data.zone.personalizedPlacements.map((p) => (
                <View key={p.responsibilityId} style={styles.row}>
                  <Text style={styles.value}>{p.label}</Text>
                  <Text style={styles.label}>{p.cellName}</Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

        {data.delegation.primaryBarriers.length > 0 ||
        data.delegation.priorityOwnershipTransferOpportunity ||
        data.delegation.priorityOpportunities.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Delegation</Text>
            {data.delegation.primaryBarriers.length > 0 ? (
              <View style={styles.card}>
                <Text style={{ ...styles.label, marginBottom: 6 }}>Primary Delegation Barrier</Text>
                {data.delegation.primaryBarriers.map((b) => (
                  <View key={b.domain} style={{ marginBottom: 6 }}>
                    <Text style={styles.value}>
                      {b.domainLabel} — {b.avg.toFixed(1)} / 5
                    </Text>
                    <Text style={styles.label}>{b.interpretation}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            {data.delegation.priorityOwnershipTransferOpportunity ? (
              <View style={styles.card}>
                <Text style={{ ...styles.label, marginBottom: 6 }}>Priority Ownership Transfer Opportunity</Text>
                <Text style={styles.value}>{data.delegation.priorityOwnershipTransferOpportunity.label}</Text>
                <Text style={styles.label}>{data.delegation.priorityOwnershipTransferOpportunity.interpretation}</Text>
              </View>
            ) : null}
            {data.delegation.priorityOpportunities.length > 0 ? (
              <View style={styles.card}>
                <Text style={{ ...styles.label, marginBottom: 6 }}>Priority Delegation Opportunities</Text>
                {[...data.delegation.priorityOpportunities]
                  .sort((a, b) => a.selectionOrder - b.selectionOrder)
                  .map((o) => (
                    <View key={o.selectionOrder} style={styles.row}>
                      <Text style={styles.value}>
                        {o.selectionOrder}. {o.label}
                      </Text>
                      {o.leverageLevel ? (
                        <Text style={styles.levelPill}>{LEVEL_LABEL[o.leverageLevel]}</Text>
                      ) : null}
                    </View>
                  ))}
                {data.priorityLeverage.revealed && data.priorityLeverage.pattern.length > 0 ? (
                  <Text style={{ ...styles.label, marginTop: 6 }}>
                    Leverage pattern:{" "}
                    {data.priorityLeverage.pattern.map((p) => `${p.count} ${LEVEL_LABEL[p.level]}`).join(" · ")}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </>
        ) : null}

        {data.executiveSupportAudit ? (
          <>
            <Text style={styles.sectionTitle}>Executive Support Audit</Text>
            <View style={styles.card}>
              <Text style={{ ...styles.label, marginBottom: 6 }}>
                {data.executiveSupportAudit.primary.length > 1 ? "Your most prominent leverage gaps" : "Primary leverage gap"}
              </Text>
              {data.executiveSupportAudit.primary.map((p) => (
                <View key={p.layer} style={{ marginBottom: 6 }}>
                  <Text style={styles.value}>{LEVEL_LABEL[p.layer]}</Text>
                  <Text style={styles.label}>{p.interpretation}</Text>
                </View>
              ))}
              {data.executiveSupportAudit.primary.length === 1 ? (
                <>
                  <Text style={{ ...styles.label, marginTop: 8, marginBottom: 6 }}>
                    {data.executiveSupportAudit.secondary.length > 1 ? "Secondary leverage gaps" : "Secondary leverage gap"}
                  </Text>
                  {data.executiveSupportAudit.secondary.length > 0 ? (
                    data.executiveSupportAudit.secondary.map((s) => (
                      <View key={s.layer} style={{ marginBottom: 6 }}>
                        <Text style={styles.value}>{LEVEL_LABEL[s.layer]}</Text>
                        <Text style={styles.label}>{s.interpretation}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.label}>{data.executiveSupportAudit.noSecondaryCopy}</Text>
                  )}
                </>
              ) : null}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Executive Support Architecture</Text>
        <View style={styles.card}>
          {data.architecture.revealed && data.architecture.recommendation && data.architectureConfig ? (
            <ArchitectureSummary rec={data.architecture.recommendation} config={data.architectureConfig} />
          ) : (
            <Text style={styles.label}>Awaiting facilitator reveal.</Text>
          )}
        </View>

        {data.reflections.whiteWhale || data.reflections.successVision ? (
          <>
            <Text style={styles.sectionTitle}>What This Could Unlock</Text>
            <View style={styles.card}>
              {data.reflections.whiteWhale ? (
                <View style={{ marginBottom: 6 }}>
                  <Text style={styles.label}>Your White Whale</Text>
                  <Text style={styles.value}>{data.reflections.whiteWhale}</Text>
                </View>
              ) : null}
              {data.reflections.successVision ? <Text style={styles.value}>{data.reflections.successVision}</Text> : null}
              {data.reflections.successVisionFollowup ? (
                <Text style={styles.label}>{data.reflections.successVisionFollowup}</Text>
              ) : null}
            </View>
          </>
        ) : null}

        <Text style={styles.footer}>
          This Blueprint reflects Yutori Method development placeholder content where noted, and
          will update as your workshop progresses.
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

  if (rec.signalType === "multi_layer" || (rec.signalType === "audit_only" && !headlineLevel)) {
    return (
      <>
        <Text style={styles.value}>{rec.multiLayerLevels.map((l) => LEVEL_LABEL[l]).join(" · ")} Leverage</Text>
        {rec.leadingLeverageNeed ? (
          <Text style={styles.label}>{withLevel(config.leadingNeedBody, rec.leadingLeverageNeed)}</Text>
        ) : null}
      </>
    );
  }

  return (
    <>
      <Text style={styles.value}>{LEVEL_LABEL[headlineLevel!]} Leverage</Text>
      <Text style={styles.label}>{whatThisMeansCopy(headlineLevel!, config)}</Text>
      {rec.primaryRecommendedAction ? (
        <Text style={{ ...styles.label, marginTop: 4 }}>{actionCopy(rec.primaryRecommendedAction, config)}</Text>
      ) : null}
      {rec.auditCorroboration === "strong" && rec.primaryLeverageNeed ? (
        <Text style={{ ...styles.label, marginTop: 4 }}>
          {withLevel(config.corroborationStrongBody, rec.primaryLeverageNeed)}
        </Text>
      ) : null}
      {rec.secondaryLeverageNeeds.length > 0 ? (
        <Text style={{ ...styles.label, marginTop: 4 }}>
          Secondary: {rec.secondaryLeverageNeeds.map((l) => LEVEL_LABEL[l]).join(" · ")}
        </Text>
      ) : null}
    </>
  );
}
