import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  Code, 
  Trophy, 
  TrendingUp, 
  Calendar,
  Target,
  Zap,
  Award
} from "lucide-react";
import { AdaptiveLearningEngine } from "@/lib/adaptiveLearning";

const Dashboard = () => {
  const { user } = useAuth();
  const [lessonCount, setLessonCount] = useState(0);
  const [completedLessons, setCompletedLessons] = useState(0);
  const [solvedProblems, setSolvedProblems] = useState(0);
  const [totalProblems, setTotalProblems] = useState(0);
  const [recentActivity, setRecentActivity] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [adaptiveContent, setAdaptiveContent] = useState(null);
  const [weeklyProgress, setWeeklyProgress] = useState([]);
  const [badges, setBadges] = useState([]);

  useEffect(() => {
    const fetchProgress = async () => {
      if (!user) return;

      try {
        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        // Total lessons
        const { count: totalLessons } = await supabase
          .from("lessons")
          .select("*", { count: "exact", head: true });
        setLessonCount(totalLessons || 0);

        // Completed lessons
        const { count: lessonsDone } = await supabase
          .from("lesson_progress")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("completed", true);
        setCompletedLessons(lessonsDone || 0);

        // Total practice problems
        const { count: totalPracticeProblems } = await supabase
          .from("practice_problems")
          .select("*", { count: "exact", head: true });
        setTotalProblems(totalPracticeProblems || 0);

        // Solved problems (unique problems)
        const { data: solvedProblemsData } = await supabase
          .from("practice_submissions")
          .select("problem_id")
          .eq("user_id", user.id)
          .eq("passed", true);
        
        const uniqueSolved = new Set(solvedProblemsData?.map(s => s.problem_id) || []);
        setSolvedProblems(uniqueSolved.size);

        // Recent submissions for success rate
        const { data: submissions } = await supabase
          .from('practice_submissions')
          .select('*')
          .eq('user_id', user.id)
          .order('submitted_at', { ascending: false })
          .limit(20);

        const successRate = submissions?.length > 0 
          ? submissions.filter(s => s.passed).length / submissions.length 
          : 0;

        const userProfileData = {
          skill_level: profile?.skill_level || 1,
          completed_lessons: lessonsDone || 0,
          success_rate: successRate,
          recent_performance: submissions?.slice(0, 10).map(s => s.passed ? 1 : 0) || []
        };

        setUserProfile(userProfileData);
        
        const skillLevel = AdaptiveLearningEngine.calculateSkillLevel(userProfileData);
        const adaptive = AdaptiveLearningEngine.getAdaptiveContent(skillLevel);
        setAdaptiveContent(adaptive);

        // Recent activity
        const { data: recentLessons } = await supabase
          .from('lesson_progress')
          .select(`
            completed_at,
            lessons (title)
          `)
          .eq('user_id', user.id)
          .eq('completed', true)
          .order('completed_at', { ascending: false })
          .limit(5);

        const { data: recentSubmissions } = await supabase
          .from('practice_submissions')
          .select(`
            submitted_at,
            passed,
            practice_problems (title)
          `)
          .eq('user_id', user.id)
          .order('submitted_at', { ascending: false })
          .limit(5);

        const activity = [
          ...(recentLessons?.map(l => ({
            type: 'lesson',
            title: l.lessons?.title,
            date: l.completed_at,
            status: 'completed'
          })) || []),
          ...(recentSubmissions?.map(s => ({
            type: 'practice',
            title: s.practice_problems?.title,
            date: s.submitted_at,
            status: s.passed ? 'solved' : 'attempted'
          })) || [])
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

        setRecentActivity(activity);

        // Weekly progress (mock data for now)
        const weeklyData = Array.from({ length: 7 }, (_, i) => ({
          day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
          lessons: Math.floor(Math.random() * 3),
          problems: Math.floor(Math.random() * 2)
        }));
        setWeeklyProgress(weeklyData);

        // User badges
        const { data: userBadges } = await supabase
          .from('user_badges')
          .select(`
            earned_at,
            badges (name, description, icon)
          `)
          .eq('user_id', user.id)
          .order('earned_at', { ascending: false });

        setBadges(userBadges || []);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchProgress();
  }, [user]);

  if (!user)
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <p>🔑 Please sign in to view dashboard.</p>
      </div>
    );

  const getSkillLevelInfo = () => {
    if (!userProfile) return { level: 'Beginner', progress: 0, nextLevel: 'Intermediate' };
    
    const skillLevel = AdaptiveLearningEngine.calculateSkillLevel(userProfile);
    
    if (skillLevel < 30) {
      return { level: 'Beginner', progress: (skillLevel / 30) * 100, nextLevel: 'Intermediate' };
    } else if (skillLevel < 70) {
      return { level: 'Intermediate', progress: ((skillLevel - 30) / 40) * 100, nextLevel: 'Advanced' };
    } else {
      return { level: 'Advanced', progress: ((skillLevel - 70) / 30) * 100, nextLevel: 'Expert' };
    }
  };

  const skillInfo = getSkillLevelInfo();

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Track your Python learning journey</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* Lessons Progress */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lessons</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedLessons}</div>
            <p className="text-xs text-muted-foreground">
              of {lessonCount} completed
            </p>
            <Progress 
              value={lessonCount > 0 ? (completedLessons / lessonCount) * 100 : 0} 
              className="mt-2 h-2" 
            />
          </CardContent>
        </Card>

        {/* Practice Problems */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Problems Solved</CardTitle>
            <Code className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{solvedProblems}</div>
            <p className="text-xs text-muted-foreground">
              of {totalProblems} problems
            </p>
            <Progress 
              value={totalProblems > 0 ? (solvedProblems / totalProblems) * 100 : 0} 
              className="mt-2 h-2" 
            />
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userProfile ? Math.round(userProfile.success_rate * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Recent submissions
            </p>
            <Progress 
              value={userProfile ? userProfile.success_rate * 100 : 0} 
              className="mt-2 h-2" 
            />
          </CardContent>
        </Card>

        {/* Skill Level */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Skill Level</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{skillInfo.level}</div>
            <p className="text-xs text-muted-foreground">
              Next: {skillInfo.nextLevel}
            </p>
            <Progress 
              value={skillInfo.progress} 
              className="mt-2 h-2" 
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className={`p-2 rounded-full ${
                      activity.type === 'lesson' 
                        ? 'bg-blue-100 text-blue-600' 
                        : activity.status === 'solved'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-yellow-100 text-yellow-600'
                    }`}>
                      {activity.type === 'lesson' ? (
                        <BookOpen className="h-4 w-4" />
                      ) : (
                        <Code className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.type === 'lesson' ? 'Lesson completed' : 
                         activity.status === 'solved' ? 'Problem solved' : 'Problem attempted'}
                      </p>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(activity.date).toLocaleDateString()}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No recent activity. Start learning to see your progress here!
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {badges.length > 0 ? (
                badges.slice(0, 5).map((badge, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    <div className="text-2xl">{badge.badges?.icon || '🏆'}</div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{badge.badges?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(badge.earned_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Award className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">
                    Complete lessons and solve problems to earn badges!
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Adaptive Learning Insights */}
      {adaptiveContent && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Personalized Learning Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <h3 className="font-semibold mb-2">Your Level</h3>
                <Badge variant="outline" className="capitalize text-lg px-3 py-1">
                  {adaptiveContent.difficulty_level}
                </Badge>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <h3 className="font-semibold mb-2">Learning Style</h3>
                <p className="text-sm text-muted-foreground capitalize">
                  {adaptiveContent.explanation_depth} explanations
                </p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <h3 className="font-semibold mb-2">Support Level</h3>
                <p className="text-sm text-muted-foreground capitalize">
                  {adaptiveContent.hint_frequency} hint frequency
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;

        </div>

        <div className="p-6 border rounded-lg shadow bg-white">
          <h2 className="text-xl font-semibold">Practice Problems Solved</h2>
          <p className="text-2xl">{solvedProblems}</p>
        </div>

        <div className="p-6 border rounded-lg shadow bg-white">
          <h2 className="text-xl font-semibold">Skill Level</h2>
          <p className="text-2xl">
            {completedLessons + solvedProblems > 10
              ? "Intermediate 🚀"
              : "Beginner 🌱"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
