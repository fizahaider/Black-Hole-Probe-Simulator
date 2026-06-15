import pygame
import numpy as np
import physics


class BlackHole:
    def __init__(self, pos, rs=80, mass=70000.0, g_const=1.0):
        self.pos = pygame.Vector2(pos)
        self.rs = rs
        self.mass = mass
        self.g = g_const

        self.shadow_color = pygame.Color(0, 0, 0)
        self.einstein_color = pygame.Color(255, 140, 0, 150)

    def draw(self, surface):
        glow_steps = 15
        for i in range(glow_steps):
            radius = self.rs + (glow_steps - i) * 3
            alpha = int(90 * (i / glow_steps))
            glow_surf = pygame.Surface((radius * 2, radius * 2), pygame.SRCALPHA)
            pygame.draw.circle(glow_surf, (255, 120, 0, alpha), (radius, radius), radius)
            surface.blit(glow_surf, (self.pos.x - radius, self.pos.y - radius))

        pygame.draw.circle(surface, self.shadow_color, (int(self.pos.x), int(self.pos.y)), self.rs)
        pygame.draw.circle(surface, pygame.Color(255, 50, 0), (int(self.pos.x), int(self.pos.y)), self.rs + 1, 1)


class AccretionDisk:
    def __init__(self, bh_pos, rs, num_particles=1200):
        self.bh_pos = pygame.Vector2(bh_pos)
        self.rs = rs
        self.num_particles = num_particles

        self.radii = np.random.uniform(rs * 1.15, rs * 4.5, num_particles)
        self.angles = np.random.uniform(0, 2 * np.pi, num_particles)

        speed_const = 35.0
        self.speeds = speed_const / np.sqrt(self.radii)

        self.sizes = np.random.choice([1, 2], num_particles, p=[0.7, 0.3])

        # Color gradient: white-hot near the horizon, deep red/orange at the edges
        self.colors = []
        for r in self.radii:
            normalized_r = (r - rs * 1.15) / (rs * 3.35)
            if normalized_r < 0.2:
                rgb = (255, np.random.randint(220, 255), np.random.randint(180, 220))
            elif normalized_r < 0.6:
                rgb = (255, np.random.randint(120, 180), np.random.randint(0, 50))
            else:
                rgb = (np.random.randint(200, 255), np.random.randint(30, 80), 0)
            self.colors.append(rgb)

        self.colors = np.array(self.colors, dtype=np.uint8)
        self.positions = np.zeros((num_particles, 2))
        self.update_positions()

    def update_positions(self):
        cos_val = np.cos(self.angles)
        sin_val = np.sin(self.angles)
        self.positions[:, 0] = self.bh_pos.x + self.radii * cos_val
        self.positions[:, 1] = self.bh_pos.y + self.radii * sin_val

    def update(self, dt=1.0):
        self.angles += self.speeds * dt * 0.05
        self.angles %= 2 * np.pi
        self.update_positions()

    def draw(self, surface, rs):
        overlay = pygame.Surface(surface.get_size(), pygame.SRCALPHA)
        bh_pos_arr = np.array(self.bh_pos)

        for i in range(self.num_particles):
            pos = self.positions[i]
            color = self.colors[i]
            size = self.sizes[i]

            warped = physics.warp_star_position(pos, bh_pos_arr, rs, lensing_strength=0.85)
            if warped is not None:
                x, y = int(warped[0]), int(warped[1])
                if 0 <= x < overlay.get_width() and 0 <= y < overlay.get_height():
                    r = self.radii[i]
                    alpha_ratio = 1.0 - ((r - self.rs * 1.15) / (self.rs * 3.35))
                    alpha = int(90 + alpha_ratio * 165)

                    c_with_a = pygame.Color(int(color[0]), int(color[1]), int(color[2]), alpha)

                    if size == 1:
                        overlay.set_at((x, y), c_with_a)
                    else:
                        pygame.draw.circle(overlay, c_with_a, (x, y), size)

        surface.blit(overlay, (0, 0), special_flags=pygame.BLEND_RGBA_ADD)


class SpacetimeGrid:
    def __init__(self, bh_pos, screen_width, screen_height):
        self.bh_pos = pygame.Vector2(bh_pos)
        self.width = screen_width
        self.height = screen_height

        self.radial_steps = 16
        self.circle_radii = list(range(90, 520, 35))

    def draw(self, surface, rs):
        overlay = pygame.Surface(surface.get_size(), pygame.SRCALPHA)
        bh_pos_arr = np.array(self.bh_pos)

        grid_color = pygame.Color(0, 190, 170, 32)

        for radius in self.circle_radii:
            points = []
            for angle_deg in range(0, 361, 6):
                rad = np.radians(angle_deg)
                pos = self.bh_pos + pygame.Vector2(np.cos(rad) * radius, np.sin(rad) * radius)

                warped = physics.warp_star_position(np.array(pos), bh_pos_arr, rs, lensing_strength=0.92)
                if warped is not None:
                    points.append(pygame.Vector2(warped[0], warped[1]))
                else:
                    if len(points) > 1:
                        pygame.draw.lines(overlay, grid_color, False, points, 1)
                    points = []
            if len(points) > 1:
                pygame.draw.lines(overlay, grid_color, False, points, 1)

        for step in range(self.radial_steps):
            angle_deg = step * (360.0 / self.radial_steps)
            rad = np.radians(angle_deg)
            dir_vec = pygame.Vector2(np.cos(rad), np.sin(rad))

            points = []
            for r in range(40, 560, 8):
                pos = self.bh_pos + dir_vec * r
                warped = physics.warp_star_position(np.array(pos), bh_pos_arr, rs, lensing_strength=0.92)
                if warped is not None:
                    points.append(pygame.Vector2(warped[0], warped[1]))
                else:
                    if len(points) > 1:
                        pygame.draw.lines(overlay, grid_color, False, points, 1)
                    points = []
            if len(points) > 1:
                pygame.draw.lines(overlay, grid_color, False, points, 1)

        surface.blit(overlay, (0, 0))


class Starfield:
    def __init__(self, screen_width, screen_height, num_stars=200):
        self.width = screen_width
        self.height = screen_height
        self.num_stars = num_stars

        self.stars = []
        for _ in range(num_stars):
            x = np.random.uniform(0, screen_width)
            y = np.random.uniform(0, screen_height)
            brightness = np.random.randint(100, 255)
            self.stars.append((np.array([x, y]), brightness))

    def draw(self, surface, bh_pos, rs):
        bh_pos_arr = np.array(bh_pos)
        for star_pos, brightness in self.stars:
            warped = physics.warp_star_position(star_pos, bh_pos_arr, rs, lensing_strength=0.9)
            if warped is not None:
                x, y = int(warped[0]), int(warped[1])
                if 0 <= x < self.width and 0 <= y < self.height:
                    color = (brightness, brightness, int(brightness * 1.1) if brightness < 230 else 255)
                    surface.set_at((x, y), color)


class CheckpointManager:
    def __init__(self, bh_pos):
        self.bh_pos = pygame.Vector2(bh_pos)
        self.checkpoints = []
        self.radius = 25.0
        self.pulse_timer = 0.0

        self.setup_default_checkpoints()

    def setup_default_checkpoints(self):
        self.checkpoints = [
            pygame.Vector2(self.bh_pos.x + 220, self.bh_pos.y),
            pygame.Vector2(self.bh_pos.x, self.bh_pos.y - 200),
            pygame.Vector2(self.bh_pos.x - 220, self.bh_pos.y),
            pygame.Vector2(self.bh_pos.x, self.bh_pos.y + 200),
            pygame.Vector2(self.bh_pos.x + 350, self.bh_pos.y - 280)  # escape target
        ]

    def update(self):
        self.pulse_timer += 0.1

    def draw(self, surface, active_index):
        for idx, cp in enumerate(self.checkpoints):
            if idx < active_index:
                pygame.draw.circle(surface, pygame.Color(0, 150, 0, 50), (int(cp.x), int(cp.y)), int(self.radius), 1)
            elif idx == active_index:
                pulse_rad = self.radius + np.sin(self.pulse_timer) * 4.0
                color = pygame.Color(0, 180, 255)
                pygame.draw.circle(surface, pygame.Color(0, 100, 255, 80), (int(cp.x), int(cp.y)), int(pulse_rad + 2), 2)
                pygame.draw.circle(surface, color, (int(cp.x), int(cp.y)), int(pulse_rad), 2)
                font = pygame.font.SysFont("Arial", 12, bold=True)
                lbl = font.render(str(idx + 1), True, color)
                surface.blit(lbl, (cp.x - lbl.get_width() // 2, cp.y - lbl.get_height() // 2))
            else:
                pygame.draw.circle(surface, pygame.Color(120, 120, 120, 60), (int(cp.x), int(cp.y)), int(self.radius), 1)
                font = pygame.font.SysFont("Arial", 10)
                lbl = font.render(str(idx + 1), True, pygame.Color(120, 120, 120, 100))
                surface.blit(lbl, (cp.x - lbl.get_width() // 2, cp.y - lbl.get_height() // 2))

    def check_checkpoint(self, probe_pos, current_target_idx):
        if current_target_idx >= len(self.checkpoints):
            return False

        target = self.checkpoints[current_target_idx]
        dist = probe_pos.distance_to(target)
        return dist <= self.radius
