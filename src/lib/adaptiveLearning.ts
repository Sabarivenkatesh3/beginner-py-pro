export interface UserProfile {
  skill_level: number;
  completed_lessons: number;
  success_rate: number;
  recent_performance: number[];
}

export interface AdaptiveContent {
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  explanation_depth: 'simple' | 'detailed' | 'technical';
  hint_frequency: 'high' | 'medium' | 'low';
  problem_complexity: number;
}

export class AdaptiveLearningEngine {
  static calculateSkillLevel(profile: UserProfile): number {
    const { completed_lessons, success_rate, recent_performance } = profile;
    
    // Base skill from completed lessons (0-40 points)
    const lessonScore = Math.min(completed_lessons * 2, 40);
    
    // Success rate contribution (0-30 points)
    const successScore = success_rate * 30;
    
    // Recent performance trend (0-30 points)
    const recentAvg = recent_performance.length > 0 
      ? recent_performance.reduce((a, b) => a + b, 0) / recent_performance.length 
      : 0;
    const trendScore = recentAvg * 30;
    
    return Math.min(lessonScore + successScore + trendScore, 100);
  }

  static getAdaptiveContent(skillLevel: number): AdaptiveContent {
    if (skillLevel < 30) {
      return {
        difficulty_level: 'beginner',
        explanation_depth: 'simple',
        hint_frequency: 'high',
        problem_complexity: 1
      };
    } else if (skillLevel < 70) {
      return {
        difficulty_level: 'intermediate',
        explanation_depth: 'detailed',
        hint_frequency: 'medium',
        problem_complexity: 2
      };
    } else {
      return {
        difficulty_level: 'advanced',
        explanation_depth: 'technical',
        hint_frequency: 'low',
        problem_complexity: 3
      };
    }
  }

  static generatePersonalizedExplanation(
    content: string, 
    userLevel: AdaptiveContent,
    context: 'lesson' | 'problem' | 'hint'
  ): string {
    const { explanation_depth } = userLevel;
    
    // This would integrate with your AI service
    const explanationPrompts = {
      simple: `Explain this Python concept in very simple terms, like you're teaching a complete beginner: ${content}`,
      detailed: `Provide a detailed explanation of this Python concept with examples: ${content}`,
      technical: `Give a technical, comprehensive explanation of this Python concept: ${content}`
    };
    
    return explanationPrompts[explanation_depth];
  }

  static shouldShowHint(attempts: number, userLevel: AdaptiveContent): boolean {
    const { hint_frequency } = userLevel;
    
    const hintThresholds = {
      high: 1,    // Show hint after 1 failed attempt
      medium: 2,  // Show hint after 2 failed attempts
      low: 3      // Show hint after 3 failed attempts
    };
    
    return attempts >= hintThresholds[hint_frequency];
  }
}