import Sidebar from "./components/layout/sidebar";
import Header from "./components/layout/header";
import { ArrowRight } from "lucide-react";
import FeaturedDiscovery from "./components/music/featured-discovery";
import ForYou from "./components/music/for-you";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#101010]">
      <Sidebar />

      {/* Main content - offset to accommodate the fixed sidebar */}
      <div className="min-w-0 md:pl-64">
        <Header />

        <div className="mx-auto max-w-7xl space-y-12 px-8 py-10">
          {/* Welcome */}
          <section>
            <p className="mb-2 text-sm uppercase tracking-widest text-[#D6A45D]">
              Your discovery starts here
            </p>

            <h1 className="text-4xl font-semibold tracking-tight text-[#F5F2ED]">
              Find your next favourite.
            </h1>

            <p className="mt-3 max-w-xl leading-relaxed text-neutral-500">
              Explore new sounds, uncover independent artists and discover music
              beyond your usual rotation.
            </p>
          </section>

          {/* Featured discovery */}
          <FeaturedDiscovery />

          {/* Personalised recommendations */}
          <ForYou />

          {/* Discovery journey */}
          <section className="grid gap-5 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-[#191919] p-6">
              <p className="text-xs uppercase tracking-widest text-neutral-500">
                Your musical identity
              </p>

              <h2 className="mt-3 text-xl font-semibold text-white">
                Your taste is taking shape.
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                As you discover artists, we'll build a picture of your favourite
                genres and sounds.
              </p>

              <a
                href="/explore"
                className="mt-5 inline-flex items-center gap-2 text-sm text-[#D6A45D] transition hover:text-[#E9BD7B]"
              >
                Explore genres
                <ArrowRight size={15} />
              </a>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#191919] p-6">
              <p className="text-xs uppercase tracking-widest text-neutral-500">
                Discovery journey
              </p>

              <h2 className="mt-3 text-xl font-semibold text-white">
                Every artist has a story.
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                Save artists you love and build your own collection of musical
                discoveries.
              </p>

              <a
                href="/library"
                className="mt-5 inline-flex items-center gap-2 text-sm text-[#D6A45D] transition hover:text-[#E9BD7B]"
              >
                Visit your library
                <ArrowRight size={15} />
              </a>
            </div>
          </section>

          {/* Footer */}
          <footer className="border-t border-white/10 py-6 text-xs text-neutral-600">
            SONORA — Find your next favourite.
          </footer>
        </div>
      </div>
    </main>
  );
}
