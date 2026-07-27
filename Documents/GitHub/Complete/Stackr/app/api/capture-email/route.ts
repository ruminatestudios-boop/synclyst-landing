export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return Response.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    console.log("[Email Capture]", email);

    return Response.json(
      { success: true, message: "Email captured successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Email Capture Error]", error);
    return Response.json(
      { error: "Failed to capture email" },
      { status: 500 }
    );
  }
}
