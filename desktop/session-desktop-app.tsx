import { useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  ProfileEntryScreen,
  type SessionProfile,
} from "../components/auth/profile-entry-screen";
import { RoomApp } from "../components/room-app";
import { windowsNativeCapture } from "./native-capture";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://watch-me-zcf3.onrender.com";

type DesktopSession = {
  accessToken: string;
  roomId: string;
  expiresAt: string;
  inviteUrl: string;
};

async function createSession(profile: SessionProfile) {
  const response = await fetch(`${API_BASE_URL}/api/session/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: profile.name }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof payload.error === "string"
        ? payload.error
        : "Não foi possível criar a sessão",
    );
  }
  return payload as DesktopSession;
}

export function DesktopApp() {
  const [session, setSession] = useState<DesktopSession | null>(null);
  const [profile, setProfile] = useState<SessionProfile | null>(null);

  if (!session || !profile) {
    return (
      <ProfileEntryScreen
        title="Nova sessão"
        description="Escolha seu nome e imagem. A sessão e o convite expiram em 24 horas."
        buttonLabel="Criar sessão de 24 horas"
        onContinue={async (nextProfile) => {
          const nextSession = await createSession(nextProfile);
          setProfile(nextProfile);
          setSession(nextSession);
        }}
      />
    );
  }

  return (
    <RoomApp
      apiBaseUrl={API_BASE_URL}
      accessToken={session.accessToken}
      roomId={session.roomId}
      initialMode="host"
      initialProfile={profile}
      initialTag={`Expira em ${new Date(session.expiresAt).toLocaleString("pt-BR")}`}
      inviteUrl={session.inviteUrl}
      nativeCapture={windowsNativeCapture}
      setNativeFullscreen={(fullscreen) =>
        getCurrentWindow().setFullscreen(fullscreen)
      }
    />
  );
}
