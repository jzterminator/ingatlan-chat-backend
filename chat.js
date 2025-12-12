// api/chat.js
import { OpenAI } from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { message, threadId } = req.body;

  try {
    const thread = threadId
      ? { id: threadId }
      : await openai.beta.threads.create();

    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message,
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.ASSISTANT_ID, // pl. asst_123456789
    });

    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    while (runStatus.status !== "completed") {
      await new Promise((r) => setTimeout(r, 800));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    const botReply = messages.data[0].content[0].text.value;

    res.status(200).json({ reply: botReply, threadId: thread.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

export const config = { api: { bodyParser: true } };
