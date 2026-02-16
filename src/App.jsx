import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Upload from './components/Upload'
import Gallery from './components/Gallery'
import Admin from './pages/Admin'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-secondary selection:bg-primary/30">
        <header className="fixed w-full top-0 z-50 transition-all duration-300 bg-white/80 backdrop-blur-md border-b border-white/20">
          <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link to="/" className="text-3xl font-serif text-primary hover:text-primary/80 transition-colors">
              Gizem & Anıl
            </Link>
            <nav>
              <Link to="/admin" className="text-sm font-medium text-gray-500 hover:text-primary transition-colors">
                Yönetici
              </Link>
            </nav>
          </div>
        </header>

        <main>
          <Routes>
            <Route path="/" element={
              <div className="space-y-16 pb-16">
                {/* Hero Section - Split Layout */}
                <section className="relative min-h-[90vh] flex flex-col md:flex-row items-center justify-center overflow-hidden pt-20 pb-10 px-4 md:px-10 gap-10 max-w-7xl mx-auto">

                  {/* Text Content - Left Side */}
                  <div className="flex-1 text-center md:text-left space-y-8 z-10 animate-fade-in-up md:pl-10">
                    <div className="space-y-4">
                      <h2 className="text-xl md:text-2xl text-primary font-sans font-light tracking-[0.2em] uppercase">
                        14.07.2026
                      </h2>
                      <h1 className="text-6xl md:text-8xl lg:text-9xl font-serif text-gray-800 leading-tight">
                        Düğünümüze<br />
                        <span className="text-primary italic">Hoşgeldiniz</span>
                      </h1>
                    </div>

                    <p className="text-gray-500 text-lg md:text-xl font-light leading-relaxed max-w-lg mx-auto md:mx-0">
                      En mutlu günümüzden kareleri bizimle paylaşın, anılarımız ölümsüzleşsin.
                    </p>

                    <div className="pt-4">
                      <a href="#upload" className="inline-flex items-center justify-center px-8 py-4 bg-primary text-white rounded-full hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 font-medium tracking-wide">
                        Fotoğraf Paylaş
                      </a>
                    </div>
                  </div>

                  {/* Image Content - Right Side */}
                  <div className="flex-1 w-full max-w-xl md:max-w-none relative animate-fade-in">
                    <div className="relative aspect-[3/4] md:aspect-[4/5] w-full rounded-t-[10rem] rounded-b-[2rem] overflow-hidden shadow-2xl border-4 border-white">
                      <img
                        src="/hero.png"
                        onError={(e) => { e.target.onerror = null; e.target.src = "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=2070&auto=format&fit=crop" }}
                        alt="Gizem & Anıl"
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                    </div>

                    {/* Decorative Elements */}
                    <div className="absolute -z-10 top-10 -right-10 w-full h-full border-2 border-primary/20 rounded-t-[10rem] rounded-b-[2rem] hidden md:block" />
                    <div className="absolute -z-10 -bottom-10 -left-10 w-40 h-40 bg-accent/20 rounded-full blur-3xl" />
                  </div>

                </section>

                {/* Upload Section */}
                <section id="upload" className="-mt-10 md:mt-0 relative z-10 px-4 scroll-mt-24">
                  <Upload />
                </section>

                <div className="max-w-xs mx-auto border-t border-primary/20" />

                {/* Gallery Section */}
                <section className="max-w-7xl mx-auto px-4">
                  <div className="text-center mb-10 space-y-2">
                    <h2 className="text-4xl font-serif text-text">Sizin Gözünüzden</h2>
                    <p className="text-gray-500 font-light">Paylaşılan en özel anlar</p>
                  </div>
                  <Gallery />
                </section>
              </div>
            } />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>

        <footer className="text-center py-8 text-gray-400 text-xs tracking-wider uppercase">
          Sevgiyle Hazırlandı — Gizem & Anıl
        </footer>
      </div>
    </BrowserRouter>
  )
}

export default App
