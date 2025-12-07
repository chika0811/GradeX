// Liona AI - AI for Academic Performance
// Powered by Noskytech

interface UserContext {
  name: string;
  cgpa: number;
  carryoversCount: number;
  currentGPA: number;
}

// 5.0 Grading System
const GRADE_POINTS: Record<string, number> = {
  'A+': 5.0,
  'A': 5.0,
  'B+': 4.5,
  'B': 4.0,
  'C+': 3.5,
  'C': 3.0,
  'D+': 2.5,
  'D': 2.0,
  'E': 1.0,
  'F': 0.0,
};

function isAcademicQuery(message: string): boolean {
  const lower = message.toLowerCase();
  const academicKeywords = [
    'cgpa', 'gpa', 'grade', 'calculate', 'result', 'score', 'unit', 'course',
    'credit', 'semester', 'level', 'carryover', 'carry over', 'pass', 'fail',
    'first class', 'second class', 'third class', 'average', 'point', 'improve',
    'study', 'exam', 'test', 'assessment', 'predict', 'what if', 'if i get',
    'how many', 'how much', 'need', 'target', 'goal', 'performance', 'academic',
    'registration', 'workload', 'load', 'units', 'courses', 'semester gpa',
    'cumulative', 'total', 'help', 'explain', 'how to', 'what is', 'can you'
  ];
  return academicKeywords.some(keyword => lower.includes(keyword));
}

function isGreeting(message: string): boolean {
  const lower = message.toLowerCase();
  const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening', 'howdy', 'greetings'];
  return greetings.some(g => lower.includes(g)) && message.length < 30;
}

function isThanks(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes('thank') || lower.includes('thanks') || lower.includes('appreciate');
}

function isAboutQuery(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes('who made you') || lower.includes('who created you') || 
         lower.includes('noskytech') || lower.includes('who are you') || 
         lower.includes('what are you') || lower.includes('who built you') ||
         lower.includes('about gradex');
}

function generateCGPAExplanation(userContext: UserContext): string {
  const { cgpa, carryoversCount, currentGPA, name } = userContext;
  
  if (cgpa === 0) {
    return `${name} you have not added any courses yet

Once you add them Liona will calculate your CGPA automatically

Here is the 5 point 0 grading system

A or A plus gives you 5 point 0
B plus gives you 4 point 5
B gives you 4 point 0
C plus gives you 3 point 5
C gives you 3 point 0
D plus gives you 2 point 5
D gives you 2 point 0
E gives you 1 point 0
F gives you 0

To calculate GPA multiply each grade point by the course units then divide the total by all units registered`;
  }

  let response = `According to your data in Liona ${name}

Your current CGPA is ${cgpa.toFixed(2)}`;
  
  if (currentGPA > 0 && currentGPA !== cgpa) {
    response += `

This semester GPA is ${currentGPA.toFixed(2)}`;
  }
  
  if (carryoversCount > 0) {
    response += `

You have ${carryoversCount} carryover${carryoversCount > 1 ? 's' : ''} to clear

Prioritize these courses as they affect your graduation timeline`;
  }
  
  if (cgpa >= 4.5) {
    response += `

Excellent performance

You are on track for First Class

Maintain this momentum by staying consistent with your study habits`;
  } else if (cgpa >= 3.5) {
    response += `

Strong performance in Second Class Upper range

To push toward First Class focus on high unit courses where small improvements have the biggest impact`;
  } else if (cgpa >= 2.5) {
    response += `

You are in Second Class Lower range

There is significant room for improvement

Identify your weakest courses and allocate more study time to them`;
  } else if (cgpa >= 1.5) {
    response += `

Your CGPA is in Third Class range

This requires immediate attention

Focus on passing all courses first then work on improving grades`;
  } else {
    response += `

Your CGPA needs urgent improvement

Let us work on a recovery plan

Start by identifying courses where you can realistically improve`;
  }
  
  return response;
}

function generateStudyAdvice(name: string, query: string): string {
  const lower = query.toLowerCase();
  
  if (lower.includes('improve') || lower.includes('boost') || lower.includes('increase')) {
    return `Here is what Liona suggests for improving your grades ${name}

Focus on high unit courses first since they have more weight in your GPA calculation

For example improving a 4 unit course from C to B adds more points than improving a 2 unit course from B to A

Review past questions to understand exam patterns

Create a study schedule that allocates time based on course difficulty not just preference`;
  }
  
  if (lower.includes('exam') || lower.includes('test') || lower.includes('prepare')) {
    return `Exam preparation tips from Liona ${name}

Start revision at least 2 weeks before exams

Use active recall by testing yourself instead of passive reading

Practice with past questions under timed conditions

Prioritize understanding concepts over memorizing

Get enough sleep before exams since tired brains perform poorly`;
  }
  
  return `Study guidance from Liona ${name}

Consistency beats intensity

Two to three hours of focused daily study is more effective than weekend cramming

Use the Pomodoro technique with 45 minutes on and 15 minutes break

Explain concepts aloud as if teaching someone else

This reveals gaps in your understanding`;
}

function generatePrediction(query: string, userContext: UserContext): string {
  const { name, cgpa } = userContext;
  
  return `Powered by Noskytech ${name} I can help you predict your CGPA

To give you an accurate projection please provide

The courses you plan to take with their units
The grades you expect to achieve

For example
MAT201 3 units expecting B
PHY202 4 units expecting C plus

Then I will calculate your projected new CGPA and show you exactly how it changes`;
}

function generateCourseLoadAdvice(name: string): string {
  return `Course load guidance from Liona ${name}

The optimal course load is typically 18 to 22 units per semester

Registering more than 24 units often leads to lower performance across all courses

Consider your other commitments when deciding

If you have carryovers prioritize those over adding new electives

Balance difficult and easier courses in the same semester`;
}

function generateGradingExplanation(): string {
  return `Here is the 5 point 0 grading system used in Liona

A or A plus equals 5 point 0
B plus equals 4 point 5
B equals 4 point 0
C plus equals 3 point 5
C equals 3 point 0
D plus equals 2 point 5
D equals 2 point 0
E equals 1 point 0
F equals 0

GPA Formula
Sum of grade point times course units divided by total units

CGPA Formula
Sum of all semester grade points times their units divided by total accumulated units`;
}

function generateNonAcademicResponse(): string {
  return `I am here to help with GPA CGPA study planning and academic guidance only

You can ask me about

Calculating your GPA or CGPA
Understanding the grading system
Tips to improve your grades
Course load planning
Predicting your future CGPA

How can I assist you academically`;
}

export function generateResponse(message: string, userContext: UserContext, calculateCGPA: Function): string {
  const lower = message.toLowerCase();
  
  // Handle greetings
  if (isGreeting(message)) {
    return `Hello ${userContext.name}

Welcome to Liona AI powered by Noskytech

I can help you with GPA and CGPA calculations academic performance analysis and study planning

What would you like to know`;
  }
  
  // Handle thanks
  if (isThanks(message)) {
    return `You are welcome ${userContext.name}

If you have more questions about your grades or academic performance feel free to ask

Gradex is here to help`;
  }
  
  // Handle about/creator queries
  if (isAboutQuery(message)) {
    return `I am Liona AI powered by Noskytech

My purpose is to help students understand and improve their academic performance using the 5 point 0 grading system

I can calculate GPA and CGPA analyze your performance give study advice predict outcomes and help with course planning

Noskytech is a Nigerian tech company focused on building innovative solutions for students`;
  }
  
  // Check if query is academic
  if (!isAcademicQuery(message) && message.length > 20) {
    return generateNonAcademicResponse();
  }
  
  // Handle CGPA/GPA queries
  if (lower.includes('cgpa') || lower.includes('gpa') || lower.includes('grade') || lower.includes('calculate') || lower.includes('result') || lower.includes('score')) {
    return generateCGPAExplanation(userContext);
  }
  
  // Handle grading system questions
  if (lower.includes('grading') || lower.includes('point system') || lower.includes('how does') || lower.includes('what is a') || lower.includes('what is b')) {
    return generateGradingExplanation();
  }
  
  // Handle prediction queries
  if (lower.includes('predict') || lower.includes('what if') || lower.includes('if i get') || lower.includes('what will') || lower.includes('will my')) {
    return generatePrediction(message, userContext);
  }
  
  // Handle course load queries
  if (lower.includes('unit') || lower.includes('load') || lower.includes('how many course') || lower.includes('registration') || lower.includes('register')) {
    return generateCourseLoadAdvice(userContext.name);
  }
  
  // Handle study/improvement queries
  if (lower.includes('study') || lower.includes('improve') || lower.includes('exam') || lower.includes('tip') || lower.includes('advice') || lower.includes('help')) {
    return generateStudyAdvice(userContext.name, message);
  }
  
  // Handle carryover queries
  if (lower.includes('carryover') || lower.includes('carry over') || lower.includes('failed') || lower.includes('retake')) {
    return `About carryovers ${userContext.name}

A carryover is any course where you scored below the pass mark

You must re register and retake these courses

Gradex shows you have ${userContext.carryoversCount} carryover${userContext.carryoversCount !== 1 ? 's' : ''} currently

Prioritize clearing carryovers early as they can delay your graduation

Review what went wrong previously and adjust your approach`;
  }
  
  // Default academic response
  return `${userContext.name} I am ready to help with your academic queries

You can ask me about

Your current CGPA and what it means
How to calculate GPA
Tips to improve specific grades
Course load planning
Predicting future CGPA based on expected grades

What would you like to know`;
}

export function generateWelcomeMessage(userContext: UserContext): string {
  const { name, cgpa, carryoversCount } = userContext;
  
  let welcome = `Hello ${name}

I am Liona AI

I help students understand and improve their academic performance`;
  
  if (cgpa > 0) {
    welcome += `

According to your data your current CGPA is ${cgpa.toFixed(2)}`;
    if (carryoversCount > 0) {
      welcome += ` with ${carryoversCount} carryover${carryoversCount > 1 ? 's' : ''} to address`;
    }
  }
  
  welcome += `

I can assist with GPA calculations performance analysis study tips and course planning

What would you like help with`;
  
  return welcome;
}
