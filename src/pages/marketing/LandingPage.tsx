import { Link } from 'react-router-dom'

import { SectionTitle } from './components/SectionTitle'

const benefits = [
  {
    title: 'Operación estandarizada',
    description:
      'Centraliza requisiciones, autorizaciones y ejecución para que cada rancho siga el mismo flujo sin improvisaciones.',
  },
  {
    title: 'Visibilidad en tiempo real',
    description:
      'Monitorea labores, estado de activos y avance de cosechas con trazabilidad por equipo, zona y temporada.',
  },
  {
    title: 'Decisiones con evidencia',
    description:
      'Convierte datos de monitoreo y recomendaciones técnicas en acciones concretas para reducir mermas y costos.',
  },
]

const modules = [
  'Requisiciones y control de ejecución',
  'Monitoreos de campo y bitácoras operativas',
  'Gestión de activos y mantenimientos',
  'Nómina agrícola con periodos y pagos',
  'Cosechas con seguimiento por temporada',
  'Recomendaciones técnicas y reportes',
]

const plans = [
  {
    name: 'Básico',
    price: 'Desde $49 USD / mes',
    description: 'Para equipos pequeños que requieren orden operativo desde el día uno.',
    cta: 'Empezar con Básico',
    features: ['1 organización', 'Módulos core', 'Soporte básico por correo'],
  },
  {
    name: 'Profesional',
    price: 'Desde $149 USD / mes',
    description: 'Para operaciones en crecimiento que necesitan visibilidad y control granular.',
    cta: 'Elegir Profesional',
    highlighted: true,
    features: [
      'Todo lo del plan Básico',
      'Reportes operativos avanzados',
      'Roles y permisos detallados',
    ],
  },
  {
    name: 'Empresa',
    price: 'Plan personalizado',
    description: 'Para grupos con múltiples frentes operativos y necesidades de servicio extendido.',
    cta: 'Hablar con ventas',
    features: [
      'Multi-sucursal y operación compleja',
      'Onboarding asistido',
      'SLA y acompañamiento prioritario',
    ],
  },
]

const faq = [
  {
    q: '¿Croplink ERP incluye pagos en línea hoy?',
    a: 'Todavía no. En esta versión puedes seleccionar paquete y continuar a registro; la gestión de pagos estará disponible próximamente.',
  },
  {
    q: '¿Puedo iniciar con un solo rancho y crecer después?',
    a: 'Sí. Puedes comenzar con un paquete inicial y evolucionar a Profesional o Empresa conforme aumente tu operación.',
  },
  {
    q: '¿El sistema funciona para equipos de campo y administración?',
    a: 'Sí. Croplink ERP está pensado para conectar operación, supervisión y administración en un mismo flujo.',
  },
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white text-slate-900">
      <header className="sticky top-0 z-20 border-b border-emerald-100/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img src="/vite.svg" alt="Croplink ERP" className="h-10 w-10 rounded-xl bg-emerald-100 p-1.5" />
            <span className="text-lg font-semibold tracking-tight text-slate-900">Croplink ERP</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
            >
              Entrar
            </Link>
            <a
              href="mailto:contacto@croplink.com.mx"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-emerald-300 transition hover:bg-emerald-500"
            >
              Solicitar acceso
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-7xl gap-10 px-6 pb-16 pt-20 md:grid-cols-[1.1fr_0.9fr] md:items-center">
          <div>
            <p className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 text-sm font-medium text-emerald-700">
              Plataforma para operación agrícola
            </p>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 md:text-6xl">
              Control agrícola claro, operativo y en tiempo real.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              Croplink ERP conecta estructura operativa, requisiciones, monitoreos, activos, nómina, cosechas y recomendaciones
              técnicas en una sola plataforma para que tu equipo ejecute con menos fricción y más precisión.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="mailto:contacto@croplink.com.mx"
                className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition hover:bg-emerald-500"
              >
                Solicitar acceso
              </a>
              <Link
                to="/login"
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
              >
                Entrar al ERP
              </Link>
            </div>
          </div>
          <div className="rounded-3xl border border-emerald-100 bg-white p-8 shadow-xl shadow-emerald-100/50">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Impacto esperado</p>
            <ul className="mt-5 space-y-4 text-sm text-slate-700">
              <li className="rounded-xl bg-slate-50 p-4">Mejor coordinación entre campo, almacén y administración.</li>
              <li className="rounded-xl bg-slate-50 p-4">Trazabilidad de decisiones y ejecución por operación.</li>
              <li className="rounded-xl bg-slate-50 p-4">Datos confiables para planear temporada, personal e insumos.</li>
            </ul>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-6 py-16">
          <SectionTitle
            eyebrow="Beneficios"
            title="Lo que Croplink ERP resuelve en la operación diaria"
            description="Diseñado para que el equipo trabaje sobre procesos claros, con seguimiento real y menos dependencia de hojas sueltas."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {benefits.map((benefit) => (
              <article key={benefit.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">{benefit.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{benefit.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-slate-900 py-16 text-white">
          <div className="mx-auto w-full max-w-7xl px-6">
            <SectionTitle
              eyebrow="Módulos"
              title="Todo el ERP en un solo ecosistema"
              description="Activa módulos de forma progresiva según tu madurez operativa."
              eyebrowClassName="text-emerald-300"
              titleClassName="text-white"
              descriptionClassName="text-slate-300"
            />
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {modules.map((module) => (
                <div key={module} className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-slate-100">
                  {module}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-6 py-16">
          <SectionTitle
            centered
            eyebrow="Paquetes"
            title="Elige el plan que mejor acompaña tu etapa"
            description="Precios de referencia editables. En esta versión el flujo de compra es de demostración."
          />
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`rounded-3xl border p-7 shadow-sm ${
                  plan.highlighted ? 'border-emerald-300 bg-emerald-50/70 shadow-emerald-100' : 'border-slate-200 bg-white'
                }`}
              >
                <h3 className="text-xl font-semibold text-slate-900">{plan.name}</h3>
                <p className="mt-2 text-sm text-slate-600">{plan.description}</p>
                <p className="mt-5 text-2xl font-semibold text-slate-900">{plan.price}</p>
                <ul className="mt-6 space-y-2 text-sm text-slate-700">
                  {plan.features.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="mailto:contacto@croplink.com.mx"
                  className="mt-7 inline-flex w-full justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  {plan.cta}
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50 py-16">
          <div className="mx-auto grid w-full max-w-7xl gap-8 px-6 md:grid-cols-3">
            <div className="md:col-span-2">
              <SectionTitle
                eyebrow="Nosotros"
                title="Tecnología útil para decisiones agrícolas más confiables"
                description="Somos un equipo enfocado en convertir procesos operativos complejos en flujos simples, medibles y escalables para empresas agrícolas."
              />
            </div>
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Misión</h3>
                <p className="mt-2 text-sm text-slate-600">Impulsar operaciones agrícolas ordenadas con información accionable.</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Visión</h3>
                <p className="mt-2 text-sm text-slate-600">Ser el ERP agrícola de referencia para equipos que quieren escalar con control.</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Valores</h3>
                <p className="mt-2 text-sm text-slate-600">Claridad operativa, colaboración en campo y mejora continua basada en datos.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-6 py-16">
          <SectionTitle eyebrow="FAQ" title="Preguntas frecuentes" description="Respuestas rápidas para comenzar." />
          <div className="mt-8 space-y-4">
            {faq.map((item) => (
              <details key={item.q} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" open>
                <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">{item.q}</summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-base font-semibold text-slate-900">Croplink ERP</p>
            <p className="mt-2 text-sm text-slate-600">
              Contacto: <a href="mailto:contacto@croplink.com" className="hover:text-emerald-700">contacto@croplink.com</a> ·{' ' }
              <a href="tel:3339300095" className="hover:text-emerald-700">3339300095</a>
            </p>
          </div>
          <div className="flex items-center gap-5 text-sm text-slate-600">
            <a href="https://www.linkedin.com" target="_blank" rel="noreferrer" className="hover:text-emerald-700">
              LinkedIn
            </a>
            <a href="https://www.instagram.com" target="_blank" rel="noreferrer" className="hover:text-emerald-700">
              Instagram
            </a>
            <a href="https://www.x.com" target="_blank" rel="noreferrer" className="hover:text-emerald-700">
              X / Twitter
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
