/**
 * Email Service using Resend
 *
 * Handles all transactional emails for YOU.OS
 */

import { Resend } from 'resend'
import { env } from '@/config/env'
import {
  companyInviteTemplate,
  signupInviteTemplate,
  type CompanyInviteEmailData,
  type SignupInviteEmailData,
} from './templates'

// Initialize Resend client (will be null if no API key)
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  return resend !== null
}

/**
 * Send a raw email
 */
export async function sendEmail(options: {
  to: string | string[]
  subject: string
  html: string
  text?: string
}): Promise<SendEmailResult> {
  if (!resend) {
    console.warn('[Email] Resend not configured, skipping email send')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
    })

    if (error) {
      console.error('[Email] Failed to send:', error)
      return { success: false, error: error.message }
    }

    return { success: true, messageId: data?.id }
  } catch (err) {
    console.error('[Email] Error sending email:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Send company invite email
 */
export async function sendCompanyInviteEmail(data: CompanyInviteEmailData): Promise<SendEmailResult> {
  const { html, text, subject } = companyInviteTemplate(data)
  return sendEmail({
    to: data.email,
    subject,
    html,
    text,
  })
}

/**
 * Send signup invite email (admin invites)
 */
export async function sendSignupInviteEmail(data: SignupInviteEmailData): Promise<SendEmailResult> {
  const { html, text, subject } = signupInviteTemplate(data)
  return sendEmail({
    to: data.email,
    subject,
    html,
    text,
  })
}
