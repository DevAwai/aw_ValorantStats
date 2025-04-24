"use client"; // Assure que ce composant s'exécute côté client

import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function Home() {
  const { data: session } = useSession();
  const [guilds, setGuilds] = useState<any[]>([]);

  useEffect(() => {
    const fetchGuilds = async () => {
      if (session?.accessToken) {
        const response = await fetch("https://discord.com/api/v10/users/@me/guilds", {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        });
        const data = await response.json();
        setGuilds(data);
      }
    };

    if (session) fetchGuilds();
  }, [session]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white">
      {session ? (
        <>
          <h1 className="text-3xl mb-4">Bienvenue {session.user?.name}</h1>
          <img
            src={session.user?.image ?? ""}
            alt="Avatar"
            className="w-20 h-20 rounded-full mb-4"
          />
          <button
            onClick={() => signOut()}
            className="bg-red-600 px-4 py-2 rounded hover:bg-red-500"
          >
            Se déconnecter
          </button>

          {/* Affichage des serveurs */}
          <div className="mt-8">
            <h2 className="text-xl mb-4">Serveurs où je suis :</h2>
            <ul>
              {guilds.map((guild) => (
                <li key={guild.id} className="mb-2">
                  {guild.name}
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : (
        <button
          onClick={() => signIn("discord")}
          className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-500"
        >
          Se connecter avec Discord
        </button>
      )}
    </main>
  );
}
