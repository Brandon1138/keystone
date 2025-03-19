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
