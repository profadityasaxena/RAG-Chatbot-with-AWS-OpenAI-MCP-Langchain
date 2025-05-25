import "./global.css";

export const metadata = {
    title: "RAG Chatbot",
    description: "A simple RAG Chatbot using OpenAI, MCP, Next.js and LangChain"
}

const RootLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <html lang="en">
            <body>
                { children }
            </body>
        </html>
    )
}
export default RootLayout