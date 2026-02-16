import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useUploadLimit(userId) {
    const [count, setCount] = useState(0)
    const [loading, setLoading] = useState(true)

    const fetchCount = useCallback(async () => {
        if (!userId) return

        try {
            const { count, error } = await supabase
                .from('photos')
                .select('*', { count: 'exact', head: true })
                .eq('uploader_session_id', userId)

            if (error) throw error
            setCount(count || 0)
        } catch (error) {
            console.error('Error fetching upload count:', error)
        } finally {
            setLoading(false)
        }
    }, [userId])

    useEffect(() => {
        fetchCount()
    }, [fetchCount])

    // Function to manually refresh, e.g., after upload
    const refresh = () => fetchCount()

    return { count, loading, refresh, isLimitReached: count >= 10 }
}
