import OpenAI from 'openai';
import { NextResponse } from 'next/server';  // Kötelező import a Response-hoz Vercel Edge-ben!

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const { message, threadId } = await request.json();

    // Thread kezelése (létező vagy új)
    let thread;
    if (threadId) {
      thread = await openai.beta.threads.retrieve(threadId);
    } else {
      thread = await openai.beta.threads.create();
    }

    // Felhasználói üzenet hozzáadása
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message,
    });

    // Assistant futtatása
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.ASSISTANT_ID,
    });

    // Polling: Várakozás a befejezésre (max 60 mp timeout, hogy ne akadjon el)
    let attempts = 0;
    let status = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    while (status.status !== "completed" && attempts < 60) {
      await new Promise(r => setTimeout(r, 1000));
      status = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      attempts++;
    }

    if (status.status !== "completed") {
      throw new Error("Run timeout – try again");
    }

    // Válasz lekérése
    const messages = await openai.beta.threads.messages.list(thread.id);
    const reply = messages.data[0].content[0].text.value;

    return NextResponse.json({ reply, threadId: thread.id });
  } catch (e) {
    console.error("API Error:", e);  // Log Vercel-hez
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
