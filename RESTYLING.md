Below is a step-by-step plan (or “methodology”) for transforming your existing Electron + React + Tailwind + Material UI codebase so that it more closely resembles the shadcn design aesthetic while still preserving your future ability to use Material UI’s theming features.

---

## 1. **Establish a Branch and Baseline**

1. **Create a new Git branch** (e.g., `feature/shadcn-styling`) so you can safely experiment with these design changes.
2. **Document your current styles**: Note color tokens, typography sizes, and component usages so you can systematically address each during the redesign.

---

## 2. **Adopt or Adapt the shadcn Color Palette and Theme**

1. **Review shadcn’s colors**
    - shadcn typically uses Tailwind’s built-in color palette (e.g., `slate`, `neutral`, `zinc`, `gray`, etc.) but with carefully chosen scales. Examine which color classes are used in the official shadcn demo—particularly for backgrounds, borders, text, and hover effects.
2. **Configure Tailwind**
    - In your `tailwind.config.js`, override or extend the default colors to align with shadcn’s palette. This ensures classes like `bg-gray-900` or `text-gray-400` match the same hue/lightness as shadcn’s aesthetic.
    - If you want to keep your existing dark mode toggle, verify that your color overrides or new palette choices still allow for a well-contrasted dark theme.
3. **Evaluate MUI theming**
    - Long-term, you plan to use MUI’s theming API. For now, you can keep it minimal. Potentially just set up a `MuiThemeProvider` (with a very basic palette that complements your Tailwind palette). Later, you can unify the color tokens from MUI with your Tailwind config (e.g., ensuring your MUI primary color is also your Tailwind “blue-600,” etc.).

---

## 3. **Replace Emojis with Icons**

1. **Choose an Icon Source**: You can either
    - Use [Material UI Icons](https://mui.com/material-ui/material-icons/) or
    - Use a Tailwind-friendly icon set such as [Heroicons](https://heroicons.com/) or the [Lucide icons shadcn references](https://lucide.dev/).
2. **Remove emoji usage in `HomePage.tsx`**
    - For example, replace `🚀`, `📊`, and `⚖️` with `<RocketIcon />`, `<BarChartIcon />`, or `<BalanceIcon />` from your chosen library.
    - Give each icon a consistent size, color, and margin to match the shadcn style (often something like `className="h-6 w-6"`).
3. **Ensure stylistic consistency**
    - Each icon should look consistent with the new design. In shadcn’s blocks, icons are often white on dark backgrounds or neutral-gray on white backgrounds. Adjust your Tailwind classes accordingly.

---

## 4. **Introduce shadcn-Style Components (Or MUI + Tailwind Hybrids)**

1. **Identify shared components**
    - Cards (`.rounded-lg.shadow.p-6.bg-white.dark:bg-gray-800`)
    - Buttons (`.rounded-md.px-4.py-2` with hover states, transitions, etc.)
    - Headings, placeholders, etc.
2. **Refactor them to match shadcn**
    - For example, shadcn’s cards often have minimal outer padding, sharper edges for some elements, or consistent spacing.
    - Update your `.rounded-lg.shadow` classes to align with shadcn’s border radius and shadow tokens.
    - Use a consistent “shadow-sm,” “shadow,” “shadow-md” approach.
3. **Use a single source of truth for classes**
    - You could create small “wrapper” components that encapsulate a consistent `className` set—similar to how shadcn provides “UI primitives.”
    - Example: a `<Card>` component that automatically applies the background, border, radius, etc. Then replace existing `<div className="bg-white dark:bg-gray-800 ...">` usage with `<Card>...</Card>`.

---

## 5. **Align Typography**

1. **Check shadcn default fonts & sizes**
    - Typically, `text-sm` or `text-base` for body, `text-lg` or `text-xl` for headings, using text neutrals like `text-gray-800 dark:text-gray-200`.
2. **Update your heading usage**
    - Instead of manual `text-3xl font-bold`, you might define a `Heading` component with a consistent style or rely on a Tailwind class that matches the shadcn look.
3. **Ensure consistent color usage**
    - Confirm that your headings, body text, and subtle text use the correct classes (e.g., `text-sm text-gray-500`) for the new palette.

---

## 6. **Ensure Dark Mode Parity**

1. **Keep your existing dark mode toggle**
    - Right now you set `darkMode` in React state, toggling `document.documentElement.classList.add('dark')`. That’s fine.
    - Continue verifying that all new or updated Tailwind classes have appropriate `dark:` variants.
2. **Check shadcn’s approach**
    - shadcn generally uses the `data-theme` or `class="dark"` approach. Your toggler is consistent with that. Just ensure you apply the same color classes that shadcn uses for dark backgrounds and text.

---

## 7. **Incorporate MUI Theming Gradually**

1. **Wrap your root in `<ThemeProvider>`**
    - Import MUI’s `ThemeProvider` and a minimal theme (e.g. a default createTheme). This sets you up for future theming.
2. **Override MUI theme colors**
    - For example, if your new Tailwind primary is `#0ea5e9` (Tailwind’s `blue-500`), set MUI’s `palette.primary.main` to that hex.
3. **Migrate specific components**
    - Over time, if you need MUI-specific components (e.g., MUI’s `<Button>` or `<Dialog>`), you can ensure their colors match your new palette.
4. **Keep or remove conflicting styles**
    - If MUI injects default CSS, you might want to use `emotion`’s `GlobalStyles` or `CssBaseline` to unify your styles with Tailwind.
5. We only want the base (default) theme for now, but we should design with extensibility and maintainability in mind.

---

## 8. **Refine Layout & Spacing to Match shadcn Blocks**

1. **Analyze spacing**
    - shadcn blocks often have standard spacing—for instance, `.p-4`, `.p-6`, `.py-2`, consistent usage of `.mb-8`. Make sure your pages reflect those same patterns.
2. **Align your containers**
    - shadcn often uses symmetrical horizontal padding, minimal vertical gutter, etc. Adjust your `.container`, `.mx-auto`, etc., so that it looks visually consistent.
3. **Add “example blocks”**
    - If you want a truly close aesthetic match, you can copy some of the blocks or sections from the shadcn example code into your own app for reference and unify the classes.

---

## 9. **Remove Any Stray Material UI or Tailwind Conflicts**

1. **Check the “titleBarStyle” and overall Electron chrome**
    - You already do `titleBarOverlay: { color: '#1f2937' }`. Make sure these OS-level window styles don’t clash with your new color palette.
2. **Eliminate duplicate resets**
    - If you use `@mui/material/CssBaseline` but also rely on Tailwind’s preflight, confirm that they don’t conflict. Typically it is fine; just confirm your button resets, etc., remain consistent.

---

## 10. **Validate and Iterate**

1. **Test at multiple breakpoints**
    - Ensure your new styling, especially custom classes, looks good at small, medium, and large screen sizes.
2. **Check keyboard / screen reader usage**
    - shadcn emphasizes accessible components. Make sure your new components are still accessible, using ARIA attributes where needed.
3. **Gather feedback**
    - If the design is not “shadcn-like” enough, tweak spacing, shadows, etc.

---

## 11. **Roll Out and Merge**

1. **QA pass**
    - Verify all pages (Home, Run Benchmark, Visualization, Compare, etc.) still function.
2. **Merge**
    - Once everything is stable, merge your `feature/shadcn-styling` branch into your main development branch.
3. **Continue incremental improvements**
    - Over time, replace more ad-hoc Tailwind classes with well-structured components or MUI equivalents.
    - Grow your MUI theme config as needs arise.

---

### Example of a Typical “Replace Emoji Icon” Commit

As a small illustration of what a single set of changes might look like in code (pseudo-diff format):

```diff
--- a/src/pages/HomePage.tsx
+++ b/src/pages/HomePage.tsx

 const featureCards = [
-  {
-    title: 'Run Benchmarks',
-    description: 'Execute benchmarks...',
-    icon: '🚀',
-    link: '/run-benchmark',
-  },
-  ...
+  {
+    title: 'Run Benchmarks',
+    description: 'Execute benchmarks...',
+    icon: <RocketIcon className="h-6 w-6" />,  // from @mui/icons-material or Heroicons
+    link: '/run-benchmark',
+  },
+  ...
 ];

 return (
   <div>
     ...
     {featureCards.map((card) => (
       <div className="bg-white dark:bg-gray-800 ..." >
-        <div className="text-3xl mb-4">{card.icon}</div>
+        <div className="mb-4 text-blue-600 dark:text-blue-400">
+          {card.icon}
+        </div>
         <h3>{card.title}</h3>
         <p>{card.description}</p>
         <Link to={card.link}>Get started →</Link>
       </div>
     ))}
   </div>
 );
```

---

## Final Thoughts

By following these steps methodically, your application will transition toward the clean, dark aesthetic shown on shadcn’s site, while preserving both Tailwind utility classes and the ability to leverage Material UI’s theming system in the future. This approach keeps things incremental, so you can continue shipping features while refining the UI in stages.