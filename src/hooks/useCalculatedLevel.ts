import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface LevelBreakdown {
  skillScore: number;
  experienceScore: number;
  calculatedLevelScore: number;
  portfolioBonus: number;
  projectBonus: number;
  teamRatingBonus: number;
  level: number;
}

export interface LevelThreshold {
  level: number;
  minScore: number;
  maxScore: number;
  name: string;
  description: string;
}

export const LEVEL_THRESHOLDS: LevelThreshold[] = [
  { level: 1, minScore: 0, maxScore: 19, name: '입문', description: '시작하는 단계' },
  { level: 2, minScore: 20, maxScore: 39, name: '초급', description: '기본기를 익히는 단계' },
  { level: 3, minScore: 40, maxScore: 59, name: '중급', description: '실무 경험을 쌓는 단계' },
  { level: 4, minScore: 60, maxScore: 79, name: '고급', description: '전문성을 갖춘 단계' },
  { level: 5, minScore: 80, maxScore: 100, name: '전문가', description: '최고 수준의 전문가' },
];

export function getLevelInfo(level: number): LevelThreshold {
  return LEVEL_THRESHOLDS.find(t => t.level === level) || LEVEL_THRESHOLDS[0];
}

export function getLevelFromScore(score: number): number {
  if (score >= 80) return 5;
  if (score >= 60) return 4;
  if (score >= 40) return 3;
  if (score >= 20) return 2;
  return 1;
}

export function useCalculatedLevel() {
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateLevel = useCallback(async (userId: string): Promise<LevelBreakdown | null> => {
    setIsCalculating(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase
        .rpc('calculate_user_level', { user_id_input: userId });

      if (rpcError) {
        throw rpcError;
      }

      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const result = data as Record<string, unknown>;
        return {
          skillScore: Number(result.skill_score) || 0,
          experienceScore: Number(result.experience_score) || 0,
          calculatedLevelScore: Number(result.calculated_level_score) || 0,
          portfolioBonus: Number(result.portfolio_bonus) || 0,
          projectBonus: Number(result.project_bonus) || 0,
          teamRatingBonus: Number(result.team_rating_bonus) || 0,
          level: Number(result.level) || 1,
        };
      }

      return null;
    } catch (err) {
      const message = err instanceof Error ? err.message : '레벨 계산 중 오류가 발생했습니다';
      setError(message);
      console.error('Level calculation error:', err);
      return null;
    } finally {
      setIsCalculating(false);
    }
  }, []);

  const getLevelBreakdownFromProfile = useCallback((profile: {
    skill_score?: number | null;
    experience_score?: number | null;
    calculated_level_score?: number | null;
    portfolio_bonus?: number | null;
    project_bonus?: number | null;
    team_rating_bonus?: number | null;
    level?: number | null;
  }): LevelBreakdown => {
    return {
      skillScore: Number(profile.skill_score) || 0,
      experienceScore: Number(profile.experience_score) || 0,
      calculatedLevelScore: Number(profile.calculated_level_score) || 0,
      portfolioBonus: Number(profile.portfolio_bonus) || 0,
      projectBonus: Number(profile.project_bonus) || 0,
      teamRatingBonus: Number(profile.team_rating_bonus) || 0,
      level: Number(profile.level) || 1,
    };
  }, []);

  return {
    calculateLevel,
    getLevelBreakdownFromProfile,
    isCalculating,
    error,
  };
}
