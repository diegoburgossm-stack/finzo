
import { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import { db } from './db'
import { Profile } from '../types'

type AuthContextType = {
    session: Session | null
    user: User | null
    profile: Profile | null
    loading: boolean
    refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    refreshProfile: async () => { },
})

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchProfile = async () => {
        if (!user) {
            setProfile(null);
            return;
        }
        try {
            const p = await db.getProfile();
            setProfile(p);
        } catch (e) {
            console.error("Error fetching profile", e);
        }
    };

    useEffect(() => {
        const setData = async () => {
            const { data: { session }, error } = await supabase.auth.getSession()
            if (error) console.error(error)
            setSession(session)
            setUser(session?.user ?? null)
            if (session?.user) {
                // Fetch profile here
                const p = await db.getProfile();
                setProfile(p);
            }
            setLoading(false)
        }

        const { data: listener } = supabase.auth.onAuthStateChange(
            async (_event, session) => {
                setSession(session)
                setUser(session?.user ?? null)
                setLoading(false)
                if (session?.user) {
                    const p = await db.getProfile();
                    setProfile(p);
                } else {
                    setProfile(null);
                }
            }
        )

        setData()

        return () => {
            listener?.subscription.unsubscribe()
        }
    }, [])

    const value = {
        session,
        user,
        profile,
        loading,
        refreshProfile: fetchProfile
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
    return useContext(AuthContext)
}
