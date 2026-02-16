import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getCdnUrl } from '../lib/utils'
import { Check, X, Loader2, LogIn, LogOut, CheckSquare, Square, Trash2 } from 'lucide-react'

export default function Admin() {
    const [session, setSession] = useState(null)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [photos, setPhotos] = useState([])
    const [selected, setSelected] = useState(new Set())
    const [processing, setProcessing] = useState(false)

    const [activeTab, setActiveTab] = useState('pending') // 'pending' or 'approved'

    // Check for existing session on mount
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user?.email) {
                setSession(session)
                fetchPhotos()
            }
        })
    }, [activeTab])

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })
        setLoading(false)
        if (error) {
            alert(error.message)
        } else {
            setSession(data.session)
            fetchPhotos()
        }
    }

    const fetchPhotos = async () => {
        const isApproved = activeTab === 'approved'
        const { data, error } = await supabase
            .from('photos')
            .select('*')
            .eq('is_approved', isApproved)
            .order('created_at', { ascending: false })

        if (data) {
            setPhotos(data)
            setSelected(new Set()) // Reset selection on refresh/tab change
        }
    }

    // --- Selection Logic ---
    const toggleSelect = (id) => {
        const newSelected = new Set(selected)
        if (newSelected.has(id)) {
            newSelected.delete(id)
        } else {
            newSelected.add(id)
        }
        setSelected(newSelected)
    }

    const toggleSelectAll = () => {
        if (selected.size === photos.length) {
            setSelected(new Set())
        } else {
            setSelected(new Set(photos.map(p => p.id)))
        }
    }

    // --- Action Logic ---
    const bulkApprove = async () => {
        if (selected.size === 0) return
        setProcessing(true)

        const ids = Array.from(selected)
        const { error } = await supabase
            .from('photos')
            .update({ is_approved: true })
            .in('id', ids)

        if (!error) {
            setPhotos(photos.filter(p => !selected.has(p.id)))
            setSelected(new Set())
        } else {
            alert('Hata: ' + error.message)
        }
        setProcessing(false)
    }

    const bulkDelete = async () => {
        if (selected.size === 0) return
        if (!confirm(`${selected.size} fotoğrafı kalıcı olarak silmek istiyor musunuz?`)) return

        setProcessing(true)
        const ids = Array.from(selected)
        const photosToDelete = photos.filter(p => selected.has(p.id))
        const paths = photosToDelete.map(p => p.storage_path)

        // 1. Delete from Storage
        const { error: storageError } = await supabase.storage
            .from('wedding_photos')
            .remove(paths)

        if (storageError) {
            console.error(storageError)
            alert('Dosyalar silinirken hata oluştu')
            setProcessing(false)
            return
        }

        // 2. Delete from DB
        const { error: dbError } = await supabase
            .from('photos')
            .delete()
            .in('id', ids)

        if (!dbError) {
            setPhotos(photos.filter(p => !selected.has(p.id)))
            setSelected(new Set())
        } else {
            alert('Veritabanı hatası: ' + dbError.message)
        }
        setProcessing(false)
    }

    // Single item wrappers for backward compatibility with UI triggers if needed, 
    // but we'll try to use the bulk functions even for single clicks if we want uniformity,
    // though for now let's keep the UI simple.

    if (!session) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] p-4">
                <div className="glass-panel p-10 rounded-2xl max-w-sm w-full animate-fade-in-up">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                            <LogIn className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-serif text-center mb-8 text-gray-800">Yönetici Girişi</h1>
                    <form onSubmit={handleLogin} className="space-y-5">
                        <input
                            type="email"
                            placeholder="E-posta"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all bg-white/50"
                            required
                        />
                        <input
                            type="password"
                            placeholder="Şifre"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all bg-white/50"
                            required
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-white p-3 rounded-lg hover:bg-primary/90 transition-colors shadow-md disabled:opacity-50 flex items-center justify-center font-medium"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : 'Giriş Yap'}
                        </button>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 max-w-7xl mx-auto min-h-screen pb-32">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-10 bg-white/80 backdrop-blur-md p-6 rounded-xl shadow-sm border border-white/20 sticky top-24 z-40 gap-4 transition-all">
                <div className="flex items-center gap-6">
                    <h1 className="text-3xl font-serif font-bold text-gray-800">Yönetim Paneli</h1>
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'pending' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Bekleyenler
                        </button>
                        <button
                            onClick={() => setActiveTab('approved')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'approved' ? 'bg-white shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Onaylananlar
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleSelectAll}
                        disabled={photos.length === 0}
                        className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-primary transition-colors px-3 py-2 rounded-lg hover:bg-primary/5"
                    >
                        {selected.size > 0 && selected.size === photos.length ? (
                            <CheckSquare className="w-5 h-5 text-primary" />
                        ) : (
                            <Square className="w-5 h-5" />
                        )}
                        Tümünü Seç
                    </button>

                    <button
                        onClick={() => supabase.auth.signOut().then(() => setSession(null))}
                        className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
                    >
                        <LogOut className="w-4 h-4" />
                        Çıkış Yap
                    </button>
                </div>
            </div>

            {/* Grid */}
            {photos.length === 0 ? (
                <div className="text-center p-16 glass-panel rounded-2xl">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${activeTab === 'pending' ? 'bg-green-100' : 'bg-gray-100'}`}>
                        {activeTab === 'pending' ? <Check className="w-10 h-10 text-green-600" /> : <div className="text-2xl">📷</div>}
                    </div>
                    <h3 className="text-2xl font-serif font-medium text-gray-900 mb-2">
                        {activeTab === 'pending' ? 'Her şey güncel!' : 'Henüz onaylanmış fotoğraf yok.'}
                    </h3>
                    <p className="text-gray-500">
                        {activeTab === 'pending' ? 'Onay bekleyen fotoğraf yok.' : 'Onaylanan fotoğraflar burada görünecek.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {photos.map(photo => (
                        <div
                            key={photo.id}
                            onClick={(e) => {
                                // Prevent triggering when clicking buttons
                                if (!e.target.closest('button')) toggleSelect(photo.id)
                            }}
                            className={`
                                relative aspect-[4/5] rounded-xl overflow-hidden cursor-pointer group transition-all duration-300 border-2
                                ${selected.has(photo.id) ? 'border-primary ring-4 ring-primary/20 scale-95 shadow-xl' : 'border-transparent hover:shadow-lg'}
                            `}
                        >
                            <img
                                src={getCdnUrl(photo.storage_path, 400)}
                                alt="Fotoğraf"
                                className="w-full h-full object-cover"
                            />

                            {/* Selection Overlay */}
                            <div className={`
                                absolute inset-0 transition-colors duration-200 flex items-start justify-end p-3
                                ${selected.has(photo.id) ? 'bg-primary/20' : 'bg-black/0 group-hover:bg-black/10'}
                            `}>
                                <div className={`
                                    w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200
                                    ${selected.has(photo.id) ? 'bg-primary border-primary' : 'bg-white/50 border-white'}
                                `}>
                                    {selected.has(photo.id) && <Check className="w-4 h-4 text-white" />}
                                </div>
                            </div>

                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                                <p className="text-xs text-white/90 font-medium">
                                    {new Date(photo.created_at).toLocaleString('tr-TR')}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Floating Action Bar */}
            {selected.size > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
                    <div className="bg-white text-gray-800 px-6 py-4 rounded-full shadow-2xl border border-gray-100 flex items-center gap-6">
                        <span className="text-sm font-medium text-gray-500 border-r pr-6">
                            <span className="text-gray-900 font-bold">{selected.size}</span> seçildi
                        </span>

                        <div className="flex items-center gap-3">
                            {activeTab === 'pending' && (
                                <button
                                    onClick={bulkApprove}
                                    disabled={processing}
                                    className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors font-medium shadow-md disabled:opacity-50"
                                >
                                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                    Onayla
                                </button>
                            )}

                            <button
                                onClick={bulkDelete}
                                disabled={processing}
                                className="flex items-center gap-2 px-5 py-2 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors font-medium disabled:opacity-50"
                            >
                                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Sil
                            </button>
                        </div>

                        <button
                            onClick={() => setSelected(new Set())}
                            className="ml-2 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
