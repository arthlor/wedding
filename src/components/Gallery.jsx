import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getCdnUrl } from '../lib/utils'
import { Loader2, Heart, Share2, Download, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useLikes } from '../hooks/useLikes'

// --- Lightbox Component ---
function Lightbox({ photo, onClose, onNext, onPrev, hasNext, hasPrev }) {
    const { user } = useAuth()
    const { likesCount, isLiked, toggleLike, animate, setAnimate } = useLikes(photo.id, photo.likes_count, user?.id)

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose()
            if (e.key === 'ArrowRight' && hasNext) onNext()
            if (e.key === 'ArrowLeft' && hasPrev) onPrev()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onClose, onNext, onPrev, hasNext, hasPrev])

    const handleShare = async () => {
        const shareData = {
            title: 'Gizem & Anıl Wedding',
            text: 'Harika bir an yakaladım!',
            url: getCdnUrl(photo.storage_path)
        }
        if (navigator.share) {
            try { await navigator.share(shareData) } catch (err) { console.log(err) }
        } else {
            navigator.clipboard.writeText(shareData.url)
            alert('Link kopyalandı!')
        }
    }

    return (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center animate-fade-in backdrop-blur-sm">
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all z-50"
            >
                <X className="w-8 h-8" />
            </button>

            {/* Navigation Buttons */}
            {hasPrev && (
                <button
                    onClick={(e) => { e.stopPropagation(); onPrev() }}
                    className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 p-2 md:p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all z-50"
                >
                    <ChevronLeft className="w-8 h-8 md:w-10 md:h-10" />
                </button>
            )}

            {hasNext && (
                <button
                    onClick={(e) => { e.stopPropagation(); onNext() }}
                    className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 p-2 md:p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all z-50"
                >
                    <ChevronRight className="w-8 h-8 md:w-10 md:h-10" />
                </button>
            )}

            {/* Main Content */}
            <div className="relative max-w-7xl max-h-[90vh] w-full flex flex-col items-center justify-center">
                <img
                    src={getCdnUrl(photo.storage_path)}
                    alt="Full screen memory"
                    className="max-h-[85vh] max-w-full object-contain shadow-2xl"
                    onDoubleClick={toggleLike}
                />

                {/* Mobile Navigation overlays (invisible tap zones) - Removed as buttons are now visible */}
                {/* <div className="absolute inset-y-0 left-0 w-1/4 z-40 md:hidden" onClick={(e) => { e.stopPropagation(); if (hasPrev) onPrev() }} />
                <div className="absolute inset-y-0 right-0 w-1/4 z-40 md:hidden" onClick={(e) => { e.stopPropagation(); if (hasNext) onNext() }} /> */}


                {/* Bottom ActionBar */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-black/50 backdrop-blur-md px-8 py-3 rounded-full border border-white/10">
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleLike() }}
                        className="flex items-center gap-2 text-white hover:text-red-500 transition-colors group"
                    >
                        <Heart
                            className={`w-6 h-6 transition-all duration-300 ${isLiked ? 'fill-red-500 text-red-500 scale-110' : 'group-hover:text-red-500'} ${animate ? 'animate-bounce-short' : ''}`}
                            onAnimationEnd={() => setAnimate(false)}
                        />
                        <span className="font-medium text-sm">{likesCount}</span>
                    </button>

                    <button
                        onClick={(e) => { e.stopPropagation(); handleShare() }}
                        className="text-white hover:text-blue-400 transition-colors"
                    >
                        <Share2 className="w-6 h-6" />
                    </button>

                    <a
                        href={getCdnUrl(photo.storage_path)}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:text-primary transition-colors"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Download className="w-6 h-6" />
                    </a>
                </div>
            </div>
        </div>
    )
}

// --- PhotoCard Component ---
function PhotoCard({ photo, onClick }) {
    const { user } = useAuth()
    const { likesCount, isLiked, toggleLike, animate, setAnimate } = useLikes(photo.id, photo.likes_count, user?.id)

    const handleShare = async (e) => {
        e.stopPropagation()
        const shareData = {
            title: 'Gizem & Anıl Wedding',
            text: 'Harika bir an yakaladım!',
            url: getCdnUrl(photo.storage_path)
        }

        if (navigator.share) {
            try {
                await navigator.share(shareData)
            } catch (err) {
                console.log('Error sharing:', err)
            }
        } else {
            navigator.clipboard.writeText(shareData.url)
            alert('Link kopyalandı!')
        }
    }

    return (
        <div
            onClick={onClick}
            className="break-inside-avoid relative group rounded-xl overflow-hidden bg-gray-100 shadow-sm transition-all hover:scale-[1.02] duration-300 hover:shadow-lg mb-4 cursor-zoom-in"
        >
            <img
                src={getCdnUrl(photo.storage_path, 600)}
                alt="Düğün Anı"
                loading="lazy"
                className="w-full h-auto object-cover display-block"
            />

            {/* Overlay Gradient */}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            {/* Actions Bar */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                {/* Like Button */}
                <button
                    onClick={(e) => { e.stopPropagation(); toggleLike() }}
                    className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition-colors group/btn"
                >
                    <Heart
                        className={`w-5 h-5 transition-all duration-300 ${isLiked ? 'fill-red-500 text-red-500 scale-110' : 'text-gray-700 group-hover/btn:text-red-500'} ${animate ? 'animate-bounce-short' : ''}`}
                        onAnimationEnd={() => setAnimate(false)}
                    />
                </button>

                {/* Share Button */}
                <button
                    onClick={handleShare}
                    className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white text-gray-700 hover:text-blue-600 transition-colors"
                    title="Paylaş"
                >
                    <Share2 className="w-5 h-5" />
                </button>
            </div>

            {/* Likes Counter Badge (Only show if > 0) */}
            {likesCount > 0 && (
                <div className="absolute bottom-4 left-4 text-white text-xs font-medium drop-shadow-md flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <Heart className="w-3 h-3 fill-white text-white" /> {likesCount}
                </div>
            )}
        </div>
    )
}

export default function Gallery() {
    const [photos, setPhotos] = useState([])
    const [loading, setLoading] = useState(true)
    const [lightboxIndex, setLightboxIndex] = useState(null)

    useEffect(() => {
        fetchPhotos()

        const channel = supabase
            .channel('public-photos-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'photos' },
                (payload) => {
                    if (payload.eventType === 'INSERT' && payload.new.is_approved) {
                        setPhotos((prev) => [payload.new, ...prev])
                    } else if (payload.eventType === 'UPDATE') {
                        setPhotos((prev) => prev.map(p => p.id === payload.new.id ? payload.new : p))

                        if (!payload.new.is_approved) {
                            setPhotos((prev) => prev.filter(p => p.id !== payload.new.id))
                        }
                    } else if (payload.eventType === 'DELETE') {
                        setPhotos((prev) => prev.filter(p => p.id !== payload.old.id))
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const fetchPhotos = async () => {
        try {
            const { data, error } = await supabase
                .from('photos')
                .select('*')
                .eq('is_approved', true)
                .order('created_at', { ascending: false })

            if (error) throw error
            setPhotos(data || [])
        } catch (error) {
            console.error('Error fetching gallery:', error)
        } finally {
            setLoading(false)
        }
    }

    const openLightbox = (index) => setLightboxIndex(index)
    const closeLightbox = () => setLightboxIndex(null)
    const nextPhoto = () => setLightboxIndex((prev) => (prev + 1 < photos.length ? prev + 1 : prev))
    const prevPhoto = () => setLightboxIndex((prev) => (prev - 1 >= 0 ? prev - 1 : prev))

    if (loading) return (
        <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    )

    if (photos.length === 0) return (
        <div className="text-center p-12 text-gray-500 font-serif italic text-lg glass-panel rounded-xl">
            Henüz fotoğraf paylaşılmadı. İlk paylaşan siz olun!
        </div>
    )

    return (
        <>
            <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4 p-4">
                {photos.map((photo, index) => (
                    <PhotoCard
                        key={photo.id}
                        photo={photo}
                        onClick={() => openLightbox(index)}
                    />
                ))}
            </div>

            {lightboxIndex !== null && photos[lightboxIndex] && (
                <Lightbox
                    photo={photos[lightboxIndex]}
                    onClose={closeLightbox}
                    onNext={nextPhoto}
                    onPrev={prevPhoto}
                    hasNext={lightboxIndex < photos.length - 1}
                    hasPrev={lightboxIndex > 0}
                />
            )}
        </>
    )
}
