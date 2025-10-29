import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

    if (!STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY is not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { wallet_address, destination_currency } = body;

    // Validate required parameters
    if (!wallet_address) {
      return NextResponse.json(
        { error: "wallet_address is required" },
        { status: 400 }
      );
    }

    // Create Crypto Onramp Session
    const response = await fetch(
      "https://api.stripe.com/v1/crypto/onramp_sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          "wallet_addresses[solana]": wallet_address,
          ...(destination_currency && {
            destination_currency: destination_currency,
          }),
          destination_network: "solana",
        }).toString(),
      }
    );

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Stripe API error:", errorData);
      return NextResponse.json(
        {
          error: "Failed to create onramp session",
          details: errorData,
        },
        { status: response.status }
      );
    }

    const session = await response.json();

    return NextResponse.json(
      { client_secret: session.client_secret },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error creating onramp session:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
