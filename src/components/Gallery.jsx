import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getCdnUrl } from '../lib/utils'
import { Loader2, Heart, Share2, Download } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useLikes } from '../hooks/useLikes'

// Separate component for each Photo Card to give it its own state (useLikes)
function PhotoCard({ photo }) {
    const { user } = useAuth()
    const { likesCount, isLiked, toggleLike, animate, setAnimate } = useLikes(photo.id, photo.likes_count, user?.id)

    const handleShare = async () => {
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
            // Fallback: Copy to clipboard
            navigator.clipboard.writeText(shareData.url)
            alert('Link kopyalandı!')
        }
    }

    return (
        <div className="break-inside-avoid relative group rounded-xl overflow-hidden bg-gray-100 shadow-sm transition-all hover:scale-[1.02] duration-300 hover:shadow-lg mb-4">
            <img
                src={getCdnUrl(photo.storage_path, 600)}
                alt="Düğün Anı"
                loading="lazy"
                className="w-full h-auto object-cover display-block"
                onDoubleClick={toggleLike} // Instagram style like
            />
            {/* Overlay Gradient */}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            {/* Actions Bar */}
            <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                {/* Like Button */}
                <button
                    onClick={toggleLike}
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

                {/* Download Button */}
                <a
                    href={getCdnUrl(photo.storage_path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white text-gray-700 hover:text-primary transition-colors"
                    title="İndir"
                >
                    <Download className="w-5 h-5" />
                </a>
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
                        // Handle approval or like count updates
                        setPhotos((prev) => prev.map(p => p.id === payload.new.id ? payload.new : p))

                        // If it was just approved/unapproved, filter logic might be needed, but usually re-fetch is safer for consistency? 
                        // For now, let's just update the matching ID.
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
        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4 p-4">
            {photos.map((photo) => (
                <PhotoCard key={photo.id} photo={photo} />
            ))}
        </div>
    )
}
