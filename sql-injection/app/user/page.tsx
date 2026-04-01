"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function UserPage() {
  const router = useRouter();
  const [sql, setSql] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/");
  }

  async function handleExecute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/execute-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql }),
      });

      const data = (await response.json()) as {
        ok: boolean;
        result?: unknown;
        error?: string;
        message?: string;
      };

      if (!response.ok || !data.ok) {
        setError(data.message ?? data.error ?? "Execution failed");
        return;
      }

      setResult(JSON.stringify(data.result, null, 2));
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-6 py-12">
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">Scripting Editor (SQL)</h1>
        <p className="mb-4 text-sm opacity-80">CVE-2026-0488 SAP Vulnerability Demo</p>

        <div className="rounded-xl border border-red-500/50 bg-red-50/60 p-4 text-sm">
          <p className="text-red-800">
            <span className="font-semibold text-red-900">VULNERABILITY: </span>
            Allows execution of arbitrary SQL statements. Allows authenticated user to
            dump data, modify records, or destroy the database.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleExecute}
        className="space-y-4 rounded-xl border p-6"
      >
        <div>
          <label className="mb-2 block text-sm font-medium">
            SQL Statement
          </label>
          <textarea
            className="w-full rounded-md border px-3 py-2 font-mono text-sm"
            rows={10}
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            placeholder="SELECT * FROM users..."
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {loading ? "Executing..." : "Execute SQL"}
        </button>

        {error && (
          <p className="rounded-md bg-red-100 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {result && (
          <div className="rounded-md bg-green-50 p-4">
            <p className="mb-2 font-semibold text-green-900">Result:</p>
            <pre className="overflow-x-auto text-black rounded-md bg-white p-3 font-mono text-sm">
              {result}
            </pre>
          </div>
        )}
      </form>

      <div className="mt-8 space-y-4">
        <div className="rounded-xl border p-4">
          <p className="mb-2 font-semibold">Example SQL Statements</p>
          <pre className="overflow-x-auto text-black rounded-md bg-gray-50 p-2 font-mono text-xs">
            {`-- Confidentiality breach, Show all users
SELECT * FROM users;

-- Privilege escalation
UPDATE users SET role = 'admin' WHERE email = 'user@demo.local';

-- Destroy data
DROP TABLE users;`}
          </pre>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="mt-8 rounded-md bg-gray-600 px-4 py-2 text-white"
      >
        Logout
      </button>
    </div>
  );
}
