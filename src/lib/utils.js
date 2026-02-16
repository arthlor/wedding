import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
    return twMerge(clsx(inputs))
}

export function getCdnUrl(storagePath, width = 800) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    if (!supabaseUrl || !storagePath) return ''

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/wedding_photos/${storagePath}`

    // Use Netlify Image CDN if available (in production)
    // In dev, usage of .netlify/images might not work without netlify dev.
    // We'll fallback to direct Supabase URL in dev if needed, or just use the pattern 
    // ensuring the redirect rule is in netlify.toml

    const isDev = import.meta.env.DEV

    if (isDev) {
        return publicUrl
    }

    return `/.netlify/images?url=${encodeURIComponent(publicUrl)}&w=${width}&q=80&fit=cover`
}
