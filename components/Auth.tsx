
import { useState } from 'react'
import { supabase } from '../services/supabaseClient'

export default function Auth() {
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isRegister, setIsRegister] = useState(false)

    const handleLogin = async (event: React.FormEvent) => {
        event.preventDefault()

        setLoading(true)

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            alert(error.message)
        }
        setLoading(false)
    }

    const handleRegister = async (event: React.FormEvent) => {
        event.preventDefault()

        setLoading(true)

        const { error } = await supabase.auth.signUp({
            email,
            password,
        })

        if (error) {
            alert(error.message)
        } else {
            alert('Check your email for the login link!')
        }
        setLoading(false)
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
                <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-white">
                    {isRegister ? 'Crear cuenta' : 'Iniciar sesión'}
                </h1>
                <p className="mt-2 text-center text-gray-600 dark:text-gray-400">
                    Sign inside via magic link later, for now just use email/password.
                </p>

                <form className="mt-6" onSubmit={isRegister ? handleRegister : handleLogin}>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Email
                        </label>
                        <input
                            type="email"
                            placeholder="tu@email.com"
                            value={email}
                            required={true}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                        />
                    </div>

                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Contraseña
                        </label>
                        <input
                            type="password"
                            placeholder="********"
                            value={password}
                            required={true}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 mt-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                        />
                    </div>

                    <button
                        className="w-full px-4 py-2 mt-6 font-bold text-white bg-blue-600 rounded hover:bg-blue-500 focus:outline-none focus:bg-blue-500"
                        disabled={loading}
                    >
                        {loading
                            ? 'Cargando...'
                            : isRegister
                                ? 'Registrarse'
                                : 'Iniciar sesión'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsRegister(!isRegister)}
                        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        {isRegister
                            ? '¿Ya tienes cuenta? Iniciar sesión'
                            : '¿No tienes cuenta? Regístrate'}
                    </button>
                </div>
            </div>
        </div>
    )
}
