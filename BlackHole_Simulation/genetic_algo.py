import numpy as np
import pygame
from probe import Probe
from neural_net import crossover


class GeneticAlgorithm:
    def __init__(self, pop_size=100, start_pos=(100, 400), start_vel=(3.0, -1.0)):
        self.pop_size = pop_size
        self.generation = 1
        self.start_pos = pygame.Vector2(start_pos)
        self.start_vel = pygame.Vector2(start_vel)

        self.best_fitness = 0.0
        self.avg_fitness = 0.0
        self.fitness_history = []
        self.avg_fitness_history = []
        self.best_probe_history = []

        self.probes = []
        self.initialize_population()

        self.mutation_rate = 0.12
        self.mutation_amount = 0.15
        self.elitism_pct = 0.05

    def initialize_population(self):
        self.probes = []
        for _ in range(self.pop_size):
            self.probes.append(Probe(self.start_pos, self.start_vel))

    def evaluate_fitness(self, probe, rs):
        checkpoint_reward = probe.checkpoints_cleared * 1500.0
        survival_reward = probe.proper_time * 2.5

        # Penalize sitting still
        path_length = probe.survival_time * probe.vel.length()
        movement_reward = min(path_length * 0.1, 150.0)

        # Slingshot bonus: survive a close pass at high speed
        slingshot_reward = 0.0
        if rs * 1.15 < probe.min_distance_to_bh < rs * 2.5:
            if probe.death_reason != "absorbed" and probe.max_speed_near_bh > 6.0:
                slingshot_reward = probe.max_speed_near_bh * 120.0

        fuel_burned = probe.max_fuel - probe.fuel
        fuel_penalty = fuel_burned * 0.08

        death_penalty = 0.0
        if probe.death_reason == "absorbed":
            death_penalty = 600.0

        fitness = checkpoint_reward + survival_reward + movement_reward + slingshot_reward - fuel_penalty - death_penalty
        return max(0.1, fitness)

    def is_generation_over(self, elapsed_frames, max_frames=1800):
        if elapsed_frames >= max_frames:
            return True

        for probe in self.probes:
            if probe.is_alive:
                return False

        return True

    def evolve_generation(self, rs):
        fitnesses = []
        for p in self.probes:
            fit = self.evaluate_fitness(p, rs)
            p.fitness = fit
            fitnesses.append(fit)

        fitnesses = np.array(fitnesses)

        max_idx = np.argmax(fitnesses)
        self.best_fitness = fitnesses[max_idx]
        self.avg_fitness = np.mean(fitnesses)

        self.fitness_history.append(self.best_fitness)
        self.avg_fitness_history.append(self.avg_fitness)

        best_nn = self.probes[max_idx].brain.clone()
        self.best_probe_history.append(best_nn)

        sorted_indices = np.argsort(fitnesses)[::-1]
        sorted_probes = [self.probes[idx] for idx in sorted_indices]

        num_elites = max(1, int(self.pop_size * self.elitism_pct))

        new_probes = []
        for i in range(num_elites):
            new_brain = sorted_probes[i].brain.clone()
            new_probes.append(Probe(self.start_pos, self.start_vel, brain=new_brain))

        def tournament_selection(candidates, k=4):
            indices = np.random.choice(len(candidates), k, replace=False)
            best_cand = candidates[indices[0]]
            for idx in indices[1:]:
                if candidates[idx].fitness > best_cand.fitness:
                    best_cand = candidates[idx]
            return best_cand

        while len(new_probes) < self.pop_size:
            parent1 = tournament_selection(sorted_probes, k=5)
            parent2 = tournament_selection(sorted_probes, k=5)

            child_brain = crossover(parent1.brain, parent2.brain)
            child_brain.mutate(rate=self.mutation_rate, amount=self.mutation_amount)

            new_probes.append(Probe(self.start_pos, self.start_vel, brain=child_brain))

        self.probes = new_probes
        self.generation += 1
