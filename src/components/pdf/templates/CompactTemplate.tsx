import React from 'react'
import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer'
import type { ImprovedResumeData } from '../ImprovedResumeTemplate'
import { renderDescription } from './pdfUtils'
import './fonts'

const HEADER_BG = '#0f172a'
const ACCENT = '#0284c7' // slightly deeper sky blue

const styles = StyleSheet.create({
  page: { fontFamily: 'Inter', fontSize: 9.5, color: '#000000', lineHeight: 1.3, backgroundColor: '#ffffff' },
  // Header bar
  header: { backgroundColor: HEADER_BG, padding: '24 32 20 32' },
  name: { fontSize: 22, fontWeight: 700, color: '#ffffff', marginBottom: 12, lineHeight: 1.1 },
  tagline: { fontSize: 10, color: '#7dd3fc', marginBottom: 14, letterSpacing: 0.5 },
  contactRow: { fontSize: 8.5, color: '#94a3b8', marginTop: 4, lineHeight: 1.3 },
  contactItem: { fontSize: 8.5, color: '#94a3b8' },
  // Body
  body: { padding: '20 32' },
  twoCol: { flexDirection: 'row', gap: 20 },
  colLeft: { width: '64%' },
  colRight: { width: '36%' },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 10, fontWeight: 700, color: HEADER_BG, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4, borderLeftWidth: 3, borderLeftColor: ACCENT, paddingLeft: 8 },
  divider: { borderBottomWidth: 0.5, borderBottomColor: '#cbd5e1', marginBottom: 8 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  entryTitle: { fontWeight: 700, fontSize: 10, color: '#0f172a' },
  entrySubtitle: { color: '#000000', fontSize: 9, fontWeight: 600 },
  entryDates: { fontSize: 8.5, color: '#475569', fontWeight: 600 },
  entryDescriptionWrapper: { marginTop: 3, marginBottom: 8 },
  entryDesc: { color: '#000000', lineHeight: 1.3, textAlign: 'left' },
  summaryText: { color: '#000000', lineHeight: 1.3, textAlign: 'justify' },
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  skillTag: { fontSize: 8.5, backgroundColor: '#f1f5f9', padding: '3 6', borderRadius: 3, color: '#000000', fontWeight: 600, borderWidth: 0.5, borderColor: '#cbd5e1' },
  eduEntry: { marginBottom: 8 },
  footer: { position: 'absolute', bottom: 18, right: 32, fontSize: 7, color: '#cbd5e1' },
})

export function CompactTemplate({ data }: { data: ImprovedResumeData }) {
  const contactParts: string[] = []
  if (data.email) contactParts.push(data.email)
  if (data.phone) contactParts.push(data.phone)
  if (data.linkedin) contactParts.push(data.linkedin.replace(/^https?:\/\//, ''))
  if (data.github) contactParts.push(data.github.replace(/^https?:\/\//, ''))
  if (data.website) contactParts.push(data.website.replace(/^https?:\/\//, ''))

  const topRole = data.sections 
    ? data.sections.find(s => s.type === 'entries')?.entries?.[0]?.title || ''
    : data.workEntries?.[0]?.role || ''

  const hasSections = data.sections && data.sections.length > 0
  const summarySection = hasSections ? data.sections.find(s => s.title.toLowerCase().includes('summary') || s.title.toLowerCase().includes('profile') || s.type === 'text') : null
  
  const rightTitles = ['skill', 'education', 'certif', 'language']
  const rightSections = hasSections ? data.sections.filter(s => s !== summarySection && rightTitles.some(t => s.title.toLowerCase().includes(t))) : []
  const leftSections = hasSections ? data.sections.filter(s => s !== summarySection && !rightTitles.some(t => s.title.toLowerCase().includes(t))) : []

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Dark Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{data.name || 'Your Name'}</Text>
          {topRole && <Text style={styles.tagline}>{topRole}</Text>}
          <Text style={styles.contactRow}>
            {contactParts.join('  |  ')}
          </Text>
        </View>

        <View style={styles.body}>
          {hasSections ? (
            <>
              {summarySection && summarySection.text && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{summarySection.title}</Text>
                  <View style={styles.divider} />
                  <Text style={styles.summaryText}>{summarySection.text}</Text>
                </View>
              )}

              <View style={styles.twoCol}>
                {/* Left Column */}
                <View style={styles.colLeft}>
                  {leftSections.map((section, idx) => (
                    <View key={`left-${idx}`} style={styles.section}>
                      <Text style={styles.sectionTitle}>{section.title}</Text>
                      <View style={styles.divider} />
                      
                      {section.type === 'entries' && section.entries && section.entries.map((entry, i) => (
                        <View key={i} style={{ marginBottom: 8 }} wrap={false}>
                          <View style={styles.entryHeader}>
                            {entry.link && /^https?:\/\//.test(entry.link)
                              ? <Link src={entry.link} style={{ ...styles.entryTitle, textDecoration: 'none', color: '#0284c7' }}>{entry.title}</Link>
                              : <Text style={styles.entryTitle}>{entry.title}</Text>}
                            {entry.dates && <Text style={styles.entryDates}>{entry.dates}</Text>}
                          </View>
                          {entry.subtitle && entry.subtitle.toLowerCase() !== entry.title?.toLowerCase() && (
                            <Text style={styles.entrySubtitle}>{entry.subtitle}</Text>
                          )}
                          {entry.description && (
                            <View style={styles.entryDescriptionWrapper}>
                              {renderDescription(entry.description, styles.entryDesc)}
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  ))}
                </View>

                {/* Right Column */}
                <View style={styles.colRight}>
                  {rightSections.map((section, idx) => (
                    <View key={`right-${idx}`} style={styles.section}>
                      <Text style={styles.sectionTitle}>{section.title}</Text>
                      <View style={styles.divider} />
                      
                      {section.type === 'list' && section.items && (
                        <View style={styles.skillsRow}>
                          {section.items.map((item, i) => (
                            <Text key={i} style={styles.skillTag}>{item}</Text>
                          ))}
                        </View>
                      )}

                      {section.type === 'entries' && section.entries && section.entries.map((entry, i) => (
                        <View key={i} style={styles.eduEntry} wrap={false}>
                          <Text style={styles.entryTitle}>{entry.title}</Text>
                          {entry.subtitle && <Text style={styles.entrySubtitle}>{entry.subtitle}</Text>}
                          {entry.dates && <Text style={styles.entryDates}>{entry.dates}</Text>}
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              </View>
            </>
          ) : (
            // Legacy fallbacks
            <>
              {data.summary && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Summary</Text>
                  <View style={styles.divider} />
                  <Text style={styles.summaryText}>{data.summary}</Text>
                </View>
              )}

              <View style={styles.twoCol}>
                <View style={styles.colLeft}>
                  {(data.workEntries?.length ?? 0) > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Experience</Text>
                      <View style={styles.divider} />
                      {(data.workEntries || []).map((work, i) => (
                        <View key={i} style={{ marginBottom: 8 }} wrap={false}>
                          <View style={styles.entryHeader}>
                            <Text style={styles.entryTitle}>{work.role}</Text>
                            <Text style={styles.entryDates}>{work.dates}</Text>
                          </View>
                          {work.company && work.company.toLowerCase() !== work.role?.toLowerCase() && (
                            <Text style={styles.entrySubtitle}>{work.company}</Text>
                          )}
                          {work.description && (
                            <View style={styles.entryDescriptionWrapper}>
                              {renderDescription(work.description, styles.entryDesc)}
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {(data.projects?.length ?? 0) > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Projects</Text>
                      <View style={styles.divider} />
                      {(data.projects || []).map((proj, i) => (
                        <View key={i} style={{ marginBottom: 7 }} wrap={false}>
                          <View style={styles.entryHeader}>
                            {proj.link && /^https?:\/\//.test(proj.link)
                              ? <Link src={proj.link} style={{ ...styles.entryTitle, textDecoration: 'none', color: '#0284c7' }}>{proj.name}</Link>
                              : <Text style={styles.entryTitle}>{proj.name}</Text>}
                          </View>
                          {proj.description && (
                            <View style={styles.entryDescriptionWrapper}>
                              {renderDescription(proj.description, styles.entryDesc)}
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.colRight}>
                  {(data.skills?.length ?? 0) > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Skills</Text>
                      <View style={styles.divider} />
                      <View style={styles.skillsRow}>
                        {(data.skills || []).map((skill, i) => (
                          <Text key={i} style={styles.skillTag}>{skill}</Text>
                        ))}
                      </View>
                    </View>
                  )}

                  {(data.education?.length ?? 0) > 0 && (
                    <View style={{ ...styles.section, marginTop: 6 }}>
                      <Text style={styles.sectionTitle}>Education</Text>
                      <View style={styles.divider} />
                      {(data.education || []).map((edu, i) => (
                        <View key={i} style={styles.eduEntry} wrap={false}>
                          <Text style={styles.entryTitle}>{edu.degree}</Text>
                          {edu.school && <Text style={styles.entrySubtitle}>{edu.school}</Text>}
                          {edu.dates && <Text style={styles.entryDates}>{edu.dates}</Text>}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </>
          )}
        </View>

        <Text style={styles.footer}>Generated by PortfolioPilot</Text>
      </Page>
    </Document>
  )
}
