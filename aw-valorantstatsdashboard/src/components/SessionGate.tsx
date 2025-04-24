// src/components/SessionGate.tsx
'use client'; // Ce fichier doit être exécuté côté client

import { useSession } from "next-auth/react";

export default function SessionGate({ children }: { children: React.ReactNode }) {
  const { status } = useSession();

  if (status === 'loading') {
    return <div>Chargement de la session...</div>; // Affiche un loader pendant que la session est en cours de chargement
  }

  return <>{children}</>; // Rend les enfants une fois la session chargée
}
