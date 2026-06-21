/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Bot, ChevronDown, Plus, Sun, Moon, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"

export default function Header() {
  const router = useRouter()
  const [workspaces, setWorkspaces] = useState<string[]>([])
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Load workspaces from LocalStorage
  const loadWorkspaces = () => {
    try {
      const savedWorkspaces = JSON.parse(localStorage.getItem("workspaces") || "[]")
      setWorkspaces(savedWorkspaces)
    } catch (error) {
      console.error("Failed to load workspaces:", error)
    }
  }

  useEffect(() => {
    // Set theme preference from localStorage
    const darkModePref = localStorage.getItem("theme") === "dark"
    setIsDarkMode(darkModePref)
    
    // Load workspaces
    loadWorkspaces()

    // Listen to changes to sync between pages
    const handleStorageChange = () => {
      loadWorkspaces()
    }
    window.addEventListener("storage", handleStorageChange)
    return () => window.removeEventListener("storage", handleStorageChange)
  }, [])

  const toggleTheme = () => {
    const newTheme = isDarkMode ? "light" : "dark"
    document.documentElement.classList.toggle("dark", !isDarkMode)
    localStorage.setItem("theme", newTheme)
    setIsDarkMode(!isDarkMode)
  }

  const createWorkspace = () => {
    const newWorkspace = prompt("Enter workspace name:")?.trim()
    if (!newWorkspace) return

    if (workspaces.includes(newWorkspace)) {
      alert("Workspace already exists!")
      return
    }

    const updatedWorkspaces = [...workspaces, newWorkspace]
    setWorkspaces(updatedWorkspaces)
    localStorage.setItem("workspaces", JSON.stringify(updatedWorkspaces))
    
    // Dispatch storage event to notify other components in same window
    window.dispatchEvent(new Event("storage"))
    
    router.push(`/workspace/${newWorkspace}`)
  }
  
  const deleteWorkspace = (workspaceName: string) => {
    const confirmDelete = confirm(`Are you sure you want to delete "${workspaceName}"?`)
    if (!confirmDelete) return

    try {
      const updatedWorkspaces = workspaces.filter((w) => w !== workspaceName)
      setWorkspaces(updatedWorkspaces)
      localStorage.setItem("workspaces", JSON.stringify(updatedWorkspaces))
      
      // Clear saved URL for this workspace
      localStorage.removeItem(`scrappydo_url_${workspaceName}`)
      
      // Dispatch storage event
      window.dispatchEvent(new Event("storage"))
      
      router.push("/")
    } catch (error) {
      console.error("Failed to delete workspace:", error)
      alert("Failed to delete workspace. Please try again.")
    }
  }

  const navigateToWorkspace = (workspace: string) => {
    router.push(`/workspace/${workspace}`)
  }

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
          <Bot className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl text-primary">ScrappyDo</span>
        </div>

        {/* Right Section (Workspaces + Theme Toggle) */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <Button variant="ghost" onClick={toggleTheme} className="p-2">
            {isDarkMode ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-gray-700" />}
          </Button>

          {/* Workspaces Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                Workspaces <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Home Option */}
              <DropdownMenuItem onClick={() => router.push("/")} className="cursor-pointer">
                🏠 Home
              </DropdownMenuItem>

              {/* Divider */}
              <DropdownMenuSeparator />

              {/* Workspaces list */}
              {workspaces.length > 0 ? (
                workspaces.map((workspace, index) => (
                  <DropdownMenuItem key={index} className="flex justify-between items-center gap-4">
                    <span
                      onClick={() => navigateToWorkspace(workspace)}
                      className="cursor-pointer flex-1 hover:text-primary transition"
                    >
                      {workspace}
                    </span>
                    <Trash2
                      className="h-4 w-4 text-red-500 cursor-pointer hover:text-red-700"
                      onClick={(e) => {
                        e.stopPropagation() // Prevents navigation when clicking delete
                        deleteWorkspace(workspace)
                      }}
                    />
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>No Workspaces</DropdownMenuItem>
              )}

              {/* Create Workspace Option */}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={createWorkspace} className="text-primary cursor-pointer">
                <Plus className="h-4 w-4 mr-2" /> Create Workspace
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}