import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { cn } from "./ui/utils";
import { trackCompleteRegistration } from "@/utils/metaConversionApi";
import { getSiteCountry } from "@/utils/siteCountry";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";

const GOOGLE_SHEETS_URL = "https://script.google.com/macros/s/AKfycbzA08KCv3DFbFMcKUzpMi5Ug-xUd0_tqDmicwg-xr0ENcNtx7OfJdGvqTaHzHOkYxWw/exec";

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// This is the ONE universal NRI NIVESH RSVP form. It must be identical —
// same fields, copy, order, and CRM schema — on every NRI NIVESH country
// website. Only the auto-detected `country` value differs by site.

const PRODUCT_INTERESTS = [
  { value: "Property", label: "Property" },
  { value: "NRI Tax & Wealth", label: "NRI Tax & Wealth" },
  { value: "GIFT City", label: "GIFT City" },
] as const;

// Dial codes for the phone field's country-code picker (international
// handling for the single "phone" field — not a separate lead field).
const dialCodes = [
  { code: "+974", country: "Qatar", flag: "🇶🇦" },
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
  { code: "+852", country: "Hong Kong", flag: "🇭🇰" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
  { code: "+1", country: "USA/Canada", flag: "🇺🇸" },
  { code: "+44", country: "UK", flag: "🇬🇧" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+60", country: "Malaysia", flag: "🇲🇾" },
  { code: "+86", country: "China", flag: "🇨🇳" },
  { code: "+81", country: "Japan", flag: "🇯🇵" },
  { code: "+82", country: "South Korea", flag: "🇰🇷" },
  { code: "+66", country: "Thailand", flag: "🇹🇭" },
  { code: "+64", country: "New Zealand", flag: "🇳🇿" },
  { code: "+27", country: "South Africa", flag: "🇿🇦" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+33", country: "France", flag: "🇫🇷" },
];

const DIAL_CODE_BY_COUNTRY: Record<string, string> = {
  Qatar: "+974",
  Singapore: "+65",
  "Hong Kong": "+852",
  UAE: "+971",
};

const indianCities = [
  "Mumbai",
  "Bangalore",
  "Delhi NCR",
  "Pune",
  "Hyderabad",
  "Chennai",
  "Goa",
  "Ahmedabad",
  "Kolkata",
  "Jaipur",
  "Chandigarh",
  "Kochi",
  "Indore",
  "Lucknow",
  "Coimbatore",
];

export function RegistrationModal({ isOpen, onClose, onSuccess }: RegistrationModalProps) {
  const country = React.useMemo(() => getSiteCountry(), []);

  const [formData, setFormData] = useState({
    productInterest: "",
    fullName: "",
    dialCode: DIAL_CODE_BY_COUNTRY[country] || "+974",
    phone: "",
    email: "",
    preferredCity: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.productInterest) {
      toast.error("Please select what you're interested in");
      return;
    }

    if (!formData.fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }

    if (!formData.phone.match(/^\d{7,15}$/)) {
      toast.error("Please enter a valid phone number (7-15 digits)");
      return;
    }

    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    // Canonical lead schema, identical across every NRI NIVESH website —
    // this is what a future Zoho CRM integration should consume directly.
    const lead = {
      product_interest: formData.productInterest,
      country,
      full_name: formData.fullName.trim(),
      phone: `${formData.dialCode}${formData.phone}`,
      email: formData.email.trim(),
      preferred_city: formData.preferredCity || "",
    };

    try {
      // Adapter for the current Google Sheets logger. When this moves to
      // Zoho CRM, replace this block with a post of `lead` as-is.
      const params = new URLSearchParams({
        action: "write",
        fullName: lead.full_name,
        email: lead.email,
        countryCode: formData.dialCode,
        phone: formData.phone,
        preferredCity: lead.preferred_city,
        productInterest: lead.product_interest,
        country: lead.country,
      });
      const response = await fetch(`${GOOGLE_SHEETS_URL}?${params}`);
      const result = await response.json();
      if (!result.success) throw new Error("Failed to save registration");

      // Best-effort forward into Zoho CRM. Fire-and-forget: never awaited,
      // never allowed to affect the registration flow above or below it.
      fetch("/api/zoho-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_interest: lead.product_interest,
          full_name: lead.full_name,
          phone: lead.phone,
          email: lead.email,
          preferred_city: lead.preferred_city,
          page_url: window.location.href,
        }),
      }).catch(() => {});

      trackCompleteRegistration(
        {
          email: lead.email,
          phone: lead.phone,
          firstName: lead.full_name,
          city: lead.preferred_city,
          country,
        },
        {
          event_type: "rsvp_registration",
          product_interest: lead.product_interest,
          preferred_city: lead.preferred_city,
          value: 0,
        }
      );

      setIsSuccess(true);
      localStorage.setItem("registrationSubmitted", "true");
      toast.success("Registration received!");

      setTimeout(() => {
        onClose();
        setIsSuccess(false);
        setFormData({
          productInterest: "",
          fullName: "",
          dialCode: DIAL_CODE_BY_COUNTRY[country] || "+974",
          phone: "",
          email: "",
          preferredCity: "",
        });
        if (onSuccess) onSuccess();
      }, 2500);
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center">
            <CheckCircle2 className="w-16 h-16 sm:w-20 sm:h-20 text-green-500 mb-4 sm:mb-6" />
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">Thank You!</h3>
            <p className="text-sm sm:text-base text-gray-600 px-2">
              Thank you for registering your interest with NRI NIVESH. Our team will contact you shortly with the RSVP details, including the date and venue.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-1 sm:space-y-1.5 mb-1">
          <DialogTitle className="text-lg sm:text-2xl font-bold text-center pr-8 sm:pr-10 bg-gradient-to-r from-orange-600 to-green-600 bg-clip-text text-transparent">
            Register Your Interest
          </DialogTitle>
          <DialogDescription className="text-center text-xs sm:text-sm px-1 sm:px-2">
            Tell us a little about your interest and our team will provide you with the RSVP details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 pt-1 sm:pt-2">
          {/* Product Interest */}
          <div className="space-y-1.5">
            <Label className="text-xs sm:text-sm">
              What are you interested in? <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {PRODUCT_INTERESTS.map(({ value, label }) => {
                const isSelected = formData.productInterest === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => handleInputChange("productInterest", value)}
                    aria-pressed={isSelected}
                    className={cn(
                      "rounded-md border px-2 py-3.5 text-center text-xs sm:text-sm font-medium transition-colors",
                      isSelected
                        ? "border-orange-600 bg-orange-50 text-orange-700"
                        : "border-input bg-input-background text-foreground hover:border-orange-300"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-xs sm:text-sm">
              Full Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChange={(e) => handleInputChange("fullName", e.target.value)}
              required
              className="h-9 sm:h-10 text-sm sm:text-base"
              aria-required="true"
            />
          </div>

          {/* Phone Number and Email Address */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 md:gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs sm:text-sm">
                Phone Number <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-1.5 sm:gap-2">
                <Select
                  value={formData.dialCode}
                  onValueChange={(value) => handleInputChange("dialCode", value)}
                >
                  <SelectTrigger className="w-[104px] sm:w-[110px] h-9 sm:h-10 text-xs sm:text-sm px-2.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dialCodes.map((item) => (
                      <SelectItem key={item.code} value={item.code} className="text-xs sm:text-sm">
                        {item.flag} {item.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="12345678"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value.replace(/\D/g, ""))}
                  required
                  className="flex-1 h-9 sm:h-10 text-sm sm:text-base"
                  pattern="\d{7,15}"
                  aria-required="true"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs sm:text-sm">
                Email Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                required
                className="h-9 sm:h-10 text-sm sm:text-base"
                aria-required="true"
              />
            </div>
          </div>

          {/* Preferred City of Interest */}
          <div className="space-y-1.5">
            <Label htmlFor="preferredCity" className="text-xs sm:text-sm">
              Preferred City of Interest
            </Label>
            <Select onValueChange={(value) => handleInputChange("preferredCity", value)}>
              <SelectTrigger id="preferredCity" className="h-9 sm:h-10 text-xs sm:text-sm">
                <SelectValue placeholder="Select a city" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exploring" className="text-xs sm:text-sm">Still Exploring</SelectItem>
                <SelectItem value="multiple" className="text-xs sm:text-sm">Multiple Cities</SelectItem>
                {indianCities.map((city) => (
                  <SelectItem key={city} value={city.toLowerCase().replace(/\s+/g, "-")} className="text-xs sm:text-sm">
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-[11px] sm:text-xs text-center text-gray-500">
            Once you enter your information, our team will provide you with the RSVP details, including the date, venue and other relevant information.
          </p>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-orange-600 to-green-600 hover:from-orange-700 hover:to-green-700 text-white font-bold text-sm sm:text-base py-4 sm:py-5 h-auto shadow-lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                Submitting...
              </>
            ) : (
              "Get RSVP Details"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
