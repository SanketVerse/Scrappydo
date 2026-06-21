import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

const isPlaceholder = !supabaseUrl || supabaseUrl.includes("placeholder");

// Mock Client Implementation for local development without Supabase credentials
class MockSupabaseClient {
  private authCallbacks: Array<(event: string, session: any) => void> = [];
  
  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (e.key === "mock_supabase_logged_in") {
          this.triggerAuthChange();
        }
      });
    }
  }

  private getSessionData() {
    if (typeof window === "undefined") return null;
    const isLoggedIn = localStorage.getItem("mock_supabase_logged_in") === "true";
    if (!isLoggedIn) return null;
    return {
      user: {
        id: "mock-developer-id",
        email: "developer@example.com",
        user_metadata: {
          full_name: "Local Developer",
          avatar_url: "https://api.dicebear.com/7.x/bottts/svg?seed=local-dev"
        }
      }
    };
  }

  private triggerAuthChange(event = "SIGNED_IN") {
    const session = this.getSessionData();
    const ev = session ? event : "SIGNED_OUT";
    this.authCallbacks.forEach(cb => {
      try {
        cb(ev, session ? { user: session.user } : null);
      } catch (err) {
        console.error("Error in auth callback:", err);
      }
    });
  }

  auth = {
    getSession: async () => {
      const session = this.getSessionData();
      return { data: { session }, error: null };
    },
    getUser: async () => {
      const session = this.getSessionData();
      return { data: { user: session ? session.user : null }, error: null };
    },
    signInWithOAuth: async ({ provider }: { provider: string }) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("mock_supabase_logged_in", "true");
        this.triggerAuthChange("SIGNED_IN");
        window.location.reload();
      }
      return { data: {}, error: null };
    },
    signOut: async () => {
      if (typeof window !== "undefined") {
        localStorage.setItem("mock_supabase_logged_in", "false");
        this.triggerAuthChange("SIGNED_OUT");
        window.location.reload();
      }
      return { error: null };
    },
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      this.authCallbacks.push(callback);
      const session = this.getSessionData();
      // Defer execution slightly to make sure components are mounted
      setTimeout(() => {
        callback(session ? "SIGNED_IN" : "SIGNED_OUT", session ? { user: session.user } : null);
      }, 0);
      
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              this.authCallbacks = this.authCallbacks.filter(cb => cb !== callback);
            }
          }
        }
      };
    }
  };

  storage = {
    from: (bucketName: string) => {
      return {
        list: async (path: string, options?: any) => {
          if (typeof window === "undefined") return { data: [], error: null };
          
          const prefix = `mock_storage_${bucketName}_${path}`;
          const itemsMap = new Map<string, any>();
          
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(prefix)) {
              const relativePath = key.substring(prefix.length);
              const parts = relativePath.split('/');
              const firstPart = parts[0];
              
              if (parts.length > 1) {
                // Directory
                itemsMap.set(firstPart, { name: firstPart, id: firstPart, created_at: new Date().toISOString() });
              } else {
                // File
                itemsMap.set(firstPart, { name: firstPart, id: firstPart, metadata: { size: 100 }, created_at: new Date().toISOString() });
              }
            }
          }
          
          return { data: Array.from(itemsMap.values()), error: null };
        },
        
        upload: async (path: string, blob: Blob, options?: any) => {
          if (typeof window === "undefined") return { data: null, error: null };
          
          const text = await blob.text();
          localStorage.setItem(`mock_storage_${bucketName}_${path}`, text);
          return { data: { path }, error: null };
        },
        
        download: async (path: string) => {
          if (typeof window === "undefined") return { data: null, error: { message: "Window undefined" } };
          
          const content = localStorage.getItem(`mock_storage_${bucketName}_${path}`);
          if (content === null) {
            return { data: null, error: { message: "Object not found" } };
          }
          
          const blob = new Blob([content], { type: "text/plain" });
          return { data: blob, error: null };
        },
        
        remove: async (paths: string[]) => {
          if (typeof window === "undefined") return { data: null, error: null };
          
          paths.forEach(path => {
            localStorage.removeItem(`mock_storage_${bucketName}_${path}`);
          });
          return { data: paths.map(p => ({ name: p })), error: null };
        }
      };
    }
  };
}

export const supabase = isPlaceholder 
  ? (new MockSupabaseClient() as any) 
  : createClient(supabaseUrl, supabaseAnonKey)
