import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card'
import { 
  BarChart3, 
  FileSearch, 
  GitBranch, 
  Shield, 
  TrendingUp,
  Target,
} from 'lucide-react'

const features = [
  {
    icon: FileSearch,
    title: 'Portfolio Analysis',
    description: 'Evaluate navigation, responsiveness, project quality, CTAs, and more against industry standards.',
  },
  {
    icon: GitBranch,
    title: 'GitHub Profile Review',
    description: 'Analyze repository quality, READMEs, commit frequency, pinned repos, and project diversity.',
  },
  {
    icon: BarChart3,
    title: 'Resume Scoring',
    description: 'Check ATS compatibility, keyword alignment, formatting, and skills relevance.',
  },
  {
    icon: TrendingUp,
    title: 'Score Trends',
    description: 'Track your improvement over time with detailed score history and progress charts.',
  },
  {
    icon: Target,
    title: 'Role-Specific Feedback',
    description: 'Get tailored recommendations based on your target role and experience level.',
  },
  {
    icon: Shield,
    title: 'Actionable Insights',
    description: 'Receive specific, prioritized recommendations to improve each area of your application.',
  },
]

export function LandingFeatures() {
  return (
    <section id="features" className="border-t bg-muted/50 py-20">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold">Everything You Need to Stand Out</h2>
          <p className="text-muted-foreground mt-4">
            Comprehensive analysis across all the areas recruiters look at
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="border-0 shadow-sm">
              <CardHeader>
                <div className="bg-primary/10 mb-4 flex h-10 w-10 items-center justify-center rounded-lg">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
