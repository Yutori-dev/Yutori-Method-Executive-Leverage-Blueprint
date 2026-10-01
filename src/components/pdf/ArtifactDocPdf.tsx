import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ArtifactDoc } from "@/lib/artifactDocs";

const INK = "#1c1f26";
const INK_MUTED = "#5b6270";
const styles = StyleSheet.create({
  page: { padding: 44, fontSize: 10, color: INK, fontFamily: "Helvetica" },
  eyebrow: { fontSize: 9, color: INK_MUTED, marginBottom: 4, fontStyle: "italic" },
  title: { fontSize: 20, marginBottom: 2 },
  who: { fontSize: 9, color: INK_MUTED, marginBottom: 14 },
  heading: { fontSize: 12, marginTop: 14, marginBottom: 2 },
  intro: { fontSize: 9, color: INK_MUTED, marginBottom: 6 },
  label: { fontSize: 8, color: INK_MUTED, marginTop: 6, marginBottom: 2, textTransform: "uppercase" },
  line: { fontSize: 10, marginBottom: 3 },
  quote: { fontStyle: "italic" },
  sub: { fontSize: 8, color: INK_MUTED },
  closing: { fontSize: 9, color: INK_MUTED, marginTop: 8 },
});

/** Same ArtifactDoc the portal renders, laid out for PDF. */
export function ArtifactDocPdf({ doc, participantName, sessionName }: { doc: ArtifactDoc; participantName: string; sessionName: string }) {
  return (
    <Document title={`${doc.title} - ${participantName}`}>
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.eyebrow}>Yutori Method&#8482; Executive Leverage Blueprint</Text>
        <Text style={styles.title}>{doc.title}</Text>
        <Text style={styles.who}>
          {participantName} &middot; {sessionName}
        </Text>
        {doc.sections.map((s, i) => (
          <View key={i}>
            {s.heading ? <Text style={styles.heading}>{s.heading}</Text> : null}
            {s.intro ? <Text style={styles.intro}>{s.intro}</Text> : null}
            {s.groups.map((g, j) => (
              <View key={j} wrap={false}>
                {g.label ? <Text style={styles.label}>{g.label}</Text> : null}
                {g.lines.map((l, k) => (
                  <View key={k}>
                    <Text style={l.quote ? [styles.line, styles.quote] : styles.line}>{l.text}</Text>
                    {l.sub ? <Text style={styles.sub}>{l.sub}</Text> : null}
                    {l.note ? <Text style={styles.sub}>{l.note}</Text> : null}
                  </View>
                ))}
              </View>
            ))}
            {s.closing?.filter(Boolean).map((c, k) => (
              <Text key={k} style={styles.closing}>
                {c}
              </Text>
            ))}
          </View>
        ))}
      </Page>
    </Document>
  );
}
