'use client';

import Link from 'next/link';
import { Wrench, Calendar, Clock, Shield, MapPin, Phone, Mail } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-blue-900 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Wrench className="h-8 w-8" />
              <h1 className="text-2xl font-bold">Taller Automotriz</h1>
            </div>
            <div className="space-x-4">
              <Link href="/login" className="hover:text-blue-200 transition">
                Iniciar Sesión
              </Link>
              <Link
                href="/register"
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition"
              >
                Registrarse
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section className="bg-gradient-to-r from-blue-900 to-blue-700 text-white py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Tu Mecánico de Confianza
          </h2>
          <p className="text-xl mb-8">
            Servicio automotriz profesional con tecnología de punta
          </p>
          <Link
            href="/register"
            className="bg-white text-blue-900 hover:bg-gray-100 px-8 py-3 rounded-lg font-semibold text-lg transition"
          >
            Agendar Cita
          </Link>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12">Nuestros Servicios</h3>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: 'Mantenimiento Preventivo', desc: 'Revisión completa de tu vehículo', icon: Shield },
              { title: 'Reparaciones', desc: 'Diagnóstico y reparación de fallas', icon: Wrench },
              { title: 'Servicio Express', desc: 'Cambio de aceite y filtros', icon: Clock },
            ].map((service, idx) => (
              <div key={idx} className="text-center p-6 border rounded-lg hover:shadow-lg transition">
                <service.icon className="h-12 w-12 text-blue-700 mx-auto mb-4" />
                <h4 className="text-xl font-semibold mb-2">{service.title}</h4>
                <p className="text-gray-600">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gray-100 py-16">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12">Contáctanos</h3>
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <MapPin className="h-8 w-8 text-blue-700 mx-auto mb-2" />
              <p className="font-semibold">Dirección</p>
              <p className="text-gray-600">San Salvador, El Salvador</p>
            </div>
            <div>
              <Phone className="h-8 w-8 text-blue-700 mx-auto mb-2" />
              <p className="font-semibold">Teléfono</p>
              <p className="text-gray-600">+503 1234-5678</p>
            </div>
            <div>
              <Mail className="h-8 w-8 text-blue-700 mx-auto mb-2" />
              <p className="font-semibold">Email</p>
              <p className="text-gray-600">info@tallermecanico.com</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}