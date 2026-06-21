import React from 'react'
import { Document, Page, Text, View, StyleSheet, Link, Font } from '@react-pdf/renderer'
import type { ImprovedResumeData } from '../ImprovedResumeTemplate'

Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyeMZhrib2Bg-4.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYMZhrib2Bg-4.ttf', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYMZhrib2Bg-4.ttf', fontWeight: 700 },
  ],
})

const HEADER_BG = '#0f172a'
const ACCENT = '#38bdf8' // sky-400

const styles = StyleSheet.create({
  page: { fontFamily: 'Inter', fontSize: 9, color: '#1e293b', lineHeight: 1.45, backgroundColor: '#ffffff' },
  // Header bar
  header: { backgroundColor: HEADER_BG, padding: '20 30 16 30' },
  name: { fontSize: 20, fontWeight: 700, color: '#ffffff', marginBottom: 3 },
  tagline: { fontSize: 9, color: ACCENT, marginBottom: 8, letterSpacing: 0.5 },
  contactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  contactItem: { fontSize: 8, color: '#94a3b8' },
  // Body
  body: { padding: '14 30' },
  twoCol: { flexDirection: 'row', gap: 16 },
  colLeft: { width: '62%' },
  colRight: { width: '38%' },
  section: { marginBottom: 12 },
  sectionTitle: { fontSize: 8, fontWeight: 700, color: HEADER_BG, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, borderLeftWidth: 2, borderLeftColor: ACCENT, paddingLeft: 6 },
  divider: { borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0', marginBottom: 6 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  entryTitle: { fontWeight: 700, fontSize: 9, color: '#0f172a' },
  entrySubtitle: { color: '#64748b', fontSize: 8.5 },
  entryDates: { fontSize: 7.5, color: '#94a3b8' },
  entryDesc: { marginTop: 2, marginBottom: 6, color: '#334155', lineHeight: 1.5 },
  summaryText: { color: '#334155', lineHeight: 1.55, textAlign: 'justify' },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  skillTag: { fontSize: 7.5, backgroundColor: '#f1f5f9', padding: '2 5', borderRadius: 2, color: '#475569', borderWidth: 0.5, borderColor: '#e2e8f0' },
  eduEntry: { marginBottom: 7 },
  footer: { position: 'absolute', bottom: 18, right: 30, fontSize: 7, color: '#cbd5e1' },
})

export function CompactTemplate({ data }: { data: ImprovedResumeData }) {
  const contactParts: string[] = []
  if (data.email) contactParts.push(data.email)
  if (data.phone) contactParts.push(data.phone)
  if (data.linkedin) contactParts.push(data.linkedin.replace(/^https?:\/\//, ''))
  if (data.github) contactParts.push(data.github.replace(/^https?:\/\//, ''))
  if (data.website) contactParts.push(data.website.replace(/^https?:\/\//, ''))

  const topRole = data.workEntries?.[0]?.role || ''

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Dark Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{data.name || 'Your Name'}</Text>
          {topRole && <Text style={styles.tagline}>{topRole}</Text>}
          <View style={styles.contactRow}>
            {contactParts.map((part, i) => (
              <React.Fragment key={i}>
                <Text style={styles.contactItem}>{part}</Text>
                {i < contactParts.length - 1 && <Text style={styles.contactItem}>|</Text>}
              </React.Fragment>
            ))}
          </View>
        </View>

        <View style={styles.body}>
          {/* Summary */}
          {data.summary && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Summary</Text>
              <View style={styles.divider} />
              <Text style={styles.summaryText}>{data.summary}</Text>
            </View>
          )}

          {/* Two column */}
          <View style={styles.twoCol}>
            {/* Left: Experience + Projects */}
            <View style={styles.colLeft}>
              {data.workEntries?.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Experience</Text>
                  <View style={styles.divider} />
                  {data.workEntries.map((work, i) => (
                    <View key={i} style={{ marginBottom: 8 }}>
                      <View style={styles.entryHeader}>
                        <Text style={styles.entryTitle}>{work.role}</Text>
                        <Text style={styles.entryDates}>{work.dates}</Text>
                      </View>
                      {work.company && <Text style={styles.entrySubtitle}>{work.company}</Text>}
                      {work.description && <Text style={styles.entryDesc}>{work.description}</Text>}
                    </View>
                  ))}
                </View>
              )}

              {data.projects?.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Projects</Text>
                  <View style={styles.divider} />
                  {data.projects.map((proj, i) => (
                    <View key={i} style={{ marginBottom: 7 }}>
                      <View style={styles.entryHeader}>
                        {proj.link
                          ? <Link src={proj.link} style={{ ...styles.entryTitle, textDecoration: 'none', color: '#0284c7' }}>{proj.name}</Link>
                          : <Text style={styles.entryTitle}>{proj.name}</Text>}
                      </View>
                      {proj.description && <Text style={{ ...styles.entryDesc, marginTop: 2 }}>{proj.description}</Text>}
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Right: Skills + Education */}
            <View style={styles.colRight}>
              {data.skills?.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Skills</Text>
                  <View style={styles.divider} />
                  <View style={styles.skillsRow}>
                    {data.skills.map((skill, i) => (
                      <Text key={i} style={styles.skillTag}>{skill}</Text>
                    ))}
                  </View>
                </View>
              )}

              {data.education?.length > 0 && (
                <View style={{ ...styles.section, marginTop: 6 }}>
                  <Text style={styles.sectionTitle}>Education</Text>
                  <View style={styles.divider} />
                  {data.education.map((edu, i) => (
                    <View key={i} style={styles.eduEntry}>
                      <Text style={styles.entryTitle}>{edu.degree}</Text>
                      {edu.school && <Text style={styles.entrySubtitle}>{edu.school}</Text>}
                      {edu.dates && <Text style={styles.entryDates}>{edu.dates}</Text>}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>

        <Text style={styles.footer}>Generated by PortfolioPilot</Text>
      </Page>
    </Document>
  )
}
