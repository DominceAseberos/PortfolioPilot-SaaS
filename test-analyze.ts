import { portfolioService } from './src/features/reviews/services/portfolio.service';
portfolioService.analyze('https://dominceaseberos.tech').then(r => console.log(JSON.stringify(r, null, 2))).catch(console.error);
