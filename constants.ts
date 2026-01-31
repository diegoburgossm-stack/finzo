export const formatCLP = (amount: number): string => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('es-CL', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

export const CATEGORY_SUGGESTIONS: Record<string, string[]> = {
  food: ['Supermercado Lider', 'Supermercado Jumbo', 'Feria / Frutas', 'Restaurant', 'Cafetería', 'Uber Eats / Rappi', 'Almuerzo Trabajo'],
  transport: ['Carga Bencina', 'Peaje / Tag', 'Uber / Cabify', 'Estacionamiento', 'Carga Bip / Metro', 'Mantenimiento Auto'],
  entertainment: ['Cinehoyts / Cinemark', 'Entradas Evento', 'Bar / Pub', 'Juegos de Mesa', 'Hobby'],
  bills: ['Cuenta de Luz', 'Cuenta de Agua', 'Gas (Lipigas/Abastible)', 'Gasto Común', 'Internet Hogar', 'Plan Celular'],
  shopping: ['Ropa', 'Zapatos', 'Artículos de Aseo', 'Decoración Hogar', 'Farmacia Cruz Verde/Ahumada'],
  health: ['Consulta Médica', 'Farmacia', 'Dentista', 'Exámenes de Sangre', 'Psicólogo'],
  education: ['Mensualidad Universidad', 'Curso Online / Udemy', 'Libros / Papelería', 'Certificación'],
  travel: ['Pasaje Avión / Bus', 'Alojamiento / Airbnb', 'Comida en Viaje', 'Souvenirs'],
  pets: ['Comida Perro / Gato', 'Veterinario Control', 'Vacunas', 'Peluquería Mascota'],
  gym: ['Mensualidad Gimnasio', 'Proteína / Suplementos', 'Ropa Deportiva'],
  gifts: ['Regalo Cumpleaños', 'Regalo Matrimonio', 'Atención Especial'],
  subscriptions: ['Netflix', 'Spotify', 'Disney+', 'iCloud / Google One', 'Amazon Prime', 'YouTube Premium'],
  salary: ['Sueldo Mensual', 'Bono Desempeño', 'Aguinaldo', 'Pago Honorarios'],
  others: ['Gasto Vario', 'Imprevisto', 'Préstamo a Amigo', 'Comisión Banco']
};