import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Building2, User, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlaytekLogo } from '@/components/PlaytekLogo';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

type AuthMode = 'login' | 'register' | 'forgot';

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organization, setOrganization] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'login') {
        const success = await login(email, password);
        if (success) {
          toast({ title: '¡Bienvenido!', description: 'Has iniciado sesión correctamente.' });
          navigate('/dashboard');
        } else {
          toast({ title: 'Error', description: 'Credenciales incorrectas.', variant: 'destructive' });
        }
      } else if (mode === 'register') {
        const success = await register(email, password, organization, name);
        if (success) {
          toast({ title: '¡Cuenta creada!', description: 'Tu cuenta ha sido creada exitosamente.' });
          navigate('/dashboard');
        } else {
          toast({ title: 'Error', description: 'No se pudo crear la cuenta.', variant: 'destructive' });
        }
      } else if (mode === 'forgot') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        toast({ title: 'Email enviado', description: 'Revisa tu bandeja de entrada para recuperar tu contraseña.' });
        setMode('login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const titles = {
    login: 'Inicia sesión',
    register: 'Crea tu cuenta',
    forgot: 'Recuperar contraseña',
  };

  const subtitles = {
    login: 'Accede a tu biblioteca de juegos interactivos',
    register: 'Únete a la plataforma de juegos más innovadora',
    forgot: 'Te enviaremos un enlace para restablecer tu contraseña',
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-background via-card to-background overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-accent/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <PlaytekLogo size="lg" />
            <h1 className="mt-8 text-4xl xl:text-5xl font-display font-bold text-foreground leading-tight">
              El Play Store de<br />
              <span className="gradient-text">juegos interactivos</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-md">
              Descubre, contrata y opera los mejores juegos para tus eventos corporativos y sociales.
            </p>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-12 space-y-4"
          >
            {['Catálogo premium de juegos', 'Configuración instantánea', 'Soporte 24/7'].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-muted-foreground">{feature}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <PlaytekLogo size="md" />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h2 className="text-2xl font-display font-bold text-foreground mb-2">
                {titles[mode]}
              </h2>
              <p className="text-muted-foreground mb-8">
                {subtitles[mode]}
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                {mode === 'register' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre completo</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="name"
                          type="text"
                          placeholder="Tu nombre"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="organization">Empresa / Organización</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          id="organization"
                          type="text"
                          placeholder="Nombre de tu empresa"
                          value={organization}
                          onChange={(e) => setOrganization(e.target.value)}
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                {mode !== 'forgot' && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                )}

                {mode === 'login' && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-sm text-primary hover:underline"
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                )}

                <Button
                  type="submit"
                  variant="hero"
                  size="lg"
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <motion.span
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                      />
                      Procesando...
                    </span>
                  ) : (
                    <>
                      {mode === 'login' && 'Iniciar sesión'}
                      {mode === 'register' && 'Crear cuenta'}
                      {mode === 'forgot' && 'Enviar enlace'}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              {/* Mode switch */}
              <div className="mt-6 text-center">
                {mode === 'login' && (
                  <p className="text-muted-foreground">
                    ¿No tienes cuenta?{' '}
                    <button
                      onClick={() => setMode('register')}
                      className="text-primary font-medium hover:underline"
                    >
                      Regístrate
                    </button>
                  </p>
                )}
                {mode === 'register' && (
                  <p className="text-muted-foreground">
                    ¿Ya tienes cuenta?{' '}
                    <button
                      onClick={() => setMode('login')}
                      className="text-primary font-medium hover:underline"
                    >
                      Inicia sesión
                    </button>
                  </p>
                )}
                {mode === 'forgot' && (
                  <button
                    onClick={() => setMode('login')}
                    className="text-primary font-medium hover:underline"
                  >
                    Volver al inicio de sesión
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
