import { DataAPIClient } from "@datastax/astra-db-ts";
// import { PuppeteerWebBaseLoader } from "langchain/document_loaders/web/puppeteer"; // Removed as it is unused and causing an error
import { OpenAI } from "openai";
import "dotenv/config";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import "dotenv/config"
const { 
    ASTRA_DB_NAMESPACE, 
    ASTRA_DB_COLLECTION, 
    ASTRA_DB_API_ENDPOINT, 
    ASTRA_DB_APPLICATION_TOKEN, 
    OPENAI_API_KEY
 } = process.env;