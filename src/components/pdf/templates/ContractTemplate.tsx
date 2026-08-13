import React from 'react'
import { Document, Link, Page, Text, View } from '@react-pdf/renderer'
import type { DynamicSection, ImprovedResumeData } from '@/types/resume'
import type { ResumeTemplateContract, ResumeTemplateRegionContract } from '@/types/resume-template-contract'
import { planResumeTemplateLayout } from '@/features/resume/services/resume-template-layout-plan.service'
import { getPrimaryResumeRole } from '@/features/resume/services/resume-template-allocation.service'
import { renderDescription } from './pdfUtils'
import { PDF_FONT_FAMILY } from './fonts'

function regionFontSize(contract: ResumeTemplateContract, region: ResumeTemplateRegionContract): number {
  const widthAdjustment = region.widthRatio < 0.45 ? -0.25 : 0
  return Math.max(contract.minimumFontSize, 9.5 + widthAdjustment)
}

function IdentityBlock({
  data,
  contract,
  region,
}: {
  data: ImprovedResumeData
  contract: ResumeTemplateContract
  region: ResumeTemplateRegionContract
}) {
  const fontSize = regionFontSize(contract, region)
  const narrow = region.widthRatio < 0.5
  const contacts = [data.email, data.phone, data.location, data.linkedin, data.github, data.website]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.replace(/^https?:\/\//, ''))
  const role = getPrimaryResumeRole(data)

  return (
    <View style={{ marginBottom: narrow ? 16 : 20 }}>
      <Text style={{ fontSize: fontSize + (narrow ? 8 : 12), fontWeight: 700, lineHeight: 1.08, marginBottom: 5 }}>
        {data.name || 'Your Name'}
      </Text>
      {role && <Text style={{ fontSize, fontWeight: 600, marginBottom: 8 }}>{role}</Text>}
      {narrow
        ? contacts.map((contact, index) => (
          <Text key={`${contact}-${index}`} style={{ fontSize: Math.max(contract.minimumFontSize, fontSize - 0.25), marginBottom: 3 }}>
            {contact}
          </Text>
        ))
        : contacts.length > 0 && (
          <Text style={{ fontSize: Math.max(contract.minimumFontSize, fontSize - 0.25), lineHeight: 1.25 }}>
            {contacts.join('  |  ')}
          </Text>
        )}
    </View>
  )
}

function SectionBlock({
  section,
  contract,
  region,
}: {
  section: DynamicSection
  contract: ResumeTemplateContract
  region: ResumeTemplateRegionContract
}) {
  const fontSize = regionFontSize(contract, region)
  const headingSize = fontSize + 1.5

  return (
    <View style={{ marginBottom: 12, width: '100%' }}>
      <Text
        minPresenceAhead={28}
        style={{ fontSize: headingSize, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}
      >
        {section.title}
      </Text>
      <View style={{ borderBottomWidth: 0.6, borderBottomColor: '#94a3b8', marginBottom: 7 }} />

      {section.type === 'text' && section.text && (
        <Text style={{ fontSize, lineHeight: 1.3 }}>{section.text}</Text>
      )}

      {section.type === 'list' && section.items && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          {section.items.map((item, index) => (
            <Text
              key={`${item}-${index}`}
              style={{ fontSize: Math.max(contract.minimumFontSize, fontSize - 0.25), padding: '2 5', borderWidth: 0.4, borderColor: '#cbd5e1', borderRadius: 3 }}
            >
              {item}
            </Text>
          ))}
        </View>
      )}

      {section.type === 'entries' && section.entries?.map((entry, index) => (
        <View key={`${entry.title}-${index}`} style={{ marginBottom: 9 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }} minPresenceAhead={24}>
            {entry.link && /^https?:\/\//.test(entry.link)
              ? <Link src={entry.link} style={{ fontSize: fontSize + 0.5, fontWeight: 700, textDecoration: 'none', color: '#0f172a' }}>{entry.title}</Link>
              : <Text style={{ fontSize: fontSize + 0.5, fontWeight: 700 }}>{entry.title || 'Title'}</Text>}
            {entry.dates && <Text style={{ fontSize: Math.max(contract.minimumFontSize, fontSize - 0.5), fontWeight: 600 }}>{entry.dates}</Text>}
          </View>
          {entry.subtitle && entry.subtitle.toLowerCase() !== entry.title?.toLowerCase() && (
            <Text style={{ fontSize, fontWeight: 600, marginTop: 1 }}>{entry.subtitle}</Text>
          )}
          {(entry.description || (entry.bullets?.length ?? 0) > 0) && (
            <View style={{ marginTop: 3, width: '100%' }}>
              {renderDescription(entry.description, { fontSize, lineHeight: 1.3 }, '#000000', entry.bullets)}
            </View>
          )}
        </View>
      ))}
    </View>
  )
}

function ContractRegion({
  data,
  contract,
  region,
  sections,
}: {
  data: ImprovedResumeData
  contract: ResumeTemplateContract
  region: ResumeTemplateRegionContract
  sections: DynamicSection[]
}) {
  return (
    <View style={{ width: '100%' }}>
      {contract.identityRegionId === region.id && <IdentityBlock data={data} contract={contract} region={region} />}
      {sections.map((section, index) => (
        <SectionBlock key={`${region.id}-${section.title}-${index}`} section={section} contract={contract} region={region} />
      ))}
    </View>
  )
}

export function ContractTemplate({ data, contract }: { data: ImprovedResumeData; contract: ResumeTemplateContract }) {
  const plan = planResumeTemplateLayout(data, contract)
  const regionPlans = new Map(plan.regions.map((item) => [item.region.id, item]))
  const header = contract.regions.find((region) => region.id === contract.identityRegionId && region.role === 'header')
  const fullWidth = contract.regions.filter((region) => region.role === 'full-width')
  const left = contract.regions.find((region) => region.column === 1)
  const right = contract.regions.find((region) => region.column === 2)
  const main = contract.regions.find((region) => region.role === 'primary' && region.column === 0)
  const horizontalPadding = 34

  const renderRegion = (region: ResumeTemplateRegionContract) => {
    const regionPlan = regionPlans.get(region.id)
    return (
      <ContractRegion
        key={region.id}
        data={data}
        contract={contract}
        region={region}
        sections={regionPlan?.sections ?? []}
      />
    )
  }

  return (
    <Document>
      <Page size="A4" style={{ fontFamily: PDF_FONT_FAMILY, color: '#000000', padding: `32 ${horizontalPadding}`, lineHeight: 1.3 }}>
        {header && renderRegion(header)}

        {fullWidth.map(renderRegion)}

        {contract.columnCount === 1 ? (
          main && renderRegion(main)
        ) : (
          <View style={{ flexDirection: 'row', gap: 18, alignItems: 'flex-start' }}>
            {left && (
              <View style={{ width: `${Math.max(18, Math.min(78, left.widthRatio * 94))}%` }}>
                {renderRegion(left)}
              </View>
            )}
            {right && (
              <View style={{ width: `${Math.max(18, Math.min(78, right.widthRatio * 94))}%` }}>
                {renderRegion(right)}
              </View>
            )}
          </View>
        )}

        <Text style={{ position: 'absolute', bottom: 16, right: horizontalPadding, fontSize: 7, color: '#94a3b8' }}>
          Generated by PortfolioPilot
        </Text>
      </Page>
    </Document>
  )
}

export function UploadedContractTemplate({ data }: { data: ImprovedResumeData }) {
  if (!data.templateContract) throw new Error('Uploaded template contract is required')
  return <ContractTemplate data={data} contract={data.templateContract} />
}
