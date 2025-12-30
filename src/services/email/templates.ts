/**
 * Email Templates for YOU.OS
 *
 * Premium styled email templates matching brand guidelines
 */

import { env } from '@/config/env'

// Brand colors from CLAUDE.md
const colors = {
  electricBlue: '#00C8FF',
  neonPurple: '#B400FF',
  hotPink: '#FF2DD8',
  deepNavy: '#0A0F1F',
  pureBlack: '#000000',
  white: '#FFFFFF',
  gray: '#8892A4',
}

/**
 * Base email wrapper with YOU.OS branding
 */
function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>YOU.OS</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${colors.deepNavy}; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${colors.deepNavy};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <div style="font-size: 32px; font-weight: 700; background: linear-gradient(135deg, ${colors.electricBlue}, ${colors.neonPurple}); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                YOU.OS
              </div>
            </td>
          </tr>

          <!-- Content Card -->
          <tr>
            <td style="background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%); border-radius: 16px; padding: 40px; border: 1px solid rgba(255,255,255,0.1);">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 32px;">
              <p style="margin: 0; color: ${colors.gray}; font-size: 12px; line-height: 1.5;">
                &copy; ${new Date().getFullYear()} YOU.OS. All rights reserved.
              </p>
              <p style="margin: 8px 0 0 0; color: ${colors.gray}; font-size: 12px; line-height: 1.5;">
                Your AI-powered identity platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

/**
 * Primary CTA button style
 */
function primaryButton(text: string, url: string): string {
  return `
<a href="${url}" target="_blank" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, ${colors.electricBlue}, ${colors.neonPurple}); color: ${colors.white}; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center;">
  ${text}
</a>
`
}

// ============================================
// Company Invite Email
// ============================================

export interface CompanyInviteEmailData {
  email: string
  companyName: string
  inviterName: string
  role: string
  token: string
  expiresAt: Date
}

export function companyInviteTemplate(data: CompanyInviteEmailData): {
  html: string
  text: string
  subject: string
} {
  const inviteUrl = `${env.FRONTEND_URL}/invite?token=${data.token}`
  const expiresFormatted = data.expiresAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const content = `
<h1 style="margin: 0 0 16px 0; color: ${colors.white}; font-size: 24px; font-weight: 600; line-height: 1.3;">
  You're invited to join ${data.companyName}
</h1>

<p style="margin: 0 0 24px 0; color: ${colors.gray}; font-size: 16px; line-height: 1.6;">
  <strong style="color: ${colors.white};">${data.inviterName}</strong> has invited you to join <strong style="color: ${colors.white};">${data.companyName}</strong> as a <strong style="color: ${colors.electricBlue};">${data.role}</strong>.
</p>

<p style="margin: 0 0 32px 0; color: ${colors.gray}; font-size: 16px; line-height: 1.6;">
  Click the button below to accept this invitation and set up your account.
</p>

<div style="text-align: center; margin-bottom: 32px;">
  ${primaryButton('Accept Invitation', inviteUrl)}
</div>

<div style="background: rgba(0,200,255,0.1); border-radius: 8px; padding: 16px; border-left: 3px solid ${colors.electricBlue};">
  <p style="margin: 0; color: ${colors.gray}; font-size: 14px; line-height: 1.5;">
    <strong style="color: ${colors.white};">This invitation expires on:</strong><br>
    ${expiresFormatted}
  </p>
</div>

<p style="margin: 24px 0 0 0; color: ${colors.gray}; font-size: 14px; line-height: 1.6;">
  If you didn't expect this invitation, you can safely ignore this email.
</p>

<hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 24px 0;">

<p style="margin: 0; color: ${colors.gray}; font-size: 12px; line-height: 1.5;">
  Button not working? Copy and paste this link into your browser:<br>
  <a href="${inviteUrl}" style="color: ${colors.electricBlue}; word-break: break-all;">${inviteUrl}</a>
</p>
`

  const text = `
You're invited to join ${data.companyName}

${data.inviterName} has invited you to join ${data.companyName} as a ${data.role}.

Accept this invitation by visiting:
${inviteUrl}

This invitation expires on ${expiresFormatted}.

If you didn't expect this invitation, you can safely ignore this email.

---
YOU.OS - Your AI-powered identity platform
`

  return {
    html: emailWrapper(content),
    text: text.trim(),
    subject: `You're invited to join ${data.companyName} on YOU.OS`,
  }
}

// ============================================
// Signup Invite Email (Admin Invites)
// ============================================

export interface SignupInviteEmailData {
  email: string
  token: string
  expiresAt: Date
  note?: string
  invitedBy?: string
}

export function signupInviteTemplate(data: SignupInviteEmailData): {
  html: string
  text: string
  subject: string
} {
  const signupUrl = `${env.FRONTEND_URL}/register?invite=${data.token}`
  const expiresFormatted = data.expiresAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const noteSection = data.note
    ? `
<div style="background: rgba(180,0,255,0.1); border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 3px solid ${colors.neonPurple};">
  <p style="margin: 0; color: ${colors.gray}; font-size: 14px; line-height: 1.5;">
    <strong style="color: ${colors.white};">Note from the team:</strong><br>
    ${data.note}
  </p>
</div>
`
    : ''

  const content = `
<h1 style="margin: 0 0 16px 0; color: ${colors.white}; font-size: 24px; font-weight: 600; line-height: 1.3;">
  You're invited to YOU.OS
</h1>

<p style="margin: 0 0 24px 0; color: ${colors.gray}; font-size: 16px; line-height: 1.6;">
  You've been invited to create an account on <strong style="color: ${colors.electricBlue};">YOU.OS</strong> - your AI-powered personal identity platform.
</p>

${noteSection}

<p style="margin: 0 0 32px 0; color: ${colors.gray}; font-size: 16px; line-height: 1.6;">
  Click the button below to create your account and start building your digital identity.
</p>

<div style="text-align: center; margin-bottom: 32px;">
  ${primaryButton('Create Your Account', signupUrl)}
</div>

<div style="background: rgba(0,200,255,0.1); border-radius: 8px; padding: 16px; border-left: 3px solid ${colors.electricBlue};">
  <p style="margin: 0; color: ${colors.gray}; font-size: 14px; line-height: 1.5;">
    <strong style="color: ${colors.white};">This invitation expires on:</strong><br>
    ${expiresFormatted}
  </p>
</div>

<p style="margin: 24px 0 0 0; color: ${colors.gray}; font-size: 14px; line-height: 1.6;">
  If you didn't expect this invitation, you can safely ignore this email.
</p>

<hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 24px 0;">

<p style="margin: 0; color: ${colors.gray}; font-size: 12px; line-height: 1.5;">
  Button not working? Copy and paste this link into your browser:<br>
  <a href="${signupUrl}" style="color: ${colors.electricBlue}; word-break: break-all;">${signupUrl}</a>
</p>
`

  const text = `
You're invited to YOU.OS

You've been invited to create an account on YOU.OS - your AI-powered personal identity platform.

${data.note ? `Note from the team: ${data.note}\n` : ''}
Create your account by visiting:
${signupUrl}

This invitation expires on ${expiresFormatted}.

If you didn't expect this invitation, you can safely ignore this email.

---
YOU.OS - Your AI-powered identity platform
`

  return {
    html: emailWrapper(content),
    text: text.trim(),
    subject: "You're invited to join YOU.OS",
  }
}
