import React from 'react'
import { Document, Link, Page, Text, View } from '@react-pdf/renderer'
import type { DynamicSection, ImprovedResumeData } from '@/types/resume'
import type { ResumeTemplateContract, ResumeTemplateRegionContract } from '@/types/resume-template-contract'
import { planResumeTemplateLayout } from '@/features/resume/services/resume-template-layout-plan.service'
import { getPrimaryResumeRole } from '@/features/resume/services/resume-template-allocation.service'
import { renderDescription } from './pdfUtils'
import { PDF_FONT_FAMILY } from './fonts'

function contractFontFamily(contract: ResumeTemplateContract): string {
  if (contract.style?.fontClass === 'serif') return 'Times-Roman'
  if (contract.style?.fontClass === 'mono') return 'Courier'
  return PDF_FONT_FAMILY
}

function regionBackground(contract: ResumeTemplateContract, region: ResumeTemplateRegionContract) {
  const backgrounds = contract.graphics?.backgroundRegions ?? []
  if (region.role === 'header') {
    return backgrounds.find((background) => background.topRatio <= 0.08 && background.widthRatio >= 0.65 && background.heightRatio <= 0.35)
  }
  if (region.column === 1) {
    return backgrounds.find((background) => background.xRatio <= 0.12 && background.widthRatio <= 0.6 && background.heightRatio >= 0.45)
  }
  if (region.column === 2) {
    return backgrounds.find((background) => background.xRatio + background.widthRatio >= 0.88 && background.widthRatio <= 0.6 && background.heightRatio >= 0.45)
  }
  return undefined
}

function regionColors(contract: ResumeTemplateContract, region: ResumeTemplateRegionContract) {
  const background = regionBackground(contract, region)
  const body = background?.textColor ?? contract.graphics?.bodyTextColor ?? '#000000'
  const accent = background?.textColor ?? contract.graphics?.accentTextColor ?? body
  const divider = background?.textColor ?? contract.graphics?.dividerColor ?? '#94a3b8'
  return { body, accent, divider }
}

function regionFontSize(contract: ResumeTemplateContract, region: ResumeTemplateRegionContract): number {
  const widthAdjustment = region.widthRatio < 0.45 ? -0.25 : 0
  const bodySize = contract.style?.bodyFontSize ?? 9.5
  return Math.max(contract.minimumFontSize, bodySize + widthAdjustment)
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
  const nameFontSize = contract.style?.nameFontSize ?? fontSize + (narrow ? 8 : 12)
  const lineHeight = contract.style?.lineHeight ?? 1.3
  const textAlign = contract.style?.headerAlignment ?? 'left'
  const colors = regionColors(contract, region)
  const contacts = [data.email, data.phone, data.location, data.linkedin, data.github, data.website]
    .filter((value): value is string => Boolean(value?.trim()))
    .map((value) => value.replace(/^https?:\/\//, ''))
  const role = getPrimaryResumeRole(data)

  return (
    <View style={{ marginBottom: narrow ? 16 : 20, textAlign }}>
      <Text style={{ fontSize: nameFontSize, fontWeight: 700, lineHeight: 1.08, marginBottom: 5, color: colors.body }}>
        {data.name || 'Your Name'}
      </Text>
      {role && <Text style={{ fontSize, fontWeight: 600, marginBottom: 8, lineHeight, color: colors.body }}>{role}</Text>}
      {narrow
        ? contacts.map((contact, index) => (
          <Text key={`${contact}-${index}`} style={{ fontSize: Math.max(contract.minimumFontSize, fontSize - 0.25), marginBottom: 3, color: colors.body }}>
            {contact}
          </Text>
        ))
        : contacts.length > 0 && (
          <Text style={{ fontSize: Math.max(contract.minimumFontSize, fontSize - 0.25), lineHeight: 1.25, color: colors.body }}>
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
  const headingSize = contract.style?.headingFontSize ?? fontSize + 1.5
  const lineHeight = contract.style?.lineHeight ?? 1.3
  const sectionGap = contract.style?.sectionGap ?? 12
  const colors = regionColors(contract, region)
  const dividerWidth = contract.graphics?.dividerWidth != null
    ? Math.max(0.25, contract.graphics.dividerWidth / 2)
    : 0.6

  return (
    <View style={{ marginBottom: sectionGap, width: '100%' }}>
      <Text
        minPresenceAhead={28}
        style={{ fontSize: headingSize, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4, color: colors.accent }}
      >
        {section.title}
      </Text>
      <View style={{ borderBottomWidth: dividerWidth, borderBottomColor: colors.divider, marginBottom: 7 }} />

      {section.type === 'text' && section.text && (
        <Text style={{ fontSize, lineHeight, color: colors.body }}>{section.text}</Text>
      )}

      {section.type === 'list' && section.items && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
          {section.items.map((item, index) => (
            <Text
              key={`${item}-${index}`}
              style={{ fontSize: Math.max(contract.minimumFontSize, fontSize - 0.25), padding: '2 5', borderWidth: 0.4, borderColor: colors.divider, borderRadius: 3, color: colors.body }}
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
              ? <Link src={entry.link} style={{ fontSize: fontSize + 0.5, fontWeight: 700, textDecoration: 'none', color: colors.accent }}>{entry.title}</Link>
              : <Text style={{ fontSize: fontSize + 0.5, fontWeight: 700, color: colors.body }}>{entry.title || 'Title'}</Text>}
            {entry.dates && <Text style={{ fontSize: Math.max(contract.minimumFontSize, fontSize - 0.5), fontWeight: 600, color: colors.body }}>{entry.dates}</Text>}
          </View>
          {entry.subtitle && entry.subtitle.toLowerCase() !== entry.title?.toLowerCase() && (
            <Text style={{ fontSize, fontWeight: 600, marginTop: 1, color: colors.body }}>{entry.subtitle}</Text>
          )}
          {(entry.description || (entry.bullets?.length ?? 0) > 0) && (
            <View style={{ marginTop: 3, width: '100%' }}>
              {renderDescription(entry.description, { fontSize, lineHeight, color: colors.body }, colors.body, entry.bullets)}
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
  const pageStyle = contract.style
  const graphics = contract.graphics
  const horizontalPadding = pageStyle?.margins.right ?? 34
  const pageSize: [number, number] = pageStyle
    ? [pageStyle.pageWidth, pageStyle.pageHeight]
    : [595.28, 841.89]
  const pagePadding = pageStyle
    ? `${pageStyle.margins.top} ${pageStyle.margins.right} ${pageStyle.margins.bottom} ${pageStyle.margins.left}`
    : `32 ${horizontalPadding}`

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
      <Page size={pageSize} style={{ fontFamily: contractFontFamily(contract), color: graphics?.bodyTextColor ?? '#000000', padding: pagePadding, lineHeight: pageStyle?.lineHeight ?? 1.3 }}>
        {graphics?.backgroundRegions.map((background, index) => (
          <View
            fixed={background.heightRatio >= 0.8}
            key={`background-${index}`}
            style={{
              position: 'absolute',
              left: background.xRatio * pageSize[0],
              top: background.topRatio * pageSize[1],
              width: background.widthRatio * pageSize[0],
              height: background.heightRatio * pageSize[1],
              backgroundColor: background.color,
            }}
          />
        ))}
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
