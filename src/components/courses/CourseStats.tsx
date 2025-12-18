import { motion } from 'framer-motion';
import { Flame, Star, Trophy, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UserCourseStats } from '@/types/course';

interface CourseStatsProps {
  stats: UserCourseStats | null;
  totalLessons: number;
  completedLessons: number;
}

export function CourseStats({ stats, totalLessons, completedLessons }: CourseStatsProps) {
  const xp = stats?.xp || 0;
  const streak = stats?.streak_days || 0;
  const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  // Calculate level from XP (every 100 XP = 1 level)
  const level = Math.floor(xp / 100) + 1;
  const xpToNextLevel = 100 - (xp % 100);

  return (
    <div className="flex items-center gap-3">
      {/* XP & Level */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full"
      >
        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
          <span className="text-xs font-bold text-primary-foreground">{level}</span>
        </div>
        <div className="flex items-center gap-1">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">{xp} XP</span>
        </div>
      </motion.div>

      {/* Streak */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-full",
          streak > 0 ? "bg-orange-500/10" : "bg-muted"
        )}
      >
        <Flame className={cn(
          "w-4 h-4",
          streak > 0 ? "text-orange-500" : "text-muted-foreground"
        )} />
        <span className={cn(
          "text-sm font-semibold",
          streak > 0 ? "text-orange-500" : "text-muted-foreground"
        )}>
          {streak}
        </span>
      </motion.div>

      {/* Progress */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full"
      >
        <Star className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">{progress}%</span>
      </motion.div>

      {/* Badges count */}
      {stats?.badges && stats.badges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 rounded-full"
        >
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-semibold text-yellow-500">
            {stats.badges.length}
          </span>
        </motion.div>
      )}
    </div>
  );
}
