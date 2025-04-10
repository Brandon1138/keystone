### ADR-001: Use Electron for the Post-Quantum Cryptography Benchmarking Application

## Status:

Accepted

## Context:

The application requires a cross-platform desktop environment capable of running and managing C++ cryptographic benchmarks while providing a modern UI for visualization and data management. Given our stack preferences and integration needs, we need a framework that:

- Allows direct execution of C++ executables with child process management.
- Supports rich UI/UX elements for visualization (charts, tables, interactive graphs).
- Enables efficient data handling and local storage.
- Provides a robust environment for maintaining a long-lived process lifecycle.

Electron emerges as the best option because:

- It enables a desktop experience using web technologies (HTML, CSS, TypeScript).
- It has built-in IPC mechanisms to communicate between the main process (managing C++ execution) and the renderer (handling UI and data visualization).
- It supports local data storage through embedded databases (like SQLite) or JSON-based storage.
- It integrates well with visualization libraries like Plotly.js and Graph.js.

## Decision:

We will adopt Electron as the framework for building the benchmarking application. The structure will follow a **main process + renderer process** architecture:

- The **main process** will handle child process management for executing C++ benchmark binaries.
- The **renderer process** will present a modern UI with data visualization and benchmark control.
- **IPC communication** will be used to transmit benchmark execution results to the UI.
- **Electron's built-in local storage options** will handle historical benchmark data.

## Consequences:

- **Pros:**
  - Provides a cross-platform GUI with modern web-based technologies.
  - Enables controlled execution of C++ benchmarks through IPC and child processes.
  - Supports deep UI customization and rich visualizations via Tailwind + Material UI.
  - Scales well for extensibility, allowing additional cryptographic schemes or features.
- **Cons:**
  - Electron applications tend to have a higher memory footprint compared to native desktop applications.
  - Bundling large cryptographic executables with the Electron app may increase final binary size.
  - Security considerations need to be addressed, particularly in handling IPC and child process execution.

### ADR-002: Project Structure for the Post-Quantum Cryptography Benchmarking Application

## Status:

Accepted

## Context:

Implementing Phase 1 of the application development requires establishing a solid project structure that follows best practices for Electron applications with TypeScript. This includes setting up proper configuration files, directory organization, and build processes.

## Decision:

We have implemented the following project structure and configuration:

1. **Directory Structure**:

   - `src/main`: Contains all main process code (Electron main)
   - `src/renderer`: Contains all renderer process code (UI, styles)
   - `dist`: Output directory for compiled code and assets

2. **Build System**:

   - Webpack for bundling and transpiling TypeScript
   - PostCSS with Tailwind CSS for styling
   - npm scripts for build automation

3. **Technology Stack**:

   - Electron for cross-platform desktop capabilities
   - TypeScript for type safety and better maintainability
   - Tailwind CSS for utility-first styling with dark mode support
   - Material UI for pre-built React components
   - Plotly.js for data visualization

4. **Development Workflow**:
   - `npm run build`: Build the application
   - `npm run start`: Build and start the application
   - `npm run dev`: Run the application in development mode with hot reloading
   - `npm run package`: Package the application for distribution

## Consequences:

- **Pros:**
  - Clear separation of concerns between main and renderer processes
  - Type-safe codebase with TypeScript
  - Modern UI with Tailwind CSS and dark mode support
  - Efficient build process with Webpack
  - Good developer experience with hot reloading
- **Cons:**
  - Initial configuration complexity
  - Multiple configuration files to maintain (webpack, tailwind, tsconfig)
  - Learning curve for developers unfamiliar with Electron's dual-process architecture

### ADR-003: Transition from BrowserRouter to HashRouter in the Electron Application

## Status

Accepted

## Context

Our Electron application initially used a hybrid routing approach: a DOM-based router (via Layout.ts and Router.ts) was mixed with React components (e.g., App.tsx and BenchmarkRunner.tsx). This setup led to increased complexity and maintenance challenges, especially as we aimed for a modern, pure React solution. Moreover, using BrowserRouter—which relies on the HTML5 History API—proved problematic in the Electron environment because:

- **Local File Protocol Limitations:** Electron applications run on the `file://` protocol (or a similar environment) where server-side URL rewriting is unavailable. BrowserRouter expects a server configuration to handle dynamic URLs, which is not present in our Electron setup.
- **Inconsistent Navigation Behavior:** The use of BrowserRouter resulted in unpredictable navigation behavior, particularly when refreshing pages or handling deep links within the Electron shell.

To address these issues and simplify our architecture, we decided to transition to HashRouter. HashRouter uses the URL fragment (the hash portion) to manage client-side navigation, eliminating the need for server configuration and ensuring reliable routing within Electron.

## Decision

We will replace the BrowserRouter with HashRouter across the application. The following key changes have been implemented:

- **Pure React Routing:** All routing has been consolidated into a React Router setup within the `<App />` component. This allows us to remove the legacy DOM-based router files (Layout.ts and Router.ts) entirely.
- **HashRouter Adoption:** HashRouter now manages navigation. The application routes (e.g., `/home`, `/run-benchmark`, `/visualization`, `/compare`, `/export`) are defined using React Router's `<Routes>` and `<Route>` components.
- **UI Enhancements:** A new top-level `<App />` component has been created. This component includes a navigation bar with links to all main pages and a dark mode toggle that preserves our existing class-based approach.
- **Legacy Code Removal:** The migration involved deleting obsolete routing code and re-implementing page components (HomePage, RunBenchmarkPage, VisualizationPage, ComparePage, ExportPage) as pure React components. Existing functionality (like BenchmarkRunner) is preserved and integrated into the new routing structure.
- **Electron Compatibility:** This change ensures that the routing behaves consistently in the Electron environment without requiring additional server-side URL management.

## Consequences

### Pros

- **Enhanced Compatibility:** HashRouter works seamlessly within Electron, as it does not depend on server-side URL management. This prevents issues when navigating or refreshing pages.
- **Simplified Architecture:** Consolidating routing into React Router reduces complexity by eliminating legacy DOM-based routing code, leading to a cleaner, more maintainable codebase.
- **Predictable Navigation:** Using URL hashes ensures that routing remains consistent regardless of the deployment environment, improving the user experience.
- **Easier Development:** The new React-based routing approach aligns with best practices for modern single-page applications, making it easier for future developers to extend and maintain the application.

### Cons

- **URL Aesthetics:** The use of hash-based URLs (e.g., `#/home`) may be considered less clean than traditional paths. However, this is an acceptable trade-off in the context of an Electron application.
- **Refactoring Effort:** Transitioning to HashRouter required a refactor of several components and removal of legacy code. This initial investment in refactoring is offset by the long-term benefits of maintainability and reliability.

## Conclusion

Transitioning from BrowserRouter to HashRouter resolves critical issues associated with running a BrowserRouter-based application in an Electron environment. By embracing a pure React solution for navigation, we have streamlined our codebase, enhanced compatibility with Electron's file-based protocol, and set a solid foundation for future application development.

### ADR-004: JSON File-Based Data Storage for Benchmark Results

## Status

Accepted

## Context

Implementing Phase 4 of our application development requires a robust data storage solution for benchmark results. The solution needs to handle heterogeneous benchmark metrics from various cryptographic algorithms (both post-quantum and classical) while supporting efficient querying, filtering, and data retrieval for visualization, comparison, and export functionality.

We considered two primary options:

1. **File-based JSON storage** - Storing benchmark results in a JSON file in Electron's user data directory
2. **Embedded SQLite database** - Using a relational database approach with SQLite

Both approaches have merits, but we needed to consider several factors:

- The nature of our data (structured, but with heterogeneous metrics)
- Query complexity requirements (filtering, aggregation, comparison)
- Development complexity and maintainability
- Integration with Electron's main and renderer processes

## Decision

We have chosen to implement a **JSON file-based storage solution** for benchmark data with the following components:

1. **BenchmarkStore Class** - A TypeScript class that encapsulates all data storage operations:

   - Reads from and writes to a JSON file in Electron's user data directory
   - Maintains an in-memory representation of the data during runtime
   - Provides methods for CRUD operations and various query patterns

2. **IPC Communication Layer** - Exposes the benchmark store functionality to the renderer process:

   - Main process handles file I/O operations via the benchmark store
   - Renderer process communicates via IPC to query and update benchmark data
   - Type-safe operations with error handling

3. **Renderer Utilities** - A utility module that provides a clean API for the UI components:
   - Wraps IPC calls with type-safe methods
   - Adds higher-level operations for visualization and comparison features
   - Handles data transformations needed for charts and exports

The data schema is flexible, allowing for different metrics per algorithm:

```typescript
interface BenchmarkResult {
	id: string;
	algorithm: string;
	securityParam: string;
	metrics: { [key: string]: number }; // Flexible metrics object
	timestamp: string;
	status: 'completed' | 'failed';
	error?: string;
}
```

## Consequences

### Pros

- **Simplicity** - JSON files are easy to read, debug, and manipulate manually if needed
- **Flexibility** - The schema easily accommodates heterogeneous metrics without requiring rigid table structures
- **Persistence** - Data is automatically saved to disk and survives application restarts
- **No Dependencies** - No additional database engines or libraries required beyond Node.js's built-in file system functionality
- **Portability** - The entire data store can be easily exported, backed up, or transferred
- **Performance** - For our expected data volume (hundreds to thousands of benchmark runs), a JSON file is sufficiently performant

### Cons

- **Limited Scalability** - Not ideal for very large datasets (tens of thousands of records or more)
- **No Transactions** - Lacks ACID properties provided by a true database
- **Limited Query Capabilities** - Complex queries require custom JavaScript implementations rather than SQL
- **Memory Usage** - The entire dataset is loaded into memory during application runtime

### Mitigations

- We've implemented efficient in-memory filtering and query methods to compensate for the lack of SQL
- The application's expected usage pattern (hundreds of benchmarks, not millions) makes the scalability limitations acceptable
- The store ensures atomic file writes by writing the entire file in a single operation, reducing the risk of data corruption

## Future Considerations

While a JSON file-based approach meets our current needs, we've architected the system to allow for a potential future transition to a more robust database solution:

1. The BenchmarkStore class encapsulates all data access logic, making it possible to replace the underlying storage mechanism without changing the API
2. The IPC interface remains stable regardless of the storage implementation
3. The utility functions in the renderer process would require minimal changes

If the application's data needs grow significantly, we can revisit this decision and potentially migrate to SQLite or another database solution while maintaining the same overall architecture.

## Conclusion

The JSON file-based storage approach provides the right balance of simplicity, flexibility, and performance for our post-quantum cryptography benchmarking application's current requirements. The design accommodates heterogeneous benchmark metrics while supporting the visualization, comparison, and export functionality planned for future phases.

### ADR-005: Algorithm Categorization and Visual Indicators for Benchmark Results

## Status

Accepted

## Context

As our application handles various cryptographic algorithms (both post-quantum and classical), it became necessary to visually distinguish between different algorithm types to improve user experience. Users need to easily identify the category of each algorithm when viewing benchmark results across different pages of the application. Additionally, benchmark results were not displaying consistently across all components, leading to a suboptimal user experience.

We identified several categories of algorithms:

- Key Encapsulation Mechanisms (KEM): Kyber, McEliece, etc.
- Digital Signature Algorithms: Dilithium, Falcon, SPHINCS+, etc.
- Symmetric Encryption: AES, etc.
- Classical Public Key Algorithms: RSA, ECDH, ECDSA, etc.

## Decision

We have implemented the following changes:

1. **Algorithm Categorization System**:

   - Created a centralized utility (`algorithm-categories.tsx`) that maps each algorithm to its appropriate category.
   - Defined four primary categories: KEM, Signature, Symmetric, and ClassicalPublicKey.
   - Added appropriate Material UI icons for each category:
     - KEM algorithms use `VpnKeyIcon`
     - Signature algorithms use `CreateIcon`
     - Symmetric algorithms use `EnhancedEncryptionIcon`
     - Classical public key algorithms use `KeyIcon`

2. **Consistent UI Components**:

   - Created a reusable `BenchmarkResultCard` component that displays benchmark results with appropriate category icons.
   - Enhanced the result display to show metrics more clearly and handle edge cases (empty metrics, errors).
   - Added color-coding based on algorithm categories for better visual distinction.

3. **Improved Benchmark Processing**:

   - Enhanced the benchmark output parsing in `benchmarkManager.ts` to better handle different output formats and improve error reporting.
   - Added additional error handling for cases where benchmark processes complete but don't produce metrics.

4. **Categorization Helpers**:
   - Added utility functions to get algorithms grouped by category for future comparison features.
   - Implemented consistent formatting for algorithm names and parameters.

## Consequences

### Pros

- **Improved UX**: Users can now easily identify algorithm types through consistent visual indicators.
- **Better Error Handling**: Enhanced parsing and error reporting provides more helpful feedback to users.
- **Code Reusability**: The shared `BenchmarkResultCard` component reduces duplication and ensures consistency.
- **Extensibility**: The categorization system is flexible and can accommodate new algorithms in the future.
- **Maintainability**: Centralized logic for algorithm categorization simplifies future updates.

### Cons

- **Increased Complexity**: Added a new layer of abstraction for algorithm categorization.
- **Dependency on Material UI**: Now requiring additional dependencies for icons and components.
- **Initial Learning Curve**: Developers need to understand the categorization system when adding new algorithms.

## Conclusion

The implementation of algorithm categorization with visual indicators significantly improves the user experience by providing clear visual cues for different algorithm types. The reusable components ensure consistent display of benchmark results across the application, while the enhanced parsing logic makes the application more robust. These improvements set a solid foundation for the visualization and comparison features planned for future development phases.

### ADR-006: UI Redesign with shadcn-inspired Styling and Modern Component Patterns

## Status

Accepted

## Context

The initial UI of our application used a mix of Tailwind utility classes and Material UI components with emojis as feature icons. While functional, this approach had several limitations:

- Emoji icons lacked visual consistency and professional appearance
- The UI did not follow modern design trends and aesthetics
- Styling patterns were inconsistent across different components
- Dark mode implementation required manual class definitions for each component

To create a more cohesive and modern user experience, we needed to establish a consistent design system that:

- Uses proper icons instead of emojis
- Follows modern UI trends like those found in shadcn
- Provides consistent spacing, typography, and color patterns
- Functions well in both light and dark modes
- Maintains compatibility with our technology stack (Electron, React, Tailwind, Material UI)

## Decision

We've implemented a comprehensive UI redesign that includes:

1. **shadcn-inspired Color System**:

   - Created a custom color palette with semantic naming in the Tailwind configuration
   - Established primary, background, foreground, muted, and border color tokens
   - Implemented proper dark mode variants for all color tokens

2. **Icon System Overhaul**:

   - Replaced all emoji icons with proper Material UI icons
   - Used semantically appropriate icons (SpeedIcon for benchmarks, InsightsIcon for visualization, CompareIcon for comparison)
   - Applied consistent sizing and styling to icons across the application

3. **Card Component Redesign**:

   - Implemented a more modern card layout with rounded corners, subtle borders, and shadow
   - Created consistent spacing patterns within cards
   - Added visual feedback for interactive elements (hover states, transitions)

4. **Typography Refinement**:

   - Standardized heading sizes and weights
   - Applied proper text colors for different content hierarchies
   - Added appropriate spacing between text elements

5. **Enhanced Information Architecture**:
   - Added an informational section about post-quantum cryptography
   - Organized feature cards into a more visually appealing grid layout
   - Improved navigation flow with clear call-to-action links

## Consequences

### Pros

- **Enhanced Visual Cohesion**: The application now has a consistent, professional visual identity
- **Improved User Experience**: Better spacing, hierarchy, and interactive feedback make the app more intuitive
- **Streamlined Development**: Semantic color tokens and consistent patterns will make future UI development more efficient
- **Better Accessibility**: Improved contrast ratios and clear visual hierarchy enhance readability
- **Future-Proof Styling**: The shadcn-inspired approach aligns with modern web styling best practices

### Cons

- **Increased Complexity**: The styling system is more sophisticated, requiring deeper understanding of the token system
- **Potential Browser Compatibility Considerations**: Some advanced CSS features may require testing across different Electron versions
- **Maintenance Overhead**: The more refined design system requires discipline to maintain consistency

## Conclusion

The UI redesign significantly improves the application's visual appeal and usability while establishing a foundation for consistent styling across all future components. By adopting shadcn-inspired design principles and replacing emojis with proper icons, we've created a more professional, cohesive interface that better represents the sophisticated nature of our post-quantum cryptography benchmarking tool. This redesign enhances not only aesthetics but also information architecture and user flow, making the application more intuitive and engaging.

### ADR-007: Shadcn-Inspired UI with Dark Mode Default

## Status

Accepted

## Context

The application's UI needed modernization to match current design trends and improve usability. The existing interface used a mix of Tailwind utility classes and Material UI components with light mode as default and inconsistent styling patterns. We needed to:

1. Adopt a consistent design system inspired by modern UI libraries like shadcn/ui
2. Implement a sleek, dark-by-default theme that enhances readability and reduces eye strain
3. Ensure proper integration between Tailwind CSS and Material UI
4. Create reusable component styles for maintainability

## Decision

We've implemented a comprehensive UI redesign with the following key components:

1. **Dark Mode as Default**:

   - Modified the color scheme to use dark mode by default
   - Updated the Tailwind configuration to provide dark-first semantic color tokens
   - Inverted the theme toggle logic to switch to light mode instead of dark mode

2. **shadcn-Inspired Component System**:

   - Created reusable component classes like `.card` and `.btn` in the Tailwind layer system
   - Adopted consistent styling patterns for spacing, borders, and shadows
   - Applied subtle backgrounds, border radiuses, and transitions for a modern feel

3. **Material UI Theme Integration**:

   - Set up a ThemeProvider with a complementary dark theme
   - Configured the MUI theme to match our Tailwind color palette
   - Added CssBaseline for consistent baseline styling
   - Customized core components like buttons to match the shadcn aesthetic

4. **Consistent Color Tokens**:
   - Established semantic color names (background, foreground, muted, etc.)
   - Used consistent text colors for primary, secondary, and muted text
   - Implemented unified styling for interactive elements

## Consequences

### Pros

- **Modern Aesthetic**: The application now follows current design trends with a clean, dark interface
- **Improved Readability**: Dark theme reduces eye strain during extended benchmarking sessions
- **Better Maintainability**: The component system makes it easier to maintain consistent styling
- **Enhanced UX**: Subtle animations, consistent spacing, and visual hierarchy improve user experience
- **Future-Proof**: The approach allows for easy theme extension and customization

### Cons

- **Additional Complexity**: The theme system is more sophisticated, requiring deeper understanding
- **Minor Learning Curve**: Developers need to understand the semantic color system
- **Potential Conflicts**: Need to carefully manage the interaction between Tailwind and Material UI

## Conclusion

The adoption of a shadcn-inspired UI with dark mode as default significantly modernizes our application while improving maintainability and user experience. The refined design system provides a solid foundation for future UI development and ensures visual consistency across all components.

### ADR-007: Theme-Aware Speedometer Component Enhancement

## Status

Accepted

## Context

The application includes a Speedometer component used for visualizing benchmark progress. Previously, this component used fixed SVG files (`dial_on.svg` and `dial_off.svg`) regardless of the application's theme setting. As part of our UI improvement efforts, we created theme-specific versions of these SVG files:

- `dial_dark_off.svg` and `dial_dark_on.svg` for dark mode
- `dial_light_off.svg` and `dial_light_on.svg` for light mode

We needed to enhance the Speedometer component to dynamically select the appropriate dial images based on the current theme.

## Decision

We have implemented a theme-aware Speedometer component with the following key changes:

1. **Theme Detection**: Added theme detection using Material UI's `useTheme` hook to determine whether the application is in dark or light mode.
2. **Conditional Asset Selection**: Modified the component to conditionally select the appropriate SVG assets based on the detected theme:
   - Dark theme: `dial_dark_on.svg` or `dial_dark_off.svg`
   - Light theme: `dial_light_on.svg` or `dial_light_off.svg`
3. **Smooth Transitions**: Maintained the existing GSAP animations for smooth transitions between states.

The implementation preserves all existing functionality while providing a more cohesive visual experience that respects the user's theme preference.

## Consequences

### Pros

- **Improved User Experience**: The Speedometer component now visually integrates better with both dark and light themes.
- **Visual Consistency**: The application maintains visual consistency across different components and themes.
- **Maintainability**: The component's theme awareness is handled automatically through React hooks rather than requiring external configuration.

### Cons

- **Increased Asset Management**: The application now needs to maintain four SVG files instead of two.
- **Slightly Increased Complexity**: The component now has a dependency on the theme context.

## Conclusion

This enhancement improves the visual coherence of the application by ensuring that the Speedometer component respects the user's theme preference. The implementation is clean and maintainable, using React hooks to detect theme changes automatically. The minor drawbacks in terms of asset management are outweighed by the improved user experience and visual consistency.

## Architectural Decisions

### 2024-03-19: Initial Setup and Navigation Implementation

**Decision:**

1. Updated benchmark types to include all available algorithms and their parameters:
   - Post-Quantum: Kyber, Dilithium, Falcon, McEliece, SPHINCS+
   - Classical: AES, ECDH, ECDSA, RSA
2. Removed quick run section from HomePage for cleaner UI
3. Set initial route to home page for better user experience
4. Implemented proper type definitions for all benchmark parameters

**Consequences:**

- Positive:
  - Complete coverage of all benchmark algorithms and parameters
  - Cleaner home page focused on core features
  - Better initial user experience with home page as landing
  - Type-safe implementation of benchmark parameters
- Negative:
  - More complex parameter handling due to increased options
  - Need to maintain larger set of benchmark configurations

**Status:** Accepted

### 2024-03-23: ECDH Live Benchmarking Implementation

**Decision:**

1. Extended benchmark manager to support ECDH-specific operations:
   - Added 'shared_secret' operation to the progress data interface
   - Added support for curve name and key size parameters
   - Implemented special handling for curve-specific data
2. Updated algorithm definitions to include ECDH with proper operation names:
   - Added 'keygen' and 'shared_secret' operations
   - Added appropriate display names for operations
3. Updated dashboard components to display ECDH-specific metrics:
   - Added curve name display to phase result dashboard
   - Added shared secret size display alongside key sizes
   - Added shared_secret operation display in completed results
4. Extended BenchmarkResult type to include resultMetadata for algorithm-specific data

**Consequences:**

- Positive:
  - Live benchmarking results now supported for ECDH algorithms
  - Consistent user experience between all supported algorithms
  - More detailed metrics displayed for ECDH-specific parameters
  - Framework is now extensible for supporting additional algorithms
- Negative:
  - More complex data handling across components
  - Need to maintain special cases for different algorithm types

**Status:** Accepted

### 2024-04-20: ECDSA Live Benchmarking Implementation

**Decision:**

1. Extended benchmark manager to support ECDSA-specific operations:
   - Added support for signature_bytes field in the progress data interface
   - Enhanced BenchmarkProgressData to handle ECDSA curve information
   - Implemented proper processing of ECDSA benchmark results
2. Updated algorithm definitions to include ECDSA with proper operation names:
   - Added 'keygen', 'sign', and 'verify' operations
   - Added appropriate display names for operations
3. Updated dashboard components to display ECDSA-specific metrics:
   - Added signature size display in the dashboard
   - Enhanced the BenchmarkResult interface to explicitly include sizes information
   - Made sure curve name is properly displayed in completed results
4. Improved the resultMetadata structure to better organize sizing information for cryptographic artifacts

**Consequences:**

- Positive:
  - Live benchmarking results now supported for ECDSA algorithms
  - Consistent experience between post-quantum signature schemes and classical ECDSA
  - More detailed metrics displayed for ECDSA-specific parameters including signature sizes
  - Better organized metadata structure for key and signature sizes
- Negative:
  - Additional complexity in the BenchmarkManager to handle another algorithm's special cases
  - More specific type definitions required

**Status:** Accepted

### 2024-03-24: Native Addon Loading Fix for Encryption Module

**Decision:**

1. Implemented robust native addon loading mechanism using process.dlopen to bypass webpack module limitations
2. Created proper binding.gyp configuration for node-gyp to build the native addon
3. Updated webpack configuration to properly handle native modules without interfering with them
4. Implemented multi-path loading strategy for the native addon to work in both development and production

**Consequences:**

- Positive:
  - Successfully loading and using the native Kyber encryption module in the application
  - More robust loading strategy that tries multiple possible paths
  - Proper integration with electron main process
  - Solution works across both development and production builds
- Negative:
  - More complex module loading logic
  - Need to maintain both webpack and node-gyp configurations in sync

**Status:** Accepted

### 2024-03-24: Post-Quantum Encryption Implementation

### Decision

We successfully implemented the post-quantum encryption functionality using the ML-KEM (previously Kyber) algorithm with the following approach:

1. Successfully integrated liboqs (Open Quantum Safe) library for ML-KEM key generation and encapsulation
2. Implemented a simplified symmetric encryption scheme based on XOR with the shared secret for message encryption
3. Added integrity verification using checksums
4. Avoided using OpenSSL's RAND_bytes for random number generation to prevent crashes
5. Used static initialization nonce for demonstration purposes

### Context

The initial implementation attempted to use AES-GCM encryption from OpenSSL but faced stability issues on Windows, particularly with RAND_bytes and other OpenSSL functions. The stability issues manifested as crashes during OpenSSL operations.

### Consequences

Positive:

- Successfully implemented key generation, encryption, and decryption
- UI properly displays encrypted/decrypted messages
- System maintains integrity checking for encrypted messages
- Implementation cleanly works across different security levels (ML-KEM 512, 768, 1024)

Negative:

- Current implementation uses a non-random nonce, which is less secure (acceptable for demo purposes)
- XOR-based encryption is simpler than AES-GCM (but sufficient for demonstration)
- Would need improvement for production-level security

### Status

Implemented

### ADR-008: Dilithium Signature Implementation for Message Authentication

## Status

Accepted

## Context

To complement our existing Kyber encryption functionality, we needed to implement a post-quantum digital signature algorithm that could provide authentication, integrity, and non-repudiation features. Dilithium (now standardized as ML-DSA) was chosen as it is one of the algorithms selected by NIST for standardization in the post-quantum cryptography process.

While Kyber (ML-KEM) provides confidentiality through encryption, it does not offer authentication capabilities. Dilithium addresses this need with a complementary algorithm that follows a similar implementation pattern.

## Decision

We implemented Dilithium digital signature functionality with the following approach:

1. **Native C++ Implementation** - Created `dilithium_encrypt.cpp` to implement the core signature functions:

   - `GenerateKeypair` - Generates public/secret key pairs
   - `Sign` - Creates a signature for a message using a secret key
   - `Verify` - Verifies a signature using a public key and message

2. **Node.js Native Addon** - Created `dilithium_node_addon.cpp` to expose the C++ functions to JavaScript:

   - Used node-addon-api to create a clean interface
   - Added proper error handling and type checking
   - Implemented memory management to prevent leaks

3. **Electron IPC Layer** - Extended the existing IPC framework to include Dilithium operations:

   - Added IPC handlers for generate-keypair, sign, and verify
   - Maintained consistent error handling and logging
   - Followed the same pattern as the Kyber implementation for consistency

4. **Security Levels** - Supported NIST's standardized security levels:

   - Level 2 (ML-DSA-44): Lower security, smaller signatures
   - Level 3 (ML-DSA-65): Medium security
   - Level 5 (ML-DSA-87): Highest security, larger signatures

5. **Documentation** - Created comprehensive documentation in `docs/dilithium-signature.md`:
   - Explained the API usage
   - Documented security levels and size considerations
   - Provided troubleshooting guidance

## Consequences

### Pros:

- Successfully implemented post-quantum digital signature functionality
- Created a consistent API that follows the same patterns as our Kyber implementation
- Reused the same robust loading mechanism for native addons
- Provided comprehensive documentation for developers
- Added capability for message authentication, integrity verification, and non-repudiation
- Both implementations follow a maintainable and extensible pattern that can be applied to other cryptographic algorithms

### Cons:

- Increased the complexity of the build system with additional native modules
- Added more dependencies on the Open Quantum Safe library
- Introduced the need for more testing across different security levels and parameters

## Implementation Notes

To load and use the Dilithium implementation alongside Kyber:

1. Both addons are built with the same build process (node-gyp)
2. The native bindings expose similar interfaces for consistency
3. The IPC layer follows a parallel pattern for both algorithms
4. Users can choose which algorithm to use based on their specific needs

### ADR-009: Fixed Visualization for Cryptographic Operations

## Status

Implemented

## Context

The visualization page for cryptographic operations was not displaying metrics properly. The decision was made to normalize operation names between the database and the UI to ensure consistent display.

## Decision

1. Normalized operation names between database and UI to ensure consistent display
2. Added proper handling for 'encapsulate', 'decapsulate', 'encryption', and 'decryption' operations
3. Ensured that operation metrics are properly filled with default values when missing
4. Implemented consistent color scheme for operations in visualization charts

## Consequences

- Positive:
  - All cryptographic operations now show their metrics properly in the visualization page
  - Consistent color coding makes it easier to compare the same operation across different algorithms
  - More robust handling of missing metrics with sensible defaults
- Negative:
  - None significant

## Status

Implemented

### ADR-006: Performance Optimization for VisualizationPage Using Memoization

## Status

Accepted

## Context

The VisualizationPage component was experiencing performance degradation when loading and rendering large datasets. Users reported slow response times, especially when switching between different visualization types or applying filters. Upon investigation, we identified several performance bottlenecks:

1. **Excessive Re-rendering** - Component state changes were triggering unnecessary re-renders of the entire page
2. **Inefficient Data Processing** - Data filtering and transformation were being recalculated on every render
3. **Console Logging Overhead** - Excessive logging in production builds added performance overhead
4. **Window Size Effect Dependencies** - A useEffect hook was forcing reapplication of filters on every window resize

These issues were particularly noticeable when:

- Switching between data sources (benchmarks vs. quantum)
- Changing chart types (performance, operations per second, etc.)
- Applying filters to large datasets
- Resizing the window or entering/exiting fullscreen mode

## Decision

We implemented performance optimizations using React's memoization techniques and other best practices:

1. **Added `useMemo` for Derived Data**

   - Applied to `activeData` and `hasData` calculations
   - Prevents recalculation when dependencies haven't changed

2. **Applied `useCallback` to Event Handlers**

   - Memoized all handler functions: `handleChartChange`, `handleAlgorithmChange`, etc.
   - Prevents recreation of function references on every render
   - Stabilizes dependencies in useEffect hooks

3. **Conditional Logging**

   - Implemented a development-only logging utility
   - Prevents console logging in production builds

   ```typescript
   const log = process.env.NODE_ENV === 'development' ? console.log : () => {};
   ```

4. **Optimized Filter Application**

   - Made `applyFilters` a memoized callback with proper dependencies
   - Added setTimeout to prevent UI blocking during filtering operations
   - Removed unnecessary filter application on window resize

5. **Added Dependency Arrays to Effects**
   - Properly specified dependencies for useEffect and useCallback
   - Prevents unnecessary effect runs

## Consequences

### Positive

- **Improved Performance** - Significant reduction in rendering time and UI responsiveness
- **Reduced Resource Usage** - Less CPU and memory consumption when dealing with large datasets
- **Better Developer Experience** - Clear patterns for optimizing React components
- **Simplified Component Logic** - Removed unnecessary window resize handling code
- **More Predictable Behavior** - State updates and effects execute in a more controlled manner

### Negative

- **Increased Complexity** - More hooks and careful dependency tracking needed
- **Debugging Difficulty** - Memoized functions and values can be harder to debug
- **Maintenance Requirements** - Developers must understand and maintain the memoization pattern

## Implementation Notes

The implementation focused on the React performance optimization principle of "do less work" by:

1. Computing values only when dependencies change
2. Creating functions only when needed
3. Preventing cascading re-renders through careful state management
4. Using non-blocking operations for expensive calculations

## Future Considerations

If performance issues persist with extremely large datasets, we may consider:

1. Implementing virtualization for rendering only visible data
2. Adding pagination to limit the amount of data processed at once
3. Using web workers for data processing outside the main thread
4. Further optimizing the chart rendering components

We will continue to monitor performance metrics and user feedback to guide additional optimizations.

### ADR-007: Chart Resizing Fix for Fullscreen-Windowed Transitions

## Status

Accepted

## Context

After implementing performance optimizations for the VisualizationPage component (as described in ADR-006), we identified an issue with graph rendering when transitioning between fullscreen and windowed modes. Charts would appear broken or incorrectly sized during these transitions, and would only render correctly after a manual data refresh.

The previous solution, which involved reapplying all filters and recalculating data on window resize, was performance-intensive and caused unnecessary processing. We needed a more efficient solution that would maintain the performance benefits of our previous optimization while correctly handling resize events.

## Decision

We implemented a targeted chart resize handler with the following approach:

1. **Chart-Specific Resize Handling**

   - Added React refs to the Plotly chart components
   - Created chart width state variables to track dimension changes
   - Implemented resize event listeners specific to the chart components

2. **Efficient Resize Response**

   - Used Plotly's built-in `handleResize` method to update chart dimensions
   - Applied the resize handler without recalculating or refiltering data
   - Added a useEffect hook with proper cleanup of event listeners

3. **Consistent Cross-Component Implementation**

   - Applied the same pattern to both PerformanceChart and QuantumResultsChart components
   - Used consistent implementation patterns for maintainability
   - Enabled the useResizeHandler prop in Plotly components

4. **Controlled Resize Timing**
   - Added small delays to handle resize calculations after DOM updates
   - Prevented excessive resize handler calls with state-based condition checks

## Consequences

### Positive

- **Fixed Visual Glitches** - Charts now resize properly when transitioning between fullscreen and windowed modes
- **Maintained Performance** - No unnecessary data recalculation or filtering on resize
- **Enhanced User Experience** - Seamless visualization experience even during window size changes
- **Reduced Resource Usage** - No redundant processing during resize events
- **Better Maintainability** - Clean, reusable pattern for handling chart resizing

### Negative

- **Slight Complexity Increase** - Additional ref and state management for resize handling
- **Minor Implementation Overhead** - Need for resize-specific useEffect hooks
- **Dependency on Plotly API** - Implementation relies on Plotly's internal resize handlers

## Implementation Notes

The implementation follows a principled approach to handling UI responsiveness:

1. **Only update what needs updating** - We target only the chart rendering, not the underlying data
2. **Use built-in capabilities** - We leverage Plotly's existing resize handlers rather than recreating functionality
3. **Clean up after yourself** - We properly remove event listeners when components unmount
4. **Maintain consistency** - We implement the same pattern across both chart components

## Future Considerations

This pattern could be extended to other visualizations in the application. If we add new chart types or visualization components, we should apply this same resize handling approach for consistency.

### ADR-010: Improved Ref Handling in Visualization Components

## Status

Accepted

## Context

Our visualization components (PerformanceChart and QuantumResultsChart) are used throughout the application to display benchmark and quantum workload results. These components use Plotly.js for rendering charts and need to properly handle resize events, especially during fullscreen transitions and data refreshes.

Previously, we were passing refs directly as a prop named `ref` to these components, which led to TypeScript errors because:

1. React reserves the `ref` prop for its internal ref forwarding mechanism
2. Direct ref props on custom components don't work without proper forwarding

This was causing multiple TypeScript errors and potentially unstable behavior during chart resizing operations.

## Decision

We implemented the following changes to improve ref handling in our visualization components:

1. Modified the props interfaces for both visualization components to include a `chartRef` prop:

```typescript
interface PerformanceChartProps {
	// existing props
	chartRef?: React.RefObject<any>;
}

interface QuantumResultsChartProps {
	// existing props
	chartRef?: React.RefObject<any>;
}
```

2. Implemented a ref fallback pattern in both components:

```typescript
const localPlotRef = useRef<any>(null);
const plotRef = chartRef || localPlotRef;
```

3. Updated all component references in the VisualizationPage to use the `chartRef` prop instead of `ref`.

## Consequences

### Pros

- **Type Safety**: All component props are now properly typed, eliminating TypeScript errors
- **Flexibility**: Components can work with either externally provided refs or local refs
- **Maintainability**: The code follows React best practices for ref handling
- **Resilience**: Chart resize functionality during fullscreen transitions and refreshes is preserved

### Cons

- **Slightly More Complex Implementation**: Components now need to handle both cases (external ref or internal ref)
- **Additional Props**: Interface definitions are slightly larger with the additional prop

## Conclusion

This architectural change improves the type safety and maintainability of our visualization components while preserving the existing functionality for chart resizing during fullscreen transitions and data refreshes. The pattern implemented follows React best practices and ensures proper TypeScript typing throughout the application.

### 2024-06-10: Enhanced Visualization Components with Detailed Statistics Cards

### Decision

1. Enhanced the statistics visualization components to display comprehensive benchmark data:
   - Added per-algorithm, per-security parameter, and per-operation breakdown
   - Added detailed metrics for cryptographic operations (Keygen, Sign, Verify, Encapsulation, etc.)
   - Included key size metrics (Public Key, Secret Key, Signature, Ciphertext)
2. Updated the data processing pipeline to include key size information from benchmark results
3. Implemented an interactive operation selector to allow users to view metrics for specific operations
4. Added proper formatting for byte values with automatic unit conversion

### Consequences

- Positive:
  - More comprehensive display of benchmark results
  - Better comparability between different algorithms and operations
  - Improved user experience with interactive operation selection
  - Visual representation of key size metrics for better algorithm comparison
- Negative:
  - Increased complexity in data processing
  - Additional CPU/memory usage for processing more detailed metrics

### Status

Accepted

### 2024-10-29: Visualization Statistics Card Improvement

### Decision

1. Enhanced StatisticsCard component to support specific operation filtering
2. Fixed display issues for Kyber, McEliece, RSA, and ECDH to show proper operation-specific data
3. Special handling for AES algorithm:
   - Removed Key Generation card which is not applicable for AES
   - Created a specialized 2-column grid layout for AES cards
   - Implemented proper horizontal arrangement to display Encryption and Decryption cards side-by-side in a single row
4. Implemented conditional rendering based on algorithm type to provide the optimal layout

### Consequences

- Positive:
  - More accurate representation of algorithm-specific operations
  - Better use of screen space for algorithms with fewer operations
  - Improved user understanding of algorithm performance characteristics
  - Encryption and Decryption cards for AES now appear side-by-side in a single row for better comparison
- Negative:
  - Additional complexity in UI rendering logic
  - More conditional logic depending on algorithm type

### Status

Implemented

### ADR-006: Enhanced Batch Scheduling for Multiple Security Parameters

## Status

Implemented

## Context

Our benchmark scheduling system previously allowed users to select which algorithms to run in a batch, but limited them to choosing only one security parameter per algorithm. This limitation forced users to schedule multiple batches to test different security parameters of the same algorithm, which was inefficient and time-consuming. For comprehensive evaluation of post-quantum and classical cryptographic algorithms, users often need to run benchmarks across all available security parameters to compare performance characteristics.

## Decision

We have enhanced the batch scheduling interface to support multiple security parameters for each algorithm with the following implementation details:

1. Modified the `BatchJobSettings` data structure to track security parameter selections using a map of boolean values instead of a single selected parameter
2. Updated the UI to display checkboxes for each security parameter rather than a dropdown selection
3. Added a hierarchical selection interface with an "All Parameters" checkbox to quickly select or deselect all security parameters for an algorithm
4. Enhanced the job submission logic to create individual benchmark jobs for each selected algorithm-parameter combination
5. Streamlined the parameter selection UI with proper indentation and visual grouping for better usability

## Consequences

### Pros

- Users can now schedule comprehensive benchmark runs across multiple security levels in a single operation
- More flexible benchmark configuration, allowing precise selection of which parameters to test
- Improved UI with clear visual indication of which parameters are selected
- More efficient data collection process for comparing performance across security levels
- Better alignment with real-world cryptographic evaluation scenarios where multiple security levels need to be compared

### Cons

- Slightly increased UI complexity that may be overwhelming for new users
- More complex state management to track multiple security parameter selections
- Increased number of jobs in the queue when running full benchmark suites, which could lead to longer processing times
- Additional memory usage to track the expanded selection state
