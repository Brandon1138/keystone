# grover_search.py

import math
import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit.circuit.library import GroverOperator, MCMT, ZGate
from qiskit.visualization import plot_histogram
from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2 as Sampler
from qiskit.transpiler.preset_passmanagers import generate_preset_pass_manager
import matplotlib.pyplot as plt
from qiskit_aer import AerSimulator # Import AerSimulator directly

# For Command Line Args, JSON output, Time, Exit codes
import argparse
import json
import time
import sys
import traceback # For detailed error logging

# --- Helper Functions (Logging to stderr) ---
def log_stderr(*args, **kwargs):
    """Prints messages to stderr."""
    print(*args, file=sys.stderr, **kwargs)

# --- Oracle Construction ---
# Maps a list of marked bit-strings to a quantum oracle.
def grover_oracle(marked_states, num_qubits):
    log_stderr("  Building Grover oracle...")
    if not isinstance(marked_states, list):
        marked_states = [marked_states]

    qc = QuantumCircuit(num_qubits, name="Oracle")
    for target in marked_states:
        # Qiskit uses little-endian ordering: reverse the bit-string.
        rev_target = target[::-1]
        # Determine indices where the target bit is '0'
        zero_inds = [i for i in range(num_qubits) if rev_target.startswith("0", i)]

        # Apply X gates to map |target> to |1...1>
        if zero_inds:
            qc.x(zero_inds)

        # Apply multi-controlled Z gate
        # Use num_qubits-1 controls and 1 target for standard MCMT
        qc.compose(MCMT(ZGate(), num_qubits - 1, 1), inplace=True)

        # Apply X gates back
        if zero_inds:
            qc.x(zero_inds)
        qc.barrier() # Barrier after each target state processing within oracle
    log_stderr(f"  Oracle built for states: {marked_states}")
    return qc


# --- Grover Circuit Assembly ---
# Builds the complete circuit with optimal iterations.
def build_grover_circuit(marked_states):
    log_stderr("Building Grover Circuit...")
    if not marked_states:
        raise ValueError("Marked states list cannot be empty.")

    num_qubits = len(marked_states[0]) # Assumes all marked states have the same length
    log_stderr(f"  Number of qubits (n): {num_qubits}")

    oracle = grover_oracle(marked_states, num_qubits)
    grover_op = GroverOperator(oracle)

    # Compute the optimal number of iterations:
    num_marked = len(marked_states)
    n = num_qubits
    # Handle case where num_marked is 0 or >= 2^n (though input validation should prevent this)
    if num_marked == 0:
         optimal_iterations = 0
    elif num_marked >= 2**n:
         optimal_iterations = 0 # Or handle as error, search is trivial
    else:
         optimal_iterations = math.floor(math.pi / (4 * math.asin(math.sqrt(num_marked / 2**n))))
    log_stderr(f"  Optimal number of Grover iterations: {optimal_iterations}")

    # Assemble the circuit
    qc = QuantumCircuit(n, name="GroverSearch")
    # 1. Create superposition
    qc.h(range(n))
    qc.barrier()

    # 2. Apply Grover operator iteratively
    if optimal_iterations > 0:
        qc.compose(grover_op.power(optimal_iterations), inplace=True)

    # 3. Measure all qubits
    qc.measure_all() # Adds classical register named 'meas' by default
    log_stderr("Grover circuit construction complete.")
    return qc, num_qubits


# --- Circuit Optimisation (returns metrics) ---
def optimize_circuit(qc, backend):
    """Optimize the circuit and return metrics."""
    log_stderr(f"\nOptimizing circuit for backend: {backend.name}...")
    try:
        target = backend.target
        # Optimization level 3 is standard for Grover, but 2 might be faster compromise
        pm = generate_preset_pass_manager(target=target, optimization_level=3)
        optimized_circuit = pm.run(qc)
        log_stderr("Optimization complete.")
        depth = 0
        cx_count = 0
        gate_count = 0
        try:
            depth = optimized_circuit.depth()
            ops = optimized_circuit.count_ops()
            cx_count = ops.get('cx', 0) # CX is often key metric for noise
            gate_count = sum(ops.values())
            log_stderr(f"Optimized circuit depth: {depth}")
            log_stderr(f"Optimized CX gate count: {cx_count}")
            log_stderr(f"Optimized total gate count: {gate_count}")
        except Exception as e:
            log_stderr(f"Warning: Could not calculate depth/gate counts: {e}")
        return optimized_circuit, depth, cx_count, gate_count
    except Exception as e:
        log_stderr(f"ERROR during circuit optimization: {e}")
        log_stderr(traceback.format_exc())
        # Return original circuit and zero metrics if optimization fails
        return qc, 0, 0, 0


# --- Execution on Hardware/Simulator (returns job_id, counts) ---
def run_circuit(qc, backend, shots):
    """Run the circuit using SamplerV2 primitive."""
    log_stderr(f"\nRunning circuit on backend: {backend.name} with {shots} shots.")
    sampler = Sampler(mode=backend)
    sampler.options.default_shots = shots
    # Use default resilience/optimization level for Sampler
    # sampler.options.optimization_level = 1

    job = sampler.run([qc])
    job_id = job.job_id()
    log_stderr(f"Job ID: {job_id}")
    log_stderr("Waiting for job to complete...")
    # result() waits for completion and returns list of PubResults
    # For a single circuit, we access the first element.
    result_list = job.result()
    if not result_list:
        raise RuntimeError(f"Job {job_id} did not return any results.")
    result = result_list[0]
    log_stderr("Job finished.")

    counts = {}
    # Extract counts robustly from SamplerV2 result
    # The default classical register name from measure_all() is 'meas'
    pub_result = result.data
    data_container = None

    if hasattr(pub_result, 'meas'):
        data_container = pub_result.meas
        log_stderr("Extracting counts from default data field: meas")
    else:
        # Fallback: check other potential fields if 'meas' isn't present
        # (Though measure_all() should consistently produce 'meas')
        for field_name, container in pub_result.__fields_items__():
             if hasattr(container, 'get_counts'):
                 data_container = container
                 log_stderr(f"Extracting counts from data field: {field_name}")
                 break

    if data_container and hasattr(data_container, 'get_counts'):
        # Sampler returns counts with keys as hex (0x...) or binary strings
        # depending on backend/version. Get counts converts to binary strings.
        counts = data_container.get_counts()
    elif data_container and isinstance(data_container, dict): # Aer can sometimes return dict
         counts = data_container # Assume keys are already binary strings or compatible
         # Optional: Convert hex keys if necessary
         # counts = {bin(int(k, 16))[2:].zfill(qc.num_qubits): v for k, v in data_container.items() if k.startswith('0x')}
    else:
        log_stderr("Warning: Could not extract counts from SamplerV2 result data structure.")
        log_stderr(f"Result data type: {type(pub_result)}")
        log_stderr(f"Result data content: {pub_result}")

    log_stderr("Measurement counts received.")
    return job_id, counts

# --- Plotting Function ---
def generate_plot(counts, num_qubits, input_marked_states, backend_name, theme, plot_file_path):
    """Generates and saves the histogram plot, highlighting marked states."""
    log_stderr(f"\nGenerating plot ({theme} theme) to {plot_file_path}...")
    try:
        text_color = 'black' if theme == 'light' else 'white'
        bar_color = '#648fff' # Adjusted blue color
        marked_color = '#ffb000' # Amber/Orange for marked states
        grid_color = '#cccccc' if theme == 'light' else '#555555'

        plt.style.use('seaborn-v0_8-darkgrid' if theme == 'dark' else 'seaborn-v0_8-whitegrid')
        fig, ax = plt.subplots(figsize=(12, 7)) # Slightly wider plot
        fig.patch.set_alpha(0.0) # Transparent background
        ax.patch.set_alpha(0.0)

        if not counts:
             log_stderr("No counts data to plot.")
             ax.set_title("No Measurement Data Received", color=text_color)
        else:
             # Ensure keys are bitstrings, convert if needed (e.g., from int keys)
             str_counts = {str(k): v for k, v in counts.items()}

             # Pad keys with leading zeros if needed
             padded_counts = {k.zfill(num_qubits): v for k, v in str_counts.items()}

             # Plot all bars
             sorted_keys = sorted(padded_counts.keys())
             values = [padded_counts[k] for k in sorted_keys]

             colors = [marked_color if k in input_marked_states else bar_color for k in sorted_keys]

             ax.bar(sorted_keys, values, color=colors)

             ax.set_xlabel("Measured State (Bitstring)", color=text_color)
             ax.set_ylabel("Counts", color=text_color)
             title = f"Grover Search Results on {backend_name}"
             if input_marked_states:
                  title += f"\nTarget States: {', '.join(input_marked_states)} (highlighted)"
             ax.set_title(title, color=text_color)

             ax.tick_params(axis='x', colors=text_color, rotation=75) # Rotate labels if many qubits
             ax.tick_params(axis='y', colors=text_color)

             # Adjust x-ticks frequency if too many states
             if num_qubits > 5:
                 step = 2**(num_qubits - 4) # Show roughly 16 ticks
                 ax.set_xticks(sorted_keys[::step])

             for spine in ax.spines.values():
                 spine.set_edgecolor(text_color)

             # Add a simple legend entry for the marked state color
             from matplotlib.patches import Patch
             legend_elements = [Patch(facecolor=marked_color, edgecolor=marked_color, label='Marked State')]
             legend = ax.legend(handles=legend_elements, loc='best')
             plt.setp(legend.get_texts(), color=text_color)
             legend.get_frame().set_alpha(0.5)

             ax.grid(axis='y', linestyle='--', color=grid_color, alpha=0.7)

        # Save with transparent background
        plt.savefig(plot_file_path, transparent=True, dpi=150, bbox_inches='tight')
        plt.close(fig) # Close the plot figure
        log_stderr(f"Plot saved successfully to {plot_file_path}")
        return True
    except Exception as e:
        log_stderr(f"ERROR generating plot: {e}")
        log_stderr(traceback.format_exc())
        return False


# --- Main Execution ---
def main():
    parser = argparse.ArgumentParser(description="Run Grover's search algorithm using Qiskit.")
    parser.add_argument('--api_token', type=str, required=True, help='IBM Quantum API Token')
    parser.add_argument('--marked_states', type=str, required=True, help='Comma-separated list of binary strings to mark (e.g., "101,010")')
    parser.add_argument('--shots', type=int, default=4096, help='Number of shots to run (default: 4096)')
    parser.add_argument('--run_on_hardware', action='store_true', help='Run on real hardware instead of simulator')
    parser.add_argument('--plot_file', type=str, required=True, help='Path to save the output plot PNG file')
    parser.add_argument('--plot_theme', type=str, required=True, choices=['light', 'dark'], help='Plot theme (light or dark)')
    parser.add_argument('--output_json', type=str, required=True, help='Path to save the output JSON results file')
    args = parser.parse_args()

    results = {
        "status": "failure",
        "input_marked_states": None,
        "top_measured_state": None, # The single most frequent state measured
        "top_measured_count": None,
        "found_correct_state": False, # Did the top state match one of the inputs?
        "execution_time_sec": None,
        "circuit_depth": None,
        "cx_gate_count": None,
        "total_gate_count": None,
        "num_qubits": None,
        "backend_used": None,
        "job_id": None,
        "shots": args.shots,
        "ran_on_hardware": args.run_on_hardware,
        "plot_file_path": None,
        "error_message": None,
        "raw_counts": None,
    }
    start_time = time.time()

    try:
        # --- Input Validation ---
        marked_states_list = [s.strip() for s in args.marked_states.split(',') if s.strip()]
        if not marked_states_list:
            raise ValueError("No marked states provided. Use --marked_states argument.")
        results["input_marked_states"] = marked_states_list

        # Check if all marked states are binary and have the same length
        num_qubits = len(marked_states_list[0])
        if num_qubits == 0:
             raise ValueError("Marked states cannot be empty strings.")
        for state in marked_states_list:
            if len(state) != num_qubits:
                raise ValueError("All marked states must have the same length (number of qubits).")
            if not all(c in '01' for c in state):
                raise ValueError(f"Marked state '{state}' is not a valid binary string.")
        results["num_qubits"] = num_qubits
        log_stderr(f"Input valid: Searching for {len(marked_states_list)} marked state(s) ({', '.join(marked_states_list)}) using {num_qubits} qubits.")

        # --- Connect to IBM Quantum ---
        log_stderr("\nConnecting to IBM Quantum...")
        # Allow fallback to environment variable if token arg is empty string?
        service = QiskitRuntimeService(channel="ibm_quantum", token=args.api_token)
        log_stderr("Connected.")

        # --- Select Backend ---
        backend = None
        required_qubits = num_qubits
        if args.run_on_hardware:
            log_stderr("Selecting least busy real hardware backend...")
            try:
                # Ensure simulator=False and min_num_qubits requirement
                backend = service.least_busy(min_num_qubits=required_qubits, operational=True, simulator=False)
                log_stderr(f"Selected real hardware backend: {backend.name}")
            except Exception as e:
                 results["error_message"] = f"Could not find suitable IBM hardware backend ({required_qubits}+ qubits): {e}"
                 raise RuntimeError(results["error_message"])
        else:
            log_stderr("Selecting local Aer simulator...")
            try:
                 # Use default AerSimulator (most flexible)
                 backend = AerSimulator()
                 # Optional: Check if AerSimulator can handle required qubits? (Usually fine)
                 log_stderr(f"Selected backend: {backend.name}")
            except ImportError:
                 results["error_message"] = "qiskit-aer not installed. Cannot run simulator."
                 raise ImportError(results["error_message"])
            except Exception as e:
                 results["error_message"] = f"Failed to initialize AerSimulator: {e}"
                 raise RuntimeError(results["error_message"])

        results["backend_used"] = backend.name

        # --- Build Circuit ---
        qc, nq = build_grover_circuit(marked_states_list)
        # Ensure num_qubits from build matches expectation
        if nq != results["num_qubits"]:
            log_stderr(f"Warning: Circuit built with {nq} qubits, expected {results['num_qubits']}. Using {nq}.")
            results["num_qubits"] = nq

        # --- Optimize Circuit ---
        # Optimization is crucial for real hardware
        qc_optimized, depth, cx_count, gate_count = optimize_circuit(qc, backend)
        results["circuit_depth"] = depth
        results["cx_gate_count"] = cx_count
        results["total_gate_count"] = gate_count

        # --- Run Circuit ---
        job_id, counts = run_circuit(qc_optimized, backend, args.shots)
        results["job_id"] = job_id
        # Ensure counts keys are padded if necessary before storing/processing
        padded_counts = {k.zfill(results["num_qubits"]): v for k, v in counts.items()}
        results["raw_counts"] = padded_counts

        # --- Plot Results ---
        plot_success = generate_plot(padded_counts, results["num_qubits"], marked_states_list, backend.name, args.plot_theme, args.plot_file)
        if plot_success:
            results["plot_file_path"] = args.plot_file
        else:
            # Log error but continue processing results
            results["error_message"] = (results.get("error_message") or "") + " Failed to generate plot."


        # --- Process Results ---
        log_stderr("\n--- Analysing Results ---")
        if not padded_counts:
             results["error_message"] = (results.get("error_message") or "") + " No measurement counts received."
             raise ValueError("No measurement counts received.")

        # Find the most frequent measurement outcome
        # Sort by count (descending), then by key (ascending for tie-breaking)
        sorted_counts = sorted(padded_counts.items(), key=lambda item: (-item[1], item[0]))
        top_state, top_count = sorted_counts[0]
        results["top_measured_state"] = top_state
        results["top_measured_count"] = top_count

        log_stderr(f"Most frequent measured state: |{top_state}> with {top_count} counts.")

        # Check if the top measured state is one of the marked states
        if top_state in marked_states_list:
            results["status"] = "success"
            results["found_correct_state"] = True
            log_stderr(f"Success! The most frequent state |{top_state}> matches one of the marked states.")
            log_stderr(f"\n====================================")
            log_stderr(f"Grover search successful for target(s): {', '.join(marked_states_list)}")
            log_stderr(f"Found state |{top_state}> with highest probability.")
            log_stderr(f"====================================")
        else:
            # Status remains "failure" (as initialized)
            results["found_correct_state"] = False
            results["error_message"] = (results.get("error_message") or "") + f" Top measured state |{top_state}> did not match any marked state."
            log_stderr(f"Failure: The most frequent state |{top_state}> is NOT among the marked states: {marked_states_list}.")
            log_stderr("\n------------------------------------")
            log_stderr("Grover search did not yield a marked state as the most probable outcome.")
            log_stderr("Check histogram plot and logs. Possible reasons: noise, insufficient shots/iterations, decoherence.")
            log_stderr("------------------------------------")


    except Exception as e:
        log_stderr(f"\n--- SCRIPT ERROR ---")
        log_stderr(f"An error occurred: {e}")
        log_stderr(traceback.format_exc()) # Log full traceback to stderr
        if results["error_message"] is None: # Set error message if not already set
             results["error_message"] = f"An unexpected error occurred: {str(e)}"
        results["status"] = "failure"
        # Ensure specific result fields are None/False if error occurred before they were set
        results["found_correct_state"] = False
        results["top_measured_state"] = results.get("top_measured_state") # Keep if already found
        results["top_measured_count"] = results.get("top_measured_count")


    finally:
        end_time = time.time()
        results["execution_time_sec"] = round(end_time - start_time, 2)

        # --- Write JSON Output ---
        log_stderr(f"\nWriting results to {args.output_json}")
        try:
            # Ensure all values in results are JSON serializable
            # (Counts dict keys/values, numpy types if any slipped in, etc.)
            # Basic types (str, int, float, bool, list, dict) are fine.
            with open(args.output_json, 'w') as f:
                json.dump(results, f, indent=4)
            log_stderr("JSON results saved successfully.")
        except TypeError as te:
             log_stderr(f"ERROR: Failed to serialize results to JSON: {te}")
             # Attempt to serialize safely, replacing unserializable items
             def safe_serialize(obj):
                 if isinstance(obj, (str, int, float, bool, list, tuple, dict)) or obj is None:
                     return obj
                 return str(obj) # Convert problematic types to string
             try:
                 with open(args.output_json, 'w') as f:
                     json.dump(results, f, indent=4, default=safe_serialize)
                 log_stderr("JSON results saved with potentially lossy serialization.")
             except Exception as e:
                  log_stderr(f"ERROR: Critical failure writing JSON results to {args.output_json}: {e}")
                  print(results, file=sys.stderr) # Print raw dict to stderr as last resort
                  sys.exit(1) # Exit with error even if quantum part 'succeeded'

        except Exception as e:
            log_stderr(f"ERROR: Failed to write JSON results to {args.output_json}: {e}")
            print(results, file=sys.stderr) # Print raw dict to stderr
            sys.exit(1) # Exit with error

        # --- Exit with appropriate code ---
        if results["status"] == "success":
             log_stderr("\nExiting with status code 0 (Success).")
             sys.exit(0)
        else:
             log_stderr(f"\nExiting with status code 1 (Failure: {results.get('error_message', 'Unknown error')}).")
             sys.exit(1)


if __name__ == '__main__':
    main()