import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge conditional class names and let later Tailwind utilities win over
 * earlier ones (`cn('p-4', condition && 'p-6')` => `p-6`).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
