import pygame
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import os


class Button:
    def __init__(self, rect, text, color, hover_color, text_color=(255, 255, 255), border_radius=4):
        self.rect = pygame.Rect(rect)
        self.text = text
        self.color = pygame.Color(*color)
        self.hover_color = pygame.Color(*hover_color)
        self.text_color = pygame.Color(*text_color)
        self.border_radius = border_radius
        self.is_hovered = False

    def update(self, mouse_pos):
        self.is_hovered = self.rect.collidepoint(mouse_pos)

    def draw(self, surface, font):
        color = self.hover_color if self.is_hovered else self.color
        pygame.draw.rect(surface, color, self.rect, border_radius=self.border_radius)
        pygame.draw.rect(surface, pygame.Color(255, 255, 255, 30), self.rect, 1, border_radius=self.border_radius)

        lbl = font.render(self.text, True, self.text_color)
        lbl_x = self.rect.x + (self.rect.width - lbl.get_width()) // 2
        lbl_y = self.rect.y + (self.rect.height - lbl.get_height()) // 2
        surface.blit(lbl, (lbl_x, lbl_y))

    def handle_click(self, mouse_pos):
        return self.rect.collidepoint(mouse_pos)


class Dashboard:
    def __init__(self, x_offset, width, height):
        self.rect = pygame.Rect(x_offset, 0, width, height)
        self.bg_color = pygame.Color(18, 22, 30)
        self.border_color = pygame.Color(35, 45, 60)
        self.accent_color = pygame.Color(255, 140, 0)

        pygame.font.init()
        self.font_title = pygame.font.SysFont("Segoe UI", 20, bold=True)
        self.font_subtitle = pygame.font.SysFont("Segoe UI", 12, italic=True)
        self.font_section = pygame.font.SysFont("Segoe UI", 13, bold=True)
        self.font_text = pygame.font.SysFont("Segoe UI", 12)
        self.font_small = pygame.font.SysFont("Segoe UI", 10)
        self.font_net_label = pygame.font.SysFont("Segoe UI", 9)

        self.buttons = {}
        self.setup_buttons()

    def setup_buttons(self):
        x = self.rect.x + 15
        self.buttons["mode"] = Button(
            (x, 70, 320, 32), "MODE: AI NEUROEVOLUTION", (30, 41, 59), (47, 55, 75)
        )
        self.buttons["speed_1x"] = Button((x, 115, 72, 28), "1x Speed", (15, 118, 110), (20, 148, 136))
        self.buttons["speed_2x"] = Button((x + 82, 115, 72, 28), "2x Speed", (30, 41, 59), (47, 55, 75))
        self.buttons["speed_4x"] = Button((x + 164, 115, 72, 28), "4x Speed", (30, 41, 59), (47, 55, 75))
        self.buttons["speed_8x"] = Button((x + 246, 115, 72, 28), "8x Speed", (30, 41, 59), (47, 55, 75))
        self.buttons["sensors"] = Button((x, 155, 155, 28), "Sensors: ON", (30, 41, 59), (47, 55, 75))
        self.buttons["reset"] = Button((x + 165, 155, 155, 28), "Reset Sim", (180, 50, 50), (210, 70, 70))
        self.buttons["mut_dec"] = Button((x + 190, 195, 30, 26), "-", (30, 41, 59), (47, 55, 75))
        self.buttons["mut_inc"] = Button((x + 230, 195, 30, 26), "+", (30, 41, 59), (47, 55, 75))

    def update(self, mouse_pos, sim_speed, draw_sensors, is_sandbox, mutation_rate):
        for key, btn in self.buttons.items():
            btn.update(mouse_pos)

        mode_text = "MODE: SANDBOX (USER ORBITS)" if is_sandbox else "MODE: AI NEUROEVOLUTION"
        self.buttons["mode"].text = mode_text
        self.buttons["mode"].color = pygame.Color(67, 20, 120) if is_sandbox else pygame.Color(20, 80, 150)

        self.buttons["sensors"].text = "Sensors: ON" if draw_sensors else "Sensors: OFF"
        self.buttons["sensors"].color = pygame.Color(16, 115, 60) if draw_sensors else pygame.Color(60, 60, 60)

        for s in ["1x", "2x", "4x", "8x"]:
            btn_key = f"speed_{s}"
            is_active = (s == f"{sim_speed}x")
            self.buttons[btn_key].color = pygame.Color(13, 148, 136) if is_active else pygame.Color(30, 41, 59)

    def draw(self, surface, ga, active_probe, earth_time):
        pygame.draw.rect(surface, self.bg_color, self.rect)
        pygame.draw.line(surface, self.border_color, (self.rect.x, 0), (self.rect.x, self.rect.height), 2)

        lbl_title = self.font_title.render("BLACK HOLE SIMULATOR", True, pygame.Color(255, 255, 255))
        lbl_subtitle = self.font_subtitle.render("Orbital Neuroevolution & Relativity Assister", True, self.accent_color)
        surface.blit(lbl_title, (self.rect.x + 15, 12))
        surface.blit(lbl_subtitle, (self.rect.x + 15, 38))

        pygame.draw.line(surface, self.border_color, (self.rect.x + 15, 58), (self.rect.x + 335, 58), 1)

        for btn in self.buttons.values():
            btn.draw(surface, self.font_text)

        lbl_mut = self.font_text.render(f"Mutation Rate: {ga.mutation_rate:.2%}", True, pygame.Color(220, 220, 220))
        surface.blit(lbl_mut, (self.rect.x + 15, 200))

        pygame.draw.line(surface, self.border_color, (self.rect.x + 15, 235), (self.rect.x + 335, 235), 1)

        lbl_stats_title = self.font_section.render("TELEMETRY STATS", True, self.accent_color)
        surface.blit(lbl_stats_title, (self.rect.x + 15, 243))

        alive_count = sum(1 for p in ga.probes if p.is_alive)

        td_pct = 100.0
        probe_proper_time = 0.0
        if active_probe is not None:
            probe_proper_time = active_probe.proper_time
            if active_probe.survival_time > 0:
                td_pct = (active_probe.proper_time / active_probe.survival_time) * 100.0

        stats_left = [
            f"Generation: {ga.generation}",
            f"Probes Active: {alive_count} / {ga.pop_size}",
            f"Best Fitness: {ga.best_fitness:.1f}",
            f"Avg Fitness: {ga.avg_fitness:.1f}"
        ]

        stats_right = [
            f"Earth Clock: {earth_time:.1f}s",
            f"Probe Clock: {probe_proper_time / 60.0:.1f}s",
            f"Time Velocity: {td_pct:.1f}%",
            f"Mission Score: {getattr(active_probe, 'checkpoints_cleared', 0) if active_probe else 0} Targets"
        ]

        for idx, text in enumerate(stats_left):
            txt_surf = self.font_text.render(text, True, pygame.Color(200, 200, 200))
            surface.blit(txt_surf, (self.rect.x + 15, 268 + idx * 20))

        for idx, text in enumerate(stats_right):
            txt_surf = self.font_text.render(text, True, pygame.Color(200, 200, 200))
            surface.blit(txt_surf, (self.rect.x + 180, 268 + idx * 20))

        pygame.draw.line(surface, self.border_color, (self.rect.x + 15, 355), (self.rect.x + 335, 355), 1)

        self.draw_neural_net(surface, active_probe)

        pygame.draw.line(surface, self.border_color, (self.rect.x + 15, 595), (self.rect.x + 335, 595), 1)

        self.draw_history_graph(surface, ga)

    def draw_neural_net(self, surface, probe):
        lbl_title = self.font_section.render("BEST PROBE NEURAL NETWORK", True, self.accent_color)
        surface.blit(lbl_title, (self.rect.x + 15, 363))

        if probe is None:
            lbl_no_probe = self.font_text.render("No active probe brain loaded", True, pygame.Color(120, 120, 120))
            surface.blit(lbl_no_probe, (self.rect.x + 80, 460))
            return

        brain = probe.brain

        x_in = self.rect.x + 70
        x_hid = self.rect.x + 175
        x_out = self.rect.x + 280

        r_node = 6

        pos_inputs = [(x_in, 395 + i * 21) for i in range(8)]
        pos_hidden = [(x_hid, 390 + i * 18) for i in range(10)]
        pos_outputs = [(x_out, 435 + i * 45) for i in range(3)]

        for i in range(8):
            for h in range(10):
                w = brain.w1[i, h]
                if abs(w) > 0.05:
                    color = (56, 189, 248) if w > 0 else (239, 68, 68)
                    thickness = int(np.clip(abs(w) * 1.8, 1, 3))
                    pygame.draw.line(surface, color, pos_inputs[i], pos_hidden[h], thickness)

        for h in range(10):
            for o in range(3):
                w = brain.w2[h, o]
                if abs(w) > 0.05:
                    color = (56, 189, 248) if w > 0 else (239, 68, 68)
                    thickness = int(np.clip(abs(w) * 1.8, 1, 3))
                    pygame.draw.line(surface, color, pos_hidden[h], pos_outputs[o], thickness)

        input_names = ["Ray L", "Ray FL", "Ray F", "Ray FR", "Ray R", "Speed", "Target D", "Target A"]
        for i, pos in enumerate(pos_inputs):
            val = brain.last_inputs[0, i] if brain.last_inputs is not None else 0.0
            val_c = int(np.clip(val * 255, 0, 255))
            color = pygame.Color(0, 200 + int(val_c * 0.2), val_c) if val > 0.1 else pygame.Color(60, 60, 70)
            pygame.draw.circle(surface, color, pos, r_node)
            pygame.draw.circle(surface, (255, 255, 255), pos, r_node, 1)
            lbl = self.font_net_label.render(input_names[i], True, pygame.Color(180, 180, 180))
            surface.blit(lbl, (pos[0] - lbl.get_width() - 8, pos[1] - lbl.get_height() // 2))

        for h, pos in enumerate(pos_hidden):
            val = brain.last_hidden[0, h] if brain.last_hidden is not None else 0.0
            if val > 0:
                color = pygame.Color(0, 200, 100)
            elif val < 0:
                color = pygame.Color(200, 50, 50)
            else:
                color = pygame.Color(60, 60, 70)
            pygame.draw.circle(surface, color, pos, r_node)
            pygame.draw.circle(surface, (255, 255, 255), pos, r_node, 1)

        output_names = ["Steer", "Thrust", "Aux"]
        for o, pos in enumerate(pos_outputs):
            val = brain.last_outputs[0, o] if brain.last_outputs is not None else 0.0
            if val > 0.1:
                color = pygame.Color(0, 200, 255)
            elif val < -0.1:
                color = pygame.Color(255, 100, 0)
            else:
                color = pygame.Color(60, 60, 70)
            pygame.draw.circle(surface, color, pos, r_node)
            pygame.draw.circle(surface, (255, 255, 255), pos, r_node, 1)
            lbl = self.font_net_label.render(output_names[o], True, pygame.Color(180, 180, 180))
            surface.blit(lbl, (pos[0] + 10, pos[1] - lbl.get_height() // 2))
            val_lbl = self.font_small.render(f"{val:+.2f}", True, pygame.Color(140, 140, 140))
            surface.blit(val_lbl, (pos[0] + 10, pos[1] + 6))

    def draw_history_graph(self, surface, ga):
        lbl_title = self.font_section.render("FITNESS PROGRESSION", True, self.accent_color)
        surface.blit(lbl_title, (self.rect.x + 15, 603))

        gx = self.rect.x + 40
        gy = 635
        gw = 285
        gh = 125

        pygame.draw.rect(surface, pygame.Color(12, 15, 21), (gx, gy, gw, gh))
        pygame.draw.rect(surface, self.border_color, (gx, gy, gw, gh), 1)

        if not ga.fitness_history:
            lbl_empty = self.font_subtitle.render("Graph will populate at Gen 2", True, pygame.Color(100, 100, 100))
            surface.blit(lbl_empty, (gx + 40, gy + gh // 2 - 8))
            return

        best_his = ga.fitness_history
        avg_his = ga.avg_fitness_history

        max_val = max(max(best_his), 1.0)
        min_val = 0.0

        for val in [max_val, max_val / 2, 0.0]:
            ratio = (val - min_val) / (max_val - min_val)
            y_pos = gy + gh - int(ratio * gh)
            y_pos = np.clip(y_pos, gy, gy + gh)
            pygame.draw.line(surface, pygame.Color(25, 30, 40), (gx, y_pos), (gx + gw, y_pos), 1)
            lbl_val = self.font_small.render(f"{val:.0f}", True, pygame.Color(120, 120, 120))
            surface.blit(lbl_val, (gx - lbl_val.get_width() - 5, y_pos - lbl_val.get_height() // 2))

        num_gens = len(best_his)
        surface.blit(self.font_small.render("G1", True, pygame.Color(120, 120, 120)), (gx, gy + gh + 2))
        lbl_xn = self.font_small.render(f"G{num_gens}", True, pygame.Color(120, 120, 120))
        surface.blit(lbl_xn, (gx + gw - lbl_xn.get_width(), gy + gh + 2))

        if num_gens > 1:
            points_best = []
            points_avg = []
            for i in range(num_gens):
                x = gx + int((i / (num_gens - 1)) * gw)

                y_best_ratio = (best_his[i] - min_val) / (max_val - min_val)
                y_best = gy + gh - int(y_best_ratio * gh)
                points_best.append((x, int(np.clip(y_best, gy, gy + gh))))

                y_avg_ratio = (avg_his[i] - min_val) / (max_val - min_val)
                y_avg = gy + gh - int(y_avg_ratio * gh)
                points_avg.append((x, int(np.clip(y_avg, gy, gy + gh))))

            pygame.draw.lines(surface, pygame.Color(0, 220, 100), False, points_best, 2)
            pygame.draw.lines(surface, pygame.Color(0, 160, 255), False, points_avg, 2)

        pygame.draw.circle(surface, pygame.Color(0, 220, 100), (gx + 10, gy + gh + 18), 3)
        surface.blit(self.font_small.render("Best", True, pygame.Color(180, 180, 180)), (gx + 18, gy + gh + 13))

        pygame.draw.circle(surface, pygame.Color(0, 160, 255), (gx + 70, gy + gh + 18), 3)
        surface.blit(self.font_small.render("Average", True, pygame.Color(180, 180, 180)), (gx + 78, gy + gh + 13))

        surface.blit(self.font_small.render("Press 'P' to save Matplotlib report", True, self.accent_color),
                     (gx + 125, gy + gh + 13))

    def export_matplotlib_chart(self, ga, filename="fitness_report.png"):
        if not ga.fitness_history:
            print("No history to plot yet.")
            return False

        try:
            plt.figure(figsize=(8, 5))
            plt.style.use('dark_background')

            gens = range(1, len(ga.fitness_history) + 1)

            plt.plot(gens, ga.fitness_history, label="Best Fitness", color="#00DC64", linewidth=2.5)
            plt.plot(gens, ga.avg_fitness_history, label="Average Fitness", color="#00A0FF", linewidth=2.0, linestyle="--")

            plt.title("Neuroevolution Space Probe Simulator Training Report", fontsize=14, color="#FFA000", pad=15)
            plt.xlabel("Generation", fontsize=11)
            plt.ylabel("Fitness Score", fontsize=11)
            plt.grid(True, color="#252D38")
            plt.legend(frameon=True, facecolor="#12181F", edgecolor="#252D38")

            max_fit = max(ga.fitness_history)
            max_gen = ga.fitness_history.index(max_fit) + 1
            plt.annotate(f"Peak Fitness: {max_fit:.1f}\nGen {max_gen}",
                         xy=(max_gen, max_fit),
                         xytext=(max_gen + 1.5, max_fit - (max_fit * 0.1)),
                         arrowprops=dict(facecolor='#FFA000', shrink=0.08, width=1, headwidth=6),
                         bbox=dict(boxstyle="round,pad=0.3", fc="#12181F", ec="#252D38", lw=1),
                         fontsize=9)

            plt.tight_layout()
            plt.savefig(filename, dpi=300)
            plt.close()
            print(f"Successfully exported Matplotlib chart to: {filename}")
            return True
        except Exception as e:
            print(f"Failed to export Matplotlib chart: {e}")
            return False
