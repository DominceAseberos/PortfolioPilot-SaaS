import React from 'react'
import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer'
import type { ImprovedResumeData } from '../ImprovedResumeTemplate'
import { renderDescription } from './pdfUtils'
import { allocateResumeSections, getPrimaryResumeRole } from '@/features/resume/services/resume-template-allocation.service'
import { PDF_FONT_FAMILY } from './fonts'

const ACCENT = '#4f46e5'
const SIDEBAR_BG = '#1e293b' // Softer slate/zinc instead of harsh navy
const SIDEBAR_TEXT = '#f8fafc'
const SIDEBAR_MUTED = '#cbd5e1'

const styles = StyleSheet.create({
  page: { flexDirection: 'row', fontFamily: PDF_FONT_FAMILY, fontSize: 10, color: '#000000', lineHeight: 1.3 },
  // Sidebar
  sidebar: { width: '35%', backgroundColor: SIDEBAR_BG, padding: '36 20', minHeight: '100%' },
  sidebarName: { fontSize: 20, fontWeight: 700, color: '#ffffff', marginBottom: 6, lineHeight: 1.2 },
  sidebarRole: { fontSize: 10, color: SIDEBAR_MUTED, marginBottom: 24, textTransform: 'uppercase', letterSpacing: 0.8 },
  sidebarSection: { marginBottom: 20 },
  sidebarSectionTitle: { fontSize: 9, fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#334155', paddingBottom: 4 },
  sidebarText: { fontSize: 9.5, color: SIDEBAR_TEXT, marginBottom: 5, lineHeight: 1.3 },
  sidebarMuted: { fontSize: 8.5, color: SIDEBAR_MUTED },
  skillPill: { backgroundColor: '#334155', padding: '4 8', borderRadius: 12, marginBottom: 6, marginRight: 6, fontSize: 8.5, color: '#ffffff' },
  skillRow: { flexDirection: 'row', flexWrap: 'wrap' },
  // Main
  main: { width: '65%', padding: '36 28 36 24', backgroundColor: '#ffffff' },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  sectionDivider: { borderBottomWidth: 1.5, borderBottomColor: ACCENT, marginBottom: 10 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 },
  entryTitle: { fontWeight: 700, fontSize: 11, color: '#000000' },
  entrySubtitle: { color: '#000000', fontSize: 10, marginBottom: 3, fontWeight: 600 },
  entryDates: { fontSize: 8.5, color: '#000000', backgroundColor: '#f1f5f9', padding: '2 6', borderRadius: 4, fontWeight: 600 },
  entryDescriptionWrapper: { marginTop: 4, marginBottom: 10 },
  entryDescription: { color: '#000000', lineHeight: 1.3 },
  summaryText: { color: '#000000', lineHeight: 1.3, textAlign: 'left' },
  footer: { position: 'absolute', bottom: 20, right: 24, fontSize: 7, color: '#94a3b8' },
})

export function ModernTemplate({ data }: { data: ImprovedResumeData }) {
  const hasSections = data.sections && data.sections.length > 0
  const allocation = allocateResumeSections(data, 'modern')
  const role = getPrimaryResumeRole(data)
  const sidebarSections = hasSections ? allocation.secondary : []
  const mainSections = hasSections
    ? allocation.summary ? [allocation.summary, ...allocation.primary] : allocation.primary
    : []

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
            {data.location && <Text style={styles.sidebarText}>{data.location}</Text>}
            {data.linkedin && <Text style={styles.sidebarMuted}>{data.linkedin.replace(/^https?:\/\//, '')}</Text>}
            {data.github && <Text style={styles.sidebarMuted}>{data.github.replace(/^https?:\/\//, '')}</Text>}
            {data.website && <Text style={styles.sidebarMuted}>{data.website.replace(/^https?:\/\//, '')}</Text>}
          </View>

          {hasSections ? (
            sidebarSections.map((section, idx) => (
              <View key={`sidebar-${idx}`} style={styles.sidebarSection}>
                <Text style={styles.sidebarSectionTitle}>{section.title}</Text>
                
                {section.type === 'list' && section.items && (
                  <View style={styles.skillRow}>
                    {section.items.map((item, i) => (
                      <Text key={i} style={styles.skillPill}>{item}</Text>
                    ))}
                  </View>
                )}

                {section.type === 'entries' && section.entries && section.entries.map((entry, i) => (
                  <View key={i} style={{ marginBottom: 8 }}>
                    <Text style={{ ...styles.sidebarText, fontWeight: 700 }}>{entry.title}</Text>
                    {entry.subtitle && <Text style={styles.sidebarMuted}>{entry.subtitle}</Text>}
                    {entry.dates && <Text style={{ ...styles.sidebarMuted, marginTop: 2 }}>{entry.dates}</Text>}
                  </View>
                ))}
              </View>
            ))
          ) : (
            // Legacy fallbacks
            <>
              {(data.skills?.length ?? 0) > 0 && (
                <View style={styles.sidebarSection}>
                  <Text style={styles.sidebarSectionTitle}>Skills</Text>
                  <View style={styles.skillRow}>
                    {(data.skills || []).map((skill, i) => (
                      <Text key={i} style={styles.skillPill}>{skill}</Text>
                    ))}
                  </View>
                </View>
              )}

              {(data.education?.length ?? 0) > 0 && (
                <View style={styles.sidebarSection}>
                  <Text style={styles.sidebarSectionTitle}>Education</Text>
                  {(data.education || []).map((edu, i) => (
                    <View key={i} style={{ marginBottom: 8 }}>
                      <Text style={{ ...styles.sidebarText, fontWeight: 700 }}>{edu.degree}</Text>
                      {edu.school && <Text style={styles.sidebarMuted}>{edu.school}</Text>}
                      {edu.dates && <Text style={{ ...styles.sidebarMuted, marginTop: 2 }}>{edu.dates}</Text>}
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        {/* Main Content */}
        <View style={styles.main}>
          {hasSections ? (
            mainSections.map((section, idx) => (
              <View key={`main-${idx}`} style={styles.section}>
                <Text style={styles.sectionTitle} minPresenceAhead={30}>{section.title}</Text>
                <View style={styles.sectionDivider} />
                
                {section.type === 'text' && section.text && (
                  <Text style={styles.summaryText}>{section.text}</Text>
                )}

                {section.type === 'list' && section.items && (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                    {section.items.map((item, i) => (
                      <Text key={i} style={{ backgroundColor: '#f1f5f9', padding: '3 6', borderRadius: 4, fontSize: 8.5, color: '#000000', fontWeight: 600 }}>{item}</Text>
                    ))}
                  </View>
                )}
                
                {section.type === 'entries' && section.entries && section.entries.map((entry, i) => (
                  <View key={i} style={{ marginBottom: 10 }}>
                    <View style={styles.entryHeader} minPresenceAhead={24}>
                      {entry.link && /^https?:\/\//.test(entry.link)
                        ? <Link src={entry.link} style={{ ...styles.entryTitle, textDecoration: 'none', color: ACCENT }}>{entry.title}</Link>
                        : <Text style={styles.entryTitle}>{entry.title}</Text>}
                      {entry.dates && <Text style={styles.entryDates}>{entry.dates}</Text>}
                    </View>
                    {entry.subtitle && entry.subtitle.toLowerCase() !== entry.title?.toLowerCase() && (
                      <Text style={styles.entrySubtitle}>{entry.subtitle}</Text>
                    )}
                    {entry.description && (
                      <View style={styles.entryDescriptionWrapper}>
                        {renderDescription(entry.description, styles.entryDescription)}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            ))
          ) : (
            // Legacy fallbacks
            <>
              {data.summary && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle} minPresenceAhead={30}>Profile</Text>
                  <View style={styles.sectionDivider} />
                  <Text style={styles.summaryText}>{data.summary}</Text>
                </View>
              )}

              {(data.workEntries?.length ?? 0) > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle} minPresenceAhead={30}>Experience</Text>
                  <View style={styles.sectionDivider} />
                  {(data.workEntries || []).map((work, i) => (
                    <View key={i} style={{ marginBottom: 10 }}>
                      <View style={styles.entryHeader} minPresenceAhead={24}>
                        <Text style={styles.entryTitle}>{work.role}</Text>
                        <Text style={styles.entryDates}>{work.dates}</Text>
                      </View>
                      {work.company && work.company.toLowerCase() !== work.role?.toLowerCase() && (
                        <Text style={styles.entrySubtitle}>{work.company}</Text>
                      )}
                      {work.description && (
                        <View style={styles.entryDescriptionWrapper}>
                          {renderDescription(work.description, styles.entryDescription)}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {(data.projects?.length ?? 0) > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle} minPresenceAhead={30}>Projects</Text>
                  <View style={styles.sectionDivider} />
                  {(data.projects || []).map((proj, i) => (
                    <View key={i} style={{ marginBottom: 8 }}>
                      <View style={styles.entryHeader} minPresenceAhead={24}>
                        {proj.link && /^https?:\/\//.test(proj.link)
                          ? <Link src={proj.link} style={{ ...styles.entryTitle, textDecoration: 'none', color: ACCENT }}>{proj.name}</Link>
                          : <Text style={styles.entryTitle}>{proj.name}</Text>}
                      </View>
                      {proj.description && (
                        <View style={styles.entryDescriptionWrapper}>
                          {renderDescription(proj.description, styles.entryDescription)}
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>

        <Text style={styles.footer}>Generated by PortfolioPilot</Text>
      </Page>
    </Document>
  )
}
