import { useState } from 'react'
import imageCompression from 'browser-image-compression'
import { supabase } from '../lib/supabaseClient'
import { useUploadLimit } from '../hooks/useUploadLimit'
import { useAuth } from '../hooks/useAuth'
import { Upload as UploadIcon, Loader2, CheckCircle, AlertCircle, Camera } from 'lucide-react'

export default function Upload({ onUploadSuccess }) {
    const { user } = useAuth()
    const { isLimitReached, refresh, count, loading: limitLoading } = useUploadLimit(user?.id)
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState({ current: 0, total: 0 })
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(false)

    const handleFileChange = async (event) => {
        setError(null)
        setSuccess(false)
        const files = Array.from(event.target.files)
        if (files.length === 0) return

        const remainingSlots = 10 - count
        if (files.length > remainingSlots) {
            setError(`Sadece ${remainingSlots} fotoğraf daha yükleyebilirsiniz. Lütfen daha az fotoğraf seçin.`)
            event.target.value = null
            return
        }

        try {
            setUploading(true)
            setProgress({ current: 0, total: files.length })
            let uploadedCount = 0

            for (const file of files) {
                // 1. Compress Image
                const options = {
                    maxSizeMB: 0.3, // 300KB
                    maxWidthOrHeight: 1920,
                    useWebWorker: true,
                }
                const compressedFile = await imageCompression(file, options)

                // 2. Upload to Storage
                const fileExt = file.name.split('.').pop()
                const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`
                const filePath = `${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('wedding_photos')
                    .upload(filePath, compressedFile)

                if (uploadError) throw uploadError

                // 3. Insert into Database
                const { error: dbError } = await supabase
                    .from('photos')
                    .insert({
                        storage_path: filePath,
                        uploader_session_id: user.id,
                        caption: '',
                    })

                if (dbError) throw dbError

                uploadedCount++
                setProgress(prev => ({ ...prev, current: uploadedCount }))
            }

            // Success
            setSuccess(true)
            refresh() // Update count
            if (onUploadSuccess) onUploadSuccess()

        } catch (err) {
            console.error(err)
            setError(err.message || 'Fotoğraflar yüklenirken hata oluştu')
        } finally {
            setUploading(false)
            // Reset input
            event.target.value = null
        }
    }

    if (limitLoading) return <div className="text-gray-500 text-sm p-4 text-center">Limitler kontrol ediliyor...</div>

    return (
        <div className="glass-panel p-8 rounded-2xl max-w-md w-full mx-auto transition-all duration-300 hover:shadow-2xl">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-serif text-primary flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Anı Paylaş
                </h3>
                <span className={`text-xs font-medium px-3 py-1 rounded-full border ${isLimitReached
                    ? 'bg-red-50 text-red-600 border-red-100'
                    : 'bg-primary/10 text-primary border-primary/20'
                    }`}>
                    {10 - count} hak kaldı
                </span>
            </div>

            {isLimitReached ? (
                <div className="bg-red-50/50 border border-red-100 rounded-xl p-6 flex flex-col items-center text-center space-y-3">
                    <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-red-500" />
                    </div>
                    <p className="text-base text-red-700 font-medium font-serif">Yükleme Limiti Doldu</p>
                    <p className="text-sm text-red-500/80 leading-relaxed">
                        Katkınız için teşekkürler! Herkesin anılarına yer ayırabilmek için kişi başı 10 fotoğraf ile sınırlıdır.
                    </p>
                </div>
            ) : (
                <div className="relative group">
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        max={10 - count}
                        onChange={handleFileChange}
                        disabled={uploading}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                    />
                    <div className={`
                        border-2 border-dashed rounded-xl p-10 transition-all duration-300 flex flex-col items-center justify-center text-center gap-4
                        ${uploading
                            ? 'border-primary/30 bg-primary/5'
                            : 'border-gray-300 group-hover:border-primary group-hover:bg-primary/5 bg-white/50'
                        }
                    `}>
                        {uploading ? (
                            <>
                                <Loader2 className="w-12 h-12 text-primary animate-spin" />
                                <p className="text-sm font-medium text-gray-600 animate-pulse">
                                    Yükleniyor... {progress.current} / {progress.total}
                                </p>
                            </>
                        ) : success ? (
                            <>
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center animate-bounce-short">
                                    <CheckCircle className="w-8 h-8 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-lg font-serif text-gray-800">Fotoğraflar Paylaşıldı!</p>
                                    <p className="text-sm text-gray-500 mt-1">Yeni fotoğraf yüklemek için dokunun</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                    <UploadIcon className="w-8 h-8 text-primary" />
                                </div>
                                <div>
                                    <p className="text-lg font-serif text-gray-800">Fotoğraf Seçmek İçin Dokunun</p>
                                    <p className="text-sm text-gray-400 mt-1">Birden fazla seçebilirsiniz</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {error && (
                <div className="mt-4 p-4 bg-red-50/80 backdrop-blur-sm text-red-600 text-sm rounded-xl border border-red-100 flex items-start gap-3 animate-slide-in">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            {uploading && (
                <div className="mt-6 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div
                        className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    ></div>
                </div>
            )}
        </div>
    )
}
