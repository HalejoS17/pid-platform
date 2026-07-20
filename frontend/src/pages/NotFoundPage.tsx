import {
  ArrowLeft,
} from 'lucide-react';

import {
  Link,
} from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="surface-card flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#2570B8]">
        Error 404
      </p>

      <h1 className="mt-3 text-3xl font-bold text-[#0C1D63]">
        Página no encontrada
      </h1>

      <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
        La ruta solicitada no existe dentro de la plataforma.
      </p>

      <Link
        to="/"

        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0C1D63] px-4 py-2.5 text-sm font-semibold text-white"
      >
        <ArrowLeft className="size-4" />

        Volver al dashboard
      </Link>
    </div>
  );
}