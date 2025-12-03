// Configuração de barbeiros
// Para adicionar um novo barbeiro, basta adicionar um objeto neste array

export interface Barber {
  id: string;
  name: string;
  title?: string;
  image?: string;
  active: boolean;
}

export const BARBERS: Barber[] = [
  {
    id: "edgar",
    name: "Edgar",
    title: "Barbeiro Mestre | Proprietário",
    image: "/assets/edgar_placeholder.jpg",
    active: true,
  },
  // Para adicionar um novo barbeiro, descomente e preencha:
  // {
  //   id: "joao",
  //   name: "João",
  //   title: "Barbeiro",
  //   image: "/assets/joao_placeholder.jpg",
  //   active: true,
  // },
];

// Função auxiliar para obter barbeiros ativos
export const getActiveBarbers = () => BARBERS.filter(b => b.active);

// Função auxiliar para obter um barbeiro por ID
export const getBarberById = (id: string) => BARBERS.find(b => b.id === id);

// Função auxiliar para obter nome do barbeiro
export const getBarberName = (id: string) => {
  const barber = getBarberById(id);
  return barber?.name || id;
};

