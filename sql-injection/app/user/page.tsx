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
        <h1 className="mb-2 text-3xl font-bold">User Dashboard</h1>
        <p className="mb-4 text-sm opacity-80">
          SQL Executor - CVE-2026-0488 Demo
        </p>

        <div className="rounded-xl border border-red-500/50 bg-red-50/60 p-4 text-sm">
          <p className="font-semibold text-red-900">⚠️ VULNERABILITY:</p>
          <p className="text-red-800">
            This SQL editor allows execution of arbitrary SQL statements. An
            authenticated user can dump data, modify records, or destroy the
            database.
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
            placeholder="Enter SQL statement here...&#10;&#10;Examples:&#10;SELECT * FROM users;&#10;UPDATE users SET role = 'admin' WHERE email = 'user@demo.local';"
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
          <div className="rounded-md bg-green-100 p-4">
            <p className="mb-2 font-semibold text-green-900">Result:</p>
            {(() => {
              try {
                const parsed = JSON.parse(result);
                const rows = Array.isArray(parsed)
                  ? parsed
                  : parsed && typeof parsed === "object"
                    ? ((Object.values(parsed).find((v) => Array.isArray(v)) as
                        | Array<Record<string, unknown>>
                        | undefined) ?? [])
                    : [];

                if (rows.length === 0) {
                  return (
                    <pre className="overflow-x-auto text-black rounded-md bg-white p-3 font-mono text-sm">
                      {result}
                    </pre>
                  );
                }

                return (
                  <div className="overflow-x-auto rounded-md bg-white">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="bg-gray-100 text-black text-left">
                          <th className="border px-3 py-2">ID</th>
                          <th className="border px-3 py-2">Email</th>
                          <th className="border px-3 py-2">Role</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(
                          (user: Record<string, unknown>, index: number) => (
                            <tr key={index}>
                              <td className="border text-black px-3 py-2">
                                {String(user.id ?? "")}
                              </td>
                              <td className="border text-black px-3 py-2">
                                {String(user.email ?? "")}
                              </td>
                              <td className="border text-black px-3 py-2">
                                {String(user.role ?? "")}
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                );
              } catch {
                return (
                  <pre className="overflow-x-auto text-black rounded-md bg-white p-3 font-mono text-sm">
                    {result}
                  </pre>
                );
              }
            })()}
          </div>
        )}
      </form>

      <div className="mt-8 space-y-4">
        <div className="rounded-xl border p-4">
          <p className="mb-2 font-semibold">Example: Dump all users</p>
          <pre className="overflow-x-auto text-black rounded-md bg-gray-50 p-2 font-mono text-xs">
            {`SELECT * FROM users;`}
          </pre>
        </div>

        <div className="rounded-xl border p-4">
          <p className="mb-2 font-semibold">Example: Escalate privilege</p>
          <pre className="overflow-x-auto text-black rounded-md bg-gray-50 p-2 font-mono text-xs">
            {`UPDATE users SET role = 'admin' WHERE email = 'user@demo.local';`}
          </pre>
        </div>

        <div className="rounded-xl border p-4">
          <p className="mb-2 font-semibold">Example: Destroy table</p>
          <pre className="overflow-x-auto text-black rounded-md bg-gray-50 p-2 font-mono text-xs">
            {`DROP TABLE users;`}
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
