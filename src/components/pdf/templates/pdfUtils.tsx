import React from 'react'
import { Text, View, StyleSheet } from '@react-pdf/renderer'

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

  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean)
  
  return lines.map((line, i) => {
    // Check if line is a bullet point
    const isBullet = /^[•\-\*]\s*/.test(line)
    
    if (isBullet) {
      const cleanLine = line.replace(/^[•\-\*]\s*/, '')
      return (
        <View key={i} style={utilStyles.bulletRow} wrap={false}>
          <Text style={[{ color: bulletColor }, textStyle, utilStyles.bulletPoint]}>•</Text>
          <Text style={[textStyle, utilStyles.bulletContent]}>{cleanLine}</Text>
        </View>
      )
    }
    
    return (
      <Text key={i} style={[textStyle, utilStyles.paragraph]} wrap={false}>
        {line}
      </Text>
    )
  })
}
