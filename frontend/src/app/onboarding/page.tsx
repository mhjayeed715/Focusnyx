'use client'

const onboardingHtml = String.raw`
<div class="min-h-screen bg-gradient-to-b from-white to-gray-50">
  <!-- Header -->
  <header class="border-b border-gray-200 sticky top-0 bg-white/80 backdrop-blur-sm z-40">
    <div class="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">⚡</div>
        <span class="text-xl font-black text-gray-900 tracking-tight">FOCUSNYX</span>
      </div>
      <nav class="flex gap-8 text-sm font-medium text-gray-600">
        <a href="#" class="hover:text-gray-900">Onboarding</a>
        <a href="#" class="hover:text-gray-900">University Hub</a>
        <a href="#" class="hover:text-gray-900">Community</a>
      </nav>
      <div class="flex items-center gap-4">
        <button class="p-2 hover:bg-gray-100 rounded-lg">🔔</button>
        <button class="w-9 h-9 bg-gray-300 rounded-full"></button>
      </div>
    </div>
  </header>

  <!-- Step Indicator -->
  <div class="bg-white border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-6 py-8">
      <div class="flex items-center justify-center gap-8">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold">1</div>
          <span class="font-semibold text-gray-900">STEP 1</span>
        </div>
        <div class="flex-1 h-1 bg-gray-300 max-w-xs"></div>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-bold">2</div>
          <span class="font-semibold text-gray-400">STEP 2</span>
        </div>
        <div class="flex-1 h-1 bg-gray-300 max-w-xs"></div>
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-bold">3</div>
          <span class="font-semibold text-gray-400">STEP 3</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Main Content -->
  <main class="max-w-7xl mx-auto px-6 py-12">
    <div class="text-center mb-12">
      <h1 class="text-4xl md:text-5xl font-black text-gray-900 mb-3">Let's build your Academic Forge</h1>
      <p class="text-lg text-gray-600 max-w-2xl mx-auto">Tell us about your current university standing to personalize your focus rhythm and grade projections.</p>
    </div>

    <!-- Form Content -->
    <div class="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
      <!-- Academic Standing -->
      <div class="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center text-lg">🎓</div>
          <h2 class="text-xl font-bold text-gray-900">Academic Standing</h2>
        </div>
        
        <div class="space-y-6">
          <div>
            <label class="block text-xs font-bold text-gray-700 mb-3 tracking-wide">TARGET CGPA</label>
            <input type="number" placeholder="e.g. 3.85" step="0.01" min="0" max="4" class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 transition" />
          </div>
          
          <div>
            <label class="block text-xs font-bold text-gray-700 mb-3 tracking-wide">CURRENT SEMESTER</label>
            <select class="w-full px-4 py-3 border-2 border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 transition appearance-none bg-white">
              <option>Fall 2024</option>
              <option>Spring 2024</option>
              <option>Summer 2024</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Subject Load -->
      <div class="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
        <div class="flex items-center gap-3 mb-6">
          <div class="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center text-lg">📚</div>
          <h2 class="text-xl font-bold text-gray-900">Subject Load</h2>
        </div>
        
        <div class="space-y-4 mb-6">
          <div class="flex flex-wrap gap-3">
            <div class="inline-flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-full px-3 py-2">
              <span class="text-sm font-semibold text-gray-900">CSE 221</span>
              <button class="text-gray-600 hover:text-gray-900">×</button>
            </div>
            <div class="inline-flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-full px-3 py-2">
              <span class="text-sm font-semibold text-gray-900">MAT 120</span>
              <button class="text-gray-600 hover:text-gray-900">×</button>
            </div>
            <div class="inline-flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-full px-3 py-2">
              <span class="text-sm font-semibold text-gray-900">PHY 101</span>
              <button class="text-gray-600 hover:text-gray-900">×</button>
            </div>
          </div>
        </div>
        
        <button class="text-teal-600 font-bold text-sm hover:text-teal-700 flex items-center gap-2">
          + ADD SUBJECT
        </button>
        
        <p class="text-xs text-gray-600 mt-6 italic border-t border-gray-100 pt-4">Pro-tip: Adding credit hours helps our AI prioritize your study blocks.</p>
      </div>
    </div>

    <!-- Buttons -->
    <div class="flex justify-between items-center mt-12 max-w-4xl mx-auto">
      <button class="text-gray-600 font-semibold hover:text-gray-900">BACK TO LOGIN</button>
      <button class="px-8 py-3 text-gray-600 font-semibold hover:bg-gray-100 rounded-lg">SKIP</button>
      <button class="px-8 py-3 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 transition">FORGE PATH</button>
    </div>
  </main>

   <!-- Footer -->
       <p class="text-xs text-gray-400">© 2026 Focusnyx. All rights reserved.</p>
     </div>
   </footer>
</div>
`;

export default function OnboardingPage() {
  return <div dangerouslySetInnerHTML={{ __html: onboardingHtml }} />;
}
