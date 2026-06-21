/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import { useState, useEffect } from "react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Clock, Download, Loader2, Send } from "lucide-react";
import Header from "@/components/ui/header";
import { usePathname } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import ScrapingSchedule from "./schedule";
import EmailTrigger from "../triggers";
import { supabase } from "@/lib/supabaseClient";
declare global {
    interface Window {
        scrapeTimeoutId?: number;
    }
}




const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://web-production-a6bf.up.railway.app";

const Index = () => {
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [isScraping, setIsScraping] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [userPrompt, setUserPrompt] = useState("");
    const [chatMessages, setChatMessages] = useState<{ role: string; content: string }[]>([]);
    const [isScraped, setIsScraped] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [storageError, setStorageError] = useState<string | null>(null);
    // Add these new state variables near your other useState declarations
    const [scheduleInfo, setScheduleInfo] = useState<{
        frequency: string;
        time: string;
        startDate: Date;
    } | null>(null);


    const [email, setEmail] = useState("");
    const [prompt, setPromt] = useState("");

    // Get the current pathname for workspace name
    const pathname = usePathname();
    const parts = pathname?.split("/") || [];
    const workspaceName = parts[2] || "Workspace"; // Extracts "News" from "/workspace/News"

    const fetchStoredUrl = async () => {
        if (!userId) return;

        try {
            const path = `${userId}/${workspaceName}/urls.txt`;
            const { data, error } = await supabase.storage.from('scrappydo').download(path);

            if (error) {
                console.log("No stored URL found for this workspace.");
                return;
            }

            if (data) {
                const storedUrl = await data.text();
                setUrl(storedUrl.trim()); // Triggers useEffect, which calls handleScrape()

            }
        } catch (err) {
            console.error("Error fetching stored URL:", err);
        }
    };

    // Check scrape status and get user ID on page load
    useEffect(() => {
        const checkScrapeStatus = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/scrape/status`);
                const data = await response.json();
                setIsScraped(data.has_content);

                if (data.has_content) {
                    setChatMessages([
                        { role: "system", content: "Website already scraped! You can ask questions now." }
                    ]);
                }
            } catch (error) {
                console.error("Error checking scrape status:", error);
            }
        };

        checkScrapeStatus();
    }, []);

    useEffect(() => {
        const getCurrentUser = async () => {
            try {
                const { data, error } = await supabase.auth.getUser();
                if (error) {
                    console.error("Error getting user:", error);
                    return;
                }
                if (data && data.user) {
                    setUserId(data.user.id);
                }
            } catch (error) {
                console.error("Error checking user:", error);
            }
        };

        getCurrentUser();
    }, []);

    useEffect(() => {
        if (userId) {
            fetchStoredUrl();
        }
    }, [userId, workspaceName]); // Fetch URL when user ID or workspace changes

    useEffect(() => {
        const theme = localStorage.getItem("theme");
        if (theme === "dark") {
            document.documentElement.classList.add("dark");
            setIsDarkMode(true);
        }
    }, []);

    // Function to save URL to Supabase storage
    const saveUrlToStorage = async (urlToSave: string) => {
        if (!userId) {
            console.log("No user ID available");
            setStorageError("User not authenticated. Cannot save URL.");
            return false;
        }

        try {
            const path = `${userId}/${workspaceName}/urls.txt`;

            // Overwrite the file with only the new URL
            const { data, error: uploadError } = await supabase.storage
                .from('scrappydo')
                .upload(path, new Blob([urlToSave]), {
                    upsert: true, // This ensures the file is replaced
                    contentType: 'text/plain'
                });

            if (uploadError) {
                console.error("Error saving URL to storage:", uploadError);
                setStorageError(`Failed to save URL to storage: ${uploadError.message}`);
                return false;
            }

            // console.log("URL saved successfully to urls.txt");
            setStorageError(null);
            return true;
        } catch (error) {
            console.error("Error in saveUrlToStorage:", error);
            setStorageError(`An error occurred while saving the URL: ${error}`);
            return false;
        }
    };

    const handleScrape = async () => {
        // console.log("scrapping", url , "this url")
        if (!url) return;
        setIsScraping(true);

        // Wait for userId to be set before proceeding
        if (!userId) {
            console.log("Waiting for userId...");
            while (!userId) {
                await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
            }
        }

        try {
            // First save the URL to storage
            const savedToStorage = await saveUrlToStorage(url);

            // Proceed with scraping
            const response = await fetch(`${API_BASE_URL}/scrape`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url }),
            });

            const data = await response.json();
            setIsScraping(false);
            setIsScraped(true);

            const messages = [
                { role: "system", content: "Website scraped successfully! You can ask questions now." },
                { role: "system", content: `Preview: ${data.content.slice(0, 200)}...` }
            ];

            // Add storage status message if applicable
            // if (savedToStorage) {
            //     messages.push({
            //         role: "system",
            //         content: `URL saved to ${workspaceName} workspace.`
            //     });
            // } else if (storageError) {
            //     messages.push({
            //         role: "system",
            //         content: `Note: ${storageError}`
            //     });
            // }

            setChatMessages(messages);
        } catch (error) {
            console.error("Scraping error:", error);
            setIsScraping(false);
            setChatMessages(prev => [...prev, {
                role: "system",
                content: "Error scraping the website. Please check the URL and try again."
            }]);

            if (storageError) {
                setChatMessages(prev => [...prev, {
                    role: "system",
                    content: `Storage error: ${storageError}`
                }]);
            }
        }
    };


    const handleSendPrompt = async () => {
        if (!userPrompt.trim()) return;

        // Add user message to chat
        setChatMessages(prev => [...prev, { role: "user", content: userPrompt }]);
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_prompt: userPrompt,
                    use_scraped_content: true // Make sure to use the scraped content
                }),
            });

            const data = await response.json();
            setChatMessages(prev => [...prev, { role: "assistant", content: data.response }]);
        } catch (error) {
            console.error("Chat API error:", error);
            setChatMessages(prev => [...prev, {
                role: "system",
                content: "Error communicating with the AI. Please try again."
            }]);
        }

        setLoading(false);
        setUserPrompt("");
    };

    const handleClearContent = async () => {
        try {
            await fetch(`${API_BASE_URL}/scrape/clear`, {
                method: "POST"
            });
            setIsScraped(false);
            setChatMessages([{ role: "system", content: "Scraped content has been cleared." }]);
        } catch (error) {
            console.error("Error clearing content:", error);
        }
    };

    // New function to export chat to CSV
    const exportChatToCSV = () => {
        // Skip if no messages to export
        if (chatMessages.length === 0) return;

        // Create CSV content
        let csvContent = "role,content\n";

        // Add each message to CSV
        chatMessages.forEach(message => {
            // Escape quotes in content and wrap in quotes
            const formattedContent = `"${message.content.replace(/"/g, '""')}"`;
            csvContent += `${message.role},${formattedContent}\n`;
        });

        // Create a Blob with the CSV content
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

        // Create a download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${workspaceName}-chat-export.csv`);

        // Append to document, trigger click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    // Add this new function to your Index component
    // Add this new function to your Index component
    const setupScheduledScraping = (scheduleInfo: { frequency: any; time: any; startDate: any; }, url: string) => {
        if (!scheduleInfo || !url) return;

        // Function to calculate time until next scheduled scrape
        const calculateTimeUntilNextScrape = () => {
            const now = new Date();
            const targetDate = new Date(scheduleInfo.startDate);

            // Extract hours and minutes from the time string (HH:MM format)
            const [hours, minutes] = scheduleInfo.time.split(':').map(Number);

            // Set the target time
            targetDate.setHours(hours, minutes, 0, 0);

            // If the target time is in the past, adjust based on frequency
            if (targetDate < now) {
                if (scheduleInfo.frequency === 'daily') {
                    // Move to next day
                    targetDate.setDate(targetDate.getDate() + 1);
                } else if (scheduleInfo.frequency === 'weekly') {
                    // Move to next week
                    targetDate.setDate(targetDate.getDate() + 7);
                } else if (scheduleInfo.frequency === 'monthly') {
                    // Move to next month
                    targetDate.setMonth(targetDate.getMonth() + 1);
                } else {
                    // One-time but already passed, return null
                    return null;
                }
            }

            // Calculate milliseconds until the target time
            return targetDate.getTime() - now.getTime();
        };

        // Function to perform the scheduled API call
        const performScheduledApiCall = async () => {
            // console.log(`Executing scheduled condition check for URL: ${url}`);

            try {
                // Call the API endpoint instead of handleScrape()
                const response = await fetch(`${API_BASE_URL}/check-and-notify`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        url: url,
                        condition_prompt: prompt, // Using the state variable you already set
                        recipient_email: email,   // Using the state variable you already set
                    }),
                });

                const result = await response.json();
                // console.log('API Response:', result);

                // You could add some user feedback here based on the API response

            } catch (error) {
                // console.error('Failed to call check-and-notify API:', error);
            }

            // If it's a recurring schedule, set up the next one
            if (scheduleInfo.frequency !== 'once') {
                const nextTimeout = calculateTimeUntilNextScrape();
                if (nextTimeout !== null) {
                    setTimeout(performScheduledApiCall, nextTimeout);
                }
            }
        };

        // Calculate initial timeout and schedule first API call
        const initialTimeout = calculateTimeUntilNextScrape();
        if (initialTimeout !== null) {
            // Store the timeout ID to clear it if needed
            const timeoutId = setTimeout(performScheduledApiCall, initialTimeout);
            return timeoutId;
        }

        return null;
    };

    // Function to handle the schedule button click
    // Add a useEffect to set up the scheduled API calls when component mounts or dependencies change
    useEffect(() => {
        // Clean up function to clear timeout when component unmounts
        return () => {
            if ((window as any).scrapeTimeoutId) {
                clearTimeout((window as any).scrapeTimeoutId);
            }
        };
    }, []);  // Empty dependency array means this runs once on mount and cleans up on unmount

    // Add a useEffect to set up the scheduled API calls whenever scheduleInfo changes
    useEffect(() => {
        // Clear any existing timeout to avoid duplicate schedules
        if ((window as any).scrapeTimeoutId) {
            clearTimeout((window as any).scrapeTimeoutId);
        }

        // Set up the new schedule if we have the necessary info
        if (scheduleInfo && url && email && prompt) {  // Added checks for email and prompt
            // You might want to add some visual feedback to the user about the scheduled check
            const formattedDate = new Date(scheduleInfo.startDate).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });

            // console.log(`Scheduled condition check for ${url} on ${formattedDate} at ${scheduleInfo.time}`);

            (window as any).scrapeTimeoutId = setupScheduledScraping(scheduleInfo, url);
        }
    }, [scheduleInfo, url, email, prompt]);  // Added email and prompt as dependencies

    // Add this effect to restore schedules from localStorage when the component mounts
    useEffect(() => {
        if (userId && workspaceName) {
            const key = `scrape-schedule-${userId}-${workspaceName}`;
            const savedSchedule = localStorage.getItem(key);

            if (savedSchedule) {
                try {
                    const parsedSchedule = JSON.parse(savedSchedule);
                    setScheduleInfo({
                        ...parsedSchedule,
                        startDate: new Date(parsedSchedule.startDate)
                    });

                    if (parsedSchedule.url) {
                        setUrl(parsedSchedule.url);
                    }
                } catch (error) {
                    console.error("Error restoring saved schedule:", error);
                }
            }
        }
    }, [userId, workspaceName]);

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
            <main className="container mx-auto py-8 px-4 relative">
                <div className="space-y-6 mb-8">
                    <div className="flex justify-between items-center"> {/* Changed to flex container with space between */}
                        <div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">
                                {workspaceName}
                            </h1>
                            <p className="text-muted-foreground">
                                Scrape websites and chat with the content using AI
                            </p>
                        </div>


                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    {/* Left side - URL input and scrape button */}
                    <div className="w-full  col-span-1 backdrop-blur-md bg-card/50 p-4 rounded-xl border border-border/50 shadow-lg space-y-4 flex flex-col self-start">

                        <h2 className="text-lg font-semibold">Website Scraper</h2>

                        <div className="space-y-2">
                            <label htmlFor="url" className="text-sm font-medium">Website URL</label>
                            <Input
                                id="url"
                                placeholder="https://example.com"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                className="bg-background/50 backdrop-blur-sm"
                            />
                        </div>

                        <Button
                            className="w-full bg-primary/90 hover:bg-primary/100 backdrop-blur-sm transition-all duration-300"
                            onClick={handleScrape}
                            disabled={isScraping}
                        >
                            {isScraping ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Scraping...
                                </>
                            ) : (
                                "Scrape Website"
                            )}
                        </Button>

                        {isScraped && (
                            <Button
                                variant="outline"
                                className="w-full"
                                onClick={handleClearContent}
                            >
                                Clear Scraped Content
                            </Button>
                        )}
                        {/* Export button */}
                        <Button
                            onClick={exportChatToCSV}
                            variant="outline"
                            className="w-full"
                            disabled={chatMessages.length === 0}
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Export CSV
                        </Button>
                        <ScrapingSchedule
                            onSchedule={(scheduleData) => {
                                // Store the schedule data in state
                                setScheduleInfo(scheduleData);

                                // Add a message to the chat to inform the user
                                const formattedDate = scheduleData.startDate.toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric'
                                });



                                // Log for debugging
                                // console.log('Scraping scheduled:', {
                                //     url,
                                //     ...scheduleData,
                                //     prompt,
                                //     formattedStartDate: scheduleData.startDate.toLocaleString(),
                                // });

                                // Save to localStorage for persistence across page refreshes
                                if (userId) {
                                    const key = `scrape-schedule-${userId}-${workspaceName}`;
                                    localStorage.setItem(key, JSON.stringify({
                                        url,
                                        ...scheduleData,
                                        startDate: scheduleData.startDate.toISOString()
                                    }));
                                }
                            }}
                        />
                    </div>

                    {/* Right side - Chat interface and EmailTrigger below it */}
                    <div className="col-span-2 flex flex-col space-y-4">
                        <div className="backdrop-blur-md bg-card/50 p-6 rounded-xl border border-border/50 shadow-lg space-y-4 h-[600px] flex flex-col">
                            <h2 className="text-xl font-semibold">
                                Chat with Website Content {isScraped && <span className="text-sm text-green-500 ml-2">(Content Loaded)</span>}
                            </h2>

                            <div className="flex-grow overflow-auto space-y-4 py-2 custom-scrollbar">
                                {chatMessages.length === 0 && !isScraped ? (
                                    <p className="text-muted-foreground text-center">
                                        Scrape a website first, then chat with the content.
                                    </p>
                                ) : (
                                    chatMessages.map((message, index) => (
                                        <div
                                            key={index}
                                            className={`${message.role === "user"
                                                ? "ml-auto bg-primary/20 backdrop-blur-md"
                                                : message.role === "system"
                                                    ? "mx-auto bg-muted/50 backdrop-blur-md text-center"
                                                    : "mr-auto bg-card backdrop-blur-md border border-border/50"
                                                } p-3 rounded-xl max-w-[80%]`}
                                        >
                                            {message.content.includes("|") ? (
                                                <div className="overflow-auto">
                                                    <ReactMarkdown remarkPlugins={[remarkGfm]} >
                                                        {message.content}
                                                    </ReactMarkdown>
                                                </div>
                                            ) : (
                                                <p className="text-sm">{message.content}</p>
                                            )}
                                        </div>
                                    ))
                                )}
                                {loading && (
                                    <div className="flex justify-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    </div>
                                )}
                            </div>

                            <div className="relative">
                                <Textarea
                                    placeholder={isScraped ? "Ask about the scraped website..." : "Scrape a website first..."}
                                    value={userPrompt}
                                    onChange={(e) => setUserPrompt(e.target.value)}
                                    className="resize-none pr-12 bg-background/50 backdrop-blur-sm"
                                    rows={3}
                                    disabled={!isScraped || loading}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendPrompt();
                                        }
                                    }}
                                />
                                <Button
                                    className="absolute right-2 bottom-2 p-2 h-8 w-8"
                                    onClick={handleSendPrompt}
                                    disabled={!isScraped || !userPrompt.trim() || loading}
                                    variant="ghost"
                                >
                                    {loading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Send className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        {/* EmailTrigger component below the chat interface */}
                        <div className=" bg-card/50  rounded-xl  shadow-lg">
                            <EmailTrigger
                                onTriggerSetup={(triggerConfig) => {
                                    console.log('Email Trigger Configured:', triggerConfig);
                                    setEmail(triggerConfig.email)
                                    setPromt(triggerConfig.prompt)
                                }}
                            />
                            {scheduleInfo && (
                                <div className=" p-3  text-sm text-center flex items-center justify-center space-x-2">
                                    <Calendar className="h-4 w-4 text-primary" />
                                    <Clock className="h-4 w-4 text-primary" />
                                    <span>
                                        Scraping scheduled: {scheduleInfo.startDate.toLocaleDateString('en-US', {
                                            weekday: 'short',
                                            month: 'short',
                                            day: 'numeric'
                                        })} at {scheduleInfo.time} ({scheduleInfo.frequency})
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            </main>
        </div>
    );
};

export default Index;