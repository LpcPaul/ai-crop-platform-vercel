import { NextResponse, type NextRequest } from "next/server";

const handler = async (req: NextRequest) => {
  // Disabled for AI Crop Platform - no payment processing needed
  return NextResponse.json({
    error: "Stripe webhooks not configured for this application"
  }, { status: 404 });
};

export { handler as GET, handler as POST };
