import type { ComponentType } from 'react';
import { Navigate, Outlet, useOutletContext } from 'react-router';
import { useAppData, type ProfileData } from '@/features/app/appData';
import { needsInstall } from '@/features/app/install';
import { Screen, ScreenTitle } from '@/ui/components/Screen';

/*
 * Routen-Wächter. Im Safari-Tab auf iPhone und iPad öffnet Juri die Datenbank gar nicht erst
 * (A13): Die Wächter prüfen das, bevor sie die Daten abfragen.
 */

/** Bereiche mit Profil; ohne Profil geht es zum Onboarding. */
export function RequireProfile() {
  return needsInstall() ? <Navigate to="/installieren" replace /> : <ProfileGate />;
}

/** Onboarding nur ohne Profil; ist eins da (auch nach Demo oder Backup), zur Startseite. */
export function RequireNoProfile() {
  return needsInstall() ? <Navigate to="/installieren" replace /> : <OnboardingGate />;
}

/** Install-Anleitung nur im Safari-Tab. */
export function RequireBrowserTab() {
  return needsInstall() ? <Outlet /> : <Navigate to="/" replace />;
}

/** Bildschirm hinter RequireProfile; erhält Profil und Metadaten. */
export function ProfileScreen({
  screen: Content,
}: {
  screen: ComponentType<{ data: ProfileData }>;
}) {
  return <Content data={useOutletContext<ProfileData>()} />;
}

function ProfileGate() {
  const state = useAppData();
  if (state.status === 'loading') return null;
  if (state.status === 'error') return <StorageError />;
  const { profile } = state.value;
  if (!profile) return <Navigate to="/willkommen" replace />;
  return <Outlet context={{ ...state.value, profile } satisfies ProfileData} />;
}

function OnboardingGate() {
  const state = useAppData();
  if (state.status === 'loading') return null;
  if (state.status === 'error') return <StorageError />;
  return state.value.profile ? <Navigate to="/" replace /> : <Outlet />;
}

function StorageError() {
  return (
    <Screen>
      <ScreenTitle lead="Bitte schließe Juri und öffne es erneut. Hilft das nicht, starte das Gerät neu.">
        Kein Zugriff auf den Speicher
      </ScreenTitle>
    </Screen>
  );
}
