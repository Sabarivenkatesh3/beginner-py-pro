import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, BookOpen, Code, Target } from 'lucide-react';

interface UserStats {
  lessonsCompleted: number;
  totalLessons: number;
  practiceProblems: number;
  totalProblems: number;
  skillLevel: number;
  badges: any[];
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    lessonsCompleted: 0,
    totalLessons: 0,
    practiceProblems: 0,
    totalProblems: 0,
    skillLevel: 1,
    badges: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserStats();
    }
  }, [user]);

  const fetchUserStats = async () => {
    try {
      // Fetch lesson progress
      const { data: lessonProgress } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', user?.id)
        .eq('completed', true);

      // Fetch total lessons
      const { data: totalLessons } = await supabase
        .from('lessons')
        .select('id');

      // Fetch practice submissions
      const { data: practiceSubmissions } = await supabase
        .from('practice_submissions')
        .select('problem_id')
        .eq('user_id', user?.id)
        .eq('passed', true);

      // Get unique problems solved
      const uniqueProblems = new Set(practiceSubmissions?.map(s => s.problem_id) || []);

      // Fetch total practice problems
      const { data: totalProblems } = await supabase
        .from('practice_problems')
        .select('id');

      // Fetch user profile for skill level
      const { data: profile } = await supabase
        .from('profiles')
        .select('skill_level')
        .eq('user_id', user?.id)
        .single();

      // Fetch user badges
      const { data: userBadges } = await supabase
        .from('user_badges')
        .select(`
          badge_id,
          earned_at,
          badges (
            name,
            description,
            icon
          )
        `)
        .eq('user_id', user?.id);

      setStats({
        lessonsCompleted: lessonProgress?.length || 0,
        totalLessons: totalLessons?.length || 0,
        practiceProblems: uniqueProblems.size,
        totalProblems: totalProblems?.length || 0,
        skillLevel: profile?.skill_level || 1,
        badges: userBadges || []
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Please sign in to view your dashboard</h1>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading your dashboard...</div>
      </div>
    );
  }

  const lessonProgress = stats.totalLessons > 0 ? (stats.lessonsCompleted / stats.totalLessons) * 100 : 0;
  const practiceProgress = stats.totalProblems > 0 ? (stats.practiceProblems / stats.totalProblems) * 100 : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome back!</h1>
        <p className="text-muted-foreground">Track your learning progress and achievements</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lessons Completed</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lessonsCompleted}</div>
            <p className="text-xs text-muted-foreground">
              of {stats.totalLessons} total lessons
            </p>
            <Progress value={lessonProgress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Problems Solved</CardTitle>
            <Code className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.practiceProblems}</div>
            <p className="text-xs text-muted-foreground">
              of {stats.totalProblems} total problems
            </p>
            <Progress value={practiceProgress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Skill Level</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Level {stats.skillLevel}</div>
            <p className="text-xs text-muted-foreground">
              Keep learning to level up!
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Badges Earned</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.badges.length}</div>
            <p className="text-xs text-muted-foreground">
              Achievement unlocked!
            </p>
          </CardContent>
        </Card>
      </div>

      {stats.badges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your Badges</CardTitle>
            <CardDescription>
              Achievements you've earned on your learning journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.badges.map((userBadge) => (
                <Badge
                  key={userBadge.badge_id}
                  variant="secondary"
                  className="flex items-center gap-2 px-3 py-1"
                >
                  {userBadge.badges.icon && (
                    <span>{userBadge.badges.icon}</span>
                  )}
                  {userBadge.badges.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;