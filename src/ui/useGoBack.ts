import { useNavigate } from 'react-router';

/** Zurück dorthin, woher man kam; ohne Verlauf (Direktaufruf) zur Ausweichadresse. */
export function useGoBack(fallback: string) {
  const navigate = useNavigate();
  return () => {
    const state = window.history.state as { idx?: number } | null;
    if (state?.idx) void navigate(-1);
    else void navigate(fallback);
  };
}
