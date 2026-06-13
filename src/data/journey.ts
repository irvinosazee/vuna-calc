// ─────────────────────────────────────────────────────────────────────
// Veritas Journey — single source of truth for ALL site content.
// Edit this file to update courses, story beats, or theme colors.
// ─────────────────────────────────────────────────────────────────────

export interface Course {
  code: string;
  title: string;
  units: number;
  /** One plain-English line shown in the guided ticker — edit freely. */
  about: string;
}

export interface Semester {
  name: 'First Semester' | 'Second Semester';
  session: string;
  courses: Course[];
}

export interface Level {
  level: 100 | 200 | 300 | 400;
  semesters: [Semester, Semester];
}

export interface IntroBeat {
  title: string;
  text: string;
}

export const student = {
  name: 'Irvin  Uyi Osazee',
  matric: 'VUG/SEN/22/8386',
  programme: 'Software Engineering',
  university: 'Veritas University, Abuja',
};

export const introBeats: IntroBeat[] = [
  { title: '2022', text: 'A seed lands in Abuja…' },
  { title: student.name, text: `${student.matric} · ${student.programme} · ${student.university}` },
  { title: 'It takes a man', text: 'Scroll to grow the tree — four levels, eight semesters, 79 courses.' },
];

export const theme = {
  background: '#0a2e1d',
  trunk: '#3a6b3f',
  // Fog tint sits mid-way up the CSS sky gradient so fogged geometry blends
  // against both the dark ground and the mint canopy (canvas is alpha-composited).
  fog: { color: '#16573a', density: 0.02 },
  particles: { desktop: 240, mobile: 80 },
  families: {
    SEN: '#34d399', // software engineering — bright emerald
    GST: '#a3e635', // general studies — lime
    MTH: '#2dd4bf', // mathematics — teal
    SCI: '#5eead4', // physics & statistics — light teal
    LAB: '#f0e68c', // labs, SIWES, practicum — gold-green
  },
  sky: {
    day: {
      grad: ['#061f13', '#0a2e1d', '#16573a', '#2c8a5b'],
      fog: '#16573a',
      hemiSky: '#bdf5d3', hemiGround: '#06281a', hemiInt: 2.2,
      sun: '#eafff2', sunInt: 2.2,
      fly: '#c8f96e', flyOpacity: 0.85, flySize: 0.18,
      star: 0,
    },
    night: {
      grad: ['#05060f', '#0a0e2a', '#141a3a', '#20264f'],
      fog: '#0a0e2a',
      hemiSky: '#2a3470', hemiGround: '#05060f', hemiInt: 0.7,
      sun: '#9fb3ff', sunInt: 0.5,
      fly: '#dcff9e', flyOpacity: 1, flySize: 0.32,
      star: 0.9,
    },
  },
} as const;

export type Family = keyof typeof theme.families;

export function courseFamily(code: string): Family {
  if (/^SEN[1-4]8[12]$/.test(code) || /^SEN[123]90$/.test(code)) return 'LAB';
  if (code.startsWith('SEN')) return 'SEN';
  if (code.startsWith('GST')) return 'GST';
  if (code.startsWith('MTH')) return 'MTH';
  return 'SCI';
}

export const levels: Level[] = [
  {
    level: 100,
    semesters: [
      {
        name: 'First Semester',
        session: '2022/2023',
        courses: [
          { code: 'GST111', title: 'Communication in English I', units: 2, about: 'Foundations of clear English — grammar, comprehension, and writing for academic life.' },
          { code: 'GST113', title: 'Nigerian People and Culture', units: 2, about: "Nigeria's peoples, cultures, and national identity — where the country's story comes from." },
          { code: 'GST115', title: 'History and Philosophy Of Science', units: 2, about: 'How science grew from early thinkers to today, and the big questions behind it.' },
          { code: 'GST121', title: 'Use of Library, Study Skills and ICT', units: 2, about: 'Finding, evaluating, and managing information — research and study skills with ICT tools.' },
          { code: 'GST171', title: 'Ethics', units: 0, about: 'Right and wrong in personal and professional life — moral reasoning in practice.' },
          { code: 'MTH101', title: 'Elementary Mathematics I', units: 2, about: 'Sets, algebra, and functions — the maths toolkit everything else builds on.' },
          { code: 'PHY101', title: 'General Physics I', units: 2, about: 'Mechanics — motion, forces, energy, and momentum in the physical world.' },
          { code: 'PHY107', title: 'General Practical Physics I', units: 1, about: 'Hands-on lab work measuring and verifying the physics from PHY101.' },
          { code: 'SEN101', title: 'Introduction to Computing and Applications', units: 3, about: 'First tour of computing — how computers work and what you can build with them.' },
          { code: 'SEN103', title: 'Interaction Design and Usability Engineering', units: 3, about: 'Designing software people can actually use — interfaces, usability, and human factors.' },
          { code: 'SEN105', title: 'Introduction to Software Engineering', units: 3, about: 'What software engineering is — the discipline, lifecycle, and craft of building software.' },
          { code: 'SEN181', title: 'Software Engineering Lab I', units: 2, about: 'Practical lab — first programs, tools, and computing exercises.' },
        ],
      },
      {
        name: 'Second Semester',
        session: '2022/2023',
        courses: [
          { code: 'GST112', title: 'Communication in English II', units: 2, about: 'Advanced English communication — essays, reports, and confident presentation.' },
          { code: 'GST122', title: 'Logic, Philosophy, and Human Existence', units: 2, about: "Thinking about thinking — logic, arguments, and life's big philosophical questions." },
          { code: 'GST124', title: 'Communication in French', units: 2, about: 'Everyday French — basic vocabulary, grammar, and conversation.' },
          { code: 'GST142', title: 'Community Service', units: 1, about: 'Giving back — organized service projects in the local community.' },
          { code: 'MTH102', title: 'General Mathematics II', units: 3, about: 'Calculus begins — limits, differentiation, and integration.' },
          { code: 'PHY102', title: 'General Physics II', units: 2, about: 'Electricity and magnetism — fields, circuits, and electromagnetic waves.' },
          { code: 'PHY108', title: 'General Practical Physics II', units: 1, about: 'Lab experiments in electricity and magnetism.' },
          { code: 'SEN102', title: 'Principles of Programming I', units: 2, about: 'First real programming — variables, control flow, functions, and problem solving in code.' },
          { code: 'SEN104', title: 'Introduction to Web Technologies', units: 2, about: 'How the web works — HTML, CSS, and your first web pages.' },
          { code: 'SEN106', title: 'User Experience Design and Evaluation', units: 2, about: 'Crafting and testing user experiences — prototypes, evaluation, and design thinking.' },
          { code: 'SEN108', title: 'Logic and its Application in Computer Science', units: 2, about: 'Propositional and predicate logic — the formal reasoning behind computing.' },
          { code: 'SEN182', title: 'Software Engineering Lab II', units: 2, about: "Practical lab — programming and web exercises building on the semester's courses." },
          { code: 'SEN190', title: 'Practicum', units: 1, about: 'Supervised hands-on practice applying first-year skills.' },
        ],
      },
    ],
  },
  {
    level: 200,
    semesters: [
      {
        name: 'First Semester',
        session: '2023/2024',
        courses: [
          { code: 'GST211', title: 'Basic Spiritual Theology', units: 0, about: 'Foundations of Christian spiritual thought and practice.' },
          { code: 'GST221', title: 'Peace Studies and Conflict Resolution', units: 2, about: 'Understanding conflict and the skills to resolve it peacefully.' },
          { code: 'GST223', title: 'Introduction to Entrepreneurship', units: 2, about: 'Spotting opportunities and thinking like an entrepreneur.' },
          { code: 'MTH203', title: 'Linear Algebra I', units: 2, about: 'Vectors, matrices, and linear systems — the maths behind graphics and machine learning.' },
          { code: 'SEN201', title: 'Discrete Structures', units: 3, about: 'Sets, relations, graphs, and combinatorics — the maths of computer science.' },
          { code: 'SEN203', title: 'Software Requirements and Design', units: 2, about: 'Turning fuzzy ideas into precise requirements and solid designs.' },
          { code: 'SEN205', title: 'Computer Architecture Organisation', units: 3, about: 'Inside the machine — CPUs, memory, and how hardware executes your code.' },
          { code: 'SEN207', title: 'Data Structures and Algorithms', units: 3, about: 'How to organize data and design fast algorithms — lists, trees, sorting, searching.' },
          { code: 'SEN209', title: 'Information Architecture', units: 2, about: 'Structuring information so people can find and understand it.' },
          { code: 'SEN281', title: 'Software Engineering Lab III', units: 2, about: 'Practical lab — data structures and design exercises.' },
        ],
      },
      {
        name: 'Second Semester',
        session: '2023/2024',
        courses: [
          { code: 'GST272', title: 'Social Teachings of the Church', units: 0, about: 'Catholic social thought — justice, dignity, and the common good.' },
          { code: 'SEN202', title: 'Principles of programming II', units: 3, about: 'Deeper programming — objects, recursion, and larger program design.' },
          { code: 'SEN204', title: 'Software Construction', units: 2, about: 'Writing real software well — coding standards, debugging, and building to spec.' },
          { code: 'SEN206', title: 'Design and Analysis of Computer Algorithms', units: 2, about: 'Why algorithms are fast or slow — complexity analysis and design strategies.' },
          { code: 'SEN208', title: 'Principles of Operating Systems', units: 2, about: 'How operating systems juggle processes, memory, and files under the hood.' },
          { code: 'SEN210', title: 'Software Engineering Process', units: 2, about: 'The processes teams use to ship software — agile, plans, and quality gates.' },
          { code: 'SEN212', title: 'Information Visualization', units: 2, about: 'Turning data into visuals people can read at a glance.' },
          { code: 'SEN214', title: 'Microcontroller Programming', units: 2, about: 'Programming tiny computers — embedded systems and hardware control.' },
          { code: 'SEN282', title: 'Software Engineering Lab IV', units: 2, about: 'Practical lab — algorithms, operating systems, and construction exercises.' },
          { code: 'SEN290', title: 'SIWES I', units: 3, about: 'First industrial attachment — real work experience in the field.' },
        ],
      },
    ],
  },
  {
    level: 300,
    semesters: [
      {
        name: 'First Semester',
        session: '2024/2025',
        courses: [
          { code: 'GST311', title: 'Introduction to Entrepreneurship Studies', units: 2, about: 'Building a venture — business models, planning, and startup basics.' },
          { code: 'SEN301', title: 'Object-Oriented Analysis and Design', units: 3, about: 'Modeling systems with objects — UML, patterns, and object-oriented design.' },
          { code: 'SEN303', title: 'Programmable Logic Controller Programming', units: 2, about: 'Programming industrial PLCs that run factories and machines.' },
          { code: 'SEN305', title: 'Web Application Development', units: 3, about: 'Full web apps — front end to back end, databases to deployment.' },
          { code: 'SEN307', title: 'Database Systems', units: 3, about: 'Designing and querying databases — ER models, SQL, and normalization.' },
          { code: 'SEN309', title: 'Concept of Programming Language', units: 2, about: 'What makes programming languages tick — syntax, semantics, and paradigms compared.' },
          { code: 'SEN381', title: 'Software Engineering Lab V', units: 2, about: 'Practical lab — web, database, and object-oriented design projects.' },
          { code: 'STA343', title: 'Operation Research I', units: 3, about: 'Optimizing decisions mathematically — linear programming and modeling.' },
        ],
      },
      {
        name: 'Second Semester',
        session: '2024/2025',
        courses: [
          { code: 'SEN302', title: 'Software Configuration Management & Maintenance', units: 2, about: 'Versioning, releases, and keeping software healthy after launch.' },
          { code: 'SEN304', title: 'Software Engineering Project Management', units: 2, about: 'Planning, estimating, and leading software projects.' },
          { code: 'SEN306', title: 'Research Methodology', units: 1, about: 'How to do and write up research — methods, sources, and rigor.' },
          { code: 'SEN308', title: 'Software Engineering Professional Practice', units: 2, about: 'Ethics, law, and professionalism for working engineers.' },
          { code: 'SEN310', title: 'Software Engineering Security', units: 2, about: 'Building secure software — threats, vulnerabilities, and defenses.' },
          { code: 'SEN312', title: 'Artificial Intelligence & Expert System', units: 3, about: 'Machines that reason — search, knowledge representation, and expert systems.' },
          { code: 'SEN314', title: 'Engineering Mobile Applications', units: 2, about: 'Designing and building apps for phones and tablets.' },
          { code: 'SEN316', title: 'Software Testing & Quality Assurance', units: 2, about: 'Finding bugs systematically — test design, automation, and quality assurance.' },
          { code: 'SEN382', title: 'Software Engineering Lab VI', units: 2, about: 'Practical lab — testing, security, and mobile projects.' },
          { code: 'SEN390', title: 'SIWES II', units: 3, about: 'Second industrial attachment — longer, deeper industry experience.' },
        ],
      },
    ],
  },
  {
    level: 400,
    semesters: [
      {
        name: 'First Semester',
        session: '2025/2026',
        courses: [
          { code: 'SEN401', title: 'Software Engineering Economics', units: 2, about: 'The money side of software — costs, value, and engineering trade-offs.' },
          { code: 'SEN403', title: 'Human-computer Interaction', units: 2, about: 'How people and computers interact — and how to design for humans.' },
          { code: 'SEN405', title: 'Open-Source Software Development and Applications', units: 2, about: 'Contributing to and building with open-source software.' },
          { code: 'SEN407', title: 'Distributed, Parallel, and Cloud Computing', units: 2, about: 'Computing at scale — distributed systems, parallelism, and the cloud.' },
          { code: 'SEN409', title: 'Software Architecture and Design', units: 2, about: 'The big-picture structure of systems — architectures, styles, and trade-offs.' },
          { code: 'SEN411', title: 'Special Topics in Software Engineering', units: 2, about: 'Emerging topics at the edge of software engineering.' },
          { code: 'SEN413', title: 'Research Seminar', units: 1, about: 'Presenting and defending research — seminar practice for the final project.' },
          { code: 'SEN415', title: 'Visual Design', units: 2, about: 'Visual fundamentals for software — layout, color, and typography.' },
          { code: 'SEN481', title: 'Software Engineering Lab VII', units: 2, about: 'Practical lab — architecture and human-computer interaction projects.' },
        ],
      },
      {
        name: 'Second Semester',
        session: '2025/2026',
        courses: [
          { code: 'SEN402', title: 'Enterprise Application Development', units: 2, about: 'Large-scale business applications — enterprise stacks and integration.' },
          { code: 'SEN404', title: 'Virtual and Augmented Reality', units: 2, about: 'Building immersive virtual and augmented reality experiences.' },
          { code: 'SEN406', title: 'Fault—Tolerant Computing', units: 2, about: 'Systems that survive failure — redundancy, recovery, and reliability.' },
          { code: 'SEN408', title: 'Game Design and Development', units: 2, about: 'Designing and building games — mechanics, engines, and play.' },
          { code: 'SEN410', title: 'Modelling and Computer simulation', units: 2, about: 'Simulating real-world systems with computational models.' },
          { code: 'SEN482', title: 'Software Engineering Lab VIII', units: 2, about: 'The final lab — where this very website was built and deployed.' },
          { code: 'SEN490', title: 'Project', units: 6, about: 'The capstone — a complete software project from idea to defense.' },
        ],
      },
    ],
  },
];

export const allCourses: Course[] = levels.flatMap((l) => l.semesters.flatMap((s) => s.courses));
export const totalUnits: number = allCourses.reduce((sum, c) => sum + c.units, 0);
