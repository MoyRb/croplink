import { Link } from 'react-router-dom'

export function CheckoutPlaceholderPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-emerald-50 via-white to-white px-6">
      <div className="w-full max-w-xl rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-xl shadow-emerald-100/50">
        <img src="/vite.svg" alt="Croplink ERP" className="mx-auto h-14 w-14 rounded-2xl bg-emerald-100 p-2" />
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Checkout</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">Pagos próximamente</h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">
          Estamos habilitando la experiencia de pagos en línea. Mientras tanto, puedes crear tu cuenta y comenzar tu configuración en
          Croplink ERP.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/signup"
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
          >
            Continuar a registro
          </Link>
          <Link
            to="/"
            className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
          >
            Volver a la landing
          </Link>
        </div>
      </div>
    </div>
  )
}
