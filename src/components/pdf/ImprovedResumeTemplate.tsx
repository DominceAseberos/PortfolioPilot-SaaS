import React from 'react'
import { Document, Page, Text, View, StyleSheet, Link, Font } from '@react-pdf/renderer'
import { ClassicTemplate } from './templates/ClassicTemplate'
import { ModernTemplate } from './templates/ModernTemplate'
import { CompactTemplate } from './templates/CompactTemplate'

// ─── Template registry ────────────────────────────────────────────────────────
export type ResumeTemplateId = 'classic' | 'modern' | 'compact'

export const RESUME_TEMPLATES: {
  id: ResumeTemplateId
  name: string
  description: string
  tags: string[]
  accentColor: string
  previewBg: string
}[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Clean single-column layout, perfect for corporate and university applications.',
    tags: ['ATS-Perfect', 'Single Column', 'Traditional'],
    accentColor: '#1e293b',
    previewBg: '#f8fafc',
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Two-column design with a dark sidebar. Stands out for tech and startup roles.',
    tags: ['ATS-Friendly', 'Two Column', 'Tech / Startup'],
    accentColor: '#6366f1',
    previewBg: '#eef2ff',
  },
  {
    id: 'compact',
    name: 'Compact',
    description: 'Dense layout with a bold dark header. Maximises space for experienced candidates.',
    tags: ['ATS-Perfect', 'Dense Layout', 'Senior / Experienced'],
    accentColor: '#0284c7',
    previewBg: '#f0f9ff',
  },
]

export function ResumeTemplateRenderer({ data, templateId }: { data: ImprovedResumeData; templateId: ResumeTemplateId }) {
  switch (templateId) {
    case 'modern': return <ModernTemplate data={data} />
    case 'compact': return <CompactTemplate data={data} />
    default: return <ClassicTemplate data={data} />
  }
}

// ─── Legacy "Classic" export (kept for backwards compatibility) ────────────────
// Font registration is handled inside ClassicTemplate via shared fonts.ts

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Inter',
    fontSize: 10,
    color: '#000000',
    lineHeight: 1.5,
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 8,
    color: '#000000',
  },
  contactRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    fontSize: 9,
    color: '#111827',
  },
  contactItem: {
    textDecoration: 'none',
    color: '#111827',
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    marginVertical: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    color: '#000000',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryText: {
    textAlign: 'justify',
    color: '#111827',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  skillText: {
    padding: '2 6',
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    fontSize: 9,
    color: '#000000',
    fontWeight: 700,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 2,
  },
  entryTitle: {
    fontWeight: 700,
    fontSize: 11,
    color: '#000000',
  },
  entrySubtitle: {
    color: '#000000',
    fontWeight: 700,
  },
  entryDates: {
    fontSize: 9,
    color: '#000000',
    fontWeight: 700,
  },
  entryDescription: {
    marginTop: 4,
    marginBottom: 8,
    textAlign: 'justify',
    color: '#111827',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
  }
})

export interface ImprovedResumeData {
  name: string
  email: string
  phone: string
  linkedin: string
  github: string
  website: string
  summary: string
  skills: string[]
  workEntries: {
    company: string
    role: string
    dates: string
    description: string
    isEnhanced?: boolean
  }[]
  projects: {
    name: string
    link: string
    description: string
    isNew?: boolean
  }[]
  education: {
    degree: string
    school: string
    dates: string
  }[]
  recommendations: string[]
}

export function ImprovedResumeTemplate({ data }: { data: ImprovedResumeData }) {
  const contactParts = []
  if (data.email) contactParts.push(data.email)
  if (data.phone) contactParts.push(data.phone)
  if (data.linkedin) contactParts.push(data.linkedin)
  if (data.github) contactParts.push(data.github)
  if (data.website) contactParts.push(data.website)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
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

        {/* Summary */}
        {data.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Professional Summary</Text>
            <View style={styles.divider} />
            <Text style={styles.summaryText}>{data.summary}</Text>
          </View>
        )}

        {/* Skills */}
        {data.skills && data.skills.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <View style={styles.divider} />
            <View style={styles.skillsContainer}>
              {data.skills.map((skill, i) => (
                <Text key={i} style={styles.skillText}>{skill}</Text>
              ))}
            </View>
          </View>
        )}

        {/* Experience */}
        {data.workEntries && data.workEntries.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Experience</Text>
            <View style={styles.divider} />
            {data.workEntries.map((work, i) => (
              <View key={i} style={{ marginBottom: 12 }}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>{work.role || 'Role Title'}</Text>
                  <Text style={styles.entryDates}>{work.dates || 'Dates'}</Text>
                </View>
                {work.company && <Text style={styles.entrySubtitle}>{work.company}</Text>}
                {work.description && <Text style={styles.entryDescription}>{work.description}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Projects */}
        {data.projects && data.projects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Projects</Text>
            <View style={styles.divider} />
            {data.projects.map((proj, i) => (
              <View key={i} style={{ marginBottom: 10 }}>
                <View style={styles.entryHeader}>
                  {proj.link && /^https?:\/\//.test(proj.link) ? (
                    <Link src={proj.link} style={{ ...styles.entryTitle, textDecoration: 'none', color: '#2563eb' }}>
                      {proj.name}
                    </Link>
                  ) : (
                    <Text style={styles.entryTitle}>{proj.name}</Text>
                  )}
                </View>
                {proj.description && <Text style={{ ...styles.entryDescription, marginTop: 2, marginBottom: 4 }}>{proj.description}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Education */}
        {data.education && data.education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            <View style={styles.divider} />
            {data.education.map((edu, i) => (
              <View key={i} style={{ marginBottom: 8 }}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>{edu.degree || 'Degree'}</Text>
                  <Text style={styles.entryDates}>{edu.dates || 'Dates'}</Text>
                </View>
                {edu.school && <Text style={styles.entrySubtitle}>{edu.school}</Text>}
              </View>
            ))}
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer}>Improved and formatted by PortfolioPilot</Text>
      </Page>
    </Document>
  )
}
