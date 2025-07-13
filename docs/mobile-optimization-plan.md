# DungeonLab Mobile Optimization Plan

> **Update (2024-06): DungeonLab will be a PWA with a native-app look and feel on mobile.**
> - **Mobile app = PWA**: No separate native app; we use Progressive Web App features for installability and app-like UX.
> - **Bottom navigation bar**: On mobile, players get a bottom tab bar for quick switching between main views.
> - **Player-only on mobile**: Only player features are supported on mobile/phone. GM tools are desktop/tablet only.

---

## Executive Summary

DungeonLab will deliver a mobile experience via a Progressive Web App (PWA) that looks and feels like a native app. The mobile UI will feature a bottom navigation bar for players, providing fast access to the most important views: Character Sheet, Encounter Runner, Chat, and Settings. All GM/administrative tools will remain desktop/tablet only, greatly simplifying the mobile experience and focusing on player needs.

---

## 📈 Progress Tracker

- [x] **PWA Setup**
  - [x] Manifest.json, icons, and meta tags present for installability
  - [x] Test "Add to Home Screen" on iOS (iPhone Simulator)
  - [ ] Test "Add to Home Screen" on Android
  - [x] Use `display: standalone` and appropriate theme colors

- [x] **Core Mobile Architecture** ✨ **COMPLETED**
  - [x] Implement conditional layout rendering based on device detection
  - [x] Create MobileApp component with proper structure
  - [x] Implement bottom navigation bar with 4 main tabs (Chat, Encounter, Character, Settings)
  - [x] Build mobile header with contextual back button and add button functionality
  - [x] Establish responsive layout patterns for mobile vs desktop

- [x] **Mobile Navigation System** ✨ **COMPLETED**
  - [x] Smart back button with route hierarchy logic
  - [x] Contextual + button for list pages (campaigns, characters, maps, assets)
  - [x] Bottom tab navigation with active state highlighting
  - [x] Touch-optimized targets (44px minimum) throughout navigation

- [x] **Campaign List Mobile Optimization** ✨ **COMPLETED**
  - [x] Refactor Campaign List View to native iOS-style design
  - [x] Implement full-width list items with proper borders
  - [x] Add centered page headers for mobile
  - [x] Create reusable mobile list item patterns
  - [x] Remove floating action buttons that conflict with bottom navigation

- [ ] **Character List Mobile Optimization**
  - [ ] Apply mobile list patterns to character components
  - [ ] Optimize character sheet for mobile viewing
  - [ ] Implement mobile-friendly character creation flow

- [ ] **Maps & Assets Mobile Optimization** 
  - [ ] Apply mobile list patterns to maps and asset views
  - [ ] Optimize map viewer for touch interactions
  - [ ] Mobile-friendly asset upload flow

- [ ] **Forms & Input Optimization**
  - [ ] Optimize all forms for mobile (campaign create/edit, character creation, etc.)
  - [ ] Implement mobile-friendly modals and overlays
  - [ ] Touch-optimized input fields and controls

- [ ] **Encounter Runner Mobile Optimization**
  - [ ] Ensure Pixi.js canvas is touch-optimized (pinch, pan, tap)
  - [ ] Mobile HUD and controls for encounter actions
  - [ ] Performance tuning for mobile devices

- [ ] **Testing & QA**
  - [ ] Test on iOS Safari, Android Chrome, and PWA installed mode
  - [ ] Validate navigation, touch targets, and performance
  - [ ] Confirm GM/admin features are not accessible on mobile

---

## Success Criteria
- Users can install DungeonLab as a PWA and use it like a native app on their phone
- Players can easily switch between Character Sheet, Encounter, Chat, and Settings via the bottom nav bar
- All mobile UI is touch-optimized and accessible
- No GM/admin features are present on mobile
- GM/admin tools work fully on desktop/tablet

---

## 🏗️ Mobile Architecture & Patterns

### **Conditional Layout Architecture**

**Core Pattern**: Single codebase with conditional rendering based on device detection

```typescript
// App.vue - Single entry point with conditional layouts
const { isPhone } = useDeviceAdaptation();

// Template conditionally renders:
<MobileApp v-if="isPhone" />          // Phone layout
<div v-else>...</div>                 // Desktop/tablet layout
```

**Key Components:**
- `MobileApp.vue` - Mobile container with header + content + bottom nav
- `MobileHeader.vue` - Contextual header with back/add buttons
- `BottomNavigation.vue` - 4-tab native-style navigation
- `DefaultLayout.vue` - Shared layout that conditionally hides headers on mobile

### **Device Detection Strategy**

Using `useDeviceAdaptation` composable:
- **Phone**: `< 768px` width + touch-only devices
- **Tablet**: `768px - 1024px` (uses desktop layout currently)
- **Desktop**: `>= 1024px`

### **Mobile List Item Patterns** 

**Pattern for converting desktop lists to mobile:**

1. **Page Structure:**
```vue
<!-- Mobile header -->
<div v-if="isMobile" class="text-center py-4 border-b border-gray-200 bg-white">
  <h1 class="text-xl font-semibold">Page Title</h1>
</div>

<!-- List container -->
<div v-if="isMobile" class="bg-white">
  <MobileListItem v-for="item in items" :item="item" />
</div>
```

2. **List Item Component:**
```vue
<div class="relative w-full overflow-hidden bg-white border-b border-gray-200 last:border-b-0">
  <div class="flex items-center bg-white w-full px-4 py-3 min-h-[56px] active:bg-gray-50">
    <div class="flex-1 flex items-center justify-between">
      <div class="flex-1 min-w-0">
        <div class="font-medium text-gray-900 truncate text-[17px]">Title</div>
        <div class="text-sm text-gray-500 truncate mt-1">Subtitle</div>
      </div>
      <!-- iOS disclosure indicator -->
      <svg class="w-3 h-5 text-gray-400">...</svg>
    </div>
  </div>
</div>
```

### **Navigation Patterns**

**Smart Back Button Logic:**
- Uses route hierarchy mapping in `useBackNavigation.mts`
- Shows contextually (detail pages, edit pages, create pages)
- Navigates to logical parent routes

**Contextual Add Button:**
- Appears on list pages in mobile header
- Route-specific functionality (campaigns → create campaign)
- Replaces floating action buttons

**Bottom Navigation Integration:**
- 4 main tabs: Chat, Encounter, Character, Settings
- Active state management with route matching
- Touch-optimized with 44px minimum targets

### **Layout Coordination**

**Mobile Layout Flow:**
```
App.vue (isPhone) 
└── MobileApp.vue
    ├── MobileHeader.vue (contextual controls)
    ├── main → RouterView → DefaultLayout.vue
    │   └── (AppHeader hidden, no container padding)
    └── BottomNavigation.vue
```

**Key Implementation Details:**
- `DefaultLayout` conditionally hides `AppHeader` on phones
- Mobile removes container constraints for full-width lists
- iOS-style borders and touch feedback throughout

### **Reusable Patterns for Future Components**

1. **List Views**: Use established mobile list item pattern
2. **Page Headers**: Centered title with border-bottom
3. **Touch Targets**: 44px minimum, proper active states
4. **Navigation**: Leverage existing back/add button logic
5. **Spacing**: Full-width on mobile, contained on desktop

---

## Next Actions

**Character List Mobile Optimization** - Apply established patterns to character components and character sheet viewing.