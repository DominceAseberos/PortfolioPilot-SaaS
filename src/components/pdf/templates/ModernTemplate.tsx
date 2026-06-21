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

const ACCENT = '#6366f1'
const SIDEBAR_BG = '#1e293b'
const SIDEBAR_TEXT = '#e2e8f0'
const SIDEBAR_MUTED = '#94a3b8'

const styles = StyleSheet.create({
  page: { flexDirection: 'row', fontFamily: 'Inter', fontSize: 9.5, color: '#1e293b', lineHeight: 1.5 },
  // Sidebar
  sidebar: { width: '32%', backgroundColor: SIDEBAR_BG, padding: '32 16', minHeight: '100%' },
  sidebarName: { fontSize: 17, fontWeight: 700, color: '#ffffff', marginBottom: 4, lineHeight: 1.2 },
  sidebarRole: { fontSize: 9, color: SIDEBAR_MUTED, marginBottom: 20, textTransform: 'uppercase', letterSpacing: 0.8 },
  sidebarSection: { marginBottom: 18 },
  sidebarSectionTitle: { fontSize: 8, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#334155', paddingBottom: 4 },
  sidebarText: { fontSize: 9, color: SIDEBAR_TEXT, marginBottom: 4, lineHeight: 1.4 },
  sidebarMuted: { fontSize: 8, color: SIDEBAR_MUTED },
  skillPill: { backgroundColor: '#334155', padding: '3 7', borderRadius: 3, marginBottom: 4, marginRight: 4, fontSize: 8, color: SIDEBAR_TEXT },
  skillRow: { flexDirection: 'row', flexWrap: 'wrap' },
  // Main
  main: { width: '68%', padding: '32 24 32 20', backgroundColor: '#ffffff' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 10, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  sectionDivider: { borderBottomWidth: 1.5, borderBottomColor: ACCENT, marginBottom: 8 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 1 },
  entryTitle: { fontWeight: 700, fontSize: 10, color: '#0f172a' },
  entrySubtitle: { color: '#475569', fontSize: 9, marginBottom: 2 },
  entryDates: { fontSize: 8, color: '#64748b', backgroundColor: '#f1f5f9', padding: '1 5', borderRadius: 3 },
  entryDescription: { marginTop: 3, marginBottom: 8, color: '#334155', lineHeight: 1.5 },
  summaryText: { color: '#334155', lineHeight: 1.6, textAlign: 'justify' },
  footer: { position: 'absolute', bottom: 20, right: 24, fontSize: 7, color: '#94a3b8' },
})

export function ModernTemplate({ data }: { data: ImprovedResumeData }) {
  const role = data.workEntries?.[0]?.role || ''

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Sidebar */}
        <View style={styles.sidebar}>
          <Text style={styles.sidebarName}>{data.name || 'Your Name'}</Text>
          {role && <Text style={styles.sidebarRole}>{role}</Text>}

          {/* Contact */}
          <View style={styles.sidebarSection}>
            <Text style={styles.sidebarSectionTitle}>Contact</Text>
            {data.email && <Text style={styles.sidebarText}>{data.email}</Text>}
            {data.phone && <Text style={styles.sidebarText}>{data.phone}</Text>}
            {data.linkedin && <Text style={styles.sidebarMuted}>{data.linkedin.replace(/^https?:\/\//, '')}</Text>}
            {data.github && <Text style={styles.sidebarMuted}>{data.github.replace(/^https?:\/\//, '')}</Text>}
            {data.website && <Text style={styles.sidebarMuted}>{data.website.replace(/^https?:\/\//, '')}</Text>}
          </View>

          {/* Skills */}
          {data.skills?.length > 0 && (
            <View style={styles.sidebarSection}>
              <Text style={styles.sidebarSectionTitle}>Skills</Text>
              <View style={styles.skillRow}>
                {data.skills.map((skill, i) => (
                  <Text key={i} style={styles.skillPill}>{skill}</Text>
                ))}
              </View>
            </View>
          )}

          {/* Education */}
          {data.education?.length > 0 && (
            <View style={styles.sidebarSection}>
              <Text style={styles.sidebarSectionTitle}>Education</Text>
              {data.education.map((edu, i) => (
                <View key={i} style={{ marginBottom: 8 }}>
                  <Text style={{ ...styles.sidebarText, fontWeight: 700 }}>{edu.degree}</Text>
                  {edu.school && <Text style={styles.sidebarMuted}>{edu.school}</Text>}
                  {edu.dates && <Text style={{ ...styles.sidebarMuted, marginTop: 2 }}>{edu.dates}</Text>}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Main Content */}
        <View style={styles.main}>
          {/* Summary */}
          {data.summary && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Profile</Text>
              <View style={styles.sectionDivider} />
              <Text style={styles.summaryText}>{data.summary}</Text>
            </View>
          )}

          {/* Experience */}
          {data.workEntries?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Experience</Text>
              <View style={styles.sectionDivider} />
              {data.workEntries.map((work, i) => (
                <View key={i} style={{ marginBottom: 10 }}>
                  <View style={styles.entryHeader}>
                    <Text style={styles.entryTitle}>{work.role}</Text>
                    <Text style={styles.entryDates}>{work.dates}</Text>
                  </View>
                  {work.company && <Text style={styles.entrySubtitle}>{work.company}</Text>}
                  {work.description && <Text style={styles.entryDescription}>{work.description}</Text>}
                </View>
              ))}
            </View>
          )}

          {/* Projects */}
          {data.projects?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Projects</Text>
              <View style={styles.sectionDivider} />
              {data.projects.map((proj, i) => (
                <View key={i} style={{ marginBottom: 8 }}>
                  <View style={styles.entryHeader}>
                    {proj.link
                      ? <Link src={proj.link} style={{ ...styles.entryTitle, textDecoration: 'none', color: ACCENT }}>{proj.name}</Link>
                      : <Text style={styles.entryTitle}>{proj.name}</Text>}
                  </View>
                  {proj.description && <Text style={{ ...styles.entryDescription, marginTop: 2, marginBottom: 4 }}>{proj.description}</Text>}
                </View>
              ))}
            </View>
          )}
        </View>

        <Text style={styles.footer}>Generated by PortfolioPilot</Text>
      </Page>
    </Document>
  )
}
