import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <nav className="px-6 py-4 flex justify-between items-center border-b border-gray-100">
        <span className="font-semibold text-gray-900">IntakeData</span>
        <div className="flex gap-3">
          <Link href="/signin">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Start free</Button>
          </Link>
        </div>
      </nav>

      <section className="px-6 py-24 max-w-2xl mx-auto text-center">
        <h1 className="text-4xl font-bold text-gray-900 leading-tight mb-4">
          Stop wondering if their finances are okay.
        </h1>
        <p className="text-lg text-gray-500 mb-8 leading-relaxed">
          Forward their bills, statements, and notices to one place. We catch what needs attention —
          overdue payments, duplicate charges, rate hikes, and anything that doesn&apos;t look right.
          You get a clear view. They stay in control.
        </p>
        <Link href="/signup">
          <Button size="lg" className="text-base px-8">Start for free — no credit card</Button>
        </Link>
        <p className="text-sm text-gray-400 mt-3">First 5 documents free. $8/month after.</p>
      </section>

      <section className="px-6 py-16 max-w-3xl mx-auto">
        <h2 className="text-2xl font-semibold text-center text-gray-900 mb-10">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {[
            { n: '1', title: 'Forward or snap a document', body: 'Email a bill to their unique address, or snap a photo of paper mail right in the app.' },
            { n: '2', title: 'We extract and check', body: 'We read the document and look for what needs attention — overdue dates, rate changes, final notices.' },
            { n: '3', title: 'You see what matters', body: 'A clean dashboard shows exceptions. Email alerts for anything urgent. Silence when everything\'s fine.' },
          ].map(({ n, title, body }) => (
            <div key={n} className="space-y-3">
              <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-sm mx-auto">{n}</div>
              <p className="font-semibold text-gray-900">{title}</p>
              <p className="text-sm text-gray-500 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gray-50 px-6 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Why existing apps don&apos;t solve this</h2>
          <p className="text-gray-500 leading-relaxed mb-4">
            Every bill-management app — Rocket Money, Mint, YNAB — requires connecting a bank account.
            They&apos;re built for one person managing their own money. None let a caregiver monitor an
            elder&apos;s bills without the elder giving up full account access.
          </p>
          <p className="text-gray-500 leading-relaxed">
            IntakeData works differently. The elder controls what gets forwarded. The caregiver sees
            what needs attention. No bank login. No account takeover. And unlike any app, we catch
            what arrives by paper mail.
          </p>
        </div>
      </section>

      <footer className="px-6 py-8 text-center text-sm text-gray-400 border-t border-gray-100">
        Data encrypted. Never used to train AI. Delete anytime. — IntakeData
      </footer>
    </main>
  )
}
