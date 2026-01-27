import { useMemo, memo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface Course {
  id: string;
  code: string;
  title: string;
  units: number;
  score: number;
  grade: string;
  level: string;
  semester: string;
}

interface GPAChartProps {
  courses: Course[];
}

interface SemesterData {
  name: string;
  gpa: number;
  fullName: string;
}

const GPAChart = memo(function GPAChart({ courses }: GPAChartProps) {
  const chartData = useMemo(() => {
    // Group courses by level and semester
    const grouped: Record<string, Course[]> = {};
    
    courses.forEach((course) => {
      const key = `${course.level}-${course.semester}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(course);
    });

    // Sort keys chronologically
    const sortedKeys = Object.keys(grouped).sort((a, b) => {
      const [levelA, semA] = a.split('-');
      const [levelB, semB] = b.split('-');
      const levelNumA = parseInt(levelA.replace('L', ''));
      const levelNumB = parseInt(levelB.replace('L', ''));
      if (levelNumA !== levelNumB) return levelNumA - levelNumB;
      return semA.localeCompare(semB);
    });

    // Calculate GPA for each semester
    const data: SemesterData[] = sortedKeys.map((key) => {
      const semesterCourses = grouped[key];
      const [level, semester] = key.split('-');
      
      let totalPoints = 0;
      let totalUnits = 0;
      
      semesterCourses.forEach((course) => {
        const gradePoints = 
          course.grade === 'A' ? 5 :
          course.grade === 'B' ? 4 :
          course.grade === 'C' ? 3 :
          course.grade === 'D' ? 2 :
          course.grade === 'E' ? 1 : 0;
        totalPoints += gradePoints * course.units;
        totalUnits += course.units;
      });
      
      const gpa = totalUnits > 0 ? totalPoints / totalUnits : 0;
      
      return {
        name: `${level.replace('L', '')}L S${semester.replace('st', '').replace('nd', '')}`,
        fullName: `Level ${level} - ${semester} Semester`,
        gpa: parseFloat(gpa.toFixed(2)),
      };
    });

    return data;
  }, [courses]);

  const [isZoomed, setIsZoomed] = useState(false);

  const trend = useMemo(() => {
    if (chartData.length < 2) return 'neutral';
    const lastTwo = chartData.slice(-2);
    if (lastTwo[1].gpa > lastTwo[0].gpa) return 'up';
    if (lastTwo[1].gpa < lastTwo[0].gpa) return 'down';
    return 'neutral';
  }, [chartData]);

  // Calculate dynamic domain for zoom with padding
  const yDomain = useMemo(() => {
    if (!isZoomed || chartData.length === 0) return [0, 5];
    const gpas = chartData.map(d => d.gpa);
    const min = Math.min(...gpas);
    const max = Math.max(...gpas);
    return [Math.max(0, min - 0.2), Math.min(5, max + 0.2)];
  }, [isZoomed, chartData]);

  if (chartData.length === 0) {
    return null;
  }

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-success' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground';
  const trendText = trend === 'up' ? 'Improving' : trend === 'down' ? 'Declining' : 'Stable';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            GPA Performance
          </CardTitle>
          <div className="flex items-center gap-4">
            <Button
                variant="outline"
                size="sm"
                onClick={() => setIsZoomed(!isZoomed)}
                className="h-8 text-xs bg-transparent border-primary/20 hover:bg-primary/5"
            >
                {isZoomed ? 'Reset Zoom' : 'Auto Scale'}
            </Button>
            <div className={`flex items-center gap-1 text-sm ${trendColor}`}>
                <TrendIcon className="w-4 h-4" />
                <span>{trendText}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="name" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis 
                domain={yDomain}
                tickCount={6}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
                formatter={(value: number) => [value.toFixed(2), 'GPA']}
                labelFormatter={(label) => {
                  const item = chartData.find(d => d.name === label);
                  return item?.fullName || label;
                }}
              />
              <ReferenceLine 
                y={4.5} 
                stroke="hsl(var(--success))" 
                strokeDasharray="5 5" 
                label={{ 
                  // Only show label if it's within sensible view range (simple check)
                  value: isZoomed && yDomain[0] > 4.5 ? '' : 'First Class', 
                  position: 'right',
                  fill: 'hsl(var(--success))',
                  fontSize: 10
                }} 
              />
              <Line
                type="monotone"
                dataKey="gpa"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 5 }}
                activeDot={{ r: 7, fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Highest</p>
            <p className="text-lg font-bold text-success">
              {Math.max(...chartData.map(d => d.gpa)).toFixed(2)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Lowest</p>
            <p className="text-lg font-bold text-destructive">
              {Math.min(...chartData.map(d => d.gpa)).toFixed(2)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Average</p>
            <p className="text-lg font-bold text-primary">
              {(chartData.reduce((sum, d) => sum + d.gpa, 0) / chartData.length).toFixed(2)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default GPAChart;
