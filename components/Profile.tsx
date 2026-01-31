import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../services/AuthContext';
import { db } from '../services/db';
import { User, Calendar, Camera, Upload, Loader2 } from 'lucide-react';
import { Button, Input } from './UIComponents';
import { supabase } from '../services/supabaseClient';

interface ProfileProps {
    theme: 'dark' | 'light';
    onClose?: () => void;
}

export const ProfileComponent: React.FC<ProfileProps> = ({ theme, onClose }) => {
    const { user, profile, refreshProfile } = useAuth();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
        avatar_url: '',
    });

    useEffect(() => {
        if (profile) {
            setFormData({
                username: profile.username || '',
                full_name: profile.full_name || '',
                avatar_url: profile.avatar_url || '',
            });
        }
    }, [profile]);

    const handleUpdate = async () => {
        setLoading(true);
        try {
            await db.updateProfile({
                username: formData.username,
                full_name: formData.full_name,
                avatar_url: formData.avatar_url,
            });
            await refreshProfile();
            alert('Perfil actualizado correctamente');
            if (onClose) onClose();
        } catch (error: any) {
            alert('Error updating profile: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) {
            return;
        }

        const file = event.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        setUploading(true);

        try {
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
        } catch (error: any) {
            alert('Error uploading avatar: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className={`p-6 max-w-2xl mx-auto space-y-8 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-700'}`}>
            <div className="flex flex-col items-center gap-4">
                <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                    <div className={`w-32 h-32 rounded-full overflow-hidden border-4 ${theme === 'dark' ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-100'} flex items-center justify-center relative`}>
                        {uploading ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                                <Loader2 className="animate-spin text-white" size={32} />
                            </div>
                        ) : null}

                        {formData.avatar_url ? (
                            <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover transition-opacity group-hover:opacity-75" />
                        ) : (
                            <User size={64} className="text-slate-400 group-hover:opacity-75 transition-opacity" />
                        )}

                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 z-10">
                            <Camera className="text-white drop-shadow-md" size={32} />
                        </div>
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept="image/*"
                    />
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-bold">{profile?.full_name || 'Usuario'}</h2>
                    <p className="text-sm text-slate-400">{user?.email}</p>
                </div>
            </div>

            <div className={`p-6 rounded-2xl border space-y-6 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className="flex flex-col gap-6">
                    <Input
                        label="Nombre Completo"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        theme={theme}
                        icon={<User size={16} />}
                    />
                    <Input
                        label="Nombre de Usuario"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        theme={theme}
                        placeholder="@usuario"
                    />
                </div>

                <div className="pt-4 border-t border-inherit flex justify-end gap-3">
                    {onClose && <Button variant="ghost" onClick={onClose} theme={theme}>Cerrar</Button>}
                    <Button onClick={handleUpdate} disabled={loading || uploading} theme={theme}>
                        {loading ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </div>
            </div>

            <div className={`p-4 rounded-xl flex items-center gap-4 text-sm ${theme === 'dark' ? 'bg-slate-800/30 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                <Calendar size={16} />
                <span>Miembro desde {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</span>
            </div>
        </div>
    );
};
