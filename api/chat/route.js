// api/chat/route.js
import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const { message, threadId } = await request.json();

    // Thread létrehozása vagy meglévő használata
    let thread;
    if (threadId) {
      thread = await openai.beta.threads.retrieve(threadId);
    } else {
      thread = await openai.beta.threads.create();
    }

    // Üzenet hozzáadása
    await openai.beta.threads.messages.create(thread.id, {
      role: 'user',
      content: message,
    });

    // Assistant futtatása
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.ASSISTANT_ID,
    });

    // Várakozás a befejezésre (polling)
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    while (runStatus.status !== 'completed') {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    // Legújabb üzenet lekérése
    const messages = await openai.beta.threads.messages.list(thread.id);
    const botReply = messages.data[0].content[0].text.value;

    return NextResponse.json({ reply: botReply, threadId: thread.id });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
