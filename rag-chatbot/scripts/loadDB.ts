// Import necessary modules and libraries
import { DataAPIClient } from "@datastax/astra-db-ts";
import { OpenAI } from "openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import "dotenv/config";
import puppeteer from "puppeteer";

// Define the type for similarity metrics
type SimilarityMetric = "dot_product" | "cosine" | "euclidean";

// Load environment variables
const {
    ASTRA_DB_NAMESPACE,
    ASTRA_DB_COLLECTION,
    ASTRA_DB_API_ENDPOINT,
    ASTRA_DB_APPLICATION_TOKEN,
    OPENAI_API_KEY
} = process.env;

// Ensure all required environment variables are present
if (!ASTRA_DB_NAMESPACE || !ASTRA_DB_COLLECTION || !ASTRA_DB_API_ENDPOINT || !ASTRA_DB_APPLICATION_TOKEN || !OPENAI_API_KEY) {
    throw new Error("Missing required environment variables. Please check your .env file.");
}

// Initialize OpenAI client with the API key
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// List of URLs to scrape and process
const vector_a_data = [
    'https://www.timeshighereducation.com/world-university-rankings/panjab-university',
    'https://www.timeshighereducation.com/world-university-rankings/university-bristol'
];

// Initialize Astra DB client
const my_client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = my_client.db(ASTRA_DB_API_ENDPOINT, {
    keyspace: ASTRA_DB_NAMESPACE
});

// Configure text splitter for chunking large text into smaller pieces
const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1024, // Maximum size of each chunk
    chunkOverlap: 100 // Overlap between chunks to preserve context
});

/**
 * Create a collection in Astra DB with specified similarity metric
 * @param similarityMetric - Metric to use for vector similarity
 */
const createCollection = async (similarityMetric: SimilarityMetric = "dot_product") => {
    try {
        const res = await db.createCollection(ASTRA_DB_COLLECTION, {
            vector: {
                dimension: 1536, // Dimension of the embedding vectors
                metric: similarityMetric // Similarity metric to use
            }
        });
        console.log("Collection created:", res);
    } catch (error) {
        console.error("Error creating collection:", error);
    }
};

/**
 * Scrape the main content of a webpage
 * @param url - URL of the webpage to scrape
 * @returns The cleaned text content of the page
 */
const scrapePage = async (url: string): Promise<string> => {
    try {
        const browser = await puppeteer.launch({ headless: true }); // Launch Puppeteer in headless mode
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: "domcontentloaded" }); // Wait for the DOM to load

        // Extract the main content of the page
        const content = await page.evaluate(() => {
            const main = document.querySelector("main") || document.body;
            return main.innerText || "";
        });

        await browser.close(); // Close the browser

        // Clean and truncate the content to 10,000 characters
        const cleaned = content.replace(/\s+/g, " ").trim();
        return cleaned.slice(0, 10000);
    } catch (error) {
        console.error(`Error scraping page ${url}:`, error);
        return ""; // Return an empty string on error
    }
};

/**
 * Generate an embedding for a text chunk using OpenAI
 * @param chunk - Text chunk to embed
 * @returns The embedding vector
 */
const embedChunk = async (chunk: string) => {
    for (let attempt = 0; attempt < 3; attempt++) { // Retry up to 3 times
        try {
            return await openai.embeddings.create({
                model: "text-embedding-3-small", // Model to use for embeddings
                input: chunk,
                encoding_format: "float" // Encoding format for the embedding
            });
        } catch (err: any) {
            if (err.status === 429) { // Handle rate-limiting errors
                console.warn("Rate limited. Retrying in 5 seconds...");
                await new Promise((r) => setTimeout(r, 5000)); // Wait before retrying
            } else {
                throw err; // Throw other errors
            }
        }
    }
    throw new Error("Failed to embed after 3 attempts."); // Throw error if all attempts fail
};

/**
 * Load sample data into the Astra DB collection
 */
const loadSampleData = async () => {
    try {
        const collection = await db.collection(ASTRA_DB_COLLECTION); // Get the collection
        for (const url of vector_a_data) { // Iterate over each URL
            try {
                const content = await scrapePage(url); // Scrape the page content
                const chunks = await splitter.splitText(content); // Split content into chunks

                for (const chunk of chunks) { // Process each chunk
                    try {
                        const embedding = await embedChunk(chunk); // Generate embedding for the chunk
                        const vector = embedding.data[0].embedding; // Extract the embedding vector

                        // Insert the chunk and its embedding into the collection
                        const res = await collection.insertOne({
                            $vector: vector,
                            text: chunk
                        });

                        console.log(`Inserted chunk from ${url}:`, res);
                    } catch (chunkError) {
                        console.error(`Error processing chunk from ${url}:`, chunkError);
                    }
                }
            } catch (urlError) {
                console.error(`Error scraping URL ${url}:`, urlError);
            }
        }
    } catch (error) {
        console.error("Error loading sample data:", error);
    }
};

/**
 * Main function to create the collection and load sample data
 */
const main = async () => {
    await createCollection(); // Create the collection
    await loadSampleData(); // Load sample data into the collection
};

// Execute the main function and handle any unhandled errors
main().catch((error) => {
    console.error("Unhandled error:", error);
});