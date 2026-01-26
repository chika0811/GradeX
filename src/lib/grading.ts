// UNN 5.0 Grading System
export const GRADING_SCALE = {
  A: { min: 70, max: 100, points: 5.0 },
  B: { min: 60, max: 69, points: 4.0 },
  C: { min: 50, max: 59, points: 3.0 },
  D: { min: 45, max: 49, points: 2.0 },
  E: { min: 40, max: 44, points: 1.0 },
  F: { min: 0, max: 39, points: 0.0 },
} as const;

export type Grade = keyof typeof GRADING_SCALE;

export function calculateGrade(score: number): Grade {
  if (score >= 70) return 'A';
  if (score >= 60) return 'B';
  if (score >= 50) return 'C';
  if (score >= 45) return 'D';
  if (score >= 40) return 'E';
  return 'F';
}

export function getGradePoints(grade: Grade): number {
  return GRADING_SCALE[grade].points;
}

export function isCarryover(score: number): boolean {
  return score < 40;
}

export interface Course {
  id: string;
  code: string;
  title: string;
  units: number;
  score: number;
  grade: Grade;
  semester: string;
  level: string;
}

export interface BreakdownItem {
  code: string;
  units: number;
  score: number;
  letter: string;
  point: number;
  points: number;
}

export type GradeMap = Array<{
  min: number;
  max: number;
  letter: string;
  point: number;
}>;

export interface CGPACalculationResult {
  semesterUnits: number;
  semesterPoints: number;
  semesterGPA: number;
  priorPoints: number;
  cumulativePoints: number;
  cumulativeUnits: number;
  cumulativeCGPA: number;
  cumulativeCGPADisplay: number;
  breakdown: BreakdownItem[];
  steps: string[];
}


export function calculateGPA(courses: Course[]): number {
  if (courses.length === 0) return 0;
  
  const totalPoints = courses.reduce((sum, course) => {
    return sum + (getGradePoints(course.grade) * Number(course.units));
  }, 0);
  
  const totalUnits = courses.reduce((sum, course) => sum + Number(course.units), 0);
  
  return totalUnits > 0 ? totalPoints / totalUnits : 0;
}

/**
 * calculateCGPA
 * Input:
 *   courses: Array of { code: string, units: number, score: number }
 *   prior: { cgpa: number, units: number }  // prior.units may be 0 for freshers
 *   gradeMap: optional mapping (default uses UNN-like mapping)
 * Output:
 *   {
 *     semesterUnits, semesterPoints, semesterGPA,
 *     priorPoints, cumulativePoints, cumulativeUnits, cumulativeCGPA,
 *     steps: [string] // human-readable step-by-step log
 *   }
 */
export function calculateCGPA(courses: Array<{ code: string; units: number; score: number; }>, prior = { cgpa: 0.0, units: 0 }, gradeMap: GradeMap | null = null): CGPACalculationResult {
  // Default grade mapping (UNN-style — update if UNN publishes different cutoffs)
  const map: GradeMap = gradeMap || [
    { min: 70, max: 100, letter: "A", point: 5 },
    { min: 60, max: 69,  letter: "B", point: 4 },
    { min: 50, max: 59,  letter: "C", point: 3 },
    { min: 45, max: 49,  letter: "D", point: 2 },
    { min: 40, max: 44,  letter: "E", point: 1 },
    { min: 0,  max: 39,  letter: "F", point: 0 }
  ];

  function scoreToPoint(score: number) {
    for (const g of map) {
      if (score >= g.min && score <= g.max) return { letter: g.letter, point: g.point };
    }
    // fallback
    return { letter: "F", point: 0 };
  }

  const steps: string[] = [];
  steps.push("Grading map: " + map.map(g => `${g.letter}=${g.point} (${g.min}–${g.max})`).join(", "));

  // Per-course conversions
  let semesterUnits = 0;
  let semesterPoints = 0;
  const breakdown: BreakdownItem[] = [];

  for (const c of courses) {
    const units = Number(c.units);
    const score = Number(c.score);
    const conv = scoreToPoint(score);
    const points = units * conv.point;
    semesterUnits += units;
    semesterPoints += points;
    breakdown.push({ code: c.code, units, score, letter: conv.letter, point: conv.point, points });
    steps.push(`${c.code}: ${score} → ${conv.letter} (${conv.point}) → ${units} × ${conv.point} = ${points}`);
  }

  // Semester GPA
  const semesterGPA = semesterUnits === 0 ? 0.0 : (semesterPoints / semesterUnits);
  steps.push(`Semester units = ${semesterUnits}, semester points = ${semesterPoints}`);
  steps.push(`Semester GPA = ${semesterPoints} / ${semesterUnits} = ${semesterGPA}`);

  // Prior cumulative points
  const priorUnits = Number(prior.units || 0);
  const priorCGPA = Number(prior.cgpa || 0.0);
  const priorPoints = +(priorCGPA * priorUnits).toFixed(6); // keep precision
  steps.push(`Prior CGPA = ${priorCGPA} across ${priorUnits} units → prior points = ${priorCGPA} × ${priorUnits} = ${priorPoints}`);

  // New cumulative
  const cumulativePoints = +(priorPoints + semesterPoints).toFixed(6);
  const cumulativeUnits = priorUnits + semesterUnits;
  const cumulativeCGPA = cumulativeUnits === 0 ? 0.0 : (cumulativePoints / cumulativeUnits);
  steps.push(`New cumulative points = ${priorPoints} + ${semesterPoints} = ${cumulativePoints}`);
  steps.push(`New total units = ${priorUnits} + ${semesterUnits} = ${cumulativeUnits}`);
  steps.push(`New CGPA = ${cumulativePoints} / ${cumulativeUnits} = ${cumulativeCGPA}`);

  // Round final displays to 2 decimal places for user
  const result = {
    semesterUnits,
    semesterPoints,
    semesterGPA: +semesterGPA.toFixed(6),
    priorPoints,
    cumulativePoints: +cumulativePoints.toFixed(6),
    cumulativeUnits,
    cumulativeCGPA: +cumulativeCGPA.toFixed(6),
    cumulativeCGPADisplay: +cumulativeCGPA.toFixed(2),
    breakdown,
    steps
  };

  return result;
}


export function getCarryoverCourses(courses: Course[]): Course[] {
  return courses.filter(course => isCarryover(course.score));
}
