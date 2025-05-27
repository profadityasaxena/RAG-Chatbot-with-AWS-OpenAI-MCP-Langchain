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
    const latestMessage = messages[messages.length - 1]?.content?.trim();

    if (!latestMessage) {
      return new Response("Empty message received.", { status: 400 });
    }

    // Step 1: Load resume.txt
    let resumeContext = "";
    try {
      const resumePath = path.resolve(process.cwd(), "public/resume.txt");
      resumeContext = await fs.readFile(resumePath, "utf-8");
      if (!resumeContext.trim()) console.warn("[RESUME] File is empty.");
    } catch (err) {
      console.warn("[RESUME] Read failed:", err);
    }

    // Step 2: Add MCP enrichment (used only to support answers)
    const knownEntities = [
      "Amazon",
      "Toronto Metropolitan University",
      "DataStax",
      "Dalisoft Technologies",
      "Ryerson University"
    ];
    const entityLookup: Record<string, string> = {
      "Amazon": "Amazon is a global leader in e-commerce and cloud computing services.",
      "Toronto Metropolitan University": "Toronto Metropolitan University is a renowned urban research institution in Canada.",
      "DataStax": "DataStax provides scalable cloud-native database solutions based on Apache Cassandra.",
      "Dalisoft Technologies": "Dalisoft Technologies specializes in building automation systems and energy monitoring.",
      "Ryerson University": "Ryerson University (now TMU) is known for innovation and applied research.",
    };
    const mcpContext = knownEntities
      .map(e => `- **${e}**: ${entityLookup[e]}`)
      .join("\n");

    // Step 3: Generate embedding for similarity search
    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: latestMessage,
      encoding_format: "float",
    });
    const embedding = embeddingResponse.data[0]?.embedding;

    // Step 4: Query Astra DB (optional)
    let docContext = "";
    let fallback = false;
    try {
      const collection = await db.collection(ASTRA_DB_COLLECTION!);
      const cursor = await collection.find(null, {
        sort: { $vector: embedding },
        limit: 10,
      });
      const docs = await cursor.toArray();
      docContext = docs.map((d) => d.text).join("\n\n");
    } catch (err) {
      console.warn("[ASTRA DB] Query failed:", err);
      fallback = true;
    }

    // Step 5: Compose system prompt
    const systemPrompt = {
      role: "system",
      content: `
You are a helpful AI assistant created by Aditya Saxena.

You follow the ReAct reasoning framework and **must output each stage visibly** in this exact format:

---

### Question:
<user's question>

### Thought:
<what you're thinking>

### Action:
Lookup["<optional action>"]

### Observation:
<result>

### Thought:
<refined reasoning>

### Answer:
<final response referring to Aditya Saxena in third person>

---

Use **RESUME** as your primary source. Use **MCP** or **ASTRA** content only to enrich or support responses. Never override the RESUME.

---

### RESUME:
${resumeContext || "_[No resume found]_"}
---

### ENTITY CONTEXT (MCP):
${mcpContext}
---

${!fallback ? `### ASTRA CONTEXT:\n${docContext}\n---` : ""}
      `.trim(),
    };

    // Step 6: Stream OpenAI response
    const completion = await openai.chat.completions.create({
        model: "gpt-4-1106-preview", // ✅ switch from gpt-3.5-turbo
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

  } catch (err) {
    console.error("[POST /api/chat] Internal Error:", err);
    return new Response("Internal Server Error", { status: 500 });
  }
}