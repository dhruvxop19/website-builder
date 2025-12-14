import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wand2, Rocket, Code2, Zap, LayoutTemplate, Sparkles } from 'lucide-react';

export function Home() {
  const [prompt, setPrompt] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      navigate('/builder', { state: { prompt } });
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-white/20 overflow-x-hidden">
      {/* Subtle Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[800px] h-[400px] bg-white/5 blur-[120px] rounded-full opacity-50" />
      </div>

      {/* Navbar */}
      <nav className="relative z-10 border-b border-white/[0.08] bg-black/20 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-white flex items-center justify-center">
              <Rocket className="w-4 h-4 text-black" strokeWidth={3} />
            </div>
            <span className="font-bold text-lg tracking-tight font-sans">JustShip</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#" className="hover:text-white transition-colors">Product</a>
            <a href="#" className="hover:text-white transition-colors">Solutions</a>
            <a href="#" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">Log In</button>
            <button className="bg-white text-black px-4 py-2 rounded text-sm font-semibold hover:bg-zinc-200 transition-colors">
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        <div className="max-w-4xl mx-auto px-6 pt-24 pb-32 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-zinc-300 text-xs font-medium mb-10 backdrop-blur-sm animate-fade-in-up">
            <Sparkles className="w-3 h-3 text-white" />
            <span className="opacity-80">Introducing JustShip v2.0</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 bg-clip-text text-transparent bg-gradient-to-b from-white via-white to-zinc-500 leading-[1.1]">
            Build software <br />
            <span className="text-white drop-shadow-sm">at lightspeed.</span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed tracking-wide">
            Transform ideas into production-ready applications instantly.
            The most advanced AI engineering platform for ambitious developers.
          </p>

          <form onSubmit={handleSubmit} className="relative max-w-2xl mx-auto group">
            <div className="absolute -inset-0.5 bg-gradient-to-b from-white/20 to-transparent rounded-2xl blur-sm opacity-50 group-hover:opacity-100 transition duration-700"></div>
            <div className="relative bg-[#0A0A0A] p-2 rounded-2xl border border-white/[0.08] flex items-center shadow-2xl overflow-hidden transition-all group-focus-within:border-white/20 group-focus-within:ring-1 group-focus-within:ring-white/10">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your app concept..."
                className="w-full bg-transparent text-white placeholder-zinc-600 px-6 py-4 text-lg focus:outline-none resize-none h-[72px] flex pt-5 leading-normal"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (prompt.trim()) handleSubmit(e);
                  }
                }}
              />
              <div className="pr-2">
                <button
                  type="submit"
                  className="h-12 px-6 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 transition-all flex items-center gap-2 whitespace-nowrap active:scale-95"
                >
                  <Wand2 className="w-4 h-4" />
                  <span>Generate</span>
                </button>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-4 text-xs text-zinc-500 font-medium">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                <span>React + Vite</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-zinc-800"></div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                <span>Tailwind CSS</span>
              </div>
              <div className="w-1 h-1 rounded-full bg-zinc-800"></div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                <span>Modern Stack</span>
              </div>
            </div>
          </form>
        </div>

        {/* Features Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent w-full max-w-5xl mx-auto mb-20" />

        {/* Features Grid */}
        <div className="max-w-6xl mx-auto px-6 pb-32">
          <div className="grid md:grid-cols-3 gap-8 content-center">
            {[
              {
                icon: <Zap className="w-5 h-5 text-white" />,
                title: "Instant Preview",
                description: "Watch your code come to life in real-time with our powerful WebContainer engine."
              },
              {
                icon: <LayoutTemplate className="w-5 h-5 text-white" />,
                title: "Production Ready",
                description: "Clean, maintainable code using the latest industry standards and best practices."
              },
              {
                icon: <Code2 className="w-5 h-5 text-white" />,
                title: "Full Ownership",
                description: "Export your project instantly. No lock-in, just pure standard React code."
              }
            ].map((feature, i) => (
              <div key={i} className="group p-8 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.04] transition-all hover:border-white/10">
                <div className="mb-6 w-12 h-12 rounded-xl bg-white/[0.05] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white tracking-tight">{feature.title}</h3>
                <p className="text-zinc-500 leading-relaxed text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}