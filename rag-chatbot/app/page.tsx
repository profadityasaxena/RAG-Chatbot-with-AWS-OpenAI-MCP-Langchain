"use client"
import Image from "next/image"
import logo from "./assets/logo.png"
import { useChat } from "ai/react"
import { Message } from "ai"

const Home = () => {
    const { append, isLoading, messages, input, handleInputChange, handleSubmit } = useChat()

    const noMessages = false
    return (
        <main>
            <Image src= {logo} alt="Logo" width={600} height={100} />
            <section className={noMessages ? "" : "populated"}>
                { noMessages ? (
                    <>
                        <p className = "starter-text">
                        Welcome to Aditya Saxena’s personal chatbot. This platform is designed to provide you with an interactive and informative overview of my professional journey. You can explore details about my educational background, work experience, achievements, certifications, technical skills, and current projects. Whether you’re a recruiter, collaborator, or industry peer, this chatbot offers a quick and comprehensive way to understand my profile, qualifications, and areas of expertise.
                        </p>
                        <br />
                        { /* PROMPT SUGGESTION */ }
                    </>
                ) : (
                    <>
                        { /* map messages onto text bubbles */}
                        { /* <LoadingBubble> */}
                    </>
                )}

                <form onSubmit={handleSubmit}>
                    <input className="question-box" onChange={handleInputChange} value = {input} placeholder="What's your query?"/>
                    <input type="submit" value="Send" />
                </form>
            </section>
        </main>
    )
}

export default Home