import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { MessageCircle, CheckCircle, Clock, BookOpen } from "lucide-react";
import AITutor from "@/components/AITutor";
import { AdaptiveLearningEngine } from "@/lib/adaptiveLearning";

interface Lesson {
  id: string;
  title: string;
  content: string;
  description?: string;
  difficulty?: string;
  code_example?: string;
  order_number: number;
}

const Lessons = () => {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [showAITutor, setShowAITutor] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [adaptiveContent, setAdaptiveContent] = useState(null);

  // ✅ Fetch lessons
  useEffect(() => {
    const fetchLessons = async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .order("order_number", { ascending: true });

      if (error) console.error(error);
      else {
        setLessons(data || []);
        if (data && data.length > 0 && !selectedLesson) {
          setSelectedLesson(data[0]);
        }
      }
    };

    fetchLessons();
  }, []);

  // ✅ Fetch completed lessons
  useEffect(() => {
    const fetchProgress = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("lesson_progress")
        .select("lesson_id")
        .eq("user_id", user.id)
        .eq("completed", true);

      if (error) console.error(error);
      else setCompletedLessons(data?.map((l: any) => l.lesson_id) || []);
    };

    fetchProgress();
  }, [user]);

  // Load user profile for adaptive learning
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        const { count: completedCount } = await supabase
          .from('lesson_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('completed', true);

        const { data: submissions } = await supabase
          .from('practice_submissions')
          .select('passed')
          .eq('user_id', user.id)
          .order('submitted_at', { ascending: false })
          .limit(10);

        const successRate = submissions?.length > 0 
          ? submissions.filter(s => s.passed).length / submissions.length 
          : 0;

        const userProfileData = {
          skill_level: profile?.skill_level || 1,
          completed_lessons: completedCount || 0,
          success_rate: successRate,
          recent_performance: submissions?.map(s => s.passed ? 1 : 0) || []
        };

        setUserProfile(userProfileData);
        
        const skillLevel = AdaptiveLearningEngine.calculateSkillLevel(userProfileData);
        const adaptive = AdaptiveLearningEngine.getAdaptiveContent(skillLevel);
        setAdaptiveContent(adaptive);
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };

    loadUserProfile();
  }, [user]);
  // ✅ Toggle completion
  const toggleLesson = async (lessonId: string) => {
    if (!user) return;

    const isCompleted = completedLessons.includes(lessonId);

    if (isCompleted) {
      await supabase
        .from("lesson_progress")
        .update({ completed: false, completed_at: null })
        .eq("lesson_id", lessonId)
        .eq("user_id", user.id);

      setCompletedLessons((prev) => prev.filter((id) => id !== lessonId));
    } else {
      await supabase
        .from("lesson_progress")
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          completed: true,
          completed_at: new Date().toISOString(),
        });

      setCompletedLessons((prev) => [...prev, lessonId]);
    }
  };

  const getFilteredLessons = () => {
    if (!adaptiveContent) return lessons;
    
    // Filter lessons based on user's adaptive level
    return lessons.filter(lesson => {
      if (!lesson.difficulty) return true;
      
      if (adaptiveContent.difficulty_level === 'beginner') {
        return lesson.difficulty === 'beginner';
      } else if (adaptiveContent.difficulty_level === 'intermediate') {
        return ['beginner', 'intermediate'].includes(lesson.difficulty);
      } else {
        return true; // Advanced users see all lessons
      }
    });
  };

  const calculateProgress = () => {
    const totalLessons = getFilteredLessons().length;
    const completed = completedLessons.length;
    return totalLessons > 0 ? (completed / totalLessons) * 100 : 0;
  };
  if (!user)
    return <p className="text-center">🔑 Please sign in to see lessons.</p>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Python Lessons</h1>
        {adaptiveContent && (
          <div className="flex items-center gap-4 mb-4">
            <Badge variant="outline" className="capitalize">
              {adaptiveContent.difficulty_level} Level
            </Badge>
            <div className="flex-1 max-w-xs">
              <div className="flex justify-between text-sm mb-1">
                <span>Progress</span>
                <span>{Math.round(calculateProgress())}%</span>
              </div>
              <Progress value={calculateProgress()} className="h-2" />
            </div>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Lesson List Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Lessons
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {getFilteredLessons().map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => setSelectedLesson(lesson)}
                    className={`w-full text-left p-3 hover:bg-muted transition-colors border-l-4 ${
                      selectedLesson?.id === lesson.id
                        ? 'border-primary bg-muted'
                        : 'border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-sm">{lesson.title}</h3>
                        {lesson.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {lesson.description}
                          </p>
                        )}
                      </div>
                      {completedLessons.includes(lesson.id) ? (
                        <CheckCircle className="h-4 w-4 text-green-600 ml-2" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground ml-2" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2">
          {selectedLesson ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">{selectedLesson.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    {selectedLesson.difficulty && (
                      <Badge variant="secondary" className="capitalize">
                        {selectedLesson.difficulty}
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAITutor(!showAITutor)}
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      AI Tutor
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="prose max-w-none">
                  <p className="text-muted-foreground leading-relaxed">
                    {selectedLesson.content}
                  </p>
                </div>

                {selectedLesson.code_example && (
                  <div>
                    <h3 className="font-semibold mb-3">Code Example:</h3>
                    <Editor
                      height="250px"
                      defaultLanguage="python"
                      value={selectedLesson.code_example}
                      options={{ 
                        readOnly: true,
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'on',
                        theme: 'vs-dark'
                      }}
                    />
                  </div>
                )}

                <div className="flex justify-between items-center pt-4 border-t">
                  <div className="flex gap-2">
                    <Button
                      variant={completedLessons.includes(selectedLesson.id) ? "default" : "outline"}
                      onClick={() => toggleLesson(selectedLesson.id)}
                      className="flex items-center gap-2"
                    >
                      {completedLessons.includes(selectedLesson.id) ? (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Completed
                        </>
                      ) : (
                        <>
                          <Clock className="h-4 w-4" />
                          Mark Complete
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    {selectedLesson.order_number > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const prevLesson = lessons.find(l => l.order_number === selectedLesson.order_number - 1);
                          if (prevLesson) setSelectedLesson(prevLesson);
                        }}
                      >
                        Previous
                      </Button>
                    )}
                    {selectedLesson.order_number < lessons.length && (
                      <Button
                        size="sm"
                        onClick={() => {
                          const nextLesson = lessons.find(l => l.order_number === selectedLesson.order_number + 1);
                          if (nextLesson) setSelectedLesson(nextLesson);
                        }}
                      >
                        Next
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">Select a lesson to get started</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* AI Tutor Sidebar */}
        <div className="lg:col-span-1">
          {showAITutor && selectedLesson && (
            <div className="sticky top-4">
              <AITutor
                context={{
                  type: 'lesson',
                  content: selectedLesson.content,
                  lessonId: selectedLesson.id
                }}
                onClose={() => setShowAITutor(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Lessons;
