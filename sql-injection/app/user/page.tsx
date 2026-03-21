import { cookies } from "next/headers";
import { redirect } from "next/navigation";

async function logout() {
  "use server";

  const cookieStore = await cookies();
  cookieStore.delete("session_email");
  cookieStore.delete("session_role");
  redirect("/");
}

export default async function UserPage() {
  const cookieStore = await cookies();
  const sessionEmail = cookieStore.get("session_email")?.value;

  if (!sessionEmail) {
    redirect("/");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-6 py-12">
      <h1 className="mb-2 text-3xl font-bold">User Page</h1>
      <p className="mb-8 text-sm opacity-80">Logged in as: {sessionEmail}</p>

      <div className="rounded-xl border p-6">
        <p>This is a protected route for authenticated users.</p>
      </div>

      <form action={logout} className="mt-6">
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-white"
        >
          Logout
        </button>
      </form>
    </main>
  );
}
