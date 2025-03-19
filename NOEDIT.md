### DO NOT EDIT THIS DOCUMENT

Below is a comprehensive, phase-based outline for building an **Electron + TypeScript + Tailwind + Graph.js + Plotly.js + Material UI** application that runs and manages your C++ post-quantum (and classical) cryptography benchmarks. The outline covers architecture, design decisions, UI/UX, data flow, extensibility, and maintainability considerations. It is written to be as detailed as possible, capturing both high-level structure and actionable implementation steps.

---

## Table of Contents

1. **Overview and Goals**
2. **Technology Stack**
3. **High-Level Architecture**
4. **Phased Development Approach**
   - 4.1 **Phase 1: Project Setup**
   - 4.2 **Phase 2: Core UI and Navigation**
   - 4.3 **Phase 3: Benchmark Runner**
   - 4.4 **Phase 4: Data Storage & Management**
   - 4.5 **Phase 5: Visualization Page**
   - 4.6 **Phase 6: Comparison Page**
   - 4.7 **Phase 7: Export Data Page**
   - 4.8 **Phase 8: Theming (Dark Mode, Material UI, Tailwind)**
5. **Detailed Architectural Breakdown**
   - 5.1 **Electron Main Process**
   - 5.2 **Electron Renderer Process**
   - 5.3 **IPC Communication**
   - 5.4 **Running C++ Benchmarks (Child Process Management)**
   - 5.5 **Data Handling & Parsing**
6. **UI/UX Components**
   - 6.1 **Home Page**
   - 6.2 **Run Benchmark Page**
   - 6.3 **Visualization Page**
   - 6.4 **Compare Benchmarks Page**
   - 6.5 **Export Data Page**
   - 6.6 **Shared Components**
7. **Data Models**
8. **Extensibility & Maintainability**
9. **Implementation Notes & Tips**

---

## 1. Overview and Goals

1. Build a desktop application to:
   - **Run** C++-based post-quantum (and classical) cryptography benchmarks (Kyber, Dilithium, McEliece, RSA, ECC, etc.).
   - **Collect** results (keygen time, encryption/encapsulation time, signature time, etc.).
   - **Visualize** these results in various charts (Plotly.js, Graph.js).
   - **Compare** post-quantum algorithms against each other or classical algorithms.
   - **Export** the resulting data in multiple formats (CSV, JSON, PDF).
2. Provide a **modern, dark-themed** UI with an intuitive navigation structure.
3. Ensure **extensibility** (adding new algorithms, parameters, or pages) and **maintainability** (clean architecture, code organization).
4. Use **Tailwind** for quick, consistent styling and **Material UI** for high-quality pre-built UI components.
5. Support a top-level navigation bar: **Home**, **Run Benchmark**, **Visualization**, **Compare Benchmarks**, **Export Data**, plus a **Dark Mode Toggle**.

---

## 2. Technology Stack

1. **Electron**

   - Provides the desktop application shell.
   - Allows us to bundle a Node.js environment to spawn C++ benchmark executables and capture stdout/stderr.

2. **TypeScript**

   - Strong typing and better maintainability within the Electron + React (or vanilla JS with TS) environment.

3. **Tailwind CSS**

   - Utility-first CSS framework for fast UI styling.
   - Easy toggling of Dark Mode with “dark:” variants.

4. **Material UI** (MUI)

   - Provides ready-made React (or TS/JS) components.
   - Combine with Tailwind carefully (you can treat MUI components as baseline, then override styles with Tailwind).

5. **Graph.js** / **Plotly.js**

   - Graph.js is typically a simpler chart library (akin to Chart.js), while Plotly is more “data science” oriented.
   - You can use both:
     - **Graph.js** for simpler line/bar/pie charts.
     - **Plotly.js** for more advanced, interactive data-science style visuals.

6. **Node.js Child Processes**

   - Spawn the C++ benchmark executables from the Electron main process or via a secure IPC channel.

7. **Local Storage / JSON Database**

   - You can store benchmark results in a JSON file or use a local embedded DB (like SQLite). JSON is simpler initially.

8. **PDF Generation**
   - For exporting data and possibly charts in PDF form.
   - Many Node-based PDF libraries exist (e.g., `pdfkit`); or you can generate a local HTML and call an Electron “print to PDF” function.

---

## 3. High-Level Architecture

```
            +--------------------------------------+
            | Electron Main Process                |
            | - Manages app lifecycle             |
            | - Spawns child processes            |
            | - Facilitates IPC with Renderer      |
            +-------------------+------------------+
                                |
                                | IPC (bench-run requests, data)
                                v
            +--------------------------------------+
            | Electron Renderer Process            |
            | (React or TS-based Single Page App)  |
            | - Displays UI w/ Tailwind + MUI      |
            | - Calls IPC to run benchmarks        |
            | - Renders charts (Plotly, Graph.js)  |
            +--------------------------------------+
```

1. **Electron Main Process**

   - Loads the application.
   - Spawns the C++ executables as child processes upon user requests.
   - Kills or gracefully stops the child process if requested.
   - Sends benchmark results to the Renderer process.

2. **Renderer Process**

   - A single-page application written in **TypeScript**.
   - Uses **Tailwind** + **Material UI** for styling and components.
   - Responsible for the user interface and data visualization.
   - Routes: **Home**, **Run Benchmark**, **Visualization**, **Compare Benchmarks**, **Export Data**.
   - Maintains a local state or a local DB (e.g. via the `electron-store` package or a custom JSON approach).

3. **Data Flow**
   - **Benchmark Output** → parsed in main process → transmitted to renderer → stored in local structure → displayed in UI.

---

## 4. Phased Development Approach

Below is a suggested sequence. You can reorder as needed, but the principle is to avoid building everything at once.

### 4.1 Phase 1: Project Setup

1. **Initialize** Electron + TypeScript project.
   - Use tools like **electron-forge** or **electron-builder**.
2. **Install** all required dependencies:
   - `npm install --save electron@latest typescript tailwindcss postcss autoprefixer material-ui plotly.js <and other necessary packages>`
3. **Configure** TypeScript (tsconfig.json), Tailwind (tailwind.config.js), and your bundler (webpack or parcel).
4. **Set Up** basic file/folder structure:
   ```
   /project-root
     ├── package.json
     ├── tsconfig.json
     ├── tailwind.config.js
     ├── src
     │    ├── main      (Electron main process)
     │    └── renderer  (UI code, React or TS components)
     └── ...
   ```

### 4.2 Phase 2: Core UI and Navigation

1. **Create** a minimal main window in the main process (e.g., `main.ts`).
2. **Set Up** a basic React or TS-based UI with:
   - A **top navigation bar** with these items: **Home**, **Run Benchmark**, **Visualization**, **Compare Benchmarks**, **Export Data**.
   - **Dark mode** toggle switch in the nav bar (you might store this in local state or push to a global Redux store if you like).
3. **Implement** client-side routing (e.g., React Router if using React) or a simple tab-based approach for the 5 pages.

### 4.3 Phase 3: Benchmark Runner

1. **Add** a dedicated page: **Run Benchmark**.
2. **Components** on **Run Benchmark**:

   - **Algorithm Dropdown** (Kyber, Dilithium, Falcon, McEliece, RSA, ECDH, ECDSA, etc.).
   - **Security Parameter Dropdown** (e.g., for Kyber: 512, 768, 1024; for Dilithium: 2,3,5; for RSA: 2048,3072,4096).
   - **Run** button that sends an IPC request to the main process, spawning the correct C++ benchmark executable with the chosen arguments.
   - **Stop** button that gracefully terminates the child process (or sends a signal that triggers a controlled exit).
   - **Status/Progress** indicator (spinner or progress bar) while the benchmark is running.
   - **Results Display**: once done, show KeyGen time, Encapsulation time, Signing time, etc. with relevant icons.

3. **Child Process Handling**:

   - **Main process** spawns `child_process.spawn(...)` or `execFile(...)`.
   - Listen to `stdout` for progress or final results.
   - If user presses Stop, call `child.kill(...)` or send a message to the C++ program to exit gracefully.

4. **Data Parsing**:

   - Each C++ benchmark outputs lines like: “KeyGen: X ms”, “Encap: Y ms”, etc.
   - Parse them into a structured object. For example:
     ```ts
     interface BenchmarkResult {
     	algorithm: string;
     	securityParam: string;
     	keygen?: number; // ms
     	encaps?: number; // ms
     	decaps?: number; // ms
     	sign?: number; // ms
     	verify?: number; // ms
     	// ...
     	timestamp: string; // so you can store the exact run time
     }
     ```
   - Send these structured results to the Renderer via IPC.

5. **Store** the result object in your local in-memory or persistent store (Phase 4 will formalize this storage).

### 4.4 Phase 4: Data Storage & Management

1. **Design** a flexible data store schema that can accommodate different metrics for different algorithms:
   - Example approach:
     ```json
     {
     	"benchmarks": [
     		{
     			"algorithm": "Kyber",
     			"securityParam": "512",
     			"metrics": {
     				"keygen": 0.01,
     				"encaps": 0.013,
     				"decaps": 0.017
     			},
     			"timestamp": "2025-03-19T14:21:45Z"
     		},
     		{
     			"algorithm": "Dilithium",
     			"securityParam": "2",
     			"metrics": {
     				"keygen": 1.5,
     				"sign": 1.5,
     				"verify": 0.7
     			},
     			"timestamp": "2025-03-19T14:30:12Z"
     		}
     	]
     }
     ```
2. **Implementation**:
   - A simple approach is using a **JSON file** in Electron’s userData directory.
   - Or you can use an embedded DB such as SQLite (via `better-sqlite3` or similar).
3. **Create** Data Access Functions:
   - `saveBenchmarkResult(benchmarkResult: BenchmarkResult): void`
   - `getAllBenchmarkResults(): BenchmarkResult[]`
   - Possibly some utility for filtering, searching historical runs, etc.

### 4.5 Phase 5: Visualization Page

1. **UI**: The **Visualization** page allows the user to pick:
   - A set of historical runs for a single algorithm (e.g., Kyber) over time to see how keygen, encaps, decaps changes.
   - Or multiple algorithms but the same metric (e.g., compare _keygen times_ for Kyber-512, Dilithium-2, and RSA-2048).
2. **Charts**:
   - Use **Plotly.js** or **Graph.js** to show line charts, bar charts, or scatter plots.
   - For example, a bar chart with “Algorithm” on the X-axis and “Time (ms)” on the Y-axis.
3. **Meaningful Data**:
   - Provide toggles to show/hide certain metrics.
   - Provide tooltips with numeric values, or embed a table summarizing the data.
   - Possibly show aggregated stats (min, max, average) over multiple runs.

### 4.6 Phase 6: Comparison Page

1. Two distinct modes:

   - **(A) Algorithm vs Algorithm**  
     Let the user pick any set of algorithms & parameter sets from the stored results to overlay them in a single chart or table.
     - E.g., a bar chart comparing average KeyGen time for {Kyber-512, Dilithium-2, McEliece-8192f, RSA-3072}.
     - Another chart might compare Encaps/Sign times, etc., but only for the relevant algorithms that have those metrics.
   - **(B) Post-Quantum vs Classical**  
     Show pre-defined groupings of “PQ” (Kyber, Dilithium, Falcon, McEliece, SPHINCS) and “Classical” (RSA, ECDH, ECDSA) in a side-by-side visualization.
     - Possibly highlight the ratio or difference to emphasize performance differences.

2. **Implementation**:
   - A dedicated UI for selecting runs from the local database.
   - On selection, build the chart data series and render them with Plotly/Graph.js.
   - Provide clarity on what metrics can be directly compared (apples-to-apples). If an algorithm doesn’t support “encaps,” it should be hidden from that chart.

### 4.7 Phase 7: Export Data Page

1. **Export** allows multiple formats:

   - **CSV**:
     - Typically, each run as a row, columns for algorithm, parameter, keygen, sign, verify, etc.
   - **JSON**:
     - The raw data structure you’re storing locally.
   - **PDF**:
     - Could be a text-based summary, or you can generate an HTML page (with the chart) and use Electron’s “Print to PDF” or a PDF library.

2. **UI**:
   - Provide checkboxes or a list of runs for the user to select which runs to export.
   - Then let them choose the format from a dropdown or radio buttons.
   - “Export” button triggers the logic.

### 4.8 Phase 8: Theming (Dark Mode, Material UI, Tailwind)

1. **Dark Mode as default**:
   - Tailwind can be set for dark mode using the class-based approach or media-based approach.
   - If using the class approach, add `class="dark"` on the HTML root to force dark mode.
   - A toggle changes that class or uses MUI’s theme toggling.
2. **Material UI Integration**:
   - You might use MUI for buttons, cards, modals, etc., then rely on Tailwind for utility classes (padding, margin, flex, etc.).
   - You can override MUI’s theme to default to Dark, then provide a toggle that switches to Light.
3. **Ensure** that all pages get a “modern aesthetic,” with consistent color palettes, spacing, and typography.

---

## 5. Detailed Architectural Breakdown

### 5.1 Electron Main Process

- **Files**: `src/main/main.ts` (example).
- **Responsibilities**:
  - Create the BrowserWindow.
  - Listen for IPC from renderer (e.g., `ipcMain.handle('run-benchmark', ...)`).
  - Spawn child processes to run the C++ benchmark executables.
  - Collect output, parse it or forward raw lines to the renderer.
  - Handle graceful shutdown signals.

### 5.2 Electron Renderer Process

- **Files**: `src/renderer/...` (React or plain TypeScript/JS + Tailwind + MUI).
- **Responsibilities**:
  - Renders the UI (navigation, forms, charts).
  - Sends IPC messages to the main process to start/stop benchmarks.
  - Receives final or intermediate results, stores them, and updates UI.

### 5.3 IPC Communication

- **Main** calls `ipcMain.handle('run-benchmark', async (evt, { algorithm, param }) => {...})`.
- **Renderer** calls `ipcRenderer.invoke('run-benchmark', { algorithm, param })`.
- For stopping the benchmark: `ipcRenderer.invoke('stop-benchmark', { pid })`.
- For receiving real-time updates, you can emit `ipcRenderer.on('benchmark-progress', (event, data) => {...})`.

### 5.4 Running C++ Benchmarks (Child Process Management)

- **Use** Node’s built-in `child_process` module (`spawn` or `execFile`).
- Example:

  ```ts
  import { spawn } from 'child_process';

  function runKyber(param: string) {
  	const kyberPath = '/path/to/benchmark_kyber';
  	return spawn(kyberPath, [param]);
  }
  ```

- **Handle** `stdout` data events:
  ```ts
  child.stdout.on('data', (data) => {
  	// parse lines, accumulate results
  });
  child.on('close', (code) => {
  	// send final results to renderer
  });
  ```
- **Graceful Stop**:
  - Option 1: `child.kill('SIGINT')` or `child.kill()` on Windows.
  - Option 2: If your C++ code listens for signals or special inputs, send a message and exit gracefully.

### 5.5 Data Handling & Parsing

- **Parsing** is simpler if the benchmark C++ code prints in a known format:
  ```
  KeyGen (ms): 0.01
  Encaps (ms): 0.013
  Decaps (ms): 0.017
  ```
- In your main process, parse lines with a simple RegExp. E.g.,
  ```ts
  const pattern = /(\w+)\s*\(\w+\):\s*([\d.]+)/;
  ```
- If multiple metrics exist, store them in a dictionary. Then pass them up to the renderer.

---

## 6. UI/UX Components

### 6.1 Home Page

- **Purpose**:
  - Welcome screen, show a brief summary of what the app does.
  - Possibly show a quick “latest benchmark runs” or highlight some interesting stats.
- **Implementation**:
  - A short description text.
  - Tailwind + MUI Card layout with quick links to each major functionality.

### 6.2 Run Benchmark Page

- **Components**:
  1. **Algorithm Dropdown** (list of post-quantum and classical algorithms).
  2. **Security Parameter Dropdown** or text field.
  3. **Run** and **Stop** buttons (MUI Buttons).
  4. **Status** or **Progress** indicator (MUI Progress or spinner).
  5. **Results** once complete, with an icon for success/failure, times in ms, etc.
- **Layout**:
  - A card or a form at the top for selecting algorithm + param.
  - A results or logs panel below showing real-time or final output.

### 6.3 Visualization Page

- **Components**:
  1. **Filters**:
     - Algorithm (multiselect).
     - Metric (keygen, encap, decap, sign, verify).
     - Date range or run IDs if relevant.
  2. **Chart**:
     - Render using Plotly or Graph.js.
     - E.g., line chart over time or bar chart comparing runs.
- **Layout**:
  - Two columns or a top filter bar with the chart below.

### 6.4 Compare Benchmarks Page

- **Mode Switch**: “Algorithm vs Algorithm” vs. “PQ vs Classical”
- **Algorithm vs Algorithm**:
  - Allow user to pick a list of saved results from the data store.
  - Generate an overlay or grouped bar chart comparing the chosen metric(s).
- **PQ vs Classical**:
  - Possibly a curated set: e.g., compare “Kyber-512 vs RSA-2048 KeyGen” in bar charts, highlight differences.
  - Another chart might show total key size, signature size, etc. (if you have that data).
- **UI**:
  - Could present a tabbed interface or a single page with toggles.

### 6.5 Export Data Page

- **Components**:
  1. **Select** the runs you want to export (checkbox list).
  2. **Choose** export format: CSV, JSON, PDF.
  3. **Export** button.
- **Implementation**:
  - For PDF, either generate a new hidden window with the relevant data + chart, then call `BrowserWindow.webContents.printToPDF()`, or use a Node library.
  - For CSV, generate a string of comma-delimited lines and trigger a file save.
  - For JSON, simply stringify the selected objects and trigger file save.

### 6.6 Shared Components

- **Top Navbar**:
  - Contains the app title, navigation links, dark-mode toggle.
- **Footer** (optional).
- **Card, Button, Modal** (MUI or your custom Tailwind components).
- **ThemeProvider** if you use MUI’s theming system.

---

## 7. Data Models

Basic example:

```ts
export interface BenchmarkRun {
	id: string; // unique ID
	algorithm: string; // "Kyber", "Dilithium", "RSA", etc.
	securityParam: string; // "512", "2", "2048", etc.
	metrics: {
		keygen?: number;
		encaps?: number;
		decaps?: number;
		sign?: number;
		verify?: number;
		// ...
	};
	timestamp: string; // or Date
}
```

You can expand or adapt as needed.

---

## 8. Extensibility & Maintainability

1. **Loose Coupling**:
   - Keep the C++ benchmarks decoupled from the front end. If new algorithms come out, you can just add another item in the “Algorithm” dropdown plus the logic to call the appropriate executable.
2. **Unified Data Structure**:
   - Having a flexible `metrics` object means new metrics can be added without changing your entire data model.
3. **Plug-and-Play Visualization**:
   - The Visualization and Compare pages can dynamically read whichever metrics exist in the data.
4. **Theming**:
   - Keep all styling in Tailwind or MUI theme definitions so you can change the design easily.
5. **File Organization**:
   - Keep main process code separate from renderer code.
   - A typical pattern is `src/main` vs `src/renderer`.
   - House your data and store logic in a separate folder, e.g. `src/store`.

---

## 9. Implementation Notes & Tips

1. **Development Workflow**:
   - Use `npm run start` (with `electron-forge` or your chosen bundler) to open the Electron window.
2. **Handling Large Output**:
   - Some benchmarks (McEliece with large parameters) might produce big logs. Use streaming or chunked approach.
3. **Killing Processes**:
   - On Windows, `child_process.kill()` may not behave the same as on Linux/Mac. Test carefully or use a more controlled approach in your C++ code (like reading from stdin).
4. **Dark Mode**:
   - Make it the default in your `index.html` (e.g., add `<html class="dark">` if using Tailwind’s `darkMode: 'class'`).
   - Toggle by adding/removing that class.
5. **Security**:
   - Evaluate the security model of Electron if you plan to distribute widely. Disable Node integration in the renderer if possible, and rely on IPC for bridging.
6. **Performance**:
   - If you handle large repeated benchmark logs, store them efficiently or only show the relevant summary.
7. **Academic/Professional Touch**:
   - Provide tooltips, disclaimers, or reference to official NIST PQC docs.
   - Possibly store average, min, max, and standard deviation across multiple repeated runs, which is often academically relevant for benchmarking.

---

## 0. Executables path

1. **Executable** path is at C:\Users\brand\executables each executable is called benchmark\_\*.exe for kyber, dilithium, mceliece, etc.
   - Note: we eventually plan to bundle the executables together with our app. For the moment, as we still plan to fine-tune the source code of the benchmarks, this approach remains our best intermediary option.

---

## Final Thoughts

By following this phased approach:

1. You ensure each page and feature is built on a solid foundation.
2. You maintain a **consistent** design (Tailwind + MUI + dark mode).
3. You can easily expand with more PQ algorithms or classical references.
4. The resulting system allows direct side-by-side comparisons, powerful visual insights, and data export for academic or professional use.

This outline aims to give you all the necessary steps—from broad architectural guidance down to the small details of data flow and UI design—to implement a **modern, robust, and maintainable** Electron application for your post-quantum cryptography benchmarks.
