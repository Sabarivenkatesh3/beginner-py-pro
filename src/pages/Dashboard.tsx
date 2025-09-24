import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";

const Dashboard = () => {
  const { user } = useAuth();
  const [lessonCount, setLessonCount] = useState(0);
  const [completedLessons, setCompletedLessons] = useState(0);
  const [solvedProblems, setSolvedProblems] = useState(0);

  useEffect(() => {
    const fetchProgress = async () => {
      if (!user) return;

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

      // Solved problems
      const { count: solved } = await supabase
        .from("practice_submissions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("passed", true);
      setSolvedProblems(solved || 0);
    };

    fetchProgress();
  }, [user]);

  if (!user)
    return <p className="text-center">🔑 Please sign in to view dashboard.</p>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-center mb-8">📊 Your Progress</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
        <div className="p-6 border rounded-lg shadow bg-white">
          <h2 className="text-xl font-semibold">Lessons Completed</h2>
          <p className="text-2xl">{completedLessons} / {lessonCount}</p>
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
