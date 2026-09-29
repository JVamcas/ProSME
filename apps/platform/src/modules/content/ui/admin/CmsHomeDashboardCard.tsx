import Link from "next/link";

export default function CmsHomeDashboardCard() {
  return (
    <section className="cms-home-entry" aria-labelledby="cms-home-entry-title">
      <p className="cms-home-entry__eyebrow">Website pages</p>
      <h2 id="cms-home-entry-title">Home</h2>
      <p>Find the part of the public home page you want to change.</p>
      <p className="cms-home-entry__path">/</p>
      <div className="cms-home-entry__actions">
        <Link href="/cms/home">Find a section</Link>
        <a href="/" target="_blank" rel="noreferrer">View website</a>
      </div>
    </section>
  );
}
