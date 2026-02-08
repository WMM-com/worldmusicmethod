import type { BlogPost, BlogPopularPost, BlogRelatedPost } from './blogTypes';

export const PLACEHOLDER_POST: BlogPost = {
  title: 'The Future of AI in Healthcare: Transforming Patient Care',
  slug: 'future-of-ai-in-healthcare',
  heroImage: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&auto=format',
  excerpt: 'Explore how artificial intelligence is revolutionising the healthcare industry, from diagnostics to personalised treatment plans.',
  content: `
<h2>Introduction</h2>
<p>Artificial intelligence is rapidly transforming the healthcare landscape, offering unprecedented opportunities to improve patient outcomes, streamline operations, and reduce costs. From early disease detection to personalised treatment plans, AI is reshaping how we approach medicine.</p>

<p>In recent years, the convergence of big data, advanced algorithms, and increased computational power has accelerated the adoption of AI across various healthcare domains. This article explores the key areas where AI is making the most significant impact.</p>

<h2>AI-Powered Diagnostics</h2>
<p>One of the most promising applications of AI in healthcare is in diagnostics. Machine learning algorithms can analyse medical images—such as X-rays, MRIs, and CT scans—with remarkable accuracy, often matching or exceeding the performance of experienced radiologists.</p>

<ul>
<li><strong>Medical Imaging:</strong> Deep learning models can detect tumours, fractures, and other abnormalities in medical images with high precision.</li>
<li><strong>Pathology:</strong> AI systems can analyse tissue samples to identify cancerous cells and predict disease progression.</li>
<li><strong>Genomics:</strong> Machine learning helps identify genetic markers associated with specific diseases, enabling earlier intervention.</li>
</ul>

<h2>Personalised Treatment Plans</h2>
<p>AI enables healthcare providers to develop highly personalised treatment plans based on a patient's unique genetic makeup, medical history, and lifestyle factors. This approach, known as precision medicine, is transforming how we treat complex diseases like cancer.</p>

<p>By analysing vast datasets from clinical trials, electronic health records, and genomic databases, AI algorithms can identify the most effective treatments for individual patients, reducing trial-and-error approaches and improving outcomes.</p>

<blockquote>
"AI doesn't replace doctors—it empowers them with tools to make better decisions, faster. The future of medicine is a partnership between human expertise and artificial intelligence."
</blockquote>

<h2>Streamlining Operations</h2>
<p>Beyond clinical applications, AI is also transforming healthcare operations. Predictive analytics can forecast patient admissions, optimise staffing levels, and reduce wait times. Natural language processing helps automate documentation, freeing clinicians to spend more time with patients.</p>

<h3>Key Operational Benefits</h3>
<ul>
<li>Reduced administrative burden through automated documentation</li>
<li>Improved resource allocation with predictive scheduling</li>
<li>Enhanced supply chain management for medical supplies</li>
<li>Better fraud detection in insurance claims processing</li>
</ul>

<h2>Challenges and Considerations</h2>
<p>While the potential of AI in healthcare is immense, there are important challenges to address. Data privacy, algorithmic bias, regulatory compliance, and the need for transparent, explainable AI systems are all critical considerations as the industry moves forward.</p>

<p>Healthcare organisations must also invest in training their workforce to effectively use AI tools, ensuring that technology augments rather than replaces the human touch that is so essential to patient care.</p>

<h2>Looking Ahead</h2>
<p>The future of AI in healthcare is bright. As technology continues to evolve and datasets grow, we can expect even more transformative applications—from AI-assisted surgery to virtual health assistants that provide round-the-clock patient support. The key will be ensuring that these advances are implemented responsibly, with patient welfare always at the centre.</p>
  `,
  author: {
    name: 'Dr. Sarah Chen',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format',
  },
  date: '2026-02-05',
  readTime: '8 min read',
  categories: ['AI', 'Healthcare', 'Technology'],
};

export const PLACEHOLDER_POPULAR: BlogPopularPost[] = [
  {
    title: '5 Breakthroughs in Quantum Computing This Year',
    slug: 'quantum-computing-breakthroughs',
    thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=200&auto=format',
    date: '2026-01-28',
  },
  {
    title: 'How Blockchain Is Reshaping Supply Chains',
    slug: 'blockchain-supply-chains',
    thumbnail: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=200&auto=format',
    date: '2026-01-20',
  },
  {
    title: 'The Rise of Edge Computing in IoT',
    slug: 'edge-computing-iot',
    thumbnail: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=200&auto=format',
    date: '2026-01-15',
  },
];

export const PLACEHOLDER_RELATED: BlogRelatedPost[] = [
  {
    title: 'Machine Learning Models for Drug Discovery',
    slug: 'ml-drug-discovery',
    image: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400&auto=format',
    excerpt: 'How pharmaceutical companies are leveraging ML to accelerate the drug discovery pipeline and reduce costs.',
    readTime: '6 min read',
  },
  {
    title: 'Wearable Tech: The Next Frontier in Health Monitoring',
    slug: 'wearable-tech-health',
    image: 'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=400&auto=format',
    excerpt: 'From smartwatches to biosensors, wearable technology is giving patients and doctors real-time health insights.',
    readTime: '5 min read',
  },
  {
    title: 'Ethical AI: Building Trust in Healthcare Systems',
    slug: 'ethical-ai-healthcare',
    image: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400&auto=format',
    excerpt: 'Addressing bias, transparency, and accountability in AI systems used for critical healthcare decisions.',
    readTime: '7 min read',
  },
];

export const PLACEHOLDER_CATEGORIES = [
  'AI', 'Healthcare', 'Technology', 'Machine Learning', 'Innovation', 'Data Science', 'Robotics', 'Biotech',
];
