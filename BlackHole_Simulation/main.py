import pygame
import numpy as np
import sys
import os

from physics import predict_trajectory
from environment import BlackHole, AccretionDisk, Starfield, CheckpointManager, SpacetimeGrid
from genetic_algo import GeneticAlgorithm
from dashboard import Dashboard
from probe import Probe


def main():
    pygame.init()
    pygame.font.init()

    WIDTH, HEIGHT = 1200, 800
    VIEWPORT_WIDTH = 850
    screen = pygame.display.set_mode((WIDTH, HEIGHT))
    pygame.display.set_caption("Black Hole Probe Simulator using Neuroevolution")
    clock = pygame.time.Clock()

    G = 1.0
    MASS_BH = 20000.0
    RS = 75
    C_SPEED = 16.0
    BH_POS = pygame.Vector2(VIEWPORT_WIDTH // 2, HEIGHT // 2)

    START_POS = pygame.Vector2(200, 400)
    # Circular orbit speed: v = sqrt(GM/r) = sqrt(20000/225) ≈ 9.4 px/frame upward
    START_VEL = pygame.Vector2(0, -9.4)

    is_sandbox = False
    sim_speed = 1
    draw_sensors = True
    earth_frame_counter = 0
    generation_frames = 0
    MAX_GENERATION_FRAMES = 1500

    bh = BlackHole(BH_POS, rs=RS, mass=MASS_BH, g_const=G)
    accretion_disk = AccretionDisk(BH_POS, RS, num_particles=1000)
    starfield = Starfield(VIEWPORT_WIDTH, HEIGHT, num_stars=220)
    checkpoint_mgr = CheckpointManager(BH_POS)
    spacetime_grid = SpacetimeGrid(BH_POS, VIEWPORT_WIDTH, HEIGHT)

    # Override with the actual mission route
    checkpoint_mgr.checkpoints = [
        pygame.Vector2(BH_POS.x, BH_POS.y - 225),       # top
        pygame.Vector2(BH_POS.x + 225, BH_POS.y),       # right
        pygame.Vector2(BH_POS.x, BH_POS.y + 225),       # bottom
        pygame.Vector2(BH_POS.x - 225, BH_POS.y),       # left (full lap)
        pygame.Vector2(BH_POS.x + 360, BH_POS.y - 280)  # escape
    ]

    ga = GeneticAlgorithm(pop_size=100, start_pos=START_POS, start_vel=START_VEL)

    sandbox_probes = []

    dashboard = Dashboard(VIEWPORT_WIDTH, WIDTH - VIEWPORT_WIDTH, HEIGHT)

    drag_start = None
    drag_current = None
    is_dragging = False

    running = True
    while running:
        mouse_pos = pygame.mouse.get_pos()
        dt = 1.0

        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

            elif event.type == pygame.MOUSEBUTTONDOWN:
                click_handled = False
                for btn_key, btn in dashboard.buttons.items():
                    if btn.handle_click(event.pos):
                        click_handled = True
                        if btn_key == "mode":
                            is_sandbox = not is_sandbox
                        elif btn_key == "sensors":
                            draw_sensors = not draw_sensors
                        elif btn_key == "reset":
                            if is_sandbox:
                                sandbox_probes = []
                            else:
                                ga.initialize_population()
                                ga.generation = 1
                                ga.best_fitness = 0.0
                                ga.avg_fitness = 0.0
                                ga.fitness_history = []
                                ga.avg_fitness_history = []
                                ga.best_probe_history = []
                                generation_frames = 0
                        elif btn_key.startswith("speed_"):
                            sim_speed = int(btn_key.split("_")[1].replace("x", ""))
                        elif btn_key == "mut_dec":
                            ga.mutation_rate = max(0.01, ga.mutation_rate - 0.02)
                        elif btn_key == "mut_inc":
                            ga.mutation_rate = min(0.50, ga.mutation_rate + 0.02)

                if not click_handled and is_sandbox and event.pos[0] < VIEWPORT_WIDTH:
                    drag_start = pygame.Vector2(event.pos)
                    drag_current = pygame.Vector2(event.pos)
                    is_dragging = True

            elif event.type == pygame.MOUSEMOTION:
                if is_dragging:
                    drag_current = pygame.Vector2(event.pos)

            elif event.type == pygame.MOUSEBUTTONUP:
                if is_dragging:
                    launch_vel = (drag_start - pygame.Vector2(event.pos)) * 0.08
                    new_probe = Probe(drag_start, launch_vel)
                    new_probe.fuel = 1000.0
                    new_probe.base_color = pygame.Color(0, 240, 255)
                    new_probe.color = pygame.Color(0, 240, 255)
                    sandbox_probes.append(new_probe)

                    is_dragging = False
                    drag_start = None
                    drag_current = None

            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_p:
                    filename = f"fitness_report_gen{ga.generation}.png"
                    success = dashboard.export_matplotlib_chart(ga, filename)
                    if success:
                        print(f"Saved report chart to {filename}")
                elif event.key == pygame.K_r:
                    if is_sandbox:
                        sandbox_probes = []
                    else:
                        ga.initialize_population()
                        generation_frames = 0
                elif event.key == pygame.K_s:
                    draw_sensors = not draw_sensors
                elif event.key == pygame.K_m:
                    is_sandbox = not is_sandbox

        # Manual keyboard control for the latest sandbox probe
        if is_sandbox and sandbox_probes:
            keys = pygame.key.get_pressed()
            active_p = sandbox_probes[-1]
            if active_p.is_alive:
                steer_val = 0.0
                if keys[pygame.K_LEFT]:
                    steer_val = -1.0
                elif keys[pygame.K_RIGHT]:
                    steer_val = 1.0

                thrust_val = 0.0
                if keys[pygame.K_UP]:
                    thrust_val = 1.0

                active_p.angle += steer_val * active_p.max_steer_speed
                active_p.angle %= 360

                if thrust_val > 0.0 and active_p.fuel > 0.0:
                    rad = np.radians(active_p.angle)
                    heading = pygame.Vector2(np.cos(rad), np.sin(rad))
                    active_p.acc += heading * active_p.max_thrust * thrust_val
                    active_p.fuel -= active_p.fuel_burn_rate

        # Run physics multiple times per render frame to handle speed multipliers
        for _ in range(sim_speed):
            accretion_disk.update(dt)
            checkpoint_mgr.update()

            if is_sandbox:
                for p in sandbox_probes:
                    if p.is_alive or p.is_dying:
                        p.update_physics(BH_POS, MASS_BH, G, RS, C_SPEED, VIEWPORT_WIDTH, HEIGHT)
            else:
                generation_frames += 1
                earth_frame_counter += 1

                max_cleared = 0
                for p in ga.probes:
                    if p.is_alive or p.is_dying:
                        target_idx = p.checkpoints_cleared
                        target_pos = checkpoint_mgr.checkpoints[min(target_idx, len(checkpoint_mgr.checkpoints) - 1)]

                        if p.is_alive and not p.is_dying:
                            p.run_sensors(BH_POS, RS, VIEWPORT_WIDTH, HEIGHT)
                            p.think_and_control(target_pos)

                        p.update_physics(BH_POS, MASS_BH, G, RS, C_SPEED, VIEWPORT_WIDTH, HEIGHT)

                        if p.is_alive and not p.is_dying and checkpoint_mgr.check_checkpoint(p.pos, target_idx):
                            p.checkpoints_cleared += 1
                            if p.checkpoints_cleared >= len(checkpoint_mgr.checkpoints):
                                p.is_completed = True
                                p.is_alive = False
                                p.death_reason = "completed"

                        max_cleared = max(max_cleared, p.checkpoints_cleared)

                if ga.is_generation_over(generation_frames, MAX_GENERATION_FRAMES):
                    ga.evolve_generation(RS)
                    generation_frames = 0

        # Pick the best probe for the neural net visualiser
        best_active_probe = None
        if is_sandbox:
            if sandbox_probes:
                alive_manuals = [p for p in sandbox_probes if p.is_alive or p.is_dying]
                if alive_manuals:
                    best_active_probe = alive_manuals[-1]
                else:
                    best_active_probe = sandbox_probes[-1]
        else:
            alive_ai = [p for p in ga.probes if p.is_alive or p.is_dying]
            if alive_ai:
                best_active_probe = max(
                    alive_ai,
                    key=lambda p: (p.checkpoints_cleared, p.is_alive, -p.pos.distance_to(checkpoint_mgr.checkpoints[min(p.checkpoints_cleared, len(checkpoint_mgr.checkpoints) - 1)]))
                )

        current_render_checkpoint_idx = 0
        if not is_sandbox:
            alive_ai = [p for p in ga.probes if p.is_alive or p.is_dying]
            if alive_ai:
                current_render_checkpoint_idx = max(p.checkpoints_cleared for p in alive_ai)
            current_render_checkpoint_idx = min(current_render_checkpoint_idx, len(checkpoint_mgr.checkpoints) - 1)

        dashboard.update(mouse_pos, sim_speed, draw_sensors, is_sandbox, ga.mutation_rate)

        screen.fill(pygame.Color(5, 5, 8))

        starfield.draw(screen, BH_POS, RS)
        spacetime_grid.draw(screen, RS)
        accretion_disk.draw(screen, RS)
        bh.draw(screen)
        checkpoint_mgr.draw(screen, current_render_checkpoint_idx)

        if is_sandbox:
            for p in sandbox_probes:
                if p.is_alive or p.is_dying:
                    p.draw(screen, draw_sensors, BH_POS)
        else:
            for p in ga.probes:
                if (p.is_alive or p.is_dying) and p != best_active_probe:
                    p.draw(screen, draw_sensors=False, bh_pos=BH_POS)
            if best_active_probe is not None and (best_active_probe.is_alive or best_active_probe.is_dying):
                best_active_probe.draw(screen, draw_sensors=draw_sensors, bh_pos=BH_POS)
                if best_active_probe.is_alive and not best_active_probe.is_dying:
                    pygame.draw.circle(screen, pygame.Color(255, 255, 255, 120),
                                       (int(best_active_probe.pos.x), int(best_active_probe.pos.y)), 14, 1)

        if is_dragging and drag_start and drag_current:
            pygame.draw.line(screen, pygame.Color(0, 240, 255), drag_start, drag_current, 2)
            pygame.draw.circle(screen, pygame.Color(0, 240, 255), (int(drag_start.x), int(drag_start.y)), 4)

            vel_vec = (drag_start - drag_current) * 0.08
            pred_points = predict_trajectory(
                drag_start, vel_vec, BH_POS, MASS_BH, G, RS,
                VIEWPORT_WIDTH, HEIGHT, steps=300, dt=1.0
            )
            if len(pred_points) > 1:
                for k in range(len(pred_points) - 1):
                    alpha_ratio = 1.0 - (k / len(pred_points))
                    color = pygame.Color(0, 150, 255, int(255 * alpha_ratio))
                    pygame.draw.line(screen, color, pred_points[k], pred_points[k + 1], 1)

        dashboard.draw(screen, ga, best_active_probe, earth_frame_counter / 60.0)

        pygame.display.flip()
        clock.tick(60)

    pygame.quit()
    sys.exit()


if __name__ == "__main__":
    main()
