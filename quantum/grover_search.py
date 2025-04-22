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


# --- Get Backend Noise Properties ---
def get_backend_noise_metrics(backend):
    """Retrieve noise and error metrics from the backend if available."""
    log_stderr("\nRetrieving backend noise metrics...")
    metrics = {
        "gate_error": None,
        "readout_error": None,
        "t1_time": None,
        "t2_time": None,
        "quantum_volume": None
    }
    
    try:
        # Method 1: Direct access to properties methods (newest approach)
        log_stderr("Trying direct properties access...")
        
        # Try to get quantum volume first
        try:
            if hasattr(backend, 'configuration'):
                config = backend.configuration()
                if hasattr(config, 'quantum_volume'):
                    metrics["quantum_volume"] = config.quantum_volume
                    log_stderr(f"Quantum Volume: {metrics['quantum_volume']}")
        except Exception as e:
            log_stderr(f"Error accessing quantum volume: {e}")
        
        # First try direct properties methods
        if hasattr(backend, 'properties') and backend.properties():
            props = backend.properties()
            
            # Try to access T1/T2 directly from properties methods
            t1_values = []
            t2_values = []
            readout_errors = []
            
            for qubit in range(backend.num_qubits):
                try:
                    # Direct methods for T1, T2, readout_error
                    if hasattr(props, 't1'):
                        t1 = props.t1(qubit)
                        t1_values.append(t1 * 1e6)  # Convert to microseconds
                        log_stderr(f"T1 for qubit {qubit}: {t1 * 1e6:.2f} μs")
                    
                    if hasattr(props, 't2'):
                        t2 = props.t2(qubit)
                        t2_values.append(t2 * 1e6)  # Convert to microseconds
                        log_stderr(f"T2 for qubit {qubit}: {t2 * 1e6:.2f} μs")
                    
                    if hasattr(props, 'readout_error'):
                        re = props.readout_error(qubit)
                        readout_errors.append(re)
                        log_stderr(f"Readout error for qubit {qubit}: {re * 100:.4f}%")
                except Exception as e:
                    log_stderr(f"Error accessing direct properties for qubit {qubit}: {e}")
            
            # Set metrics if we found values
            if t1_values:
                metrics["t1_time"] = sum(t1_values) / len(t1_values)
                log_stderr(f"Average T1 time: {metrics['t1_time']:.2f} μs")
            
            if t2_values:
                metrics["t2_time"] = sum(t2_values) / len(t2_values)
                log_stderr(f"Average T2 time: {metrics['t2_time']:.2f} μs")
            
            if readout_errors:
                metrics["readout_error"] = sum(readout_errors) / len(readout_errors) * 100  # Convert to percentage
                log_stderr(f"Average readout error: {metrics['readout_error']:.4f}%")
        
        # Method 2: Try to get readout error directly from target's measure gate
        if metrics["readout_error"] is None and hasattr(backend, 'target') and backend.target:
            log_stderr("Trying to get readout error from target's measure gate...")
            readout_errors = []
            try:
                for qubit in range(backend.num_qubits):
                    # Access measure gate properties for this qubit
                    if "measure" in backend.target and (qubit,) in backend.target["measure"]:
                        measure_props = backend.target["measure"][(qubit,)]
                        if hasattr(measure_props, 'error'):
                            readout_errors.append(measure_props.error)
                            log_stderr(f"Readout error from target for qubit {qubit}: {measure_props.error * 100:.4f}%")
                
                if readout_errors:
                    metrics["readout_error"] = sum(readout_errors) / len(readout_errors) * 100  # Convert to percentage
                    log_stderr(f"Average readout error from target: {metrics['readout_error']:.4f}%")
            except Exception as e:
                log_stderr(f"Error accessing measure properties from target: {e}")
        
        # Method 3: Try modern qubit_properties for T1/T2
        if (metrics["t1_time"] is None or metrics["t2_time"] is None) and hasattr(backend, 'qubit_properties'):
            log_stderr("Trying modern qubit_properties for T1/T2...")
            t1_times = []
            t2_times = []
            
            for qubit in range(backend.num_qubits):
                try:
                    # Use the modern API
                    qubit_props = backend.qubit_properties(qubit)
                    if qubit_props:
                        # Modern backends return these as attributes
                        if hasattr(qubit_props, 'T1'):
                            t1_times.append(qubit_props.T1 * 1e6)  # Make sure it's in μs
                            log_stderr(f"T1 from qubit_properties for qubit {qubit}: {qubit_props.T1 * 1e6:.2f} μs")
                        if hasattr(qubit_props, 'T2'):
                            t2_times.append(qubit_props.T2 * 1e6)  # Make sure it's in μs
                            log_stderr(f"T2 from qubit_properties for qubit {qubit}: {qubit_props.T2 * 1e6:.2f} μs")
                except Exception as e:
                    log_stderr(f"Error accessing qubit_properties for qubit {qubit}: {e}")
            
            # Update metrics if we found values
            if t1_times and metrics["t1_time"] is None:
                metrics["t1_time"] = sum(t1_times) / len(t1_times)
                log_stderr(f"Average T1 time from qubit_properties: {metrics['t1_time']:.2f} μs")
            
            if t2_times and metrics["t2_time"] is None:
                metrics["t2_time"] = sum(t2_times) / len(t2_times)
                log_stderr(f"Average T2 time from qubit_properties: {metrics['t2_time']:.2f} μs")
        
        # Method 4: Extract gate errors from target if not found yet
        if metrics["gate_error"] is None and hasattr(backend, 'target') and backend.target:
            log_stderr("Trying to extract gate errors from target...")
            try:
                # Important two-qubit gates to check (different backends use different ones)
                two_qubit_gates = ['cx', 'cnot', 'ecr', 'cz', 'cp', 'crx', 'cry', 'crz', 'swap', 'iswap']
                
                gate_errors = {}  # Store errors by gate type
                
                # First, check all available instructions in target
                for gate_name in backend.target.keys():
                    # Convert gate name to string for comparison
                    gate_str = gate_name.name if hasattr(gate_name, 'name') else str(gate_name)
                    gate_str = gate_str.lower()
                    
                    # Check if it's a two-qubit gate we're interested in
                    is_two_qubit_gate = False
                    for gate_type in two_qubit_gates:
                        if gate_type in gate_str:
                            is_two_qubit_gate = True
                            gate_type_key = gate_type
                            break
                    
                    if is_two_qubit_gate:
                        log_stderr(f"Found two-qubit gate: {gate_str}")
                        
                        # Get all qubit tuples where this gate is defined
                        if gate_name in backend.target:
                            gate_errors.setdefault(gate_type_key, [])
                            
                            # For each qubits configuration of this gate
                            for qubits, props in backend.target[gate_name].items():
                                # Make sure it's a 2-qubit operation
                                if len(qubits) == 2:
                                    # Extract the error if available
                                    if hasattr(props, 'error') and props.error is not None:
                                        error_value = props.error
                                        gate_errors[gate_type_key].append(error_value)
                                        log_stderr(f"  {gate_str} error on qubits {qubits}: {error_value * 100:.6f}%")
                
                # If we found any errors, calculate the average for each gate type and overall
                if gate_errors:
                    gate_type_avgs = {}
                    total_errors = []
                    
                    for gate_type, errors in gate_errors.items():
                        if errors:
                            avg = sum(errors) / len(errors) * 100  # Convert to percentage
                            gate_type_avgs[gate_type] = avg
                            total_errors.extend(errors)
                            log_stderr(f"Average {gate_type} gate error: {avg:.6f}%")
                    
                    # Set the overall average of all two-qubit gate errors
                    if total_errors:
                        metrics["gate_error"] = sum(total_errors) / len(total_errors) * 100
                        log_stderr(f"Overall average two-qubit gate error: {metrics['gate_error']:.6f}%")
                        
                        # If CX/CNOT errors specifically exist, prefer those
                        if 'cx' in gate_type_avgs:
                            metrics["gate_error"] = gate_type_avgs['cx']
                            log_stderr(f"Using CX gate error: {metrics['gate_error']:.6f}%")
                        elif 'cnot' in gate_type_avgs:
                            metrics["gate_error"] = gate_type_avgs['cnot']
                            log_stderr(f"Using CNOT gate error: {metrics['gate_error']:.6f}%")
                else:
                    log_stderr("No two-qubit gate errors found in target.")
                
                # If still no errors found, try looking for single-qubit gates as fallback
                if metrics["gate_error"] is None:
                    log_stderr("Checking single-qubit gates as fallback...")
                    single_qubit_errors = []
                    
                    for gate_name in backend.target.keys():
                        gate_str = gate_name.name if hasattr(gate_name, 'name') else str(gate_name)
                        
                        # Skip if it's a two-qubit gate or special operation
                        if any(g in gate_str.lower() for g in two_qubit_gates + ['measure', 'reset', 'barrier']):
                            continue
                            
                        # Get properties for all qubit locations
                        if gate_name in backend.target:
                            for qubits, props in backend.target[gate_name].items():
                                if len(qubits) == 1:  # Single-qubit gate
                                    if hasattr(props, 'error') and props.error is not None:
                                        single_qubit_errors.append(props.error)
                    
                    if single_qubit_errors:
                        # Use single-qubit errors but mark as different in the log
                        metrics["gate_error"] = sum(single_qubit_errors) / len(single_qubit_errors) * 100
                        log_stderr(f"WARNING: Using single-qubit gate errors: {metrics['gate_error']:.6f}%")
            except Exception as e:
                log_stderr(f"Failed to extract gate errors from target: {e}")
                log_stderr(traceback.format_exc())
        
        # Method 5: Last fallback: Try legacy extraction through properties
        if any(metrics[key] is None for key in ["gate_error", "readout_error", "t1_time", "t2_time"]):
            log_stderr("Trying legacy property extraction for missing metrics...")
            if hasattr(backend, 'properties') and backend.properties():
                props = backend.properties()
                
                # Try to get gate error if not found yet
                if metrics["gate_error"] is None and hasattr(props, 'gates'):
                    cx_gate_errors = []
                    for gate_data in props.gates:
                        if gate_data.gate == 'cx':
                            if hasattr(gate_data, 'parameters'):
                                for param in gate_data.parameters:
                                    if param.name == 'gate_error':
                                        cx_gate_errors.append(param.value)
                    
                    if cx_gate_errors:
                        metrics["gate_error"] = sum(cx_gate_errors) / len(cx_gate_errors) * 100  # Convert to percentage
                        log_stderr(f"Average CX gate error from legacy properties: {metrics['gate_error']:.4f}%")
    
    except Exception as e:
        log_stderr(f"Error retrieving backend noise metrics: {e}")
        log_stderr(traceback.format_exc())
    
    # Report on which metrics we collected
    collected = [key for key, value in metrics.items() if value is not None]
    missing = [key for key, value in metrics.items() if value is None]
    
    if collected:
        log_stderr(f"Successfully collected metrics: {', '.join(collected)}")
    if missing:
        log_stderr(f"Could not retrieve metrics: {', '.join(missing)}")
    
    return metrics

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

    # Get QPU time if available
    qpu_time = None
    try:
        usage_data = job.usage_estimation
        if usage_data and 'quantum_seconds' in usage_data:
            qpu_time = usage_data['quantum_seconds']
            log_stderr(f"QPU time: {qpu_time} seconds")
    except Exception as e:
        log_stderr(f"Unable to retrieve QPU time: {e}")

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
    return job_id, counts, qpu_time

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
        "qpu_time_sec": None,
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
        # Add noise metrics to results
        "gate_error": None,
        "readout_error": None,
        "t1_time": None,
        "t2_time": None,
        "quantum_volume": None,
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
        
        # --- Get Backend Noise Metrics (if hardware) ---
        if args.run_on_hardware:
            noise_metrics = get_backend_noise_metrics(backend)
            results["gate_error"] = noise_metrics["gate_error"]
            results["readout_error"] = noise_metrics["readout_error"]
            results["t1_time"] = noise_metrics["t1_time"]
            results["t2_time"] = noise_metrics["t2_time"]
            results["quantum_volume"] = noise_metrics["quantum_volume"]

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
        job_id, counts, qpu_time = run_circuit(qc_optimized, backend, args.shots)
        results["job_id"] = job_id
        results["qpu_time_sec"] = qpu_time  # Add QPU time to results
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