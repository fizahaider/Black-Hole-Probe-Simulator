# Black Hole Probe Simulator

A real-time interactive black hole simulation where AI-controlled space probes learn to orbit and escape a black hole using neuroevolution. Built with Pygame, NumPy, and a hand-written genetic algorithm + neural network.

![Python](https://img.shields.io/badge/Python-3.8+-blue) ![Pygame](https://img.shields.io/badge/Pygame-2.x-green) ![NumPy](https://img.shields.io/badge/NumPy-required-orange)

---

## What It Does

The simulator runs two modes side by side:

- **AI Mode** – 100 probes, each controlled by a neural network, try to complete a 5-checkpoint orbital mission around a black hole. Each generation, the best-performing brains are selected, crossed over, and mutated to produce the next generation. Over time, probes learn to use gravitational slingshots, conserve fuel, and escape the well.

- **Sandbox Mode** – You take control. Click and drag to launch probes manually. A dotted line previews the predicted orbit before you release. Use arrow keys to steer and thrust the active probe.

The physics includes gravitational lensing (background stars and the spacetime grid warp around the black hole), time dilation (proper time on the probe runs slower near the event horizon and at high speed), and spaghettification (probes that cross the event horizon stretch and spiral into the singularity).

---

## Installation

```bash
pip install pygame numpy matplotlib scipy
```

Then run:

```bash
python main.py
```

---

## Controls

| Input | Action |
|---|---|
| **M** | Toggle AI / Sandbox mode |
| **S** | Toggle sensor ray display |
| **R** | Reset current simulation |
| **P** | Export fitness chart to PNG |
| **Click + Drag** (Sandbox) | Launch a probe |
| **↑ Arrow** (Sandbox) | Thrust forward |
| **← / → Arrow** (Sandbox) | Steer |
| **Mode button** | Same as M |
| **Speed buttons** | Run at 1×, 2×, 4×, or 8× |
| **– / + buttons** | Decrease / increase mutation rate |

---

## Project Structure

```
BlackHole_Simulation/
├── main.py          # Entry point, game loop, input handling
├── physics.py       # Gravity, time dilation, lensing math
├── environment.py   # Black hole, accretion disk, starfield, grid, checkpoints
├── probe.py         # Probe physics, sensors, rendering, spaghettification
├── neural_net.py    # Feedforward network, mutation, crossover
├── genetic_algo.py  # Population management, fitness, selection, evolution
└── dashboard.py     # Sidebar UI, neural net visualizer, fitness graph
```

---

## How the AI Works

Each probe carries a small feedforward neural network (8 inputs → 10 hidden → 3 outputs).

**Inputs:**
- 5 raycast sensor readings (left, front-left, front, front-right, right) — distance to the event horizon or screen edge
- Current speed (normalized)
- Distance to next checkpoint (normalized)
- Heading angle relative to next checkpoint

**Outputs:**
- Steering delta (tanh, maps to left/right turn rate)
- Thrust (tanh > 0 fires engine)
- Auxiliary (unused, reserved)

At the end of each generation, probes are scored on:
- Checkpoints reached (main objective)
- Proper time survived (relativistic)
- Distance traveled (prevents idling)
- Slingshot bonus — survive a close, fast pass through the gravity well
- Fuel efficiency
- Penalty for getting absorbed

Top 5% of brains carry over unchanged (elitism). The rest are bred via tournament selection and uniform crossover, then mutated with Gaussian noise.

---

## Physics Details

### Gravitational Lensing
Stars, accretion disk particles, and the spacetime grid are rendered at warped coordinates using:

```
r' = r + (Rs² × strength) / r
```

This pushes objects radially outward from the black hole center, faking an Einstein ring.

### Time Dilation
Proper time for each probe is tracked using a Schwarzschild + special relativity approximation:

```
dt_probe = dt_earth × sqrt(1 - Rs/r - v²/c²)
```

The dashboard shows Earth clock vs. probe clock in real time.

### Spaghettification
When a probe crosses the event horizon (`r < Rs`), it enters a 30-frame death animation where it stretches along the radial axis, squeezes transversally, spins, and shrinks exponentially into the singularity.

---

## Dashboard

The right sidebar shows:

- **Mode / Speed / Sensor / Reset controls**
- **Mutation rate** adjuster
- **Telemetry stats**: generation, active probes, best/avg fitness, Earth/probe clocks, time dilation %, mission score
- **Neural network visualizer**: live node activations and weight connections for the best active probe (blue = positive weight, red = negative)
- **Fitness progression chart**: best and average fitness per generation
- Press **P** to export a high-res Matplotlib version of the chart

---
