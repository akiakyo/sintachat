import { NextResponse } from "next/server";

const CONSENT_COOKIE = "sintachat_consent_session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (
      body.termsAccepted !== true ||
      body.ageConfirmed !== true ||
      body.locationConfirmed !== true
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Consent required.",
        },
        {
          status: 400,
        }
      );
    }

    const sessionId = crypto.randomUUID();

    const response = NextResponse.json({
      ok: true,
    });

    response.cookies.set({
      name: CONSENT_COOKIE,
      value: sessionId,
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours browser session
    });

    return response;

  } catch (error) {
    console.error("Consent error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Unable to save consent.",
      },
      {
        status: 500,
      }
    );
  }
}