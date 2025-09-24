import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!   // 👈 correct one
);

const Dashboard = () => {
  const [lessonProgress, setLessonProgress] = useState({ completed: 0, total: 0 });
  const [practiceProgress, setPracticeProgress] = useState({ completed: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      // Lessons
      const { data: lessons } = await supabase.from("lessons").select("id");
      const { data: lessonData } = await supabase
        .from("lesson_progress")
        .select("lesson_id, completed")
        .eq("user_id", "demo-user"); // TODO: replace with auth user

      const completedLessons =
        lessonData?.filter((p: any) => p.completed).length || 0;

      setLessonProgress({
        completed: completedLessons,
        total: lessons?.length || 0,
      });

      // Practice Problems
      const { data: problems } = await supabase.from("practice_problems").select("id");
      const { data: submissions } = await supabase
        .from("practice_submissions")
        .select("problem_id, passed")
        .eq("user_id", "demo-user");

      const solvedProblems = new Set(
        submissions?.filter((s: any) => s.passed).map((s: any) => s.problem_id)
      );

      setPracticeProgress({
        completed: solvedProblems.size,
        total: problems?.length || 0,
      });

      setLoading(false);
    };

    fetchProgress();
  }, []);

  if (loading) return <p className="text-center">Loading progress...</p>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">
          Progress Dashboard
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-center">
          <div className="p-6 border rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">Lessons</h2>
            <p>
              {lessonProgress.completed} / {lessonProgress.total} completed
            </p>
          </div>

          <div className="p-6 border rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">Practice Problems</h2>
            <p>
              {practiceProgress.completed} / {practiceProgress.total} solved
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
