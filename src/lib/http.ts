import { NextResponse } from "next/server";
import { NotFoundError } from "./recommend";
import { ValidationError } from "./validate";

/** Runs a route handler body and turns known errors into JSON responses. */
export async function handle(fn: () => Promise<unknown>): Promise<NextResponse> {
  try {
    return NextResponse.json(await fn());
  } catch (err) {
    if (err instanceof ValidationError) return NextResponse.json({ error: err.message }, { status: 400 });
    if (err instanceof NotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    console.error(err);
    return NextResponse.json({ error: "Couldn't reach Purdue Dining. Try again in a minute." }, { status: 502 });
  }
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    if (body && typeof body === "object") return body as Record<string, unknown>;
  } catch {}
  throw new ValidationError("request body must be JSON");
}
