import React from 'react'
import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer'
import type { ImprovedResumeData } from '../ImprovedResumeTemplate'
import { renderDescription } from './pdfUtils'
import { allocateResumeSections } from '@/features/resume/services/resume-template-allocation.service'
import { PDF_FONT_FAMILY } from './fonts'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: PDF_FONT_FAMILY, fontSize: 10, color: '#000000', lineHeight: 1.3 },
  header: { marginBottom: 24, textAlign: 'center' },
  name: { fontSize: 26, fontWeight: 700, marginBottom: 16, color: '#000000', lineHeight: 1.1 },
  contactRow: { textAlign: 'center', fontSize: 9.5, color: '#000000', marginTop: 4 },
  contactItem: { textDecoration: 'none', color: '#000000' },
  divider: { borderBottomWidth: 0.5, borderBottomColor: '#000000', marginVertical: 10 },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 12, fontWeight: 700, color: '#000000', marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.8 },
  summaryText: { textAlign: 'justify', color: '#000000', lineHeight: 1.3 },
  skillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  skillText: { padding: '3 6', backgroundColor: '#f1f5f9', borderRadius: 4, fontSize: 9.5, color: '#000000', fontWeight: 600 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 },
  entryTitle: { fontWeight: 700, fontSize: 11, color: '#000000' },
  entrySubtitle: { color: '#000000', fontSize: 10, fontWeight: 600, marginBottom: 4 },
  entryDates: { fontSize: 9.5, color: '#000000', fontWeight: 600 },
  entryDescriptionWrapper: { marginTop: 4, marginBottom: 10 },
  entryDescription: { color: '#000000', lineHeight: 1.3, textAlign: 'left' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#9ca3af' },
})

export function ClassicTemplate({ data }: { data: ImprovedResumeData }) {
  const contactParts: string[] = []
  if (data.email) contactParts.push(data.email)
  if (data.phone) contactParts.push(data.phone)
  if (data.location) contactParts.push(data.location)
  if (data.linkedin) contactParts.push(data.linkedin)
  if (data.github) contactParts.push(data.github)
  if (data.website) contactParts.push(data.website)

  const allocation = allocateResumeSections(data, 'classic')

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{data.name || 'Your Name'}</Text>
          <Text style={styles.contactRow}>
            {contactParts.map(p => p.replace(/^https?:\/\//, '')).join(' • ')}
          </Text>
        </View>

        {data.sections && data.sections.length > 0 ? (
          allocation.ordered.map((section, idx) => (
            <View key={idx} style={styles.section}>
              <Text style={styles.sectionTitle} minPresenceAhead={30}>{section.title}</Text>
              <View style={styles.divider} />
              
              {section.type === 'text' && section.text && (
                <Text style={styles.summaryText}>{section.text}</Text>
              )}
              
              {section.type === 'list' && section.items && (
                <View style={styles.skillsContainer}>
                  {section.items.map((item, i) => <Text key={i} style={styles.skillText}>{item}</Text>)}
                </View>
              )}
              
              {section.type === 'entries' && section.entries && section.entries.map((entry, i) => (
                <View key={i} style={{ marginBottom: 10 }} wrap={false}>
                  <View style={styles.entryHeader} minPresenceAhead={24}>
                    {entry.link && /^https?:\/\//.test(entry.link)
                      ? <Link src={entry.link} style={{ ...styles.entryTitle, textDecoration: 'none', color: '#2563eb' }}>{entry.title}</Link>
                      : <Text style={styles.entryTitle}>{entry.title || 'Title'}</Text>}
                    {entry.dates && <Text style={styles.entryDates}>{entry.dates}</Text>}
                  </View>
                  {entry.subtitle && entry.subtitle.toLowerCase() !== entry.title?.toLowerCase() && (
                    <Text style={styles.entrySubtitle}>{entry.subtitle}</Text>
                  )}
                  {(entry.description || (entry.bullets && entry.bullets.length > 0)) && (
                    <View style={styles.entryDescriptionWrapper}>
                      {renderDescription(entry.description, styles.entryDescription, '#000000', entry.bullets)}
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
                <Text style={styles.sectionTitle} minPresenceAhead={30}>Professional Summary</Text>
                <View style={styles.divider} />
                <Text style={styles.summaryText}>{data.summary}</Text>
              </View>
            )}

            {(data.skills?.length ?? 0) > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle} minPresenceAhead={30}>Skills</Text>
                <View style={styles.divider} />
                <View style={styles.skillsContainer}>
                  {(data.skills || []).map((skill, i) => <Text key={i} style={styles.skillText}>{skill}</Text>)}
                </View>
              </View>
            )}

            {(data.workEntries?.length ?? 0) > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle} minPresenceAhead={30}>Experience</Text>
                <View style={styles.divider} />
                {(data.workEntries || []).map((work, i) => (
                  <View key={i} style={{ marginBottom: 10 }}>
                    <View style={styles.entryHeader} minPresenceAhead={24}>
                      <Text style={styles.entryTitle}>{work.role || 'Role Title'}</Text>
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
                <View style={styles.divider} />
                {(data.projects || []).map((proj, i) => (
                  <View key={i} style={{ marginBottom: 8 }}>
                    <View style={styles.entryHeader} minPresenceAhead={24}>
                      {proj.link && /^https?:\/\//.test(proj.link)
                        ? <Link src={proj.link} style={{ ...styles.entryTitle, textDecoration: 'none', color: '#2563eb' }}>{proj.name}</Link>
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

            {(data.education?.length ?? 0) > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle} minPresenceAhead={30}>Education</Text>
                <View style={styles.divider} />
                {(data.education || []).map((edu, i) => (
                  <View key={i} style={{ marginBottom: 8 }}>
                    <View style={styles.entryHeader} minPresenceAhead={24}>
                      <Text style={styles.entryTitle}>{edu.degree}</Text>
                      <Text style={styles.entryDates}>{edu.dates}</Text>
                    </View>
                    <Text style={styles.entrySubtitle}>{edu.school}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        <Text style={styles.footer}>Generated by PortfolioPilot</Text>
      </Page>
    </Document>
  )
}
