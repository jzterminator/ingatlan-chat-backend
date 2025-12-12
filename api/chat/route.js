import OpenAI from 'openai';
import { NextResponse } from 'next/server';  // Ez kell a Response-hoz!

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const { message, threadId } = await request.json();

    const thread = threadId
      ? await openai.beta.threads.retrieve(threadId)
      : await openai.beta.threads.create();

    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.ASSISTANT_ID
    });

    let status = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    while (status.status !== "completed") {
      await new Promise(r => setTimeout(r, 1000));
      status = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    const reply = messages.data[0].content[0].text.value;

    return NextResponse.json({ reply, threadId: thread.id });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
