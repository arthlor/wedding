import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useAuth() {
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const signInAnonymously = async () => {
            const { error } = await supabase.auth.signInAnonymously()
            if (error) {
                console.error('Error signing in anonymously:', error)
                setLoading(false)
            }
        }

        // 1. Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            if (!session) {
                // 2. If no session, sign in anonymously
                signInAnonymously()
            } else {
                setLoading(false)
            }
        })

        // 3. Listen for changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
            setLoading(false)
        })

        return () => subscription.unsubscribe()
    }, [])

    return { session, user: session?.user, loading }
}
