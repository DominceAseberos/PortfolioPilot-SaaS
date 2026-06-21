import { generateRepoSummaries } from './src/features/ai/services/ai.service';

async function run() {
  const repos = [
    {
      name: "Catsy-Modeling-Simulation",
      description: "JavaScript project with 2 stars",
      language: "JavaScript",
      readmeSummary: "Catsy is a robust simulation tool for..."
    },
    {
      name: "github-universe",
      description: "https://gremote-universe.vercel.app/",
      language: "TypeScript",
      readmeSummary: "Welcome to Github Universe..."
    }
  ];
  
  console.log('Running AI summary...');
  const res = await generateRepoSummaries(repos);
  console.log('Result:', JSON.stringify(res, null, 2));
}

run().catch(console.error);
