import React from 'react'
import { Text, View, StyleSheet } from '@react-pdf/renderer'
import { parseDescriptionBlocks } from '@/features/resume/services/resume-layout.service'

const utilStyles = StyleSheet.create({
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 3,
    alignItems: 'flex-start',
  },
  bulletPoint: {
    width: 10,
    marginTop: -1, // slight optical alignment for bullet
  },
  bulletContent: {
    flex: 1,
  },
  paragraph: {
    marginBottom: 4,
  }
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function renderDescription(text: string | undefined, textStyle?: any, bulletColor: string = '#000000') {
  if (!text) return null

  const blocks = parseDescriptionBlocks(text)
  
  return blocks.map((block, i) => {
    if (block.type === 'bullet') {
      return (
        <View key={i} style={utilStyles.bulletRow} >
          <Text style={[{ color: bulletColor }, textStyle, utilStyles.bulletPoint]}>•</Text>
          <Text style={[textStyle, utilStyles.bulletContent]}>{block.text}</Text>
        </View>
      )
    }
    
    return (
      <Text key={i} style={[textStyle, utilStyles.paragraph]} >
        {block.text}
      </Text>
    )
  })
}
