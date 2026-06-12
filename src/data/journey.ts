// ─────────────────────────────────────────────────────────────────────
// Veritas Journey — single source of truth for ALL site content.
// Edit this file to update courses, story beats, or theme colors.
// ─────────────────────────────────────────────────────────────────────

export interface Course {
  code: string;
  title: string;
  units: number;
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
  name: 'Irvin Ogbemudia Uyi Osazee',
  matric: 'VUG/SEN/22/8386',
  programme: 'Software Engineering',
  university: 'Veritas University, Abuja',
};

export const introBeats: IntroBeat[] = [
  { title: '2022', text: 'A seed lands in Abuja…' },
  { title: student.name, text: `${student.matric} · ${student.programme} · ${student.university}` },
  { title: 'It takes root', text: 'Scroll to grow the tree — four levels, eight semesters, 79 courses.' },
];

export const theme = {
  background: '#0a2e1d',
  trunk: '#3a6b3f',
  fog: { color: '#0a2e1d', density: 0.026 },
  particles: { desktop: 240, mobile: 80 },
  families: {
    SEN: '#34d399', // software engineering — bright emerald
    GST: '#a3e635', // general studies — lime
    MTH: '#2dd4bf', // mathematics — teal
    SCI: '#5eead4', // physics & statistics — light teal
    LAB: '#f0e68c', // labs, SIWES, practicum — gold-green
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
          { code: 'GST111', title: 'Communication in English I', units: 2 },
          { code: 'GST113', title: 'Nigerian People and Culture', units: 2 },
          { code: 'GST115', title: 'History and Philosophy Of Science', units: 2 },
          { code: 'GST121', title: 'Use of Library, Study Skills and ICT', units: 2 },
          { code: 'GST171', title: 'Ethics', units: 0 },
          { code: 'MTH101', title: 'Elementary Mathematics I', units: 2 },
          { code: 'PHY101', title: 'General Physics I', units: 2 },
          { code: 'PHY107', title: 'General Practical Physics I', units: 1 },
          { code: 'SEN101', title: 'Introduction to Computing and Applications', units: 3 },
          { code: 'SEN103', title: 'Interaction Design and Usability Engineering', units: 3 },
          { code: 'SEN105', title: 'Introduction to Software Engineering', units: 3 },
          { code: 'SEN181', title: 'Software Engineering Lab I', units: 2 },
        ],
      },
      {
        name: 'Second Semester',
        session: '2022/2023',
        courses: [
          { code: 'GST112', title: 'Communication in English II', units: 2 },
          { code: 'GST122', title: 'Logic, Philosophy, and Human Existence', units: 2 },
          { code: 'GST124', title: 'Communication in French', units: 2 },
          { code: 'GST142', title: 'Community Service', units: 1 },
          { code: 'MTH102', title: 'General Mathematics II', units: 3 },
          { code: 'PHY102', title: 'General Physics II', units: 2 },
          { code: 'PHY108', title: 'General Practical Physics II', units: 1 },
          { code: 'SEN102', title: 'Principles of Programming I', units: 2 },
          { code: 'SEN104', title: 'Introduction to Web Technologies', units: 2 },
          { code: 'SEN106', title: 'User Experience Design and Evaluation', units: 2 },
          { code: 'SEN108', title: 'Logic and its Application in Computer Science', units: 2 },
          { code: 'SEN182', title: 'Software Engineering Lab II', units: 2 },
          { code: 'SEN190', title: 'Practicum', units: 1 },
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
          { code: 'GST211', title: 'Basic Spiritual Theology', units: 0 },
          { code: 'GST221', title: 'Peace Studies and Conflict Resolution', units: 2 },
          { code: 'GST223', title: 'Introduction to Entrepreneurship', units: 2 },
          { code: 'MTH203', title: 'Linear Algebra I', units: 2 },
          { code: 'SEN201', title: 'Discrete Structures', units: 3 },
          { code: 'SEN203', title: 'Software Requirements and Design', units: 2 },
          { code: 'SEN205', title: 'Computer Architecture Organisation', units: 3 },
          { code: 'SEN207', title: 'Data Structures and Algorithms', units: 3 },
          { code: 'SEN209', title: 'Information Architecture', units: 2 },
          { code: 'SEN281', title: 'Software Engineering Lab III', units: 2 },
        ],
      },
      {
        name: 'Second Semester',
        session: '2023/2024',
        courses: [
          { code: 'GST272', title: 'Social Teachings of the Church', units: 0 },
          { code: 'SEN202', title: 'Principles of programming II', units: 3 },
          { code: 'SEN204', title: 'Software Construction', units: 2 },
          { code: 'SEN206', title: 'Design and Analysis of Computer Algorithms', units: 2 },
          { code: 'SEN208', title: 'Principles of Operating Systems', units: 2 },
          { code: 'SEN210', title: 'Software Engineering Process', units: 2 },
          { code: 'SEN212', title: 'Information Visualization', units: 2 },
          { code: 'SEN214', title: 'Microcontroller Programming', units: 2 },
          { code: 'SEN282', title: 'Software Engineering Lab IV', units: 2 },
          { code: 'SEN290', title: 'SIWES I', units: 3 },
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
          { code: 'GST311', title: 'Introduction to Entrepreneurship Studies', units: 2 },
          { code: 'SEN301', title: 'Object-Oriented Analysis and Design', units: 3 },
          { code: 'SEN303', title: 'Programmable Logic Controller Programming', units: 2 },
          { code: 'SEN305', title: 'Web Application Development', units: 3 },
          { code: 'SEN307', title: 'Database Systems', units: 3 },
          { code: 'SEN309', title: 'Concept of Programming Language', units: 2 },
          { code: 'SEN381', title: 'Software Engineering Lab V', units: 2 },
          { code: 'STA343', title: 'Operation Research I', units: 3 },
        ],
      },
      {
        name: 'Second Semester',
        session: '2024/2025',
        courses: [
          { code: 'SEN302', title: 'Software Configuration Management & Maintenance', units: 2 },
          { code: 'SEN304', title: 'Software Engineering Project Management', units: 2 },
          { code: 'SEN306', title: 'Research Methodology', units: 1 },
          { code: 'SEN308', title: 'Software Engineering Professional Practice', units: 2 },
          { code: 'SEN310', title: 'Software Engineering Security', units: 2 },
          { code: 'SEN312', title: 'Artificial Intelligence & Expert System', units: 3 },
          { code: 'SEN314', title: 'Engineering Mobile Applications', units: 2 },
          { code: 'SEN316', title: 'Software Testing & Quality Assurance', units: 2 },
          { code: 'SEN382', title: 'Software Engineering Lab VI', units: 2 },
          { code: 'SEN390', title: 'SIWES II', units: 3 },
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
          { code: 'SEN401', title: 'Software Engineering Economics', units: 2 },
          { code: 'SEN403', title: 'Human-computer Interaction', units: 2 },
          { code: 'SEN405', title: 'Open-Source Software Development and Applications', units: 2 },
          { code: 'SEN407', title: 'Distributed, Parallel, and Cloud Computing', units: 2 },
          { code: 'SEN409', title: 'Software Architecture and Design', units: 2 },
          { code: 'SEN411', title: 'Special Topics in Software Engineering', units: 2 },
          { code: 'SEN413', title: 'Research Seminar', units: 1 },
          { code: 'SEN415', title: 'Visual Design', units: 2 },
          { code: 'SEN481', title: 'Software Engineering Lab VII', units: 2 },
        ],
      },
      {
        name: 'Second Semester',
        session: '2025/2026',
        courses: [
          { code: 'SEN402', title: 'Enterprise Application Development', units: 2 },
          { code: 'SEN404', title: 'Virtual and Augmented Reality', units: 2 },
          { code: 'SEN406', title: 'Fault—Tolerant Computing', units: 2 },
          { code: 'SEN408', title: 'Game Design and Development', units: 2 },
          { code: 'SEN410', title: 'Modelling and Computer simulation', units: 2 },
          { code: 'SEN482', title: 'Software Engineering Lab VIII', units: 2 },
          { code: 'SEN490', title: 'Project', units: 6 },
        ],
      },
    ],
  },
];

export const allCourses: Course[] = levels.flatMap((l) => l.semesters.flatMap((s) => s.courses));
export const totalUnits: number = allCourses.reduce((sum, c) => sum + c.units, 0);
