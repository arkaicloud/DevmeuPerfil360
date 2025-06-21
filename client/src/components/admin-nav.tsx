import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Settings,
  Mail,
  FileText,
  Users,
  DollarSign,
  Menu,
  X,
  LogOut,
  CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface AdminNavProps {
  onLogout: () => void;
}

const navItems = [
  {
    title: "Dashboard",
    href: "/admin/dashboard",
    icon: BarChart3,
    description: "Visão geral e métricas"
  },
  {
    title: "Configuração SMTP",
    href: "/admin/email-config", 
    icon: Settings,
    description: "Configurar envio de emails"
  },
  {
    title: "Templates de Email",
    href: "/admin/email-templates",
    icon: Mail,
    description: "Personalizar mensagens automáticas"
  },
  {
    title: "Configuração de Preços",
    href: "/admin/pricing",
    icon: DollarSign,
    description: "Gerenciar preços e promoções"
  },
  {
    title: "Métodos de Pagamento",
    href: "/admin/payment-methods",
    icon: CreditCard,
    description: "Controlar PIX, cartões e carteiras digitais"
  }
];

export default function AdminNav({ onLogout }: AdminNavProps) {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:border-r lg:border-gray-200 lg:bg-white lg:shadow-sm">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-red-500 via-orange-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">MP</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
                <p className="text-xs text-gray-500">MeuPerfil360</p>
              </div>
            </div>
          </div>
          
          <nav className="mt-8 flex-1 px-2 space-y-1">
            {navItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer",
                      isActive
                        ? "bg-gradient-to-r from-red-50 to-orange-50 text-red-700 border-r-2 border-red-500"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    <Icon
                      className={cn(
                        "mr-3 h-5 w-5 flex-shrink-0",
                        isActive ? "text-red-500" : "text-gray-400 group-hover:text-gray-500"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{item.title}</span>
                      <span className="text-xs text-gray-400">{item.description}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>
          
          <div className="flex-shrink-0 px-2">
            <Button
              onClick={onLogout}
              variant="ghost"
              className="w-full justify-start text-gray-600 hover:text-red-600 hover:bg-red-50"
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden bg-white shadow-sm border-b">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 via-orange-500 to-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">MP</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
        
        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="border-t bg-white">
            <nav className="px-2 py-3 space-y-1">
              {navItems.map((item) => {
                const isActive = location === item.href;
                const Icon = item.icon;
                
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={cn(
                        "group flex items-center px-2 py-2 text-base font-medium rounded-md cursor-pointer",
                        isActive
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Icon
                        className={cn(
                          "mr-3 h-6 w-6 flex-shrink-0",
                          isActive ? "text-blue-500" : "text-gray-400"
                        )}
                      />
                      {item.title}
                    </div>
                  </Link>
                );
              })}
              
              <Button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onLogout();
                }}
                variant="ghost"
                className="w-full justify-start mt-4 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="mr-3 h-6 w-6" />
                Sair
              </Button>
            </nav>
          </div>
        )}
      </div>
    </>
  );
}