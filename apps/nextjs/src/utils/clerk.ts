import { match as matchLocale } from "@formatjs/intl-localematcher";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from 'next/server';
import Negotiator from "negotiator";

import { i18n } from "~/config/i18n-config";
import { env } from "@saasfly/auth/env.mjs";
import { config } from "~/lib/config";

const noNeedProcessRoute = [".*\\.png", ".*\\.jpg", ".*\\.opengraph-image.png"];

const noRedirectRoute = ["/api(.*)", "/trpc(.*)", "/admin"];

export const isPublicRoute = createRouteMatcher([
  new RegExp("/(\\w{2}/)?signin(.*)"),
  new RegExp("/(\\w{2}/)?terms(.*)"),
  new RegExp("/(\\w{2}/)?privacy(.*)"),
  new RegExp("/(\\w{2}/)?docs(.*)"),
  new RegExp("/(\\w{2}/)?blog(.*)"),
  new RegExp("/(\\w{2}/)?pricing(.*)"),
  new RegExp("^/\\w{2}$"), // root with locale
  "/api/crop",
  "/api/download/(.*)",
])

export function getLocale(request: NextRequest): string | undefined {
  // Negotiator expects plain object so we need to transform headers
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));
  const locales = Array.from(i18n.locales);
  // Use negotiator and intl-localematcher to get best locale
  const languages = new Negotiator({ headers: negotiatorHeaders }).languages(
    locales,
  );
  return matchLocale(languages, locales, i18n.defaultLocale);
}

export function isNoRedirect(request: NextRequest): boolean {
  const pathname = request.nextUrl.pathname;
  return noRedirectRoute.some((route) => new RegExp(route).test(pathname));
}

export function isNoNeedProcess(request: NextRequest): boolean {
  const pathname = request.nextUrl.pathname;
  return noNeedProcessRoute.some((route) => new RegExp(route).test(pathname));
}

function addSecurityHeaders(response: NextResponse, locale?: string, pathname?: string): NextResponse {
  // Security Headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), accelerometer=(), gyroscope=()'
  );

  // Add Content-Language header if locale is provided
  if (locale) {
    response.headers.set('Content-Language', locale);
    if (pathname) {
      response.headers.set('x-pathname', pathname);
    }
  }

  // Content Security Policy
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live https://js.clerk.dev; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: blob: https: https://img.clerk.com; " +
      "font-src 'self' data:; " +
      "connect-src 'self' https://api.openai.com https://clerk.com https://*.clerk.com; " +
      "frame-src https://js.clerk.dev; " +
      "frame-ancestors 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self';"
    );
  }

  return response;
}

function handleCORS(request: NextRequest, response: NextResponse): NextResponse | null {
  const origin = request.headers.get('origin');

  // Handle API routes CORS
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Preflight requests
    if (request.method === 'OPTIONS') {
      const corsResponse = new NextResponse(null, { status: 200 });

      if (origin && config.security.corsOrigins.includes(origin)) {
        corsResponse.headers.set('Access-Control-Allow-Origin', origin);
      } else {
        corsResponse.headers.set('Access-Control-Allow-Origin', config.security.corsOrigins[0] || 'http://localhost:3000');
      }

      corsResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      corsResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      corsResponse.headers.set('Access-Control-Max-Age', '86400');
      corsResponse.headers.set('Access-Control-Allow-Credentials', 'true');

      return addSecurityHeaders(corsResponse);
    }

    // Check CORS for actual requests
    if (origin && !config.security.corsOrigins.includes(origin)) {
      console.warn('CORS violation attempt:', {
        origin,
        path: request.nextUrl.pathname,
        ip: request.ip || 'unknown',
        timestamp: new Date().toISOString(),
      });

      return new NextResponse(
        JSON.stringify({ error: 'CORS policy violation' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Set CORS headers for allowed origins
    if (origin && config.security.corsOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    }
  }

  // Protect against path traversal and static directory exposure
  if (request.nextUrl.pathname.startsWith('/api/files/') ||
      request.nextUrl.pathname.startsWith('/uploads/') ||
      request.nextUrl.pathname.includes('..')) {
    return new NextResponse(
      JSON.stringify({ error: 'Access forbidden' }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  return null; // Continue with normal processing
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
export const middleware = clerkMiddleware(async (auth, req: NextRequest) => {
  // Handle CORS and security checks first
  const corsResult = handleCORS(req, NextResponse.next());
  if (corsResult && corsResult.status !== 200) {
    return corsResult; // Return early for CORS violations or preflight requests
  }

  // Extract locale early for use throughout the middleware
  const locale = getLocale(req);

  if (isNoNeedProcess(req)) {
    const response = NextResponse.next();
    return addSecurityHeaders(response, locale, req.nextUrl.pathname);
  }

  const isWebhooksRoute = req.nextUrl.pathname.startsWith("/api/webhooks/");
  if (isWebhooksRoute) {
    const response = NextResponse.next();
    return addSecurityHeaders(response, locale, req.nextUrl.pathname);
  }
  const pathname = req.nextUrl.pathname;
  // Check if there is any supported locale in the pathname
  const pathnameIsMissingLocale = i18n.locales.every(
    (loc) =>
      !pathname.startsWith(`/${loc}/`) && pathname !== `/${loc}`,
  );
  // Redirect if there is no locale
  if (!isNoRedirect(req) && pathnameIsMissingLocale) {
    const redirectResponse = NextResponse.redirect(
      new URL(
        `/${locale}${pathname.startsWith("/") ? "" : "/"}${pathname}`,
        req.url,
      ),
    );
    return addSecurityHeaders(redirectResponse, locale);
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  if (isPublicRoute(req)) {
    return null;
  }

  const { userId, sessionClaims } = await auth()

  const isAuth = !!userId;
  let isAdmin = false
  if (env.ADMIN_EMAIL) {
    const adminEmails = env.ADMIN_EMAIL.split(",");
    if (sessionClaims?.user?.email) {
      isAdmin = adminEmails.includes(sessionClaims?.user?.email);
    }
  }

  const isAuthPage = /^\/[a-zA-Z]{2,}\/(login|register|login-clerk)/.test(
    req.nextUrl.pathname,
  );
  const isAuthRoute = req.nextUrl.pathname.startsWith("/api/trpc/");
  if (isAuthRoute && isAuth) {
    const response = NextResponse.next();
    return addSecurityHeaders(response, locale, req.nextUrl.pathname);
  }
  if (req.nextUrl.pathname.startsWith("/admin/dashboard")) {
    if (!isAuth || !isAdmin) {
      const redirectResponse = NextResponse.redirect(new URL(`/admin/login`, req.url));
      return addSecurityHeaders(redirectResponse, undefined, req.nextUrl.pathname);
    }
    const response = NextResponse.next();
    return addSecurityHeaders(response, locale, req.nextUrl.pathname);
  }
  if (isAuthPage) {
    if (isAuth) {
      const redirectResponse = NextResponse.redirect(new URL(`/${locale}/dashboard`, req.url));
      return addSecurityHeaders(redirectResponse, locale, req.nextUrl.pathname);
    }
    return null;
  }
  if (!isAuth) {
    let from = req.nextUrl.pathname;
    if (req.nextUrl.search) {
      from += req.nextUrl.search;
    }
    const redirectResponse = NextResponse.redirect(
      new URL(`/${locale}/login-clerk?from=${encodeURIComponent(from)}`, req.url),
    );
    return addSecurityHeaders(redirectResponse, locale, req.nextUrl.pathname);
  }
})
