/**
 * TF-IDF based skill extraction service
 * Matches resume text against a curated taxonomy of 200+ skills
 */

// Comprehensive skill taxonomy organized by category
const SKILL_TAXONOMY = {
  'Programming Languages': [
    'javascript', 'python', 'java', 'c++', 'c#', 'typescript', 'ruby', 'go', 'golang',
    'rust', 'swift', 'kotlin', 'php', 'scala', 'r', 'matlab', 'perl', 'dart', 'lua',
    'objective-c', 'assembly', 'fortran', 'haskell', 'elixir', 'clojure', 'groovy',
  ],
  'Frontend': [
    'react', 'reactjs', 'react.js', 'angular', 'vue', 'vuejs', 'vue.js', 'svelte',
    'next.js', 'nextjs', 'nuxt', 'gatsby', 'html', 'html5', 'css', 'css3', 'sass',
    'scss', 'less', 'tailwind', 'tailwindcss', 'bootstrap', 'material-ui', 'mui',
    'chakra', 'styled-components', 'webpack', 'vite', 'babel', 'jquery', 'redux',
    'zustand', 'mobx', 'pinia', 'framer-motion', 'three.js', 'webgl',
  ],
  'Backend': [
    'node.js', 'nodejs', 'express', 'express.js', 'django', 'flask', 'fastapi',
    'spring', 'spring boot', 'asp.net', '.net', 'rails', 'ruby on rails', 'laravel',
    'nest.js', 'nestjs', 'koa', 'hapi', 'gin', 'echo', 'fiber', 'actix',
    'graphql', 'rest', 'restful', 'api', 'microservices', 'grpc', 'websocket',
  ],
  'Database': [
    'sql', 'mysql', 'postgresql', 'postgres', 'mongodb', 'redis', 'sqlite',
    'oracle', 'dynamodb', 'cassandra', 'couchdb', 'neo4j', 'elasticsearch',
    'firebase', 'firestore', 'supabase', 'prisma', 'sequelize', 'mongoose',
    'typeorm', 'knex', 'drizzle',
  ],
  'Cloud & DevOps': [
    'aws', 'amazon web services', 'azure', 'gcp', 'google cloud', 'docker',
    'kubernetes', 'k8s', 'terraform', 'ansible', 'jenkins', 'ci/cd', 'github actions',
    'gitlab ci', 'circleci', 'travis ci', 'nginx', 'apache', 'linux', 'ubuntu',
    'bash', 'shell', 'powershell', 'heroku', 'vercel', 'netlify', 'digitalocean',
    'cloudflare', 'serverless', 'lambda', 'ecs', 'ec2', 's3',
  ],
  'Data Science & AI': [
    'machine learning', 'deep learning', 'artificial intelligence', 'ai', 'ml',
    'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'sklearn', 'pandas', 'numpy',
    'scipy', 'matplotlib', 'seaborn', 'plotly', 'jupyter', 'nlp',
    'natural language processing', 'computer vision', 'opencv', 'neural network',
    'regression', 'classification', 'clustering', 'reinforcement learning',
    'data mining', 'data analysis', 'data visualization', 'tableau', 'power bi',
    'apache spark', 'hadoop', 'airflow', 'etl', 'data pipeline',
    'generative ai', 'llm', 'large language model', 'transformers', 'hugging face',
    'langchain', 'rag', 'fine-tuning', 'prompt engineering',
  ],
  'Mobile': [
    'react native', 'flutter', 'swift', 'swiftui', 'kotlin', 'android',
    'ios', 'xamarin', 'ionic', 'cordova', 'expo', 'mobile development',
  ],
  'Testing': [
    'jest', 'mocha', 'chai', 'cypress', 'selenium', 'playwright', 'puppeteer',
    'testing library', 'react testing library', 'junit', 'pytest', 'unittest',
    'e2e', 'unit testing', 'integration testing', 'tdd', 'bdd', 'qa',
  ],
  'Tools & Practices': [
    'git', 'github', 'gitlab', 'bitbucket', 'jira', 'confluence', 'trello',
    'slack', 'figma', 'sketch', 'adobe xd', 'photoshop', 'illustrator',
    'agile', 'scrum', 'kanban', 'waterfall', 'devops', 'pair programming',
    'code review', 'design patterns', 'solid', 'clean code', 'refactoring',
    'version control', 'postman', 'swagger', 'openapi',
  ],
  'Soft Skills': [
    'leadership', 'communication', 'teamwork', 'problem solving', 'critical thinking',
    'time management', 'project management', 'mentoring', 'presentation',
    'negotiation', 'adaptability', 'creativity', 'collaboration', 'decision making',
    'strategic planning', 'stakeholder management', 'client relations',
  ],
  'Security': [
    'cybersecurity', 'penetration testing', 'oauth', 'jwt', 'encryption',
    'ssl', 'tls', 'https', 'owasp', 'vulnerability assessment', 'soc2',
    'gdpr', 'compliance', 'authentication', 'authorization', 'rbac',
  ],
};

/**
 * Calculate TF (Term Frequency) for a term in a document
 */
function calculateTF(term, words) {
  const termLower = term.toLowerCase();
  const count = words.filter(w => w === termLower).length;
  return count / words.length;
}

/**
 * Calculate IDF-like importance score based on skill specificity
 * More specific/rare skills get higher scores
 */
function calculateImportance(skill) {
  const commonWords = ['html', 'css', 'git', 'sql', 'api', 'linux'];
  const midWords = ['javascript', 'python', 'react', 'node.js', 'docker', 'aws'];
  
  if (commonWords.includes(skill.toLowerCase())) return 1.0;
  if (midWords.includes(skill.toLowerCase())) return 1.5;
  return 2.0; // More specific skills get higher weight
}

/**
 * Extract skills from resume text using TF-IDF matching
 */
function extractSkills(text) {
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/[\s,;:.()\[\]{}/\\|]+/).filter(w => w.length > 1);
  
  const foundSkills = [];
  const skillCategories = {};

  for (const [category, skills] of Object.entries(SKILL_TAXONOMY)) {
    const categoryMatches = [];

    for (const skill of skills) {
      const skillLower = skill.toLowerCase();
      
      // Check for exact match in text (handles multi-word skills)
      let found = false;
      if (skill.includes(' ') || skill.includes('.') || skill.includes('/')) {
        // Multi-word or special character skills — search in full text
        found = lowerText.includes(skillLower);
      } else {
        // Single-word skills — check with word boundaries
        const regex = new RegExp(`\\b${skillLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        found = regex.test(lowerText);
      }

      if (found) {
        const tf = calculateTF(skillLower, words) || 0.001; // minimum score for found skills
        const importance = calculateImportance(skill);
        const score = Math.min(Math.round(tf * importance * 10000) / 100, 100);

        // Normalize skill name for display
        const displayName = normalizeSkillName(skill);

        // Avoid duplicate entries (e.g., "react" and "reactjs")
        if (!foundSkills.find(s => s.name === displayName)) {
          foundSkills.push({
            name: displayName,
            category,
            score: Math.max(score, 1), // minimum score of 1
            frequency: (lowerText.match(new RegExp(skillLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length,
          });
          categoryMatches.push(displayName);
        }
      }
    }

    if (categoryMatches.length > 0) {
      skillCategories[category] = categoryMatches;
    }
  }

  // Sort by score (descending)
  foundSkills.sort((a, b) => b.score - a.score);

  return {
    skills: foundSkills,
    skillCategories,
    totalSkillsFound: foundSkills.length,
    topSkills: foundSkills.slice(0, 10).map(s => s.name),
  };
}

/**
 * Normalize skill names for consistent display
 */
function normalizeSkillName(skill) {
  const nameMap = {
    'reactjs': 'React',
    'react.js': 'React',
    'react': 'React',
    'vuejs': 'Vue.js',
    'vue.js': 'Vue.js',
    'vue': 'Vue.js',
    'nodejs': 'Node.js',
    'node.js': 'Node.js',
    'nextjs': 'Next.js',
    'next.js': 'Next.js',
    'nestjs': 'NestJS',
    'nest.js': 'NestJS',
    'express.js': 'Express',
    'express': 'Express',
    'tailwindcss': 'Tailwind CSS',
    'tailwind': 'Tailwind CSS',
    'postgresql': 'PostgreSQL',
    'postgres': 'PostgreSQL',
    'mongodb': 'MongoDB',
    'mysql': 'MySQL',
    'sqlite': 'SQLite',
    'typescript': 'TypeScript',
    'javascript': 'JavaScript',
    'python': 'Python',
    'golang': 'Go',
    'go': 'Go',
    'c++': 'C++',
    'c#': 'C#',
    'html5': 'HTML5',
    'html': 'HTML',
    'css3': 'CSS3',
    'css': 'CSS',
    'sass': 'Sass',
    'scss': 'SCSS',
    'graphql': 'GraphQL',
    'rest': 'REST',
    'restful': 'RESTful APIs',
    'aws': 'AWS',
    'gcp': 'Google Cloud',
    'google cloud': 'Google Cloud',
    'amazon web services': 'AWS',
    'docker': 'Docker',
    'kubernetes': 'Kubernetes',
    'k8s': 'Kubernetes',
    'ci/cd': 'CI/CD',
    'github actions': 'GitHub Actions',
    'machine learning': 'Machine Learning',
    'deep learning': 'Deep Learning',
    'artificial intelligence': 'AI',
    'natural language processing': 'NLP',
    'computer vision': 'Computer Vision',
    'react native': 'React Native',
    'flutter': 'Flutter',
    'ios': 'iOS',
    'android': 'Android',
    'agile': 'Agile',
    'scrum': 'Scrum',
    'figma': 'Figma',
    'git': 'Git',
    'github': 'GitHub',
    'gitlab': 'GitLab',
  };

  return nameMap[skill.toLowerCase()] || skill.charAt(0).toUpperCase() + skill.slice(1);
}

module.exports = { extractSkills, SKILL_TAXONOMY };
