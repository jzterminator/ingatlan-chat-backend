import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    const { message, threadId } = await request.json();

    let thread;
    if (threadId) {
      thread = await openai.beta.threads.retrieve(threadId);
    } else {
      thread = await openai.beta.threads.create();
    }

    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message,
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.ASSISTANT_ID,
    });

    let attempts = 0;
    let status = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    while (status.status !== "completed" && attempts < 60) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      status = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      attempts++;
    }

    if (status.status !== "completed") {
      return NextResponse.json({ error: "Timeout - please try again" }, { status: 408 });
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    const reply = messages.data[0].content[0].text.value;

    return NextResponse.json({ reply, threadId: thread.id });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
