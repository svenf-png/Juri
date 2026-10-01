import { useCallback } from 'react';
import { useNavigate } from 'react-router';

/** Suche öffnen: das Suchfeld des Bildschirms anspringen, sonst zu den Stapeln (Kürzel „/“). */
export function useSearchAction(): () => void {
  const navigate = useNavigate();
  return useCallback(() => {
    const field = document.querySelector<HTMLInputElement>('[data-shortcut-search]');
    if (field) field.focus();
    else void navigate('/stapel');
  }, [navigate]);
}
