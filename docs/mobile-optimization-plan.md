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
- [ ] **Mobile-First UI/UX**
  - [ ] Implement a bottom navigation bar that appears only on mobile breakpoints (**Next step**)
  - [ ] Each main view (Character Sheet, Encounter, Chat, Settings) is a top-level route/tab
  - [ ] Use touch-friendly, accessible controls throughout
  - [ ] Optimize modals, popups, and overlays for mobile (full-screen, slide-up, etc.)
- [ ] **Responsive Design**
  - [ ] Use Tailwind CSS and existing breakpoints for mobile layouts
  - [ ] Hide or disable any GM/admin features on mobile
  - [ ] Ensure all forms, lists, and data displays are thumb-friendly
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

## Next Action

**Implement a bottom navigation bar that appears only on mobile breakpoints.**
- This will enable quick switching between the four main player views and is the foundation for the rest of the mobile UI/UX improvements. 