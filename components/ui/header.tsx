/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Bot, ChevronDown, Plus, Sun, Moon, Trash2, LogOut } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"

import { supabase } from "@/lib/supabaseClient";

export default function Header() {
  const router = useRouter()
  const [workspaces, setWorkspaces] = useState<string[]>([])
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [message, setMessage] = useState("");
  const [user, setUser] = useState<any>(null); // Store user info here
  const [initialAuthCheckComplete, setInitialAuthCheckComplete] = useState(false);

  // Load workspaces for the current user from Supabase
  const loadUserWorkspaces = async (userId: string) => {
    if (!userId) return;
    
    try {
      // List all objects in the user's folder in storage
      const { data, error } = await supabase.storage
        .from("scrappydo")
        .list(userId + "/", {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' }
        });
      
      if (error) {
        console.error("Error loading workspaces:", error);
        return;
      }
      
      // Extract workspace names from the paths
      // The format is typically userId/workspaceName/.keep
      const userWorkspaces = data
        .filter(item => !item.name.endsWith(".keep")) // Filter out .keep files
        .map(item => {
          // Extract workspace name from the path
          const folderName = item.name;
          return folderName;
        });
      
      setWorkspaces(userWorkspaces);
    } catch (error) {
      console.error("Failed to load workspaces:", error);
    }
  };

  useEffect(() => {
    // Set theme preference from localStorage
    const darkModePref = localStorage.getItem("theme") === "dark"
    setIsDarkMode(darkModePref)
    
    // Check user status on component mount
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      
      // If user is logged in, load their workspaces
      if (session?.user) {
        loadUserWorkspaces(session.user.id);
      }
      
      // Mark initial auth check as complete
      setInitialAuthCheckComplete(true);
    };
    
    checkSession();

    // Set up the authentication state change listener
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null); // Update user when auth state changes
      
      if (session?.user) {
       
        loadUserWorkspaces(session.user.id); // Load workspaces when user logs in
        
        
      } else if (event === 'SIGNED_OUT') {
        // Clear workspaces if user logs out
        setWorkspaces([]);
        router.push("/"); // Redirect to home after logout
      }
    });

    // Clean up listener when component unmounts
    return () => {
      data.subscription.unsubscribe();
    };
  }, [router]);

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `/`,
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error("Google Login Failed:", error);
      setMessage("Something went wrong. Please try again.");
    }
  };

  const toggleTheme = () => {
    const newTheme = isDarkMode ? "light" : "dark"
    document.documentElement.classList.toggle("dark", !isDarkMode)
    localStorage.setItem("theme", newTheme)
    setIsDarkMode(!isDarkMode)
  }

  const createWorkspace = async () => {
    if (!user) {
      alert("You must be logged in to create a workspace.");
      return;
    }
  
    const newWorkspace = prompt("Enter workspace name:")?.trim();
    if (!newWorkspace) return;
  
    if (workspaces.includes(newWorkspace)) {
      alert("Workspace already exists!");
      return;
    }
  
    const userId = user.id; // Get the authenticated user ID
    const workspacePath = `${userId}/${newWorkspace}/`;
  
    try {
      // Create an empty file to represent the folder
      const { error } = await supabase.storage.from("scrappydo").upload(`${workspacePath}.keep`, new Blob(), {
        cacheControl: "3600",
        upsert: false,
      });
  
      if (error) {
        throw error;
      }
  
      // Update the workspaces state
      const updatedWorkspaces = [...workspaces, newWorkspace];
      setWorkspaces(updatedWorkspaces);
      
      router.push(`/workspace/${newWorkspace}`);
    } catch (error) {
      console.error("Failed to create workspace:", error);
      alert("Failed to create workspace. Please try again.");
    }
  };
  
  const deleteWorkspace = async (workspaceName: string) => {
    if (!user) return;
    
    const confirmDelete = confirm(`Are you sure you want to delete "${workspaceName}"?`);
    if (!confirmDelete) return;

    const userId = user.id;
    const workspacePath = `${userId}/${workspaceName}/`;
    
    try {
      // First try to list all files in the workspace to delete them
      const { data: files, error: listError } = await supabase.storage
        .from("scrappydo")
        .list(workspacePath);
        
      if (listError) throw listError;
      
      // Delete all files in the workspace
      if (files && files.length > 0) {
        const filePaths = files.map(file => `${workspacePath}${file.name}`);
        const { error: deleteFilesError } = await supabase.storage
          .from("scrappydo")
          .remove(filePaths);
          
        if (deleteFilesError) throw deleteFilesError;
      }
      
      // Delete the .keep file that represents the folder
      const { error: deleteKeepError } = await supabase.storage
        .from("scrappydo")
        .remove([`${workspacePath}.keep`]);
        
      if (deleteKeepError) throw deleteKeepError;
      
      // Update workspaces state
      const updatedWorkspaces = workspaces.filter((w) => w !== workspaceName);
      setWorkspaces(updatedWorkspaces);
      
      router.push("/"); // Redirect to home after deletion
    } catch (error) {
      console.error("Failed to delete workspace:", error);
      alert("Failed to delete workspace. Please try again.");
    }
  }

  const navigateToWorkspace = (workspace: string) => {
    router.push(`/workspace/${workspace}`);
  }

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout Failed:", error);
    } else {
      setUser(null);
      setWorkspaces([]); // Clear workspaces on logout
      // No need to redirect here as the auth state listener will handle it
    }
  }

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/")}>
          <Bot className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl text-primary">ScrappyDo</span>
        </div>

        {/* Right Section (Workspaces + Theme Toggle + User Avatar) */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <Button variant="ghost" onClick={toggleTheme} className="p-2">
            {isDarkMode ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-gray-700" />}
          </Button>

          {/* Conditionally render workspaces dropdown if user is logged in */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  Workspaces <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {/* Home Option */}
                <DropdownMenuItem onClick={() => router.push("/")}>
                  🏠 Home
                </DropdownMenuItem>

                {/* Divider */}
                <DropdownMenuSeparator />

                {/* Workspaces */}
                {workspaces.length > 0 ? (
                  workspaces.map((workspace, index) => (
                    <DropdownMenuItem key={index} className="flex justify-between items-center">
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
                <DropdownMenuItem onClick={createWorkspace} className="text-primary">
                  <Plus className="h-4 w-4 mr-2" /> Create Workspace
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            // If user is not logged in, show the login button
            <div className="grid gap-4">
              <Button variant="outline" className="w-full" onClick={handleGoogleLogin}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
                  <path
                    d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                    fill="currentColor"
                  />
                </svg>
                Sign in with Google
              </Button>
            </div>
          )}

          {/* User Avatar (if logged in) */}
          {user && user.user_metadata?.avatar_url && (
            <div className="relative group">
              <img
                src={user.user_metadata.avatar_url}
                alt="User Avatar"
                className="w-8 h-8 rounded-full cursor-pointer"
              />
              <div className="absolute right-0 hidden group-hover:block bg-white p-2 rounded-md shadow-lg">
                <Button variant="outline" className="flex items-center gap-2" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" /> Logout
                </Button>
              </div>
            </div>
          )}

          
        </div>
      </div>
    </header>
  )
}