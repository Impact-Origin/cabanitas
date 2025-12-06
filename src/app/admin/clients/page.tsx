"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { getActiveBarbers } from "@/config/barbers";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Client {
  name: string;
  email: string | null;
  phone: string;
  barber: string;
  last_booking_date: string;
  total_bookings: number;
}

export default function ClientsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const barbers = getActiveBarbers();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchClients();
    }
  }, [status, selectedBarber]);

  useEffect(() => {
    filterClients();
  }, [clients, searchTerm]);

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/clients?barber=${selectedBarber}`);
      const data = await response.json();
      if (response.ok) {
        setClients(data.clients || []);
      } else {
        toast.error("Erro ao carregar clientes");
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast.error("Erro ao carregar clientes");
    } finally {
      setIsLoading(false);
    }
  };

  const filterClients = () => {
    if (!searchTerm) {
      setFilteredClients(clients);
      return;
    }

    const filtered = clients.filter(
      (client) =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.phone.includes(searchTerm)
    );
    setFilteredClients(filtered);
  };

  const handleBarberChange = (value: string) => {
    setSelectedBarber(value);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <div className="p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 md:mb-8 lg:mb-10">
            <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-black mb-2 md:mb-3">
              Área de Clientes
            </h1>
            <p className="text-gray-600 text-sm md:text-lg lg:text-xl">
              Gerir e visualizar informações dos clientes
            </p>
          </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 md:p-6 lg:p-8 mb-6 md:mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Barber Filter */}
            <div>
              <label className="block text-sm md:text-base lg:text-lg font-medium text-gray-700 mb-2 md:mb-3">
                Filtrar por Barbeiro
              </label>
              <Select value={selectedBarber} onValueChange={handleBarberChange}>
                <SelectTrigger className="w-full h-[44px] md:h-[52px] text-sm md:text-base lg:text-lg">
                  <SelectValue placeholder="Selecionar barbeiro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Barbeiros</SelectItem>
                  {barbers.map((barber) => (
                    <SelectItem key={barber.id} value={barber.name}>
                      {barber.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm md:text-base lg:text-lg font-medium text-gray-700 mb-2 md:mb-3">
                Pesquisar
              </label>
              <Input
                type="text"
                placeholder="Nome, email ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-[44px] md:h-[52px] text-sm md:text-base lg:text-lg"
              />
            </div>
          </div>
        </div>

        {/* Clients Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">
              A carregar clientes...
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Nenhum cliente encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 text-left text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 text-left text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Email
                    </th>
                    <th className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 text-left text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider">
                      Telefone
                    </th>
                    <th className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 text-left text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Barbeiro
                    </th>
                    <th className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 text-left text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      Última Marcação
                    </th>
                    <th className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 text-left text-xs md:text-sm lg:text-base font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredClients.map((client, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 whitespace-nowrap">
                        <div className="text-sm md:text-base lg:text-lg font-medium text-gray-900">
                          {client.name}
                        </div>
                        {/* Mobile: Show email and barber */}
                        <div className="md:hidden text-xs md:text-sm text-gray-500 mt-1">
                          {client.email && <div>{client.email}</div>}
                          <div>Barbeiro: {client.barber}</div>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 whitespace-nowrap hidden md:table-cell">
                        <div className="text-sm md:text-base lg:text-lg text-gray-900">
                          {client.email || "-"}
                        </div>
                      </td>
                      <td className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 whitespace-nowrap">
                        <a
                          href={`tel:${client.phone}`}
                          className="text-sm md:text-base lg:text-lg text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {client.phone}
                        </a>
                      </td>
                      <td className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 whitespace-nowrap hidden md:table-cell">
                        <div className="text-sm md:text-base lg:text-lg text-gray-900">{client.barber}</div>
                      </td>
                      <td className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 whitespace-nowrap hidden lg:table-cell">
                        <div className="text-sm md:text-base lg:text-lg text-gray-900">
                          {new Date(client.last_booking_date).toLocaleDateString("pt-PT")}
                        </div>
                      </td>
                      <td className="px-4 md:px-6 lg:px-8 py-3 md:py-4 lg:py-5 whitespace-nowrap hidden md:table-cell">
                        <div className="text-sm md:text-base lg:text-lg text-gray-900 font-medium">
                          {client.total_bookings}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary */}
          {!isLoading && filteredClients.length > 0 && (
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Total: <span className="font-medium">{filteredClients.length}</span> cliente(s)
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

