"use server";

import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  verifyPassword,
  signSessionToken,
  setSessionCookie,
  clearSessionCookie,
  getCurrentUser,
  requireRole,
} from "@/lib/auth";
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  createStaffSchema,
  changePasswordSchema,
  type SignupInput,
  type LoginInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type CreateStaffInput,
  type ChangePasswordInput,
} from "@/lib/validations/auth";
import { sendPasswordResetEmail } from "@/lib/mail";
import { Role } from "@prisma/client";

export type ActionResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

/**
 * Customer Signup
 */
export async function signupAction(
  rawInput: SignupInput
): Promise<ActionResponse<{ redirectUrl: string }>> {
  const result = signupSchema.safeParse(rawInput);
  if (!result.success) {
    return {
      success: false,
      error: "Please fix the validation errors below.",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  const { name, email, password } = result.data;
  const normalizedEmail = email.toLowerCase().trim();

  // Check unique email
  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    return {
      success: false,
      fieldErrors: {
        email: ["An account with this email address already exists."],
      },
      error: "An account with this email address already exists.",
    };
  }

  const passwordHash = await hashPassword(password);

  const newUser = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: Role.CUSTOMER,
    },
  });

  // Issue session cookie
  const token = await signSessionToken({
    userId: newUser.id,
    email: newUser.email,
    name: newUser.name,
    role: newUser.role,
  });
  setSessionCookie(token);

  return {
    success: true,
    data: {
      redirectUrl: "/portal",
    },
  };
}

/**
 * User Login (Admin, Staff, Customer)
 */
export async function loginAction(
  rawInput: LoginInput
): Promise<ActionResponse<{ redirectUrl: string; role: Role }>> {
  const result = loginSchema.safeParse(rawInput);
  if (!result.success) {
    return {
      success: false,
      error: "Please enter your email and password.",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  const { email, password } = result.data;
  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    return {
      success: false,
      error: "Invalid email or password.",
    };
  }

  const isPasswordValid = await verifyPassword(password, user.passwordHash);
  if (!isPasswordValid) {
    return {
      success: false,
      error: "Invalid email or password.",
    };
  }

  // Issue session JWT in cookie
  const token = await signSessionToken({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
  setSessionCookie(token);

  // Customer goes to /portal, Admin/Staff to /
  const redirectUrl = user.role === Role.CUSTOMER ? "/portal" : "/";

  return {
    success: true,
    data: {
      redirectUrl,
      role: user.role,
    },
  };
}

/**
 * User Logout
 */
export async function logoutAction(): Promise<ActionResponse<void>> {
  clearSessionCookie();
  return { success: true };
}

/**
 * Request Password Reset (Never reveals if email exists)
 */
export async function requestPasswordResetAction(
  rawInput: ForgotPasswordInput
): Promise<ActionResponse<{ message: string }>> {
  const result = forgotPasswordSchema.safeParse(rawInput);
  if (!result.success) {
    return {
      success: false,
      fieldErrors: result.error.flatten().fieldErrors,
      error: "Please enter a valid email address.",
    };
  }

  const { email } = result.data;
  const normalizedEmail = email.toLowerCase().trim();

  const genericSuccessMessage =
    "If an account exists with that email, a password reset link has been sent.";

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  // Always return the same generic message even if user doesn't exist
  if (!user) {
    return {
      success: true,
      data: { message: genericSuccessMessage },
    };
  }

  // Generate cryptographically random token
  const rawToken = crypto.randomBytes(32).toString("hex");
  // Hash token with sha256 to store in database
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

  // Invalidate any existing tokens for this user
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id },
  });

  // Create new token expiring in 1 hour
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.passwordResetToken.create({
    data: {
      token: hashedToken,
      userId: user.id,
      expiresAt,
    },
  });

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password/${rawToken}`;

  await sendPasswordResetEmail({
    toEmail: user.email,
    userName: user.name,
    resetUrl,
  });

  return {
    success: true,
    data: { message: genericSuccessMessage },
  };
}

/**
 * Reset Password with Token
 */
export async function resetPasswordAction(
  rawToken: string,
  rawInput: ResetPasswordInput
): Promise<ActionResponse<{ message: string }>> {
  const result = resetPasswordSchema.safeParse(rawInput);
  if (!result.success) {
    return {
      success: false,
      error: "Please fix the validation errors below.",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

  const resetRecord = await prisma.passwordResetToken.findUnique({
    where: { token: hashedToken },
    include: { user: true },
  });

  if (!resetRecord || resetRecord.expiresAt < new Date()) {
    return {
      success: false,
      error: "This password reset link is invalid or has expired. Please request a new one.",
    };
  }

  const newHash = await hashPassword(result.data.password);

  // Update password & delete token (one-time use) in an atomic transaction
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash: newHash },
    }),
    prisma.passwordResetToken.delete({
      where: { id: resetRecord.id },
    }),
  ]);

  return {
    success: true,
    data: { message: "Your password has been reset successfully. You can now log in." },
  };
}

/**
 * Admin Action: Create Staff Member
 */
export async function createStaffAction(
  rawInput: CreateStaffInput
): Promise<ActionResponse<{ id: string; name: string; email: string }>> {
  // Enforce server-side role check
  await requireRole(Role.ADMIN);

  const result = createStaffSchema.safeParse(rawInput);
  if (!result.success) {
    return {
      success: false,
      error: "Please fix the form errors.",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  const { name, email, password } = result.data;
  const normalizedEmail = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    return {
      success: false,
      fieldErrors: {
        email: ["A user with this email address already exists."],
      },
      error: "A user with this email address already exists.",
    };
  }

  const passwordHash = await hashPassword(password);

  const staff = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: Role.STAFF,
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  return {
    success: true,
    data: staff,
  };
}

/**
 * Customer / User Action: Change Password
 */
export async function changePasswordAction(
  rawInput: ChangePasswordInput
): Promise<ActionResponse<{ message: string }>> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      success: false,
      error: "You must be logged in to change your password.",
    };
  }

  const result = changePasswordSchema.safeParse(rawInput);
  if (!result.success) {
    return {
      success: false,
      error: "Please fix the validation errors below.",
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  const { currentPassword, newPassword } = result.data;

  // Retrieve current user with passwordHash
  const userRecord = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!userRecord) {
    return { success: false, error: "User record not found." };
  }

  const isCurrentValid = await verifyPassword(currentPassword, userRecord.passwordHash);
  if (!isCurrentValid) {
    return {
      success: false,
      fieldErrors: {
        currentPassword: ["Current password is incorrect."],
      },
      error: "Current password is incorrect.",
    };
  }

  const newPasswordHash = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newPasswordHash },
  });

  return {
    success: true,
    data: { message: "Your password has been changed successfully." },
  };
}
