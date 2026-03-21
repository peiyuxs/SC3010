"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await response.json()) as {
        ok: boolean;
        message?: string;
        role?: "admin" | "user";
      };

      if (!response.ok || !data.ok) {
        setMessage(data.message ?? "Login failed.");
        return;
      }

      if (data.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/user");
      }
    } catch {
      setMessage("Network error.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold">SQL Injection Demo Login</h1>
      <p className="mb-8 text-sm opacity-80">
        This app is intentionally vulnerable and should only be used in a local
        learning environment.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border p-6">
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input
            className="w-full rounded-md border px-3 py-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Password</label>
          <input
            className="w-full rounded-md border px-3 py-2"
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>

        {message ? <p className="text-sm text-red-600">{message}</p> : null}
      </form>

      <div className="mt-8 rounded-xl border border-amber-500/40 bg-amber-50/60 p-4 text-sm text-black">
        <p className="font-semibold">Demo credentials</p>
        <p>User: user@demo.local / user123</p>
        <p>Admin: admin@demo.local / admin123</p>
      </div>
    </main>
  );
}
