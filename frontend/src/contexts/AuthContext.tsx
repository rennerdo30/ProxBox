import { ReactNode, createContext, useEffect, useState } from 'react'
import { jwtDecode } from 'jwt-decode'
import { api } from '../services/api'

interface User {
  id: number
  username: string
  email: string
  first_name: string | null
  last_name: string | null
  role: 'admin' | 'user'
  is_active: boolean
}

interface TokenData {
  sub: string
  exp: number
  role: 'admin' | 'user'
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  register: (userData: RegisterData) => Promise<void>
}

interface AuthProviderProps {
  children: ReactNode
}

interface RegisterData {
  username: string
  email: string
  password: string
  first_name?: string
  last_name?: string
}

export const AuthContext = createContext({} as AuthContextType)

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('accessToken')
      
      if (token) {
        try {
          // Set the token on the API
          api.defaults.headers.common.Authorization = `Bearer ${token}`
          
          // Decode the token to check if it's expired
          const decoded = jwtDecode<TokenData>(token)
          
          if (decoded.exp * 1000 < Date.now()) {
            // Token is expired, try to refresh
            const refreshToken = localStorage.getItem('refreshToken')
            
            if (refreshToken) {
              try {
                const response = await api.post('/api/auth/refresh', { token: refreshToken })
                
                const { access_token, refresh_token } = response.data
                
                localStorage.setItem('accessToken', access_token)
                localStorage.setItem('refreshToken', refresh_token)
                
                api.defaults.headers.common.Authorization = `Bearer ${access_token}`
              } catch (error) {
                // Refresh token also expired, logout
                handleLogout()
                setIsLoading(false)
                return
              }
            } else {
              // No refresh token, logout
              handleLogout()
              setIsLoading(false)
              return
            }
          }
          
          // Get user data
          const response = await api.get('/api/auth/me')
          setUser(response.data)
        } catch (error) {
          // In case of any error, clear tokens
          handleLogout()
        }
      }
      
      setIsLoading(false)
    }
    
    loadUser()
  }, [])

  const handleLogin = async (username: string, password: string) => {
    const response = await api.post('/api/auth/login', {
      username,
      password,
    })
    
    const { access_token, refresh_token } = response.data
    
    localStorage.setItem('accessToken', access_token)
    localStorage.setItem('refreshToken', refresh_token)
    
    api.defaults.headers.common.Authorization = `Bearer ${access_token}`
    
    // Get user data
    const userResponse = await api.get('/api/auth/me')
    setUser(userResponse.data)
  }

  const handleLogout = () => {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    delete api.defaults.headers.common.Authorization
    setUser(null)
  }

  const handleRegister = async (userData: RegisterData) => {
    await api.post('/api/auth/register', userData)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login: handleLogin,
        logout: handleLogout,
        register: handleRegister,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}