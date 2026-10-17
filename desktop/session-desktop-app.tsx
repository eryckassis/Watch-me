import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getCurrent, onOpenUrl } from "@tauri-apps/plugin-deep-link";
import {
  ProfileEntryScreen,
  type SessionProfile,
} from "../components/auth/profile-entry-screen";
import { RoomApp } from "../components/room-app";
import {
  inviteTokenFromAppUrl,
  toAppInviteUrl,
} from "../lib/invite-url";
import { windowsNativeCapture } from "./native-capture";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://watch-me-zcf3.onrender.com";

type DesktopSession = {
  accessToken: string;
  roomId: string;
  expiresAt: string;
  inviteUrl: string;
};

function inviteTokenFromUrls(urls: string[] | null) {
  for (const url of urls || []) {
    const token = inviteTokenFromAppUrl(url);
    if (token) return token;
  }
  return null;
}

async function createSession(profile: SessionProfile, inviteToken: string | null) {
  const path = inviteToken
    ? `/api/invites/${encodeURIComponent(inviteToken)}/accept`
    : "/api/session/start";
  const response = await fetch(`${API_BASE_URL}${path}`, {
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
  const session = payload as DesktopSession;
  return { ...session, inviteUrl: toAppInviteUrl(session.inviteUrl) };
}

export function DesktopApp() {
  const [session, setSession] = useState<DesktopSession | null>(null);
  const [profile, setProfile] = useState<SessionProfile | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    const handleUrls = (urls: string[] | null) => {
      const token = inviteTokenFromUrls(urls);
      if (!token || disposed) return;
      setInviteToken(token);
      setSession(null);
      setProfile(null);
    };

    void getCurrent().then(handleUrls).catch(() => undefined);
    void onOpenUrl(handleUrls)
      .then((nextUnlisten) => {
        if (disposed) nextUnlisten();
        else unlisten = nextUnlisten;
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  if (!session || !profile) {
    return (
      <ProfileEntryScreen
        title={inviteToken ? "Entrar na sessão" : "Nova sessão"}
        description={
          inviteToken
            ? "Escolha seu nome e imagem para entrar com este convite."
            : "Escolha seu nome e imagem. A sessão e o convite expiram em 24 horas."
        }
        buttonLabel={inviteToken ? "Entrar com o convite" : "Criar sessão de 24 horas"}
        onContinue={async (nextProfile) => {
          const nextSession = await createSession(nextProfile, inviteToken);
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
      initialMode={inviteToken ? "viewer" : "host"}
      initialProfile={profile}
      initialTag={`Expira em ${new Date(session.expiresAt).toLocaleString("pt-BR")}`}
      inviteUrl={session.inviteUrl}
      nativeCapture={inviteToken ? undefined : windowsNativeCapture}
      setNativeFullscreen={(fullscreen) =>
        getCurrentWindow().setFullscreen(fullscreen)
      }
    />
  );
}
