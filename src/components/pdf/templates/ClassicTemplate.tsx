import React from 'react'
import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer'
import type { ImprovedResumeData } from '../ImprovedResumeTemplate'
import './fonts'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Inter', fontSize: 10, color: '#000000', lineHeight: 1.5 },
  header: { marginBottom: 20, textAlign: 'center' },
  name: { fontSize: 24, fontWeight: 700, marginBottom: 8, color: '#000000' },
  contactRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 8, fontSize: 9, color: '#111827' },
  contactItem: { textDecoration: 'none', color: '#111827' },
  divider: { borderBottomWidth: 1.5, borderBottomColor: '#000000', marginVertical: 8 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: 700, color: '#000000', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryText: { textAlign: 'justify', color: '#111827' },
  skillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  skillText: { padding: '2 6', backgroundColor: '#e2e8f0', borderRadius: 4, fontSize: 9, color: '#000000', fontWeight: 700 },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 },
  entryTitle: { fontWeight: 700, fontSize: 10, color: '#000000' },
  entrySubtitle: { color: '#000000', fontSize: 9, fontWeight: 700 },
  entryDates: { fontSize: 9, color: '#000000', fontWeight: 700 },
  entryDescription: { marginTop: 3, marginBottom: 8, textAlign: 'justify', color: '#111827' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#6b7280' },
})

export function ClassicTemplate({ data }: { data: ImprovedResumeData }) {
  const contactParts: string[] = []
  if (data.email) contactParts.push(data.email)
  if (data.phone) contactParts.push(data.phone)
  if (data.linkedin) contactParts.push(data.linkedin)
  if (data.github) contactParts.push(data.github)
  if (data.website) contactParts.push(data.website)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{data.name || 'Your Name'}</Text>
          <View style={styles.contactRow}>
            {contactParts.map((part, i) => (
              <React.Fragment key={i}>
                <Text style={styles.contactItem}>{part.replace(/^https?:\/\//, '')}</Text>
                {i < contactParts.length - 1 && <Text> • </Text>}
              </React.Fragment>
            ))}
          </View>
        </View>

        {data.sections && data.sections.length > 0 ? (
          data.sections.map((section, idx) => (
            <View key={idx} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
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
                <View key={i} style={{ marginBottom: 10 }}>
                  <View style={styles.entryHeader}>
                    {entry.link && /^https?:\/\//.test(entry.link)
                      ? <Link src={entry.link} style={{ ...styles.entryTitle, textDecoration: 'none', color: '#2563eb' }}>{entry.title}</Link>
                      : <Text style={styles.entryTitle}>{entry.title || 'Title'}</Text>}
                    {entry.dates && <Text style={styles.entryDates}>{entry.dates}</Text>}
                  </View>
                  {entry.subtitle && entry.subtitle.toLowerCase() !== entry.title?.toLowerCase() && (
                    <Text style={styles.entrySubtitle}>{entry.subtitle}</Text>
                  )}
                  {entry.description && <Text style={styles.entryDescription}>{entry.description}</Text>}
                </View>
              ))}
            </View>
          ))
        ) : (
          // Legacy fallbacks
          <>
            {data.summary && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Professional Summary</Text>
                <View style={styles.divider} />
                <Text style={styles.summaryText}>{data.summary}</Text>
              </View>
            )}

            {(data.skills?.length ?? 0) > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Skills</Text>
                <View style={styles.divider} />
                <View style={styles.skillsContainer}>
                  {(data.skills || []).map((skill, i) => <Text key={i} style={styles.skillText}>{skill}</Text>)}
                </View>
              </View>
            )}

            {(data.workEntries?.length ?? 0) > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Experience</Text>
                <View style={styles.divider} />
                {(data.workEntries || []).map((work, i) => (
                  <View key={i} style={{ marginBottom: 10 }}>
                    <View style={styles.entryHeader}>
                      <Text style={styles.entryTitle}>{work.role || 'Role Title'}</Text>
                      <Text style={styles.entryDates}>{work.dates}</Text>
                    </View>
                    {work.company && work.company.toLowerCase() !== work.role?.toLowerCase() && (
                      <Text style={styles.entrySubtitle}>{work.company}</Text>
                    )}
                    {work.description && <Text style={styles.entryDescription}>{work.description}</Text>}
                  </View>
                ))}
              </View>
            )}

            {(data.projects?.length ?? 0) > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Projects</Text>
                <View style={styles.divider} />
                {(data.projects || []).map((proj, i) => (
                  <View key={i} style={{ marginBottom: 8 }}>
                    <View style={styles.entryHeader}>
                      {proj.link && /^https?:\/\//.test(proj.link)
                        ? <Link src={proj.link} style={{ ...styles.entryTitle, textDecoration: 'none', color: '#2563eb' }}>{proj.name}</Link>
                        : <Text style={styles.entryTitle}>{proj.name}</Text>}
                    </View>
                    {proj.description && <Text style={{ ...styles.entryDescription, marginTop: 2, marginBottom: 4 }}>{proj.description}</Text>}
                  </View>
                ))}
              </View>
            )}

            {(data.education?.length ?? 0) > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Education</Text>
                <View style={styles.divider} />
                {(data.education || []).map((edu, i) => (
                  <View key={i} style={{ marginBottom: 8 }}>
                    <View style={styles.entryHeader}>
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
