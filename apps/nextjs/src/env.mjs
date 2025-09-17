import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    // This is optional because it's only used in development.
    // See https://next-auth.js.org/deployment.
    NEXTAUTH_URL: z.string().url().optional(),
    NEXTAUTH_SECRET: z.string().min(1).optional(), // Made optional for v1.0 launch
    GOOGLE_CLIENT_ID: z.string().min(1).optional(), // Made optional for v1.0 launch
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(), // Made optional for v1.0 launch
    GITHUB_CLIENT_ID: z.string().min(1).optional(), // Added and made optional for v1.0 launch
    GITHUB_CLIENT_SECRET: z.string().min(1).optional(), // Added and made optional for v1.0 launch
    STRIPE_API_KEY: z.string().min(1).optional(), // Made optional for v1.0 launch
    STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(), // Made optional for v1.0 launch
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().min(1),
    NEXT_PUBLIC_STRIPE_PRO_PRODUCT_ID: z.string().optional(),
    NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID: z.string().optional(),
    NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID: z.string().optional(),
    NEXT_PUBLIC_STRIPE_BUSINESS_PRODUCT_ID: z.string().optional(),
    NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PRICE_ID: z.string().optional(),
    NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PRICE_ID: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
    NEXT_PUBLIC_POSTHOG_HOST: z.string().optional(),
  },
  runtimeEnv: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    STRIPE_API_KEY: process.env.STRIPE_API_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_STRIPE_PRO_PRODUCT_ID:
      process.env.NEXT_PUBLIC_STRIPE_PRO_PRODUCT_ID,
    NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID:
      process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
    NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID:
      process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID,
    NEXT_PUBLIC_STRIPE_BUSINESS_PRODUCT_ID:
      process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRODUCT_ID,
    NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PRICE_ID:
      process.env.NEXT_PUBLIC_STRIPE_BUSINESS_MONTHLY_PRICE_ID,
    NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PRICE_ID:
      process.env.NEXT_PUBLIC_STRIPE_BUSINESS_YEARLY_PRICE_ID,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },
});
