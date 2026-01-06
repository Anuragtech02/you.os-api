import { z } from 'zod'

export const checkoutSchema = z.object({
  planId: z.enum(['pro', 'elite']),
  interval: z.enum(['monthly', 'yearly']).default('monthly'),
})

export const cancelSchema = z.object({
  immediate: z.boolean().default(false),
})

export const contextSchema = z.object({
  context: z.enum(['linkedin', 'dating', 'bio']),
})

export type CheckoutInput = z.infer<typeof checkoutSchema>
export type CancelInput = z.infer<typeof cancelSchema>
export type ContextInput = z.infer<typeof contextSchema>
