import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-primary/20">
      <div className="mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-6 px-5 py-10 lg:flex-row lg:items-center lg:px-16">
        <div>
          <p className="font-display text-2xl font-bold">The Chronicle</p>
          <p className="mt-1 font-serif text-sm text-on-surface-variant">
            {`© ${new Date().getFullYear()} The Chronicle. A daily paper of finance, markets & policy.`}
          </p>
          <p className="mt-1 font-serif text-sm text-on-surface-variant">
            Headlines curated from Economic Times, Mint, Moneycontrol, The
            Hindu group and Times of India. All stories link to their original
            publishers.
          </p>
        </div>
        <nav className="label-caps flex flex-wrap gap-x-6 gap-y-2 text-on-surface-variant">
          <Link href="/" className="hover:text-secondary">
            Front Page
          </Link>
          <Link href="/section/markets" className="hover:text-secondary">
            Markets
          </Link>
          <Link href="/section/economy-policy" className="hover:text-secondary">
            Economy
          </Link>
        </nav>
      </div>
    </footer>
  );
}
