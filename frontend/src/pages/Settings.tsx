import { motion } from 'framer-motion';
import { User, Building2, Mail, Shield, Bell, CreditCard, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sidebar } from '@/components/Sidebar';
import { useAuth } from '@/context/AuthContext';
import { Separator } from '@/components/ui/separator';

export default function Settings() {
  const { user } = useAuth();

  const sections = [
    {
      title: 'Perfil',
      icon: User,
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" defaultValue={user?.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue={user?.email} />
            </div>
          </div>
          <Button variant="glow">Guardar cambios</Button>
        </div>
      ),
    },
    {
      title: 'Organización',
      icon: Building2,
      content: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org">Nombre de la organización</Label>
            <Input id="org" defaultValue={user?.organization} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Sitio web</Label>
            <Input id="website" placeholder="https://tuempresa.com" />
          </div>
          <Button variant="glow">Actualizar</Button>
        </div>
      ),
    },
    {
      title: 'Notificaciones',
      icon: Bell,
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Nuevos juegos</p>
              <p className="text-sm text-muted-foreground">Recibe alertas cuando hay juegos nuevos</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Recordatorios de eventos</p>
              <p className="text-sm text-muted-foreground">Notificaciones antes de tus eventos</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Actualizaciones de producto</p>
              <p className="text-sm text-muted-foreground">Novedades y mejoras de la plataforma</p>
            </div>
            <Switch />
          </div>
        </div>
      ),
    },
    {
      title: 'Facturación',
      icon: CreditCard,
      content: (
        <div className="space-y-4">
          <div className="glass-card p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Plan actual</p>
                <p className="text-2xl font-bold gradient-text">Pro</p>
              </div>
              <Button variant="glass">Cambiar plan</Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Tu próximo cargo será el 1 de febrero de 2025
          </p>
          <Button variant="outline">Ver historial de pagos</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      <main className="ml-64 p-8 max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-display font-bold text-foreground">
            Configuración
          </h1>
          <p className="text-muted-foreground mt-1">
            Administra tu cuenta y preferencias
          </p>
        </motion.div>

        {/* Settings sections */}
        <div className="space-y-6">
          {sections.map((section, idx) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <section.icon className="w-5 h-5 text-primary" />
                </div>
                <h2 className="font-display font-semibold text-lg text-foreground">
                  {section.title}
                </h2>
              </div>
              {section.content}
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
