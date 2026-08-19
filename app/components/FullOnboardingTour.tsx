"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Zap, 
  Camera, 
  Heart, 
  Image as ImageIcon, 
  Plus, 
  Upload, 
  Feather,
  Mic,
  Video as VideoIcon,
  Settings,
  Eye,
  Lock,
  Smartphone,
  Wifi
} from "lucide-react";

interface Step {
  title: string;
  description: string;
  mockScreen: React.ReactNode;
}

export default function FullOnboardingTour() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const hasCompleted = localStorage.getItem("has_completed_full_tour");
    if (!hasCompleted) {
      setIsVisible(true);
    }

    const handleOpen = () => {
      localStorage.removeItem("has_completed_full_tour");
      setCurrentStep(0);
      setIsVisible(true);
    };

    window.addEventListener("open-onboarding", handleOpen);
    return () => window.removeEventListener("open-onboarding", handleOpen);
  }, []);

  const handleComplete = () => {
    localStorage.setItem("has_completed_full_tour", "true");
    setIsVisible(false);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const steps: Step[] = [
    {
      title: "The Magic of Scanning",
      description: "Experience the seamless connection between the physical and digital. Simply tap your phone to any Our Dve charm to instantly unlock its stories and secrets.",
      mockScreen: (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-[#F6F2EC] relative overflow-hidden">
          {/* NFC Waves Animation */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full flex items-center justify-center">
            {[1, 2, 3].map((i) => (
              <motion.div
                key={i}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 2, opacity: [0, 0.3, 0] }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  delay: i * 0.6,
                  ease: "easeOut" 
                }}
                className="absolute w-40 h-40 border-2 border-[#7C9A86] rounded-full"
              />
            ))}
          </div>

          {/* Charm */}
          <div className="w-24 h-24 bg-[#556B5A] rounded-[24px] flex items-center justify-center mb-12 shadow-xl relative z-10">
             <img src="/green_logo.png" alt="Our Dve" className="w-16 h-16 invert" />
          </div>

          {/* Phone Tapping Animation */}
          <motion.div
            animate={{ 
              y: [100, -20, 0],
              rotate: [0, -10, 0]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              repeatDelay: 1
            }}
            className="w-32 h-60 bg-white rounded-[32px] border-4 border-gray-800 shadow-2xl relative z-20 flex flex-col p-4"
          >
            <div className="w-12 h-1 bg-gray-800 rounded-full mx-auto mb-4" />
            <div className="flex-1 rounded-xl bg-gray-50 flex items-center justify-center">
              <Wifi className="w-8 h-8 text-[#7C9A86] rotate-90" />
            </div>
          </motion.div>
        </div>
      )
    },
    {
      title: "Quick Snap: Instant Memories",
      description: "When someone scans your charm, they see a public view. They can use 'Quick Snap' to capture and send a photo directly to your charm instantly—no login or app required!",
      mockScreen: (
        <div className="h-full bg-white/40 backdrop-blur-xl rounded-[32px] border border-white/50 relative overflow-hidden flex items-center justify-center p-6">
           {/* Mock Quick Snap Button */}
           <div className="absolute top-4 right-4 z-20">
              <div className="relative">
                <button className="bg-[#7C9A86] text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm pointer-events-none">
                  <Camera className="w-4 h-4" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Quick Snap</span>
                </button>
                <motion.div
                  animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.2, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 ring-4 ring-[#7C9A86] rounded-xl pointer-events-none"
                />
              </div>
           </div>
           
           <div className="text-center">
              <div className="w-16 h-16 bg-[#F2E6DE] rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-[#556B5A]" />
              </div>
              <h3 className="text-xl font-bold text-[#556B5A] mb-2">Capture the Moment</h3>
              <p className="text-[#556B5A]/60 text-sm max-w-[200px] mx-auto">Instant guest uploads are linked to your physical charm forever.</p>
           </div>
        </div>
      )
    },
    {
      title: "The Dashboard",
      description: "This is your private hub. Every charm you own is displayed here in a beautiful grid. Tap any cell to explore its memories or manage its settings.",
      mockScreen: (
        <div className="h-full bg-[#F6F2EC] p-6 overflow-hidden">
           <div className="flex justify-between items-center mb-8">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                 <Smartphone className="w-4 h-4 text-[#556B5A]" />
              </div>
              <div className="w-24 h-4 bg-[#556B5A]/10 rounded-full" />
              <div className="w-8 h-8 bg-[#556B5A] rounded-full flex items-center justify-center">
                 <div className="w-4 h-4 rounded-full border-2 border-white" />
              </div>
           </div>
           
           <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                <div 
                  key={i} 
                  className={`aspect-square rounded-[24px] flex items-center justify-center shadow-sm relative ${
                    i === 5 ? 'bg-white scale-110 z-10 border-2 border-[#7C9A86]' : 'bg-white'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full ${i === 5 ? 'bg-[#7C9A86]' : 'bg-[#E6DED1]'}`} />
                  {i === 5 && (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 ring-4 ring-[#7C9A86] rounded-[24px] pointer-events-none"
                    />
                  )}
                </div>
              ))}
           </div>
           <div className="mt-8 text-center text-[#556B5A]/40 text-[10px] font-bold uppercase tracking-widest">
              TAP TO EXPLORE
           </div>
        </div>
      )
    },
    {
      title: "Preserving Memories",
      description: "Inside a charm, tap the floating Image icon to upload photos, videos, or audio. Each upload adds another layer to your charm's story.",
      mockScreen: (
        <div className="h-full bg-white p-6 relative">
           <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-[#556B5A] rounded-full" />
              <div className="w-32 h-4 bg-[#556B5A]/10 rounded-full" />
           </div>
           
           <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="aspect-square bg-[#F6F2EC] rounded-2xl" />
              <div className="aspect-square bg-[#F6F2EC] rounded-2xl" />
           </div>

           <div className="absolute bottom-6 right-6">
              <div className="relative">
                <div className="w-14 h-14 bg-[#556B5A] rounded-full flex items-center justify-center shadow-lg">
                  <ImageIcon className="w-6 h-6 text-white" />
                </div>
                <motion.div
                  animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0.2, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 ring-4 ring-[#556B5A] rounded-full pointer-events-none"
                />
              </div>
           </div>
        </div>
      )
    },
    {
      title: "Building a Bucket List",
      description: "Switch to 'Bucket List' to track life goals. When a goal is lived, you can link your media to it, creating a timeline of achievements.",
      mockScreen: (
        <div className="h-full bg-white p-0 flex flex-col">
           <div className="p-6 pb-0 flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#7C9A86]/10 rounded-full flex items-center justify-center">
                <Heart className="w-5 h-5 text-[#7C9A86]" />
              </div>
              <h3 className="text-xl font-bold text-[#556B5A]">Bucket List</h3>
           </div>
           
           <div className="flex-1 px-6 space-y-3">
              <div className="bg-[#F6F2EC]/50 p-4 rounded-2xl flex items-center justify-between border border-[#E6DED1]/50">
                 <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-[#7C9A86] flex items-center justify-center">
                       <div className="w-2 h-2 rounded-full bg-[#7C9A86]" />
                    </div>
                    <span className="text-sm font-bold text-[#556B5A]">Skydiving</span>
                 </div>
              </div>
           </div>

           {/* Mock Toggle */}
           <div className="p-6 bg-gray-50 flex items-center justify-between gap-4">
              <div className="h-10 bg-white border border-gray-200 rounded-xl flex-1 flex p-1 relative">
                 <div className="w-1/2 bg-[#556B5A] rounded-lg shadow-sm ml-auto" />
                 <div className="absolute inset-0 flex">
                    <div className="w-1/2 flex items-center justify-center text-[8px] font-bold text-gray-400">GALLERY</div>
                    <div className="w-1/2 flex items-center justify-center text-[8px] font-bold text-white">BUCKET LIST</div>
                 </div>
                 <motion.div
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-[#7C9A86] pointer-events-none"
                />
              </div>
              <div className="w-10 h-10 bg-[#7C9A86] rounded-full flex items-center justify-center shadow-md">
                 <Plus className="w-5 h-5 text-white" />
              </div>
           </div>
        </div>
      )
    },
    {
      title: "Control Your Showcase",
      description: "Only memories you 'Like' (Heart icon) appear in the public showcase when others scan your charm. Everything else stays strictly private to you.",
      mockScreen: (
        <div className="h-full bg-[#F6F2EC] p-6">
           <div className="grid grid-cols-2 gap-4">
              {[1, 2].map(i => (
                 <div key={i} className="aspect-square bg-white rounded-3xl p-3 flex flex-col shadow-sm relative">
                    <div className="flex-1 bg-gray-50 rounded-2xl mb-2" />
                    <div className="flex justify-between items-center px-1">
                       <div className="w-12 h-2 bg-gray-100 rounded-full" />
                       <div className="relative">
                          <Heart className={`w-5 h-5 ${i === 1 ? 'text-red-500 fill-red-500' : 'text-gray-200'}`} />
                          {i === 1 && (
                             <motion.div
                                animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                                transition={{ duration: 1, repeat: Infinity }}
                                className="absolute inset-0 text-red-500 fill-red-500"
                             >
                                <Heart className="w-5 h-5 fill-red-500" />
                             </motion.div>
                          )}
                       </div>
                    </div>
                 </div>
              ))}
           </div>
           <div className="mt-8 bg-white/60 p-4 rounded-2xl border border-[#7C9A86]/30 flex items-center gap-3">
              <Eye className="w-5 h-5 text-[#7C9A86]" />
              <p className="text-[11px] font-bold text-[#556B5A]">Liked memories create your public story!</p>
           </div>
        </div>
      )
    },
    {
      title: "Privacy & Guest Toggles",
      description: "Use Charm Settings to disable the Public Showcase or turn off Guest Quick Snaps whenever you want total privacy for your collection.",
      mockScreen: (
        <div className="h-full bg-white p-6">
           <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                 <Settings className="w-6 h-6 text-[#556B5A]" />
                 <h3 className="text-lg font-black text-[#556B5A] uppercase">SETTINGS</h3>
              </div>
           </div>
           
           <div className="space-y-6">
              {[
                { label: "Public Showcase", desc: "Allow anyone to see liked memories", icon: Eye, active: true },
                { label: "Guest Uploads", desc: "Allow others to use Quick Snap", icon: Camera, active: false }
              ].map((toggle, i) => (
                <div key={toggle.label} className="flex items-center justify-between p-4 bg-[#F6F2EC]/50 rounded-2xl border border-[#E6DED1]/50">
                   <div className="flex items-center gap-3">
                      <toggle.icon className="w-5 h-5 text-[#556B5A]" />
                      <div>
                         <p className="text-sm font-bold text-[#556B5A]">{toggle.label}</p>
                         <p className="text-[10px] text-[#A69D93]">{toggle.desc}</p>
                      </div>
                   </div>
                   <div className={`w-10 h-6 rounded-full p-1 transition-colors ${toggle.active ? 'bg-[#7C9A86]' : 'bg-gray-200'} flex items-center ${toggle.active ? 'justify-end' : 'justify-start'}`}>
                      <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                   </div>
                </div>
              ))}
              <div className="flex items-center justify-center pt-4">
                 <Lock className="w-4 h-4 text-[#A69D93] mr-2" />
                 <span className="text-[10px] font-bold text-[#A69D93] uppercase">Your Privacy is Priority</span>
              </div>
           </div>
        </div>
      )
    }
  ];

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[1000] flex flex-col bg-[#556B5A]/40 backdrop-blur-md p-4 md:p-8 font-[Outfit]">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex-1 max-w-lg mx-auto w-full bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col relative"
          >
            {/* Mock Screen Container */}
            <div className="flex-1 relative overflow-hidden bg-gray-50 border-b border-gray-100">
               <AnimatePresence mode="wait">
                 <motion.div
                   key={currentStep}
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   exit={{ opacity: 0, x: -20 }}
                   transition={{ duration: 0.4, ease: "easeOut" }}
                   className="h-full w-full"
                 >
                   {steps[currentStep].mockScreen}
                 </motion.div>
               </AnimatePresence>
            </div>

            {/* Content & Navigation */}
            <div className="p-8 pb-10">
              {/* Progress Indicator */}
              <div className="flex gap-1.5 mb-6">
                {steps.map((_, i) => (
                  <div 
                    key={i} 
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentStep ? "w-8 bg-[#7C9A86]" : "w-2 bg-gray-200"
                    }`} 
                  />
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="min-h-[160px]"
                >
                  <h2 className="text-[26px] font-black text-[#556B5A] uppercase mb-3 leading-tight tracking-tight">
                    {steps[currentStep].title}
                  </h2>
                  <p className="text-[#556B5A]/80 text-[14px] font-bold leading-relaxed">
                    {steps[currentStep].description}
                  </p>
                </motion.div>
              </AnimatePresence>

              <div className="flex items-center justify-between mt-8">
                <button
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className={`p-4 rounded-2xl flex items-center justify-center transition-all ${
                    currentStep === 0 
                    ? "bg-gray-100 text-gray-300 pointer-events-none" 
                    : "bg-gray-100 text-[#556B5A] hover:bg-gray-200 active:scale-95"
                  }`}
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <button
                  onClick={nextStep}
                  className="flex-1 ml-4 bg-[#556B5A] hover:bg-[#445849] text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#556B5A]/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <span className="text-sm uppercase tracking-widest">{currentStep === steps.length - 1 ? "Start Experience" : "Next Step"}</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              
              <button 
                onClick={handleComplete}
                className="w-full text-center mt-6 text-[#A69D93] text-[10px] font-black uppercase tracking-widest hover:text-[#556B5A] transition-colors"
              >
                Skip Tour
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
