import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, Bot, User, Lightbulb } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { AdaptiveLearningEngine } from '@/lib/adaptiveLearning';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AITutorProps {
  context: {
    type: 'lesson' | 'practice';
    content: string;
    userCode?: string;
    problemId?: string;
    lessonId?: string;
  };
  onClose?: () => void;
}

const AITutor: React.FC<AITutorProps> = ({ context, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadUserProfile();
    initializeConversation();
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Get completed lessons count
      const { count: completedLessons } = await supabase
        .from('lesson_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('completed', true);

      // Get recent submissions for success rate
      const { data: submissions } = await supabase
        .from('practice_submissions')
        .select('passed')
        .eq('user_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(10);

      const successRate = submissions?.length > 0 
        ? submissions.filter(s => s.passed).length / submissions.length 
        : 0;

      const recentPerformance = submissions?.map(s => s.passed ? 1 : 0) || [];

      setUserProfile({
        skill_level: profile?.skill_level || 1,
        completed_lessons: completedLessons || 0,
        success_rate: successRate,
        recent_performance: recentPerformance
      });
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const initializeConversation = () => {
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: getWelcomeMessage(),
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  };

  const getWelcomeMessage = (): string => {
    if (!userProfile) return "Hi! I'm your AI coding tutor. How can I help you today?";

    const skillLevel = AdaptiveLearningEngine.calculateSkillLevel(userProfile);
    const adaptiveContent = AdaptiveLearningEngine.getAdaptiveContent(skillLevel);

    const welcomeMessages = {
      beginner: "Hi! I'm here to help you learn Python step by step. Don't worry if things seem confusing at first - we'll take it slow and I'll explain everything clearly!",
      intermediate: "Hello! I'm your AI tutor. I can see you're making good progress with Python. I'm here to help you tackle more challenging concepts and improve your coding skills.",
      advanced: "Greetings! I can see you're quite experienced with Python. I'm here to help you with advanced concepts, optimization techniques, and complex problem-solving."
    };

    return welcomeMessages[adaptiveContent.difficulty_level];
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  const generateAIResponse = async (userMessage: string): Promise<string> => {
    // This is a mock AI response. In production, you'd integrate with OpenAI, Claude, or your preferred AI service
    const skillLevel = userProfile ? AdaptiveLearningEngine.calculateSkillLevel(userProfile) : 30;
    const adaptiveContent = AdaptiveLearningEngine.getAdaptiveContent(skillLevel);

    // Context-aware responses based on the current lesson/practice
    if (context.type === 'practice' && context.userCode) {
      if (userMessage.toLowerCase().includes('hint') || userMessage.toLowerCase().includes('help')) {
        return generateHint(context.userCode, adaptiveContent);
      }
      if (userMessage.toLowerCase().includes('explain') || userMessage.toLowerCase().includes('why')) {
        return generateCodeExplanation(context.userCode, adaptiveContent);
      }
    }

    if (context.type === 'lesson') {
      if (userMessage.toLowerCase().includes('explain') || userMessage.toLowerCase().includes('understand')) {
        return generateLessonExplanation(context.content, adaptiveContent);
      }
    }

    // General responses based on user level
    const responses = {
      beginner: [
        "Great question! Let me break this down into simple steps for you...",
        "Don't worry, this is a common question for beginners. Here's how to think about it...",
        "Let's start with the basics and build up from there..."
      ],
      intermediate: [
        "That's a good question that shows you're thinking deeper about Python...",
        "Here's a more detailed explanation that should help clarify things...",
        "Let me show you a practical example of how this works..."
      ],
      advanced: [
        "Excellent question! This touches on some advanced Python concepts...",
        "Here's the technical explanation and some optimization considerations...",
        "Let's explore the underlying mechanisms and best practices..."
      ]
    };

    const levelResponses = responses[adaptiveContent.difficulty_level];
    const randomResponse = levelResponses[Math.floor(Math.random() * levelResponses.length)];
    
    return `${randomResponse}\n\nRegarding your question: "${userMessage}"\n\nI'd be happy to help you understand this better. Could you be more specific about what part you'd like me to explain?`;
  };

  const generateHint = (code: string, level: any): string => {
    const hints = {
      beginner: "Here's a gentle hint: Look at your variable names and make sure they match what the problem is asking for. Try running your code step by step in your mind.",
      intermediate: "Hint: Consider the logic flow of your code. Are you handling all the edge cases? Check your conditional statements and loops.",
      advanced: "Hint: Think about the algorithm's efficiency and edge cases. Consider if there's a more elegant or optimized approach to solve this problem."
    };
    
    return hints[level.difficulty_level] || hints.beginner;
  };

  const generateCodeExplanation = (code: string, level: any): string => {
    const explanations = {
      beginner: "Let me explain your code line by line in simple terms...",
      intermediate: "Here's what your code is doing and how it could be improved...",
      advanced: "Let's analyze your code's structure, efficiency, and potential optimizations..."
    };
    
    return explanations[level.difficulty_level] || explanations.beginner;
  };

  const generateLessonExplanation = (content: string, level: any): string => {
    return AdaptiveLearningEngine.generatePersonalizedExplanation(content, level, 'lesson');
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const aiResponse = await generateAIResponse(userMessage.content);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Save conversation to database
      await saveConversation([...messages, userMessage, assistantMessage]);
    } catch (error) {
      console.error('Error generating AI response:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I'm having trouble responding right now. Please try again in a moment.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConversation = async (conversationMessages: Message[]) => {
    if (!user) return;

    try {
      await supabase
        .from('chatbot_conversations')
        .upsert({
          user_id: user.id,
          messages: JSON.stringify(conversationMessages),
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getQuickActions = () => {
    const actions = [];
    
    if (context.type === 'practice') {
      actions.push(
        { label: "Give me a hint", action: () => setInput("Can you give me a hint for this problem?") },
        { label: "Explain my code", action: () => setInput("Can you explain what my code is doing?") },
        { label: "Why is this wrong?", action: () => setInput("Why is my code not working?") }
      );
    } else if (context.type === 'lesson') {
      actions.push(
        { label: "Explain this better", action: () => setInput("Can you explain this concept in simpler terms?") },
        { label: "Give me an example", action: () => setInput("Can you give me a practical example?") },
        { label: "What's next?", action: () => setInput("What should I learn next?") }
      );
    }
    
    return actions;
  };

  return (
    <Card className="w-full max-w-md h-96 flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Bot className="h-4 w-4 text-primary" />
          AI Tutor
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} className="ml-auto">
              ×
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-3 p-3">
        <ScrollArea className="flex-1" ref={scrollAreaRef}>
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <Bot className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                )}
                <div
                  className={`max-w-[80%] p-2 rounded-lg text-sm ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {message.content}
                </div>
                {message.role === 'user' && (
                  <User className="h-6 w-6 text-muted-foreground mt-1 flex-shrink-0" />
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 justify-start">
                <Bot className="h-6 w-6 text-primary mt-1" />
                <div className="bg-muted p-2 rounded-lg text-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-1">
          {getQuickActions().map((action, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              className="text-xs h-6"
              onClick={action.action}
            >
              <Lightbulb className="h-3 w-3 mr-1" />
              {action.label}
            </Button>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything..."
            className="text-sm"
            disabled={isLoading}
          />
          <Button 
            onClick={handleSendMessage} 
            size="sm" 
            disabled={!input.trim() || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AITutor;