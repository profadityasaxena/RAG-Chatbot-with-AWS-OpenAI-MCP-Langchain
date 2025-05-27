import OpenAI from "openai";
import { DataAPIClient } from "@datastax/astra-db-ts";
import fs from "fs/promises";
import path from "path";

// Load environment variables
const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_API_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  OPENAI_API_KEY,
} = process.env;

// Initialize OpenAI and Astra DB clients
const openai = new OpenAI({ apiKey: OPENAI_API_KEY! });
const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN!);
const db = client.db(ASTRA_DB_API_ENDPOINT!, {
  keyspace: ASTRA_DB_NAMESPACE!,
});

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();
    const latestMessage = messages[messages.length - 1]?.content;

    // Step 1: Read resume from /public/resume.txt
    let resumeContext = "";
    try {
      const resumePath = path.resolve(process.cwd(), "public/resume.txt");
      resumeContext = await fs.readFile(resumePath, "utf-8");
    } catch (err) {
      console.warn("Resume file not found or failed to read.");
    }

    // Step 2: Create embedding for latest message
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: latestMessage,
      encoding_format: "float",
    });

    const embedding = embeddingResponse.data[0].embedding;

    // Step 3: Attempt Astra DB vector search or parse ReAct Action
    let docContext = "";
    let fallback = false;
    let reactObservation = "";
    const actionMatch = latestMessage.match(/Action: Lookup\["(.+?)"\]/);

    try {
      const collection = await db.collection(ASTRA_DB_COLLECTION!);
      const cursor = await collection.find(null, {
        sort: { $vector: embedding },
        limit: 10,
      });
      const documents = await cursor.toArray();
      const docTexts = documents.map((doc) => doc.text);
      docContext = docTexts.join("\n\n");

      if (actionMatch) {
        reactObservation = docTexts.length > 0 ? docTexts.join("\n\n") : "No relevant data found.";
        messages.push({ role: "assistant", content: `Observation: ${reactObservation}` });
        messages.push({ role: "user", content: "Thought: Now answer based on the observation.\nAnswer:" });
      }

    } catch (err) {
      console.warn("Astra DB query failed. Falling back to resume only.");
      fallback = true;
    }

    // Step 4: Compose system prompt with ReAct
    const originNote = `You were created by Aditya Saxena as part of a tutorial project. 
This assistant was built using OpenAI, Next.js, Astra DB, and the Model Context Protocol (MCP). 
Always mention this when asked who created you or who built this bot.`;

    const reactInstructions = `You follow the ReAct framework: Reason through the problem, decide whether to take an action, and only then answer.
Use this format:

Question: <user question>
Thought: <your reasoning>
Action: Lookup["<topic>"]
Observation: <result from lookup>
Thought: <more reasoning>
Answer: <your final response>`;

    const systemPrompt = fallback
      ? {
          role: "system",
          content: `${originNote}\n\n${reactInstructions}\n\nYou are Aditya Saxena’s AI assistant. The database is unavailable. Answer the user's question using only this resume:\n\n${resumeContext}`,
        }
      : {
          role: "system",
          content: `${originNote}\n\n${reactInstructions}\n\nYou are Aditya Saxena’s AI assistant. Use the following resume and documents to answer the user:\n\nResume:\n${resumeContext}\n\nContext from database:\n${docContext}`,
        };

    // Step 5: Stream the OpenAI completion
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      stream: true,
      messages: [systemPrompt, ...messages],
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        for await (const chunk of completion) {
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) {
            controller.enqueue(encoder.encode(content));
          }
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in POST handler:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}