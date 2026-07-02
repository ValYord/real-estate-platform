import { z } from 'zod'

/** E.164-ish phone number regex (basic — covers most Armenian / international numbers). */
const PHONE_REGEX = /^\+[1-9]\d{6,14}$/

export const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional(),
})

export const registerSchema = z
  .object({
    role: z.enum(['user', 'agent']),
    name: z.string().min(2, 'Name is required').max(60),
    email: z.string().email('Invalid email'),
    phone: z.string().regex(PHONE_REGEX, 'Invalid phone number'),
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[a-zA-Z]/, 'Must contain a letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirm: z.string(),
    agencyName: z.string().min(2).max(80).optional(),
    terms: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the terms' }),
    }),
    marketing: z.boolean().default(false),
  })
  .refine((d) => d.password === d.confirm, {
    path: ['confirm'],
    message: "Passwords don't match",
  })
  .refine((d) => d.role !== 'agent' || !!d.agencyName, {
    path: ['agencyName'],
    message: 'Agency name is required',
  })

export const otpSchema = z.object({
  code: z
    .string()
    .length(6, 'Code must be 6 digits')
    .regex(/^\d{6}$/, 'Code must be numeric'),
})

export const resendOtpSchema = z.object({
  channel: z.enum(['email', 'phone']),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email'),
})

export const resetSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[a-zA-Z]/, 'Must contain a letter')
    .regex(/[0-9]/, 'Must contain a number'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  path: ['confirm'],
  message: "Passwords don't match",
})

export const verifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6).regex(/^\d{6}$/),
})

export const verifyPhoneSchema = z.object({
  phone: z.string().regex(PHONE_REGEX),
  code: z.string().length(6).regex(/^\d{6}$/),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type OtpInput = z.infer<typeof otpSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetInput = z.infer<typeof resetSchema>
