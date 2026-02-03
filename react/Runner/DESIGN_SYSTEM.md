# Clean Pace Minimal Design System

## Overview
Ultra-minimal Scandinavian-inspired design for runners tracking progress mindfully. Built with a calm, breathable, health-first approach.

## Core Philosophy
- Clear and uncluttered interfaces
- Breathable white space
- Mindful user experience
- Focus on content over decoration
- No unnecessary shadows or noise

---

## Color Palette

### Primary Colors
```typescript
#FDFDFC – Off White: calm, bright, uncluttered
#DCEAF2 – Frost Blue: reduces stress and UI noise
#AAC4D6 – Misty Slate: supportive neutrals
#5B7EA4 – Cool Steel: strong but muted
#2A2E36 – Charcoal: stable dark contrast
```

### Usage
- **Background**: Off White (#FDFDFC) for light mode, Charcoal (#2A2E36) for dark mode
- **Primary Actions**: Cool Steel (#5B7EA4)
- **Secondary Elements**: Misty Slate (#AAC4D6)
- **Accent/Highlights**: Frost Blue (#DCEAF2)
- **Borders**: #ECECEC (subtle, never harsh)

### Psychology
- **Off White**: Creates calm, uncluttered feeling
- **Frost Blue**: Reduces visual stress and UI noise
- **Misty Slate**: Provides supportive neutral tones
- **Cool Steel**: Strong but muted for primary actions
- **Charcoal**: Stable, grounding dark contrast

---

## Typography

### Font Families
```typescript
Headline: SF Pro Display (fallback to system sans-serif)
Body: SF Pro Text (fallback to system sans-serif)
```

### Font Sizes
- **H1**: 32px (never exceeds 36px to stay calm)
- **H2**: 24px
- **H3**: 20px
- **Body**: 16px
- **Body Small**: 14px
- **Caption**: 12px

### Line Heights
- **Headlines**: 1.2 (tight, focused)
- **Body Text**: 1.4 (comfortable reading)

### Hierarchy Rules
- Use **weight differences**, not color, for hierarchy
- Prefer 400 (regular) and 600 (semibold)
- Avoid excessive bold (700+)
- Letter spacing: subtle negative spacing on headlines (-0.5 to -0.2)

---

## Spacing System

### 10pt Modular Grid
```typescript
xs:   5pt
sm:   10pt
md:   20pt
lg:   30pt
xl:   40pt
xxl:  60pt
xxxl: 80pt
```

### Application
- Consistent vertical rhythm throughout
- Immense white space around content
- No cramped layouts
- Generous padding in cards and containers

---

## Border Radius

```typescript
small: 8px
card:  12px (strict standard for cards)
large: 16px
full:  9999px (for circular elements)
```

### Guidelines
- All cards use 12px radius
- Buttons use 12px radius
- Small interactive elements: 8px
- Profile pictures and avatars: full/circular

---

## Shadows & Borders

### NO Shadows Philosophy
The design system **does not use shadows**. Instead:
- Use **subtle borders** (#ECECEC)
- Use **1px border width**
- Create depth through spacing and layering
- Background color contrast for elevation

---

## Motion & Animation

### Timing
```typescript
fast:   200ms
normal: 250ms
slow:   300ms
```

### Easing
- **Only use**: `ease-in-out`
- **Avoid**: bounces, elastic, extreme easings

### Signature Animation: "Breathing Rings"
- **Purpose**: Soft gradient rings around profile photos, stats, and active timers
- **Duration**: 2000-3000ms
- **Scale**: 1.0 to 1.05-1.08
- **Opacity**: 0.2 for background rings
- **Colors**: Frost Blue with gradients

### Usage Examples
```typescript
// Profile picture breathing ring
scaleFrom: 1, scaleTo: 1.03, duration: 2500ms

// Active timer breathing ring
scaleFrom: 1, scaleTo: 1.05, duration: 1500ms

// Icon entrance breathing
scaleFrom: 1, scaleTo: 1.08, duration: 2000ms
```

---

## Component Patterns

### Cards
- Background: Off White (light) / Card color (dark)
- Border: 1px solid #ECECEC
- Border Radius: 12px
- Padding: 16-20px (use Spacing.md)
- **NO shadows**

### Buttons
#### Primary Button
- Background: Cool Steel (#5B7EA4)
- Text: Off White
- Border Radius: 12px
- Padding: vertical 16px, horizontal 20-30px
- **NO shadows**

#### Secondary/Ghost Button
- Background: Transparent or background color
- Border: 1px solid border color
- Text: Primary color
- Border Radius: 12px

### Input Fields
- Border: 1px solid border color
- Border Radius: 12px
- Padding: 16px
- Focus: Change border to primary color
- **NO shadows**

### Headers
- Background: Frost Blue (light) / Card (dark)
- Border Bottom: 1px solid border color
- **NO rounded corners on bottom**
- **NO shadows**

### Stats Display
- Group in card with borders
- Use typography hierarchy for numbers
- Dividers: 1px vertical lines
- Breathing animation when active

---

## Theming (Light/Dark Mode)

### Light Mode
```typescript
text: Charcoal (#2A2E36)
background: Off White (#FDFDFC)
backgroundSecondary: Frost Blue (#DCEAF2)
primary: Cool Steel (#5B7EA4)
border: #ECECEC
card: Off White (#FDFDFC)
```

### Dark Mode
```typescript
text: Off White (#FDFDFC)
background: Charcoal (#2A2E36)
backgroundSecondary: #1F2227
primary: Misty Slate (#AAC4D6)
border: #3A3E46
card: #32363E
```

---

## Inspiration Sources
- **Calm app**: Serene, breathing-focused interface
- **Apple Fitness**: Clean stat summaries
- **Notion**: Minimal, content-first layout
- **Scandinavian design**: Breathable space, muted colors

---

## Implementation Notes

### Using the Theme
```typescript
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';

// In components
const colors = Colors[colorScheme ?? 'light'];
```

### Using ThemedText
```typescript
<ThemedText type="h1">Main Title</ThemedText>
<ThemedText type="h2">Section Title</ThemedText>
<ThemedText type="h3">Subsection</ThemedText>
<ThemedText type="body">Regular text</ThemedText>
<ThemedText type="bodyBold">Bold text</ThemedText>
<ThemedText type="bodySmall">Small text</ThemedText>
<ThemedText type="caption">Caption</ThemedText>

// With variants
<ThemedText variant="primary">Primary color</ThemedText>
<ThemedText variant="secondary">Secondary color</ThemedText>
<ThemedText variant="muted">Muted color</ThemedText>
```

### Button Pattern
```typescript
<TouchableOpacity
  style={[
    styles.button,
    { backgroundColor: colors.primary }
  ]}
  activeOpacity={0.7}
>
  <ThemedText 
    type="bodyBold" 
    lightColor={CleanPaceColors.offWhite}
    darkColor={CleanPaceColors.offWhite}
  >
    Button Text
  </ThemedText>
</TouchableOpacity>

const styles = StyleSheet.create({
  button: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.card,
    alignItems: 'center',
  },
});
```

### Card Pattern
```typescript
<View style={[
  styles.card,
  {
    backgroundColor: colorScheme === 'dark' ? colors.card : colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  }
]}>
  {/* Card content */}
</View>

const styles = StyleSheet.create({
  card: {
    padding: Spacing.md,
    borderRadius: BorderRadius.card,
  },
});
```

### Breathing Ring Pattern
```typescript
const breathScale = useRef(new Animated.Value(1)).current;

useEffect(() => {
  Animated.loop(
    Animated.sequence([
      Animated.timing(breathScale, {
        toValue: 1.08,
        duration: 2000,
        useNativeDriver: true,
      }),
      Animated.timing(breathScale, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
    ])
  ).start();
}, []);

// In render
<Animated.View 
  style={[
    styles.breathingRing,
    {
      backgroundColor: CleanPaceColors.frostBlue,
      transform: [{ scale: breathScale }],
    }
  ]} 
/>

const styles = StyleSheet.create({
  breathingRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    opacity: 0.2,
  },
});
```

---

## Do's and Don'ts

### Do ✅
- Use immense white space
- Use subtle borders instead of shadows
- Keep animations slow and smooth (200-300ms)
- Use weight differences for hierarchy
- Keep H1 under 36px
- Use breathing animations for active states
- Use 12px border radius for cards
- Follow the 10pt spacing grid

### Don't ❌
- Don't use drop shadows
- Don't use bright, energetic colors
- Don't use bouncy or extreme animations
- Don't cram content together
- Don't use color for hierarchy alone
- Don't use gradients (except soft breathing rings)
- Don't use heavy font weights (avoid 700+)
- Don't round corners excessively

---

## Accessibility

### Color Contrast
All color combinations meet WCAG AA standards:
- Charcoal on Off White: ✅
- Cool Steel on Off White: ✅
- Off White on Cool Steel: ✅
- Off White on Charcoal: ✅

### Interactive Elements
- Minimum touch target: 44x44px
- Clear focus states (border color change)
- Reduced motion support recommended

### Typography
- Base font size: 16px (readable)
- Line height: 1.4 for body text (comfortable)
- Sufficient spacing between interactive elements

---

## Files Modified

### Core Theme
- `constants/theme.ts` - Complete design system constants

### Components
- `components/themed-text.tsx` - Typography component with variants
- `components/themed-view.tsx` - Base view component

### Screens
- `app/signin.tsx` - Sign in screen
- `app/verify.tsx` - Verification screen
- `app/(tabs)/index.tsx` - Home/running screen
- `app/(tabs)/profile.tsx` - Profile screen
- `app/(tabs)/runs.tsx` - Runs history screen
- `app/(tabs)/feed.tsx` - Social feed screen
- `app/(tabs)/friends.tsx` - Friends management screen

---

## Maintenance

### Adding New Colors
Only add colors that fit the muted, calm palette. Test in both light and dark modes.

### Adding New Components
- Follow the NO shadows rule
- Use 1px borders with theme border color
- Use 12px border radius for cards
- Apply breathing animations sparingly
- Maintain generous spacing

### Testing
- Always test in both light and dark mode
- Verify all interactive states (hover, active, disabled)
- Check readability and contrast
- Ensure animations are smooth and not distracting

---

## Version
**Design System Version**: 1.0  
**Last Updated**: 2026-02-01  
**Maintained by**: Development Team

