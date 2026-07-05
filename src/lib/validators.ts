import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nome deve ter pelo menos 2 caracteres")
    .max(100, "Nome muito longo"),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z
    .string()
    .min(8, "Senha deve ter pelo menos 8 caracteres")
    .max(128, "Senha muito longa")
    .regex(/[A-Za-z]/, "Senha deve conter letras")
    .regex(/[0-9]/, "Senha deve conter números"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(1, "Senha obrigatória"),
});

export const verifySchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  code: z
    .string()
    .trim()
    .length(6, "Código deve ter 6 dígitos")
    .regex(/^\d{6}$/, "Código inválido"),
});

export const resendCodeSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
});
