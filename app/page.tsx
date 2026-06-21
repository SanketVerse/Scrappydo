/* eslint-disable @typescript-eslint/no-unused-vars */
"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useRouter } from "next/navigation"
import Header from "@/components/ui/header"

// API base URL - update this to your FastAPI server URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://web-production-a6bf.up.railway.app"

export default function Home() {
  const router = useRouter()
  const [workspaces, setWorkspaces] = useState<string[]>([])
  const [url, setUrl] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [chatMessages, setChatMessages] = useState<{role: string, content: string}[]>([])
  const [scraped, setScraped] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    // Load theme
    const theme = localStorage.getItem("theme")
    if (theme === "dark") {
      document.documentElement.classList.add("dark")
      setIsDarkMode(true)
    }

    // Load workspaces
    const savedWorkspaces = JSON.parse(localStorage.getItem("workspaces") || "[]")
    setWorkspaces(savedWorkspaces)
  }, [])

  const handleScrape = async () => {
    if (!url) {
      alert("Please enter a URL to scrape")
      return
    }
    
    if (!description) {
      alert("Please describe what you want to extract")
      return
    }
    
    setLoading(true)
    
    
    
    try {
      // First call the scrape endpoint
      const scrapeResponse = await fetch(`${API_BASE_URL}/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })
      
      const scrapeData = await scrapeResponse.json()
      
      if (scrapeResponse.ok) {
        setScraped(true)
        
        // Modified: Add system message about successful scraping
        setChatMessages(prev => [...prev, {
          role: "system",
          content: `Website scraped successfully. Analyzing data...`
        }])
        
        // Then call the chat endpoint with the user's prompt
        const chatResponse = await fetch(`${API_BASE_URL}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            user_prompt: `${description}. If you find products with names and prices, format them as a markdown table with columns for Product Name and Price.`,
            use_scraped_content: true
          }),
        })
        
        const chatData = await chatResponse.json()
        
        if (chatResponse.ok) {
          // Add assistant message with formatted response
          setChatMessages(prev => [...prev, {
            role: "assistant",
            content: chatData.response
          }])
        } else {
          setChatMessages(prev => [...prev, {
            role: "assistant",
            content: `Error: ${chatData.detail || "Failed to get AI response"}`
          }])
        }
      } else {
        setChatMessages(prev => [...prev, {
          role: "assistant",
          content: `Error: ${scrapeData.detail || "Failed to scrape website"}`
        }])
      }
    } catch (error) {
      console.error("API call failed:", error)
      setChatMessages(prev => [...prev, {
        role: "assistant",
        content: "Error: Could not connect to server"
      }])
    } finally {
      setLoading(false)
    }
  }

  // Clear chat messages
  const handleClear = () => {
    setChatMessages([])
    setScraped(false)
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Accent color blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl dark:bg-blue-500/10" />
        <div className="absolute -bottom-40 right-1/3 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl dark:bg-purple-500/10" />
      </div>

      {/* Header */}
      <Header />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-3xl relative">
        <div className="space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
              AI Web Scraper
            </h1>
            <p className="text-muted-foreground text-center">
              Enter a website URL and describe what data you want to extract
            </p>
          </div>

          <div className="space-y-4 backdrop-blur-md bg-card/50 p-6 rounded-xl border border-border/50 shadow-lg">
            <div className="space-y-2">
              <label htmlFor="url" className="text-sm font-medium">
                Website URL
              </label>
              <Input
                id="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="bg-background/50 backdrop-blur-sm"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Describe what you want to parse
              </label>
              <Textarea
                id="description"
                placeholder="e.g., Extract all product names and prices"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[100px] bg-background/50 backdrop-blur-sm"
              />
            </div>

            <div className="flex space-x-3">
              <Button 
                className="flex-1 bg-primary/90 hover:bg-primary/100 backdrop-blur-sm"
                onClick={handleScrape}
                disabled={loading || !url || !description}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Processing..." : "Scrape & Analyze"}
              </Button>
              
              {chatMessages.length > 0 && (
                <Button
                  variant="outline"
                  onClick={handleClear}
                  className="backdrop-blur-sm"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {chatMessages.length > 0 && (
            <div className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-md shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Analysis Results</h2>
              <div className="space-y-4">
                {chatMessages.map((message, index) => (
                  <div
                    key={index}
                    className={`${message.role === "user"
                      ? "ml-auto bg-primary/20 backdrop-blur-md"
                      : message.role === "system"
                        ? "mx-auto bg-muted/50 backdrop-blur-md text-center"
                        : "mr-auto bg-card backdrop-blur-md border border-border/50"
                      } p-4 rounded-xl max-w-[95%] w-full`}
                  >
                    <div className="overflow-auto prose dark:prose-invert prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}