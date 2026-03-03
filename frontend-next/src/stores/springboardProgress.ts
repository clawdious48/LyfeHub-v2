import { motionValue } from 'framer-motion'

/**
 * Shared motion value tracking the springboard scroll position.
 * 0 = personal dashboard fully visible, 1 = apex dashboard fully visible.
 * Used by Header to sync tab sliding with the dashboard swipe gesture.
 * MotionValue avoids React re-renders — it drives animations directly.
 */
export const springboardProgress = motionValue(0)
