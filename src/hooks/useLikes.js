import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useLikes(photoId, initialCount = 0, userId) {
    const [likesCount, setLikesCount] = useState(initialCount)
    const [isLiked, setIsLiked] = useState(false)
    const [animate, setAnimate] = useState(false)

    useEffect(() => {
        if (!userId || !photoId) return

        // Check if user has liked this photo
        const checkLikeStatus = async () => {
            const { data } = await supabase
                .from('photo_likes')
                .select('id')
                .eq('photo_id', photoId)
                .eq('user_id', userId)
                .maybeSingle()

            if (data) setIsLiked(true)
        }

        checkLikeStatus()
    }, [photoId, userId])

    const toggleLike = async () => {
        if (!userId) {
            // If strictly anonymous and no session, try to sign in anon (though App.jsx handles this)
            return
        }

        // Optimistic Update
        const previousLiked = isLiked
        const previousCount = likesCount

        setIsLiked(!previousLiked)
        setLikesCount(prev => previousLiked ? prev - 1 : prev + 1)
        if (!previousLiked) setAnimate(true) // Trigger heart animation

        try {
            if (previousLiked) {
                // Unlike
                const { error } = await supabase
                    .from('photo_likes')
                    .delete()
                    .eq('photo_id', photoId)
                    .eq('user_id', userId)

                if (error) throw error
            } else {
                // Like
                const { error } = await supabase
                    .from('photo_likes')
                    .insert({ photo_id: photoId, user_id: userId })

                if (error) throw error
            }
        } catch (error) {
            console.error('Error toggling like:', error)
            // Revert
            setIsLiked(previousLiked)
            setLikesCount(previousCount)
        }
    }

    return { likesCount, isLiked, toggleLike, animate, setAnimate }
}
