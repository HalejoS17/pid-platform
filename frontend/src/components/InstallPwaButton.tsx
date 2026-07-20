import {
  Download,
} from 'lucide-react';

import {
  useEffect,
  useState,
} from 'react';

interface BeforeInstallPromptEvent
  extends Event {
  prompt: () => Promise<void>;

  userChoice: Promise<{
    outcome:
      | 'accepted'
      | 'dismissed';
  }>;
}

export function InstallPwaButton() {
  const [
    installPrompt,
    setInstallPrompt,
  ] =
    useState<
      BeforeInstallPromptEvent
      | null
    >(null);

  useEffect(() => {
    const handlePrompt = (
      event: Event,
    ) => {
      event.preventDefault();

      setInstallPrompt(
        event as
          BeforeInstallPromptEvent,
      );
    };

    const handleInstalled =
      () => {
        setInstallPrompt(null);
      };

    window.addEventListener(
      'beforeinstallprompt',
      handlePrompt,
    );

    window.addEventListener(
      'appinstalled',
      handleInstalled,
    );

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handlePrompt,
      );

      window.removeEventListener(
        'appinstalled',
        handleInstalled,
      );
    };
  }, []);

  if (!installPrompt) {
    return null;
  }

  const install = async () => {
    await installPrompt.prompt();
    await installPrompt.userChoice;

    setInstallPrompt(null);
  };

  return (
    <button
      type="button"
      onClick={() => {
        void install();
      }}
      className="inline-flex items-center gap-2 rounded-xl bg-[#2570B8] px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0C1D63]"
    >
      <Download className="size-4" />

      <span className="hidden sm:inline">
        Instalar
      </span>
    </button>
  );
}