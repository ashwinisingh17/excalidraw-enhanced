"use client";
import React, { useState } from "react";
// import { Code2, Pencil, MessageCircle, Loader2, Terminal } from "lucide-react";
import { Code2, Loader2, Terminal } from "lucide-react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { HTTP_Backend } from "@/config";
import Link from "next/link";

export default function SignIn() {
    const [isLoading, setIsLoading] = useState(false);
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<{ field?: string; message: string } | null>(null);
    const router = useRouter();
  
    async function handleSignin(event: React.FormEvent) {
      event.preventDefault();
      setError(null); // Reset error on new submission
  
      // Frontend Validation
      if (!username.trim() || !password.trim()) {
        setError({ message: "All fields are required!" });
        return;
      }
  
      try {
        setIsLoading(true);
        const response = await axios.post(`${HTTP_Backend}/signin`, {
          username,
          password,
        });
        localStorage.setItem('token',response.data.token);
  
        if (response.status === 200) {
          router.push("/join");
        } else {
          setError({ message: response.data.msg || "Signin failed. Please try again." });
        }
      } catch (error: any) {
          console.error("Signin error", error);
          if (error.response) {
            if (error.response.status === 400) {
              setError({ message: "Internal Server Error, Try again" });
            } else if (error.response.status === 411) {
              setError({ field: "username", message: "Username and password doesn't match" });
            } else {
              setError({ message: "Internal Server Error, Try again" });
            }
          } else {
            setError({ message: "Network error. Please check your connection." });
          }
        } finally {
          setIsLoading(false);
        }
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-rose-300 via-teal-50 to-cyan-200 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -inset-[10px] opacity-40">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-200/30 rounded-full blur-[140px] animate-pulse" />
            <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-teal-200/30 rounded-full blur-[140px] animate-pulse delay-75" />
            <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-cyan-200/30 rounded-full blur-[140px] animate-pulse delay-150" />
          </div>
        </div>
  
        {/* Floating Icons */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 animate-float-slow">
            <Code2 size={24} className="text-rose-500/40" />
          </div>
          <div className="absolute bottom-20 right-20 animate-float-slower">
            <Terminal size={28} className="text-teal-400/40" />
          </div>
        </div>
  
        {/* Main Content */}
        <div className="relative z-10 w-full max-w-lg">
          <div className="bg-white/95 backdrop-blur-xl rounded-[3rem] shadow-2xl border border-white">
            <div className="p-8">
              {/* Logo Section */}
              <div className="relative">
                <div className="absolute -top-20 left-1/2 -translate-x-1/2">
                  <div className="relative">
                    <div className="absolute -inset-4 bg-gradient-to-r from-rose-400 via-teal-400 to-cyan-400 rounded-full blur opacity-50 group-hover:opacity-75 transition animate-tilt"></div>
                    <div className="relative bg-white rounded-full p-6 shadow-lg">
                      <Terminal size={48} className="text-gray-800" />
                    </div>
                  </div>
                </div>
  
                <div className="pt-16 text-center space-y-2">
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-rose-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
                    Join with us
                  </h1>
                  <p className="text-gray-600">Create an account</p>
                </div>
              </div>
  
              {/* Sign Up Form */}
              <form onSubmit={handleSignin} className="mt-8 space-y-6">
                <div className="space-y-4">
                  {/* Username Input */}
                  <div className="space-y-2">
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                      Username
                    </label>
                    <div className="relative group">
                      <div className="absolute -inset-px bg-gradient-to-r from-rose-400 via-teal-400 to-cyan-400 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 blur-sm"></div>
                      <input
                        id="username"
                        name="username"
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="relative w-full rounded-xl bg-white px-4 py-3 text-gray-700 shadow-sm ring-1 ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                        placeholder="Choose a username"
                      />
                    </div>
                  </div>
  
                  {/* Password Input */}
                  <div className="space-y-2">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Password
                    </label>
                    <div className="relative group">
                      <div className="absolute -inset-px bg-gradient-to-r from-rose-400 via-teal-400 to-cyan-400 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 blur-sm"></div>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="relative w-full rounded-xl bg-white px-4 py-3 text-gray-700 shadow-sm ring-1 ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                        placeholder="Create a password"
                      />
                    </div>
                  </div>
                </div>
  
                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="relative w-full group"
                >
                  <div className="absolute -inset-px bg-gradient-to-r from-rose-400 via-teal-400 to-cyan-400 rounded-xl blur-sm opacity-75 group-hover:opacity-100 transition-opacity duration-200"></div>
                  <div className="relative bg-white rounded-xl px-6 py-3 transition-colors group-hover:bg-white/90">
                    <div className="flex items-center justify-center gap-2 bg-gradient-to-r from-rose-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent font-medium">
                      {isLoading ? (
                        <>
                          <Loader2 size={20} className="animate-spin" />
                          <span>Signing in...</span>
                        </>
                      ) : (
                        'Sign in'
                      )}
                    </div>
                  </div>
                </button>
  
                {/* Sign In Link */}
                <div className="text-center text-sm">
                  <span className="text-gray-600">Dont have an account? </span>
                  <Link
                    href="/signup"
                    className="font-medium bg-gradient-to-r from-rose-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent hover:opacity-80 transition-opacity"
                  >
                    Sign up
                  </Link>
                </div>
  
                {/* Error Message */}
                {error && (
                  <div className="text-center text-rose-500 bg-white/50 rounded-xl font-medium p-4 shadow-sm ring-1 ring-gray-100">
                    {error.message}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }
  