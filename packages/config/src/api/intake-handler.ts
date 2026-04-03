import { NextResponse } from "next/server";
import { z } from "zod";

const intakeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  organization: z.string().optional(),
  intent: z.enum(["starter", "enterprise", "partnership", "other"]),
  message: z.string().optional(),
});

export async function handleIntake(request: Request) {
  try {
    const body = await request.json();
    const result = intakeSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: result.error.issues },
        { status: 400 },
      );
    }

    // Stub: would forward to CRM / queue
    return NextResponse.json(
      { success: true, message: "Intake received" },
      { status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }
}
