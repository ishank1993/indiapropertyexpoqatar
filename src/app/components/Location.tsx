import React from "react";
import { MapPin, Sparkles } from "lucide-react";
import { Button } from "./ui/button";

interface LocationProps {
  onRegisterClick?: () => void;
}

export function Location({ onRegisterClick }: LocationProps = {}) {
  return (
    <section id="venues" className="py-20 bg-gradient-to-b from-white via-orange-50/30 to-white">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 rounded-3xl overflow-hidden bg-white shadow-2xl border border-orange-100">

          {/* Info Side */}
          <div className="p-10 flex flex-col justify-center space-y-8">
            <div>
              <div className="inline-block bg-gradient-to-r from-orange-600 to-green-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase mb-3">
                Venue Details
              </div>
              <h2 className="text-4xl font-black text-gray-900 mb-2">Event Venue</h2>
              <p className="text-gray-600 text-lg">A premium 5-star hotel in the heart of Doha, Qatar.</p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                  <MapPin className="text-white w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-gray-800">5-Star Hotel, Doha</h3>
                  <p className="text-gray-600 mt-1">
                    Easily accessible from West Bay, The Pearl,<br />
                    and all major residential areas of Doha.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Sparkles className="text-white w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-gray-800">Exact Address on RSVP</h3>
                  <p className="text-gray-600 mt-1">
                    To keep the event exclusive and well-managed, the exact hotel
                    name and address are shared directly with every registered
                    attendee via WhatsApp and email — along with parking and
                    directions.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={onRegisterClick}
              className="w-fit bg-gradient-to-r from-orange-600 to-green-600 hover:from-orange-700 hover:to-green-700 text-white font-bold shadow-lg hover:shadow-xl transition-all"
            >
              📍 RSVP to Get Venue Details
            </Button>
          </div>

          {/* Map Side */}
          <div className="h-[400px] lg:h-auto w-full bg-gray-200 relative">
             <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d115821.62!2d51.4166!3d25.2854!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3e45c527ad6e480d%3A0x21e42102a1c9d5b!2sDoha%2C%20Qatar!5e0!3m2!1sen!2sqa!4v1629876543210!5m2!1sen!2sqa"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={true}
                loading="lazy"
                title="Doha, Qatar Map"
                className="transition-all duration-500"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
