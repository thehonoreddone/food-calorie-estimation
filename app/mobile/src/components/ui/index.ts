/**
 * UI Component Barrel Exports
 * Import all UI components from a single location:
 * import { SkeletonCard, EmptyState, CalorieCounter } from '@/components/ui';
 */

// Layout & Forms
export { OnboardingLayout } from './OnboardingLayout';
export { PrimaryButton } from './PrimaryButton';
export { SelectOption } from './SelectOption';

// Loading States
export {
  Skeleton,
  SkeletonCard,
  SkeletonCalorieRing,
  SkeletonPredictionResult,
  SkeletonHistoryList,
} from './SkeletonLoader';

// Empty States
export { EmptyState } from './EmptyState';

// Animations & Micro-interactions
export { CalorieCounter } from './CalorieCounter';
export { FoodRecognitionAnimation } from './FoodRecognitionAnimation';
export { DailyGoalCelebration } from './DailyGoalCelebration';

// Gamification
export { StreakBadge } from './StreakBadge';

// Premium Modal (replaces native Alert.alert)
export { PremiumModal, usePremiumModal } from './PremiumModal';
export type { PremiumModalProps, ModalType, ModalButton, ModalState } from './PremiumModal';
